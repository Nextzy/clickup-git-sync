'use strict';

const { isValidDate, requireToken, getWorkspaceName } = require('../src/config');
const { resolveTarget } = require('../src/resolve');
const { resolveWorkspace, getTask, findTasksByName, updateTask } = require('../src/api');
const { dateToMs } = require('../src/clickup');
const { writeHistory } = require('../src/history');

// Update an EXISTING task's name and/or dates (creates nothing new).
//
// Flags:
//   --task-id <id>              target task by ID (precise), OR
//   --task-name / --task "<q>"  search the configured list by name
//   --name "<new name>"         rename the task (optional)
//   --start-date <YYYY-MM-DD>   set start date (optional)
//   --end-date <YYYY-MM-DD>     set due date (optional)
//   --date <YYYY-MM-DD>         shorthand: sets both start and end
//
// At least one editable field (--name / --start-date / --end-date / --date)
// must be given.
async function run(flags) {
  const taskId = flags['task-id'] !== undefined ? String(flags['task-id']) : '';
  const query = typeof flags['task-name'] === 'string' ? flags['task-name']
    : (typeof flags.task === 'string' ? flags.task : '');
  const newName = typeof flags.name === 'string' ? flags.name : '';
  const startDateStr = typeof flags['start-date'] === 'string' ? flags['start-date']
    : (typeof flags.date === 'string' ? flags.date : '');
  const endDateStr = typeof flags['end-date'] === 'string' ? flags['end-date']
    : (typeof flags.date === 'string' ? flags.date : '');
  // Note: `flags.desc !== undefined` (not `typeof === 'string'`) lets `--description ""`
  // clear the task body — an empty string is a valid "erase it" value here.
  const hasDescription = flags.description !== undefined || flags.desc !== undefined;
  const description = typeof flags.description === 'string' ? flags.description
    : (typeof flags.desc === 'string' ? flags.desc : '');

  if (!taskId && !query) {
    console.error('❌ Need a target task (--task-id or --task-name).');
    console.error('   Example: npx @nextzy-tech/clickup-git-sync update --task-name "standup" --name "Daily standup"');
    process.exit(1);
  }
  if (!newName && !startDateStr && !endDateStr && !hasDescription) {
    console.error('❌ Nothing to update. Provide at least one of --name, --start-date, --end-date (or --date), --description.');
    process.exit(1);
  }
  for (const [label, v] of [['start', startDateStr], ['end', endDateStr]]) {
    if (v && !isValidDate(v)) {
      console.error(`❌ Invalid ${label} date "${v}" — use YYYY-MM-DD.`);
      process.exit(1);
    }
  }

  try {
    let token;
    let targetId = taskId;
    let targetName = '';

    if (targetId) {
      // By ID: only the token is needed — validate the task exists / label it.
      token = requireToken();
      console.log('Resolving ClickUp parameters...');
      // Touch the workspace so a bad token fails early with a clear message.
      await resolveWorkspace(token, getWorkspaceName());
      try {
        const t = await getTask(token, targetId);
        targetName = t.name || targetId;
      } catch (e) {
        throw new Error(`Task id "${targetId}" not found.`);
      }
      console.log(`✓ Target task: "${targetName}" (ID: ${targetId})`);
    } else {
      // By name: resolve the configured list, then search within it.
      const target = await resolveTarget(startDateStr);
      token = target.token;
      const matches = await findTasksByName(token, target.listId, query);
      if (matches.length === 0) {
        throw new Error(`No task matching "${query}" in list "${target.listName}".`);
      }
      if (matches.length > 1) {
        console.error(`❌ ${matches.length} tasks match "${query}" — narrow it or use --task-id:`);
        for (const m of matches.slice(0, 15)) console.error(`   • ${m.name}  (id: ${m.id})`);
        process.exit(1);
      }
      targetId = matches[0].id;
      targetName = matches[0].name;
      console.log(`✓ Matched task: "${targetName}" (ID: ${targetId})`);
    }

    const startMs = startDateStr ? dateToMs(startDateStr) : undefined;
    const dueMs = endDateStr ? dateToMs(endDateStr) : undefined;
    await updateTask(token, targetId, {
      name: newName || undefined,
      startMs,
      dueMs,
      description: hasDescription ? description : undefined,
    });

    const changed = [
      newName ? `name → "${newName}"` : null,
      startDateStr ? `start → ${startDateStr}` : null,
      endDateStr ? `end → ${endDateStr}` : null,
      hasDescription ? (description ? 'description updated' : 'description cleared') : null,
    ].filter(Boolean).join(', ');
    console.log(`✓ Updated (${changed}).`);

    writeHistory({ type: 'update', taskName: newName || targetName, status: 'updated', clickupSubtaskId: targetId });
    console.log('✓ Done.');
  } catch (err) {
    console.error('❌ Update failed:', err.message);
    process.exit(1);
  }
}

module.exports = { run };

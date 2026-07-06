'use strict';

const { isValidDate, durationHoursFromFlags, requireToken, getWorkspaceName } = require('../src/config');
const { resolveTarget } = require('../src/resolve');
const { resolveWorkspace, resolveCurrentUser, getTask, findTasksByName, addTaskAssignees } = require('../src/api');
const { addTimeToTask } = require('../src/clickup');
const { writeHistory } = require('../src/history');

// Log time to an EXISTING task (creates nothing but the time entry).
//
// Flags:
//   --task-id <id>              target task by ID (precise), OR
//   --task-name / --task "<q>"  search the configured list by name
//   --hours/--h --minutes/--min time (required, summed)
//   --start-date / --date       (optional, anchors the time entry to that day)
//   --no-assign                 skip adding yourself as an assignee (on by default)
async function run(flags) {
  const taskId = flags['task-id'] !== undefined ? String(flags['task-id']) : '';
  const query = typeof flags['task-name'] === 'string' ? flags['task-name']
    : (typeof flags.task === 'string' ? flags.task : '');
  const hours = durationHoursFromFlags(flags);
  // Default: add yourself as an assignee (additive). Opt out with --no-assign.
  const wantAssign = flags.assign !== false;
  const startDateStr = typeof flags['start-date'] === 'string' ? flags['start-date']
    : (typeof flags.date === 'string' ? flags.date : '');

  if ((!taskId && !query) || isNaN(hours) || hours <= 0) {
    console.error('❌ Need a target task (--task-id or --task-name) and time (--hours/--minutes).');
    console.error('   Example: npx @nextzy-tech/clickup-git-sync add-time --task-name "standup" --hours 0.5');
    process.exit(1);
  }
  if (startDateStr && !isValidDate(startDateStr)) {
    console.error(`❌ Invalid date "${startDateStr}" — use YYYY-MM-DD.`);
    process.exit(1);
  }

  try {
    let token;
    let teamId;
    let targetId = taskId;
    let targetName = '';

    if (targetId) {
      // By ID: only the workspace (teamId) is needed — no list resolution.
      token = requireToken();
      console.log('Resolving ClickUp parameters...');
      const workspace = await resolveWorkspace(token, getWorkspaceName());
      teamId = workspace.id;
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
      teamId = target.teamId;
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

    await addTimeToTask({ token, teamId, taskId: targetId, hours, startDateStr, description: `+${hours}h via clickup-git-sync` });

    // Opt-in: add yourself as an assignee (additive — keeps the task's creator).
    if (wantAssign) {
      try {
        const me = await resolveCurrentUser(token);
        if (me && me.id) {
          await addTaskAssignees(token, targetId, [me.id]);
          console.log(`✓ Added self as assignee: ${me.username || me.email || me.id}`);
        }
      } catch (e) {
        console.log('⚠️ Could not add self as assignee (time was still logged).');
      }
    }

    writeHistory({ type: 'add-time', taskName: targetName, hours, status: 'synced', clickupSubtaskId: targetId });
    console.log('✓ Done.');
  } catch (err) {
    console.error('❌ Add-time failed:', err.message);
    process.exit(1);
  }
}

module.exports = { run };

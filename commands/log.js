'use strict';

const { requireToken, getListName, getWorkspaceName } = require('../src/config');
const { resolveWorkspace, resolveList } = require('../src/api');
const { createSubtaskWithTime } = require('../src/clickup');
const { writeHistory } = require('../src/history');

// Direct time logging with no git commit.
//
// Flags:
//   --task "<name>"       (required)
//   --category "<name>"   (required)
//   --hours <number>      (required)
//   --date "<YYYY-MM-DD>" (optional, defaults to today)
async function run(flags) {
  const taskName = typeof flags.task === 'string' ? flags.task : '';
  const category = typeof flags.category === 'string' ? flags.category : '';
  const hours = flags.hours !== undefined ? parseFloat(flags.hours) : NaN;
  const dateStr = typeof flags.date === 'string' ? flags.date : '';

  if (!taskName || !category || isNaN(hours) || hours <= 0) {
    console.error('❌ Missing required parameters. --task, --category, and --hours are required.');
    console.error('   Example: npx clickup-git-sync log --task "Meeting" --category Meeting --hours 1.5');
    process.exit(1);
  }

  const token = requireToken();
  const listName = getListName();

  try {
    console.log('Resolving ClickUp parameters...');
    const workspace = await resolveWorkspace(token, getWorkspaceName());
    const listId = await resolveList(token, workspace.id, listName);
    if (!listId) throw new Error(`Could not find list "${listName}" in workspace.`);
    console.log(`✓ List: "${listName}" (ID: ${listId})`);

    const { parentTaskId, subtaskId } = await createSubtaskWithTime({
      token, teamId: workspace.id, listId, category, taskName, hours, dateStr,
    });

    writeHistory({
      type: 'direct',
      taskName,
      category,
      hours,
      status: 'synced',
      clickupTaskId: parentTaskId,
      clickupSubtaskId: subtaskId,
    });
    console.log('✓ Done.');
  } catch (err) {
    console.error('❌ Direct sync failed:', err.message);
    process.exit(1);
  }
}

module.exports = { run };

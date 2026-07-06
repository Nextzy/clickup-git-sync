'use strict';

const { isValidDate } = require('../src/config');
const { resolveTarget } = require('../src/resolve');
const { createSubtask } = require('../src/clickup');
const { writeHistory } = require('../src/history');

// Create a subtask under a category, WITHOUT logging any time.
//
// Flags:
//   --task "<name>"           (required)
//   --category "<name>"       (required)
//   --start-date <YYYY-MM-DD> (optional, defaults to today)
//   --end-date <YYYY-MM-DD>   (optional, defaults to start date)
//   --date <YYYY-MM-DD>       (optional shorthand: sets both)
async function run(flags) {
  const taskName = typeof flags.task === 'string' ? flags.task : '';
  const category = typeof flags.category === 'string' ? flags.category : '';
  const startDateStr = typeof flags['start-date'] === 'string' ? flags['start-date']
    : (typeof flags.date === 'string' ? flags.date : '');
  const endDateStr = typeof flags['end-date'] === 'string' ? flags['end-date']
    : (typeof flags.date === 'string' ? flags.date : '');

  if (!taskName || !category) {
    console.error('❌ Missing required parameters. --task and --category are required.');
    console.error('   Example: npx @nextzy-tech/clickup-git-sync task --task "Investigate bug" --category "Main Task [Backend]"');
    process.exit(1);
  }
  for (const [label, v] of [['start', startDateStr], ['end', endDateStr]]) {
    if (v && !isValidDate(v)) {
      console.error(`❌ Invalid ${label} date "${v}" — use YYYY-MM-DD.`);
      process.exit(1);
    }
  }

  try {
    const { token, listId } = await resolveTarget(startDateStr);
    const { parentTaskId, subtaskId } = await createSubtask({
      token, listId, category, taskName, startDateStr, endDateStr,
    });

    writeHistory({ type: 'task', taskName, category, status: 'created', clickupTaskId: parentTaskId, clickupSubtaskId: subtaskId });
    console.log('✓ Done (no time logged).');
  } catch (err) {
    console.error('❌ Create task failed:', err.message);
    process.exit(1);
  }
}

module.exports = { run };

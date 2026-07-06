'use strict';

const { isValidDate, durationHoursFromFlags } = require('../src/config');
const { resolveTarget } = require('../src/resolve');
const { createSubtaskWithTime } = require('../src/clickup');
const { writeHistory } = require('../src/history');

// Direct time logging with no git commit.
//
// Flags:
//   --task "<name>"           (required)
//   --category "<name>"       (required)
//   --hours <number>          (required)
//   --start-date <YYYY-MM-DD> (optional, defaults to today)
//   --end-date <YYYY-MM-DD>   (optional, defaults to start date)
//   --date <YYYY-MM-DD>       (optional shorthand: sets both start and end)
async function run(flags) {
  const taskName = typeof flags.task === 'string' ? flags.task : '';
  const category = typeof flags.category === 'string' ? flags.category : '';
  const hours = durationHoursFromFlags(flags);
  const startDateStr = typeof flags['start-date'] === 'string' ? flags['start-date']
    : (typeof flags.date === 'string' ? flags.date : '');
  const endDateStr = typeof flags['end-date'] === 'string' ? flags['end-date']
    : (typeof flags.date === 'string' ? flags.date : '');

  if (!taskName || !category || isNaN(hours) || hours <= 0) {
    console.error('❌ Missing required parameters. --task, --category, and time (--hours/--minutes) are required.');
    console.error('   Example: npx @nextzy-tech/clickup-git-sync log --task "Standup" --category "Main Task [Meeting]" --hours 1 --min 30');
    process.exit(1);
  }
  for (const [label, v] of [['start', startDateStr], ['end', endDateStr]]) {
    if (v && !isValidDate(v)) {
      console.error(`❌ Invalid ${label} date "${v}" — use YYYY-MM-DD.`);
      process.exit(1);
    }
  }

  try {
    const { token, teamId, listId } = await resolveTarget(startDateStr);

    const { parentTaskId, subtaskId } = await createSubtaskWithTime({
      token, teamId, listId, category, taskName, hours, startDateStr, endDateStr,
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

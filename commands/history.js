'use strict';

const { readHistory, HISTORY_PATH } = require('../src/history');

// Print the local sync history.
//   --json    raw JSON output
//   --limit N show only the last N entries
function run(flags) {
  const entries = readHistory();
  if (entries.length === 0) {
    console.log(`No history yet (${HISTORY_PATH}).`);
    return;
  }

  if (flags.json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  const limit = flags.limit ? parseInt(flags.limit, 10) : entries.length;
  const shown = entries.slice(-limit);

  console.log(`ClickUp Git Sync history (${shown.length}/${entries.length}):\n`);
  for (const e of shown) {
    const when = (e.timestamp || '').replace('T', ' ').slice(0, 19);
    const mark = e.status === 'synced' ? '✓' : '·';
    const label = e.type === 'git' ? `${e.commitHash || '-'} ${e.commitMessage || ''}` : e.taskName || '';
    console.log(`${mark} [${when}] ${e.category || '-'} ${e.hours || 0}h  ${label}  (${e.status})`);
  }
}

module.exports = { run };

'use strict';

const git = require('../src/git');
const { isValidDate, durationHoursFromFlags } = require('../src/config');
const { resolveTarget } = require('../src/resolve');
const { createSubtaskWithTime } = require('../src/clickup');
const { writeHistory } = require('../src/history');
const { ask, isInteractive } = require('../src/prompt');

// Stage (optional), commit, then sync the commit to ClickUp.
//
// Works both interactively (prompts for anything missing) and non-interactively
// for AI/scripts (pass everything as flags + --yes).
//
// Flags:
//   --message "<msg>"     commit message (prompted if interactive)
//   --category "<name>"   ClickUp category (defaults to auto-detected)
//   --hours <number>      tracked hours (defaults to recommended)
//   --date "<YYYY-MM-DD>" subtask date (defaults to today)
//   --stage               run `git add .` before committing
//   --no-log              commit only; do not sync to ClickUp
//   --yes                 accept detected defaults without prompting
async function run(flags) {
  if (!git.isGitRepo()) {
    console.error('❌ Not a git repository (or git is not installed).');
    process.exit(1);
  }

  const auto = flags.yes === true || !isInteractive();

  // 1. Working tree status
  const dirty = git.status();
  if (!dirty) {
    console.log('No uncommitted changes. Nothing to commit.');
    console.log('To log time without a commit: npx @nextzy-tech/clickup-git-sync log --task ...');
    return;
  }
  console.log('Uncommitted changes:\n' + dirty);

  // 2. Stage
  let shouldStage = flags.stage === true;
  if (!shouldStage && !auto) {
    const ans = await ask('Stage all changes? (git add .) (Y/n): ');
    shouldStage = ans.trim().toLowerCase() !== 'n';
  }
  if (shouldStage) {
    git.stageAll();
    console.log('✓ Staged all changes.');
  }

  const files = git.stagedFiles();
  if (files.length === 0) {
    console.log('No staged files. Stage changes first (use --stage) or commit manually.');
    return;
  }

  // 3. Commit message (short subject) + optional details (body)
  let message = typeof flags.message === 'string' ? flags.message : '';
  if (!message && !auto) {
    message = (await ask('Commit message (short subject): ')).trim();
  }
  if (!message) {
    console.error('❌ Commit message is required (use --message "...").');
    process.exit(1);
  }

  // Details go into the git commit body AND the ClickUp task description, so the
  // subject/name stays short and the long explanation lives in one place.
  let description = typeof flags.description === 'string' ? flags.description
    : (typeof flags.desc === 'string' ? flags.desc : '');
  if (!description && !auto) {
    description = (await ask('Details (optional, Enter to skip): ')).trim();
  }

  // 4. Commit
  try {
    git.commit(message, description);
  } catch (e) {
    console.error('❌ Commit failed:', e.message);
    process.exit(1);
  }
  const hash = git.shortHash();
  console.log(`✓ Committed. Hash: ${hash}`);

  // 5. Defaults from the diff
  const detectedCategory = git.detectCategory(files);
  const recommendedHours = git.recommendHours(files);

  // 6. Decide whether to sync to ClickUp
  let doLog = flags.log !== false; // --no-log sets flags.log = false
  if (doLog && !auto && typeof flags.message !== 'string') {
    const ans = await ask('Log this commit to ClickUp? (Y/n): ');
    doLog = ans.trim().toLowerCase() !== 'n';
  }

  if (!doLog) {
    writeHistory({ type: 'git', commitHash: hash, commitMessage: message, status: 'untracked', category: detectedCategory, hours: recommendedHours });
    console.log('Skipped ClickUp logging (recorded as untracked).');
    return;
  }

  // 7. Resolve category / hours / date
  let category = typeof flags.category === 'string' ? flags.category : '';
  if (!category && !auto) {
    const ans = await ask(`Category [${detectedCategory}]: `);
    category = ans.trim();
  }
  category = category || detectedCategory;

  // --hours/-h and --minutes/--min are summed (e.g. -h 1 --min 30 -> 1.5).
  let hours = durationHoursFromFlags(flags);
  if (isNaN(hours) && !auto) {
    const ans = await ask(`Hours [${recommendedHours}]: `);
    hours = ans.trim() ? parseFloat(ans) : NaN;
  }
  if (isNaN(hours)) hours = recommendedHours;

  // Dates: --start-date / --end-date, or --date as a shorthand for both.
  // Empty start -> today; empty end -> same as start.
  let startDateStr = typeof flags['start-date'] === 'string' ? flags['start-date']
    : (typeof flags.date === 'string' ? flags.date : '');
  let endDateStr = typeof flags['end-date'] === 'string' ? flags['end-date']
    : (typeof flags.date === 'string' ? flags.date : '');
  if (!auto) {
    if (!startDateStr) startDateStr = (await ask('Start date (YYYY-MM-DD) or Enter for today: ')).trim();
    if (!endDateStr) endDateStr = (await ask('End date (YYYY-MM-DD) or Enter = same as start: ')).trim();
  }
  for (const [label, v] of [['start', startDateStr], ['end', endDateStr]]) {
    if (v && !isValidDate(v)) {
      console.error(`❌ Invalid ${label} date "${v}" — use YYYY-MM-DD.`);
      process.exit(1);
    }
  }

  // 8. Sync
  const subtaskName = `Commit [${hash}]: ${message}`;

  try {
    const { token, teamId, listId } = await resolveTarget(startDateStr);

    const { parentTaskId, subtaskId } = await createSubtaskWithTime({
      token, teamId, listId, category, taskName: subtaskName, hours, startDateStr, endDateStr, taskDescription: description,
    });

    writeHistory({ type: 'git', commitHash: hash, commitMessage: message, status: 'synced', category, hours, clickupTaskId: parentTaskId, clickupSubtaskId: subtaskId });
    console.log('✓ Done.');
  } catch (err) {
    console.error('❌ ClickUp sync failed:', err.message);
    console.log('   Commit is done; recorded as untracked in .clickup-history.json.');
    writeHistory({ type: 'git', commitHash: hash, commitMessage: message, status: 'untracked', category, hours });
    process.exit(1);
  }
}

module.exports = { run };

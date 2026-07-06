#!/usr/bin/env node
'use strict';

const { parseArgs } = require('../src/args');

const HELP = `clickup-git-sync — sync git commits & time tracking to ClickUp

Usage:
  npx @nextzy-tech/clickup-git-sync <command> [options]

Commands:
  setup                 Save your ClickUp API token (once per machine)
                          --token pk_xxx    set non-interactively
  init                  Scaffold this project (once per repo)
                          --list "<name>"        ClickUp list name
                          --space "<name>"       pin space/client (e.g. "True Money")
                          --space-id <id>        pin space by ID (preferred)
                          --folder-prefix "<p>"  monthly folder prefix
                                                   (+ "Mon YYYY" appended at run time)
                          --tools a,b,c          claude,cursor,antigravity,codex (default: all)
                          --force                overwrite existing files
  commit                Stage, commit, and sync the commit to ClickUp
                          --message "<msg>" --category "<cat>"
                          --hours/-h <n> --minutes/--min <n>  (summed)
                          --start-date YYYY-MM-DD --end-date YYYY-MM-DD
                          --date YYYY-MM-DD (shorthand: both) --stage --no-log --yes
  log                   Log time directly (creates a subtask + time)
                          --task "<name>" --category "<cat>"
                          --hours/--h <n> --minutes/--min <n>  (summed)
                          --start-date YYYY-MM-DD --end-date YYYY-MM-DD (or --date)
  add-time              Log time to an EXISTING task (creates nothing new)
                          --task-id <id>  OR  --task-name "<search>"
                          --hours/--h <n> --minutes/--min <n>  --start-date YYYY-MM-DD
                          (adds you as an assignee by default; --no-assign to skip)
  task                  Create a subtask WITHOUT logging time
                          --task "<name>" --category "<cat>"
                          --start-date YYYY-MM-DD --end-date YYYY-MM-DD (or --date)
  update                Update an EXISTING task's name and/or dates
                          --task-id <id>  OR  --task-name "<search>"
                          --name "<new name>"
                          --start-date YYYY-MM-DD --end-date YYYY-MM-DD (or --date)
  history               Show local sync history  [--json] [--limit N]
  help                  Show this help

Config:
  ~/.clickup/config.json   your API token (per user, secret)
  ./.clickup.json          project list name (shareable)

Docs: https://github.com/nextzy/clickup-git-sync`;

// Backward-compatible aliases for the old single-script flags.
function normalize(argv) {
  if (argv.includes('--setup')) return ['setup'];
  if (argv.includes('--direct')) {
    return ['log', ...argv.filter((a) => a !== '--direct')];
  }
  return argv;
}

async function main() {
  const argv = normalize(process.argv.slice(2));
  const { command, flags } = parseArgs(argv);

  // Note: `--h` is intentionally NOT a help alias — it's the short form of
  // --hours. Use `help` or `--help`.
  if (!command || command === 'help' || flags.help) {
    console.log(HELP);
    return;
  }

  const commands = {
    setup: () => require('../commands/setup').run(flags),
    init: () => require('../commands/init').run(flags),
    commit: () => require('../commands/commit').run(flags),
    log: () => require('../commands/log').run(flags),
    'add-time': () => require('../commands/addtime').run(flags),
    task: () => require('../commands/task').run(flags),
    update: () => require('../commands/update').run(flags),
    history: () => require('../commands/history').run(flags),
  };

  const handler = commands[command];
  if (!handler) {
    console.error(`❌ Unknown command: ${command}\n`);
    console.log(HELP);
    process.exit(1);
  }

  await handler();
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});

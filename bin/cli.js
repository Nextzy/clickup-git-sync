#!/usr/bin/env node
'use strict';

const { parseArgs } = require('../src/args');

const HELP = `clickup-git-sync — sync git commits & time tracking to ClickUp

Usage:
  npx clickup-git-sync <command> [options]

Commands:
  setup                 Save your ClickUp API token (once per machine)
                          --token pk_xxx    set non-interactively
  init                  Scaffold this project (once per repo)
                          --list "<name>"   ClickUp list name
                          --tools a,b,c     claude,cursor,antigravity,codex (default: all)
                          --force           overwrite existing files
  commit                Stage, commit, and sync the commit to ClickUp
                          --message "<msg>" --category "<cat>" --hours <n>
                          --date YYYY-MM-DD --stage --no-log --yes
  log                   Log time directly (no commit)
                          --task "<name>" --category "<cat>" --hours <n> [--date]
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

  if (!command || command === 'help' || flags.help || flags.h) {
    console.log(HELP);
    return;
  }

  const commands = {
    setup: () => require('../commands/setup').run(flags),
    init: () => require('../commands/init').run(flags),
    commit: () => require('../commands/commit').run(flags),
    log: () => require('../commands/log').run(flags),
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

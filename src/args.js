'use strict';

// Minimal, dependency-free argument parser.
//
// Supports:
//   command sub --key value --flag --no-thing -x
//
// Returns { command, positionals, flags } where:
//   - command      = first non-flag token (e.g. "commit")
//   - positionals  = remaining non-flag tokens
//   - flags        = { key: value | true | false }
//       --key value  -> { key: "value" }
//       --flag       -> { flag: true }
//       --no-flag    -> { flag: false }
//       -x           -> { x: true }
function parseArgs(argv) {
  const flags = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      let key = arg.slice(2);

      if (key.startsWith('no-')) {
        flags[key.slice(3)] = false;
        continue;
      }

      const next = argv[i + 1];
      if (next === undefined || next.startsWith('-')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      flags[arg.slice(1)] = true;
    } else {
      positionals.push(arg);
    }
  }

  return {
    command: positionals[0],
    positionals: positionals.slice(1),
    flags,
  };
}

module.exports = { parseArgs };

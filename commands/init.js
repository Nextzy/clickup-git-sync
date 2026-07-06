'use strict';

const fs = require('fs');
const path = require('path');
const { readProjectConfig, saveProjectConfig, PROJECT_CONFIG_PATH } = require('../src/config');
const { filesForTool, ALL_TOOLS } = require('../src/templates');
const { ask, isInteractive } = require('../src/prompt');

function writeFileSafe(relPath, content, force) {
  const abs = path.join(process.cwd(), relPath);
  if (fs.existsSync(abs) && !force) {
    console.log(`  skip (exists): ${relPath}`);
    return;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  console.log(`  ${fs.existsSync(abs) ? 'wrote' : 'created'}: ${relPath}`);
}

function ensureGitignore(entries) {
  const abs = path.join(process.cwd(), '.gitignore');
  let current = '';
  try { current = fs.readFileSync(abs, 'utf8'); } catch (e) { /* none yet */ }
  const missing = entries.filter((e) => !current.split('\n').some((l) => l.trim() === e));
  if (missing.length === 0) return;
  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(abs, `${prefix}# clickup-git-sync\n${missing.join('\n')}\n`);
  console.log(`  updated: .gitignore (+${missing.join(', ')})`);
}

// Scaffold a project: write .clickup.json and the AI skill/rules files.
//
// Flags:
//   --list "<name>"         project list name (else prompt / default)
//   --space "<name>"        pin the ClickUp space (client), e.g. "True Money"
//   --space-id <id>         pin the space by ID (preferred, stable)
//   --folder-prefix "<p>"   monthly folder prefix, e.g. "[True] Support List"
//                             (month + year are appended automatically)
//   --tools claude,cursor,antigravity,codex   comma list (default: all)
//   --force                 overwrite existing files
async function run(flags) {
  console.log('=== ClickUp Git Sync :: Init ===');

  // 1. Project config (.clickup.json)
  const existingConfig = readProjectConfig();
  const config = { ...existingConfig };

  let listName = existingConfig.CLICKUP_LIST_NAME;
  if (typeof flags.list === 'string') {
    listName = flags.list;
  } else if (!listName && isInteractive()) {
    listName = (await ask('ClickUp list name: ')).trim();
  }
  // Require an explicit list — never default to a real project list.
  if (!listName) {
    console.error('❌ A ClickUp list name is required. Pass --list "<name>".');
    process.exit(1);
  }
  config.CLICKUP_LIST_NAME = listName;

  // Optional scoping — only overwrite when a flag is passed, so re-running
  // init without them keeps existing values.
  if (typeof flags.space === 'string') config.CLICKUP_SPACE_NAME = flags.space;
  if (flags['space-id'] !== undefined) config.CLICKUP_SPACE_ID = String(flags['space-id']);
  if (typeof flags['folder-prefix'] === 'string') config.CLICKUP_FOLDER_PREFIX = flags['folder-prefix'];

  saveProjectConfig(config);
  console.log(`✓ Project config: ${PROJECT_CONFIG_PATH} (list: "${listName}")`);
  if (config.CLICKUP_SPACE_NAME || config.CLICKUP_SPACE_ID) {
    console.log(`  space: ${config.CLICKUP_SPACE_NAME || ''}${config.CLICKUP_SPACE_ID ? ` (ID: ${config.CLICKUP_SPACE_ID})` : ''}`.trim());
  }
  if (config.CLICKUP_FOLDER_PREFIX) {
    console.log(`  folder prefix: "${config.CLICKUP_FOLDER_PREFIX}" (+ month/year at run time)`);
  }

  // 2. Which AI tools to scaffold skills for
  let tools = ALL_TOOLS;
  if (typeof flags.tools === 'string') {
    tools = flags.tools.split(',').map((t) => t.trim().toLowerCase()).filter((t) => ALL_TOOLS.includes(t));
  }
  if (tools.length === 0) tools = ALL_TOOLS;

  console.log(`Scaffolding skills for: ${tools.join(', ')}`);
  for (const tool of tools) {
    for (const file of filesForTool(tool)) {
      writeFileSafe(file.path, file.content, !!flags.force);
    }
  }

  // 3. gitignore the local, non-shareable files
  ensureGitignore(['.clickup-history.json']);

  console.log('\n✓ Done. Try it:');
  console.log('  npx @nextzy-tech/clickup-git-sync commit      # commit + sync');
  console.log('  npx @nextzy-tech/clickup-git-sync log --task "Standup" --category "Main Task [Meeting]" --hours 0.5');
}

module.exports = { run };

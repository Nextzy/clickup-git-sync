'use strict';

const fs = require('fs');
const path = require('path');
const { readProjectConfig, saveProjectConfig, PROJECT_CONFIG_PATH, DEFAULT_LIST_NAME } = require('../src/config');
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
//   --list "<name>"     project list name (else prompt / default)
//   --tools claude,cursor,antigravity,codex   comma list (default: all)
//   --force             overwrite existing files
async function run(flags) {
  console.log('=== ClickUp Git Sync :: Init ===');

  // 1. Project config (.clickup.json)
  const existingConfig = readProjectConfig();
  let listName = existingConfig.CLICKUP_LIST_NAME;
  if (typeof flags.list === 'string') {
    listName = flags.list;
  } else if (!listName && isInteractive()) {
    const answer = await ask(`ClickUp list name [${DEFAULT_LIST_NAME}]: `);
    listName = answer.trim() || DEFAULT_LIST_NAME;
  } else if (!listName) {
    listName = DEFAULT_LIST_NAME;
  }

  saveProjectConfig({ ...existingConfig, CLICKUP_LIST_NAME: listName });
  console.log(`✓ Project config: ${PROJECT_CONFIG_PATH} (list: "${listName}")`);

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
  console.log('  npx clickup-git-sync commit      # commit + sync');
  console.log('  npx clickup-git-sync log --task "Standup" --category Meeting --hours 0.5');
}

module.exports = { run };

'use strict';

const { readGlobalConfig, saveGlobalToken, GLOBAL_CONFIG_PATH } = require('../src/config');
const { ask, isInteractive } = require('../src/prompt');

// Save the ClickUp Personal API token to the per-user global config.
async function run(flags) {
  console.log('=== ClickUp Git Sync :: Setup ===');

  // Non-interactive: accept --token directly.
  if (flags.token && typeof flags.token === 'string') {
    const p = saveGlobalToken(flags.token.trim());
    console.log(`✓ Token saved to ${p}`);
    return;
  }

  if (!isInteractive()) {
    console.error('❌ No token provided. Run: npx @nextzy-tech/clickup-git-sync setup --token pk_xxx');
    process.exit(1);
  }

  const existing = readGlobalConfig().CLICKUP_API_TOKEN || '';
  const hint = existing ? ' (leave blank to keep current)' : '';
  const answer = await ask(`Enter your ClickUp Personal API Token${hint}: `);
  const token = answer.trim() || existing;

  if (!token) {
    console.log('Setup aborted. Token cannot be empty.');
    return;
  }

  const p = saveGlobalToken(token);
  console.log(`✓ Token saved to ${p}`);
  console.log('Next: cd into your project and run  npx @nextzy-tech/clickup-git-sync init');
}

module.exports = { run };

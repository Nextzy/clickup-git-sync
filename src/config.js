'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Global (per-user, secret) config: holds the ClickUp API token.
// Lives outside any project so multiple people can each use their own ClickUp.
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.clickup');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.json');

// Project (per-repo, shareable) config: holds the target list name.
// Lives at the project root so a team can commit it to git.
const PROJECT_CONFIG_PATH = path.join(process.cwd(), '.clickup.json');

const DEFAULT_LIST_NAME = '[Project XXL] Football 2026';

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

// --- Global token ---------------------------------------------------------

function readGlobalConfig() {
  return readJson(GLOBAL_CONFIG_PATH) || {};
}

function saveGlobalToken(token) {
  if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  }
  const config = readGlobalConfig();
  config.CLICKUP_API_TOKEN = token;
  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  return GLOBAL_CONFIG_PATH;
}

// Returns the token or exits with a helpful message.
function requireToken() {
  const config = readGlobalConfig();
  const token = config.CLICKUP_API_TOKEN;
  if (!token || token.includes('YOUR_PERSONAL_API_TOKEN')) {
    console.error(`❌ ClickUp API token not found at ${GLOBAL_CONFIG_PATH}`);
    console.error('   Run:  npx clickup-git-sync setup');
    process.exit(1);
  }
  return token;
}

// --- Project config -------------------------------------------------------

function readProjectConfig() {
  return readJson(PROJECT_CONFIG_PATH) || {};
}

function saveProjectConfig(config) {
  fs.writeFileSync(PROJECT_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  return PROJECT_CONFIG_PATH;
}

function getListName() {
  const config = readProjectConfig();
  return config.CLICKUP_LIST_NAME || DEFAULT_LIST_NAME;
}

// Optional: pin a specific workspace by name when the token has several.
function getWorkspaceName() {
  return readProjectConfig().CLICKUP_WORKSPACE_NAME || null;
}

module.exports = {
  GLOBAL_CONFIG_DIR,
  GLOBAL_CONFIG_PATH,
  PROJECT_CONFIG_PATH,
  DEFAULT_LIST_NAME,
  readGlobalConfig,
  saveGlobalToken,
  requireToken,
  readProjectConfig,
  saveProjectConfig,
  getListName,
  getWorkspaceName,
};

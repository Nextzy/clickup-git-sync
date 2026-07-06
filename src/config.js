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
    console.error('   Run:  npx @nextzy-tech/clickup-git-sync setup');
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

// Returns the configured list name, or null when no .clickup.json /
// CLICKUP_LIST_NAME is set. Callers MUST treat null as "not configured" and
// refuse to run — never fall back to a hardcoded list (that silently writes
// to the wrong project).
function getListName() {
  const config = readProjectConfig();
  return config.CLICKUP_LIST_NAME || null;
}

// Optional: pin a specific workspace by name when the token has several.
function getWorkspaceName() {
  return readProjectConfig().CLICKUP_WORKSPACE_NAME || null;
}

// Optional: pin a specific space (client) so list lookup doesn't scan every
// space in the workspace. ID is preferred (stable); name is a human fallback.
function getSpaceId() {
  return readProjectConfig().CLICKUP_SPACE_ID || null;
}

function getSpaceName() {
  return readProjectConfig().CLICKUP_SPACE_NAME || null;
}

// Optional: the monthly folder prefix, e.g. "[True] Support List".
// The month + year are appended automatically at run time (see monthlyFolderName).
function getFolderPrefix() {
  return readProjectConfig().CLICKUP_FOLDER_PREFIX || null;
}

const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Resolve tracked duration (in hours) from flags. Accepts --hours/--h and
// --minutes/--min, and sums them (e.g. --h 1 --min 30 -> 1.5). Returns NaN when
// neither is given or a value is non-numeric, so callers can fall back / error.
function durationHoursFromFlags(flags) {
  const hRaw = flags.hours !== undefined ? flags.hours : flags.h;
  const mRaw = flags.minutes !== undefined ? flags.minutes : flags.min;
  const hasH = hRaw !== undefined;
  const hasM = mRaw !== undefined;
  if (!hasH && !hasM) return NaN;
  const h = hasH ? parseFloat(hRaw) : 0;
  const m = hasM ? parseFloat(mRaw) : 0;
  if (isNaN(h) || isNaN(m)) return NaN;
  return h + m / 60;
}

// True only for a real YYYY-MM-DD date. Used to reject typos instead of
// silently falling back to "today".
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(str || '').trim())) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

// Resolve the target month/year from a YYYY-MM-DD string (timezone-safe:
// parsed directly, not via Date), falling back to the current month.
function monthYearFor(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  if (m) return { month: Number(m[2]) - 1, year: Number(m[1]) };
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

// Build the ACCEPTABLE monthly folder names for a prefix + run date.
// Returns both the abbreviated and full-month spellings because real ClickUp
// folders are inconsistent (e.g. "Jun 2026" vs "June 2026"). Callers compare
// after normalizing whitespace/case, so trailing spaces don't matter.
// e.g. ("[True] Support List", "2026-07-03")
//        -> ["[True] Support List Jul 2026", "[True] Support List July 2026"]
function monthlyFolderCandidates(prefix, dateStr) {
  if (!prefix) return [];
  const { month, year } = monthYearFor(dateStr);
  if (month < 0 || month > 11) return [];
  const names = [
    `${prefix} ${MONTHS_ABBR[month]} ${year}`,
    `${prefix} ${MONTHS_FULL[month]} ${year}`,
  ];
  return [...new Set(names)]; // May: abbr === full
}

module.exports = {
  GLOBAL_CONFIG_DIR,
  GLOBAL_CONFIG_PATH,
  PROJECT_CONFIG_PATH,
  readGlobalConfig,
  saveGlobalToken,
  requireToken,
  readProjectConfig,
  saveProjectConfig,
  getListName,
  getWorkspaceName,
  getSpaceId,
  getSpaceName,
  getFolderPrefix,
  monthlyFolderCandidates,
  isValidDate,
  durationHoursFromFlags,
};

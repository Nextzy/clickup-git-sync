'use strict';

const fs = require('fs');
const path = require('path');

// Per-project append-only log of sync attempts (synced / untracked).
const HISTORY_PATH = path.join(process.cwd(), '.clickup-history.json');

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeHistory(entry) {
  const history = readHistory();
  history.push({ timestamp: new Date().toISOString(), ...entry });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
}

module.exports = { HISTORY_PATH, readHistory, writeHistory };

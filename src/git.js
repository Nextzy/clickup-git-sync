'use strict';

const { execSync } = require('child_process');

function sh(cmd) {
  return execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
}

function isGitRepo() {
  try {
    sh('git rev-parse --is-inside-work-tree');
    return true;
  } catch (e) {
    return false;
  }
}

function status() {
  return sh('git status --porcelain').trim();
}

function stageAll() {
  sh('git add .');
}

function stagedFiles() {
  try {
    return sh('git diff --name-only --cached').trim().split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

function commit(message) {
  execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
}

function shortHash() {
  return sh('git rev-parse --short HEAD').trim();
}

// Map staged files to a ClickUp category by file extension / path.
function detectCategory(files) {
  if (!files || files.length === 0) return 'Support';

  const extMap = {
    Frontend: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.css', '.scss', '.sass', '.html', '.htm'],
    Backend: ['.go', '.py', '.java', '.rs', '.php', '.rb', '.ex', '.exs', '.sql', '.prisma', '.proto'],
    Testing: ['.test.js', '.spec.js', '.test.ts', '.spec.ts', '_test.go', 'test_'],
    Monitor: ['docker-compose', 'dockerfile', '.yaml', '.yml', '.env', 'nginx', 'caddy'],
  };

  const counts = { Frontend: 0, Backend: 0, Testing: 0, Monitor: 0 };

  for (const file of files) {
    const lower = file.toLowerCase();

    if (extMap.Testing.some((t) => lower.includes(t))) { counts.Testing++; continue; }
    if (extMap.Monitor.some((m) => lower.includes(m))) { counts.Monitor++; continue; }

    for (const cat of ['Frontend', 'Backend']) {
      if (extMap[cat].some((ext) => lower.endsWith(ext))) counts[cat]++;
    }
  }

  let maxCat = 'Support';
  let maxVal = 0;
  for (const [cat, val] of Object.entries(counts)) {
    if (val > maxVal) { maxVal = val; maxCat = cat; }
  }
  return maxCat;
}

// Recommend hours from the size of the working-tree diff.
function recommendHours(files) {
  if (!files || files.length === 0) return 1;

  let total = 0;
  try {
    const diffStat = sh('git diff --stat HEAD');
    for (const line of diffStat.split('\n')) {
      const match = line.match(/(\d+)\s+insertion|(\d+)\s+deletion/);
      if (match) total += parseInt(match[1] || 0, 10) + parseInt(match[2] || 0, 10);
    }
  } catch (e) { /* ignore */ }

  if (total < 15) return 0.5;
  if (total < 50) return 1;
  if (total < 150) return 2;
  return 3;
}

module.exports = {
  isGitRepo,
  status,
  stageAll,
  stagedFiles,
  commit,
  shortHash,
  detectCategory,
  recommendHours,
};

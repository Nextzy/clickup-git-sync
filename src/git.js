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

// Commit with a short subject and, optionally, a longer body. Passing both as
// separate -m args makes git render them as "subject\n\nbody" — the standard
// shape (keeps the subject line short, details in the body).
function commit(message, body) {
  const esc = (s) => String(s).replace(/"/g, '\\"');
  const bodyArg = body ? ` -m "${esc(body)}"` : '';
  execSync(`git commit -m "${esc(message)}"${bodyArg}`, { stdio: ['pipe', 'pipe', 'pipe'] });
}

function shortHash() {
  return sh('git rev-parse --short HEAD').trim();
}

// Short detector keys -> the exact ClickUp parent task names. Returning the
// full "Main Task [...]" name is required: resolveParentTask matches by exact
// name, so a short key like "Backend" would create a wrong new parent.
const CATEGORY_TASK = {
  Frontend: 'Main Task [Frontend]',
  Backend: 'Main Task [Backend]',
  Testing: 'Main Task [Testing]',
  Infrastructure: 'Main Task [Infrastructure]',
  Monitor: 'Main Task [Monitor]',
  Support: 'Main Task [Support]',
};

// Classify one file path. Extension alone can't tell Next.js (.ts/.tsx) from
// NestJS (.ts), so path + filename conventions are checked first. Returns a
// short key, or null when there's no confident signal.
function classifyFile(filePath) {
  const p = filePath.toLowerCase();

  // Tests (most specific).
  if (/(\.|_)(test|spec)\.[jt]sx?$|_test\.go$|(^|\/)(tests?|__tests__)\//.test(p)) return 'Testing';

  // Infrastructure: containers, orchestration, IaC, web servers, env/config,
  // and CI/CD. Most CI files are *.yml (caught by \.ya?ml$); Jenkinsfile has no
  // extension so it's matched explicitly.
  if (/docker-compose|dockerfile|(^|\/)\.?env|\.ya?ml$|nginx|caddy|\.tf$|k8s|helm|jenkinsfile|(^|\/)\.github\/workflows\/|gitlab-ci|(^|\/)\.circleci\/|azure-pipelines|bitbucket-pipelines|(^|\/)\.drone/.test(p)) return 'Infrastructure';

  // Path-based app roots (monorepo: frontend/+backend/, web/+api/, apps/web+apps/api).
  // Frontend is checked FIRST so a nested api/ inside a web app (e.g.
  // web/src/api/client.ts) stays Frontend. Bare segments also match the apps/*
  // variants (".../web/", ".../api/").
  if (/(^|\/)(frontend|web|client|mobile)\//.test(p)) return 'Frontend';
  if (/(^|\/)(backend|server|api|nestjs?)\//.test(p)) return 'Backend';

  // NestJS filename conventions -> Backend.
  if (/\.(controller|service|module|entity|dto|resolver|guard|interceptor|middleware|repository|gateway|strategy)\.ts$/.test(p)) return 'Backend';

  // Frontend framework/config + unambiguous frontend extensions.
  if (/next\.config\.|tailwind\.config\.|vite\.config\.|\.(tsx|jsx|vue|svelte|css|scss|sass|less|html?)$/.test(p)) return 'Frontend';

  // Backend config + unambiguous backend extensions.
  if (/nest-cli\.json|(^|\/)prisma\/|\.(go|py|java|rs|php|rb|ex|exs|sql|prisma|proto|kt|cs)$/.test(p)) return 'Backend';

  // Bare .ts/.js/.mjs with no other signal -> unknown (don't guess FE vs BE).
  return null;
}

// Map staged files to a ClickUp category (majority vote). Defaults to Support.
function detectCategory(files) {
  if (!files || files.length === 0) return CATEGORY_TASK.Support;

  const counts = {};
  for (const file of files) {
    const key = classifyFile(file);
    if (key) counts[key] = (counts[key] || 0) + 1;
  }

  let bestKey = 'Support';
  let bestVal = 0;
  for (const [key, val] of Object.entries(counts)) {
    if (val > bestVal) { bestVal = val; bestKey = key; }
  }
  return CATEGORY_TASK[bestKey];
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

'use strict';

// Skill / rules templates scaffolded by `init`, one set per AI tool.
//
// Design: keep these THIN. All real logic (category detection, hour
// recommendation, ClickUp API calls) lives in the CLI, which updates centrally
// via npm. These files only teach the AI *when* and *how* to call the CLI, so
// they rarely need to change.

// The `--category` value must EXACTLY match an existing parent ("Main Task")
// in the ClickUp list — resolveParentTask matches by exact name and will create
// a brand-new task if it doesn't match. So always pass the full name below.
const CATEGORIES = [
  'Main Task [Support]',
  'Main Task [Backend]',
  'Main Task [Frontend]',
  'Main Task [Planning and Learning]',
  'Main Task [Infrastructure]',
  'Main Task [Monitor]',
  'Main Task [Testing]',
  'Main Task [Meeting]',
].join(', ');

// Shared prose describing the two slash commands.
const GIT_COMMIT_STEPS = `When the user triggers \`/clickup-git-commit\`:
1. Inspect uncommitted work with \`git status\` and \`git diff\`.
2. Draft a clean, descriptive commit message from the changes.
3. Pick the category based on the file types — use ONE of these EXACT names:
   ${CATEGORIES}
4. Estimate the tracked time from the ACTUAL complexity of the diff you just
   read — weigh how many files/modules changed, how much real logic vs
   boilerplate, and the risk involved; don't just count lines. Use the line-count
   bands (0.5h docs/typo, 1-2h moderate, 3h+ major) only as a loose sanity check.
   Propose a number and always let the user adjust it.
   Time can be given as \`--hours\`/\`-h\` and/or \`--minutes\`/\`--min\` (they are summed).
5. Ask which date the work should be logged on: press Enter/skip for **today**, or
   give a past date (backdate) or future date in YYYY-MM-DD.
6. Show the proposed message, category, time, and date and ask the user to confirm.
7. On confirmation run the CLI (it stages, commits, and syncs to ClickUp):
   \`\`\`bash
   npx @nextzy-tech/clickup-git-sync commit --message "<msg>" --category "<category>" --hours <h> --min <m> --stage --yes
   \`\`\`
   - Time: use \`--hours\`/\`-h\` and/or \`--minutes\`/\`--min\` (e.g. \`-h 1 --min 30\` = 1.5h).
   - To log on a specific day, add \`--start-date YYYY-MM-DD\` (and optionally
     \`--end-date YYYY-MM-DD\` for a range). Omit both for today.
   - To commit without logging time, add \`--no-log\`.`;

const CLICKUP_LOG_STEPS = `When the user triggers \`/clickup-log\` or asks to log time / manage tasks
directly (no commit), first decide which of these three they want:

**Shared rules for every case below:**
- Category must be ONE of these EXACT names: ${CATEGORIES}
- Time: \`--hours\`/\`--h\` and/or \`--minutes\`/\`--min\` are summed (e.g. \`--h 1 --min 30\` = 1.5h).
- Date: ask which day — Enter/skip = **today**, or a past (backdate) / future date.
  Add \`--start-date YYYY-MM-DD\` (and optionally \`--end-date YYYY-MM-DD\`); omit for today.
- Always confirm the plan with the user before running, then confirm success after.

**A. Log time (create a new subtask + time)** — the default:
\`\`\`bash
npx @nextzy-tech/clickup-git-sync log --task "<task>" --category "<category>" --hours <h> --min <m>
\`\`\`

**B. Log time to an EXISTING task** (user says "add time to <something already there>"):
The user gives a rough task name. Search ONLY the configured list by name:
\`\`\`bash
npx @nextzy-tech/clickup-git-sync add-time --task-name "<rough name>" --hours <h> --min <m>
\`\`\`
If the CLI reports multiple matches, show the candidates to the user, let them pick,
then re-run with the exact id: \`add-time --task-id <id> --hours <h>\`.
By default add-time also adds you as an assignee (additive — the task's creator
stays assigned), which suits shared tasks like meetings. Pass \`--no-assign\` if
the user only wants to log time without being added to the task.

**C. Create a task WITHOUT logging time** (user says "just make the task", "no time"):
\`\`\`bash
npx @nextzy-tech/clickup-git-sync task --task "<task>" --category "<category>"
\`\`\``;

function rulesDoc(tool) {
  return `# ${tool} Workspace Rules - ClickUp Git Sync

This workspace uses the \`clickup-git-sync\` CLI (run via \`npx\`) to sync git
commits and time tracking to ClickUp. All logic lives in the CLI; these rules
only tell you when to invoke it.

> First-time setup (once per machine): \`npx @nextzy-tech/clickup-git-sync setup\`
> Project setup (once per repo): \`npx @nextzy-tech/clickup-git-sync init\`

## Slash Commands

### \`/clickup-git-commit\`
${GIT_COMMIT_STEPS}

### \`/clickup-log [task] [hours] [category]\`
${CLICKUP_LOG_STEPS}
`;
}

function skillDoc(name, description, steps) {
  return `---
name: ${name}
description: ${description}
---

# ${name}

This skill teaches the AI agent how to handle the \`/${name}\` slash command via
the \`clickup-git-sync\` CLI. All logic lives in the CLI (\`npx @nextzy-tech/clickup-git-sync\`).

## Directives

${steps}
`;
}

// Returns [{ path, content }] for the given tool, relative to the project root.
function filesForTool(tool) {
  switch (tool) {
    case 'claude':
      return [
        { path: '.claude/skills/clickup-git-commit/SKILL.md',
          content: skillDoc('clickup-git-commit', 'Stage, commit, and sync the commit to ClickUp category tasks.', GIT_COMMIT_STEPS) },
        { path: '.claude/skills/clickup-log/SKILL.md',
          content: skillDoc('clickup-log', 'Log tasks and track time directly to ClickUp without committing.', CLICKUP_LOG_STEPS) },
      ];
    case 'cursor':
      return [{ path: '.cursorrules', content: rulesDoc('Cursor') }];
    case 'antigravity':
      return [
        { path: '.agents/AGENTS.md', content: rulesDoc('Antigravity') },
        { path: '.agents/skills/clickup-git-commit/SKILL.md',
          content: skillDoc('clickup-git-commit', 'Stage, commit, and sync the commit to ClickUp category tasks.', GIT_COMMIT_STEPS) },
        { path: '.agents/skills/clickup-log/SKILL.md',
          content: skillDoc('clickup-log', 'Log tasks and track time directly to ClickUp without committing.', CLICKUP_LOG_STEPS) },
      ];
    case 'codex':
      return [{ path: 'AGENTS.md', content: rulesDoc('Codex') }];
    default:
      return [];
  }
}

const ALL_TOOLS = ['claude', 'cursor', 'antigravity', 'codex'];

module.exports = { filesForTool, ALL_TOOLS };

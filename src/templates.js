'use strict';

// Skill / rules templates scaffolded by `init`, one set per AI tool.
//
// Design: keep these THIN. All real logic (category detection, hour
// recommendation, ClickUp API calls) lives in the CLI, which updates centrally
// via npm. These files only teach the AI *when* and *how* to call the CLI, so
// they rarely need to change.

const CATEGORIES = 'Planning, Frontend, Backend, Support, Monitor, Testing, Meeting';

// Shared prose describing the two slash commands.
const GIT_COMMIT_STEPS = `When the user triggers \`/git-commit\`:
1. Inspect uncommitted work with \`git status\` and \`git diff\`.
2. Draft a clean, descriptive commit message from the changes.
3. Suggest a category (${CATEGORIES}) based on the file types.
4. Suggest tracked hours (0.5h docs/typo, 1-2h moderate, 3h+ major).
5. Show the proposed message, category, and hours and ask the user to confirm.
6. On confirmation run the CLI (it stages, commits, and syncs to ClickUp):
   \`\`\`bash
   npx clickup-git-sync commit --message "<msg>" --category "<category>" --hours <hours> --stage --yes
   \`\`\`
   To commit without logging time, add \`--no-log\`.`;

const CLICKUP_LOG_STEPS = `When the user triggers \`/clickup-log\` or asks to log time directly (no commit):
1. Determine task name, hours, and category (${CATEGORIES}); ask if missing.
2. Run:
   \`\`\`bash
   npx clickup-git-sync log --task "<task>" --category "<category>" --hours <hours>
   \`\`\`
3. Confirm success to the user.`;

function rulesDoc(tool) {
  return `# ${tool} Workspace Rules - ClickUp Git Sync

This workspace uses the \`clickup-git-sync\` CLI (run via \`npx\`) to sync git
commits and time tracking to ClickUp. All logic lives in the CLI; these rules
only tell you when to invoke it.

> First-time setup (once per machine): \`npx clickup-git-sync setup\`
> Project setup (once per repo): \`npx clickup-git-sync init\`

## Slash Commands

### \`/git-commit\`
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
the \`clickup-git-sync\` CLI. All logic lives in the CLI (\`npx clickup-git-sync\`).

## Directives

${steps}
`;
}

// Returns [{ path, content }] for the given tool, relative to the project root.
function filesForTool(tool) {
  switch (tool) {
    case 'claude':
      return [
        { path: '.claude/skills/git-commit/SKILL.md',
          content: skillDoc('git-commit', 'Stage, commit, and sync the commit to ClickUp category tasks.', GIT_COMMIT_STEPS) },
        { path: '.claude/skills/clickup-log/SKILL.md',
          content: skillDoc('clickup-log', 'Log tasks and track time directly to ClickUp without committing.', CLICKUP_LOG_STEPS) },
      ];
    case 'cursor':
      return [{ path: '.cursorrules', content: rulesDoc('Cursor') }];
    case 'antigravity':
      return [
        { path: '.agents/AGENTS.md', content: rulesDoc('Antigravity') },
        { path: '.agents/skills/git-commit/SKILL.md',
          content: skillDoc('git-commit', 'Stage, commit, and sync the commit to ClickUp category tasks.', GIT_COMMIT_STEPS) },
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

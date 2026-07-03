'use strict';

const { requireToken, getListName, getWorkspaceName, getSpaceId, getSpaceName, getFolderPrefix, monthlyFolderCandidates } = require('./config');
const { resolveWorkspace, resolveList } = require('./api');

// Resolve token + workspace + target list id from project config, scoped by
// space + the monthly folder derived from `dateStr`. Prints progress and
// throws with a helpful message if the list can't be found.
// Returns { token, teamId, listId, listName }.
async function resolveTarget(dateStr) {
  const token = requireToken();
  const listName = getListName();
  if (!listName) {
    throw new Error('No ClickUp list configured (missing .clickup.json). Run "clickup-git-sync init" in this project first.');
  }
  console.log('Resolving ClickUp parameters...');
  const workspace = await resolveWorkspace(token, getWorkspaceName());
  const folderNames = monthlyFolderCandidates(getFolderPrefix(), dateStr);
  if (folderNames.length) console.log(`✓ Folder: "${folderNames[0]}"`);
  const listId = await resolveList(token, workspace.id, listName, {
    spaceId: getSpaceId(), spaceName: getSpaceName(), folderNames,
  });
  if (!listId) {
    const where = folderNames.length
      ? `folder "${folderNames[0]}"`
      : (getSpaceName() ? `space "${getSpaceName()}"` : 'workspace');
    throw new Error(`Could not find list "${listName}" in ${where}.`);
  }
  console.log(`✓ List: "${listName}" (ID: ${listId})`);
  return { token, teamId: workspace.id, listId, listName };
}

module.exports = { resolveTarget };

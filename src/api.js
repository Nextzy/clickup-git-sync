'use strict';

const https = require('https');

const API_BASE = 'https://api.clickup.com/api/v2';

// Low-level HTTPS request to the ClickUp REST API.
function apiRequest({ method, endpoint, token, body }) {
  return new Promise((resolve, reject) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const options = {
      method: method || 'GET',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`API Error [${res.statusCode}]: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Pick the workspace (team). Match by name if provided, else use the first.
async function resolveWorkspace(token, workspaceName) {
  const data = await apiRequest({ method: 'GET', endpoint: '/team', token });
  const teams = data.teams || [];
  if (teams.length === 0) {
    throw new Error('No ClickUp workspaces found for this token.');
  }

  if (workspaceName) {
    const matched = teams.find((t) =>
      t.name.toLowerCase().includes(workspaceName.toLowerCase()));
    if (matched) {
      console.log(`✓ Workspace: "${matched.name}" (ID: ${matched.id})`);
      return matched;
    }
    console.log(`⚠️ Workspace "${workspaceName}" not found; using "${teams[0].name}".`);
  } else if (teams.length > 1) {
    console.log(`ℹ️ ${teams.length} workspaces found; using first: "${teams[0].name}".`);
    console.log('   Set "CLICKUP_WORKSPACE_NAME" in .clickup.json to choose another.');
  }

  console.log(`✓ Workspace: "${teams[0].name}" (ID: ${teams[0].id})`);
  return teams[0];
}

// Walk spaces -> folderless lists -> folders -> lists to find a list by name.
async function resolveList(token, teamId, targetListName) {
  const target = targetListName.toLowerCase();
  const spacesData = await apiRequest({ method: 'GET', endpoint: `/team/${teamId}/space`, token });
  if (!spacesData.spaces) return null;

  for (const space of spacesData.spaces) {
    const listsData = await apiRequest({ method: 'GET', endpoint: `/space/${space.id}/list`, token });
    const direct = (listsData.lists || []).find((l) => l.name.toLowerCase() === target);
    if (direct) return direct.id;

    const foldersData = await apiRequest({ method: 'GET', endpoint: `/space/${space.id}/folder`, token });
    for (const folder of foldersData.folders || []) {
      const folderLists = await apiRequest({ method: 'GET', endpoint: `/folder/${folder.id}/list`, token });
      const inFolder = (folderLists.lists || []).find((l) => l.name.toLowerCase() === target);
      if (inFolder) return inFolder.id;
    }
  }

  return null;
}

// Find the category parent task, creating it if missing (self-healing list).
async function resolveParentTask(token, listId, categoryName) {
  const data = await apiRequest({ method: 'GET', endpoint: `/list/${listId}/task`, token });
  const tasks = data.tasks || [];

  const matched = tasks.find((t) =>
    t.name.toLowerCase() === categoryName.toLowerCase() && !t.parent);
  if (matched) return matched.id;

  console.log(`Category task "${categoryName}" not found. Creating it...`);
  const newTask = await apiRequest({
    method: 'POST',
    endpoint: `/list/${listId}/task`,
    token,
    body: { name: categoryName, status: 'Open' },
  });
  return newTask.id;
}

module.exports = {
  apiRequest,
  resolveWorkspace,
  resolveList,
  resolveParentTask,
};

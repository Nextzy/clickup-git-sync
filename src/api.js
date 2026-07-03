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

// The user that owns the token (used to auto-assign created subtasks to self).
async function resolveCurrentUser(token) {
  const data = await apiRequest({ method: 'GET', endpoint: '/user', token });
  return data.user || null; // { id, username, email, ... }
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

// Normalize a ClickUp name for comparison: trim, collapse inner whitespace,
// lowercase. Real folder/list names often carry stray trailing spaces
// (e.g. "[True] Support List Jul 2026 "), so exact matching is too brittle.
function norm(s) {
  return String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toLowerCase();
}

// Find a list by name, scoped as narrowly as the caller allows.
//
// opts:
//   spaceId      only search this space (skip enumerating every space)
//   spaceName    if no spaceId, only search spaces whose name matches
//   folderNames  array of acceptable folder names; only match lists inside a
//                folder whose (normalized) name is one of these. This is what
//                disambiguates a list name reused across monthly folders.
//
// With no opts it keeps the original behavior: scan every space,
// folderless lists first, then every folder.
async function resolveList(token, teamId, targetListName, opts = {}) {
  const { spaceId, spaceName, folderNames } = opts;
  const target = norm(targetListName);

  // 1. Decide which spaces to search.
  let spaces;
  if (spaceId) {
    spaces = [{ id: spaceId, name: spaceName || String(spaceId) }];
  } else {
    const spacesData = await apiRequest({ method: 'GET', endpoint: `/team/${teamId}/space`, token });
    spaces = spacesData.spaces || [];
    if (spaceName) {
      const wanted = norm(spaceName);
      const matched = spaces.filter((s) => norm(s.name) === wanted);
      if (matched.length === 0) {
        console.log(`⚠️ Space "${spaceName}" not found; scanning all spaces.`);
      } else {
        spaces = matched;
      }
    }
  }

  const wantedFolders = (folderNames || []).map(norm).filter(Boolean);

  for (const space of spaces) {
    const foldersData = await apiRequest({ method: 'GET', endpoint: `/space/${space.id}/folder`, token });
    const folders = foldersData.folders || [];

    // 2a. Folder pinned: only look inside the matching folder(s).
    if (wantedFolders.length) {
      for (const folder of folders.filter((f) => wantedFolders.includes(norm(f.name)))) {
        const folderLists = await apiRequest({ method: 'GET', endpoint: `/folder/${folder.id}/list`, token });
        const inFolder = (folderLists.lists || []).find((l) => norm(l.name) === target);
        if (inFolder) return inFolder.id;
      }
      continue; // don't fall back to other folders / folderless lists
    }

    // 2b. No folder pinned: folderless lists first, then every folder.
    const listsData = await apiRequest({ method: 'GET', endpoint: `/space/${space.id}/list`, token });
    const direct = (listsData.lists || []).find((l) => norm(l.name) === target);
    if (direct) return direct.id;

    for (const folder of folders) {
      const folderLists = await apiRequest({ method: 'GET', endpoint: `/folder/${folder.id}/list`, token });
      const inFolder = (folderLists.lists || []).find((l) => norm(l.name) === target);
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
    // Omit `status` — let the list's default apply (status names vary per list).
    body: { name: categoryName },
  });
  return newTask.id;
}

// Fetch a single task by ID (used to validate/label an --task-id).
async function getTask(token, taskId) {
  return apiRequest({ method: 'GET', endpoint: `/task/${taskId}`, token });
}

// Add assignees to a task WITHOUT removing existing ones (ClickUp's
// { assignees: { add: [...] } } is additive) — so logging time to a shared
// task never kicks off whoever created it.
async function addTaskAssignees(token, taskId, userIds) {
  return apiRequest({
    method: 'PUT',
    endpoint: `/task/${taskId}`,
    token,
    body: { assignees: { add: userIds } },
  });
}

// Search a list (subtasks included) for tasks matching a name. Exact
// (normalized) matches win; otherwise falls back to "contains". Returns
// [{ id, name }]. Note: reads the first page of tasks (ClickUp default ~100).
async function findTasksByName(token, listId, query) {
  const data = await apiRequest({
    method: 'GET',
    endpoint: `/list/${listId}/task?subtasks=true&include_closed=true`,
    token,
  });
  const q = norm(query);
  const tasks = (data.tasks || []).map((t) => ({ id: t.id, name: t.name }));
  const exact = tasks.filter((t) => norm(t.name) === q);
  return exact.length ? exact : tasks.filter((t) => norm(t.name).includes(q));
}

module.exports = {
  apiRequest,
  resolveCurrentUser,
  resolveWorkspace,
  resolveList,
  resolveParentTask,
  getTask,
  addTaskAssignees,
  findTasksByName,
};

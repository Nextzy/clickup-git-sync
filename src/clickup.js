'use strict';

const { apiRequest, resolveParentTask, resolveCurrentUser } = require('./api');

function dateToMs(dateStr) {
  if (!dateStr) return Date.now();
  // Anchor a plain YYYY-MM-DD to NOON UTC (not midnight) so the calendar date
  // survives ClickUp's timezone conversion in either direction — midnight-UTC
  // would render as the previous day for users behind UTC.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T12:00:00Z` : dateStr;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

// Human-friendly duration for logs, e.g. 1.5 -> "1.5h", 0.3333 -> "20m",
// 1.25 -> "1h 15m". Avoids printing long floats like 0.33333333h.
function fmtHours(h) {
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
}

// Create a subtask under the category parent task (no time logged).
// Auto-assigns to the token owner. Returns { parentTaskId, subtaskId, startMs }.
//
// startDateStr / endDateStr are optional YYYY-MM-DD. Empty start -> today.
// Empty end -> same as start.
async function createSubtask({ token, listId, category, taskName, startDateStr, endDateStr }) {
  const parentTaskId = await resolveParentTask(token, listId, category);
  console.log(`✓ Parent task "${category}" (ID: ${parentTaskId})`);

  // Auto-assign the subtask to the token owner. Best-effort: if the lookup
  // fails, still create the subtask (just unassigned).
  let assignees;
  try {
    const me = await resolveCurrentUser(token);
    if (me && me.id) {
      assignees = [me.id];
      console.log(`✓ Assignee: ${me.username || me.email || me.id} (self)`);
    }
  } catch (e) {
    console.log('⚠️ Could not resolve current user; creating subtask unassigned.');
  }

  const startMs = dateToMs(startDateStr);
  const endMs = endDateStr ? dateToMs(endDateStr) : startMs;
  console.log(`Creating subtask "${taskName}"...`);
  const subtask = await apiRequest({
    method: 'POST',
    endpoint: `/list/${listId}/task`,
    token,
    // No `status`: each list defines its own status names, so hardcoding one
    // (e.g. "Open") 400s with "Status not found". Omitting it lets ClickUp use
    // the list's default status.
    body: {
      name: taskName,
      parent: parentTaskId,
      start_date: startMs,
      due_date: endMs,
      ...(assignees ? { assignees } : {}),
    },
  });
  console.log(`✓ Subtask created (ID: ${subtask.id})`);
  return { parentTaskId, subtaskId: subtask.id, startMs };
}

// Create a subtask AND log tracked time to it. Shared path for `commit`/`log`.
// When an explicit start date is given, the time entry is anchored to that day
// too (so backdated logs land on the right date).
async function createSubtaskWithTime({ token, teamId, listId, category, taskName, hours, startDateStr, endDateStr, description }) {
  const { parentTaskId, subtaskId, startMs } = await createSubtask({ token, listId, category, taskName, startDateStr, endDateStr });
  await logTime(token, teamId, subtaskId, hours, description || taskName, startDateStr ? startMs : null);
  console.log(`✓ Tracked ${fmtHours(hours)} to ClickUp.`);
  return { parentTaskId, subtaskId };
}

// Log time to an EXISTING task (no creation). Anchors to startDateStr if given.
async function addTimeToTask({ token, teamId, taskId, hours, startDateStr, description }) {
  const atMs = startDateStr ? dateToMs(startDateStr) : null;
  await logTime(token, teamId, taskId, hours, description, atMs);
  console.log(`✓ Tracked ${fmtHours(hours)} to ClickUp.`);
}

// Log a time entry spanning `durationHours`. If `atMs` is given the entry
// starts at that moment (used to place backdated logs on the chosen day);
// otherwise it ends "now".
async function logTime(token, teamId, taskId, durationHours, description, atMs) {
  const durationMs = Math.round(durationHours * 3600 * 1000);
  const start = (atMs != null) ? atMs : (Date.now() - durationMs);
  await apiRequest({
    method: 'POST',
    endpoint: `/team/${teamId}/time_entries`,
    token,
    body: {
      tid: taskId,
      start,
      duration: durationMs,
      description: description || 'Logged via clickup-git-sync',
      billable: true,
    },
  });
}

module.exports = { createSubtask, createSubtaskWithTime, addTimeToTask, logTime, dateToMs };

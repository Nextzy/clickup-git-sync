'use strict';

const { apiRequest, resolveParentTask } = require('./api');

function dateToMs(dateStr) {
  if (!dateStr) return Date.now();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

// Create a subtask under the category parent task and log tracked time to it.
// This is the single shared path used by both `commit` and `log`.
async function createSubtaskWithTime({ token, teamId, listId, category, taskName, hours, dateStr, description }) {
  const parentTaskId = await resolveParentTask(token, listId, category);
  console.log(`✓ Parent task "${category}" (ID: ${parentTaskId})`);

  const dateMs = dateToMs(dateStr);
  console.log(`Creating subtask "${taskName}"...`);
  const subtask = await apiRequest({
    method: 'POST',
    endpoint: `/list/${listId}/task`,
    token,
    body: {
      name: taskName,
      parent: parentTaskId,
      start_date: dateMs,
      due_date: dateMs,
      status: 'Open',
    },
  });
  console.log(`✓ Subtask created (ID: ${subtask.id})`);

  await logTime(token, teamId, subtask.id, hours, description || taskName);
  console.log(`✓ Tracked ${hours}h to ClickUp.`);

  return { parentTaskId, subtaskId: subtask.id };
}

// Log a time entry ending "now" spanning `durationHours`.
async function logTime(token, teamId, taskId, durationHours, description) {
  const durationMs = Math.round(durationHours * 3600 * 1000);
  const nowMs = Date.now();
  await apiRequest({
    method: 'POST',
    endpoint: `/team/${teamId}/time_entries`,
    token,
    body: {
      tid: taskId,
      start: nowMs - durationMs,
      duration: durationMs,
      description: description || 'Logged via clickup-git-sync',
      billable: true,
    },
  });
}

module.exports = { createSubtaskWithTime, logTime, dateToMs };

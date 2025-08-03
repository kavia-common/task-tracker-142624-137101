//
// API utility functions for Task Tracker React frontend
// Handles authentication, JWT storage, all Task CRUD, filtering, etc.
// Uses environment variable: REACT_APP_API_URL
//

// PUBLIC_INTERFACE
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Secure localStorage key for JWT
const TOKEN_KEY = 'tt_jwt_token';

// PUBLIC_INTERFACE
export function storeToken(token) {
  /** Securely stores JWT to localStorage (minimal exposure). */
  localStorage.setItem(TOKEN_KEY, token);
}

// PUBLIC_INTERFACE
export function getToken() {
  /** Retrieves JWT token from localStorage */
  return localStorage.getItem(TOKEN_KEY);
}

// PUBLIC_INTERFACE
export function clearToken() {
  /** Clears stored JWT (logout for client). */
  localStorage.removeItem(TOKEN_KEY);
}

// Helper to attach JWT auth header
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// PUBLIC_INTERFACE
export async function apiLogin(email, password) {
  /**
   * Log in user; returns {user, token} or throws error.
   */
  const resp = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password })
  });
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || 'Login failed');
  }
  return resp.json();
}

// PUBLIC_INTERFACE
export async function apiRegister(email, password, name) {
  /**
   * Register new user; returns {user, token} or throws error.
   */
  const resp = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password, name })
  });
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || 'Registration failed');
  }
  return resp.json();
}

// PUBLIC_INTERFACE
export async function apiLogout() {
  /** Log out is stateless: just tell backend, always clears JWT */
  await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: { ...authHeaders() }});
  clearToken();
}

// PUBLIC_INTERFACE
export async function fetchTasks(filters={}) {
  /**
   * Fetch tasks for logged-in user, optional filters.
   * filters can include: status, priority, sortBy, order
   */
  const qs = new URLSearchParams(filters).toString();
  const url = `${API_BASE_URL}/tasks${qs ? '?' + qs : ''}`;
  const resp = await fetch(url, {
    headers: { ...authHeaders() }
  });
  if (!resp.ok) {
    throw new Error('Failed to fetch tasks');
  }
  const data = await resp.json();
  return data.tasks || [];
}

// PUBLIC_INTERFACE
export async function fetchTask(id) {
  /** Fetch a single task by ID. */
  const resp = await fetch(`${API_BASE_URL}/tasks/${id}`, { headers: authHeaders() });
  if (!resp.ok)
    throw new Error('Task not found');
  const data = await resp.json();
  return data.task;
}

// PUBLIC_INTERFACE
export async function createTask(taskData) {
  /** Create a new task (fields: title, description, dueDate, ...). */
  const resp = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(taskData)
  });
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || 'Failed to create task');
  }
  return (await resp.json()).task;
}

// PUBLIC_INTERFACE
export async function updateTask(id, updates) {
  /** Update a task (PUT). */
  const resp = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(updates)
  });
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || 'Failed to update task');
  }
  return (await resp.json()).task;
}

// PUBLIC_INTERFACE
export async function deleteTask(id) {
  /** Delete a task by ID. */
  const resp = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  if (!resp.ok)
    throw new Error('Failed to delete task');
}

// PUBLIC_INTERFACE
export async function completeTask(id) {
  /** Toggle completion status for the given task. */
  const resp = await fetch(`${API_BASE_URL}/tasks/${id}/complete`, {
    method: 'POST',
    headers: { ...authHeaders() }
  });
  if (!resp.ok)
    throw new Error('Failed to mark task as completed');
  return (await resp.json()).task;
}

// PUBLIC_INTERFACE
export async function scheduleEmailReminder(id, email) {
  /**
   * Schedules a manual email notification for a task.
   */
  const resp = await fetch(`${API_BASE_URL}/tasks/${id}/schedule-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ email })
  });
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || 'Could not schedule email.');
  }
  return resp.json();
}

// PUBLIC_INTERFACE
export async function createTaskFromEmailDrag(subject, body, dueDate=null) {
  /**
   * Create a task from a dragged email (subject, body, optional dueDate).
   * Use this for drag-and-drop email-to-task.
   */
  return createTask({ title: subject, description: body, dueDate });
}

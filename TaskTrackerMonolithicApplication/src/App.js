import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

// API Layer for backend communication
import {
  apiLogin, apiRegister, apiLogout, storeToken, getToken, clearToken,
  fetchTasks, createTask, updateTask, deleteTask, completeTask
} from './api';

/**
 * Main App component with API, auth, tasks state
 */
function App() {
  // Global UI State
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  const [jwt, setJwt] = useState(getToken());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [authMode, setAuthMode] = useState('login'); // or 'register'
  // Simple form state for demo
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '' });

  // Sync theme with document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load user and tasks from token on mount
  useEffect(() => {
    if (jwt) {
      // Try to restore user and tasks
      setLoading(true);
      fetchTasks().then(setTasks).catch(() => setTasks([])).finally(() => setLoading(false));
      // For demo, decode JWT payload (not for production user info)
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        setUser({ id: payload.id, email: payload.email, name: payload.name, role: payload.role });
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
      setTasks([]);
    }
  }, [jwt]);

  // Theme toggle
  const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));

  // Auth handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setApiError('');
    setLoading(true);
    try {
      const { token, user } = await apiLogin(form.email, form.password);
      storeToken(token);
      setJwt(token);
      setUser(user);
      setAuthMode('login');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setApiError('');
    setLoading(true);
    try {
      const { token, user } = await apiRegister(form.email, form.password, form.name);
      storeToken(token);
      setJwt(token);
      setUser(user);
      setAuthMode('login');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setApiError('');
    await apiLogout();
    setJwt(null); setUser(null); setTasks([]);
    clearToken();
  };

  // Task Handlers
  const handleFetchTasks = async () => {
    setLoading(true);
    try { setTasks(await fetchTasks()); }
    catch { setApiError('Could not fetch tasks'); }
    finally { setLoading(false); }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setApiError('');
    setLoading(true);
    try {
      await createTask(taskForm);
      setTaskForm({ title: '', description: '', dueDate: '' });
      await handleFetchTasks();
    } catch (err) {
      setApiError(err.message);
    } finally { setLoading(false); }
  };

  const handleDeleteTask = async (id) => {
    setLoading(true);
    try { await deleteTask(id); await handleFetchTasks(); }
    catch { setApiError('Delete failed'); }
    finally { setLoading(false); }
  };

  const handleCompleteTask = async (id) => {
    setLoading(true);
    try { await completeTask(id); await handleFetchTasks(); }
    catch { setApiError('Complete failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <img src={logo} className="App-logo" alt="logo" />
        <h2>Task Tracker</h2>
        <p>Modern React + Express Task Tracking</p>
        {user ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <div>Welcome, <b>{user.name || user.email}</b>
                <button onClick={handleLogout} style={{
                  marginLeft: 16, background: "var(--button-bg)", color: "var(--button-text)"
                }}>Logout</button>
              </div>
            </div>
            <form onSubmit={handleCreateTask} style={{ marginBottom: 16 }}>
              <h4>Create Task</h4>
              <input
                type="text" placeholder="Title" required
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                style={{ marginRight: 8 }}
              />
              <input
                type="text" placeholder="Description"
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                style={{ marginRight: 8 }}
              />
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                style={{ marginRight: 8 }}
              />
              <button type="submit" disabled={loading}>Add Task</button>
            </form>
            <button onClick={handleFetchTasks} style={{ marginBottom: 8 }}>Reload Tasks</button>
            <div>
              <h4>My Tasks</h4>
              {loading && <div>Loading...</div>}
              {apiError && <div style={{ color: 'tomato' }}>{apiError}</div>}
              <ul style={{ listStyle: "none", padding: 0 }}>
                {tasks.length
                  ? tasks.map(task =>
                    <li key={task._id} style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: 6, margin: "8px 0", padding: 8, background: "#fff1"
                    }}>
                      <div>
                        <b>{task.title}</b> {task.status === 'completed' && "✅"}
                        <button onClick={() => handleDeleteTask(task._id)}
                          style={{ float: "right", background: "none", color: "crimson" }}>&times;</button>
                        <button onClick={() => handleCompleteTask(task._id)}
                          style={{ float: "right", marginRight: 4, background: "none" }}>✓</button>
                      </div>
                      <div>{task.description}</div>
                      <div>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}</div>
                    </li>)
                  : !loading && <li>No tasks found.</li>}
              </ul>
            </div>
            {/* Drag-and-drop/email task creation and filtering UI placeholder */}
          </>
        ) : (
          <div>
            <div>
              <button style={{margin: 6}} onClick={() => setAuthMode('login')}>Login</button>
              <button style={{margin: 6}} onClick={() => setAuthMode('register')}>Register</button>
            </div>
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}
              style={{ marginTop: 18 }}>
              <h3>{authMode === 'login' ? "Login" : "Register"}</h3>
              <input required autoFocus
                type="email" placeholder="Email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ marginBottom: 8 }} />
              <br />
              <input required
                type="password" placeholder="Password"
                minLength={6}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ marginBottom: 8 }} />
              <br />
              {authMode === 'register' &&
                <input
                  type="text" placeholder="Name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ marginBottom: 8 }} />}
              <br />
              <button disabled={loading} type="submit">
                {authMode === 'login' ? "Login" : "Register"}
              </button>
            </form>
            {apiError && <div style={{ color: 'tomato' }}>{apiError}</div>}
          </div>
        )}
        <p>Current theme: <strong>{theme}</strong></p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;

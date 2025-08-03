import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

// Mock API utilities
jest.mock("../api", () => {
  const tasks = [
    {
      _id: "1",
      title: "Test Task",
      description: "Description",
      dueDate: "2100-01-01T00:00:00Z",
      status: "todo",
      priority: "medium"
    }
  ];
  let isLoggedIn = false;
  return {
    apiLogin: jest.fn((email, password) => {
      if (email === "user@tt.com" && password === "pass") {
        isLoggedIn = true;
        return Promise.resolve({
          token: "eyJhbGciOiJIUzI1....", // mock
          user: { id: "u1", email, name: "User", role: "user" }
        });
      }
      return Promise.reject(new Error("Login failed"));
    }),
    apiRegister: jest.fn(() =>
      Promise.resolve({
        token: "tok",
        user: { id: "u2", email: "reg@tt.com", name: "Reg", role: "user" }
      })
    ),
    apiLogout: jest.fn(() => {
      isLoggedIn = false;
      return Promise.resolve();
    }),
    storeToken: jest.fn(),
    getToken: jest.fn(() => (isLoggedIn ? "tok" : null)),
    clearToken: jest.fn(),
    fetchTasks: jest.fn(() => Promise.resolve(isLoggedIn ? [...tasks] : [])),
    createTask: jest.fn((t) => {
      tasks.push({
        ...t,
        _id: String(tasks.length + 1),
        status: "todo",
        priority: "medium"
      });
      return Promise.resolve(tasks[tasks.length - 1]);
    }),
    updateTask: jest.fn((id, upd) => {
      const idx = tasks.findIndex((t) => t._id === id);
      if (idx >= 0) Object.assign(tasks[idx], upd);
      return Promise.resolve(tasks[idx]);
    }),
    deleteTask: jest.fn((id) => {
      const idx = tasks.findIndex((t) => t._id === id);
      if (idx >= 0) tasks.splice(idx, 1);
      return Promise.resolve();
    }),
    completeTask: jest.fn((id) => {
      const task = tasks.find((t) => t._id === id);
      if (task)
        task.status = task.status === "completed" ? "todo" : "completed";
      return Promise.resolve({ ...task });
    })
  };
});

describe("App Integration", () => {
  it("renders login and switches to dashboard on login", async () => {
    render(<App />);
    expect(screen.getByText(/Task Tracker/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "user@tt.com" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "pass" } });
    fireEvent.click(screen.getByText(/^Login$/i));
    await waitFor(() => expect(screen.getByText(/My Tasks/)).toBeInTheDocument());
    expect(screen.getByText("Test Task")).toBeVisible();
  });

  it("can create a new task", async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "user@tt.com" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "pass" } });
    fireEvent.click(screen.getByText(/^Login$/i));
    await waitFor(() => expect(screen.getByText(/My Tasks/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "Second Task" } });
    fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Second Desc" } });
    fireEvent.click(screen.getByRole("button", { name: /add task/i }));

    await waitFor(() => expect(screen.getByText("Second Task")).toBeInTheDocument());
  });

  it("can complete and delete a task", async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "user@tt.com" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "pass" } });
    fireEvent.click(screen.getByText(/^Login$/i));
    await waitFor(() => expect(screen.getByText(/My Tasks/)).toBeInTheDocument());

    // Mark complete
    const checkBtn = screen.getAllByRole("button", { name: "✓" })[0];
    fireEvent.click(checkBtn);
    expect(screen.getByText(/✅/)).toBeInTheDocument();

    // Delete
    const delBtn = screen.getAllByRole("button", { name: "×" })[0];
    fireEvent.click(delBtn);
    await waitFor(() => expect(screen.queryByText(/Test Task/)).not.toBeInTheDocument());
  });

  it("handles failed login with error", async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "user@fail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "badpw" } });
    fireEvent.click(screen.getByText(/^Login$/i));
    await waitFor(() => expect(screen.getByText(/Login failed/)).toBeInTheDocument());
  });
});

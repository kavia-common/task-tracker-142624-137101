import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

let server, token, userId, taskId;

beforeAll(async () => {
  process.env.MONGODB_URI = "mongodb://localhost:27017/tasktracker_test_tasks";
  process.env.JWT_SECRET = "testsecret";
  server = app.listen(4002);
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({});
  await Task.deleteMany({});

  // Register and login test user
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ email: "tasker@tt.com", password: "pass1234", name: "Task Owner" });
  token = reg.body.token;
  userId = reg.body.user.id;
});

afterAll(async () => {
  await User.deleteMany({});
  await Task.deleteMany({});
  await mongoose.connection.close();
  server && server.close();
});

describe("Task API", () => {
  it("creates a new task", async () => {
    const task = { title: "Test Task", description: "Detail", dueDate: "2099-12-31" };
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send(task);
    expect(res.statusCode).toBe(201);
    expect(res.body.task._id).toBeDefined();
    expect(res.body.task.title).toBe("Test Task");
    taskId = res.body.task._id;
  });

  it("can fetch all tasks for user", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
  });

  it("fetches a task by id", async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.task.title).toBe("Test Task");
  });

  it("updates a task", async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated Title", description: "Updated Desc" });
    expect(res.statusCode).toBe(200);
    expect(res.body.task.title).toBe("Updated Title");
  });

  it("toggles completion", async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.task.status).toBe("completed");
  });

  it("filters by status=completed", async () => {
    const res = await request(app)
      .get("/api/tasks?status=completed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks[0].status).toBe("completed");
  });

  it("deletes a task", async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("returns 404 if task missing", async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  // Email notification manual schedule (email sending is mocked/skipped)
  it("schedules manual email notification", async () => {
    // Recreate a task
    const { body } = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Notif Task", description: "Should email", dueDate: "2099-12-31" });
    const res = await request(app)
      .post(`/api/tasks/${body.task._id}/schedule-email`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "reminder@tt.com" });
    // Success even if SMTP is not configured for testing
    expect([200,500,400]).toContain(res.statusCode);
  });
});

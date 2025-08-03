import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js"; // The Express app instance
import User from "../models/User.js";

let server;

beforeAll(async () => {
  // Use a separate test database
  process.env.MONGODB_URI = "mongodb://localhost:27017/tasktracker_test_auth";
  process.env.JWT_SECRET = "testsecret";
  server = app.listen(4001);
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
  server && server.close();
});

describe("Auth API", () => {
  it("registers a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@tt.com", password: "strongpass", name: "Test User" });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.email).toBe("test@tt.com");
    expect(res.body.token).toBeDefined();
  });

  it("prevents duplicate email register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@tt.com", password: "anotherone", name: "Dup" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already/i);
  });

  it("logs in an existing user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@tt.com", password: "strongpass" });

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
  });

  it("prevents login with bad password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@tt.com", password: "wrong" });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for invalid registration data", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bademail", password: "12" });

    expect(res.statusCode).toBe(400);
  });

  it("allow logout for stateless token", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/logout/i);
  });
});

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// Root health check route
// PUBLIC_INTERFACE
app.get("/", (req, res) => {
  /**
   * Health check endpoint.
   * Returns a simple OK status.
   */
  res.status(200).json({ status: "OK", message: "Task Tracker Backend is running." });
});

// MongoDB Connection
// PUBLIC_INTERFACE
async function connectDB() {
  /**
   * Connects to MongoDB using Mongoose.
   * Connection string taken from process.env.MONGODB_URI.
   */
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("MongoDB connected.");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

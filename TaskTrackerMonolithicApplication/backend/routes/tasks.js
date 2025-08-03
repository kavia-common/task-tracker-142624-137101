import express from "express";
import { body, param, query, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import Task from "../models/Task.js";
import User from "../models/User.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/**
 * JWT authentication middleware.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Missing Authorization header." });

  const token = authHeader.replace(/^Bearer\s/, "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired token." });
  }
}

/**
 * Input validation for task creation and update
 */
const taskValidation = [
  body("title").isString().trim().notEmpty().withMessage("Title required."),
  body("description").optional().isString(),
  body("dueDate").optional().isISO8601().toDate(),
  body("status")
    .optional()
    .isIn(["todo", "in_progress", "completed"])
    .withMessage("Invalid status."),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Invalid priority."),
  body("assignedTo")
    .optional()
    .isString()
    .isLength({ min: 20, max: 50 })
];

/**
 * Helper: Construct nodemailer transporter from env vars.
 */
function getMailer() {
  if (!process.env.SMTP_HOST)
    throw new Error("SMTP_HOST not configured in env");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send email notification using nodemailer.
 */
async function sendDueDateEmail(toEmail, task) {
  const transporter = getMailer();
  const due = new Date(task.dueDate).toLocaleString();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Task Due Soon: " + task.title,
    text: `Your task "${task.title}" is due on ${due}.\n\nDescription: ${task.description || ""}\n\nPlease complete it in Task Tracker.`,
  });
}

/**
 * Middleware to validate request and return errors formatted.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
}

// PUBLIC_INTERFACE
router.get(
  "/",
  authMiddleware,
  [
    query("status").optional().isIn(["todo", "in_progress", "completed"]),
    query("priority").optional().isIn(["low", "medium", "high"]),
    query("sortBy").optional().isIn(["dueDate", "priority", "createdAt"]),
    query("order").optional().isIn(["asc", "desc"]),
  ],
  validate,
  async (req, res) => {
    /**
     * Retrieves user's tasks, optionally filtered/sorted using query params.
     * Query: ?status=&priority=&sortBy=&order=
     * Only tasks where creator===user.id or assignedTo===user.id are included.
     */
    const { status, priority, sortBy = "dueDate", order = "asc" } = req.query;
    const filter = {
      $or: [{ creator: req.user.id }, { assignedTo: req.user.id }],
    };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    let queryRef = Task.find(filter);

    if (sortBy) {
      const s = {};
      s[sortBy] = order === "asc" ? 1 : -1;
      queryRef = queryRef.sort(s);
    }

    try {
      const tasks = await queryRef.exec();
      res.status(200).json({ tasks });
    } catch (err) {
      res.status(500).json({ message: "Could not fetch tasks", error: err.message });
    }
  }
);

// PUBLIC_INTERFACE
router.post(
  "/",
  authMiddleware,
  taskValidation,
  validate,
  async (req, res) => {
    /**
     * Create a new task for the user (as creator).
     * Optionally schedule email notification if dueDate is set.
     */
    const userId = req.user.id;
    const { title, description, dueDate, status, priority, assignedTo } = req.body;

    const task = new Task({
      title,
      description,
      dueDate,
      status: status || "todo",
      priority: priority || "medium",
      creator: userId,
      assignedTo: assignedTo || userId,
    });

    try {
      await task.save();

      // If dueDate exists and notification recipient available, schedule email 24hrs prior.
      if (dueDate) {
        const assignedUser = await User.findById(task.assignedTo || userId);
        if (assignedUser?.email) {
          const msUntil = new Date(dueDate).getTime() - Date.now() - 24 * 60 * 60 * 1000;
          if (msUntil > 0) {
            setTimeout(() => {
              sendDueDateEmail(assignedUser.email, task).catch(console.error);
            }, msUntil);
          }
        }
      }

      res.status(201).json({ task });
    } catch (err) {
      res.status(500).json({ message: "Failed to create task", error: err.message });
    }
  }
);

// PUBLIC_INTERFACE
router.get(
  "/:id",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    /**
     * Get task by ID if creator or assigned.
     */
    const id = req.params.id;
    try {
      const task = await Task.findById(id);
      if (!task)
        return res.status(404).json({ message: "Task not found." });

      if (
        !(
          String(task.creator) === req.user.id ||
          String(task.assignedTo) === req.user.id
        )
      ) {
        return res.status(403).json({ message: "Unauthorized for this task." });
      }

      res.status(200).json({ task });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch task", error: err.message });
    }
  }
);

// PUBLIC_INTERFACE
router.put(
  "/:id",
  authMiddleware,
  param("id").isMongoId(),
  taskValidation,
  validate,
  async (req, res) => {
    /**
     * Update a task if user is creator or assigned user.
     */
    const id = req.params.id;
    try {
      const task = await Task.findById(id);
      if (!task)
        return res.status(404).json({ message: "Task not found." });

      if (
        !(
          String(task.creator) === req.user.id ||
          String(task.assignedTo) === req.user.id
        )
      ) {
        return res.status(403).json({ message: "Unauthorized for this task." });
      }

      Object.assign(task, req.body);
      await task.save();
      res.status(200).json({ task });
    } catch (err) {
      res.status(500).json({ message: "Failed to update task", error: err.message });
    }
  }
);

// PUBLIC_INTERFACE
router.delete(
  "/:id",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    /**
     * Delete a task if creator (not just assigned).
     */
    const id = req.params.id;
    try {
      const task = await Task.findById(id);
      if (!task)
        return res.status(404).json({ message: "Task not found." });

      if (String(task.creator) !== req.user.id)
        return res.status(403).json({ message: "Only creator can delete." });

      await task.deleteOne();
      res.status(200).json({ message: "Task deleted." });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete task", error: err.message });
    }
  }
);

// PUBLIC_INTERFACE
router.post(
  "/:id/complete",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    /**
     * Toggle completion status of a task for current user/assignee.
     * Only allows "status" to move to completed or toggle back.
     */
    const id = req.params.id;
    try {
      const task = await Task.findById(id);
      if (!task)
        return res.status(404).json({ message: "Task not found." });

      if (
        !(
          String(task.creator) === req.user.id ||
          String(task.assignedTo) === req.user.id
        )
      ) {
        return res.status(403).json({ message: "Unauthorized." });
      }

      task.status = task.status === "completed" ? "todo" : "completed";
      await task.save();
      res.status(200).json({ task });
    } catch (err) {
      res.status(500).json({ message: "Failed to toggle completion", error: err.message });
    }
  }
);

// PUBLIC_INTERFACE
router.post(
  "/:id/schedule-email",
  authMiddleware,
  param("id").isMongoId(),
  body("email").isEmail(),
  validate,
  async (req, res) => {
    /**
     * Schedule a manual email notification for a task.
     * Request: { email }
     */
    const { email } = req.body;
    const id = req.params.id;
    try {
      const task = await Task.findById(id);
      if (!task)
        return res.status(404).json({ message: "Task not found." });

      // Allow only assignee or creator to schedule manual reminders
      if (
        !(
          String(task.creator) === req.user.id ||
          String(task.assignedTo) === req.user.id
        )
      ) {
        return res.status(403).json({ message: "Unauthorized." });
      }

      await sendDueDateEmail(email, task);

      res.status(200).json({ message: "Reminder email scheduled (sent to SMTP server)." });
    } catch (err) {
      res.status(500).json({ message: "Failed to send email", error: err.message });
    }
  }
);

export default router;

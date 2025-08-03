import express from "express";
const router = express.Router();

// PUBLIC_INTERFACE
router.get("/", (req, res) => {
  /**
   * Retrieves list of tasks for the current user.
   */
  res.status(501).json({ message: "Task list endpoint not implemented yet." });
});

// PUBLIC_INTERFACE
router.post("/", (req, res) => {
  /**
   * Creates a new task.
   */
  res.status(501).json({ message: "Task creation endpoint not implemented yet." });
});

export default router;

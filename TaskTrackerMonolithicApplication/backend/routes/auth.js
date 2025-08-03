import express from "express";
const router = express.Router();

// PUBLIC_INTERFACE
router.post("/register", (req, res) => {
  /**
   * Registers a new user.
   * Request: { email, password }
   */
  res.status(501).json({ message: "Register endpoint not implemented yet." });
});

// PUBLIC_INTERFACE
router.post("/login", (req, res) => {
  /**
   * Logs in an existing user.
   * Request: { email, password }
   */
  res.status(501).json({ message: "Login endpoint not implemented yet." });
});

export default router;

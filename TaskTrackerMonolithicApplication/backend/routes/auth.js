import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();

/**
 * Generates and returns JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

/**
 * Middleware to validate request body fields for register and login
 */
const validateRegistration = [
  body("email").isEmail().withMessage("Valid email is required."),
  body("password").isLength({ min: 6 }).withMessage("Password min 6 chars."),
  body("name").optional().isString().isLength({ max: 100 }),
];

const validateLogin = [
  body("email").isEmail().withMessage("Valid email required."),
  body("password").isString().notEmpty().withMessage("Password required."),
];

// PUBLIC_INTERFACE
router.post("/register", validateRegistration, async (req, res) => {
  /**
   * Registers a new user.
   * Request: { email, password, name (optional) }
   * Returns: JWT token and user info on success.
   */
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password, name } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already registered." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      passwordHash,
      name: name || "",
    });
    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed.", error: err.message });
  }
});

// PUBLIC_INTERFACE
router.post("/login", validateLogin, async (req, res) => {
  /**
   * Logs in an existing user.
   * Request: { email, password }
   * Returns: JWT token and user info on success.
   */
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password." });

    const token = generateToken(user);

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed.", error: err.message });
  }
});

// PUBLIC_INTERFACE
router.post("/logout", (req, res) => {
  /**
   * Logout endpoint: JWT tokens are stateless—
   * The frontend should discard the token to "logout" the user.
   */
  res.status(200).json({ message: "Logged out. (Client should clear token.)" });
});

export default router;

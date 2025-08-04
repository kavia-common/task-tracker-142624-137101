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

/**
 * Deep diagnostic registration with detailed logging for input, validation, and error flows.
 * Logs inbound data, all validation errors, and backend pattern mismatches for diagnosis.
 */
router.post("/register", validateRegistration, async (req, res) => {
  // Log inbound request body for diagnostics (in production, mask password)
  console.log("[DIAG][REGISTER] Inbound body:", {
    ...req.body,
    password: req.body.password ? "***" : undefined,
  });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log express-validator errors including their params and values
    console.warn("[DIAG][REGISTER] Express-validator errors:", errors.array());
    // Add field-annotated feedback in response
    const annotated = errors.array().map(e => ({
      field: e.param,
      value: req.body?.[e.param],
      expected: e.msg,
      type: "express-validator"
    }));
    return res.status(400).json({ 
      errors: annotated,
      summary: annotated.map(e => `[${e.field}]: "${e.value}" — ${e.expected}`).join(" | ")
    });
  }

  const { email, password, name } = req.body;

  try {
    // Log extracted values
    console.log("[DIAG][REGISTER] Clean values: email=", email, "name=", name);

    const exists = await User.findOne({ email });
    if (exists) {
      console.warn("[DIAG][REGISTER] Duplicate email detected:", email);
      return res.status(400).json({ message: "Email already registered.", field: "email", code: "duplicate_email" });
    }

    // Defensive: Check email regex here (even if express-validator passed)
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(email)) {
      console.error("[DIAG][REGISTER] Email failed regex pattern:", email);
      return res.status(400).json({ 
        message: "Email failed pattern validation.",
        field: "email",
        value: email,
        expected: "Something@domain.tld",
        code: "email_pattern"
      });
    }

    // Check for non-printable/invisible Unicode in name (including ZWSP, RTL, non-BMP, control etc)
    if (typeof name === "string" && /[\u200B-\u200F\u202A-\u202F\u2060-\u206F]/.test(name)) {
      return res.status(400).json({
        message: "Name contains invisible or special Unicode characters.",
        field: "name",
        code: "name_invisible_unicode"
      });
    }

    // Trim and check for names that are just whitespace (after .trim)
    if (typeof name === "string" && name.trim() === "" && name.length > 0) {
      return res.status(400).json({
        message: "Name cannot be empty/whitespace.",
        field: "name",
        value: name,
        code: "name_whitespace"
      });
    }

    // Hash password (mask actual password for logs)
    const passwordHash = await bcrypt.hash(password, 10);

    // Also log field types for debugging
    console.log("[DIAG][REGISTER] Pre-save typeofs:", {
      email: typeof email, passwordHash: typeof passwordHash, name: typeof name
    });

    const user = new User({
      email,
      passwordHash,
      name: typeof name === "string" ? name : "",
    });

    // Before saving, hook into mongoose validation step
    let saveResult, saveError;
    try {
      saveResult = await user.save();
      console.log("[DIAG][REGISTER] User saved:", saveResult?._id || null);
    } catch (saveErr) {
      saveError = saveErr;
      console.error("[DIAG][REGISTER] Mongoose save error:", saveErr);

      if (saveErr.errors) {
        for (const [field, suberr] of Object.entries(saveErr.errors)) {
          // This will catch pattern/regex, length, required, etc
          console.error(`[DIAG][REGISTER] Field error [${field}]: ${suberr.message} (type=${suberr.kind}, path=${suberr.path}, value=${suberr.value})`);
        }
      }
      // Bubble Mongoose validation up for standard processing below
      throw saveErr;
    }

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
    // Field-level mongoose validation error extraction with full context
    if (err.name === "ValidationError" && err.errors) {
      // Collect per-field details, including kind, path, value, message, pattern (if any)
      const errorDetails = Object.entries(err.errors).map(([field, e]) => ({
        field,
        value: e.value,
        message: e.message,
        kind: e.kind,
        pattern: e?.properties?.match ? String(e.properties.match) : undefined,
        code: "mongoose_" + e.kind
      }));
      console.error("[DIAG][REGISTER] Mongoose ValidationError:", errorDetails);

      return res.status(400).json({
        errors: errorDetails,
        summary: errorDetails.map(e =>
          `[${e.field}]: "${e.value}" — ${e.message}${e.pattern ? ` (pattern: ${e.pattern})` : ""}`
        ).join(" | ")
      });
    }
    // Duplicate key error (race condition/fallback)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      console.warn("[DIAG][REGISTER] Duplicate key for email:", err.keyValue?.email);
      return res.status(400).json({ message: "Email already registered.", field: "email", code: "duplicate_email" });
    }

    // Log all other errors (could conceal previous pattern mismatch bugs)
    console.error("[DIAG][REGISTER] Unexpected error:", err);
    res.status(500).json({ message: "Registration failed.", error: err.message, diag: err.stack });
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

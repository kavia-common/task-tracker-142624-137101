import mongoose from "mongoose";

/**
 * User Schema for authentication and user data.
 * Fields:
 *  - email: user's unique email address
 *  - passwordHash: hashed password (bcrypt)
 *  - name: optional display name
 *  - role: string, e.g., 'user', 'admin'
 *  - timestamps: createdAt, updatedAt
 */

// PUBLIC_INTERFACE
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      description: "User's unique email for login and communication."
    },
    passwordHash: {
      type: String,
      required: true,
      description: "Bcrypt hash of the user's password."
    },
    name: {
      type: String,
      required: false,
      trim: true,
      description: "Display name for the user."
    },
    role: {
      type: String,
      required: false,
      enum: ["user", "admin"],
      default: "user",
      description: "Role of the user for authorization purposes."
    }
  },
  { timestamps: true }
);

/**
 * User Model constructed from userSchema.
 */
const User = mongoose.model("User", userSchema);

export default User;

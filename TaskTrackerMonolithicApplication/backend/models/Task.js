import mongoose from "mongoose";

/**
 * Task Schema for user task management.
 * Fields:
 *  - title: short title for the task
 *  - description: long description of task
 *  - dueDate: due date and time for the task
 *  - status: status of the task (e.g. todo, in_progress, completed)
 *  - priority: numeric or string priority (e.g., low, medium, high)
 *  - assignedTo: reference to User (_id)
 *  - creator: reference to User (_id), i.e. created by
 *  - timestamps: createdAt, updatedAt
 */

// PUBLIC_INTERFACE
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      description: "Short summary or title of the task."
    },
    description: {
      type: String,
      required: false,
      maxlength: 1000,
      description: "Detailed description of the task."
    },
    dueDate: {
      type: Date,
      required: false,
      description: "UTC date/time by which the task should be completed."
    },
    status: {
      type: String,
      required: true,
      enum: ["todo", "in_progress", "completed"],
      default: "todo",
      description: "Status of the task."
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      required: true,
      description: "Priority of the task."
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      description: "User id the task is assigned to."
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      description: "User id that created the task."
    }
  },
  { timestamps: true }
);

/**
 * Task Model constructed from taskSchema.
 */
const Task = mongoose.model("Task", taskSchema);

export default Task;

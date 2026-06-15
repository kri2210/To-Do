import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: ["status_change", "progress_update", "comment", "created", "edited"],
      required: true,
    },
    note: { type: String, default: "", maxlength: 1000 },
    progress: { type: Number, min: 0, max: 100 },
    fromStatus: { type: String },
    toStatus: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required."],
      trim: true,
      minlength: [3, "Title must be at least 3 characters."],
      maxlength: [120, "Title cannot exceed 120 characters."],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Description cannot exceed 2000 characters."],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deadline: {
      type: Date,
      required: [true, "Deadline is required."],
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    category: {
      type: String,
      enum: ["Task", "Project", "Own"],
      default: "Task",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Overdue"],
      default: "Pending",
    },
    // New: progress percentage
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // New: when task was marked completed
    completedAt: {
      type: Date,
      default: null,
    },
    completionNotes: {
      type: String,
      default: "",
      maxlength: [1000, "Completion notes cannot exceed 1000 characters."],
    },
    proofOfWork: {
      type: String, // base64 encoded file or URL
      default: "",
    },
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // New: full activity log
    activityLog: [activityLogSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ deadline: 1, status: 1 });
taskSchema.index({ createdAt: -1 });

taskSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

export const Task = mongoose.model("Task", taskSchema);

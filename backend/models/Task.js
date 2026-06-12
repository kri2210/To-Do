import mongoose from "mongoose";

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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-compute overdue status before any find query
taskSchema.pre(/^find/, function (next) {
  this._startTime = Date.now();
  next();
});

taskSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

export const Task = mongoose.model("Task", taskSchema);

import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { sendTaskAssignmentEmail } from "../utils/sendEmail.js";

// Helper: auto-mark overdue tasks
async function markOverdueTasks() {
  const now = new Date();
  await Task.updateMany(
    {
      deadline: { $lt: now },
      status: { $nin: ["Completed", "Overdue"] },
    },
    { $set: { status: "Overdue" } }
  );
}

// Populate helper
function populateTask(query) {
  return query
    .populate("assignedBy", "name email role")
    .populate("assignedTo", "name email role")
    .populate("comments.author", "name role")
    .populate("activityLog.user", "name role");
}

// GET /api/tasks
export async function getTasks(user, query) {
  await markOverdueTasks();

  let filter = {};

  if (user.role === "employee") {
    filter.assignedTo = user._id;
  } else if (user.role === "senior") {
    filter.$or = [{ assignedTo: user._id }, { assignedBy: user._id }];
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = query.category;
  if (query.search) filter.title = { $regex: query.search, $options: "i" };

  const tasks = await populateTask(
    Task.find(filter).sort({ createdAt: -1 })
  );

  return { status: 200, data: tasks };
}

// GET /api/tasks/:id
export async function getTaskById(id, user) {
  await markOverdueTasks();
  const task = await populateTask(Task.findById(id));
  if (!task) return { status: 404, data: { message: "Task not found." } };

  // Permission check
  if (user.role === "employee") {
    const assignedIds = task.assignedTo.map((u) => u.id?.toString() || u._id?.toString());
    if (!assignedIds.includes(user._id.toString())) {
      return { status: 403, data: { message: "Access denied." } };
    }
  }

  return { status: 200, data: task };
}

// POST /api/tasks
export async function createTask(body, user) {
  const { title, description, assignedTo, deadline, priority, category } = body;

  if (!title || title.trim().length < 3) {
    return { status: 400, data: { message: "Task title is required and must be at least 3 characters." } };
  }

  if (!deadline) {
    return { status: 400, data: { message: "Deadline is required." } };
  }

  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deadlineDate < today) {
    return { status: 400, data: { message: "Deadline cannot be in the past." } };
  }

  if (!assignedTo || (Array.isArray(assignedTo) && assignedTo.length === 0)) {
    return { status: 400, data: { message: "At least one assignee is required." } };
  }

  if (user.role === "senior") {
    const assignees = await User.find({ _id: { $in: assignedTo } });
    const hasNonEmployee = assignees.some((a) => a.role !== "employee");
    if (hasNonEmployee) {
      return { status: 403, data: { message: "Seniors can only assign tasks to employees." } };
    }
  }

  const task = new Task({
    title: title.trim(),
    description: description?.trim() || "",
    assignedBy: user._id,
    assignedTo: Array.isArray(assignedTo) ? assignedTo : [assignedTo],
    deadline: deadlineDate,
    priority: priority || "Medium",
    category: category || "Task",
    status: "Pending",
    progress: 0,
    activityLog: [
      {
        user: user._id,
        action: "created",
        note: "Task created.",
        timestamp: new Date(),
      },
    ],
  });

  await task.save();

  const populated = await populateTask(Task.findById(task._id));

  // Send email to every assigned person 
  for (const assignee of populated.assignedTo) {
    sendTaskAssignmentEmail(assignee, populated).catch((err) => {
      console.error(`Failed to send email to ${assignee.email}:`, err);
    });
  }

  return { status: 201, data: populated };
}

// PUT /api/tasks/:id
export async function updateTask(id, body, user) {
  const task = await Task.findById(id);
  if (!task) return { status: 404, data: { message: "Task not found." } };

  const {
    title, description, assignedTo, deadline, priority, category,
    status, completionNotes, proofOfWork
  } = body;

  const logEntries = [];

  if (user.role === "employee") {
    const assignedIds = task.assignedTo.map((id) => id.toString());
    if (!assignedIds.includes(user._id.toString())) {
      return { status: 403, data: { message: "You are not assigned to this task." } };
    }
    if (status && status !== task.status) {
      logEntries.push({
        user: user._id,
        action: "status_change",
        note: `Status changed from "${task.status}" to "${status}".`,
        fromStatus: task.status,
        toStatus: status,
        timestamp: new Date(),
      });
      task.status = status;
      if (status === "Completed") {
        task.completedAt = new Date();
        task.progress = 100;
      }
    }
    if (completionNotes) task.completionNotes = completionNotes;
    if (proofOfWork) task.proofOfWork = proofOfWork;
  } else {
    // Admin & Senior can edit all fields
    if (title) {
      if (title.trim().length < 3) {
        return { status: 400, data: { message: "Title must be at least 3 characters." } };
      }
      task.title = title.trim();
    }
    if (description !== undefined) task.description = description;
    if (assignedTo) task.assignedTo = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    if (deadline) {
      const d = new Date(deadline);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (d < today) return { status: 400, data: { message: "Deadline cannot be in the past." } };
      task.deadline = d;
    }
    if (priority) task.priority = priority;
    if (category) task.category = category;
    if (status && status !== task.status) {
      logEntries.push({
        user: user._id,
        action: "status_change",
        note: `Status changed from "${task.status}" to "${status}".`,
        fromStatus: task.status,
        toStatus: status,
        timestamp: new Date(),
      });
      task.status = status;
      if (status === "Completed") {
        task.completedAt = new Date();
        task.progress = 100;
      }
    }
    if (completionNotes !== undefined) task.completionNotes = completionNotes;

    if (logEntries.length === 0 && (title || description !== undefined || priority || category || deadline || assignedTo)) {
      logEntries.push({
        user: user._id,
        action: "edited",
        note: "Task details updated.",
        timestamp: new Date(),
      });
    }
  }

  if (logEntries.length > 0) {
    task.activityLog.push(...logEntries);
  }

  await task.save();

  const updated = await populateTask(Task.findById(id));

  return { status: 200, data: updated };
}

// PATCH /api/tasks/:id/progress
export async function updateProgress(id, body, user) {
  const task = await Task.findById(id);
  if (!task) return { status: 404, data: { message: "Task not found." } };

  // Permission check
  const assignedIds = task.assignedTo.map((uid) => uid.toString());
  if (user.role === "employee" && !assignedIds.includes(user._id.toString())) {
    return { status: 403, data: { message: "You are not assigned to this task." } };
  }

  const { progress, note, status } = body;

  if (progress !== undefined) {
    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      return { status: 400, data: { message: "Progress must be a number between 0 and 100." } };
    }
    task.progress = progress;
  }

  const logEntry = {
    user: user._id,
    action: "progress_update",
    note: note?.trim() || `Progress updated to ${task.progress}%.`,
    progress: task.progress,
    timestamp: new Date(),
  };

  // Auto-update status based on progress
  if (status && status !== task.status) {
    logEntry.action = "status_change";
    logEntry.fromStatus = task.status;
    logEntry.toStatus = status;
    task.status = status;
    if (status === "Completed") {
      task.completedAt = new Date();
      task.progress = 100;
      logEntry.progress = 100;
    }
  } else if (task.progress === 100 && task.status !== "Completed") {
    logEntry.fromStatus = task.status;
    logEntry.toStatus = "Completed";
    task.status = "Completed";
    task.completedAt = new Date();
  } else if (task.progress > 0 && task.status === "Pending") {
    task.status = "In Progress";
  }

  task.activityLog.push(logEntry);
  await task.save();

  const updated = await populateTask(Task.findById(id));
  return { status: 200, data: updated };
}

// POST /api/tasks/:id/comment
export async function addComment(id, body, user) {
  const task = await Task.findById(id);
  if (!task) return { status: 404, data: { message: "Task not found." } };

  if (!body.text || !body.text.trim()) {
    return { status: 400, data: { message: "Comment text is required." } };
  }

  task.comments.push({ author: user._id, text: body.text.trim() });
  task.activityLog.push({
    user: user._id,
    action: "comment",
    note: body.text.trim(),
    timestamp: new Date(),
  });
  await task.save();

  const updated = await populateTask(Task.findById(id));
  return { status: 200, data: updated };
}

// GET /api/tasks/analytics  — admin only
export async function getAnalytics() {
  await markOverdueTasks();

  const [
    totalTasks, pending, inProgress, completed, overdue,
    totalUsers, totalSeniors, totalEmployees
  ] = await Promise.all([
    Task.countDocuments(),
    Task.countDocuments({ status: "Pending" }),
    Task.countDocuments({ status: "In Progress" }),
    Task.countDocuments({ status: "Completed" }),
    Task.countDocuments({ status: "Overdue" }),
    User.countDocuments(),
    User.countDocuments({ role: "senior" }),
    User.countDocuments({ role: "employee" }),
  ]);

  const tasksByPriority = await Task.aggregate([
    { $group: { _id: "$priority", count: { $sum: 1 } } },
  ]);

  const tasksByCategory = await Task.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  const recentTasks = await Task.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("assignedBy", "name")
    .populate("assignedTo", "name");

  const recentCompletions = await Task.find({ status: "Completed" })
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate("assignedBy", "name")
    .populate("assignedTo", "name");

  return {
    status: 200,
    data: {
      counts: { totalTasks, pending, inProgress, completed, overdue, totalUsers, totalSeniors, totalEmployees },
      tasksByPriority,
      tasksByCategory,
      recentTasks,
      recentCompletions,
    },
  };
}

// GET /api/tasks/my-analytics  — senior/employee
export async function getMyAnalytics(user) {
  await markOverdueTasks();

  let assignedByAdminFilter = {};
  let assignedToEmployeesFilter = {};

  if (user.role === "senior") {
    assignedByAdminFilter = { assignedTo: user._id };
    assignedToEmployeesFilter = { assignedBy: user._id };
  } else {
    assignedToEmployeesFilter = { assignedTo: user._id };
  }

  const [assignedToMe, myPending, myInProgress, myCompleted, myOverdue] = await Promise.all([
    Task.countDocuments(assignedByAdminFilter),
    Task.countDocuments({ ...assignedToEmployeesFilter, status: "Pending" }),
    Task.countDocuments({ ...assignedToEmployeesFilter, status: "In Progress" }),
    Task.countDocuments({ ...assignedToEmployeesFilter, status: "Completed" }),
    Task.countDocuments({ ...assignedToEmployeesFilter, status: "Overdue" }),
  ]);

  let teamProgress = [];
  if (user.role === "senior") {
    teamProgress = await Task.find({ assignedBy: user._id })
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .limit(10);
  }

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const todayTasks = await Task.find({
    assignedTo: user._id,
    deadline: { $gte: todayStart, $lte: todayEnd },
  }).populate("assignedBy", "name role");

  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingDeadlines = await Task.find({
    assignedTo: user._id,
    deadline: { $gte: new Date(), $lte: nextWeek },
    status: { $ne: "Completed" },
  }).populate("assignedBy", "name role").sort({ deadline: 1 }).limit(10);

  return {
    status: 200,
    data: {
      counts: { assignedToMe, myPending, myInProgress, myCompleted, myOverdue },
      teamProgress,
      todayTasks,
      upcomingDeadlines,
    },
  };
}

// DELETE /api/tasks/:id
export async function deleteTask(id, user) {
  const task = await Task.findById(id);
  if (!task) return { status: 404, data: { message: "Task not found." } };

  if (user.role === "employee") {
    return { status: 403, data: { message: "Employees cannot delete tasks." } };
  }

  if (user.role === "senior" && task.assignedBy.toString() !== user._id.toString()) {
    return { status: 403, data: { message: "You can only delete tasks you created." } };
  }

  await Task.findByIdAndDelete(id);
  return { status: 200, data: { message: "Task deleted successfully." } };
}

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

// GET /api/tasks
export async function getTasks(user, query) {
  await markOverdueTasks();

  let filter = {};

  if (user.role === "employee") {
    filter.assignedTo = user._id;
  } else if (user.role === "senior") {
    // Senior sees tasks assigned to them OR tasks they assigned
    filter.$or = [{ assignedTo: user._id }, { assignedBy: user._id }];
  }
  // Admin sees all

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = query.category;
  if (query.search) filter.title = { $regex: query.search, $options: "i" };

  const tasks = await Task.find(filter)
    .populate("assignedBy", "name email role")
    .populate("assignedTo", "name email role")
    .populate("comments.author", "name role")
    .sort({ createdAt: -1 });

  return { status: 200, data: tasks };
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

  // Senior can only assign to employees
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
  });

  await task.save();

  const populated = await Task.findById(task._id)
    .populate("assignedBy", "name email role")
    .populate("assignedTo", "name email role");

  // Send email to every assigned person
  for (const assignee of populated.assignedTo) {
    await sendTaskAssignmentEmail(
      assignee.email,
      assignee.name,
      populated.title,
      populated.assignedBy.name,
      populated.deadline
    );
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

  // Employees can only update status, completionNotes, proofOfWork
  if (user.role === "employee") {
    const assignedIds = task.assignedTo.map((id) => id.toString());
    if (!assignedIds.includes(user._id.toString())) {
      return { status: 403, data: { message: "You are not assigned to this task." } };
    }
    if (status) task.status = status;
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
    if (status) task.status = status;
    if (completionNotes !== undefined) task.completionNotes = completionNotes;
  }

  await task.save();

  const updated = await Task.findById(id)
    .populate("assignedBy", "name email role")
    .populate("assignedTo", "name email role");

  return { status: 200, data: updated };
}

// DELETE /api/tasks/:id  — admin and senior (who created it)
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

// POST /api/tasks/:id/comment
export async function addComment(id, body, user) {
  const task = await Task.findById(id);
  if (!task) return { status: 404, data: { message: "Task not found." } };

  if (!body.text || !body.text.trim()) {
    return { status: 400, data: { message: "Comment text is required." } };
  }

  task.comments.push({ author: user._id, text: body.text.trim() });
  await task.save();

  const updated = await Task.findById(id)
    .populate("assignedBy", "name email role")
    .populate("assignedTo", "name email role")
    .populate("comments.author", "name role");

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

  // Task completion by user
  const tasksByPriority = await Task.aggregate([
    { $group: { _id: "$priority", count: { $sum: 1 } } },
  ]);

  const tasksByCategory = await Task.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  // Recent tasks
  const recentTasks = await Task.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("assignedBy", "name")
    .populate("assignedTo", "name");

  // Recent completions
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

  // Team tasks (for senior)
  let teamProgress = [];
  if (user.role === "senior") {
    teamProgress = await Task.find({ assignedBy: user._id })
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .limit(10);
  }

  // Today's tasks (for employee)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const todayTasks = await Task.find({
    assignedTo: user._id,
    deadline: { $gte: todayStart, $lte: todayEnd },
  }).populate("assignedBy", "name role");

  // Upcoming deadlines (next 7 days)
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

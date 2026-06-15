import { authenticate } from "../middleware/auth.js";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateProgress,
  deleteTask,
  addComment,
  getAnalytics,
  getMyAnalytics,
} from "../controllers/taskController.js";

export async function taskRoutes(req, res, pathname, method, body) {
  // All task routes require authentication
  const auth = await authenticate(req);
  if (auth.error) return { status: auth.status, data: { message: auth.error } };
  const { user } = auth;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams.entries());

  // GET /api/tasks/analytics — admin only
  if (pathname === "/api/tasks/analytics" && method === "GET") {
    if (user.role !== "admin") return { status: 403, data: { message: "Admin access required." } };
    return getAnalytics();
  }

  // GET /api/tasks/my-analytics — senior/employee
  if (pathname === "/api/tasks/my-analytics" && method === "GET") {
    return getMyAnalytics(user);
  }

  // GET /api/tasks
  if (pathname === "/api/tasks" && method === "GET") {
    return getTasks(user, query);
  }

  // POST /api/tasks — admin and senior
  if (pathname === "/api/tasks" && method === "POST") {
    if (user.role === "employee") {
      return { status: 403, data: { message: "Employees cannot create tasks." } };
    }
    return createTask(body, user);
  }

  // ID-based routes
  const taskIdMatch = pathname.match(/^\/api\/tasks\/([a-f0-9]{24})$/);

  if (taskIdMatch) {
    const taskId = taskIdMatch[1];
    if (method === "GET") return getTaskById(taskId, user);
    if (method === "PUT") return updateTask(taskId, body, user);
    if (method === "DELETE") return deleteTask(taskId, user);
  }

  // PATCH /api/tasks/:id/progress
  const progressMatch = pathname.match(/^\/api\/tasks\/([a-f0-9]{24})\/progress$/);
  if (progressMatch && method === "PATCH") {
    return updateProgress(progressMatch[1], body, user);
  }

  // POST /api/tasks/:id/comment
  const commentMatch = pathname.match(/^\/api\/tasks\/([a-f0-9]{24})\/comment$/);
  if (commentMatch && method === "POST") {
    return addComment(commentMatch[1], body, user);
  }

  return null;
}

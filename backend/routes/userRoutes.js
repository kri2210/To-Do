import { authenticate, authorize } from "../middleware/auth.js";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/userController.js";

export async function userRoutes(req, res, pathname, method, body) {
  // All user routes require authentication
  const auth = await authenticate(req);
  if (auth.error) return { status: auth.status, data: { message: auth.error } };
  const { user } = auth;

  // GET /api/users or GET /api/users?role=employee
  if (pathname === "/api/users" && method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams.entries());
    return getUsers(user, query);
  }

  // POST /api/users — admin only
  if (pathname === "/api/users" && method === "POST") {
    const authError = authorize("admin")(user);
    if (authError) return { status: authError.status, data: { message: authError.error } };
    return createUser(body, user);
  }

  // PUT /api/users/:id — admin only
  const putMatch = pathname.match(/^\/api\/users\/([a-f0-9]{24})$/);
  if (putMatch && method === "PUT") {
    const authError = authorize("admin")(user);
    if (authError) return { status: authError.status, data: { message: authError.error } };
    return updateUser(putMatch[1], body, user);
  }

  // DELETE /api/users/:id — admin only
  const deleteMatch = pathname.match(/^\/api\/users\/([a-f0-9]{24})$/);
  if (deleteMatch && method === "DELETE") {
    const authError = authorize("admin")(user);
    if (authError) return { status: authError.status, data: { message: authError.error } };
    return deleteUser(deleteMatch[1], user);
  }

  return null;
}

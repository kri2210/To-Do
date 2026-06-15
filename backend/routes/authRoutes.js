import { authenticate } from "../middleware/auth.js";
import { login, getMe, seedAdmin, googleLogin } from "../controllers/authController.js";

export async function authRoutes(req, res, pathname, method, body) {
  if (pathname === "/api/auth/login" && method === "POST") {
    const result = await login(body);
    return result;
  }

  if (pathname === "/api/auth/google-login" && method === "POST") {
    const result = await googleLogin(body);
    return result;
  }

  if (pathname === "/api/auth/seed" && method === "POST") {
    const result = await seedAdmin();
    return result;
  }

  if (pathname === "/api/auth/me" && method === "GET") {
    const auth = await authenticate(req);
    if (auth.error) return { status: auth.status, data: { message: auth.error } };
    const result = await getMe(auth.user);
    return result;
  }

  return null;
}

import { authenticate, authorize } from "../middleware/auth.js";
import {
  createDocument,
  getDocumentsByEmployee,
  getAllDocuments,
} from "../controllers/documentController.js";

export async function documentRoutes(req, res, pathname, method, body) {
  // All document routes require authentication
  const auth = await authenticate(req);
  if (auth.error) return { status: auth.status, data: { message: auth.error } };
  const { user } = auth;

  // Only admins can access document endpoints
  const authError = authorize("admin")(user);
  if (authError) return { status: authError.status, data: { message: authError.error } };

  // POST /api/documents — n8n stores new document metadata
  if (pathname === "/api/documents" && method === "POST") {
    return createDocument(body);
  }

  // GET /api/documents?employeeId=<id> — frontend fetches per-employee docs
  // GET /api/documents — fetch all documents
  if (pathname === "/api/documents" && method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const employeeId = url.searchParams.get("employeeId");

    if (employeeId) {
      return getDocumentsByEmployee(employeeId);
    }
    return getAllDocuments();
  }

  return null;
}

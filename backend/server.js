import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database.js";
import { authRoutes } from "./routes/authRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { taskRoutes } from "./routes/taskRoutes.js";
import { documentRoutes } from "./routes/documentRoutes.js";
import { User } from "./models/User.js";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

dotenv.config();

const PORT = process.env.PORT || 5000;

let allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
if (allowedOrigin !== "*") {
  allowedOrigin = allowedOrigin.trim();
  if (!allowedOrigin.startsWith("http://") && !allowedOrigin.startsWith("https://")) {
    allowedOrigin = "https://" + allowedOrigin;
  }
  if (allowedOrigin.endsWith("/")) {
    allowedOrigin = allowedOrigin.slice(0, -1);
  }
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function autoSeedAdmin() {
  try {
    const existing = await User.findOne({ role: "admin" });
    if (!existing) {
      const admin = new User({
        name: "Super Admin",
        email: "admin@company.com",
        password: "Admin@123",
        role: "admin",
      });
      await admin.save();
      console.log("✅ Default admin seeded: admin@company.com / Admin@123");
    } else {
      const isValid = await existing.comparePassword("Admin@123");
      if (!isValid) {
        existing.password = "Admin@123";
        await existing.save();
        console.log(" Admin password reset: admin@company.com / Admin@123");
      }
    }
  } catch (err) {
    console.error("  Admin seed failed:", err.message);
  }
}

async function requestHandler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  let body = {};

  try {
    if (["POST", "PUT", "PATCH"].includes(method)) {
      body = await readBody(req);
    }
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
    return;
  }

  try {
    let result = null;

    if (pathname.startsWith("/api/auth")) {
      result = await authRoutes(req, res, pathname, method, body);
    } else if (pathname.startsWith("/api/users")) {
      result = await userRoutes(req, res, pathname, method, body);
    } else if (pathname.startsWith("/api/tasks")) {
      result = await taskRoutes(req, res, pathname, method, body);
    } else if (pathname.startsWith("/api/documents")) {
      result = await documentRoutes(req, res, pathname, method, body);
    } else if (pathname === "/api/health" && method === "GET") {
      result = { status: 200, data: { status: "ok", timestamp: new Date().toISOString() } };
    }

    if (result) {
      sendJson(res, result.status, result.data);
    } else {
      sendJson(res, 404, { message: "Route not found." });
    }
  } catch (err) {
    console.error("Server error:", err);
    sendJson(res, 500, { message: "Internal server error.", error: err.message });
  }
}

await connectDatabase();
await autoSeedAdmin();

const server = http.createServer(requestHandler);

server.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` API Base: http://localhost:${PORT}/api`);

  // ── Keep-alive ping for Render free tier ──────────────────────────
  // Render spins down free services after 15 min of inactivity.
  // This self-ping every 10 min prevents that cold-start delay.
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    const pingUrl = `${renderUrl}/api/health`;
    setInterval(() => {
      const mod = pingUrl.startsWith("https") ? https : http;
      mod.get(pingUrl, (r) =>
        console.log(`🏓 Keep-alive ping → ${pingUrl} [${r.statusCode}]`)
      ).on("error", (e) =>
        console.warn("⚠️  Keep-alive ping failed:", e.message)
      );
    }, 10 * 60 * 1000); // every 10 minutes
    console.log(`🏓 Keep-alive enabled → ${pingUrl}`);
  }
});

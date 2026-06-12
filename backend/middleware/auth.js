import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function authenticate(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "No token provided.", status: 401 };
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      return { error: "User not found or deactivated.", status: 401 };
    }
    return { user };
  } catch (err) {
    return { error: "Invalid or expired token.", status: 401 };
  }
}

export function authorize(...roles) {
  return (user) => {
    if (!roles.includes(user.role)) {
      return { error: "Access denied. Insufficient permissions.", status: 403 };
    }
    return null;
  };
}

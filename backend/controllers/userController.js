import { User } from "../models/User.js";

// GET /api/users  — admin: all users, senior: only employees
export async function getUsers(user, query) {
  let filter = {};

  if (user.role === "admin") {
    if (query.role) filter.role = query.role;
  } else if (user.role === "senior") {
    filter.role = "employee";
  } else {
    return { status: 403, data: { message: "Access denied." } };
  }

  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  return { status: 200, data: users };
}

// POST /api/users  — admin only
export async function createUser(body, createdBy) {
  const { name, email, password, role } = body;

  if (!name || !email || !password || !role) {
    return { status: 400, data: { message: "Name, email, password, and role are required." } };
  }

  if (!["admin", "senior", "employee"].includes(role)) {
    return { status: 400, data: { message: "Invalid role. Use admin, senior, or employee." } };
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return { status: 409, data: { message: "A user with this email already exists." } };
  }

  const newUser = new User({ name, email, password, role, createdBy: createdBy._id });
  await newUser.save();

  const saved = await User.findById(newUser._id).select("-password");
  return { status: 201, data: saved };
}

// PUT /api/users/:id  — admin only
export async function updateUser(id, body, requestUser) {
  const { name, email, role, isActive, password } = body;

  const target = await User.findById(id);
  if (!target) return { status: 404, data: { message: "User not found." } };

  if (name) target.name = name;
  if (email) target.email = email.toLowerCase();
  if (role && requestUser.role === "admin") target.role = role;
  if (typeof isActive === "boolean") target.isActive = isActive;
  if (password) target.password = password; // will be hashed by pre-save hook

  await target.save();
  const updated = await User.findById(id).select("-password");
  return { status: 200, data: updated };
}

// DELETE /api/users/:id  — admin only
export async function deleteUser(id, requestUser) {
  const target = await User.findById(id);
  if (!target) return { status: 404, data: { message: "User not found." } };

  // Prevent self-deletion
  if (target._id.toString() === requestUser._id.toString()) {
    return { status: 400, data: { message: "You cannot delete your own account." } };
  }

  await User.findByIdAndDelete(id);
  return { status: 200, data: { message: "User deleted successfully." } };
}

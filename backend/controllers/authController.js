import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/login
export async function login(body) {
  const { email, password } = body;

  if (!email || !password) {
    return { status: 400, data: { message: "Email and password are required." } };
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    return { status: 401, data: { message: "Invalid credentials." } };
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return { status: 401, data: { message: "Invalid credentials." } };
  }

  const token = generateToken(user._id);

  return {
    status: 200,
    data: {
      message: "Login successful.",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  };
}

// GET /api/auth/me
export async function getMe(user) {
  return {
    status: 200,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

// POST /api/auth/seed  — creates the default admin if no admin exists
export async function seedAdmin() {
  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    return { status: 200, data: { message: "Admin already exists." } };
  }

  const admin = new User({
    name: "Super Admin",
    email: "admin@company.com",
    password: "Admin@123",
    role: "admin",
  });
  await admin.save();

  return {
    status: 201,
    data: {
      message: "Default admin created.",
      email: "admin@company.com",
      password: "Admin@123",
    },
  };
}

// POST /api/auth/google-login
export async function googleLogin(body) {
  const { token } = body;

  if (!token) {
    return { status: 400, data: { message: "Google ID Token is required." } };
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      return { status: 400, data: { message: "Email not provided by Google." } };
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (!user.isActive) {
        return { status: 401, data: { message: "Account is inactive. Please contact an admin." } };
      }
    } else {
      // Create new user with employee role
      const generatedPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      user = new User({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        password: generatedPassword,
        role: "employee",
        isActive: true,
      });
      await user.save();
    }

    const localToken = generateToken(user._id);

    return {
      status: 200,
      data: {
        message: "Google login successful.",
        token: localToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    };
  } catch (err) {
    console.error("Google verify error:", err);
    return { status: 400, data: { message: "Invalid Google token.", error: err.message } };
  }
}

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

export async function connectDatabase() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in the .env file.");
  }

  try {
    const connection = await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || "task_management_app",
    });
    console.log(`✅ MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

mongoose.connection.on("error", (error) => {
  console.error("MongoDB runtime error:", error.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

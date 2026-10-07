import { connectDatabase, disconnectDatabase, pingDatabase } from "../config/database.js";

try {
  await connectDatabase();
  await pingDatabase();
  console.info("MongoDB connection and ping succeeded.");
} catch (error) {
  console.error("MongoDB connection failed", error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}

import {
  connectDatabase,
  disconnectDatabase,
  pingDatabase,
} from "../config/database.js";

try {
  await connectDatabase();
  await pingDatabase();
  console.info("MongoDB connection and ping succeeded.");
} catch (error) {
  console.error(
    "MongoDB connection failed. Check MONGODB_URI and database network access.",
    { name: error instanceof Error ? error.name : "Unknown" },
  );
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}

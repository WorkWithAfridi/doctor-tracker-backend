import { setServers } from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase(): Promise<void> {
  if (
    env.MONGODB_URI.startsWith("mongodb+srv://") &&
    env.MONGODB_DNS_SERVERS.length
  )
    setServers(env.MONGODB_DNS_SERVERS);
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    autoIndex: false,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export async function pingDatabase(): Promise<void> {
  const database = mongoose.connection.db;
  if (!database) throw new Error("Database is not connected");
  await database.command({ ping: 1 });
}

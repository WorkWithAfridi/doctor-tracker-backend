import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
export const sessionCookie = "doctor_tracker_session";
export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.COOKIE_SAME_SITE,
  path: "/",
} as const;
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
// A fixed dummy hash keeps password comparison work similar for unknown accounts.
const dummyHash = bcrypt.hashSync("invalid-account-password", 12);
export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select(
    "+passwordHash +authVersion",
  );
  const matches = await bcrypt.compare(
    password,
    user?.passwordHash ?? dummyHash,
  );
  if (!user || !matches || !["admin", "staff"].includes(user.role))
    throw new ApiError(401, "Invalid email or password");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.SESSION_DAYS * 86400000);
  await Session.create({
    userId: user._id,
    authVersion: user.authVersion ?? 0,
    tokenHash: tokenHash(token),
    expiresAt,
  });
  return {
    token,
    expiresAt,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

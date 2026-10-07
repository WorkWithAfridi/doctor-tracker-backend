import type { RequestHandler } from "express";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { tokenHash, sessionCookie } from "../services/auth.service.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
export const requireAuth: RequestHandler = async (request, response, next) => {
  const token: unknown = request.cookies?.[sessionCookie];
  if (typeof token !== "string" || !/^[a-f\d]{64}$/.test(token))
    throw new ApiError(401, "Please sign in to continue");
  const session = await Session.findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session)
    throw new ApiError(401, "Your session has expired. Please sign in again");
  const user = await User.findById(session.userId)
    .select("name email role")
    .lean();
  if (!user || user.role !== "admin")
    throw new ApiError(403, "Administrator access is required");
  response.locals.user = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
  next();
};
// Cookie-authenticated writes require an explicitly trusted browser origin.
const trustedOrigins = new Set([
  new URL(env.FRONTEND_URL).origin,
  ...(env.DOCS_ORIGIN
    ? [new URL(env.DOCS_ORIGIN).origin]
    : env.NODE_ENV !== "production"
      ? [`http://localhost:${env.PORT}`]
      : []),
]);
export const requireTrustedOrigin: RequestHandler = (
  request,
  _response,
  next,
) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !trustedOrigins.has(request.get("origin") ?? "")
  )
    throw new ApiError(403, "Request origin is not allowed");
  next();
};

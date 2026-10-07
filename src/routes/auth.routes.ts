import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import {
  login,
  sessionCookie,
  cookieOptions,
  tokenHash,
} from "../services/auth.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { Session } from "../models/Session.js";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { changePasswordSchema } from "../schemas/users.schema.js";
export const authRouter = Router();
const loginSchema = z.strictObject({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
});
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later",
    errors: null,
  },
});
authRouter.post("/login", limiter, async (request, response) => {
  const credentials = loginSchema.parse(request.body);
  const result = await login(credentials.email, credentials.password);
  const previous: unknown = request.cookies?.[sessionCookie];
  if (typeof previous === "string")
    await Session.deleteOne({ tokenHash: tokenHash(previous) });
  response
    .cookie(sessionCookie, result.token, {
      ...cookieOptions,
      expires: result.expiresAt,
    })
    .json({ data: result.user });
});
authRouter.get("/me", requireAuth, (_request, response) => {
  response.json({ data: response.locals.user });
});
authRouter.post(
  "/password",
  requireAuth,
  limiter,
  async (request, response) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      request.body,
    );
    const user = await User.findById(response.locals.user.id).select(
      "+passwordHash",
    );
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash)))
      throw new ApiError(400, "Current password is incorrect", {
        currentPassword: "Current password is incorrect",
      });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const result = await User.updateOne(
      { _id: user._id, passwordHash: user.passwordHash },
      {
        $set: { passwordHash },
        $inc: { authVersion: 1 },
      },
    );
    if (!result.modifiedCount)
      throw new ApiError(
        409,
        "Password was changed by another request. Please sign in again",
      );
    await Session.deleteMany({ userId: user._id });
    response.clearCookie(sessionCookie, cookieOptions).status(204).end();
  },
);
authRouter.post("/logout", async (request, response) => {
  const token: unknown = request.cookies?.[sessionCookie];
  if (typeof token === "string")
    await Session.deleteOne({ tokenHash: tokenHash(token) });
  response.clearCookie(sessionCookie, cookieOptions).status(204).end();
});

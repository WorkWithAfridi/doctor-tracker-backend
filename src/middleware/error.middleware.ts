import type { ErrorRequestHandler } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof z.ZodError) {
    const errors: Record<string, string> = {};
    error.issues.forEach((issue) => {
      errors[issue.path.join(".") || "request"] = issue.message;
    });
    response
      .status(400)
      .json({ success: false, message: "Validation failed", errors });
    return;
  }
  if (error instanceof ApiError) {
    response
      .status(error.status)
      .json({ success: false, message: error.message, errors: error.errors });
    return;
  }
  if (
    error instanceof mongoose.mongo.MongoServerError &&
    error.code === 11000
  ) {
    response
      .status(409)
      .json({
        success: false,
        message: "A record with this email already exists",
        errors: { email: "Email is already in use" },
      });
    return;
  }
  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    response
      .status(400)
      .json({ success: false, message: "Invalid record data", errors: null });
    return;
  }
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
      ? error.status
      : 500;
  if (status === 500)
    console.error("Unhandled API error", {
      name: error instanceof Error ? error.name : "Unknown",
    });
  response
    .status(status)
    .json({
      success: false,
      message:
        status === 413
          ? "Request body is too large"
          : status === 500
            ? "Internal server error"
            : "Invalid request",
      errors: null,
    });
};

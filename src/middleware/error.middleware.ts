import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const status = typeof error?.status === "number" && error.status >= 400 && error.status < 500
    ? error.status : 500;
  console.error(error);
  response.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : "Invalid request",
    errors: null,
  });
};

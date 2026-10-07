import type { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";
let writing = false;
// Serialize record mutations against bulk reset/population on this API process.
export const workspaceWrite: RequestHandler = (request, response, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
  if (writing)
    throw new ApiError(
      409,
      "Another workspace change is in progress. Try again shortly.",
    );
  writing = true;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      writing = false;
    }
  };
  response.once("finish", release);
  const originalEnd = response.end.bind(response);
  response.end = ((...args: Parameters<typeof response.end>) => {
    try {
      return originalEnd(...args);
    } finally {
      release();
    }
  }) as typeof response.end;
  // Release at the handler's response, even if the browser disconnected during the operation.
  next();
};

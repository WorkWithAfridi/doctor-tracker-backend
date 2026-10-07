import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

async function start(): Promise<void> {
  await connectDatabase();
  const server = app.listen(env.PORT, () => {
    console.info(
      `Doctor Tracker API listening on http://localhost:${env.PORT}`,
    );
  });
  server.on("error", (error) => {
    console.error("API server failed", { name: error.name });
    void disconnectDatabase().finally(() => process.exit(1));
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(() => {
      void disconnectDatabase().finally(() => {
        clearTimeout(timeout);
        process.exit(0);
      });
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error: unknown) => {
  console.error(
    "Failed to start API. Check configuration, MongoDB access, and port availability.",
    { name: error instanceof Error ? error.name : "Unknown" },
  );
  process.exit(1);
});

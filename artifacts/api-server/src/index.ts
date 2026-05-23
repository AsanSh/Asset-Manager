import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

// For Vercel serverless, just export the app without starting the server
if (process.env.VERCEL) {
  logger.info("Running in Vercel serverless mode");
} else {
  // For local/traditional hosting, start the server
  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

export default app;

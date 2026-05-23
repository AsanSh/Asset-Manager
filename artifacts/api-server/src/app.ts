import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { sql } from "drizzle-orm";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "./lib/db";
import { runMigrations } from "./lib/migrate";
import { generalLimiter, authLimiter, apiLimiter } from "./middleware/rate-limiter";
import { xssProtection } from "./middleware/validation";

const app: Express = express();

// Vercel exposes serverless handlers under /api/*; Express routes live at /auth, /companies, etc.
app.use((req, _res, next) => {
  const raw = req.url || "/";
  const q = raw.indexOf("?");
  const pathname = q >= 0 ? raw.slice(0, q) : raw;
  const query = q >= 0 ? raw.slice(q) : "";
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const rest = pathname === "/api" ? "/" : pathname.slice(4) || "/";
    req.url = rest + query;
  }
  next();
});

// Security headers with Helmet
app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// CORS with whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);

      const vercelHost = (() => {
        try {
          return new URL(origin).hostname.endsWith(".vercel.app");
        } catch {
          return false;
        }
      })();

      if (allowedOrigins.includes(origin) || vercelHost) {
        callback(null, true);
      } else {
        logger.warn({ origin, allowedOrigins }, "CORS blocked request");
        callback(new Error(`Доступ запрещен. Разрешенные домены: ${allowedOrigins.join(", ")}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400, // 24 hours
  })
);

// Body parsing with size limits
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// XSS Protection - sanitize inputs
app.use(xssProtection);

// Apply rate limiters
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);
app.use("/", generalLimiter);
app.use("/", apiLimiter);

// Run Drizzle migrations on startup
runMigrations().catch((err) => {
  logger.error({ err }, "Fatal: DB migrations failed, exiting");
  process.exit(1);
});

// Health check endpoint
app.get("/health", async (_req, res) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Routes
app.use(router);

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(
    { err, req: { method: req.method, url: req.url } },
    "Unhandled error"
  );

  // Provide user-friendly error messages in Russian
  let userMessage = "Внутренняя ошибка сервера";
  let statusCode = 500;

  if (err.message.includes("CORS") || err.message.includes("Доступ запрещен")) {
    userMessage = err.message;
    statusCode = 403;
  } else if (err.message.includes("Not authenticated") || err.message.includes("Session expired")) {
    userMessage = "Сессия истекла. Пожалуйста, войдите снова.";
    statusCode = 401;
  } else if (err.message.includes("Not found")) {
    userMessage = "Запрошенный ресурс не найден";
    statusCode = 404;
  }

  if (process.env.NODE_ENV === "production") {
    res.status(statusCode).json({ error: userMessage });
  } else {
    res.status(statusCode).json({
      error: userMessage,
      details: err.message,
      stack: err.stack,
    });
  }
});

export default app;

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
    clientId: number | null;
  }
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

let isReady = false;

app.use((req, res, next) => {
  if (!isReady && !req.path.startsWith("/api")) {
    return res.status(200).send("<!DOCTYPE html><html><head><title>Loading...</title><meta http-equiv='refresh' content='2'></head><body><p>Starting...</p></body></html>");
  }
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use("/uploads", express.static(path.resolve("uploads")));

const PgSession = connectPgSimple(session);
const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  app.set("trust proxy", 1);
}
app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "doma-yuga-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`serving on port ${port}`);
  },
);

(async () => {
  // Автомиграция новых колонок (безопасно — IF NOT EXISTS)
  await pool.query(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude NUMERIC;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude NUMERIC;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS cadastral_number TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS utilities_json TEXT;
    CREATE TABLE IF NOT EXISTS landscape_surveys (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL UNIQUE,
      egrn_url TEXT,
      egrn_data TEXT,
      plot_area TEXT,
      plot_shape TEXT,
      terrain TEXT,
      soil_type TEXT,
      groundwater TEXT,
      design_style TEXT,
      zones TEXT,
      plants TEXT,
      budget TEXT,
      landscape_timeline TEXT,
      maintenance_level TEXT,
      wishes TEXT,
      ai_concept TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `).catch((e) => console.warn("Migration warning:", e.message));

  const { seedDatabase } = await import("./seed");
  await seedDatabase();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  isReady = true;
  log("application fully initialized");
})();

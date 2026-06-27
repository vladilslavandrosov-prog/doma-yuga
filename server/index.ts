import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import crypto from "crypto";
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

const uploadsDir = process.env.NODE_ENV === "production" ? "/data/uploads" : path.resolve("uploads");
if (!require("fs").existsSync(uploadsDir)) require("fs").mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const PgSession = connectPgSimple(session);
const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  app.set("trust proxy", 1);
}

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!isProd) return "dev-only-session-secret";

  // No SESSION_SECRET configured — persist a generated one on the mounted
  // /data volume so sessions survive restarts instead of being invalidated
  // (a random-per-restart secret was silently logging admins out on deploy).
  const fs = require("fs");
  const secretPath = "/data/.session-secret";
  try {
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, "utf-8").trim();
    }
    const generated = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    console.warn("SESSION_SECRET is not set — generated and persisted a secret to /data/.session-secret. Set SESSION_SECRET explicitly for production.");
    return generated;
  } catch (err) {
    console.warn("SESSION_SECRET is not set and /data is not writable — falling back to a random per-restart secret, sessions will not survive restarts:", err);
    return crypto.randomBytes(32).toString("hex");
  }
}

app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: getSessionSecret(),
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
  const { seedDatabase, seedGalleryPhotos } = await import("./seed");
  await seedDatabase();
  await seedGalleryPhotos();

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

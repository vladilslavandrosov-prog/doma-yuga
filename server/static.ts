import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist.
  // index.html must never be cached by the browser — its hashed asset
  // references are the only way clients pick up a new deploy.
  app.use("/{*path}", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

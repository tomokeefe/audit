import path from "path";
import { createServer } from "./index.js";
import express from "express";
import { createReadStream, existsSync } from "fs";
import { extname } from "path";
import { fileURLToPath } from "url";

const port = parseInt(process.env.PORT || "3000", 10);

// Get __dirname properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The distPath assumes we're running from /app/dist/server/node-build.mjs
// So we go up to /app and then into dist/spa
const appRoot = path.resolve(__dirname, "../../");
const distPath = path.resolve(appRoot, "dist/spa");

const mimeTypes: { [key: string]: string } = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function start() {
  console.log("Environment Setup:");
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- PORT: ${port}`);
  console.log(`- __dirname: ${__dirname}`);
  console.log(`- distPath: ${distPath}`);
  console.log(`- distPath exists: ${existsSync(distPath)}`);
  console.log(
    `- GROK_API_KEY: ${process.env.GROK_API_KEY ? "SET" : "NOT SET"}`,
  );
  console.log(
    `- DATABASE_URL: ${process.env.DATABASE_URL ? "SET" : "NOT SET"}`,
  );

  const app = await createServer();

  // Serve static files (SPA assets)
  app.use((req, res, next) => {
    // Skip middleware for API routes
    if (req.path.startsWith("/api")) {
      return next();
    }

    // Resolve file path
    let filePath = path.join(distPath, req.path);

    // If requesting a directory or just /, serve index.html
    if (req.path === "/" || req.path.endsWith("/") || !extname(req.path)) {
      filePath = path.join(distPath, "index.html");
    }

    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Check if file exists
    if (!existsSync(filePath)) {
      // Not found - serve index.html for SPA routing
      const indexPath = path.join(distPath, "index.html");
      if (existsSync(indexPath)) {
        res.setHeader("Content-Type", "text/html");
        return createReadStream(indexPath).pipe(res);
      }
      return res.status(404).send("Not Found");
    }

    // Serve the file
    res.setHeader("Content-Type", contentType);
    createReadStream(filePath).pipe(res);
  });

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
  });

  server.on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down gracefully");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT, shutting down gracefully");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

import path from "path";
import { createServer } from "./index.js";
import express from "express";
import { createReadStream, existsSync } from "fs";
import { extname } from "path";
import { fileURLToPath } from "url";

const port = parseInt(process.env.PORT || "3000", 10);

// Get __dirname properly in ESM - with better fallbacks
let distPath: string;

try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // The distPath assumes we're running from /app/dist/server/node-build.mjs
  // So we go up to /app and then into dist/spa
  const appRoot = path.resolve(__dirname, "../../");
  distPath = path.resolve(appRoot, "dist/spa");
} catch (err) {
  // Fallback: use cwd() if import.meta.url doesn't work
  console.warn("Using cwd() fallback for distPath:", err);
  distPath = path.resolve(process.cwd(), "dist/spa");
}

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
  // Import fs for directory listing
  const { readdirSync } = await import("fs");

  console.log("========================================");
  console.log("🚀 PRODUCTION SERVER STARTING");
  console.log("========================================");
  console.log("Environment Setup:");
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- PORT: ${port}`);
  console.log(`- CWD: ${process.cwd()}`);
  console.log(`- distPath: ${distPath}`);
  console.log(`- distPath exists: ${existsSync(distPath)}`);

  // List what's in the dist directory for debugging
  try {
    const distDir = path.dirname(distPath);
    if (existsSync(distDir)) {
      const contents = readdirSync(distDir);
      console.log(`- dist/ contents: ${contents.join(", ")}`);
    }
  } catch (err) {
    console.warn("Could not list dist/ contents:", err);
  }

  // List SPA files if the directory exists
  if (existsSync(distPath)) {
    try {
      const spaContents = readdirSync(distPath);
      console.log(`- dist/spa/ contents: ${spaContents.join(", ")}`);
    } catch (err) {
      console.warn("Could not list dist/spa/ contents:", err);
    }
  }

  console.log("Configuration:");
  console.log(
    `- GROK_API_KEY: ${process.env.GROK_API_KEY ? "SET (" + process.env.GROK_API_KEY.substring(0, 10) + "...)" : "NOT SET"}`,
  );
  console.log(
    `- DATABASE_URL: ${process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.substring(0, 20) + "...)" : "NOT SET"}`,
  );
  console.log(
    `- PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH || "NOT SET (will download)"}`,
  );

  console.log("========================================");
  console.log("Creating Express server with API routes...");

  let app;
  try {
    app = await createServer();
    console.log("✅ Express server created successfully");
    console.log("✅ API routes registered:");
    console.log("   - GET  /api/ping");
    console.log("   - GET  /api/health");
    console.log("   - POST /api/audit");
    console.log("   - GET  /api/audit/progress");
    console.log("   - GET  /api/audits");
    console.log("   - POST /api/audits");
    console.log("   - GET  /api/audits/:id");
    console.log("========================================");
  } catch (error) {
    console.error("========================================");
    console.error("❌ FATAL ERROR: Failed to create server");
    console.error("========================================");
    console.error("Error:", error);
    console.error(
      "Stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error("========================================");
    throw error;
  }

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

    console.log(`[Static] Request: ${req.method} ${req.path}`, {
      resolvedPath: filePath,
      distPath,
      exists: existsSync(filePath),
    });

    // Check if file exists
    if (!existsSync(filePath)) {
      // Not found - serve index.html for SPA routing
      const indexPath = path.join(distPath, "index.html");
      console.log(`[Static] File not found, checking for index.html`, {
        indexPath,
        exists: existsSync(indexPath),
      });
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

  // 404 handler for unmatched API routes (after static file serving)
  app.use((req: any, res: any) => {
    console.warn(`[404] ${req.method} ${req.path} - API route not found`);
    res.status(404).json({
      error: "Not Found",
      path: req.path,
      method: req.method,
      message: `API endpoint ${req.method} ${req.path} does not exist`,
    });
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

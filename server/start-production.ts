import "dotenv/config";
import path from "path";
import { createReadStream } from "fs";
import { existsSync } from "fs";
import { extname } from "path";
import { createServer } from "./index.js";

const port = parseInt(process.env.PORT || "3000", 10);
console.log(
  "🚀 Checking environment: GROK_API_KEY =",
  process.env.GROK_API_KEY ? "SET" : "NOT SET",
);
const __dirname =
  import.meta.dirname || path.dirname(new URL(import.meta.url).pathname);
const distPath = path.join(__dirname, "../dist/spa");
console.log("distPath:", distPath);
console.log("distPath exists:", existsSync(distPath));

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
  let app;
  try {
    console.log("Creating Express server...");
    app = await createServer();
    console.log("✓ Express server created successfully");
  } catch (error) {
    console.error("✗ Failed to create server:", error);
    process.exit(1);
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
    console.log(`✅ Server running on port ${port}`);
    console.log(`📱 Open: http://localhost:${port}`);
  });

  server.on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 SIGTERM received");
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    console.log("🛑 SIGINT received");
    server.close(() => process.exit(0));
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

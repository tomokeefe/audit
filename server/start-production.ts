import "dotenv/config";
import path from "path";
import { createReadStream } from "fs";
import { existsSync } from "fs";
import { createServer } from "http";
import { extname } from "path";

const port = parseInt(process.env.PORT || "3000", 10);
const __dirname = import.meta.url.split("/").slice(0, -1).join("/");
const distPath = path.join(__dirname, "../spa");

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

const server = createServer((req, res) => {
  // Prevent request logging noise
  const url = req.url || "/";
  
  // Resolve file path
  let filePath = path.join(distPath, url);
  
  // If requesting a directory or just /, serve index.html
  if (url === "/" || url.endsWith("/") || !extname(url)) {
    filePath = path.join(distPath, "index.html");
  }

  const ext = extname(filePath);
  const contentType = mimeTypes[ext] || "application/octet-stream";

  // Check if file exists
  if (!existsSync(filePath)) {
    // Not found - serve index.html for SPA routing
    const indexPath = path.join(distPath, "index.html");
    if (existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
    return;
  }

  // Serve the file
  res.writeHead(200, { "Content-Type": contentType });
  createReadStream(filePath).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
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

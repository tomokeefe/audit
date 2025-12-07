import "dotenv/config";
import path from "path";
import express from "express";
import { createServer } from "./index";

async function startServer() {
  try {
    console.log("Starting server...");

    const app = createServer();
    const port = parseInt(process.env.PORT || "3000", 10);

    // In production, serve the built SPA files
    const __dirname = import.meta.url.split("/").slice(0, -1).join("/");
    const distPath = path.join(__dirname, "../spa");

    console.log(`SPA path: ${distPath}`);

    // Serve static files
    app.use(express.static(distPath));

    // Handle React Router - serve index.html for all non-API routes
    app.get("*", (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }

      res.sendFile(path.join(distPath, "index.html"));
    });

    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${port}`);
      console.log(`📱 Frontend: http://0.0.0.0:${port}`);
      console.log(`🔧 API: http://0.0.0.0:${port}/api`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully");
      server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("🛑 Received SIGINT, shutting down gracefully");
      server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

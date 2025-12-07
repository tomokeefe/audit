import "dotenv/config";
import path from "path";
import express from "express";
import { createServer } from "./index";

async function startServer() {
  try {
    console.log("Creating server instance...");
    const app = await createServer();
    
    const port = parseInt(process.env.PORT || "3000", 10);
    const __dirname = import.meta.url.split("/").slice(0, -1).join("/");
    const distPath = path.join(__dirname, "../spa");

    console.log(`SPA path: ${distPath}`);
    console.log("Serving static files...");
    
    // Only serve static files, no routes at all
    app.use(express.static(distPath));
    
    console.log("Starting server...");
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${port}`);
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
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

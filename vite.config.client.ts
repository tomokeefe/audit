import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  optimizeDeps: {
    exclude: [
      "puppeteer",
      "pdf-parse",
      "mammoth",
      "multer",
      "@types/multer"
    ], // Exclude server-only dependencies
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      // Start a separate Express server on port 3001 for API routes
      try {
        const { createServer } = await import("./server/index.js");
        const app = await createServer();
        const expressServer = app.listen(3001, "localhost", () => {
          console.log("✅ Express API server running on port 3001");
        });

        // Store the server for cleanup on Vite server close
        server.httpServer?.on("close", () => {
          expressServer.close();
        });
      } catch (error) {
        console.error("❌ Failed to initialize Express server:", error);
      }
    },
  };
}

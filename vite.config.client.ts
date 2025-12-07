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
}));

let expressAppInstance: any = null;

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // Initialize Express app asynchronously
      (async () => {
        try {
          const { createServer } = await import("./server/index.js");
          expressAppInstance = await createServer();
          console.log("✅ Express server initialized successfully");

          // Clear and re-add middlewares with Express first
          const middlewares = server.middlewares;

          // Create a wrapper middleware that only handles /api requests
          const apiMiddleware = (req, res, next) => {
            if (req.url?.startsWith("/api")) {
              expressAppInstance(req, res, next);
            } else {
              next();
            }
          };

          // Add Express as a middleware
          middlewares.use(apiMiddleware);
        } catch (error) {
          console.error("❌ Failed to initialize Express server:", error);
        }
      })();
    },
  };
}

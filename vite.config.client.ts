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
let expressInitialized = false;

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
          expressInitialized = true;
          console.log("✅ Express server initialized successfully");
        } catch (error) {
          console.error("❌ Failed to initialize Express server:", error);
        }
      })();

      // Return a pre middleware function that runs before Vite's default middleware
      return (req, res, next) => {
        // Check if this is an API request
        if (req.url?.startsWith("/api")) {
          if (expressAppInstance) {
            // Call Express app as middleware
            return expressAppInstance(req, res, () => {
              // If Express didn't handle it, continue to next middleware
              next();
            });
          }
        }
        // For non-API requests, continue to next middleware
        next();
      };
    },
  };
}

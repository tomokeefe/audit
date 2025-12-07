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
      const expressPromise = (async () => {
        try {
          const { createServer } = await import("./server/index.js");
          expressAppInstance = await createServer();
          console.log("✅ Express server initialized successfully");
        } catch (error) {
          console.error("❌ Failed to initialize Express server:", error);
        }
      })();

      // Return a middleware function that will be added to the middleware stack
      return async (req, res, next) => {
        // Wait for Express to be initialized
        if (!expressAppInstance) {
          await expressPromise;
        }

        // Check if this is an API request
        if (req?.url?.startsWith("/api") && expressAppInstance) {
          try {
            // Call Express app with a catch-all next function
            expressAppInstance(req, res, (err) => {
              if (err) {
                next(err);
              } else {
                next();
              }
            });
          } catch (error) {
            console.error("Error in Express middleware:", error);
            next(error);
          }
        } else {
          // For non-API requests, continue to next middleware
          next();
        }
      };
    },
  };
}

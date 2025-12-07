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
const expressReadyPromise = (async () => {
  try {
    const { createServer } = await import("./server/index.js");
    expressAppInstance = await createServer();
    console.log("✅ Express server initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Express server:", error);
  }
})();

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      // Wait for Express to be ready
      await expressReadyPromise;

      // Insert Express middleware at the beginning of the stack
      if (expressAppInstance) {
        // Create a custom middleware that intercepts all /api requests
        const apiHandler = (req, res, next) => {
          if (req.url && req.url.startsWith("/api")) {
            expressAppInstance(req, res, next);
          } else {
            next();
          }
        };

        // Use unshift to add at the beginning
        server.middlewares.stack.unshift({ handle: apiHandler });
      }
    },
  };
}

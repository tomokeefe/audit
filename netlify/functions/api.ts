import serverless from "serverless-http";

// Import from built server for Netlify deployment
import { createServer } from "../../dist/server/index.js";

export const handler = serverless(createServer());

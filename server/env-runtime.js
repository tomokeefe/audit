// Read .env file directly at runtime to bypass ALL bundling
import { readFileSync } from "fs";
import { join } from "path";

export function getRuntimeEnv(key) {
  try {
    // Read .env file directly from disk
    const envPath = join(process.cwd(), ".env");
    const envContent = readFileSync(envPath, "utf8");

    // Parse the key=value line
    const regex = new RegExp(`^${key}=["']?(.+?)["']?$`, "m");
    const match = envContent.match(regex);

    if (match && match[1]) {
      return match[1];
    }

    // Fallback to process.env
    return process.env[key];
  } catch (error) {
    console.error(`Error reading .env for ${key}:`, error);
    return process.env[key];
  }
}

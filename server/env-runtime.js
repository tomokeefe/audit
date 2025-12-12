// This file is NOT bundled by Vite - it reads env vars at runtime
export function getRuntimeEnv(key) {
  return process.env[key];
}

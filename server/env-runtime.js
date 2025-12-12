// This file reads env vars at runtime using eval to bypass bundlers
export function getRuntimeEnv(key) {
  // Use eval to prevent ANY bundler from inlining this
  return eval('process.env["' + key + '"]');
}

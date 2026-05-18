/**
 * stderr-only logger.
 *
 * MCP servers communicate via JSON-RPC on stdout. ANY non-JSON output to
 * stdout will desync the connection. Every log line must go to stderr.
 */
export const logger = {
  info: (msg: string, meta?: unknown) =>
    process.stderr.write(format("info", msg, meta)),
  warn: (msg: string, meta?: unknown) =>
    process.stderr.write(format("warn", msg, meta)),
  error: (msg: string, meta?: unknown) =>
    process.stderr.write(format("error", msg, meta)),
};

function format(level: string, msg: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] ${level} ${msg}`;
  if (meta === undefined) return base + "\n";
  try {
    return base + " " + JSON.stringify(meta) + "\n";
  } catch {
    return base + " [unserializable meta]\n";
  }
}

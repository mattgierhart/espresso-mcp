import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { logger } from "./util/logger.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  process.on("SIGINT", () => void shutdown(server, transport, "SIGINT"));
  process.on("SIGTERM", () => void shutdown(server, transport, "SIGTERM"));

  await server.connect(transport);
  logger.info(`${SERVER_NAME} ${SERVER_VERSION} ready (stdio)`);
}

async function shutdown(
  server: Awaited<ReturnType<typeof createServer>>,
  _transport: StdioServerTransport,
  reason: string,
): Promise<void> {
  logger.info(`shutting down: ${reason}`);
  try {
    await server.close();
  } catch (err) {
    logger.error("error during shutdown", { err: String(err) });
  }
  process.exit(0);
}

main().catch((err) => {
  logger.error("fatal startup error", { err: String(err), stack: err?.stack });
  process.exit(1);
});

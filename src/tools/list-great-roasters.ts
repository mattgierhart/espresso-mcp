import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadData } from "../sources/curated.js";
import type { Reputation } from "../types.js";
import { logger } from "../util/logger.js";

const reputationOrder: Record<Reputation, number> = {
  "world-class": 0,
  "regional-leader": 1,
  notable: 2,
  unknown: 3,
};

const inputSchema = {
  country: z.string().optional().describe("Filter by ISO-3166 alpha-2 country code."),
  min_reputation: z.enum(["notable", "regional-leader", "world-class"]).optional()
    .describe("Minimum reputation tier. Default: 'notable' (includes all known)."),
  limit: z.number().int().positive().max(200).optional().default(50)
    .describe("Maximum number of roasters to return. Default 50."),
};

export function registerListGreatRoasters(server: McpServer): void {
  server.registerTool(
    "list_great_roasters",
    {
      title: "List Great Coffee Roasters",
      description:
        "List curated specialty coffee roasters from the database, filtered by country and reputation tier. Useful for finding cafes that serve a given roaster's beans, or planning a roaster-focused trip.",
      inputSchema,
    },
    async (args) => {
      const { country, min_reputation, limit } = args;
      try {
        const { roasters } = await loadData();
        const minTier = min_reputation ?? "notable";
        const minRank = reputationOrder[minTier];

        const filtered = roasters
          .filter((r) => (country ? r.country.toUpperCase() === country.toUpperCase() : true))
          .filter((r) => reputationOrder[r.reputation] <= minRank)
          .sort((a, b) => {
            const r = reputationOrder[a.reputation] - reputationOrder[b.reputation];
            if (r !== 0) return r;
            return a.name.localeCompare(b.name);
          })
          .slice(0, limit);

        const summary = filtered.length === 0
          ? "No roasters match those filters."
          : `${filtered.length} roaster(s):\n\n` +
            filtered.map((r) =>
              `• ${r.name} — ${r.city ? r.city + ", " : ""}${r.country} — ${r.reputation}` +
              (r.specialties && r.specialties.length > 0 ? ` — ${r.specialties.join(", ")}` : ""),
            ).join("\n");

        return {
          content: [{ type: "text" as const, text: summary }],
          structuredContent: { roasters: filtered, total_matched: filtered.length },
        };
      } catch (err) {
        logger.error("list_great_roasters failed", { err: String(err) });
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}

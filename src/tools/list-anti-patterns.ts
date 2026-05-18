import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadData } from "../sources/curated.js";
import { scoreCafeRecord } from "../scoring/score.js";
import { logger } from "../util/logger.js";

/**
 * `list_anti_patterns` exposes a curated set of shops that should NOT be
 * recommended as great espresso destinations. Two kinds:
 *
 * 1. `mass-market-chain` — Starbucks, Dunkin', Costa, etc. Generic dark roasts,
 *    flavored-drink menus, low sourcing transparency.
 * 2. `flavor-led-specialty` — shops that display third-wave signage (in-house
 *    roasting, single-origin signs, roast dates) but in practice serve a
 *    syrup-forward menu. Looks specialty, drinks flavored.
 *
 * Useful both as fixtures (verifying the scoring algorithm flags them) and as
 * contrast examples when explaining why a curated cafe is recommended.
 */

const inputSchema = {
  category: z.enum(["mass-market-chain", "flavor-led-specialty", "instagram-bait"]).optional()
    .describe("Filter to a specific anti-pattern category."),
  limit: z.number().int().positive().max(100).optional().default(20)
    .describe("Maximum number of entries to return. Default 20."),
};

export function registerListAntiPatterns(server: McpServer): void {
  server.registerTool(
    "list_anti_patterns",
    {
      title: "List Anti-Pattern Coffee Shops",
      description:
        "List shops that exemplify what to AVOID when looking for great espresso. Includes mass-market chains (Starbucks, Dunkin', Costa) and 'flavor-led specialty' shops that display third-wave signage but lean heavily on flavored drinks. Each entry shows why it's flagged. Useful as contrast when recommending real specialty cafes, and as regression fixtures for the scoring algorithm.",
      inputSchema,
    },
    async (args) => {
      const { category, limit } = args;
      try {
        const { anti_patterns, roasters } = await loadData();

        const filtered = anti_patterns
          .filter((c) => (category ? c.category === category : true))
          .map((c) => ({ ...c, score: scoreCafeRecord(c, roasters) }))
          .sort((a, b) => a.score.score - b.score.score)
          .slice(0, limit);

        const summary = filtered.length === 0
          ? "No anti-pattern entries match those filters."
          : `${filtered.length} anti-pattern shop(s) — avoid for great espresso:\n\n` +
            filtered.map((c) =>
              `• ${c.name} — ${c.city}, ${c.country} — score ${c.score.score} (${c.score.tier}) — ${c.category ?? "uncategorized"}`,
            ).join("\n");

        return {
          content: [{ type: "text" as const, text: summary }],
          structuredContent: {
            anti_patterns: filtered,
            total_matched: filtered.length,
            categories: ["mass-market-chain", "flavor-led-specialty", "instagram-bait"],
          },
        };
      } catch (err) {
        logger.error("list_anti_patterns failed", { err: String(err) });
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}

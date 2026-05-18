import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadData } from "../sources/curated.js";
import { scoreCafeRecord } from "../scoring/score.js";
import type { Cafe, ScoredCafe } from "../types.js";
import { logger } from "../util/logger.js";

const inputSchema = {
  query: z.string().optional()
    .describe("Free-text query matched against cafe name, city, district, and notes (case-insensitive)."),
  city: z.string().optional().describe("Filter by city name (case-insensitive exact match)."),
  country: z.string().optional().describe("Filter by ISO-3166 alpha-2 country code (e.g. 'JP', 'DK', 'US')."),
  roaster: z.string().optional()
    .describe("Filter to cafes that roast in-house under this name, or serve beans from this roaster."),
  min_score: z.number().min(0).max(100).optional().default(0)
    .describe("Minimum espresso-quality score (0-100). Default 0 (no filter)."),
  limit: z.number().int().positive().max(100).optional().default(20)
    .describe("Maximum number of cafes to return. Default 20."),
};

function matchQuery(cafe: Cafe, q: string): boolean {
  const haystack = [
    cafe.name,
    cafe.city,
    cafe.country,
    cafe.district ?? "",
    cafe.region ?? "",
    cafe.notes ?? "",
  ].join(" ").toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function matchRoaster(cafe: Cafe, r: string): boolean {
  const norm = r.toLowerCase();
  if (cafe.signals.roasting === "in-house" && cafe.name.toLowerCase().includes(norm)) return true;
  if (cafe.signals.roaster_names) {
    return cafe.signals.roaster_names.some((n) => n.toLowerCase().includes(norm));
  }
  return false;
}

export function registerSearchCafes(server: McpServer): void {
  server.registerTool(
    "search_cafes",
    {
      title: "Search Curated Cafes",
      description:
        "Search the curated specialty coffee cafe database by name, city, country, roaster, and minimum quality score. Returns scored results sorted by espresso-quality score descending.",
      inputSchema,
    },
    async (args) => {
      const { query, city, country, roaster, min_score, limit } = args;
      try {
        const { cafes, roasters: roasterDir } = await loadData();

        const matched: ScoredCafe[] = cafes
          .filter((c) => (query ? matchQuery(c, query) : true))
          .filter((c) => (city ? c.city.toLowerCase() === city.toLowerCase() : true))
          .filter((c) => (country ? c.country.toUpperCase() === country.toUpperCase() : true))
          .filter((c) => (roaster ? matchRoaster(c, roaster) : true))
          .map((c) => ({ ...c, score: scoreCafeRecord(c, roasterDir) }))
          .filter((c) => c.score.score >= min_score)
          .sort((a, b) => b.score.score - a.score.score);

        const total_matched = matched.length;
        const out = matched.slice(0, limit);

        const summary = out.length === 0
          ? "No cafes match those filters in the curated database."
          : `${out.length} of ${total_matched} matched cafe(s):\n\n` +
            out.map((c) => `• ${c.name} — ${c.city}, ${c.country} — score ${c.score.score} (${c.score.tier})`).join("\n");

        return {
          content: [{ type: "text" as const, text: summary }],
          structuredContent: {
            cafes: out,
            total_matched,
            query: { query, city, country, roaster, min_score, limit },
          },
        };
      } catch (err) {
        logger.error("search_cafes failed", { err: String(err) });
        return {
          content: [{ type: "text" as const, text: `Error searching cafes: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadData } from "../sources/curated.js";
import { scoreCafeRecord } from "../scoring/score.js";
import { haversineKm } from "../geo/haversine.js";
import type { ScoredCafe } from "../types.js";
import { logger } from "../util/logger.js";

const inputSchema = {
  lat: z.number().min(-90).max(90).describe("Latitude in decimal degrees (-90..90)."),
  lon: z.number().min(-180).max(180).describe("Longitude in decimal degrees (-180..180)."),
  radius_km: z.number().positive().max(50).optional().default(2)
    .describe("Search radius in kilometers. Default 2km."),
  min_score: z.number().min(0).max(100).optional().default(50)
    .describe("Filter out cafes below this espresso quality score (0-100). Default 50."),
  limit: z.number().int().positive().max(50).optional().default(10)
    .describe("Maximum number of cafes to return. Default 10."),
};

export function registerFindEspressoNear(server: McpServer): void {
  server.registerTool(
    "find_espresso_near",
    {
      title: "Find Espresso Near a Location",
      description:
        "Find ranked specialty espresso cafes within a radius of given coordinates. Returns cafes from the curated database sorted by espresso-quality score, with distance and score reasoning for each.",
      inputSchema,
    },
    async (args) => {
      const { lat, lon, radius_km, min_score, limit } = args;
      try {
        const { cafes, roasters } = await loadData();

        const withDistance: ScoredCafe[] = cafes
          .map((cafe) => ({
            ...cafe,
            distance_km: haversineKm(lat, lon, cafe.lat, cafe.lon),
            score: scoreCafeRecord(cafe, roasters),
          }))
          .filter((c) => (c.distance_km ?? Infinity) <= radius_km)
          .filter((c) => c.score.score >= min_score)
          .sort((a, b) => {
            if (b.score.score !== a.score.score) return b.score.score - a.score.score;
            return (a.distance_km ?? 0) - (b.distance_km ?? 0);
          })
          .slice(0, limit);

        const summary = withDistance.length === 0
          ? `No cafes found within ${radius_km}km of (${lat.toFixed(4)}, ${lon.toFixed(4)}) at score ≥ ${min_score}. Try widening the radius or lowering min_score.`
          : `Found ${withDistance.length} espresso cafe(s) within ${radius_km}km, sorted by score:\n\n` +
            withDistance.map(formatCafeLine).join("\n");

        return {
          content: [{ type: "text" as const, text: summary }],
          structuredContent: {
            cafes: withDistance,
            used_sources: ["curated"],
            generated_at: new Date().toISOString(),
            query: { lat, lon, radius_km, min_score, limit },
          },
        };
      } catch (err) {
        logger.error("find_espresso_near failed", { err: String(err) });
        return {
          content: [{ type: "text" as const, text: `Error finding cafes: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}

function formatCafeLine(cafe: ScoredCafe): string {
  const d = cafe.distance_km !== undefined ? `${cafe.distance_km.toFixed(2)}km` : "—";
  const rank = cafe.source_rankings?.find((r) => r.source.startsWith("worlds-100-best"))?.rank;
  const award = rank ? ` 🏆 World's #${rank}` : "";
  return `• ${cafe.name} — ${cafe.city}, ${cafe.country} — ${d} — score ${cafe.score.score} (${cafe.score.tier})${award}`;
}

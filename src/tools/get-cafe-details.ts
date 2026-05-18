import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findCafeById, loadData } from "../sources/curated.js";
import { scoreCafeRecord } from "../scoring/score.js";
import { haversineKm } from "../geo/haversine.js";
import type { Cafe } from "../types.js";
import { logger } from "../util/logger.js";

const inputSchema = {
  id: z.string().describe("Cafe id (slug) — e.g. 'tim-wendelboe-oslo'. Use search_cafes to find ids."),
};

export function registerGetCafeDetails(server: McpServer): void {
  server.registerTool(
    "get_cafe_details",
    {
      title: "Get Cafe Details",
      description:
        "Retrieve a full curated record for a cafe by id, including the espresso-quality score breakdown (per-signal contributions) and a few nearby/related cafes.",
      inputSchema,
    },
    async (args) => {
      const { id } = args;
      try {
        const { cafes, roasters } = await loadData();
        const cafe = findCafeById(cafes, id);

        if (!cafe) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Cafe '${id}' not found. Try search_cafes to find a valid id.`,
              },
            ],
            isError: true,
          };
        }

        const score = scoreCafeRecord(cafe, roasters);
        const related = findRelated(cafe, cafes);

        const lines = [
          `# ${cafe.name}`,
          `${cafe.district ? cafe.district + ", " : ""}${cafe.city}, ${cafe.country}`,
          `Score: ${score.score} (${score.tier}) · Confidence: ${(score.confidence * 100).toFixed(0)}%`,
          ``,
          `Reasoning: ${score.reasoning}`,
          ``,
          `Coordinates: ${cafe.lat}, ${cafe.lon} (${cafe.coord_precision})`,
          cafe.website ? `Website: ${cafe.website}` : "",
          cafe.notes ? `Notes: ${cafe.notes}` : "",
          `Last verified: ${cafe.last_verified}`,
        ].filter(Boolean);

        if (related.length > 0) {
          lines.push("", "Related curated cafes:");
          for (const r of related) {
            lines.push(`  • ${r.name} — ${r.city}, ${r.country} (id: ${r.id})`);
          }
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: {
            cafe,
            score,
            related_cafes: related,
          },
        };
      } catch (err) {
        logger.error("get_cafe_details failed", { err: String(err) });
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}

function findRelated(cafe: Cafe, all: Cafe[]): Cafe[] {
  const same = all.filter((c) => c.id !== cafe.id);
  const byCity = same
    .filter((c) => c.city === cafe.city)
    .map((c) => ({ c, score: 2 }));
  const byCountry = same
    .filter((c) => c.country === cafe.country && c.city !== cafe.city)
    .map((c) => ({ c, score: 1 }));
  const byRoaster = (cafe.signals.roaster_names ?? [])
    .flatMap((rn) =>
      same.filter((c) =>
        c.signals.roaster_names?.some((other) => other.toLowerCase() === rn.toLowerCase()),
      ),
    )
    .map((c) => ({ c, score: 3 }));

  const merged = new Map<string, { c: Cafe; score: number; dist: number }>();
  for (const { c, score } of [...byRoaster, ...byCity, ...byCountry]) {
    const dist = haversineKm(cafe.lat, cafe.lon, c.lat, c.lon);
    const prev = merged.get(c.id);
    if (!prev || prev.score < score) merged.set(c.id, { c, score, dist });
  }

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score || a.dist - b.dist)
    .slice(0, 5)
    .map((x) => x.c);
}

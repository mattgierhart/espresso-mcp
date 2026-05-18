import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadData } from "../sources/curated.js";
import { scoreCafe } from "../scoring/score.js";
import { logger } from "../util/logger.js";

/**
 * `score_cafe` is the codified "what makes a great espresso" algorithm exposed
 * as a tool. The client passes in observations (no DB lookup required) and
 * receives a full per-signal score breakdown.
 */
const signalsSchema = z
  .object({
    roasting: z.enum(["in-house", "named-partner", "unknown"]).optional(),
    roaster_names: z.array(z.string()).optional(),
    brew_methods: z.array(z.string()).optional()
      .describe("e.g. ['espresso','filter','pour-over']"),
    origin_transparency: z
      .enum(["farm-level", "region-level", "country-only", "none"]).optional(),
    espresso_machine: z.string().optional()
      .describe("Free-form (e.g. 'Slayer', 'La Marzocco Linea PB'). Quality brands earn a bonus."),
    grinder: z.string().optional(),
    cortado_on_menu: z.boolean().optional(),
    single_origin_espresso: z.boolean().optional(),
    roast_date_on_bags: z.boolean().optional(),
    competition_involvement: z.boolean().optional(),
    sca_certified_staff: z.boolean().optional(),
    signature_drinks: z.boolean().optional(),
    syrup_emphasis: z.boolean().optional()
      .describe("True if menu is dominated by flavored-syrup drinks. STRONGEST negative signal."),
    flavored_drink_share: z.number().min(0).max(1).optional()
      .describe("0..1 share of menu that is flavored. Continuous variant of syrup_emphasis."),
    small_focused_menu: z.boolean().optional(),
    no_grinder_visible: z.boolean().optional().describe("Effectively disqualifying."),
    only_dark_roast: z.boolean().optional(),
    no_origin_info: z.boolean().optional(),
  })
  .describe("Signals observed about the cafe. Omit fields you don't know — unknowns are skipped, not penalized.");

const sourceRankingSchema = z
  .object({
    source: z.string().describe("e.g. 'worlds-100-best-2026', 'sca-world-barista-championship'"),
    rank: z.number().int().nullable().optional(),
  });

const inputSchema = {
  name: z.string().optional().describe("Optional cafe name (used in reasoning and roaster lookup)."),
  observed_signals: signalsSchema,
  source_rankings: z.array(sourceRankingSchema).optional()
    .describe("Awards / rankings the cafe appears in."),
};

export function registerScoreCafe(server: McpServer): void {
  server.registerTool(
    "score_cafe",
    {
      title: "Score a Cafe by Observed Signals",
      description:
        "Apply the espresso-quality scoring algorithm to a set of observed signals (no database lookup required). Returns a 0-100 score, tier, per-signal contributions, and reasoning. Use this when you've gathered information about a cafe from a website, photo, or review and want a structured assessment.",
      inputSchema,
    },
    async (args) => {
      const { name, observed_signals, source_rankings } = args;
      try {
        const { roasters } = await loadData();
        const result = scoreCafe(
          {
            signals: observed_signals,
            source_rankings: source_rankings,
            roasters,
          },
          name,
        );

        const lines = [
          name ? `# ${name}` : "# (unnamed cafe)",
          `Score: ${result.score} / 100 — ${result.tier}`,
          `Confidence: ${(result.confidence * 100).toFixed(0)}% (based on ${result.signals.length} signals)`,
          ``,
          result.reasoning,
          ``,
          "Per-signal contributions:",
          ...result.signals
            .filter((s) => s.contribution !== 0)
            .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
            .map((s) =>
              `  ${s.contribution >= 0 ? "+" : ""}${s.contribution}  ${s.key}  — ${s.reason}`,
            ),
        ];

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        logger.error("score_cafe failed", { err: String(err) });
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

/**
 * Full MCP protocol round-trip. We construct the production server, link it
 * via InMemoryTransport to a real MCP Client, and exercise list-tools and
 * call-tool for every registered tool. No subprocess needed.
 */

describe("MCP protocol — round-trip via InMemoryTransport", () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "espresso-mcp-test", version: "0.0.0" }, { capabilities: {} });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterAll(async () => {
    await client?.close();
  });

  it("lists all 6 tools", async () => {
    const r = await client.listTools();
    const names = r.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "find_espresso_near",
      "get_cafe_details",
      "list_anti_patterns",
      "list_great_roasters",
      "score_cafe",
      "search_cafes",
    ]);
  });

  it("find_espresso_near returns curated cafes near Oslo", async () => {
    // Tim Wendelboe is at 59.9210, 10.7592
    const r = await client.callTool({
      name: "find_espresso_near",
      arguments: { lat: 59.9210, lon: 10.7592, radius_km: 5 },
    });
    expect(r.isError).toBeFalsy();
    const data = r.structuredContent as { cafes: Array<{ name: string }> };
    expect(data.cafes.length).toBeGreaterThan(0);
    expect(data.cafes[0]?.name).toBe("Tim Wendelboe");
  });

  it("search_cafes finds Berlin cafes when filtered by country", async () => {
    const r = await client.callTool({
      name: "search_cafes",
      arguments: { country: "DE" },
    });
    expect(r.isError).toBeFalsy();
    const data = r.structuredContent as { cafes: Array<{ country: string }> };
    expect(data.cafes.length).toBeGreaterThan(0);
    for (const c of data.cafes) expect(c.country).toBe("DE");
  });

  it("get_cafe_details returns score breakdown for a known id", async () => {
    const r = await client.callTool({
      name: "get_cafe_details",
      arguments: { id: "tim-wendelboe-oslo" },
    });
    expect(r.isError).toBeFalsy();
    const data = r.structuredContent as {
      cafe: { name: string };
      score: { score: number; tier: string };
    };
    expect(data.cafe.name).toBe("Tim Wendelboe");
    expect(data.score.score).toBeGreaterThan(80);
    expect(data.score.tier).toBe("world-class");
  });

  it("get_cafe_details errors for unknown id", async () => {
    const r = await client.callTool({
      name: "get_cafe_details",
      arguments: { id: "does-not-exist" },
    });
    expect(r.isError).toBe(true);
  });

  it("score_cafe scores a strong shop high", async () => {
    const r = await client.callTool({
      name: "score_cafe",
      arguments: {
        name: "Hypothetical Roaster",
        observed_signals: {
          roasting: "in-house",
          brew_methods: ["espresso", "pour-over"],
          origin_transparency: "farm-level",
          single_origin_espresso: true,
          roast_date_on_bags: true,
          cortado_on_menu: true,
          competition_involvement: true,
          espresso_machine: "Slayer",
          syrup_emphasis: false,
        },
      },
    });
    expect(r.isError).toBeFalsy();
    const data = r.structuredContent as { score: number; tier: string };
    expect(data.score).toBeGreaterThanOrEqual(80);
  });

  it("score_cafe penalizes flavored-drink shops", async () => {
    const r = await client.callTool({
      name: "score_cafe",
      arguments: {
        observed_signals: {
          syrup_emphasis: true,
          flavored_drink_share: 0.8,
          only_dark_roast: true,
        },
      },
    });
    const data = r.structuredContent as { score: number; tier: string };
    expect(data.score).toBeLessThan(50);
    expect(data.tier).toBe("avoid");
  });

  it("list_great_roasters returns world-class roasters", async () => {
    const r = await client.callTool({
      name: "list_great_roasters",
      arguments: { min_reputation: "world-class", limit: 10 },
    });
    expect(r.isError).toBeFalsy();
    const data = r.structuredContent as {
      roasters: Array<{ name: string; reputation: string }>;
    };
    expect(data.roasters.length).toBeGreaterThan(0);
    for (const r of data.roasters) expect(r.reputation).toBe("world-class");
  });

  it("list_anti_patterns returns avoid-tier shops with categories", async () => {
    const r = await client.callTool({
      name: "list_anti_patterns",
      arguments: {},
    });
    expect(r.isError).toBeFalsy();
    const data = r.structuredContent as {
      anti_patterns: Array<{ name: string; category: string; score: { tier: string } }>;
    };
    expect(data.anti_patterns.length).toBeGreaterThan(0);
    for (const a of data.anti_patterns) {
      expect(a.category).toBeDefined();
      // Anti-patterns never reach "great" or "world-class" — that's the floor we enforce.
      expect(["avoid", "fair", "good"]).toContain(a.score.tier);
    }
  });

  it("list_anti_patterns filters by category", async () => {
    const r = await client.callTool({
      name: "list_anti_patterns",
      arguments: { category: "mass-market-chain" },
    });
    const data = r.structuredContent as {
      anti_patterns: Array<{ category: string }>;
    };
    expect(data.anti_patterns.length).toBeGreaterThan(0);
    for (const a of data.anti_patterns) expect(a.category).toBe("mass-market-chain");
  });
});

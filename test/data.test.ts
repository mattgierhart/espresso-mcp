import { describe, expect, it } from "vitest";
import { clearCache, loadData } from "../src/sources/curated.js";

describe("curated data", () => {
  it("loads cafes/roasters/awards without error", async () => {
    clearCache();
    const data = await loadData();
    expect(data.cafes.length).toBeGreaterThan(20);
    expect(data.roasters.length).toBeGreaterThan(20);
    expect(data.awards.length).toBeGreaterThan(0);
  });

  it("every cafe has required fields", async () => {
    const { cafes } = await loadData();
    for (const cafe of cafes) {
      expect(cafe.id).toBeTruthy();
      expect(cafe.name).toBeTruthy();
      expect(cafe.city).toBeTruthy();
      expect(cafe.country).toMatch(/^[A-Z]{2}$/);
      expect(typeof cafe.lat).toBe("number");
      expect(typeof cafe.lon).toBe("number");
      expect(cafe.lat).toBeGreaterThanOrEqual(-90);
      expect(cafe.lat).toBeLessThanOrEqual(90);
      expect(cafe.lon).toBeGreaterThanOrEqual(-180);
      expect(cafe.lon).toBeLessThanOrEqual(180);
      expect(["exact", "approximate", "city-center"]).toContain(cafe.coord_precision);
      expect(cafe.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(cafe.signals).toBeTypeOf("object");
    }
  });

  it("ids are unique", async () => {
    const { cafes, roasters } = await loadData();
    const cafeIds = new Set(cafes.map((c) => c.id));
    expect(cafeIds.size).toBe(cafes.length);
    const roasterIds = new Set(roasters.map((r) => r.id));
    expect(roasterIds.size).toBe(roasters.length);
  });

  it("every roaster has a known reputation tier", async () => {
    const { roasters } = await loadData();
    for (const r of roasters) {
      expect(["world-class", "regional-leader", "notable", "unknown"]).toContain(r.reputation);
    }
  });

  it("every source_ranking points to a known award source", async () => {
    const { cafes, awards } = await loadData();
    const knownSources = new Set(awards.map((a) => a.source));
    for (const cafe of cafes) {
      for (const r of cafe.source_rankings ?? []) {
        expect(knownSources.has(r.source), `unknown source: ${r.source} in cafe ${cafe.id}`).toBe(true);
      }
    }
  });

  it("anti-patterns load with a category set on every entry", async () => {
    const { anti_patterns } = await loadData();
    expect(anti_patterns.length).toBeGreaterThan(0);
    for (const a of anti_patterns) {
      expect(a.category).toBeDefined();
      expect(["mass-market-chain", "flavor-led-specialty", "instagram-bait"]).toContain(a.category);
    }
  });

  it("mass-market-chain anti-patterns score in 'avoid' or 'fair'", async () => {
    const { anti_patterns, roasters } = await loadData();
    const { scoreCafeRecord } = await import("../src/scoring/score.js");
    const chains = anti_patterns.filter((a) => a.category === "mass-market-chain");
    expect(chains.length).toBeGreaterThan(0);
    for (const a of chains) {
      const result = scoreCafeRecord(a, roasters);
      expect(
        ["avoid", "fair"],
        `${a.name} scored ${result.score} (${result.tier}) — chains must score avoid/fair`,
      ).toContain(result.tier);
    }
  });

  it("flavor-led-specialty anti-patterns are flagged by category even when score is forgiving", async () => {
    // These are shops with genuine third-wave structural signals (in-house roasting,
    // single-origin signs, roast dates) but flavor-forward menus. The structural
    // signals will float their score upward; the category flag is the explicit
    // human override saying "we know it looks specialty but doesn't deliver."
    const { anti_patterns, roasters } = await loadData();
    const { scoreCafeRecord } = await import("../src/scoring/score.js");
    const flavorLed = anti_patterns.filter((a) => a.category === "flavor-led-specialty");
    expect(flavorLed.length).toBeGreaterThan(0);
    for (const a of flavorLed) {
      expect(a.category).toBe("flavor-led-specialty");
      const result = scoreCafeRecord(a, roasters);
      // Their score is informative but the category is the authoritative anti-flag.
      // Assert they never reach "great" or "world-class" tier.
      expect(["avoid", "fair", "good"], `${a.name} scored ${result.score} (${result.tier})`).toContain(result.tier);
    }
  });
});

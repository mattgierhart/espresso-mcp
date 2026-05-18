import { describe, expect, it } from "vitest";
import { scoreCafe, scoreCafeRecord } from "../src/scoring/score.js";
import type { Cafe, Roaster, Signals } from "../src/types.js";

const baseSignals: Signals = {};

const onyxLike: Signals = {
  roasting: "in-house",
  brew_methods: ["espresso", "filter", "pour-over"],
  origin_transparency: "farm-level",
  espresso_machine: "Slayer",
  cortado_on_menu: true,
  single_origin_espresso: true,
  roast_date_on_bags: true,
  competition_involvement: true,
  syrup_emphasis: false,
};

const flavorShopLike: Signals = {
  roasting: "named-partner",
  brew_methods: ["espresso"],
  origin_transparency: "country-only",
  syrup_emphasis: true,
  flavored_drink_share: 0.7,
  only_dark_roast: true,
};

describe("scoreCafe", () => {
  it("returns a score in [0,100]", () => {
    const r = scoreCafe({ signals: baseSignals });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("rates a fully-positive cafe in the world-class tier", () => {
    const r = scoreCafe(
      {
        signals: onyxLike,
        source_rankings: [{ source: "worlds-100-best-2026", rank: 1 }],
      },
      "Onyx Coffee Lab",
    );
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.tier).toBe("world-class");
  });

  it("penalizes flavored-drink shops heavily (the anti-cover-up bias)", () => {
    const r = scoreCafe({ signals: flavorShopLike });
    // baseline 50 - 18 (syrup) - 7 (flavored>0.5) - 8 (dark only) = 17, plus nothing positive
    expect(r.score).toBeLessThan(50);
    expect(r.tier).toBe("avoid");
    const syrupContribution = r.signals.find((s) => s.key === "syrup_emphasis");
    expect(syrupContribution?.contribution).toBeLessThan(0);
  });

  it("skips unknown signals — does not penalize sparse data", () => {
    const partial: Signals = { roasting: "in-house", single_origin_espresso: true };
    const r = scoreCafe({ signals: partial });
    // baseline 50 + 8 (in-house) + 10 (single origin) = 68
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.score).toBeLessThanOrEqual(75);
  });

  it("awards bonus for World's 100 Best top-10 rank", () => {
    const withTop = scoreCafe({
      signals: { roasting: "in-house" },
      source_rankings: [{ source: "worlds-100-best-2026", rank: 1 }],
    });
    const withoutAward = scoreCafe({ signals: { roasting: "in-house" } });
    expect(withTop.score).toBeGreaterThan(withoutAward.score);
  });

  it("caps stacked award bonuses (no infinite stacking)", () => {
    const r = scoreCafe({
      signals: { roasting: "in-house" },
      source_rankings: [
        { source: "worlds-100-best-2026", rank: 1 },
        { source: "worlds-100-best-2025", rank: 1 },
        { source: "sca-world-barista-championship", rank: null },
        { source: "good-food-awards-2026", rank: null },
      ],
    });
    // 4 awards × ~15-20 each would explode without the cap
    const awardContribution = r.signals.find((s) => s.key.startsWith("awards:"));
    expect(awardContribution?.contribution).toBeLessThanOrEqual(20);
  });

  it("recognizes quality espresso machine brands", () => {
    const lm = scoreCafe({
      signals: { espresso_machine: "La Marzocco Linea PB" },
    });
    const noMachine = scoreCafe({ signals: {} });
    expect(lm.score).toBeGreaterThan(noMachine.score);
  });

  it("adds 'complete program' bonus for espresso + pour-over", () => {
    const both = scoreCafe({
      signals: { brew_methods: ["espresso", "pour-over"] },
    });
    const espressoOnly = scoreCafe({
      signals: { brew_methods: ["espresso"] },
    });
    expect(both.score).toBeGreaterThan(espressoOnly.score);
  });

  it("uses roaster reputation when cafe roasts in-house and is a known roaster", () => {
    const roasters: Roaster[] = [
      {
        id: "tim-wendelboe",
        name: "Tim Wendelboe",
        country: "NO",
        reputation: "world-class",
      },
    ];
    const r = scoreCafe(
      {
        signals: { roasting: "in-house" },
        roasters,
      },
      "Tim Wendelboe",
    );
    const roasterContribution = r.signals.find((s) => s.key.startsWith("roaster_reputation:"));
    expect(roasterContribution).toBeDefined();
    expect(roasterContribution?.contribution).toBe(25);
  });

  it("reports confidence proportional to known-signal count", () => {
    const sparse = scoreCafe({ signals: { roasting: "in-house" } });
    const rich = scoreCafe({ signals: onyxLike });
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
  });
});

describe("scoreCafeRecord", () => {
  it("integrates a full Cafe record with the scoring engine", () => {
    const cafe: Cafe = {
      id: "test",
      name: "Test Cafe",
      city: "Anywhere",
      country: "US",
      lat: 0,
      lon: 0,
      coord_precision: "approximate",
      signals: onyxLike,
      source_rankings: [{ source: "worlds-100-best-2026", rank: 5 }],
      last_verified: "2026-05-01",
    };
    const r = scoreCafeRecord(cafe);
    expect(r.score).toBeGreaterThan(75);
    expect(r.reasoning.length).toBeGreaterThan(0);
  });
});

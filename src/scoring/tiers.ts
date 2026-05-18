import type { Tier } from "../types.js";

export interface TierThreshold {
  tier: Tier;
  min: number;
  label: string;
  description: string;
}

export const TIER_THRESHOLDS: TierThreshold[] = [
  { tier: "world-class", min: 85, label: "World-class", description: "Among the best espresso experiences anywhere." },
  { tier: "great",       min: 70, label: "Great",       description: "High-quality specialty espresso." },
  { tier: "good",        min: 55, label: "Good",        description: "Solid specialty shop worth seeking out." },
  { tier: "fair",        min: 40, label: "Fair",        description: "Acceptable, but not a destination." },
  { tier: "avoid",       min: 0,  label: "Avoid",       description: "Anti-quality signals dominate — likely flavored-drink shop." },
];

export function tierFor(score: number): Tier {
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) return t.tier;
  }
  return "avoid";
}

export function tierLabel(tier: Tier): string {
  return TIER_THRESHOLDS.find((t) => t.tier === tier)?.label ?? "Unknown";
}

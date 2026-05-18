import type {
  Cafe,
  Roaster,
  ScoreResult,
  SignalContribution,
  Signals,
  SourceRanking,
} from "../types.js";
import {
  ALL_SIGNALS,
  AWARD_CAP,
  awardWeight,
  QUALITY_MACHINE_BRANDS,
  ROASTER_REPUTATION_WEIGHTS,
  SCORE_BASELINE,
} from "./weights.js";
import { tierFor, tierLabel } from "./tiers.js";

export interface ScoreInput {
  signals: Signals;
  source_rankings?: SourceRanking[];
  roasters?: Roaster[];
}

const clamp = (lo: number, hi: number, n: number) => Math.max(lo, Math.min(hi, n));

/**
 * Detect whether a signal is present (true), explicitly absent (false), or unknown (null).
 * Null signals are skipped — they don't help or hurt. This encourages incremental
 * data enrichment without penalizing sparse records.
 */
function readSignal(signals: Signals, key: string): boolean | null {
  switch (key) {
    case "roasting:in-house":
      return signals.roasting === "in-house"
        ? true
        : signals.roasting === undefined
          ? null
          : false;
    case "origin_transparency:farm-level":
      return signals.origin_transparency === "farm-level"
        ? true
        : signals.origin_transparency === undefined
          ? null
          : false;
    case "origin_transparency:region-level":
      return signals.origin_transparency === "region-level"
        ? true
        : signals.origin_transparency === undefined
          ? null
          : false;
    case "espresso_plus_pour_over": {
      const m = signals.brew_methods;
      if (!m) return null;
      const hasEspresso = m.includes("espresso");
      const hasFilter = m.includes("pour-over") || m.includes("filter") || m.includes("manual-brew");
      return hasEspresso && hasFilter;
    }
    case "quality_machine_brand": {
      const machine = signals.espresso_machine;
      if (!machine) return null;
      const lower = machine.toLowerCase();
      return QUALITY_MACHINE_BRANDS.some((b) => lower.includes(b.toLowerCase()));
    }
    case "flavored_drink_share_over_50":
      return signals.flavored_drink_share === undefined
        ? null
        : signals.flavored_drink_share > 0.5;
    case "no_origin_info":
      return signals.no_origin_info ?? (signals.origin_transparency === "none" || null);
    default: {
      const v = (signals as Record<string, unknown>)[key];
      if (v === undefined || v === null) return null;
      if (typeof v === "boolean") return v;
      return null;
    }
  }
}

/**
 * Compute a roaster-reputation contribution. We accept an optional roaster
 * directory and look up by name. If the cafe roasts in-house, we treat the
 * cafe-as-roaster: it gets the directory entry if one exists.
 */
function roasterReputationContribution(
  signals: Signals,
  roasters: Roaster[] | undefined,
  cafeName?: string,
): { weight: number; label: string } {
  if (!roasters || roasters.length === 0) return { weight: 0, label: "no roaster directory" };

  const candidates: string[] = [];
  if (signals.roasting === "in-house" && cafeName) candidates.push(cafeName);
  if (signals.roaster_names) candidates.push(...signals.roaster_names);

  let best: { weight: number; label: string } = { weight: 0, label: "unknown roaster" };
  for (const c of candidates) {
    const norm = c.toLowerCase().trim();
    const hit = roasters.find(
      (r) => r.name.toLowerCase() === norm || norm.includes(r.name.toLowerCase()),
    );
    if (hit) {
      const w = ROASTER_REPUTATION_WEIGHTS[hit.reputation];
      if (w > best.weight) best = { weight: w, label: `${hit.name} (${hit.reputation})` };
    }
  }
  return best;
}

function awardContribution(rankings: SourceRanking[] | undefined): { weight: number; label: string } {
  if (!rankings || rankings.length === 0) return { weight: 0, label: "no rankings" };
  let total = 0;
  const labels: string[] = [];
  for (const r of rankings) {
    const w = awardWeight(r.source, r.rank);
    total += w;
    labels.push(`${r.source}${r.rank ? ` #${r.rank}` : ""} (+${w})`);
  }
  return { weight: Math.min(AWARD_CAP, total), label: labels.join(", ") };
}

function composeReasoning(
  contributions: SignalContribution[],
  roaster: { weight: number; label: string },
  awards: { weight: number; label: string },
  tier: string,
): string {
  const positives = contributions
    .filter((c) => c.contribution > 0)
    .map((c) => c.key)
    .slice(0, 4);
  const negatives = contributions.filter((c) => c.contribution < 0).map((c) => c.key);
  const parts: string[] = [`Tier: ${tier}.`];
  if (roaster.weight > 0) parts.push(`Roaster: ${roaster.label} (+${roaster.weight}).`);
  if (awards.weight > 0) parts.push(`Awards: ${awards.label}.`);
  if (positives.length > 0) parts.push(`Strong signals: ${positives.join(", ")}.`);
  if (negatives.length > 0) parts.push(`⚠ Negative signals: ${negatives.join(", ")}.`);
  return parts.join(" ");
}

export function scoreCafe(input: ScoreInput, cafeName?: string): ScoreResult {
  const { signals, source_rankings, roasters } = input;
  const contributions: SignalContribution[] = [];
  let raw = 0;
  let knownCount = 0;

  for (const spec of ALL_SIGNALS) {
    const present = readSignal(signals, spec.key);
    const contribution = present === true ? spec.weight : 0;
    if (present !== null) knownCount += 1;
    raw += contribution;
    contributions.push({
      key: spec.key,
      present,
      weight: spec.weight,
      contribution,
      reason: spec.explanation,
    });
  }

  const roaster = roasterReputationContribution(signals, roasters, cafeName);
  raw += roaster.weight;
  if (roaster.weight > 0) {
    contributions.push({
      key: `roaster_reputation:${roaster.label}`,
      present: true,
      weight: roaster.weight,
      contribution: roaster.weight,
      reason: "Roaster reputation in curated directory.",
    });
  }

  const awards = awardContribution(source_rankings);
  raw += awards.weight;
  if (awards.weight > 0) {
    contributions.push({
      key: `awards:${awards.label}`,
      present: true,
      weight: awards.weight,
      contribution: awards.weight,
      reason: "Award / ranking presence.",
    });
  }

  const score = clamp(0, 100, Math.round(raw + SCORE_BASELINE));
  const tier = tierFor(score);
  const totalSignals = ALL_SIGNALS.length;
  const confidence = totalSignals > 0 ? knownCount / totalSignals : 0;
  const reasoning = composeReasoning(contributions, roaster, awards, tierLabel(tier));

  return { score, tier, signals: contributions, reasoning, confidence };
}

export function scoreCafeRecord(cafe: Cafe, roasters?: Roaster[]): ScoreResult {
  return scoreCafe(
    {
      signals: cafe.signals,
      source_rankings: cafe.source_rankings,
      roasters,
    },
    cafe.name,
  );
}

/**
 * Core data types for espresso-mcp.
 *
 * The schema mirrors the curated `data/cafes.json` and `data/roasters.json` files
 * one-to-one so that contributors can edit JSON without consulting code.
 */

export type Reputation = "world-class" | "regional-leader" | "notable" | "unknown";
export type CoordPrecision = "exact" | "approximate" | "city-center";
export type Tier = "world-class" | "great" | "good" | "fair" | "unknown" | "avoid";
export type Roasting = "in-house" | "named-partner" | "unknown";
export type OriginTransparency = "farm-level" | "region-level" | "country-only" | "none";

export type BrewMethod =
  | "espresso"
  | "filter"
  | "pour-over"
  | "siphon"
  | "manual-brew"
  | "aeropress"
  | "cold-brew"
  | "batch-brew";

export interface SourceRanking {
  source: string;
  rank?: number | null;
}

export interface Signals {
  roasting?: Roasting;
  roaster_names?: string[];
  brew_methods?: BrewMethod[] | string[];
  origin_transparency?: OriginTransparency;
  espresso_machine?: string;
  grinder?: string;
  cortado_on_menu?: boolean;
  single_origin_espresso?: boolean;
  roast_date_on_bags?: boolean;
  competition_involvement?: boolean;
  sca_certified_staff?: boolean;
  signature_drinks?: boolean;
  syrup_emphasis?: boolean;
  flavored_drink_share?: number;
  small_focused_menu?: boolean;
  no_grinder_visible?: boolean;
  only_dark_roast?: boolean;
  no_origin_info?: boolean;
}

export type AntiPatternCategory =
  | "mass-market-chain"
  | "flavor-led-specialty"
  | "instagram-bait";

export interface Cafe {
  id: string;
  name: string;
  city: string;
  region?: string | null;
  country: string;
  district?: string | null;
  lat: number;
  lon: number;
  coord_precision: CoordPrecision;
  source_rankings?: SourceRanking[];
  signals: Signals;
  atmosphere?: string;
  sourcing_model?: string;
  size?: string;
  website?: string | null;
  notes?: string;
  last_verified: string;
  /**
   * Present only on anti-pattern entries loaded from `data/anti-patterns.json`.
   * Real curated cafes do NOT set this field.
   */
  category?: AntiPatternCategory;
}

export interface Roaster {
  id: string;
  name: string;
  city?: string;
  country: string;
  reputation: Reputation;
  specialties?: string[];
  source_rankings?: SourceRanking[];
  website?: string;
  notes?: string;
}

export interface Award {
  source: string;
  title: string;
  year: number;
  publisher: string;
  url?: string;
  description?: string;
}

export interface SignalContribution {
  key: string;
  present: boolean | null;
  weight: number;
  contribution: number;
  reason: string;
}

export interface ScoreResult {
  score: number;
  tier: Tier;
  signals: SignalContribution[];
  reasoning: string;
  confidence: number;
}

export interface ScoredCafe extends Cafe {
  score: ScoreResult;
  distance_km?: number;
}

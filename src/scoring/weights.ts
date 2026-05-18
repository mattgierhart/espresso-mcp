/**
 * Signal weights for espresso-quality scoring.
 *
 * This is the SINGLE SOURCE OF TRUTH. The scoring function, the
 * `espresso://taxonomy/signals` resource, and the tests all read from here.
 *
 * Philosophy: a great espresso cafe is identified by what it cares about
 * (sourcing, roast freshness, equipment, training) and what it refuses to do
 * (mask bad coffee with syrups, leave coffee pre-ground). The single heaviest
 * negative signal is `syrup_emphasis` — menus dominated by flavored drinks
 * almost always indicate that the espresso underneath is mediocre.
 */

export interface SignalSpec {
  key: string;
  weight: number;
  category: "sourcing" | "freshness" | "equipment" | "people" | "menu" | "awards" | "anti-cover-up";
  description: string;
  explanation: string;
}

export const POSITIVE_SIGNALS: SignalSpec[] = [
  {
    key: "roasting:in-house",
    weight: 8,
    category: "sourcing",
    description: "Roasts coffee on premises",
    explanation: "Maximum control over freshness and quality. Look for a visible roaster.",
  },
  {
    key: "single_origin_espresso",
    weight: 10,
    category: "sourcing",
    description: "Offers a single-origin espresso option",
    explanation: "Indicates bean rotation, traceability, and confidence in extraction.",
  },
  {
    key: "origin_transparency:farm-level",
    weight: 7,
    category: "sourcing",
    description: "Bean origins specified down to farm or producer",
    explanation: "Highest tier of sourcing transparency. Region-level scores half; country-only is neutral.",
  },
  {
    key: "roast_date_on_bags",
    weight: 9,
    category: "freshness",
    description: "Retail bags show roast date, not just best-by",
    explanation: "Peak freshness commitment — the strongest single freshness signal.",
  },
  {
    key: "espresso_plus_pour_over",
    weight: 8,
    category: "menu",
    description: "Offers both espresso and pour-over / filter coffee",
    explanation: "The 'complete program' signal. Good shops nail both.",
  },
  {
    key: "cortado_on_menu",
    weight: 7,
    category: "menu",
    description: "Cortado on the menu",
    explanation: "Confidence proxy — shops avoid small milk drinks when espresso is weak.",
  },
  {
    key: "competition_involvement",
    weight: 9,
    category: "people",
    description: "Baristas compete in SCA events",
    explanation: "Elite skill investment — Barista Championship, Brewers Cup, etc.",
  },
  {
    key: "sca_certified_staff",
    weight: 6,
    category: "people",
    description: "Has SCA-certified barista staff",
    explanation: "Foundation / Intermediate / Professional certifications.",
  },
  {
    key: "quality_machine_brand",
    weight: 6,
    category: "equipment",
    description: "Uses a quality espresso machine brand",
    explanation: "La Marzocco, Slayer, Synesso, Decent, Victoria Arduino, Modbar, Sanremo Café Racer.",
  },
  {
    key: "signature_drinks",
    weight: 5,
    category: "menu",
    description: "Has unique signature drinks (non-syrup-driven)",
    explanation: "Creative drinks that showcase espresso quality, not mask it.",
  },
  {
    key: "small_focused_menu",
    weight: 5,
    category: "menu",
    description: "Tight focused menu (not 40+ options)",
    explanation: "Fewer things done very well beats many things done poorly.",
  },
  {
    key: "origin_transparency:region-level",
    weight: 3,
    category: "sourcing",
    description: "Bean origins specified to region",
    explanation: "Moderate transparency — half-credit toward farm-level.",
  },
];

export const NEGATIVE_SIGNALS: SignalSpec[] = [
  {
    key: "syrup_emphasis",
    weight: -18,
    category: "anti-cover-up",
    description: "Menu dominated by flavored-syrup drinks",
    explanation:
      "The strongest avoid-signal. Business model is flavor, not coffee. Quality espresso almost never hides behind syrups.",
  },
  {
    key: "flavored_drink_share_over_50",
    weight: -7,
    category: "anti-cover-up",
    description: "More than half the menu is flavored drinks",
    explanation: "Continuous variant of syrup_emphasis. Stacks with it.",
  },
  {
    key: "no_grinder_visible",
    weight: -25,
    category: "anti-cover-up",
    description: "No grinder visible or uses pre-ground coffee",
    explanation: "Effectively disqualifying. Pre-ground coffee is stale coffee.",
  },
  {
    key: "only_dark_roast",
    weight: -8,
    category: "anti-cover-up",
    description: "Only dark roast available",
    explanation: "Dark roasting masks bean defects and origin character.",
  },
  {
    key: "no_origin_info",
    weight: -7,
    category: "anti-cover-up",
    description: "Cannot tell you where beans come from",
    explanation: "Either don't know or don't care — neither is acceptable for specialty.",
  },
];

export const ALL_SIGNALS: SignalSpec[] = [...POSITIVE_SIGNALS, ...NEGATIVE_SIGNALS];

/**
 * Roaster reputation contribution. Applied when the cafe is a named-partner of
 * a known roaster, or when the cafe IS a known roaster (in-house roasting).
 */
export const ROASTER_REPUTATION_WEIGHTS = {
  "world-class": 25,
  "regional-leader": 15,
  notable: 8,
  unknown: 0,
} as const;

/**
 * Quality espresso machine brands. Substring match (case-insensitive) against
 * the cafe's `signals.espresso_machine` field.
 */
export const QUALITY_MACHINE_BRANDS = [
  "La Marzocco",
  "Slayer",
  "Synesso",
  "Decent",
  "Victoria Arduino",
  "Modbar",
  "Sanremo Café Racer",
  "Sanremo Cafe Racer",
  "Kees van der Westen",
] as const;

/**
 * Score baseline added after weight sum (so the absence of any negative signals
 * doesn't drop a cafe to 0). Tunes how forgiving the algorithm is to sparse data.
 */
export const SCORE_BASELINE = 50;

/**
 * Maximum award-source contribution from `source_rankings`. Caps stacking.
 */
export const AWARD_CAP = 20;

/**
 * Per-source award weights. Stacks up to AWARD_CAP. World's 100 Best is the
 * most authoritative; SCA championships and Coffee Review 95+ are tier-2.
 */
export function awardWeight(source: string, rank: number | null | undefined): number {
  const s = source.toLowerCase();
  if (s.includes("worlds-100-best") || s.includes("world-100-best")) {
    if (rank == null) return 6;
    if (rank <= 10) return 20;
    if (rank <= 25) return 15;
    if (rank <= 50) return 12;
    return 8;
  }
  if (s.includes("sca") || s.includes("world-barista")) return 15;
  if (s.includes("coffee-review")) return 12;
  if (s.includes("good-food-awards")) return 8;
  if (s.includes("sprudgie")) return 8;
  return 4;
}

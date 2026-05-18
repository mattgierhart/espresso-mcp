import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { Award, Cafe, Roaster } from "../types.js";
import { logger } from "../util/logger.js";

/**
 * Resolve `data/` directory relative to the running script, NOT cwd.
 * - In dev (tsx src/index.ts):     curated.ts in src/sources → ../../data
 * - In dist (node dist/index.js):  bundled in dist/          → ../data
 * - Fallback: ./data relative to script.
 *
 * Probes each candidate for `cafes.json` and returns the first that exists.
 */
function findDataDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../data"),
    resolve(here, "../data"),
    resolve(here, "./data"),
    resolve(process.cwd(), "data"),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, "cafes.json"))) return c;
  }
  // Nothing found — return the first candidate so the eventual readFile error
  // is meaningful (caller will see which path it tried).
  return candidates[0]!;
}

let cache: { cafes: Cafe[]; roasters: Roaster[]; awards: Award[]; anti_patterns: Cafe[] } | null = null;

async function readJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

export async function loadData(dataDir?: string): Promise<{
  cafes: Cafe[];
  roasters: Roaster[];
  awards: Award[];
  anti_patterns: Cafe[];
}> {
  if (cache) return cache;
  const dir = dataDir ?? findDataDir();

  const [cafes, roasters, awards, anti_patterns] = await Promise.all([
    readJson<Cafe[]>(join(dir, "cafes.json")),
    readJson<Roaster[]>(join(dir, "roasters.json")),
    readJson<Award[]>(join(dir, "awards.json")),
    readJson<Cafe[]>(join(dir, "anti-patterns.json")).catch(() => [] as Cafe[]),
  ]);

  logger.info("data loaded", {
    cafes: cafes.length,
    roasters: roasters.length,
    awards: awards.length,
    anti_patterns: anti_patterns.length,
    dir,
  });
  cache = { cafes, roasters, awards, anti_patterns };
  return cache;
}

export function clearCache(): void {
  cache = null;
}

export function findCafeById(cafes: Cafe[], id: string): Cafe | undefined {
  return cafes.find((c) => c.id === id);
}

export function findRoasterByName(roasters: Roaster[], name: string): Roaster | undefined {
  const norm = name.toLowerCase().trim();
  return roasters.find(
    (r) => r.name.toLowerCase() === norm || norm.includes(r.name.toLowerCase()),
  );
}

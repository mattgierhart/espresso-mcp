import { describe, expect, it } from "vitest";
import { haversineKm } from "../src/geo/haversine.js";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(35.6855, 139.6904, 35.6855, 139.6904)).toBe(0);
  });

  it("matches a known reference distance (Oslo ↔ Stockholm ≈ 416 km)", () => {
    const d = haversineKm(59.9139, 10.7522, 59.3293, 18.0686);
    expect(d).toBeGreaterThan(410);
    expect(d).toBeLessThan(420);
  });

  it("matches a known reference distance (NYC ↔ London ≈ 5570 km)", () => {
    const d = haversineKm(40.7128, -74.006, 51.5074, -0.1278);
    expect(d).toBeGreaterThan(5550);
    expect(d).toBeLessThan(5590);
  });

  it("handles antipodal-ish distances (London ↔ Sydney)", () => {
    const d = haversineKm(51.5074, -0.1278, -33.8688, 151.2093);
    expect(d).toBeGreaterThan(16900);
    expect(d).toBeLessThan(17100);
  });

  it("is symmetric (a→b == b→a)", () => {
    const ab = haversineKm(48.8566, 2.3522, 52.52, 13.405);
    const ba = haversineKm(52.52, 13.405, 48.8566, 2.3522);
    expect(ab).toBeCloseTo(ba, 5);
  });
});

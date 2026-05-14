import { describe, expect, it } from "vitest";
import { normalizedToPdfDrawRect } from "../src/lib/pdf-signature";

describe("normalizedToPdfDrawRect", () => {
  it("maps full-page box to page bounds", () => {
    const r = normalizedToPdfDrawRect(612, 792, {
      nx: 0,
      ny: 0,
      nw: 1,
      nh: 1,
    });
    expect(r.x).toBe(0);
    expect(r.width).toBe(612);
    expect(r.height).toBe(792);
    expect(r.y).toBe(0);
  });

  it("maps a top-left quarter box", () => {
    const r = normalizedToPdfDrawRect(400, 600, {
      nx: 0,
      ny: 0,
      nw: 0.25,
      nh: 0.25,
    });
    expect(r.x).toBe(0);
    expect(r.width).toBe(100);
    expect(r.height).toBe(150);
    expect(r.y).toBeCloseTo(600 - 150);
  });
});

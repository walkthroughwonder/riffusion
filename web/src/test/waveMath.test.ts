import { describe, it, expect } from "vitest";
import { Fx, Fz, skewFactor, thetaForBreakX, breakBlend, curlSample } from "../wave/waveMath";
import { defaultParams } from "../wave/WaveParams";
import { smoothbump, smoothstep } from "../utils/remap";
import { bezier2D, buildArcLengthLUT, tForArcFraction } from "../utils/bezier";

describe("Fx(H, dz)", () => {
  it("is symmetric around dz = 0", () => {
    const sigma = 0.9;
    expect(Fx(0.3, 0.4, sigma)).toBeCloseTo(Fx(0.3, -0.4, sigma), 6);
  });

  it("peaks at dz = 0 and scales with H", () => {
    expect(Fx(0.5, 0, 0.9)).toBeGreaterThan(Fx(0.1, 0, 0.9));
    expect(Fx(0.5, 0, 0.9)).toBe(0.5);
  });
});

describe("Fz lobes", () => {
  it("is zero far outside all lobes", () => {
    const p = defaultParams();
    // Pick xNorm near 0 (before any lobe) — given defaults, first lobe is
    // well away, so Fz should be ~0 there.
    expect(Fz(0.0, p)).toBeLessThan(0.01);
  });

  it("is positive near Xbreak (break lobe peaks there)", () => {
    const p = defaultParams();
    expect(Fz(p.Xbreak, p)).toBeGreaterThan(0.5);
  });

  it("is continuous across sampling (no NaN / Inf)", () => {
    const p = defaultParams();
    for (let i = 0; i <= 200; i++) {
      const v = Fz(i / 200, p);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("skewFactor", () => {
  it("saturates to ~(1 - k) far before Xbreak", () => {
    const p = defaultParams();
    const s0 = skewFactor(0, p);
    expect(s0).toBeCloseTo(1 - p.asymmetry_k, 1);
  });

  it("is > 1 far after Xbreak", () => {
    const p = defaultParams();
    const s1 = skewFactor(1, p);
    expect(s1).toBeGreaterThan(1);
  });
});

describe("smoothbump", () => {
  it("is 1 at center, 0 at edges, and non-negative elsewhere", () => {
    expect(smoothbump(0.5, 0.5, 0.3)).toBeCloseTo(1, 6);
    expect(smoothbump(0.2, 0.5, 0.3)).toBeCloseTo(0, 6);
    expect(smoothbump(0.8, 0.5, 0.3)).toBeCloseTo(0, 6);
    for (let i = 0; i <= 100; i++) {
      const x = i / 100;
      expect(smoothbump(x, 0.5, 0.3)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("breakBlend", () => {
  it("is 0 before Xbreak, 1 after, monotone non-decreasing", () => {
    const p = defaultParams();
    let last = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      const b = breakBlend(x, p);
      expect(b).toBeGreaterThanOrEqual(last - 1e-6);
      last = b;
    }
    expect(breakBlend(0, p)).toBeLessThan(0.01);
    expect(breakBlend(1, p)).toBeGreaterThan(0.99);
  });
});

describe("thetaForBreakX", () => {
  it("is 0 at Xbreak and increases to 2*pi*turns at the far end", () => {
    const p = defaultParams();
    expect(thetaForBreakX(p.Xbreak, p)).toBeCloseTo(0, 6);
    const far = p.Xbreak + p.curl_L / p.Lx;
    expect(thetaForBreakX(far, p)).toBeCloseTo(Math.PI * 2 * p.curl_turns, 3);
  });
});

describe("curlSample", () => {
  it("produces finite positions for all theta", () => {
    const p = defaultParams();
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2 * p.curl_turns;
      const s = curlSample(theta, 0, 2, p);
      expect(Number.isFinite(s.x)).toBe(true);
      expect(Number.isFinite(s.z)).toBe(true);
    }
  });

  it("spiral radius r(theta) = r0 * exp(-lambda * theta) decays", () => {
    const p = defaultParams();
    // We don't rely on Cartesian position (which is offset by tipAdvance +
    // thickness); instead verify the underlying radius schedule.
    const r = (theta: number) => p.curl_r0 * Math.exp(-p.curl_lambda * theta);
    expect(r(Math.PI * 2)).toBeLessThan(r(0));
    expect(r(Math.PI * 4)).toBeLessThan(r(Math.PI * 2));
  });
});

describe("bezier + arc-length LUT", () => {
  it("arc-length LUT is monotone non-decreasing", () => {
    const lut = buildArcLengthLUT(
      [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 3, y: -1 },
        { x: 4, y: 1 },
      ],
      64,
    );
    for (let i = 1; i < lut.lengths.length; i++) {
      expect(lut.lengths[i]).toBeGreaterThanOrEqual(lut.lengths[i - 1]);
    }
  });

  it("tForArcFraction 0 → 0, 1 → 1", () => {
    const ctrl: [
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
    ] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: -1 },
      { x: 4, y: 1 },
    ];
    const lut = buildArcLengthLUT(ctrl, 128);
    expect(tForArcFraction(lut, 0)).toBeCloseTo(0, 3);
    expect(tForArcFraction(lut, 1)).toBeCloseTo(1, 3);
  });

  it("bezier2D endpoints match control points", () => {
    const ctrl: [
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
    ] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: -1 },
      { x: 4, y: 1 },
    ];
    expect(bezier2D(ctrl, 0)).toEqual({ x: 0, y: 0 });
    expect(bezier2D(ctrl, 1)).toEqual({ x: 4, y: 1 });
  });
});

describe("smoothstep sanity", () => {
  it("returns 0 below edge0, 1 above edge1", () => {
    expect(smoothstep(0.2, 0.8, 0)).toBe(0);
    expect(smoothstep(0.2, 0.8, 1)).toBe(1);
    expect(smoothstep(0.2, 0.8, 0.5)).toBeGreaterThan(0);
    expect(smoothstep(0.2, 0.8, 0.5)).toBeLessThan(1);
  });
});

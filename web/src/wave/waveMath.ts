import { smoothbump, smoothstep, saturate } from "../utils/remap";
import type { WaveParams } from "./WaveParams";

// Fx(H, dz): horizontal-force bell, taller and wider for larger H.
// Returns a positive magnitude; caller applies direction.
export const Fx = (H: number, dz: number, sigmaBase: number): number => {
  const sigma = Math.max(0.05, sigmaBase * (0.4 + 1.4 * H));
  return H * Math.exp(-(dz * dz) / (sigma * sigma));
};

// The Fz "force" profile along normalized x in [0, 1]. Three lobes keyed to
// Xshoal and Xbreak. Returns the summed vertical drive at that x.
export const Fz = (xNorm: number, p: WaveParams): number => {
  const shoal = p.Fz_A_shoal * smoothbump(xNorm, p.Xshoal - p.w_steep * 0.5, p.w_shoal);
  const steep = p.Fz_A_steep * smoothbump(xNorm, (p.Xshoal + p.Xbreak) * 0.5, p.w_steep);
  const brk = p.Fz_A_break * smoothbump(xNorm, p.Xbreak, p.w_break);
  return shoal + steep + brk;
};

// Skew(x): converts a symmetric crest into a right-leaning one near Xbreak.
export const skewFactor = (xNorm: number, p: WaveParams): number =>
  1 + p.asymmetry_k * Math.tanh((xNorm - p.Xbreak + p.skew_d) / Math.max(1e-3, p.w_steep));

// Base traveling wave component (gentle sine riding on the drive).
export const baseWave = (xWorld: number, t: number, p: WaveParams): number => {
  const k = (Math.PI * 2) / Math.max(0.1, p.wavelength);
  const omega = k * p.speed;
  return 0.08 * p.H * Math.sin(k * xWorld - omega * t);
};

// Surface height h(x, y, t) BEFORE any path/front remap.
// xNorm is x/Lx. Returns world-space height.
export const surfaceHeight = (
  xWorld: number,
  xNorm: number,
  t: number,
  p: WaveParams,
): number => {
  const drive = Fz(xNorm, p);
  const skew = skewFactor(xNorm, p);
  const crestSharpPow = Math.max(0.1, p.crestSharpness);
  const shaped = Math.pow(saturate(drive), crestSharpPow) * skew;
  // H scales amplitude; crestRoundness pulls the peak down slightly.
  const amp = p.H * (2.4 - 0.9 * p.crestRoundness);
  const base = baseWave(xWorld, t, p);
  // Before Xbreak, this is the final height. In the breaking region we
  // let this value define the "base" under the curl (so the ocean body
  // still exists beneath the overturn).
  return p.waterLevel + amp * shaped + base;
};

// Overturning curl: parametric 2D curve in (x, z), evaluated by theta.
// Theta in [0, 2*pi*turns]. The "tip" advances forward as x >= Xbreak.
export interface CurlSample {
  x: number;
  z: number;
}
export const curlSample = (
  theta: number,
  xAtCrest: number,
  zBase: number,
  p: WaveParams,
): CurlSample => {
  const r = p.curl_r0 * Math.exp(-p.curl_lambda * theta);
  // Tail decay: the curl thins/tapers as theta grows past one turn.
  const tail = 1 / (1 + Math.exp(p.curl_tailDecay * (theta - Math.PI * 2 * 0.85)));
  const cx = xAtCrest + p.curl_tipAdvance * saturate(theta / (Math.PI * 2));
  const x = cx + r * Math.cos(theta + p.curl_phi) - p.curl_thickness * (1 - tail);
  const z = zBase + r * Math.sin(theta + p.curl_phi);
  return { x, z };
};

// Given a normalized x in the break region [Xbreak, Xbreak + L/Lx], map
// it to a theta in [0, 2*pi*turns].
export const thetaForBreakX = (xNorm: number, p: WaveParams): number => {
  const L = p.curl_L / Math.max(1e-3, p.Lx);
  const u = saturate((xNorm - p.Xbreak) / Math.max(1e-4, L));
  return u * Math.PI * 2 * p.curl_turns;
};

// Smooth blend weight for mixing surface height into curl geometry.
// Returns 0 well before Xbreak, 1 well after.
export const breakBlend = (xNorm: number, p: WaveParams): number => {
  const eps = Math.max(0.005, p.w_break * 0.6);
  return smoothstep(p.Xbreak - eps, p.Xbreak + eps, xNorm);
};

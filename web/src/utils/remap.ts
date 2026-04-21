export const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;

export const saturate = (x: number): number => clamp(x, 0, 1);

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = saturate((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

// Raised smooth bump, peak = 1 at `center`, reaches ~0 beyond `center ± width`.
// Uses a shifted-cosine for C1 continuity at the edges.
export const smoothbump = (x: number, center: number, width: number): number => {
  if (width <= 0) return 0;
  const d = (x - center) / width;
  if (d <= -1 || d >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * d));
};

export const lerp = mix;

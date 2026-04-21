export type Vec2 = { x: number; y: number };

const cubic = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};

const cubicDeriv = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const u = 1 - t;
  return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2);
};

export const bezier2D = (ctrl: [Vec2, Vec2, Vec2, Vec2], t: number): Vec2 => ({
  x: cubic(ctrl[0].x, ctrl[1].x, ctrl[2].x, ctrl[3].x, t),
  y: cubic(ctrl[0].y, ctrl[1].y, ctrl[2].y, ctrl[3].y, t),
});

export const bezier2DTangent = (ctrl: [Vec2, Vec2, Vec2, Vec2], t: number): Vec2 => {
  const dx = cubicDeriv(ctrl[0].x, ctrl[1].x, ctrl[2].x, ctrl[3].x, t);
  const dy = cubicDeriv(ctrl[0].y, ctrl[1].y, ctrl[2].y, ctrl[3].y, t);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
};

// 1D cubic Bezier (four scalar control values), t in [0, 1].
export const bezier1D = (c0: number, c1: number, c2: number, c3: number, t: number): number =>
  cubic(c0, c1, c2, c3, t);

// Precompute a lookup table of (arcLength, t) so we can sample by arc length.
// Returns the t for a given fraction of total arc length.
export const buildArcLengthLUT = (
  ctrl: [Vec2, Vec2, Vec2, Vec2],
  samples: number,
): { lengths: Float32Array; ts: Float32Array; total: number } => {
  const lengths = new Float32Array(samples + 1);
  const ts = new Float32Array(samples + 1);
  let prev = bezier2D(ctrl, 0);
  let acc = 0;
  lengths[0] = 0;
  ts[0] = 0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const p = bezier2D(ctrl, t);
    acc += Math.hypot(p.x - prev.x, p.y - prev.y);
    lengths[i] = acc;
    ts[i] = t;
    prev = p;
  }
  return { lengths, ts, total: acc };
};

export const tForArcFraction = (
  lut: { lengths: Float32Array; ts: Float32Array; total: number },
  frac: number,
): number => {
  if (lut.total <= 0) return frac;
  const target = frac * lut.total;
  const { lengths, ts } = lut;
  // Binary search
  let lo = 0;
  let hi = lengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lengths[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const l0 = lengths[i - 1];
  const l1 = lengths[i];
  const k = l1 > l0 ? (target - l0) / (l1 - l0) : 0;
  return ts[i - 1] * (1 - k) + ts[i] * k;
};

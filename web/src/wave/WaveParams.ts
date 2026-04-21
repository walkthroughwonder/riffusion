import type { Vec2 } from "../utils/bezier";

export interface WaveParams {
  // Geometry / resolution
  Lx: number;
  Ly: number;
  Nx: number;
  Ny: number;
  waterLevel: number;

  // Driving forces (paper's Fx / Fz)
  H: number;
  Fx_sigma: number;
  Fz_A_shoal: number;
  Fz_A_steep: number;
  Fz_A_break: number;
  Xshoal: number;
  Xbreak: number;
  w_shoal: number;
  w_steep: number;
  w_break: number;

  // Propagation
  wavelength: number;
  speed: number;
  timeScale: number;
  paused: boolean;
  scrubTime: number;

  // Crest shape
  asymmetry_k: number;
  skew_d: number;
  crestRoundness: number;
  crestSharpness: number;
  foamThreshold: number;

  // Breaking curl
  curl_r0: number;
  curl_lambda: number;
  curl_turns: number;
  curl_tipAdvance: number;
  curl_L: number;
  curl_thickness: number;
  curl_phi: number;
  curl_tailDecay: number;

  // Wave-front curvature (bends crest line along Y)
  front_enable: boolean;
  front_A: number;
  front_c0: number;
  front_c1: number;
  front_c2: number;
  front_c3: number;

  // Wave-path curvature (4-point bezier in XY)
  path_enable: boolean;
  path_p0: Vec2;
  path_p1: Vec2;
  path_p2: Vec2;
  path_p3: Vec2;
  path_samples: number;

  // Water material
  deepColor: string;
  shallowColor: string;
  fresnelPower: number;
  waterRoughness: number;
  normalScale: number;
  causticsIntensity: number;
  transmission: number;

  // Foam
  foamColor: string;
  foamCrestThreshold: number;
  foamTrailLength: number;
  foamNoiseScale: number;
  foamNoiseSpeed: number;

  // Spray
  spray_emissionRate: number;
  spray_lifetime: number;
  spray_gravity: number;
  spray_initialSpeed: number;
  spray_spread: number;
  spray_size: number;
  spray_color: string;

  // Mist
  mist_emissionRate: number;
  mist_lifetime: number;
  mist_drift: number;
  mist_color: string;
  mist_opacity: number;

  // Environment / sky
  sunTheta: number;
  sunPhi: number;
  sunColor: string;
  skyTurbidity: number;
  exposure: number;
  fogDensity: number;

  // Debug
  wireframe: boolean;
  showNormals: boolean;
  showForceVectors: boolean;
  showXshoalMarker: boolean;
  showXbreakMarker: boolean;
  showPathCurve: boolean;
}

export const defaultParams = (): WaveParams => ({
  Lx: 40,
  Ly: 24,
  Nx: 320,
  Ny: 96,
  waterLevel: 0,

  H: 0.35,
  Fx_sigma: 0.9,
  Fz_A_shoal: 0.35,
  Fz_A_steep: 0.55,
  Fz_A_break: 1.0,
  Xshoal: 0.45,
  Xbreak: 0.72,
  w_shoal: 0.28,
  w_steep: 0.18,
  w_break: 0.1,

  wavelength: 18,
  speed: 1.6,
  timeScale: 1.0,
  paused: false,
  scrubTime: 0,

  asymmetry_k: 0.55,
  skew_d: 0.09,
  crestRoundness: 0.45,
  crestSharpness: 1.25,
  foamThreshold: 0.55,

  curl_r0: 1.4,
  curl_lambda: 0.18,
  curl_turns: 1.35,
  curl_tipAdvance: 2.2,
  curl_L: 4.5,
  curl_thickness: 0.7,
  curl_phi: 0.55,
  curl_tailDecay: 1.5,

  front_enable: true,
  front_A: 0.9,
  front_c0: 0,
  front_c1: 0.6,
  front_c2: 0.6,
  front_c3: 0,

  path_enable: false,
  path_p0: { x: -20, y: 0 },
  path_p1: { x: -6, y: -4 },
  path_p2: { x: 6, y: 4 },
  path_p3: { x: 20, y: 0 },
  path_samples: 128,

  deepColor: "#0a3b63",
  shallowColor: "#49c3d9",
  fresnelPower: 3.0,
  waterRoughness: 0.25,
  normalScale: 0.6,
  causticsIntensity: 0.35,
  transmission: 0.7,

  foamColor: "#ffffff",
  foamCrestThreshold: 0.5,
  foamTrailLength: 2.5,
  foamNoiseScale: 3.0,
  foamNoiseSpeed: 0.35,

  spray_emissionRate: 650,
  spray_lifetime: 1.4,
  spray_gravity: 9.81,
  spray_initialSpeed: 5.5,
  spray_spread: 0.6,
  spray_size: 0.14,
  spray_color: "#ffffff",

  mist_emissionRate: 220,
  mist_lifetime: 2.8,
  mist_drift: 0.6,
  mist_color: "#d9ecf7",
  mist_opacity: 0.35,

  sunTheta: 0.95,
  sunPhi: 0.45,
  sunColor: "#ffeccc",
  skyTurbidity: 2.2,
  exposure: 1.1,
  fogDensity: 0.008,

  wireframe: false,
  showNormals: false,
  showForceVectors: false,
  showXshoalMarker: true,
  showXbreakMarker: true,
  showPathCurve: false,
});

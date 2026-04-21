import * as THREE from "three";
import {
  bezier1D,
  bezier2D,
  bezier2DTangent,
  buildArcLengthLUT,
  tForArcFraction,
  type Vec2,
} from "../utils/bezier";
import { saturate, smoothstep } from "../utils/remap";
import type { WaveParams } from "./WaveParams";
import {
  breakBlend,
  curlSample,
  Fz,
  surfaceHeight,
  thetaForBreakX,
} from "./waveMath";

// Builds and updates the deformed wave mesh. Rebuilds topology when Nx / Ny
// change; otherwise only streams position/normal/attribute data each frame.
export class WaveGeometry {
  readonly mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private Nx: number;
  private Ny: number;

  // Attribute slots (besides position/normal/uv):
  //   aFoam     — per-vertex foam factor in [0, 1]
  //   aCrestDot — 1 near crest, 0 elsewhere (used for lip sampling)
  //   aXNorm    — normalized x in [0, 1] (for shader)
  private foamAttr!: THREE.BufferAttribute;
  private crestAttr!: THREE.BufferAttribute;
  private xNormAttr!: THREE.BufferAttribute;

  // Scratch buffers
  private lutCache: ReturnType<typeof buildArcLengthLUT> | null = null;
  private lutCachedFor: string = "";

  // Sampled crest-lip points (one per Y column), produced each frame for
  // the spray emitter to use.
  readonly lipPoints: THREE.Vector3[] = [];
  readonly lipTangents: THREE.Vector3[] = [];

  constructor(params: WaveParams, material: THREE.Material) {
    this.Nx = params.Nx;
    this.Ny = params.Ny;
    this.geometry = this.buildGeometry(params.Lx, params.Ly, this.Nx, this.Ny);
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
  }

  dispose(): void {
    this.geometry.dispose();
  }

  private buildGeometry(Lx: number, Ly: number, Nx: number, Ny: number): THREE.BufferGeometry {
    const plane = new THREE.PlaneGeometry(Lx, Ly, Nx, Ny);
    // PlaneGeometry lies in XY with +Z up — that matches our conventions.
    const vertCount = (Nx + 1) * (Ny + 1);
    plane.setAttribute("aFoam", new THREE.BufferAttribute(new Float32Array(vertCount), 1));
    plane.setAttribute("aCrestDot", new THREE.BufferAttribute(new Float32Array(vertCount), 1));
    plane.setAttribute("aXNorm", new THREE.BufferAttribute(new Float32Array(vertCount), 1));
    this.foamAttr = plane.getAttribute("aFoam") as THREE.BufferAttribute;
    this.crestAttr = plane.getAttribute("aCrestDot") as THREE.BufferAttribute;
    this.xNormAttr = plane.getAttribute("aXNorm") as THREE.BufferAttribute;
    // Pre-lip arrays
    this.lipPoints.length = 0;
    this.lipTangents.length = 0;
    for (let i = 0; i <= Ny; i++) {
      this.lipPoints.push(new THREE.Vector3());
      this.lipTangents.push(new THREE.Vector3(1, 0, 0));
    }
    return plane;
  }

  maybeRebuild(params: WaveParams): void {
    if (params.Nx !== this.Nx || params.Ny !== this.Ny) {
      this.geometry.dispose();
      this.Nx = params.Nx;
      this.Ny = params.Ny;
      this.geometry = this.buildGeometry(params.Lx, params.Ly, this.Nx, this.Ny);
      this.mesh.geometry = this.geometry;
    }
  }

  // Recompute positions + per-vertex attributes for current params and time.
  update(params: WaveParams, time: number): void {
    this.maybeRebuild(params);
    const Lx = params.Lx;
    const Ly = params.Ly;
    const Nx = this.Nx;
    const Ny = this.Ny;
    const pos = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    const foam = this.foamAttr;
    const crest = this.crestAttr;
    const xNormA = this.xNormAttr;

    // Build arc-length LUT for path curvature (cached by control-point hash).
    let pathLUT: ReturnType<typeof buildArcLengthLUT> | null = null;
    if (params.path_enable) {
      const ctrl: [Vec2, Vec2, Vec2, Vec2] = [
        params.path_p0,
        params.path_p1,
        params.path_p2,
        params.path_p3,
      ];
      const key =
        `${ctrl[0].x},${ctrl[0].y},${ctrl[1].x},${ctrl[1].y},` +
        `${ctrl[2].x},${ctrl[2].y},${ctrl[3].x},${ctrl[3].y},${params.path_samples}`;
      if (key !== this.lutCachedFor || !this.lutCache) {
        this.lutCache = buildArcLengthLUT(ctrl, params.path_samples);
        this.lutCachedFor = key;
      }
      pathLUT = this.lutCache;
    }

    let vi = 0;
    // Plane vertex iteration: row j along Y, column i along X.
    // PlaneGeometry layout: y decreases as j increases. We'll just read the
    // stored (x,y) from the existing position buffer (since it was built
    // from PlaneGeometry) and overwrite z + optionally x.
    //
    // For overturning we also need to override x in the break region, so
    // we'll recompute (x, y, z) from scratch using i/j.
    for (let j = 0; j <= Ny; j++) {
      const vCoord = j / Ny; // 0..1 along Y
      const yLocal = (vCoord - 0.5) * Ly;

      for (let i = 0; i <= Nx; i++) {
        const uCoord = i / Nx;
        let xLocal = (uCoord - 0.5) * Lx;

        // --- Wave-path remap: treat xLocal as arc length along path, yLocal
        //     as offset normal to the path tangent.
        let worldX = xLocal;
        let worldY = yLocal;
        if (pathLUT && params.path_enable) {
          const t = tForArcFraction(pathLUT, saturate(uCoord));
          const ctrl: [Vec2, Vec2, Vec2, Vec2] = [
            params.path_p0,
            params.path_p1,
            params.path_p2,
            params.path_p3,
          ];
          const c = bezier2D(ctrl, t);
          const tan = bezier2DTangent(ctrl, t);
          // Normal = rotate tangent +90° in XY
          const nx = -tan.y;
          const ny = tan.x;
          worldX = c.x + nx * yLocal;
          worldY = c.y + ny * yLocal;
        }

        // --- Wave-front curvature: offset x by a Y-dependent bezier, which
        //     bends the crest line sideways in plan view.
        if (params.front_enable) {
          const off =
            params.front_A *
            bezier1D(
              params.front_c0,
              params.front_c1,
              params.front_c2,
              params.front_c3,
              vCoord,
            );
          // Project along the local "forward" direction. Without path,
          // that's +X. With path, it's the path tangent — but for
          // simplicity we apply in local space on xLocal (paper shows
          // front curvature in local coords).
          xLocal -= off;
          if (!pathLUT) {
            worldX = xLocal;
          }
        }

        // Normalized x in [0, 1] using xLocal (the "logical" distance
        // along the wave, independent of path).
        const xNormVal = saturate(xLocal / Lx + 0.5);

        // --- Surface height (pre-break region)
        const hSurface = surfaceHeight(xLocal, xNormVal, time, params);

        // --- Overturning curl (break region)
        const bw = breakBlend(xNormVal, params);
        let posX = worldX;
        let posY = worldY;
        let posZ = hSurface;
        let crestDot = 0;
        let foamVal = 0;

        if (bw > 0) {
          const theta = thetaForBreakX(xNormVal, params);
          const xAtCrest = (params.Xbreak - 0.5) * Lx;
          const zBase = params.waterLevel + params.H * (1.3 - 0.4 * params.crestRoundness);
          const s = curlSample(theta, xAtCrest, zBase, params);
          // The curl is a 2D curve in local (x, z); we sweep it along Y.
          // Blend the local curl x-offset into posX, and replace z.
          const curlOffset = s.x - xAtCrest;
          if (pathLUT && params.path_enable) {
            // Apply curl offset along the path forward direction.
            const t = tForArcFraction(pathLUT, saturate(uCoord));
            const ctrl: [Vec2, Vec2, Vec2, Vec2] = [
              params.path_p0,
              params.path_p1,
              params.path_p2,
              params.path_p3,
            ];
            const tan = bezier2DTangent(ctrl, t);
            posX = worldX + tan.x * curlOffset * bw;
            posY = worldY + tan.y * curlOffset * bw;
          } else {
            posX = worldX + curlOffset * bw;
          }
          posZ = hSurface * (1 - bw) + s.z * bw;
          crestDot = Math.max(crestDot, bw);
        }

        // Foam factor: strong in break region, elevated on steep crests.
        const drive = Fz(xNormVal, params);
        foamVal = saturate(
          Math.max(
            bw * 1.3,
            (drive - params.foamCrestThreshold) * 1.8,
            smoothstep(params.foamCrestThreshold, 1.0, drive),
          ),
        );
        // Long foam trail behind breaking zone
        if (xNormVal > params.Xbreak) {
          foamVal = Math.max(
            foamVal,
            smoothstep(
              params.Xbreak + params.curl_L / params.Lx + params.foamTrailLength / params.Lx,
              params.Xbreak,
              xNormVal,
            ) * 0.9,
          );
        }

        pos.setXYZ(vi, posX, posY, posZ);
        foam.setX(vi, foamVal);
        crest.setX(vi, crestDot);
        xNormA.setX(vi, xNormVal);
        vi++;
      }
    }
    pos.needsUpdate = true;
    foam.needsUpdate = true;
    crest.needsUpdate = true;
    xNormA.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // Sample lip points: for each Y column, find vertex where theta ~ 0.35*pi
    // (just over the tip) and use it as a spawn point for spray.
    this.updateLipSamples(params);
  }

  private updateLipSamples(params: WaveParams): void {
    const pos = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    const xNormA = this.xNormAttr;
    const Nx = this.Nx;
    const Ny = this.Ny;
    const targetXNorm = saturate(params.Xbreak + 0.02);
    for (let j = 0; j <= Ny; j++) {
      // Find vertex nearest targetXNorm on this row.
      let bestI = 0;
      let bestD = Infinity;
      for (let i = 0; i <= Nx; i++) {
        const vi = j * (Nx + 1) + i;
        const xn = xNormA.getX(vi);
        const d = Math.abs(xn - targetXNorm);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      }
      const vi = j * (Nx + 1) + bestI;
      const viNext = j * (Nx + 1) + Math.min(Nx, bestI + 1);
      const lp = this.lipPoints[j];
      const lt = this.lipTangents[j];
      lp.set(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
      lt.set(
        pos.getX(viNext) - pos.getX(vi),
        pos.getY(viNext) - pos.getY(vi),
        pos.getZ(viNext) - pos.getZ(vi),
      );
      if (lt.lengthSq() > 1e-6) lt.normalize();
      else lt.set(1, 0, 0);
    }
  }
}

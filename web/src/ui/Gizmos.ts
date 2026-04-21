import * as THREE from "three";
import { bezier2D } from "../utils/bezier";
import { Fz } from "../wave/waveMath";
import type { WaveParams } from "../wave/WaveParams";

// Debug visualizations: Xshoal/Xbreak vertical markers, force-vector arrows
// along the wave axis, and a path-preview line.
export class Gizmos {
  readonly group: THREE.Group;
  private shoalLine: THREE.Line;
  private breakLine: THREE.Line;
  private forceLines: THREE.LineSegments;
  private pathLine: THREE.Line;

  constructor() {
    this.group = new THREE.Group();

    const mkVerticalMarker = (color: number): THREE.Line => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 0, 4),
      ]);
      const m = new THREE.LineBasicMaterial({ color });
      return new THREE.Line(g, m);
    };
    this.shoalLine = mkVerticalMarker(0x55aaff);
    this.breakLine = mkVerticalMarker(0xff5e5e);
    this.group.add(this.shoalLine);
    this.group.add(this.breakLine);

    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(64 * 2 * 3), 3));
    this.forceLines = new THREE.LineSegments(
      fGeo,
      new THREE.LineBasicMaterial({ color: 0xffe27a }),
    );
    this.group.add(this.forceLines);

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(128 * 3), 3));
    this.pathLine = new THREE.Line(pGeo, new THREE.LineBasicMaterial({ color: 0x9ce06c }));
    this.group.add(this.pathLine);
  }

  sync(params: WaveParams): void {
    const xShoal = (params.Xshoal - 0.5) * params.Lx;
    const xBreak = (params.Xbreak - 0.5) * params.Lx;
    this.shoalLine.position.set(xShoal, 0, params.waterLevel);
    this.breakLine.position.set(xBreak, 0, params.waterLevel);
    this.shoalLine.visible = params.showXshoalMarker;
    this.breakLine.visible = params.showXbreakMarker;

    // Force vectors: 64 upward segments whose length = Fz(xNorm)
    const samples = 64;
    const arr = (this.forceLines.geometry.getAttribute("position") as THREE.BufferAttribute)
      .array as Float32Array;
    for (let i = 0; i < samples; i++) {
      const xNorm = (i + 0.5) / samples;
      const xWorld = (xNorm - 0.5) * params.Lx;
      const h = Fz(xNorm, params) * params.H * 2.5;
      arr[i * 6 + 0] = xWorld;
      arr[i * 6 + 1] = 0;
      arr[i * 6 + 2] = params.waterLevel;
      arr[i * 6 + 3] = xWorld;
      arr[i * 6 + 4] = 0;
      arr[i * 6 + 5] = params.waterLevel + h;
    }
    (this.forceLines.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
      true;
    this.forceLines.visible = params.showForceVectors;

    // Path preview
    const parr = (this.pathLine.geometry.getAttribute("position") as THREE.BufferAttribute)
      .array as Float32Array;
    const N = 128;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const p = bezier2D(
        [params.path_p0, params.path_p1, params.path_p2, params.path_p3],
        t,
      );
      parr[i * 3 + 0] = p.x;
      parr[i * 3 + 1] = p.y;
      parr[i * 3 + 2] = params.waterLevel + 0.05;
    }
    (this.pathLine.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
      true;
    this.pathLine.visible = params.showPathCurve && params.path_enable;
  }
}

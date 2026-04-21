import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class SceneContext {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2000,
    );
    // Up vector = +Z (waves use Z for vertical). PlaneGeometry lies in XY.
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(18, -26, 10);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(4, 0, 1.2);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    window.addEventListener("resize", () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });
  }

  setCameraPreset(preset: "side" | "three_quarter" | "top" | "barrel"): void {
    switch (preset) {
      case "side":
        this.camera.position.set(0, -30, 4);
        this.controls.target.set(0, 0, 2);
        break;
      case "three_quarter":
        this.camera.position.set(18, -26, 10);
        this.controls.target.set(4, 0, 1.2);
        break;
      case "top":
        this.camera.position.set(0, -0.01, 40);
        this.controls.target.set(0, 0, 0);
        break;
      case "barrel":
        this.camera.position.set(3, 6, 2.5);
        this.controls.target.set(7, 0, 1.5);
        break;
    }
    this.controls.update();
  }
}

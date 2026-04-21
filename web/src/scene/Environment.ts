import * as THREE from "three";
import type { WaveParams } from "../wave/WaveParams";

// Simple gradient sky dome + directional sun. Good enough for the wave.
export class Environment {
  readonly scene: THREE.Scene;
  readonly sun: THREE.DirectionalLight;
  private skyMat: THREE.ShaderMaterial;
  private sky: THREE.Mesh;
  private hemi: THREE.HemisphereLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 0.5, 1) },
        uTurbidity: { value: 2.2 },
        uTopColor: { value: new THREE.Color("#0f2a4a") },
        uHorizonColor: { value: new THREE.Color("#b9d3e6") },
        uSunColor: { value: new THREE.Color("#ffeccc") },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec3 uSunDir;
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        uniform float uTurbidity;
        varying vec3 vDir;
        void main() {
          vec3 D = normalize(vDir);
          float up = clamp(D.z, -0.2, 1.0);
          vec3 col = mix(uHorizonColor, uTopColor, pow(up, 0.75));
          float sun = pow(max(dot(D, normalize(uSunDir)), 0.0), mix(80.0, 800.0, 1.0 - uTurbidity*0.1));
          col += uSunColor * sun * 2.4;
          // Add a soft halo
          float halo = pow(max(dot(D, normalize(uSunDir)), 0.0), 8.0);
          col += uSunColor * halo * 0.25;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), this.skyMat);
    this.sky.rotation.x = Math.PI; // put seams at bottom
    scene.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xffeccc, 1.2);
    this.sun.position.set(20, 20, 30);
    scene.add(this.sun);

    this.hemi = new THREE.HemisphereLight(0x8ec1e6, 0x0a1c2a, 0.6);
    scene.add(this.hemi);

    scene.fog = new THREE.FogExp2(0x9fbecc, 0.008);
  }

  sync(params: WaveParams): void {
    const theta = params.sunTheta;
    const phi = params.sunPhi;
    const sinT = Math.sin(theta);
    const dir = new THREE.Vector3(
      sinT * Math.cos(phi),
      sinT * Math.sin(phi),
      Math.max(0.05, Math.cos(theta)),
    );
    (this.skyMat.uniforms.uSunDir.value as THREE.Vector3).copy(dir);
    this.skyMat.uniforms.uTurbidity.value = params.skyTurbidity;
    (this.skyMat.uniforms.uSunColor.value as THREE.Color).set(params.sunColor);
    this.sun.position.copy(dir).multiplyScalar(50);
    this.sun.color.set(params.sunColor);
    (this.scene.fog as THREE.FogExp2).density = params.fogDensity;
    (this.scene.fog as THREE.FogExp2).color.set("#9fbecc");
  }
}

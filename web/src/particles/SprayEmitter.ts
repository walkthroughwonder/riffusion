import * as THREE from "three";
import sprayVert from "../shaders/spray.vert.glsl?raw";
import sprayFrag from "../shaders/spray.frag.glsl?raw";
import type { WaveParams } from "../wave/WaveParams";

export interface SprayConfig {
  maxParticles: number;
  gravity: number;
  drag: number;
  variant: "spray" | "mist";
}

// A pool of THREE.Points particles with ring-buffer recycling. Each frame
// the caller passes lip points (world-space positions + tangents along the
// breaking edge); the emitter samples them to spawn new particles.
export class SprayEmitter {
  readonly points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private ageLife: Float32Array;
  private sizes: Float32Array;
  private cursor = 0;
  private readonly max: number;
  private emitAccumulator = 0;
  private readonly cfg: SprayConfig;

  constructor(cfg: SprayConfig, initialColor: string, baseOpacity: number, baseSize: number) {
    this.cfg = cfg;
    this.max = cfg.maxParticles;
    this.positions = new Float32Array(this.max * 3);
    this.velocities = new Float32Array(this.max * 3);
    this.ageLife = new Float32Array(this.max * 2);
    this.sizes = new Float32Array(this.max);
    // Start all particles "dead" (age > life).
    for (let i = 0; i < this.max; i++) {
      this.ageLife[i * 2] = 999;
      this.ageLife[i * 2 + 1] = 1;
      this.sizes[i] = baseSize;
      // Park them far below ground so they don't render until used.
      this.positions[i * 3 + 2] = -10000;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("aAgeLife", new THREE.BufferAttribute(this.ageLife, 2));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setDrawRange(0, this.max);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.material = new THREE.ShaderMaterial({
      vertexShader: sprayVert,
      fragmentShader: sprayFrag,
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uColor: { value: new THREE.Color(initialColor) },
        uBaseOpacity: { value: baseOpacity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  setColor(hex: string): void {
    (this.material.uniforms.uColor.value as THREE.Color).set(hex);
  }

  setOpacity(op: number): void {
    this.material.uniforms.uBaseOpacity.value = op;
  }

  setPixelRatio(pr: number): void {
    this.material.uniforms.uPixelRatio.value = pr;
  }

  update(
    dt: number,
    lipPoints: THREE.Vector3[],
    lipTangents: THREE.Vector3[],
    params: WaveParams,
  ): void {
    if (dt <= 0) return;
    const isMist = this.cfg.variant === "mist";
    const rate = isMist ? params.mist_emissionRate : params.spray_emissionRate;
    const lifetime = isMist ? params.mist_lifetime : params.spray_lifetime;
    const initSpeed = isMist ? params.mist_drift : params.spray_initialSpeed;
    const spread = isMist ? 0.4 : params.spray_spread;
    const size = isMist ? params.spray_size * 1.8 : params.spray_size;

    this.emitAccumulator += rate * dt;
    const toEmit = Math.min(this.max, Math.floor(this.emitAccumulator));
    this.emitAccumulator -= toEmit;

    for (let n = 0; n < toEmit && lipPoints.length > 0; n++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const li = Math.floor(Math.random() * lipPoints.length);
      const lp = lipPoints[li];
      const lt = lipTangents[li];
      this.positions[idx * 3 + 0] = lp.x + (Math.random() - 0.5) * 0.3;
      this.positions[idx * 3 + 1] = lp.y + (Math.random() - 0.5) * 0.3;
      this.positions[idx * 3 + 2] = lp.z + Math.random() * 0.2;
      // Velocity: along tangent forward + upward + jitter
      const up = 0.6 + Math.random() * 0.5;
      const fwd = 0.8 + Math.random() * 0.6;
      const jx = (Math.random() - 0.5) * spread;
      const jy = (Math.random() - 0.5) * spread;
      const vx = lt.x * fwd * initSpeed + jx * initSpeed;
      const vy = lt.y * fwd * initSpeed + jy * initSpeed;
      const vz = up * initSpeed * (isMist ? 0.4 : 1.0);
      this.velocities[idx * 3 + 0] = vx;
      this.velocities[idx * 3 + 1] = vy;
      this.velocities[idx * 3 + 2] = vz;
      this.ageLife[idx * 2 + 0] = 0;
      this.ageLife[idx * 2 + 1] = lifetime * (0.75 + Math.random() * 0.5);
      this.sizes[idx] = size * (0.7 + Math.random() * 0.7);
    }

    // Integrate every particle.
    const g = isMist ? 0 : params.spray_gravity;
    const drag = isMist ? 0.2 : 0.6;
    for (let i = 0; i < this.max; i++) {
      const age = this.ageLife[i * 2];
      const life = this.ageLife[i * 2 + 1];
      if (age >= life) continue;
      const newAge = age + dt;
      this.ageLife[i * 2] = newAge;
      const k = Math.exp(-drag * dt);
      this.velocities[i * 3 + 0] *= k;
      this.velocities[i * 3 + 1] *= k;
      this.velocities[i * 3 + 2] -= g * dt;
      this.positions[i * 3 + 0] += this.velocities[i * 3 + 0] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      // Kill when submerged
      if (this.positions[i * 3 + 2] < params.waterLevel - 0.05) {
        this.ageLife[i * 2] = life;
        this.positions[i * 3 + 2] = -10000;
      }
    }

    (this.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("aAgeLife") as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
  }
}

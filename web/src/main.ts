import * as THREE from "three";
import { SceneContext } from "./scene/Scene";
import { Environment } from "./scene/Environment";
import { defaultParams } from "./wave/WaveParams";
import { WaveGeometry } from "./wave/WaveGeometry";
import { createWaterMaterial, syncWaterMaterial } from "./wave/WaveMaterial";
import { SprayEmitter } from "./particles/SprayEmitter";
import { Gui } from "./ui/Gui";
import { Gizmos } from "./ui/Gizmos";

const container = document.getElementById("app")!;
const ctx = new SceneContext(container);
const env = new Environment(ctx.scene);

const params = defaultParams();

const waterMat = createWaterMaterial(params);
const wave = new WaveGeometry(params, waterMat);
ctx.scene.add(wave.mesh);

const gizmos = new Gizmos();
ctx.scene.add(gizmos.group);

const spray = new SprayEmitter(
  { maxParticles: 5000, gravity: 9.81, drag: 0.6, variant: "spray" },
  params.spray_color,
  0.95,
  params.spray_size,
);
const mist = new SprayEmitter(
  { maxParticles: 3000, gravity: 0, drag: 0.2, variant: "mist" },
  params.mist_color,
  params.mist_opacity,
  params.spray_size * 1.8,
);
ctx.scene.add(spray.points);
ctx.scene.add(mist.points);

const gui = new Gui(params, {
  setCameraPreset: (p) => ctx.setCameraPreset(p),
});
void gui;

// Keyboard: space toggles pause.
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    params.paused = !params.paused;
    e.preventDefault();
  }
});

// Ocean bed / floor — a dim plane below the water to give depth cue.
const bed = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshBasicMaterial({ color: 0x061420 }),
);
bed.position.z = -3.5;
ctx.scene.add(bed);

let simTime = 0;
let lastT = performance.now();

const animate = (): void => {
  const now = performance.now();
  const realDt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  const dt = params.paused ? 0 : realDt * params.timeScale;
  simTime += dt;
  // If paused, allow scrubTime to drive animation for inspection.
  const tEff = params.paused ? params.scrubTime : simTime;

  wave.update(params, tEff);
  syncWaterMaterial(waterMat, params, ctx.camera, tEff);
  env.sync(params);
  gizmos.sync(params);

  ctx.renderer.toneMappingExposure = params.exposure;

  // Spray uses a minimum dt so it keeps animating during pause + scrub.
  const sprayDt = params.paused ? 0 : realDt;
  spray.setColor(params.spray_color);
  spray.setPixelRatio(window.devicePixelRatio || 1);
  spray.update(sprayDt, wave.lipPoints, wave.lipTangents, params);

  mist.setColor(params.mist_color);
  mist.setOpacity(params.mist_opacity);
  mist.setPixelRatio(window.devicePixelRatio || 1);
  mist.update(sprayDt, wave.lipPoints, wave.lipTangents, params);

  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  requestAnimationFrame(animate);
};
animate();

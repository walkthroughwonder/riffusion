import * as THREE from "three";
import waterVert from "../shaders/water.vert.glsl?raw";
import waterFrag from "../shaders/water.frag.glsl?raw";
import type { WaveParams } from "./WaveParams";

export const createWaterMaterial = (params: WaveParams): THREE.ShaderMaterial => {
  const mat = new THREE.ShaderMaterial({
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(params.deepColor) },
      uShallowColor: { value: new THREE.Color(params.shallowColor) },
      uFoamColor: { value: new THREE.Color(params.foamColor) },
      uSunDir: { value: new THREE.Vector3(1, 0.7, 0.8) },
      uSunColor: { value: new THREE.Color(params.sunColor) },
      uCameraPos: { value: new THREE.Vector3() },
      uFresnelPower: { value: params.fresnelPower },
      uRoughness: { value: params.waterRoughness },
      uNormalScale: { value: params.normalScale },
      uCaustics: { value: params.causticsIntensity },
      uTransmission: { value: params.transmission },
      uFoamNoiseScale: { value: params.foamNoiseScale },
      uFoamNoiseSpeed: { value: params.foamNoiseSpeed },
      uFoamCrestThreshold: { value: params.foamCrestThreshold },
    },
    side: THREE.DoubleSide,
    transparent: false,
  });
  return mat;
};

export const syncWaterMaterial = (
  mat: THREE.ShaderMaterial,
  params: WaveParams,
  camera: THREE.Camera,
  time: number,
): void => {
  const u = mat.uniforms;
  u.uTime.value = time;
  (u.uDeepColor.value as THREE.Color).set(params.deepColor);
  (u.uShallowColor.value as THREE.Color).set(params.shallowColor);
  (u.uFoamColor.value as THREE.Color).set(params.foamColor);
  (u.uSunColor.value as THREE.Color).set(params.sunColor);
  u.uFresnelPower.value = params.fresnelPower;
  u.uRoughness.value = params.waterRoughness;
  u.uNormalScale.value = params.normalScale;
  u.uCaustics.value = params.causticsIntensity;
  u.uTransmission.value = params.transmission;
  u.uFoamNoiseScale.value = params.foamNoiseScale;
  u.uFoamNoiseSpeed.value = params.foamNoiseSpeed;
  u.uFoamCrestThreshold.value = params.foamCrestThreshold;

  // Sun direction from spherical (theta = elevation, phi = azimuth)
  const theta = params.sunTheta;
  const phi = params.sunPhi;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  (u.uSunDir.value as THREE.Vector3).set(
    sinT * Math.cos(phi),
    sinT * Math.sin(phi),
    Math.max(0.05, cosT),
  );
  (u.uCameraPos.value as THREE.Vector3).copy(camera.position);

  mat.wireframe = params.wireframe;
};

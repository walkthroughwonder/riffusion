import GUI from "lil-gui";
import type { WaveParams } from "../wave/WaveParams";
import { defaultParams } from "../wave/WaveParams";

const STORAGE_KEY = "breaking-wave.preset";

export interface GuiCallbacks {
  setCameraPreset: (preset: "side" | "three_quarter" | "top" | "barrel") => void;
}

export class Gui {
  readonly gui: GUI;
  private params: WaveParams;

  constructor(params: WaveParams, cb: GuiCallbacks) {
    this.params = params;
    this.gui = new GUI({ title: "Breaking Wave" });

    // --- Geometry
    const fGeom = this.gui.addFolder("Wave Geometry");
    fGeom.add(params, "Lx", 10, 120, 1);
    fGeom.add(params, "Ly", 6, 80, 1);
    fGeom.add(params, "Nx", 64, 640, 1);
    fGeom.add(params, "Ny", 24, 240, 1);
    fGeom.add(params, "waterLevel", -2, 2, 0.01);

    // --- Driving Forces
    const fForce = this.gui.addFolder("Driving Forces");
    fForce.add(params, "H", 0.05, 0.9, 0.005).name("H (wave height)");
    fForce.add(params, "Fx_sigma", 0.1, 2.5, 0.01);
    fForce.add(params, "Fz_A_shoal", 0, 1.5, 0.01);
    fForce.add(params, "Fz_A_steep", 0, 1.5, 0.01);
    fForce.add(params, "Fz_A_break", 0, 2.0, 0.01);
    fForce.add(params, "Xshoal", 0, 1, 0.005);
    fForce.add(params, "Xbreak", 0, 1, 0.005);
    fForce.add(params, "w_shoal", 0.02, 0.8, 0.005);
    fForce.add(params, "w_steep", 0.02, 0.6, 0.005);
    fForce.add(params, "w_break", 0.01, 0.4, 0.005);

    // --- Propagation
    const fProp = this.gui.addFolder("Propagation");
    fProp.add(params, "wavelength", 2, 80, 0.1);
    fProp.add(params, "speed", -6, 6, 0.05);
    fProp.add(params, "timeScale", 0, 4, 0.01);
    fProp.add(params, "paused");
    fProp.add(params, "scrubTime", 0, 120, 0.01);

    // --- Crest Shape
    const fCrest = this.gui.addFolder("Crest Shape");
    fCrest.add(params, "asymmetry_k", 0, 2, 0.01);
    fCrest.add(params, "skew_d", -0.3, 0.3, 0.005);
    fCrest.add(params, "crestRoundness", 0, 1, 0.01);
    fCrest.add(params, "crestSharpness", 0.4, 4, 0.01);
    fCrest.add(params, "foamThreshold", 0, 1, 0.01);

    // --- Breaking Curl
    const fCurl = this.gui.addFolder("Breaking Curl");
    fCurl.add(params, "curl_r0", 0.2, 4, 0.01).name("r0");
    fCurl.add(params, "curl_lambda", 0, 1, 0.005).name("lambda (tightness)");
    fCurl.add(params, "curl_turns", 0.3, 3, 0.01).name("turns");
    fCurl.add(params, "curl_tipAdvance", 0, 6, 0.01).name("tip advance");
    fCurl.add(params, "curl_L", 0.5, 12, 0.05).name("L curl");
    fCurl.add(params, "curl_thickness", 0, 3, 0.01).name("thickness");
    fCurl.add(params, "curl_phi", -Math.PI, Math.PI, 0.01).name("phi");
    fCurl.add(params, "curl_tailDecay", 0, 5, 0.01).name("tail decay");

    // --- Front curvature
    const fFront = this.gui.addFolder("Front Curvature");
    fFront.add(params, "front_enable").name("enable");
    fFront.add(params, "front_A", -3, 3, 0.01);
    fFront.add(params, "front_c0", -1.5, 1.5, 0.01);
    fFront.add(params, "front_c1", -1.5, 1.5, 0.01);
    fFront.add(params, "front_c2", -1.5, 1.5, 0.01);
    fFront.add(params, "front_c3", -1.5, 1.5, 0.01);

    // --- Path curvature
    const fPath = this.gui.addFolder("Path Curvature");
    fPath.add(params, "path_enable").name("enable");
    fPath.add(params.path_p0, "x", -60, 60, 0.1).name("p0.x");
    fPath.add(params.path_p0, "y", -40, 40, 0.1).name("p0.y");
    fPath.add(params.path_p1, "x", -60, 60, 0.1).name("p1.x");
    fPath.add(params.path_p1, "y", -40, 40, 0.1).name("p1.y");
    fPath.add(params.path_p2, "x", -60, 60, 0.1).name("p2.x");
    fPath.add(params.path_p2, "y", -40, 40, 0.1).name("p2.y");
    fPath.add(params.path_p3, "x", -60, 60, 0.1).name("p3.x");
    fPath.add(params.path_p3, "y", -40, 40, 0.1).name("p3.y");
    fPath.add(params, "path_samples", 16, 512, 1);

    // --- Material
    const fMat = this.gui.addFolder("Water Material");
    fMat.addColor(params, "deepColor");
    fMat.addColor(params, "shallowColor");
    fMat.add(params, "fresnelPower", 0.2, 8, 0.01);
    fMat.add(params, "waterRoughness", 0, 1, 0.01);
    fMat.add(params, "normalScale", 0, 2, 0.01);
    fMat.add(params, "causticsIntensity", 0, 2, 0.01);
    fMat.add(params, "transmission", 0, 1, 0.01);

    // --- Foam
    const fFoam = this.gui.addFolder("Foam");
    fFoam.addColor(params, "foamColor");
    fFoam.add(params, "foamCrestThreshold", 0, 1, 0.01);
    fFoam.add(params, "foamTrailLength", 0, 10, 0.05);
    fFoam.add(params, "foamNoiseScale", 0.2, 10, 0.05);
    fFoam.add(params, "foamNoiseSpeed", 0, 2, 0.01);

    // --- Spray
    const fSpray = this.gui.addFolder("Spray");
    fSpray.add(params, "spray_emissionRate", 0, 3000, 10);
    fSpray.add(params, "spray_lifetime", 0.2, 6, 0.05);
    fSpray.add(params, "spray_gravity", 0, 30, 0.1);
    fSpray.add(params, "spray_initialSpeed", 0, 20, 0.05);
    fSpray.add(params, "spray_spread", 0, 3, 0.01);
    fSpray.add(params, "spray_size", 0.01, 0.6, 0.005);
    fSpray.addColor(params, "spray_color");

    // --- Mist
    const fMist = this.gui.addFolder("Mist");
    fMist.add(params, "mist_emissionRate", 0, 2000, 10);
    fMist.add(params, "mist_lifetime", 0.2, 10, 0.05);
    fMist.add(params, "mist_drift", 0, 8, 0.01);
    fMist.addColor(params, "mist_color");
    fMist.add(params, "mist_opacity", 0, 1, 0.01);

    // --- Environment
    const fEnv = this.gui.addFolder("Environment");
    fEnv.add(params, "sunTheta", 0, Math.PI, 0.005);
    fEnv.add(params, "sunPhi", -Math.PI, Math.PI, 0.005);
    fEnv.addColor(params, "sunColor");
    fEnv.add(params, "skyTurbidity", 0.5, 10, 0.05);
    fEnv.add(params, "exposure", 0.2, 3, 0.01);
    fEnv.add(params, "fogDensity", 0, 0.08, 0.0005);

    // --- Camera presets
    const fCam = this.gui.addFolder("Camera");
    const camProxy = {
      side: () => cb.setCameraPreset("side"),
      three_quarter: () => cb.setCameraPreset("three_quarter"),
      top: () => cb.setCameraPreset("top"),
      barrel: () => cb.setCameraPreset("barrel"),
    };
    fCam.add(camProxy, "side").name("preset: side");
    fCam.add(camProxy, "three_quarter").name("preset: 3/4");
    fCam.add(camProxy, "top").name("preset: top");
    fCam.add(camProxy, "barrel").name("preset: inside barrel");

    // --- Debug
    const fDbg = this.gui.addFolder("Debug");
    fDbg.add(params, "wireframe");
    fDbg.add(params, "showNormals");
    fDbg.add(params, "showForceVectors");
    fDbg.add(params, "showXshoalMarker");
    fDbg.add(params, "showXbreakMarker");
    fDbg.add(params, "showPathCurve");

    // --- Presets
    const fPre = this.gui.addFolder("Presets");
    const presetApi = {
      saveLocal: () => localStorage.setItem(STORAGE_KEY, JSON.stringify(this.params)),
      loadLocal: () => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
          Object.assign(this.params, JSON.parse(raw));
          this.refresh();
        } catch {
          /* ignore */
        }
      },
      reset: () => {
        Object.assign(this.params, defaultParams());
        this.refresh();
      },
      exportJson: () => {
        const blob = new Blob([JSON.stringify(this.params, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "breaking-wave.preset.json";
        a.click();
        URL.revokeObjectURL(url);
      },
    };
    fPre.add(presetApi, "saveLocal").name("save → localStorage");
    fPre.add(presetApi, "loadLocal").name("load ← localStorage");
    fPre.add(presetApi, "exportJson").name("export JSON");
    fPre.add(presetApi, "reset").name("reset to defaults");

    // Collapse some noisy folders
    fMat.close();
    fEnv.close();
    fCam.close();
    fPre.close();
    fMist.close();
  }

  private refresh(): void {
    // lil-gui doesn't automatically re-read params after bulk assign;
    // walking controllers refreshes displays.
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }
}

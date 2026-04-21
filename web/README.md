# Breaking Wave (Three.js)

A controllable, art-directable breaking wave built with Three.js. Every phase of the wave — shoaling, propagating, steepening, and breaking — is exposed as a GUI control, along with the crest curl, wave-front curvature, and wave-path trajectory.

## Run

```
cd web
npm install
npm run dev
```

Then open http://localhost:5173.

## Test

```
npm test
```

## Controls

- Drag to orbit, scroll to zoom, right-drag to pan
- Space to pause / resume
- lil-gui panel on the right: every wave parameter, grouped by concern

## What's implemented

- Procedural parametric height field with phase-based `Fz` lobes (shoaling, steepening, breaking)
- CPU-evaluated overturning curl for `x >= Xbreak`, swept along `y`
- Wave-path curvature (4-point Bezier in XY) and wave-front curvature (Y-axis crest bend)
- Fresnel water shader with foam masking on crest and break region
- Instanced GPU billboard spray + mist emitter at the breaking lip
- Debug gizmos for `Xshoal`, `Xbreak`, force vectors, path preview
- Preset save/load (localStorage + JSON export)

See `/root/.claude/plans/implement-this-in-3j-sleepy-cocke.md` for the design doc.

precision highp float;

uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uCameraPos;
uniform float uFresnelPower;
uniform float uRoughness;
uniform float uNormalScale;
uniform float uCaustics;
uniform float uTransmission;
uniform float uFoamNoiseScale;
uniform float uFoamNoiseSpeed;
uniform float uFoamCrestThreshold;
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vFoam;
varying float vCrest;
varying float vXNorm;

// --- hash/noise helpers -----------------------------------------------------
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int k = 0; k < 5; k++) {
        v += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCameraPos - vWorldPos);

    // Perturb normal with scrolling high-frequency noise to break up the
    // flat look; scale by normalScale and by proximity to crest.
    vec2 nuv = vWorldPos.xy * 0.55 + vec2(uTime * 0.08, uTime * 0.04);
    float nx = vnoise(nuv * 2.3) - 0.5;
    float ny = vnoise(nuv * 2.3 + 7.17) - 0.5;
    vec3 nPerturb = normalize(N + uNormalScale * vec3(nx, ny, 0.0));
    N = normalize(mix(N, nPerturb, 0.8));

    // Fresnel (Schlick)
    float fres = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);

    // Water body color (depth cue from xNorm — shallower as we approach break).
    float depthBlend = smoothstep(0.15, 0.95, vXNorm);
    vec3 water = mix(uDeepColor, uShallowColor, depthBlend);

    // Simple sun lighting
    vec3 L = normalize(uSunDir);
    float diff = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), mix(16.0, 160.0, 1.0 - uRoughness));

    // Caustic-ish shimmer underneath
    float caustic = fbm(vWorldPos.xy * 0.6 + vec2(uTime * 0.3, -uTime * 0.2));
    caustic = pow(caustic, 2.0);

    vec3 col = water * (0.35 + 0.65 * diff) + uSunColor * spec * (1.0 - uRoughness);
    col += uSunColor * caustic * uCaustics * 0.4;
    col = mix(col, uSunColor * 0.9, fres * uTransmission * 0.35);

    // Foam mask: use vFoam as the primary gate, modulated by fbm.
    float foamMask = vFoam;
    float foamNoise = fbm(vWorldPos.xy * uFoamNoiseScale + vec2(uTime * uFoamNoiseSpeed, 0.0));
    float foam = smoothstep(0.25, 0.85, foamMask * (0.55 + 0.8 * foamNoise));
    // Extra foam on sharp crests
    foam = max(foam, smoothstep(uFoamCrestThreshold, 1.0, vCrest) * (0.6 + 0.4 * foamNoise));
    col = mix(col, uFoamColor, clamp(foam, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
}

attribute vec2 aAgeLife;
attribute float aSize;

uniform float uPixelRatio;

varying float vAgeN;

void main() {
    float ageN = clamp(aAgeLife.x / max(aAgeLife.y, 0.0001), 0.0, 1.0);
    vAgeN = ageN;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aSize * (1.0 - 0.55 * ageN);
    gl_PointSize = size * 300.0 * uPixelRatio / max(-mv.z, 0.001);
}

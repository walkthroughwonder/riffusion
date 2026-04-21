precision highp float;

uniform vec3 uColor;
uniform float uBaseOpacity;

varying float vAgeN;

void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float disk = smoothstep(0.5, 0.15, d);
    float fade = smoothstep(0.0, 0.08, vAgeN) * (1.0 - smoothstep(0.72, 1.0, vAgeN));
    gl_FragColor = vec4(uColor, uBaseOpacity * disk * fade);
}

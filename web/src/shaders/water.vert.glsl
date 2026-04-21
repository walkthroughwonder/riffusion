attribute float aFoam;
attribute float aCrestDot;
attribute float aXNorm;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vFoam;
varying float vCrest;
varying float vXNorm;

void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vFoam = aFoam;
    vCrest = aCrestDot;
    vXNorm = aXNorm;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}

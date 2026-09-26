/**
 * The 3D cat's material: toon shading in three soft bands, plus tabby
 * markings painted in the shader. Upward-facing fur (back, crown, tail top)
 * turns warm grey in irregular patches; the belly and chest stay cream.
 * Works with skinning because it reads the skinned normal and position.
 */
export function makeCatMaterial(THREE, palette, meshSize = 1) {
  const bands = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 240, 240, 240, 255, 255, 255, 255, 255]), 4, 1);
  bands.magFilter = bands.minFilter = THREE.NearestFilter;
  bands.needsUpdate = true;
  const material = new THREE.MeshToonMaterial({ map: palette, gradientMap: bands, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    // Markings are placed in the mesh's own coordinates, normalised to its size, so they stay put on the fur as it moves.
    shader.uniforms.uFurScale = { value: 1 / meshSize };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uFurScale;\nvarying vec3 vFurNormal;\nvarying vec3 vFurPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFurNormal = normalize(mat3(modelMatrix) * objectNormal);\nvFurPos = transformed * uFurScale;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vFurNormal;
varying vec3 vFurPos;
float furHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float furNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(furHash(i), furHash(i + vec3(1,0,0)), f.x), mix(furHash(i + vec3(0,1,0)), furHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(furHash(i + vec3(0,0,1)), furHash(i + vec3(1,0,1)), f.x), mix(furHash(i + vec3(0,1,1)), furHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float up = smoothstep(-0.05, 0.6, vFurNormal.y);
  float patches = smoothstep(0.32, 0.56, furNoise(vFurPos * 7.0) * 0.7 + furNoise(vFurPos * 22.0) * 0.3);
  float grey = up * patches;
  float cream = step(0.6, diffuseColor.r) * step(0.6, diffuseColor.g); // only tint the fur, not eyes, nose or mouth
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15, 0.14, 0.13), grey * cream * 0.9);
}`);
  };
  return material;
}

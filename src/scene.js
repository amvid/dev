import * as THREE from "three";

import starVert from "./shaders/star.vert.glsl?raw";
import starFrag from "./shaders/star.frag.glsl?raw";
import nebulaVert from "./shaders/nebula.vert.glsl?raw";
import nebulaFrag from "./shaders/nebula.frag.glsl?raw";

const SKY_RADIUS = 500;
const STAR_COUNT = 6000;
const SEED = 0x5eed;

/** Small deterministic PRNG, so the sky is the same one every visit. */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStars() {
  const random = mulberry32(SEED);
  const positions = new Float32Array(STAR_COUNT * 3);
  const bright = new Float32Array(STAR_COUNT);
  const hue = new Float32Array(STAR_COUNT);
  const tint = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform on the sphere. Sampling z flat avoids the clustering you get at the
    // poles from picking two angles independently.
    const z = 1 - 2 * random();
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const theta = 2 * Math.PI * random();

    positions[i * 3] = r * Math.cos(theta) * SKY_RADIUS;
    positions[i * 3 + 1] = z * SKY_RADIUS;
    positions[i * 3 + 2] = r * Math.sin(theta) * SKY_RADIUS;

    // Cubed, so most stars are faint and only a handful are big and bright.
    bright[i] = Math.pow(random(), 3);
    hue[i] = random();
    // Plenty stay near white, but a good share take a strong colour cast.
    tint[i] = Math.pow(random(), 1.3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
  geometry.setAttribute("aHue", new THREE.BufferAttribute(hue, 1));
  geometry.setAttribute("aTint", new THREE.BufferAttribute(tint, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: starVert,
    fragmentShader: starFrag,
    uniforms: {
      uTime: { value: 0 },
      uSizeScale: { value: 1 },
      uReveal: { value: 0 },
      uMinSize: { value: 1.0 },
      uMaxSize: { value: 5.5 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // camera sits inside the sphere, so it is always visible
  points.renderOrder = 1;
  return points;
}

function buildNebula() {
  const material = new THREE.ShaderMaterial({
    vertexShader: nebulaVert,
    fragmentShader: nebulaFrag,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    },
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS * 1.6, 48, 32), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  return mesh;
}

export function buildScene() {
  return { stars: buildStars(), nebula: buildNebula() };
}

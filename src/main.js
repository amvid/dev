import * as THREE from "three";
import { LookControls } from "./controls.js";
import { buildScene } from "./scene.js";

const FOV_REF = 60;

/**
 * The whole scene is rendered at 1/RENDER_SCALE and stretched back up by the
 * canvas with `image-rendering: pixelated`, which is where the pixel look comes
 * from. Raise it for chunkier pixels, drop it to 1 for a smooth render.
 */
const RENDER_SCALE = 3;

const canvas = document.querySelector("#sky");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // pointless when the output is deliberately pixelated
    powerPreference: "high-performance",
  });
} catch {
  document.body.classList.add("unsupported");
  throw new Error("WebGL unavailable");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03020a);

const camera = new THREE.PerspectiveCamera(FOV_REF, innerWidth / innerHeight, 0.1, 2000);
const controls = new LookControls(camera, canvas);

const { stars, nebula } = buildScene();
scene.add(nebula, stars);
document.body.classList.add("ready");

const starUniforms = stars.material.uniforms;
let renderHeight = 1;

function resize() {
  const width = Math.max(1, Math.floor(innerWidth / RENDER_SCALE));
  renderHeight = Math.max(1, Math.floor(innerHeight / RENDER_SCALE));

  // `false` leaves the CSS size alone, so the canvas keeps filling the viewport
  // while the drawing buffer stays small.
  renderer.setPixelRatio(1);
  renderer.setSize(width, renderHeight, false);

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
resize();
addEventListener("resize", resize);

const REVEAL_STARS = 3.5;
const REVEAL_NEBULA = 7.0;

let elapsed = 0;
let last = performance.now();

function frame(now) {
  // Clamp dt so returning to a backgrounded tab does not fast-forward the reveal.
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  elapsed += dt;

  controls.update(dt);

  starUniforms.uTime.value = elapsed;
  starUniforms.uSizeScale.value = (renderHeight / 340) *
    (Math.tan(THREE.MathUtils.degToRad(FOV_REF) / 2) /
      Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  starUniforms.uReveal.value = Math.min(1, elapsed / REVEAL_STARS);

  nebula.material.uniforms.uTime.value = elapsed;
  nebula.material.uniforms.uIntensity.value = Math.min(1, elapsed / REVEAL_NEBULA);

  renderer.render(scene, camera);
}

// Only run the loop while the tab is actually visible.
let handle = 0;
function loop(now) {
  handle = requestAnimationFrame(loop);
  frame(now);
}
function start() {
  if (handle) return;
  last = performance.now();
  handle = requestAnimationFrame(loop);
}
function stop() {
  cancelAnimationFrame(handle);
  handle = 0;
}
document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
start();

uniform float uTime;
uniform float uIntensity;

varying vec3 vDir;

/**
 * An explicit colour ramp rather than a cosine palette. Cosine palettes are compact
 * but their midpoints go grey, which is exactly where most of the cloud sits — this
 * keeps every stop saturated and loops cleanly at t = 1.
 */
vec3 ramp(float t) {
  t = fract(t);
  vec3 c = mix(vec3(0.09, 0.13, 0.44), vec3(0.40, 0.15, 0.66), smoothstep(0.00, 0.24, t));
  c = mix(c, vec3(0.83, 0.20, 0.56), smoothstep(0.24, 0.46, t));
  c = mix(c, vec3(0.97, 0.52, 0.28), smoothstep(0.46, 0.66, t));
  c = mix(c, vec3(0.20, 0.72, 0.94), smoothstep(0.66, 0.86, t));
  c = mix(c, vec3(0.09, 0.13, 0.44), smoothstep(0.86, 1.00, t));
  return c;
}

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

// Three octaves is enough once the field is domain-warped, and this runs on every
// pixel — keep it cheap.
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float t = uTime * 0.015;

  // Domain warp: displace the sample point by another noise field. This is what
  // turns plain fbm blobs into curling filament structure.
  vec3 q = vec3(fbm(d * 2.0 + t), fbm(d * 2.0 + 4.3), fbm(d * 2.0 + 8.7));
  float f = fbm(d * 3.2 + 3.0 * q);

  // Soft falloff, so the clouds fade out instead of ending on a hard edge, and
  // there is real empty sky between them.
  float density = pow(smoothstep(0.24, 0.94, f), 1.7);

  // Hue is driven by the warp field and by direction, so separate regions of the
  // sky settle into different colours rather than one flat tint.
  float hue = f * 0.9 + q.y * 0.55 + d.y * 0.25 + t * 0.4;

  vec3 col = ramp(hue) * density;
  col += ramp(hue + 0.12) * pow(density, 3.5) * 0.7; // hotter cores
  col *= 0.80 + 0.40 * fbm(d * 9.0); // fine mottling so large areas are not flat

  gl_FragColor = vec4(col * uIntensity, 1.0);
  #include <colorspace_fragment>
}

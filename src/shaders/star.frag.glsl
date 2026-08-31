varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  if (d > 1.0) discard;

  // Tight core plus a wide halo, so it reads as a point source rather than a disc.
  float core = exp(-d * d * 9.0);
  float halo = exp(-d * d * 2.2) * 0.30;

  gl_FragColor = vec4(vColor, (core + halo) * vAlpha);
  #include <colorspace_fragment>
}

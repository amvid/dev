uniform float uTime;
uniform float uSizeScale;
uniform float uMinSize;
uniform float uMaxSize;
uniform float uReveal;

attribute float aBright; // 0 = faintest, 1 = brightest
attribute float aHue;
attribute float aTint; // 0 = white, 1 = fully saturated

varying vec3 vColor;
varying float vAlpha;

vec3 palette(float t) {
  return vec3(0.55) + vec3(0.45) * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  // Faint stars shimmer noticeably more than bright ones.
  float phase = dot(position, vec3(12.9898, 78.233, 37.719));
  float twinkle = 1.0 + (1.0 - aBright) * 0.35 * sin(uTime * 2.1 + phase);

  // Sizes are in render-target pixels, which the canvas then upscales — so one
  // unit here is one visible pixel block.
  gl_PointSize = max(1.0, mix(uMinSize, uMaxSize, pow(aBright, 2.0)) * uSizeScale * twinkle);

  vColor = mix(vec3(1.0), palette(aHue), aTint);

  // Brightest stars arrive first as the sky fades up.
  float order = smoothstep(0.0, 0.55, uReveal + aBright * 0.45 - 0.45);
  vAlpha = mix(0.30, 1.0, pow(aBright, 1.1)) * order;
}

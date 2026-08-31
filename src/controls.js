const DAMPING = 6.5; // higher = the throw settles sooner
const DRAG_SPEED = 0.0022; // radians per pixel at the reference field of view
const PITCH_LIMIT = Math.PI / 2 - 0.04;
const IDLE_DELAY = 2.5; // seconds of stillness before the sky drifts again
const DRIFT_SPEED = 0.012; // radians per second
const FOV_MIN = 22;
const FOV_MAX = 78;
const FOV_REF = 60;

/**
 * Look-around controls for a camera sitting at the centre of the sky sphere.
 *
 * OrbitControls is the wrong shape here — it orbits a target, and from the origin
 * that fights you. This is a direct yaw/pitch drag with inertia instead.
 */
export class LookControls {
  #camera;
  #element;
  #pointers = new Map();
  #pinchDistance = 0;
  #idle = IDLE_DELAY;
  #reducedMotion;

  yaw = 0;
  pitch = 0.25;
  velocityYaw = 0;
  velocityPitch = 0;

  constructor(camera, element) {
    this.#camera = camera;
    this.#element = element;
    this.#camera.rotation.order = "YXZ";
    this.#reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
      false;

    element.addEventListener("pointerdown", this.#onDown);
    element.addEventListener("pointermove", this.#onMove);
    element.addEventListener("pointerup", this.#onUp);
    element.addEventListener("pointercancel", this.#onUp);
    element.addEventListener("wheel", this.#onWheel, { passive: false });
  }

  #onDown = (event) => {
    this.#element.setPointerCapture(event.pointerId);
    this.#pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.#idle = 0;
    this.velocityYaw = 0;
    this.velocityPitch = 0;
    if (this.#pointers.size === 2) this.#pinchDistance = this.#spread();
  };

  #onMove = (event) => {
    const previous = this.#pointers.get(event.pointerId);
    if (!previous) return;
    this.#pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.#idle = 0;

    if (this.#pointers.size >= 2) {
      const spread = this.#spread();
      if (this.#pinchDistance > 0 && spread > 0) {
        this.#setFov(this.#camera.fov * (this.#pinchDistance / spread));
      }
      this.#pinchDistance = spread;
      return;
    }

    // Drag-to-grab: the sky follows the finger, so the camera turns the other way.
    const scale = DRAG_SPEED * (this.#camera.fov / FOV_REF);
    const deltaYaw = (event.clientX - previous.x) * scale;
    const deltaPitch = (event.clientY - previous.y) * scale;

    this.yaw += deltaYaw;
    this.pitch += deltaPitch;
    // Carry the drag into the throw so releasing mid-swipe keeps the motion going.
    this.velocityYaw = deltaYaw * 60;
    this.velocityPitch = deltaPitch * 60;
  };

  #onUp = (event) => {
    this.#pointers.delete(event.pointerId);
    if (this.#pointers.size < 2) this.#pinchDistance = 0;
  };

  #onWheel = (event) => {
    event.preventDefault();
    this.#idle = 0;
    this.#setFov(this.#camera.fov + event.deltaY * 0.05);
  };

  #spread() {
    const [a, b] = [...this.#pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  #setFov(fov) {
    this.#camera.fov = Math.min(FOV_MAX, Math.max(FOV_MIN, fov));
    this.#camera.updateProjectionMatrix();
  }

  update(dt) {
    if (this.#pointers.size === 0) {
      this.yaw += this.velocityYaw * dt;
      this.pitch += this.velocityPitch * dt;

      const decay = Math.exp(-DAMPING * dt);
      this.velocityYaw *= decay;
      this.velocityPitch *= decay;

      // Once the throw has died down, ease back into a slow automatic drift so the
      // sky is never completely still.
      this.#idle += dt;
      if (!this.#reducedMotion && this.#idle > IDLE_DELAY) {
        const ease = Math.min(1, (this.#idle - IDLE_DELAY) / 3);
        this.yaw += DRIFT_SPEED * ease * dt;
      }
    }

    this.pitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, this.pitch));
    this.#camera.rotation.y = this.yaw;
    this.#camera.rotation.x = this.pitch;
  }
}

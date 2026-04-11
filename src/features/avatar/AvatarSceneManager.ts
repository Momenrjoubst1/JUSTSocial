/**
 * AvatarSceneManager — owns the Three.js scene, camera, renderer,
 * and VRM avatar.  Provides imperative methods to:
 *   • loadModel(url)   – swap avatars
 *   • updateBlendshapes / updateHeadRotation – drive expressions & head
 *   • recalibrate()    – reset "forward" reference
 *   • update(dt)       – tick VRM + render
 *   • dispose()        – clean up GPU resources
 */

import * as THREE from "three";
// three@0.183 ships GLTFLoader under examples/jsm but types resolve
// through the "three/addons/*" export-map that tsconfig "bundler" picks up.
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRM, VRMUtils } from "@pixiv/three-vrm";

/* ── MediaPipe → VRM expression mapping ──────────────── */
const MP_TO_VRM: Record<string, string> = {
  eyeBlinkLeft: "blinkLeft",
  eyeBlinkRight: "blinkRight",
  jawOpen: "aa",
  mouthFunnel: "oh",
  mouthPucker: "ou",
  mouthSmileLeft: "happy",
  mouthSmileRight: "happy",
  mouthFrownLeft: "angry",
  mouthFrownRight: "angry",
  browInnerUp: "surprised",
  browDownLeft: "angry",
  browDownRight: "angry",
};

export class AvatarSceneManager {
  /* public so AvatarScene can call captureStream on the canvas */
  public readonly renderer: THREE.WebGLRenderer;
  public vrm: VRM | null = null;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isLoading = false;

  /* head-rotation smoothing */
  private currentRot = new THREE.Euler();
  private calibrationOffset = new THREE.Euler();

  constructor(canvas: HTMLCanvasElement) {
    /* Scene  */
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent

    /* Camera — framing head/shoulders */
    this.camera = new THREE.PerspectiveCamera(
      30,
      canvas.width / canvas.height,
      0.1,
      20,
    );
    this.camera.position.set(0, 1.4, 1.2);

    /* Renderer */
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /* Lights */
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(1, 1, 1).normalize();
    this.scene.add(dir, new THREE.AmbientLight(0xffffff, 0.5));
  }

  /* ── Model loading ──────────────────────────────────── */
  async loadModel(url = "/models/default_avatar.vrm") {
    if (this.isLoading) return;
    this.isLoading = true;

    const loader = new GLTFLoader();
    loader.register((parser: unknown) => new VRMLoaderPlugin(parser as never));

    try {
      const gltf = await loader.loadAsync(url);
      const vrm: VRM = gltf.userData.vrm;

      // tear down previous
      if (this.vrm) {
        this.scene.remove(this.vrm.scene);
      }

      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.removeUnnecessaryJoints(gltf.scene);

      vrm.scene.rotation.y = Math.PI; // face camera
      this.scene.add(vrm.scene);
      this.vrm = vrm;

      // reset calibration for new model
      this.calibrationOffset.set(0, 0, 0);
    } catch (err) {
      console.error("[Avatar] Failed to load VRM:", err);
    } finally {
      this.isLoading = false;
    }
  }

  /* ── Blendshape mapping ─────────────────────────────── */
  updateBlendshapes(shapes: { categoryName: string; score: number }[]) {
    const mgr = this.vrm?.expressionManager;
    if (!mgr) return;

    // reset all tracked expressions
    for (const name of Object.values(MP_TO_VRM)) {
      mgr.setValue(name, 0);
    }

    for (const s of shapes) {
      const vrmName = MP_TO_VRM[s.categoryName];
      if (!vrmName || s.score < 0.08) continue;
      // accumulate (smile left+right both map to "happy")
      const cur = mgr.getValue(vrmName) ?? 0;
      mgr.setValue(vrmName, Math.min(1, cur + s.score));
    }
  }

  /* ── Head rotation ──────────────────────────────────── */
  updateHeadRotation(matrixData: number[]) {
    const humanoid = this.vrm?.humanoid;
    if (!humanoid) return;

    const m4 = new THREE.Matrix4().fromArray(matrixData);
    this.currentRot.setFromRotationMatrix(m4);

    const rx = -(this.currentRot.x - this.calibrationOffset.x);
    const ry = -(this.currentRot.y - this.calibrationOffset.y);
    const rz = this.currentRot.z - this.calibrationOffset.z;

    const head = humanoid.getNormalizedBoneNode("head");
    if (head) head.rotation.set(rx, ry, rz);

    const neck = humanoid.getNormalizedBoneNode("neck");
    if (neck) neck.rotation.set(rx * 0.3, ry * 0.3, rz * 0.3);
  }

  /* ── Calibration ────────────────────────────────────── */
  recalibrate() {
    this.calibrationOffset.copy(this.currentRot);
  }

  /* ── Tick ────────────────────────────────────────────── */
  update(dt: number) {
    this.vrm?.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /* ── Cleanup ─────────────────────────────────────────── */
  dispose() {
    if (this.vrm) {
      this.scene.remove(this.vrm.scene);
      this.vrm = null;
    }
    this.renderer.dispose();
  }
}

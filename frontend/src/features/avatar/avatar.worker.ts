/**
 * Avatar Worker — runs MediaPipe FaceLandmarker in a dedicated thread
 * to avoid blocking the main UI.
 *
 * Communication protocol:
 *   Main → Worker:  { type: "INIT" }
 *   Worker → Main:  { type: "LOADED" } | { type: "ERROR", error: string }
 *   Main → Worker:  { type: "PROCESS_FRAME", videoFrame: ImageBitmap, timestamp: number }
 *   Worker → Main:  { type: "RESULTS", blendshapes: [...] | null, matrix: number[] | null }
 */

import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let isInitializing = false;

self.onmessage = async (event: MessageEvent) => {
  const { type } = event.data;

  /* ── Initialise the model ──────────────────────────── */
  if (type === "INIT") {
    if (isInitializing || faceLandmarker) return;
    isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );

      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          // GPU delegate is NOT supported inside Web Workers — use CPU
          delegate: "CPU",
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });

      self.postMessage({ type: "LOADED" });
    } catch (err) {
      self.postMessage({ type: "ERROR", error: String(err) });
    } finally {
      isInitializing = false;
    }
  }

  /* ── Process a single video frame ──────────────────── */
  if (type === "PROCESS_FRAME" && faceLandmarker) {
    const { videoFrame, timestamp } = event.data as {
      videoFrame: ImageBitmap;
      timestamp: number;
    };

    if (!videoFrame) return;

    try {
      const results = faceLandmarker.detectForVideo(videoFrame, timestamp);

      let blendshapes: { categoryName: string; score: number }[] | null = null;
      let matrix: number[] | null = null;

      if (results.faceBlendshapes?.[0]) {
        blendshapes = results.faceBlendshapes[0].categories;
      }
      if (results.facialTransformationMatrixes?.[0]) {
        matrix = Array.from(results.facialTransformationMatrixes[0].data);
      }

      self.postMessage({ type: "RESULTS", blendshapes, matrix });
    } catch (_err) {
      // silently skip frame errors
    } finally {
      videoFrame.close();
    }
  }
};

import * as tf from "@tensorflow/tfjs";
import { renderBoxes } from "./renderBox";

/**
 * Preprocess image/frame before forwarding into YOLO model
 */
const preprocess = (source, modelWidth, modelHeight) => {
  let xRatio, yRatio;

  const input = tf.tidy(() => {
    const img = tf.browser.fromPixels(source);
    const [h, w] = img.shape.slice(0, 2);
    const maxSize = Math.max(w, h);

    const imgPadded = img.pad([
      [0, maxSize - h], // bottom
      [0, maxSize - w], // right
      [0, 0],
    ]);

    xRatio = maxSize / w;
    yRatio = maxSize / h;

    return tf.image
      .resizeBilinear(imgPadded, [modelWidth, modelHeight])
      .div(255.0)
      .expandDims(0);
  });

  return [input, xRatio, yRatio];
};

/**
 * Detect image (static)
 */
export const detectImage = async (imgSource, model, classThreshold, canvasRef) => {
  const [modelWidth, modelHeight] = model.inputShape.slice(1, 3);

  tf.engine().startScope();
  const [input, xRatio, yRatio] = preprocess(imgSource, modelWidth, modelHeight);

  const res = await model.yolov5.executeAsync(input);
  const [boxes, scores, classes] = res.slice(0, 3);

  renderBoxes(
    canvasRef,
    classThreshold,
    boxes.dataSync(),
    scores.dataSync(),
    classes.dataSync(),
    [xRatio, yRatio]
  );

  tf.dispose(res);
  tf.engine().endScope();
};

/**
 * Detect video (real-time)
 */
export const detectVideo = (
  vidSource,
  model,
  classThreshold,
  canvasRef,
  heatmapInstance,
  onWarning,
  onClear
) => {
  const [modelWidth, modelHeight] = model.inputShape.slice(1, 3);
  const ctx = canvasRef.getContext("2d");

  const detectFrame = async () => {
    if (!vidSource || vidSource.videoWidth === 0) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      requestAnimationFrame(detectFrame);
      return;
    }

    tf.engine().startScope();

    try {
      const [input, xRatio, yRatio] = preprocess(vidSource, modelWidth, modelHeight);
      const res = await model.yolov5.executeAsync(input);
      const [boxes, scores, classes] = res.slice(0, 3);

      renderBoxes(
        canvasRef,
        classThreshold,
        boxes.dataSync(),
        scores.dataSync(),
        classes.dataSync(),
        [xRatio, yRatio]
      );

      // Check number of persons
      // --- Filter detection classes of interest ---
const classesArr = Array.from(classes.dataSync());
const scoresArr = Array.from(scores.dataSync());

// Classes we want to detect
const allowedClasses = [
  0,   // person
  39,  // bottle
  56,  // chair
  62,  // tv
  63,  // laptop
  64,  // mouse
  65,  // remote
  66,  // keyboard
  67,  // cell phone
  74,  // clock
  73   // book
];

const detectedObjects = classesArr
  .map((cls, i) => ({ cls, score: scoresArr[i] }))
  .filter(obj => allowedClasses.includes(obj.cls) && obj.score > classThreshold);

const persons = detectedObjects.filter(obj => obj.cls === 0);
const phones = detectedObjects.filter(obj => obj.cls === 67);

// --- Custom warning logic ---
if (persons.length > 1) {
  if (onWarning) onWarning(`⚠️ Multiple persons detected: ${persons.length}`);
} else if (phones.length > 0) {
  if (onWarning) onWarning(`📱 Cell phone detected`);
} else {
  if (onClear) onClear();
}

// Optional debugging:
console.log(
  "Detected objects:",
  detectedObjects.map(o => `${o.cls}`).join(", ")
);

      tf.dispose(res);
    } catch (e) {
      console.error("YOLOv5 error:", e);
    }

    // --- BlazeFace ---
    try {
      const faces = await model.blazeFace.estimateFaces(vidSource, false);
      if (faces && faces.length > 0) {
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        faces.forEach((face) => {
          const [x1, y1] = face.topLeft;
          const [x2, y2] = face.bottomRight;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        });
      }
    } catch (e) {
      console.warn("BlazeFace error:", e);
    }

    // --- Face Landmarks ---
    try {
      const landmarks = await model.faceLandmarks.estimateFaces(vidSource);
      if (landmarks && landmarks.length > 0) {
        ctx.fillStyle = "red";
        landmarks.forEach((lm) => {
          lm.keypoints.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          });
        });
      }
    } catch (e) {
      console.warn("FaceLandmarks error:", e);
    }

    // --- Pose Detection ---
    try {
      const poses = await model.poseDetector.estimatePoses(vidSource);
      if (poses && poses.length > 0) {
        ctx.fillStyle = "yellow";
        poses.forEach((pose) => {
          pose.keypoints.forEach((kpt) => {
            if (kpt.score > 0.4) {
              ctx.beginPath();
              ctx.arc(kpt.x, kpt.y, 3, 0, 2 * Math.PI);
              ctx.fill();
            }
          });
        });
      }
    } catch (e) {
      console.warn("Pose detection error:", e);
    }

    // --- Heatmap ---
    try {
      if (heatmapInstance && model.blazeFace) {
        const faces = await model.blazeFace.estimateFaces(vidSource, false);
        faces.forEach((face) => {
          const [x1, y1] = face.topLeft;
          const [x2, y2] = face.bottomRight;
          heatmapInstance.addData({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, value: 1 });
        });
      }
    } catch (e) {
      console.warn("Heatmap error:", e);
    }

    requestAnimationFrame(detectFrame);
    tf.engine().endScope();
  };

  detectFrame();
};
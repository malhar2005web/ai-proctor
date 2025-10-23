import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as blazeface from "@tensorflow-models/blazeface";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as posedetection from "@tensorflow-models/pose-detection";
import h337 from "heatmap.js";
import Loader from "./components/loader";
import { detectVideo } from "./utils/detect";
import "./style/App.css";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const App = () => {
  const navigate = useNavigate();

  const socket = useRef(null);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const heatmapRef = useRef(null);
  const heatmapInstance = useRef(null);

  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const [model, setModel] = useState({
    yolov5: null,
    blazeFace: null,
    faceLandmarks: null,
    poseDetector: null,
    inputShape: [1, 0, 0, 3],
  });
  const [warning, setWarning] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const [testEnded, setTestEnded] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const warningActiveRef = useRef(false);

  const modelName = "yolov5n";
  const classThreshold = 0.2;

  const role = localStorage.getItem("role"); // "candidate" or "interviewer"
  const token = localStorage.getItem("sessionToken");

  // socket.io connection setup
  useEffect(() => {
    socket.current = io("http://localhost:5173/yolo-tfjs/", {
      query: { token, role },
    });

    socket.current.on("token-mismatch", () => {
      alert("Session token mismatch! Please rejoin session.");
      navigate("/");
    });

    // interviewer will receive candidate stream
    if (role === "interviewer") {
      socket.current.on("candidate-frame", (imageData) => {
        if (cameraRef.current) {
          cameraRef.current.src = imageData;
        }
      });
    }

    return () => {
      socket.current.disconnect();
    };
  }, [navigate, role, token]);

  // model loading only for candidate
  useEffect(() => {
    const loadModel = async () => {
      if (role !== "candidate") {
        setLoading({ loading: false, progress: 1 });
        return;
      }

      await tf.ready();

      const basePath = `${window.location.origin}/yolov5-tfjs`;
      const yolov5 = await tf.loadGraphModel(
        `${basePath}/${modelName}_web_model/model.json`,
        {
          onProgress: (fractions) => setLoading({ loading: true, progress: fractions }),
        }
      );

      const dummyInput = tf.ones(yolov5.inputs[0].shape);
      const warmupResult = await yolov5.executeAsync(dummyInput);
      tf.dispose([warmupResult, dummyInput]);

      const blazeFace = await blazeface.load();
      const faceLandmarks = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { runtime: "tfjs" }
      );

      const poseDetector = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );

      heatmapInstance.current = h337.create({
        container: heatmapRef.current,
        radius: 40,
        maxOpacity: 0.6,
        minOpacity: 0.2,
        blur: 0.85,
      });

      setLoading({ loading: false, progress: 1 });
      setModel({
        yolov5,
        blazeFace,
        faceLandmarks,
        poseDetector,
        inputShape: yolov5.inputs[0].shape,
      });

      if (cameraRef.current) {
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
          cameraRef.current.srcObject = stream;
        });
      }
    };

    loadModel();
  }, [role]);

  const startCooldown = () => {
    setCooldownActive(true);
    let counter = 20;
    setCountdown(counter);
    const interval = setInterval(() => {
      counter -= 1;
      setCountdown(counter);
      if (counter <= 0) {
        clearInterval(interval);
        setCooldownActive(false);
        warningActiveRef.current = false;
        setWarning(null);
      }
    }, 1000);
  };

  const handlePlay = () => {
    if (role !== "candidate") return; // interviewer does not run detection
    if (cameraRef.current && model.yolov5 && !testEnded) {
      detectVideo(
        cameraRef.current,
        model,
        classThreshold,
        canvasRef.current,
        heatmapInstance.current,
        (msg) => {
          if (!warningActiveRef.current) {
            setWarningCount((prev) => {
              const newCount = prev + 1;
              if (newCount >= 3) {
                setTestEnded(true);
                setTimeout(() => navigate("/"), 1500);
              }
              return newCount;
            });
            warningActiveRef.current = true;
            setWarning(msg);
            startCooldown();
          }
        },
        () => {}
      );

      // send video frames to interviewer
      const sendInterval = setInterval(() => {
        if (!cameraRef.current || testEnded) {
          clearInterval(sendInterval);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(cameraRef.current, 0, 0, 320, 240);
        const imageData = canvas.toDataURL("image/jpeg", 0.5);
        socket.current.emit("candidate-frame", { token, imageData });
      }, 200);
    }
  };

  return (
    <div className="App">
      {loading.loading && (
        <Loader>Loading model... {(loading.progress * 100).toFixed(2)}%</Loader>
      )}

      <div className="header">
        <h1>📷 Interview Proctoring App</h1>
        <p>
          {role === "candidate"
            ? "Candidate side (Detection Active)"
            : "Interviewer side (View Only)"}
        </p>
        <p>Session Token: <code>{token}</code></p>
      </div>

      <div className="content">
        <video
          autoPlay
          muted={role === "candidate"}
          ref={cameraRef}
          onPlay={handlePlay}
          style={{ width: "640px", height: "480px", border: "2px solid #ccc" }}
        />
        {role === "candidate" && (
          <>
            <canvas
              width={model.inputShape[1]}
              height={model.inputShape[2]}
              ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0 }}
            />
            <div
              ref={heatmapRef}
              style={{
                width: "640px",
                height: "480px",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            />
          </>
        )}
      </div>

      {testEnded ? (
        <div className="test-end">🚨 Test terminated due to multiple warnings!</div>
      ) : (
        warning && (
          <div className="warnings active">
            <div>{warning}</div>
            <div className="warning-counter">Count: {warningCount}</div>
          </div>
        )
      )}

      {cooldownActive && (
        <div className="cooldown-box active">Clears in: {countdown}s</div>
      )}
    </div>
  );
};

export default App;
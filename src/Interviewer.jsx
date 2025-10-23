import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import "./style/App.css";

const Interviewer = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const token = localStorage.getItem("sessionToken");

  useEffect(() => {
    const socket = io("http://localhost:5173", {
      query: { token, role: "interviewer" },
    });

    socket.on("token-mismatch", () => {
      alert("Session token mismatch! Please rejoin session.");
      navigate("/");
    });

    // Receive candidate frames
    socket.on("candidate-frame", ({ imageData }) => {
      if (videoRef.current) {
        videoRef.current.src = imageData;
      }
    });

    return () => socket.disconnect();
  }, [navigate, token]);

  return (
    <div className="App">
      <div className="header">
        <h1>👀 Interviewer Dashboard</h1>
        <p>Viewing candidate feed only</p>
        <p>Session Token: <code>{token}</code></p>
      </div>
      <div className="content">
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{ width: "640px", height: "480px", border: "2px solid #ccc" }}
        />
      </div>
    </div>
  );
};

export default Interviewer;
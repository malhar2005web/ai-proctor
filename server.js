import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // React app
    methods: ["GET", "POST"],
  },
});

const activeSessions = new Map(); // token => {candidateSocket, interviewerSocket}

io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  socket.on("join-session", ({ token, role }) => {
    if (!token) return;

    if (!activeSessions.has(token)) activeSessions.set(token, {});
    const session = activeSessions.get(token);

    if (role === "candidate") {
      session.candidateSocket = socket.id;
      console.log(`👨‍🎓 Candidate joined: ${token}`);
    } else if (role === "interviewer") {
      session.interviewerSocket = socket.id;
      console.log(`🧑‍💼 Interviewer joined: ${token}`);
    }

    activeSessions.set(token, session);
  });

  socket.on("send-warning", ({ token, message }) => {
    const session = activeSessions.get(token);
    if (session?.interviewerSocket) {
      io.to(session.interviewerSocket).emit("receive-warning", message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(5000, () => {
  console.log("✅ Server running on port 5000");
});

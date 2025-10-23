import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("🟢 User connected");

  // Join shared token room
  socket.on("join-room", (token) => {
    socket.join(token);
    socket.token = token;
    console.log(`User joined room: ${token}`);
  });

  // Candidate sends frames
  socket.on("frame", (data) => {
    if (socket.token) io.to(socket.token).emit("frame", data);
  });

  // Candidate sends warning messages
  socket.on("warning", (msg) => {
    if (socket.token) io.to(socket.token).emit("warning", msg);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected");
  });
});

server.listen(5173, () => console.log("✅ Server running on port 5173"));
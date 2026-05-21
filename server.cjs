// backend/server.cjs
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { ExpressPeerServer } = require("peer");
const cors = require("cors");

const app = express();

// Allow CORS from your Vercel frontend URL (replace after deployment)
app.use(cors({
  origin: process.env.FRONTEND_URL || "*", // Palitan mo later
  methods: ["GET", "POST"],
}));

app.use(express.json());
app.get("/", (req, res) => res.send("Obsidian server is running."));

const server = http.createServer(app);

// PeerJS server
const peerServer = ExpressPeerServer(server, { path: "/" });
app.use("/peerjs", peerServer);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  },
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on("register", ({ name, peerId }) => {
    if (waitingUser && waitingUser.socketId !== socket.id) {
      const partner = waitingUser;
      waitingUser = null;
      socket.emit("peer-found", { name: partner.name, peerId: partner.peerId });
      io.to(partner.socketId).emit("peer-found", { name, peerId });
    } else {
      waitingUser = { socketId: socket.id, name, peerId };
      socket.emit("waiting");
    }
  });

  socket.on("disconnect", () => {
    if (waitingUser?.socketId === socket.id) waitingUser = null;
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Obsidian server running on port ${PORT}`);
});
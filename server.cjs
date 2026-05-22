// backend/server.cjs
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { ExpressPeerServer } = require("peer");
const cors = require("cors");

const app = express();

// Enable CORS for all origins (for testing)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.use(express.json());
app.get("/", (req, res) => res.send("Obsidian server is running."));

const server = http.createServer(app);

// PeerJS server
const peerServer = ExpressPeerServer(server, { 
  path: "/",
  allow_discovery: true
});
app.use("/peerjs", peerServer);

// Socket.io with proper configuration
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log(`✅ Connected: ${socket.id}`);
  console.log(`📡 Transport: ${socket.conn.transport.name}`);

  socket.on("register", ({ name, peerId }) => {
    console.log(`📝 Register: ${name} (${peerId})`);
    
    if (waitingUser && waitingUser.socketId !== socket.id) {
      const partner = waitingUser;
      waitingUser = null;
      
      console.log(`🎉 MATCH: ${name} <-> ${partner.name}`);
      
      socket.emit("peer-found", { name: partner.name, peerId: partner.peerId });
      io.to(partner.socketId).emit("peer-found", { name, peerId });
    } else {
      waitingUser = { socketId: socket.id, name, peerId };
      socket.emit("waiting");
      console.log(`⏳ Waiting: ${name}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    if (waitingUser?.socketId === socket.id) {
      waitingUser = null;
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Socket.io ready`);
  console.log(`🔗 PeerJS ready at /peerjs`);
});
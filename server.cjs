// backend/server.cjs
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { ExpressPeerServer } = require("peer");
const cors = require("cors");

const app = express();

// Allow CORS - payagan ang lahat muna (for testing)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());
app.get("/", (req, res) => res.send("Obsidian server is running."));

const server = http.createServer(app);

// PeerJS server with correct config
const peerServer = ExpressPeerServer(server, { 
  path: "/",
  allow_discovery: true
});
app.use("/peerjs", peerServer);

// Socket.io with correct WebSocket config
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],  // Allow both
  allowEIO3: true
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on("register", ({ name, peerId }) => {
    console.log(`[Register] ${name} (${peerId}) - Socket: ${socket.id}`);
    
    if (waitingUser && waitingUser.socketId !== socket.id) {
      const partner = waitingUser;
      waitingUser = null;
      
      console.log(`[Match] ${name} <-> ${partner.name}`);
      
      socket.emit("peer-found", { name: partner.name, peerId: partner.peerId });
      io.to(partner.socketId).emit("peer-found", { name, peerId });
    } else {
      waitingUser = { socketId: socket.id, name, peerId };
      socket.emit("waiting");
      console.log(`[Waiting] ${name} is in queue`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Disconnect] ${socket.id}`);
    if (waitingUser?.socketId === socket.id) {
      console.log(`[Removed] ${waitingUser.name} from queue`);
      waitingUser = null;
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Obsidian server running on port ${PORT}`);
  console.log(`Socket.io ready`);
  console.log(`PeerJS ready at /peerjs`);
});
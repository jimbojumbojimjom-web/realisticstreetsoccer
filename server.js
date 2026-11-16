const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT) || 3000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const rooms = new Map();
const playerRoom = new Map();

function normalizeCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function publicLobby(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: [...room.players].map(([id, player]) => ({
      id,
      name: player.name
    }))
  };
}

function createGameServer(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: options.cors || { origin: true, methods: ["GET", "POST"] },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "street-soccer-3d", rooms: rooms.size });
  });
  app.use(express.static(path.join(__dirname, "public")));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

  function announce(room) {
    io.to(room.code).emit("lobby-updated", publicLobby(room));
  }

  function removePlayer(socket, notify = true) {
    const code = playerRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    playerRoom.delete(socket.id);
    socket.leave(code);
    if (!room) return;

    room.players.delete(socket.id);
    if (socket.id === room.hostId) {
      io.to(code).emit("lobby-closed", { reason: "The lobby host left. The room has closed." });
      for (const id of room.players.keys()) {
        playerRoom.delete(id);
        const peer = io.sockets.sockets.get(id);
        if (peer) peer.leave(code);
      }
      rooms.delete(code);
      return;
    }

    if (room.players.size === 0) rooms.delete(code);
    else if (notify) announce(room);
  }

  io.on("connection", (socket) => {
    socket.on("create-lobby", (payload = {}, ack = () => {}) => {
      removePlayer(socket, false);
      const code = generateCode();
      const room = {
        code,
        hostId: socket.id,
        players: new Map([[socket.id, { name: cleanName(payload.name), joinedAt: Date.now() }]])
      };
      rooms.set(code, room);
      playerRoom.set(socket.id, code);
      socket.join(code);
      ack({ ok: true, lobby: publicLobby(room) });
      announce(room);
    });

    socket.on("join-lobby", (payload = {}, ack = () => {}) => {
      const code = normalizeCode(payload.code);
      const room = rooms.get(code);
      if (!room) return ack({ ok: false, error: "Room not found. Check the code and try again." });
      if (room.players.has(socket.id)) return ack({ ok: true, lobby: publicLobby(room) });
      if (room.players.size >= 12) return ack({ ok: false, error: "This room is full." });

      removePlayer(socket, false);
      room.players.set(socket.id, { name: cleanName(payload.name), joinedAt: Date.now() });
      playerRoom.set(socket.id, code);
      socket.join(code);
      ack({ ok: true, lobby: publicLobby(room) });
      announce(room);
    });

    socket.on("leave-lobby", (ack = () => {}) => {
      removePlayer(socket);
      if (typeof ack === "function") ack({ ok: true });
    });

    // The game client uses this event channel for match state, player input,
    // lobby updates, penalty shootouts, and other synchronized game events.
    socket.on("game-event", (packet = {}) => {
      const code = playerRoom.get(socket.id);
      if (!code || !rooms.has(code)) return;
      if (!packet || typeof packet.event !== "string") return;
      if (packet.event.length > 40) return;
      socket.to(code).emit("game-event", {
        event: packet.event,
        data: packet.data,
        peer: socket.id
      });
    });

    socket.on("disconnect", () => removePlayer(socket));
  });

  return { app, server, io, rooms };
}

function cleanName(value) {
  return String(value || "Player").replace(/[<>]/g, "").trim().slice(0, 20) || "Player";
}

if (require.main === module) {
  const { server } = createGameServer();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Street Soccer 3D multiplayer server running on port ${PORT}`);
  });
}

module.exports = { createGameServer, normalizeCode, generateCode };

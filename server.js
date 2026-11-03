// server.js
//
// This is a "dumb relay". It moves messages between browsers in the same
// room, but it never decrypts anything and never logs IP addresses.
// All the actual encryption/decryption happens in the browser (client.js
// inside public/index.html), not here.

const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = process.env.PORT || 8081;
const wss = new WebSocket.Server({ port: PORT });

// rooms: Map<roomId, Set<websocket>>
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  return rooms.get(roomId);
}

function broadcast(roomId, msg, exclude) {
  const room = rooms.get(roomId);
  if (!room) return;
  const payload = JSON.stringify(msg);
  for (const client of room) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  // Deliberately NOT reading or storing ws._socket.remoteAddress anywhere.
  // If you add logging later, make sure you don't log that field.

  let currentRoom = null;
  const clientId = crypto.randomUUID(); // random per-connection, not tied to identity

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      return; // ignore anything that isn't valid JSON
    }

    if (msg.type === 'join') {
      currentRoom = String(msg.room || 'lobby').slice(0, 100); // basic sanity limit
      const room = getRoom(currentRoom);
      room.add(ws);
      ws.room = currentRoom;

      // Tell the new client its own random id
      ws.send(JSON.stringify({ type: 'welcome', clientId }));

      // Let everyone else know someone joined, so they can start the
      // key-exchange handshake with them
      broadcast(currentRoom, { type: 'peer-joined', clientId }, ws);
      return;
    }

    // Everything else (public keys, encrypted room-key deliveries,
    // encrypted chat messages) is opaque to the server. We just stamp
    // the sender's clientId on it and forward it to the room.
    if (currentRoom) {
      msg.clientId = clientId;
      broadcast(currentRoom, msg, ws);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      broadcast(currentRoom, { type: 'peer-left', clientId }, ws);
      if (rooms.get(currentRoom).size === 0) rooms.delete(currentRoom);
    }
  });
});

console.log(`Relay server running on port ${PORT}`);

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const guestColors = ['#7eb6ff', '#6fcf97', '#f5a97f', '#f6c445', '#e8a0bf', '#a3c4f3', '#b2d8b2', '#ffb3ba'];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, username: rawUsername }) => {
    const previousRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    previousRooms.forEach(room => socket.leave(room));
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Map(),
        hostId: null,
        currentVideo: { url: '', currentTime: 0, isPlaying: false },
        nextGuestNumber: 1
      });
    }
    
    const room = rooms.get(roomId);
    const isFirst = room.participants.size === 0;
    let finalUsername = rawUsername?.trim();
    let isHost = false;
    let guestNumber = null;
    
    if (isFirst) {
      isHost = true;
      if (!finalUsername) finalUsername = 'Host';
      room.hostId = socket.id;
    } else {
      isHost = false;
      if (!finalUsername) {
        guestNumber = room.nextGuestNumber++;
        finalUsername = `Guest ${guestNumber}`;
      }
    }
    
    let color = isHost ? '#ffd966' : guestColors[room.participants.size % guestColors.length];
    room.participants.set(socket.id, {
      username: finalUsername,
      color: color,
      isHost: isHost,
      guestNumber: guestNumber
    });
    
    socket.emit('room-joined', {
      isHost: isHost,
      username: finalUsername,
      color: color,
      participants: Array.from(room.participants.values()).map(p => ({ username: p.username, color: p.color, isHost: p.isHost })),
      videoState: room.currentVideo
    });
    
    const participantsList = Array.from(room.participants.values()).map(p => ({ username: p.username, color: p.color, isHost: p.isHost }));
    io.to(roomId).emit('participants-update', participantsList);
    console.log(`${finalUsername} joined room ${roomId} (host: ${isHost})`);
  });
  
  socket.on('host-play', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.currentVideo.isPlaying = true;
      socket.to(roomId).emit('sync-play');
    }
  });
  
  socket.on('host-pause', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.currentVideo.isPlaying = false;
      socket.to(roomId).emit('sync-pause');
    }
  });
  
  socket.on('host-seek', ({ roomId, time }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.currentVideo.currentTime = time;
      socket.to(roomId).emit('sync-seek', time);
    }
  });
  
  socket.on('host-change-video', ({ roomId, url, currentTime, isPlaying }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.currentVideo = { url, currentTime, isPlaying };
      socket.to(roomId).emit('sync-loadvideo', { url, currentTime, isPlaying });
    }
  });
  
  socket.on('chat-message', ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const user = room.participants.get(socket.id);
    if (!user) return;
    io.to(roomId).emit('chat-message', {
      username: user.username,
      color: user.color,
      text: text,
      isHost: user.isHost
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        if (room.hostId === socket.id && room.participants.size > 0) {
          const newHostId = Array.from(room.participants.keys())[0];
          room.hostId = newHostId;
          const newHost = room.participants.get(newHostId);
          newHost.isHost = true;
          newHost.color = '#ffd966';
          io.to(roomId).emit('host-changed', newHostId);
        }
        const participantsList = Array.from(room.participants.values()).map(p => ({ username: p.username, color: p.color, isHost: p.isHost }));
        io.to(roomId).emit('participants-update', participantsList);
        if (room.participants.size === 0) rooms.delete(roomId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
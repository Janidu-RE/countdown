import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Our single source of truth for the countdown state
let countdownState = {
  targetTime: Date.now() + 3600 * 1000,
  isRunning: false,
  isLunchBreak: false,
  lunchBreakText: "LUNCH BREAK - BACK SOON",
  timeLeftWhenPaused: 3600
};

io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);
  
  // Send current state to new connections immediately
  socket.emit('state_update', countdownState);
  
  // Listen for state changes from Admin clients
  socket.on('update_state', (newState) => {
    // Update the server's truth
    countdownState = { ...countdownState, ...newState };
    
    // Broadcast the new state to ALL clients (including the sender to confirm, or use broadcast)
    io.emit('state_update', countdownState);
  });
  
  socket.on('disconnect', () => {
    console.log(`[-] Client disconnected: ${socket.id}`);
  });
});

const PORT = 4005;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

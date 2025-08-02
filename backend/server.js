const dotenv = require('dotenv');
dotenv.config();
console.log('[DEBUG] LOCATIONIQ_API_KEY =', process.env.LOCATIONIQ_API_KEY);

const mongoose = require('mongoose');
const app = require('./app.js'); // Import the app from app.js
const http = require('http');
const { Server } = require('socket.io');
const handleMessage = require('./socketHandlers/messageHandler.js');
const { verifyToken } = require('./utils/jwtUtils');
const User = require('./models/User');
const { setIo } = require('./utils/getIo'); // <<-- import setter

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust this to your frontend URL in production
    methods: ['GET', 'POST'],
  },
});

// register it so other modules can safely retrieve it
setIo(io);

console.log("Running SERVER...");

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

io.on('connection', async (socket) => {
  console.log('New socket connected:', socket.id);

  // --- Authenticate and join per-user room ---
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.warn('Socket connected without token, disconnecting:', socket.id);
    socket.disconnect();
    return;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    console.warn('Invalid token on socket connection:', socket.id);
    socket.disconnect();
    return;
  }

  const userId = payload.userId;
  socket.join(userId.toString());
  console.log(`Socket ${socket.id} joined room for user ${userId}`);

  // --- Bootstrap unread notification count ---
  try {
    const user = await User.findById(userId).select('unreadNotificationCount').lean();
    const unreadCount = user?.unreadNotificationCount ?? 0;
    socket.emit('bootstrap-unread-count', { unreadCount });
  } catch (err) {
    console.warn('Failed to bootstrap unread count for socket', socket.id, err);
  }

  // Existing handlers
  handleMessage(io, socket);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

module.exports = io; // you can keep this for backward compatibility, but other modules should switch to getIo()


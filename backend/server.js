const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const app = require('./app.js'); // Import the app from app.js
const http = require('http');
const { Server } = require('socket.io');
const handleMessage = require('./socketHandlers/messageHandler.js');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust this to your frontend URL in production
    methods: ['GET', 'POST'],
  },
});
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

io.on('connection', (socket) => {
  console.log('New socket conected:', socket.id);
  handleMessage(io, socket);
});

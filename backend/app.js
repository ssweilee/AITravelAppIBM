const express = require('express');
const cors = require('cors');
const path = require('path');
const { authenticateToken } = require('./middleware/authMiddleware.js');
const authRoutes = require('./routes/authRoutes.js');
const postRoutes = require('./routes/postRoutes.js');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes.js');
const messageRoutes = require('./routes/messageRoutes.js');
const chatRoutes = require('./routes/chatRoutes.js');
const locationRouter = require('./routes/locationRoutes.js');
const userInteractionRoutes = require('./routes/userInteractionRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes');
const avatarUploadRouter = require('./routes/avatarUploadRoutes.js'); 
const itineraryRoutes = require('./routes/itineraryRoutes.js');

const app = express();

app.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.url}`);
  next();
});

// middleware setup
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Welcome to the UserManagementAPI');
});

app.use('/api', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/chats', authenticateToken, chatRoutes);
app.use('/api/location', locationRouter);
app.use('/api/interactions',authenticateToken,userInteractionRoutes);
app.use('/upload', uploadRoutes);
app.use('/api/users', avatarUploadRouter); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/itineraries', authenticateToken, itineraryRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});




module.exports = app;
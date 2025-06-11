const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const app = require('./app.js'); // Import the app from app.js

const PORT = process.env.PORT || 3001;

console.log("Running SERVER...");

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// backend/config.js
const path = require('path');


const BASE_DOMAIN = process.env.BASE_DOMAIN || 'https://95122c848958.ngrok-free.app'; //can be modified
const UPLOADS_PATH = path.join(__dirname, 'uploads');

module.exports = {
  BASE_DOMAIN,
  UPLOADS_PATH,
};
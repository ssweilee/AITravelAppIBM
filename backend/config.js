// backend/config.js
const path = require('path');


const BASE_DOMAIN = process.env.BASE_DOMAIN || 'https://955f7f6bb18b.ngrok-free.app'; //can be modified
const UPLOADS_PATH = path.join(__dirname, 'uploads');

module.exports = {
  BASE_DOMAIN,
  UPLOADS_PATH,
};
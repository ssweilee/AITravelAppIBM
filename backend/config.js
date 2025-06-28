// backend/config.js
const path = require('path');


const BASE_DOMAIN = process.env.BASE_DOMAIN || 'http://localhost:3001'; //can be modified
const UPLOADS_PATH = path.join(__dirname, 'uploads');

module.exports = {
  BASE_DOMAIN,
  UPLOADS_PATH,
};
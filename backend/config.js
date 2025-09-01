const path = require('path');


const BASE_DOMAIN = process.env.BASE_DOMAIN || 'https://3f0590be9d62.ngrok-free.app'; //can be modified
const UPLOADS_PATH = path.join(__dirname, 'uploads');

module.exports = {
  BASE_DOMAIN,
  UPLOADS_PATH,
};
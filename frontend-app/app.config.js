// frontend-app/app.config.js
const path = require('path');
const dotenv = require('dotenv');

const dotEnvPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: dotEnvPath });

console.log('[DEBUG] Loaded GEOAPIFY_API_KEY:', process.env.GEOAPIFY_API_KEY);

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      geoapifyApiKey: process.env.GEOAPIFY_API_KEY,
    },
  };
};

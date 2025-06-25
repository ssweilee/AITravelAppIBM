console.log('[DEBUG] API_KEY in location.js:', process.env.LOCATIONIQ_API_KEY);

const express = require('express');
const router = express.Router();

const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY; 
console.log('Loaded LOCATIONIQ_API_KEY:', LOCATIONIQ_API_KEY);


router.get('/autocomplete', async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 3) {
    return res.status(400).json({ message: 'Query too short' });
  }

  try {
    const url = `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&limit=5&dedupe=1&normalizecity=1&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ message: 'LocationIQ API error' });
    }
    const data = await response.json();

    const locations = data.map(item => ({
      display: `${item.display_place || item.name}, ${item.address.country}`,
      value: `${item.address.country}|${item.display_place || item.name}`
    }));

    res.json(locations);
  } catch (error) {
    console.error('Location autocomplete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

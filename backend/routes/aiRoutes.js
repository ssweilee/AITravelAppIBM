// backend/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
//const fetch = require('node-fetch');

// POST /api/ai/chat
// router.post('/chat', async (req, res) => {
//   const { messages } = req.body;
//   if (!messages || !Array.isArray(messages)) {
//     return res.status(400).json({ error: 'Invalid messages array' });
//   }
//   try {
//     const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//       },
//       body: JSON.stringify({
//         model: 'gpt-4o-mini',
//         messages
//       })
//     });
//     const data = await openaiRes.json();
//     if (!openaiRes.ok) {
//       console.error('OpenAI API error:', data);
//       return res.status(500).json({ error: 'OpenAI API error', details: data });
//     }
//     res.json(data);
//   } catch (err) {
//     console.error('AI request failed:', err);
//     res.status(500).json({ error: 'AI request failed', details: err.message });
//   }
// });

const axios = require('axios');

async function getWatsonxAccessToken(apiKey) {
  const response = await axios.post(
    'https://iam.cloud.ibm.com/identity/token',
    new URLSearchParams({
      'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
      'apikey': apiKey,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data.access_token;
}

// POST /api/ai/watsonx
router.post('/watsonx', async (req, res) => {
  try {
    const { prompt, model_id = "ibm/granite-3-2b-instruct", max_tokens = 1000 } = req.body;

    console.log("Prompt sent to watsonx:", prompt);

    const watsonxUrl = process.env.WATSONX_URL;
    const watsonxApiKey = process.env.WATSONX_API_KEY;
    const accessToken = await getWatsonxAccessToken(watsonxApiKey);

    const response = await axios.post(
      `${watsonxUrl}/ml/v1/text/generation?version=2024-05-01`,
      {
        model_id,
        input: prompt,
        parameters: {
          max_new_tokens: max_tokens,
        },
        project_id: "fb30e49d-f130-4bad-8f09-1704210ad3fd"
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Watsonx API error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get response from watsonx.ai', details: error?.response?.data || error.message });
  }
});

module.exports = router;

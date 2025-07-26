const express = require('express');
const cors = require('cors');
const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).send({ status: 'OK', message: 'FiNIX backend is alive 🚀' });
});

// Initialize VertexAI
const vertex_ai = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: process.env.GCP_REGION,
});

const model = vertex_ai.getGenerativeModel({
  model: 'gemini-2.5-pro',
  safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 3 }],
});

app.post('/api/chat', async (req, res) => {
  const userInput = req.body.message;

  try {
    const chat = model.startChat({ history: [] });

    const result = await chat.sendMessage(userInput);
    const response = result.response;

    console.log('🧠 Gemini Full Response:', JSON.stringify(response, null, 2));

    res.status(200).json({ reply: response.text || 'No response text received.' });
  } catch (error) {
    console.error('❌ Error calling Gemini:', error);
    res.status(500).json({ error: 'Gemini failed' });
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

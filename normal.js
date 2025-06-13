// WhatsApp Bot with Gemini AI Integration (Venom)

const venom = require('venom-bot');
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyDQJcS5wwBi65AdfW5zHT2ayu1ShWgWcJg'; // Replace with your Gemini API key

// In-memory user chat history
const chatHistory = new Map();

// Generate response from Gemini AI
async function generateAIResponse(userId) {
  const history = chatHistory.get(userId)?.slice(-10) || [];

  const prompt = [
    {
      role: 'user',
      parts: [{
        text: history.map(msg => `${msg.role === 'user' ? '👤' : '🤖'}: ${msg.content}`).join('\n')
      }]
    }
  ];

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: prompt,
        generationConfig: {
          temperature: 1,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1000
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 3 },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 3 }
        ]
      }
    );

    const reply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || "🤖 Sorry bhai, Gemini ka response nahi aaya 😓";
  } catch (err) {
    console.error("❌ Gemini API error:", err.response?.data || err.message);
    return "❌ Gemini API se error aaya bhai. Thoda der baad try karo.";
  }
}

// Send message function
function send(client, to, message) {
  return client.sendText(to, message);
}

// Main WhatsApp bot logic
venom
  .create({ session: 'gemini-bot-session' })
  .then(client => start(client))
  .catch(error => console.error('❌ Venom create error:', error));

function start(client) {
  console.log('✅ Gemini WhatsApp bot started...');

  client.onMessage(async message => {
    const userId = message.from;

    // Ignore group messages and non-texts
    if (message.isGroupMsg || !message.body) return;

    // Ignore commands (starting with '/')
    if (message.body.startsWith('/')) return;

    // Store chat history
    if (!chatHistory.has(userId)) chatHistory.set(userId, []);
    chatHistory.get(userId).push({ role: 'user', content: message.body });

    // Gemini reply
    const aiReply = await generateAIResponse(userId);

    // Store AI reply in history
    chatHistory.get(userId).push({ role: 'model', content: aiReply });

    // Send reply
    await send(client, userId, aiReply);
  });
}

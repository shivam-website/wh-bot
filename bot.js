// bot.js
const axios = require('axios');

// Store last 50 messages per user
const userMessages = {};

const OPENROUTER_API_KEY = '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'; // 🔒 Replace with your key

async function getAIReply(userId, messageBody) {
  // Initialize user chat history if not exists
  if (!userMessages[userId]) userMessages[userId] = [];

  // Add user's message to chat history
  userMessages[userId].push({ role: 'user', content: messageBody });

  // Keep only the last 50 messages
  if (userMessages[userId].length > 50) {
    userMessages[userId] = userMessages[userId].slice(-50);
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/ministral-8b',
        messages: userMessages[userId],
        max_tokens: 1500,
        temperature: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiMessage = response.data.choices?.[0]?.message?.content || null;

    if (aiMessage) {
      // Add assistant's reply to history
      userMessages[userId].push({ role: 'assistant', content: aiMessage });
    }

    return aiMessage;

  } catch (error) {
    console.error("❌ AI API error:", error?.response?.data || error.message);
    return "⚠️ AI service is currently unavailable.";
  }
}

function start(client) {
  client.onMessage(async (message) => {
    if (!message.isGroupMsg) {
      console.log("📩 Message received from", message.from, ":", message.body);

      const reply = await getAIReply(message.from, message.body);

      if (reply) {
        await client.sendText(message.from, reply);
      } else {
        await client.sendText(message.from, "❌ Failed to generate AI response.");
      }
    }
  });

  console.log("🤖 Bot is ready and using AI for responses.");
}

module.exports = { start };

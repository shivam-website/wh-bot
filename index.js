const venom = require('venom-bot');
const axios = require('axios');
const variants = ["🔥", "💎", "😄", "😉", "✅"];
const emoji = variants[Math.floor(Math.random() * variants.length)];
const userStates = new Map(); // To track where each user is in the flow
const adminNumber = '+977 9819809195'; // Replace with real admin number


// Store last 20 messages per user with timestamps
const chatHistory = new Map();

// Maximum duplicate message interval (in milliseconds)
const MESSAGE_COOLDOWN = 30000; // 30 seconds

// Diamond pack prices moved to top for global access
const diamondPrices = {
  100: 'Rs. 100',
  310: 'Rs. 290',
  520: 'Rs. 460',
  1060: 'Rs. 900'
};

venom
  .create({
    session: 'whatsapp-session',
    headless: false // Set to false to see the browser window
  })
  .then((client) => {
    console.log("Browser should now open");
    start(client);
  })
  .catch((error) => {
    console.log("Error creating client:", error);
  });

function start(client) {
  console.log("✅ Bot is listening for messages...");

  client.onMessage(async (message) => {
    const userId = message.from;

    if (!message.body) {
      console.log('Received message with no body:', message);
      return;
    }

    const userMsg = message.body.trim().toLowerCase();

    if (!message.isGroupMsg && message.type === 'chat') {
      console.log(`📥 ${userId}: ${message.body}`);

      const previousMessages = chatHistory.get(userId) || [];
      const lastUserMsg = previousMessages.slice().reverse().find(msg => msg.role === 'user');

      if (lastUserMsg && lastUserMsg.content === userMsg && (Date.now() - lastUserMsg.timestamp) < MESSAGE_COOLDOWN) {
        console.log('Duplicate message detected within cooldown, skipping.');
        return;
      }

      updateChatHistory(userId, { role: 'user', content: userMsg });

      // Predefined responses
      if (['hi', 'hello', 'hii', 'hlw'].includes(userMsg)) {
        const greeting = `Hey! 👋 Kaise ho? Main tumhara Free Fire Diamond Assistant hoon! Tumhe kis diamond pack ki zarurat hai? 💎`;
        client.sendText(userId, greeting);
        updateChatHistory(userId, { role: 'assistant', content: greeting });
        return;
      }

      if (['kaise ho', 'kya haal hai', 'how are you'].includes(userMsg)) {
        const reply = `Main badhiya hoon bhai! ☺️ Tum sunao, diamonds chahiye kya? 💎`;
        client.sendText(userId, reply);
        updateChatHistory(userId, { role: 'assistant', content: reply });
        return;
      }
      if (userMsg.includes('payment kar diya') && userMsg.includes('diamond nahi mila')) {
        const reply = `Bhai, payment mil gaya ho to chinta mat karo! 😇 Ho sakta hai thoda time lag raha ho update hone mein. Aap ne payment Esewa ya Bank Transfer se kiya? Agar possible ho to payment ka screenshot bhej do, jisse hum turant verify kar saken 🙏`;
        client.sendText(userId, reply);
        updateChatHistory(userId, { role: 'assistant', content: reply });
        return;
      }
      

      if (userMsg.includes('payment') && userMsg.includes('option')) {
        const payment = `Payment Esewa ya Bank Transfer se ho sakta hai bhai 😎 Jo convenient ho wo batao.`;
        client.sendText(userId, payment);
        updateChatHistory(userId, { role: 'assistant', content: payment });
        return;
      }
      if (userMsg.includes('payment done') || userMsg.includes('payment did') || userMsg.includes('payment hogya')) {
        const reply = `Bhai, payment ka screenshot bhejo 📸\nAur apna Free Fire UID aur in-game name bhi likho jaise:\n\nUID: 12345678\nName: ShivamYT`;
        client.sendText(userId, reply);
        userStates.set(userId, 'awaiting_payment_details');
        return;
      }
      if (userStates.get(userId) === 'awaiting_payment_details') {
        if (message.mimetype && message.type === 'image') {
          // Save screenshot temporarily
          const mediaData = await client.downloadMedia(message.id);
          client.sendText(userId, `Screenshot mil gaya bhai ✅ Ab apna UID aur in-game name bhejo.`);
      
          // Store screenshot in state
          userStates.set(userId, { step: 'awaiting_uid_name', screenshot: mediaData });
          return;
        }
      
        if (userStates.get(userId)?.step === 'awaiting_uid_name') {
          const screenshot = userStates.get(userId).screenshot;
          const text = message.body;
      
          if (text.toLowerCase().includes('uid') && text.toLowerCase().includes('name')) {
            const finalMsg = `💸 *New Payment Received!*\n\n👤 User: ${userId}\n📇 ${text}\n📎 Screenshot attached`;
      
            // Send to admin
            await client.sendText(adminNumber, finalMsg);
            if (screenshot) {
              await client.sendImage(adminNumber, screenshot, 'payment.jpg', 'Payment Screenshot');
            }
      
            client.sendText(userId, `Bhai details mil gaye ✅ Jaldi diamonds bhej diye jayenge 💎`);
            userStates.delete(userId);
            return;
          } else {
            client.sendText(userId, `Bhai please UID aur in-game name sahi format mein bhejna 😅 Example:\nUID: 12345678\nName: ShivamYT`);
            return;
          }
        }
      }
      

      if (userMsg.includes('esewa')) {
        const qrInfo = `Yeh raha Esewa QR code 📲\nPay Rs. 460 for 520 diamonds 💎\n[Insert your QR image link here] 🔲\n\nPayment ho jaye toh confirm kar dena.`;
        client.sendText(userId, qrInfo);
        updateChatHistory(userId, { role: 'assistant', content: qrInfo });
        return;
      }

      if (userMsg.includes('free') && userMsg.includes('diamond')) {
        const noFree = `Bhai free mein kuch nahi milta 😅 Diamonds lene ke liye paisa dena padta hai.`;
        client.sendText(userId, noFree);
        updateChatHistory(userId, { role: 'assistant', content: noFree });
        return;
      }

      if (['bye', 'goodbye', 'byee', 'ok bye'].includes(userMsg)) {
        const farewell = `Thik hai bhai 👋 Milte hai fir! Agar kabhi diamonds chahiye ho toh message kar dena 💎`;
        client.sendText(userId, farewell);
        updateChatHistory(userId, { role: 'assistant', content: farewell });
        return;
      }

      // Handle diamond-related requests
      const diamondReply = handleDiamondRequests(userMsg);
      if (diamondReply.found) {
        client.sendText(userId, diamondReply.message);
        updateChatHistory(userId, { role: 'assistant', content: diamondReply.message });
        return;
      }

      // Fallback to AI
      const aiReply = await generateAIResponse(userId);

      if (aiReply) {
        client.sendText(userId, aiReply);
        updateChatHistory(userId, { role: 'assistant', content: aiReply });
      } else {
        const fallback = `❌ Arre bhai, AI reply nahi aaya 😅 Agar diamond lena ho toh direct batao.`;
        client.sendText(userId, fallback);
      }
      
    }
  });
}

function updateChatHistory(userId, msg) {
  if (!chatHistory.has(userId)) chatHistory.set(userId, []);
  const history = chatHistory.get(userId);
  history.push({ ...msg, timestamp: Date.now() });
  if (history.length > 20) history.shift();
  chatHistory.set(userId, history);
}

function handleDiamondRequests(userMsg) {
  const matched = Object.keys(diamondPrices).find(count =>
    userMsg.includes(count + ' diamond') ||
    userMsg.includes(count + ' diamonds') ||
    userMsg === count
  );

  if (matched) {
    return {
      found: true,
      message: `Thik hai bhai 😎 ${matched} diamonds ke liye ${diamondPrices[matched]} lagenge 💎 Payment kese karoge? Esewa ya Bank Transfer? ☺️`
    };
  }

  if (userMsg.includes('diamond')) {
    const optionsList = Object.entries(diamondPrices)
      .map(([k, v]) => `${k} = ${v}`).join('\n');
    return {
      found: true,
      message: `Ye raha bhai diamond ka list 😎\n\n${optionsList}\n\nJo lena hai wo batao 💎`
    };
  }

  return { found: false };
}

async function generateAIResponse(userId) {
  const OPENROUTER_API_KEY = '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';
  const history = chatHistory.get(userId) || [];
  const messages = [
    {
      role: 'system',
      content: `
        Tu Shivam ka WhatsApp assistant hai jo Free Fire app ke users ki madad karta hai 😄
        App mein custom matches, tournaments aur diamond top-up hote hain.
    
        ⚙️ Guidelines:
        * Sirf Roman Hindi mein baat kar, casual aur friendly tone mein 😎
        * Har reply fresh aur natural hona chahiye — boring ya repeat reply avoid kar
        * Emojis ka use kar jaise ☺️ 🔥 💎 🤔
    
        💬 Default Responses:
        * Agar user free diamonds ki baat kare, reply karo "Bhai free mein kuch nahi milta 😅"
        * Agar user available diamond packs ke baare mein pooche, show karo options (100 = Rs. 100, 310 = Rs. 290, etc.)
        * Agar user payment options ke baare mein pooche, reply karo "Pay Rs. 460 for 520 diamonds 💎 via Esewa or Bank Transfer"
    
        * Agar user payment confirm kare: "Bhai aapka payment mil gaya ho to chinta mat karo 😇 Thoda sa time lag sakta hai system me update hone me. Aap ne Esewa ya Bank Transfer se payment kiya? Screenshot bhej do please ✅"
        * Agar user diamond nahi aaya: "Bhai chinta mat karo, agar payment ho gaya hai to diamonds zaroor milenge. Screenshot bhej do jisse hum turant verify kar saken 🙏"
      `
    },
    
    ...history
  ];

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/chatgpt-4o-latest", // Correct model name
        messages,
        max_tokens: 1500,
        temperature: 1 // Try setting this to 1 for more variability in responses
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    


    return response.data.choices?.[0]?.message?.content || null;

  } catch (error) {
    console.error("❌ AI API error:", error?.response?.data || error.message);
    return null;
  }
}

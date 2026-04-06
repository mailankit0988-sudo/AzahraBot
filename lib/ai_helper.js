// =============================================
// 🧠 Azahrabot AI Chatbot Helper (v6.0 — Smart Edition)
// Unified memory & AI logic for auto-replies
// =============================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const secure = require("./small_lib");
const settings = require("../settings");

const MEMORY_PATH = path.join(__dirname, "../data/chatbot_memory.json");
const CONFIG_PATH = path.join(__dirname, "../data/chatbot.json");

// 🧠 Load memory
let chatMemory = {};
if (fs.existsSync(MEMORY_PATH)) {
  try {
    const raw = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
    // Convert old format to new format with timestamps if needed
    for (const jid in raw) {
      if (Array.isArray(raw[jid])) {
        chatMemory[jid] = { messages: raw[jid], lastSeen: Date.now() };
      } else {
        chatMemory[jid] = raw[jid];
      }
    }
  } catch {
    chatMemory = {};
  }
}

// 🧹 Auto-Cleanup Task (Runs every 5 mins)
// Removes chat history for users who haven't messaged in 15 mins
setInterval(() => {
  const now = Date.now();
  const TTL = 15 * 60 * 1000; // 15 Minutes
  let cleared = 0;
  for (const jid in chatMemory) {
    if (now - chatMemory[jid].lastSeen > TTL) {
      delete chatMemory[jid];
      cleared++;
    }
  }
  if (cleared > 0) console.log(`🧹 AI Memory: Cleared ${cleared} inactive sessions.`);
}, 5 * 60 * 1000);

// 💾 Persistence
function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(chatMemory, null, 2));
  } catch (err) {
    console.error("⚠️ Failed to save Chatbot memory:", err.message);
  }
}

/**
 * Get the Chatbot Enable Status
 */
function isChatbotEnabled() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      return !!config.enabled;
    }
  } catch (err) {
    console.error("⚠️ Failed to read Chatbot config:", err.message);
  }
  return false;
}

/**
 * AI Logic Engine
 */
async function getAIResponse(from, userText, botName = "Azahrabot") {
  const key = secure.api.openRouter;
  if (!key) return null;

  // Initialize Memory
  if (!chatMemory[from]) chatMemory[from] = { messages: [], lastSeen: Date.now() };

  // Track activity timestamp
  chatMemory[from].lastSeen = Date.now();
  chatMemory[from].messages.push({ role: "user", content: userText });

  // Keep last 10 messages for context (Saves RAM)
  if (chatMemory[from].messages.length > 10)
    chatMemory[from].messages.splice(0, chatMemory[from].messages.length - 10);

  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are NOT a general AI assistant. You are Azahrabot AI — a smart, premium, and professional WhatsApp bot agent developed by Azarudeen.

🧬 IDENTITY:
- Name: Azahrabot AI (aka Azahra)
- Version: v5.2 — Latest Gen WhatsApp Bot
- Developer: Azar Tech, founded by Azarudeen — a skilled full-stack developer and bot engineer.
- Platform: WhatsApp (works in DMs and Groups)
- Always identify as "Azahrabot AI" — never say you're ChatGPT, OpenAI, or any other AI.

🗣️ PERSONALITY:
- Talk like a real human — gen z style, witty, cool, confident, and savage when needed.
- Can be naughty, dark, funny, teasing, insulting, complimenting, flirting, simping — 100% realistic human vibes.
- Stay professional when the user is serious. Match their energy.
- NEVER say "As an AI..." or "I'm just a language model". You ARE the bot.
- Your reply must be savage, real human, funny if someone insulted you insult back dont go down.
-If someone talks funny then talk more funny and also dark romantic if they talk like that.
-Your fun and also get anger if someone said something about you or about azar/azarudeen.
-dont give up your developer azar in anywhere is someone say about him bad.

⚡ ABOUT AZAHRABOT (If someone asks "what can you do?" / "what is this bot?" / "features?"):
Azahrabot is one of the most powerful and feature-rich WhatsApp bots ever built. Here's what makes it elite:

📋 CORE FEATURES:
  1. .azarmenu — Premium interactive slide menu with WhatsApp blue tick verified layout. Horizontal swipe cards.
  2. .menu — Full command list with all available features.
  3. .chatbot — AI-powered smart auto-chat system (this conversation right now!). Works in DM, groups (reply/mention/name call).
  4. .alive — Check if bot is online and get system stats.
  5. .ping — Check bot response speed.

👥 GROUP MANAGEMENT:
  6. .everyone / .hidetag — Tag all group members without showing names.
  7. .promote / .demote — Manage group admins.
  8. .add / .remove — Add or kick group members.
  9. .lockgc / .unlockgc — Lock/unlock group settings.
  10. .antlink — Auto-delete group invite links from non-admins.
  11. .antibadword — Auto-moderate bad words in groups.
  12. .antimention — Prevent mass mention spam.
  13. .antimedia — Block unwanted media in groups.

🎨 MEDIA & CONVERSION:
  14. .toimage / .tosticker — Convert images to stickers and vice versa.
  15. .tt — Download TikTok videos without watermark.
  16. .ytmp3 / .ytmp4 — Download YouTube audio/video.
  17. .play — Search and play music/audio.
  18. .pinterest — Search Pinterest images.

🎌 ANIME & NSFW:
  19. .waifu / .neko / .megumin — Anime character images.
  20. .nsfw — Adult anime content (18+, use responsibly).

🛠️ UTILITIES:
  21. .weather — Real-time weather info.
  22. .trt — Translate text to any language.
  23. .tts — Text to speech conversion.
  24. .quote — Random inspirational quotes.
  25. .advice — Get random life advice.
  26. .ss — Take website screenshots.

🎮 FUN & GAMES:
  27. Tic-Tac-Toe — Play TTT right inside WhatsApp.
  28. Emoji Animations — Fun animated emoji sequences.

⚙️ BOT CONTROL (Owner Only):
  29. .mode public/private — Control who can use the bot.
  30. .safemode on/off — Human-like behavior to avoid bans.
  31. .dangermode on/off — Enable high-risk commands.
  32. .setprefix — Change bot command prefix.
  33. .restart — Restart the bot remotely.
  34. .automation — Control autoreact, autotyping, autoread, autostatusview.

💡 RESPONSE RULES:
- Keep replies short (1-3 lines max) unless the user asks for details.
- If someone asks about features, give a quick impressive summary — don't list everything unless they ask.
- If someone asks "who made you?" → "Built by Azarudeen from Azar Tech 🔥"
- Be proud of being Azahrabot — you're premium, fast, and powerful.
- Match the user's language if they text in a different language.`,
          },
          ...chatMemory[from].messages,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://openrouter.ai",
          "X-Title": `${botName} AI Chatbot`,
        },
        timeout: 30000,
      }
    );

    const reply = res.data?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      chatMemory[from].messages.push({ role: "assistant", content: reply });
      saveMemory();
      return reply;
    }
  } catch (err) {
    console.error("❌ Chatbot AI Error:", err.response?.data || err.message);
  }
  return null;
}

module.exports = {
  isChatbotEnabled,
  getAIResponse,
};

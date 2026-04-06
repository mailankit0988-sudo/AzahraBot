const fs = require("fs");
const path = require("path");
const settings = require("../../settings");

const chatbotPath = path.join(process.cwd(), "data", "chatbot.json");

function getChatbot() {
  if (!fs.existsSync(chatbotPath)) {
    const defaultData = { enabled: false };
    fs.mkdirSync(path.dirname(chatbotPath), { recursive: true });
    fs.writeFileSync(chatbotPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(chatbotPath, "utf8"));
}

function saveChatbot(data) {
  fs.writeFileSync(chatbotPath, JSON.stringify(data, null, 2));
}

// OWNER CHECK
function isOwner(sock, msg, from) {
  if (msg.key.fromMe) return true;
  const sender = msg.key.participant || msg.key.remoteJid;
  const ownerNum = (settings.ownerNumber || "").replace(/[^0-9]/g, "");
  const senderNum = (sender || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
  return senderNum && ownerNum && senderNum === ownerNum;
}

module.exports = async function chatbotController(sock, msg, from, text, args) {
  if (!isOwner(sock, msg, from)) {
    return sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg });
  }

  const current = getChatbot();
  const arg = args[0]?.toLowerCase();

  if (!arg || !["on", "off"].includes(arg)) {
    const status = current.enabled ? "ON ✅" : "OFF ❌";
    return sock.sendMessage(from, {
      text: `🤖 *CHATBOT STATUS*: ${status}\n\nUsage:\n.chatbot on\n.chatbot off`
    }, { quoted: msg });
  }

  current.enabled = arg === "on";
  saveChatbot(current);

  return sock.sendMessage(from, {
    text: `✅ AI Chatbot has been turned *${arg.toUpperCase()}*`
  }, { quoted: msg });
};

const fs = require("fs");
const path = require("path");
const settings = require("../settings");

module.exports = async (sock, msg, from) => {
  try {
    const sender = msg.key.participant || msg.key.remoteJid;
    const ownerNumber = (settings.ownerNumber || "").replace(/[^0-9]/g, "");
    const senderNumber = (sender || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    const isOwner = msg.key.fromMe || (senderNumber && ownerNumber && senderNumber === ownerNumber);

    if (!isOwner) {
      return await sock.sendMessage(from, { text: "❌ This command is only for the owner!" }, { quoted: msg });
    }

    const sessionDir = path.join(process.cwd(), ".auth");

    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      for (const file of files) {
        if (file !== "creds.json") {
          fs.unlinkSync(path.join(sessionDir, file));
        }
      }
      await sock.sendMessage(from, { text: "✅ Cleanup complete! All session cache files removed except credentials." }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: "ℹ️ Session directory not found." }, { quoted: msg });
    }
  } catch (err) {
    console.error("❌ Error in clearsession:", err.message);
    await sock.sendMessage(from, { text: "⚠️ Failed to clear session cache." }, { quoted: msg });
  }
};

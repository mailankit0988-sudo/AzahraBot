// =============================================
// 📣 Azahrabot .azarudeen — Silent TagAll
// One clickable-look text • Admin-only • Silent Menions
// =============================================

const settings = require("../settings");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Must be in a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "⚠️ This command only works in groups." });
    }

    // 🧠 Fetch group metadata and participants
    const metadata = await sock.groupMetadata(from);
    const participants = metadata?.participants || [];
    const allIds = participants.map(p => p.id);

    // 👑 Owner & Admin Check
    const sender = msg.key.participant || msg.key.remoteJid || "";
    const ownerNumber = (settings.ownerNumber || "").replace(/[^0-9]/g, "");
    const isOwner = msg.key.fromMe || sender.includes(ownerNumber);
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender);

    if (!isAdmin && !isOwner) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can use .azarudeen."
      });
    }

    // 💬 Send the exact requested visible text, while secretly tagging everyone
    await sock.sendMessage(from, {
      text: `@azarudeen`,
      mentions: [...allIds]
    });

  } catch (err) {
    console.error("❌ .azarudeen error:", err);
    await sock.sendMessage(from, {
      text: "⚠️ Failed to tag members."
    });
  }
};

// lib/functions.js
const { getContentType, proto, jidDecode } = require("@whiskeysockets/baileys");
const fs = require("fs");
const Jimp = require("jimp");

// runtime utils kept as before
exports.runtime = (seconds) => {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, s && `${s}s`]
    .filter(Boolean)
    .join(" ");
};

exports.parseMention = (text = "") =>
  [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + "@s.whatsapp.net");

exports.generateProfilePicture = async (buffer) => {
  const jimp = await Jimp.read(buffer);
  const min = Math.min(jimp.getWidth(), jimp.getHeight());
  const cropped = jimp.crop(0, 0, min, min);
  return {
    img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
    preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
  };
};

// safer jid decode helper
const safeDecodeJid = (jid) => {
  if (!jid) return jid;
  try {
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {};
      return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid;
    }
    return jid;
  } catch {
    return jid;
  }
};

// core serializer
exports.smsg = (sock, m, store) => {
  if (!m) return m;

  // basic fields
  if (m.key) {
    m.id = m.key.id;
    m.chat = m.key.remoteJid;
    m.fromMe = !!m.key.fromMe;
    m.isGroup = typeof m.chat === "string" && m.chat.endsWith("@g.us");
  }

  // Resolve sender robustly:
  // priority:
  // 1) explicit participant (group messages)
  // 2) context participant (quoted messages)
  // 3) for personal chats use the remoteJid
  // 4) if message is fromMe, fall back to sock.user.id
  let resolvedSender = null;
  try {
    if (m.key?.participant) resolvedSender = safeDecodeJid(m.key.participant);
    else if (m.participant) resolvedSender = safeDecodeJid(m.participant);
    else if (m.chat && m.chat.endsWith("@s.whatsapp.net")) resolvedSender = safeDecodeJid(m.chat);
    else if (m.fromMe && sock.user?.id) resolvedSender = safeDecodeJid(sock.user.id);
    else resolvedSender = safeDecodeJid(m.key?.remoteJid || m.chat);
  } catch {
    resolvedSender = safeDecodeJid(m.key?.remoteJid || m.chat || sock.user?.id);
  }

  m.sender = resolvedSender || "";

  // extract content
  if (m.message) {
    m.mtype = getContentType(m.message);

    // handle ephemeral/viewOnce nested message safely
    let inner = m.message[m.mtype];
    if (m.mtype === "viewOnceMessage" || m.mtype === "viewOnceMessageV2") {
      inner = inner.message[getContentType(inner.message)];
    } else if (m.mtype === "ephemeralMessage") {
      inner = inner.message;
      const innerType = getContentType(inner);
      inner = inner[innerType];
    }
    
    m.msg = inner || m.message[m.mtype];

    // universal text extractor (safe)
    const getText = (msg) => {
      if (!msg) return "";
      return msg.conversation || msg.text || msg.caption || msg.contentText || msg.selectedDisplayText || "";
    };

    m.text = getText(m.message) || getText(m.message.extendedTextMessage) || getText(m.message.ephemeralMessage?.message?.extendedTextMessage) || getText(m.msg) || "";

    // quoted message handling
    const ctx = m.msg?.contextInfo || m.message?.extendedTextMessage?.contextInfo || m.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo || {};
    m.mentionedJid = ctx.mentionedJid || [];
    if (ctx?.quotedMessage) {
      try {
        const quotedRaw = ctx.quotedMessage;
        const type = getContentType(quotedRaw);
        
        let quotedInner = quotedRaw[type] || quotedRaw;
        // Fix: If quoted message is a primitive (like a string from 'conversation'), wrap it in an object
        if (typeof quotedInner !== "object" || quotedInner === null) {
          m.quoted = { text: String(quotedInner) };
        } else {
          m.quoted = quotedInner;
        }
        
        m.quoted.id = ctx.stanzaId;
        m.quoted.chat = ctx.remoteJid || m.chat;

        // 🔒 Robust fromMe detection — handles LID, colon-format, and all JID variants
        const extractNum = (jid) => (jid || "").replace(/[:@].*$/, "").replace(/[^0-9]/g, "");
        const quotedParticipant = ctx.participant || "";
        const quotedNum = extractNum(quotedParticipant);
        const botNum = extractNum(sock.user?.id);
        const botLidNum = extractNum(sock.user?.lid);
        
        // Compare by decoded JID first, then fall back to pure number matching
        const decodedMatch = safeDecodeJid(quotedParticipant) === safeDecodeJid(sock.user?.id);
        const numberMatch = quotedNum && (quotedNum === botNum || quotedNum === botLidNum);
        m.quoted.fromMe = decodedMatch || !!numberMatch;

        m.quoted.sender = safeDecodeJid(ctx.participant || m.quoted?.sender || m.chat);
        m.quoted.text =
          m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || "";
        m.quoted.delete = () => sock.sendMessage(m.quoted.chat, { delete: { remoteJid: m.quoted.chat, fromMe: m.quoted.fromMe, id: m.quoted.id, participant: ctx.participant } }).catch(() => {});
      } catch (e) {
        m.quoted = null;
      }
    }
  } else {
    m.mtype = null;
    m.msg = null;
    m.text = "";
  }

  // convenience helpers
  m.reply = (text, chatId = m.chat, options = {}) =>
    sock.sendMessage(chatId, { text, ...options }, { quoted: m }).catch(() => {});
  m.download = () => m.msg && sock.downloadMediaMessage(m.msg).catch(() => null);
  m.cleanText = () => (m.text || "").replace(/^[./!#]/, "").trim();

  return m;
};

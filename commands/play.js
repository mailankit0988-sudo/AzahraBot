// commands/play.js

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yts = require("yt-search");
const { fileTypeFromBuffer } = require("file-type");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const small = require("../lib/small_lib");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// 📁 temp
function ensureTempDir() {
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ⏱ format
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// 📥 download
async function downloadFile(url, dest) {
  const res = await axios({
    url,
    method: "GET",
    responseType: "arraybuffer",
    timeout: 60000
  });

  const buffer = Buffer.from(res.data);
  fs.writeFileSync(dest, buffer);
  return buffer;
}

// 🚀 MAIN
module.exports = async (sock, msg, from, text, args) => {
  try {
    const query = args.join(" ");
    if (!query) {
      return sock.sendMessage(from, {
        text: "Usage: .play <song>"
      }, { quoted: msg });
    }

    await sock.sendMessage(from, {
      react: { text: "🎶", key: msg.key }
    });

    // 🔥 YouTube search
    const search = await yts(query);
    const video = search.videos.find(v => v.seconds > 30);

    if (!video) throw new Error("No result found");

    const caption = `
🎧 *${video.title}*
────────────────────
🎤 *Artist:* ${video.author.name}
⏱ *Duration:* ${formatTime(video.seconds)}
────────────────────
> 🎶 *Powered by ${small.author || "AzarTech"}* ⚡
⬇️*Downloading your song...*
`.trim();

    await sock.sendMessage(from, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          title: video.title,
          body: `${video.author.name} • ${formatTime(video.seconds)}`,
          thumbnailUrl: video.thumbnail,
          sourceUrl: video.url,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: msg });

    // 🔥 downloader API (with Fallback)
    let dl;
    try {
      const primaryApi = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(video.url)}&format=mp3`;
      const res = await axios.get(primaryApi);
      if (!res.data || !res.data.downloadURL) throw new Error("Primary API invalid response");
      dl = res.data.downloadURL;
    } catch (primaryError) {
      console.log("[PLAY API] Primary API failed, switching to fallback:", primaryError.message);
      const fallbackApi = `https://api.princetechn.com/api/download/dlmp3?apikey=prince&url=${encodeURIComponent(video.url)}`;
      const fallbackRes = await axios.get(fallbackApi);
      if (!fallbackRes.data || !fallbackRes.data.success || !fallbackRes.data.result || !fallbackRes.data.result.download_url) {
        throw new Error("Both Primary and Fallback APIs failed.");
      }
      dl = fallbackRes.data.result.download_url;
    }

    const tempDir = ensureTempDir();
    const rawPath = path.join(tempDir, `play_${Date.now()}.bin`);

    const buffer = await downloadFile(dl, rawPath);

    const type = await fileTypeFromBuffer(buffer);
    let finalPath = rawPath;

    // 🎬 convert if needed
    if (type && type.mime.startsWith("video")) {
      const mp3Path = rawPath + ".mp3";

      await new Promise((res, rej) => {
        ffmpeg(rawPath)
          .toFormat("mp3")
          .on("end", res)
          .on("error", rej)
          .save(mp3Path);
      });

      fs.unlinkSync(rawPath);
      finalPath = mp3Path;
    }

    const audio = fs.readFileSync(finalPath);

    await sock.sendMessage(from, {
      audio,
      mimetype: "audio/mpeg",
      fileName: `${video.title}.mp3`
    }, { quoted: msg });

    fs.unlinkSync(finalPath);

    await sock.sendMessage(from, {
      react: { text: "✅", key: msg.key }
    });

  } catch (err) {
    console.error("PLAY ERROR:", err.message);

    await sock.sendMessage(from, {
      text: "❌ Failed to fetch song"
    }, { quoted: msg });

    await sock.sendMessage(from, {
      react: { text: "⚠️", key: msg.key }
    }).catch(() => { });
  }
};
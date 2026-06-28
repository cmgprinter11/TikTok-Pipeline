const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const fs = require("fs");
const path = require("path");
const os = require("os");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.options("*", cors());
app.use(express.json());

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const APIFY_KEY = process.env.APIFY_API_KEY;

async function scrapeTikTok(url) {
  const startRes = await axios.post(
    `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=${APIFY_KEY}`,
    { postURLs: [url], resultsType: "posts", maxPostsPerPage: 1, shouldDownloadVideos: true },
    { headers: { "Content-Type": "application/json" } }
  );
  const runId = startRes.data.data.id;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_KEY}`);
    const status = statusRes.data.data.status;
    if (status === "SUCCEEDED") {
      const datasetId = statusRes.data.data.defaultDatasetId;
      const items = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_KEY}`);
      return items.data[0] || null;
    }
    if (status === "FAILED" || status === "ABORTED") throw new Error("Apify run failed");
  }
  throw new Error("Timed out waiting for Apify");
}

async function downloadVideo(videoUrl) {
  const tmpFile = path.join(os.tmpdir(), `tiktok_${Date.now()}.mp4`);
  const response = await axios({ url: videoUrl, method: "GET", responseType: "stream" });
  const writer = fs.createWriteStream(tmpFile);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
  return tmpFile;
}

async function extractFrames(videoPath, frameCount = 6) {
  const outDir = path.join(os.tmpdir(), `frames_${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });
  await new Promise((resolve, reject) => {
    ffmpeg(videoPath).on("end", resolve).on("error", reject)
      .screenshots({ count: frameCount, folder: outDir, filename: "frame_%i.jpg", size: "720x?" });
  });
  const files = fs.readdirSync(outDir).sort();
  return files.map((f) => fs.readFileSync(path.join(outDir, f)).toString("base64"));
}

async function analyzeFrames(frames, metadata, avatarName, productDesc, mode, splitChange) {
  const imageContent = frames.map((b64) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }));
  const modeInstructions = {
    copy: `Create an exact frame-for-frame Higgsfield video prompt that recreates this video. Keep EVERY visual element identical — setting, camera angle, lighting, framing, body language, action sequence. Only swap the person with the avatar described below.`,
    split: `Generate TWO Higgsfield video prompts for an A/B split test. Version A = original environment. Version B = change this: "${splitChange}". Avatar, action, pose, and hook identical in both.`,
    hook: `1. Analyze what makes the hook (first 1-3 seconds) stop the scroll. 2. Write a single Higgsfield prompt recreating ONLY the hook with the new avatar, making it hit harder.`,
  };
  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: "You are an expert TikTok video analyst and Higgsfield AI prompt engineer. Analyze frames precisely. Generate ready-to-fire Higgsfield video prompts. Style always: UGC, shot on iPhone, no color grading, no studio lighting, hyper realistic, action starts frame one.",
      messages: [{ role: "user", content: [...imageContent, { type: "text", text: `These are ${frames.length} frames from a viral TikTok.\n\nMETADATA:\n- Views: ${metadata.playCount?.toLocaleString() || "unknown"}\n- Likes: ${metadata.diggCount?.toLocaleString() || "unknown"}\n- Caption: ${metadata.text || "none"}\n- Audio: ${metadata.musicMeta?.musicName || "unknown"}\n\nAVATAR: ${avatarName}\nPRODUCT: ${productDesc}\n\nTASK: ${modeInstructions[mode]}` }] }],
    },
    { headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" } }
  );
  return res.data.content?.find((b) => b.type === "text")?.text || "";
}

function cleanup(...paths) {
  paths.forEach((p) => { try { if (fs.existsSync(p)) { if (fs.statSync(p).isDirectory()) fs.rmSync(p, { recursive: true }); else fs.unlinkSync(p); } } catch {} });
}

// Non-streaming endpoint — simpler, no CORS issues
app.post("/analyze", async (req, res) => {
  const { tiktokUrl, avatarName, productDesc, mode, splitChange } = req.body;
  if (!tiktokUrl) return res.status(400).json({ error: "tiktokUrl is required" });

  let videoPath = null;
  try {
    const metadata = await scrapeTikTok(tiktokUrl);
    if (!metadata) return res.status(400).json({ error: "Couldn't scrape that video." });

    const videoUrl = metadata.videoUrl || metadata.downloadAddr;
    if (!videoUrl) return res.status(400).json({ error: "No downloadable video found." });

    videoPath = await downloadVideo(videoUrl);
    const frames = await extractFrames(videoPath, 6);
    const prompt = await analyzeFrames(frames, metadata, avatarName || "Hailey", productDesc || "LumaForge firefighter lamp", mode || "copy", splitChange || "");

    res.json({
      result: prompt,
      metadata: { views: metadata.playCount, likes: metadata.diggCount, shares: metadata.shareCount, caption: metadata.text, author: metadata.authorMeta?.name, audio: metadata.musicMeta?.musicName },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Something went wrong" });
  } finally {
    if (videoPath) cleanup(videoPath);
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`TikTok pipeline running on port ${PORT}`));

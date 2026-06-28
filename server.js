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
app.use(cors());
app.use(express.json());

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const APIFY_KEY = process.env.APIFY_API_KEY;

// ─── 1. Scrape TikTok via Apify ───────────────────────────────────────────────
async function scrapeTikTok(url) {
  // Start the actor run
  const startRes = await axios.post(
    `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=${APIFY_KEY}`,
    {
      postURLs: [url],
      resultsType: "posts",
      maxPostsPerPage: 1,
      shouldDownloadVideos: true,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  const runId = startRes.data.data.id;

  // Poll until done
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_KEY}`
    );
    const status = statusRes.data.data.status;
    if (status === "SUCCEEDED") {
      const datasetId = statusRes.data.data.defaultDatasetId;
      const items = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_KEY}`
      );
      return items.data[0] || null;
    }
    if (status === "FAILED" || status === "ABORTED") throw new Error("Apify run failed");
  }
  throw new Error("Timed out waiting for Apify");
}

// ─── 2. Download video to temp file ──────────────────────────────────────────
async function downloadVideo(videoUrl) {
  const tmpFile = path.join(os.tmpdir(), `tiktok_${Date.now()}.mp4`);
  const response = await axios({ url: videoUrl, method: "GET", responseType: "stream" });
  const writer = fs.createWriteStream(tmpFile);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
  return tmpFile;
}

// ─── 3. Extract frames via ffmpeg ────────────────────────────────────────────
async function extractFrames(videoPath, frameCount = 6) {
  const outDir = path.join(os.tmpdir(), `frames_${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on("end", resolve)
      .on("error", reject)
      .screenshots({
        count: frameCount,
        folder: outDir,
        filename: "frame_%i.jpg",
        size: "720x?",
      });
  });

  const files = fs.readdirSync(outDir).sort();
  return files.map((f) => {
    const data = fs.readFileSync(path.join(outDir, f));
    return data.toString("base64");
  });
}

// ─── 4. Claude Vision analysis ───────────────────────────────────────────────
async function analyzeFrames(frames, metadata, avatarName, productDesc, mode, splitChange) {
  const imageContent = frames.map((b64) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: b64 },
  }));

  const modeInstructions = {
    copy: `Create an exact frame-for-frame Higgsfield video prompt that recreates this video. Keep EVERY visual element identical — setting, camera angle, lighting, framing, body language, action sequence. Only swap the person with the avatar described below.`,
    split: `Generate TWO Higgsfield video prompts for an A/B split test. Version A = original environment. Version B = change this: "${splitChange}". The avatar, action, pose, and hook are identical in both versions.`,
    hook: `1. Analyze what makes the hook (first 1-3 seconds) stop the scroll — be specific about why it works psychologically. 2. Write a single Higgsfield prompt that recreates ONLY the hook moment with the new avatar, making it hit even harder.`,
  };

  const systemPrompt = `You are an expert TikTok video analyst and Higgsfield AI prompt engineer. You will be shown frames from a viral TikTok video. Analyze them precisely — every visual detail matters. Then generate ready-to-fire Higgsfield video generation prompts. Be hyper specific about camera angles, lighting, body positions, expressions, and scene composition. Style always: UGC, shot on iPhone, no color grading, no studio lighting, hyper realistic, action starts frame one.`;

  const userPrompt = `These are ${frames.length} evenly-spaced frames from a viral TikTok video.

VIDEO METADATA:
- Views: ${metadata.playCount?.toLocaleString() || "unknown"}
- Likes: ${metadata.diggCount?.toLocaleString() || "unknown"}  
- Caption: ${metadata.text || "none"}
- Audio: ${metadata.musicMeta?.musicName || "unknown"}

AVATAR TO USE: ${avatarName}
PRODUCT TO FEATURE: ${productDesc}

TASK: ${modeInstructions[mode]}

Analyze the frames carefully — describe the exact camera work, setting, lighting, what the person is doing in each beat, and what makes this video work. Then output the prompt(s).`;

  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [...imageContent, { type: "text", text: userPrompt }],
        },
      ],
    },
    {
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    }
  );

  return res.data.content?.find((b) => b.type === "text")?.text || "";
}

// ─── Cleanup temp files ───────────────────────────────────────────────────────
function cleanup(...paths) {
  paths.forEach((p) => {
    try {
      if (fs.existsSync(p)) {
        if (fs.statSync(p).isDirectory()) fs.rmSync(p, { recursive: true });
        else fs.unlinkSync(p);
      }
    } catch {}
  });
}

// ─── Main endpoint ────────────────────────────────────────────────────────────
app.post("/analyze", async (req, res) => {
  const { tiktokUrl, avatarName, productDesc, mode, splitChange } = req.body;

  if (!tiktokUrl) return res.status(400).json({ error: "tiktokUrl is required" });

  let videoPath = null;

  try {
    // Step 1: Scrape
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const send = (stage, data) => {
      res.write(`data: ${JSON.stringify({ stage, ...data })}\n\n`);
    };

    send("scraping", { message: "Scraping TikTok via Apify..." });
    const metadata = await scrapeTikTok(tiktokUrl);

    if (!metadata) {
      send("error", { message: "Couldn't scrape that video. Make sure the URL is public." });
      return res.end();
    }

    const videoUrl = metadata.videoUrl || metadata.downloadAddr;
    if (!videoUrl) {
      send("error", { message: "No downloadable video found for this URL." });
      return res.end();
    }

    send("downloading", { message: "Downloading video...", metadata: { views: metadata.playCount, likes: metadata.diggCount, caption: metadata.text, author: metadata.authorMeta?.name } });
    videoPath = await downloadVideo(videoUrl);

    send("extracting", { message: "Extracting frames..." });
    const frames = await extractFrames(videoPath, 6);

    send("analyzing", { message: `Analyzing ${frames.length} frames with Claude Vision...` });
    const prompt = await analyzeFrames(frames, metadata, avatarName || "Hailey (blonde, blue eyes, firefighter niche)", productDesc || "LumaForge firefighter resin lamp", mode || "copy", splitChange || "");

    send("done", {
      message: "Done!",
      result: prompt,
      metadata: {
        views: metadata.playCount,
        likes: metadata.diggCount,
        shares: metadata.shareCount,
        caption: metadata.text,
        author: metadata.authorMeta?.name,
        audio: metadata.musicMeta?.musicName,
      },
    });

    res.end();
  } catch (err) {
    console.error(err);
    try {
      res.write(`data: ${JSON.stringify({ stage: "error", message: err.message || "Something went wrong" })}\n\n`);
      res.end();
    } catch {}
  } finally {
    if (videoPath) cleanup(videoPath);
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`TikTok pipeline running on port ${PORT}`));

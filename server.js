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

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LumaForge TikTok Cloner</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; color: #e8e8e8; font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }
  nav { background: #111; border-bottom: 1px solid #1f1f1f; padding: 0 24px; display: flex; align-items: center; height: 48px; gap: 16px; }
  .logo { color: #ff6b2b; font-weight: 700; font-size: 13px; letter-spacing: 0.08em; }
  .nav-tab { font-size: 12px; color: #ff6b2b; font-weight: 600; border-bottom: 2px solid #ff6b2b; padding-bottom: 2px; }
  .container { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
  h1 { font-size: 21px; font-weight: 700; color: #fff; margin-bottom: 6px; }
  .subtitle { font-size: 12px; color: #444; margin-bottom: 28px; }
  .tag { font-size: 11px; color: #ff6b2b; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 6px; }
  .box { background: #111; border: 1.5px solid #1f1f1f; border-radius: 8px; padding: 16px; margin-bottom: 14px; }
  .box-highlight { border-color: #ff6b2b44; }
  label { font-size: 11px; color: #555; font-weight: 600; letter-spacing: 0.08em; display: block; margin-bottom: 10px; }
  input { width: 100%; background: #0d0d0d; border: 1.5px solid #1f1f1f; border-radius: 6px; color: #ccc; font-size: 12px; padding: 10px 12px; outline: none; font-family: inherit; }
  .url-row { display: flex; gap: 10px; }
  .url-row input { flex: 1; }
  .btn-primary { background: #ff6b2b; color: #fff; border: none; border-radius: 6px; padding: 0 20px; height: 40px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .btn-primary:disabled { background: #1a1a1a; color: #444; cursor: not-allowed; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .mode-btn { background: #111; border: 1.5px solid #1f1f1f; border-radius: 8px; padding: 11px 14px; cursor: pointer; text-align: left; color: inherit; width: 100%; }
  .mode-btn.active-copy { border-color: #ff6b2b; background: #1a1a1a; }
  .mode-btn.active-split { border-color: #a855f7; background: #1a1a1a; }
  .mode-btn.active-hook { border-color: #3b82f6; background: #1a1a1a; }
  .mode-tag { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 5px; }
  .tag-copy { background: #ff6b2b22; color: #ff6b2b; }
  .tag-split { background: #a855f722; color: #a855f7; }
  .tag-hook { background: #3b82f622; color: #3b82f6; }
  .mode-label { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 2px; }
  .mode-btn.active-copy .mode-label, .mode-btn.active-split .mode-label, .mode-btn.active-hook .mode-label { color: #fff; }
  .mode-desc { font-size: 11px; color: #3a3a3a; line-height: 1.4; }
  .avatar-item, .product-item { display: flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 6px; border: 1.5px solid #1f1f1f; background: #0d0d0d; cursor: pointer; margin-bottom: 7px; }
  .avatar-item.selected, .product-item.selected { border-color: #ff6b2b; background: #1a1a1a; }
  .avatar-icon { width: 26px; height: 26px; border-radius: 50%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #444; font-weight: 700; flex-shrink: 0; }
  .avatar-item.selected .avatar-icon, .product-item.selected .avatar-icon { background: #ff6b2b22; color: #ff6b2b; }
  .avatar-name { font-size: 12px; font-weight: 600; color: #555; }
  .avatar-item.selected .avatar-name, .product-item.selected .avatar-name { color: #fff; }
  .avatar-desc-text { font-size: 10px; color: #3a3a3a; }
  .progress { background: #0d1a0d; border: 1.5px solid #ff6b2b33; border-radius: 8px; padding: 16px; margin-bottom: 14px; display: none; }
  .progress-title { font-size: 12px; color: #ff6b2b; font-weight: 600; margin-bottom: 6px; }
  .progress-sub { font-size: 11px; color: #444; }
  .error-box { background: #1a0a0a; border: 1.5px solid #ff3333; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #ff6666; margin-bottom: 14px; display: none; }
  .result { background: #0d1a0d; border: 1.5px solid #ff6b2b44; border-radius: 8px; padding: 20px; display: none; }
  .result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .result-title { font-size: 11px; color: #ff6b2b; font-weight: 700; letter-spacing: 0.1em; }
  .copy-btn { background: #ffffff11; border: 1px solid #ffffff22; border-radius: 5px; padding: 5px 14px; color: #aaa; font-size: 11px; cursor: pointer; font-weight: 600; }
  .copy-btn.copied { background: #1a3a1a; border-color: #4ade80; color: #4ade80; }
  .result-text { white-space: pre-wrap; font-size: 12px; color: #bbb; line-height: 1.75; font-family: inherit; }
  .stats { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .stat { background: #0d1a0d; border: 1px solid #1a3a1a; border-radius: 6px; padding: 8px 14px; text-align: center; }
  .stat-val { font-size: 13px; font-weight: 700; color: #4ade80; }
  .stat-label { font-size: 10px; color: #555; }
</style>
</head>
<body>
<nav>
  <span class="logo">LUMAFORGE</span>
  <span class="nav-tab">TikTok Cloner</span>
</nav>
<div class="container">
  <div class="tag">VIDEO RECREATION ENGINE</div>
  <h1>Paste TikTok → Claude Watches It → Higgsfield Prompt</h1>
  <p class="subtitle">AI sees your frames, analyzes the hook, rewrites it with your avatar + product</p>

  <div class="box box-highlight">
    <label>1. TIKTOK URL</label>
    <div class="url-row">
      <input type="text" id="tiktokUrl" placeholder="https://www.tiktok.com/@username/video/..." />
      <button class="btn-primary" id="analyzeBtn" onclick="analyze()">ANALYZE →</button>
    </div>
  </div>

  <div class="grid-3">
    <button class="mode-btn active-copy" onclick="setMode('copy')" id="mode-copy">
      <span class="mode-tag tag-copy">EXACT CLONE</span>
      <div class="mode-label">Copy 1:1</div>
      <div class="mode-desc">Frame-for-frame replica — only person and product change.</div>
    </button>
    <button class="mode-btn" onclick="setMode('split')" id="mode-split">
      <span class="mode-tag tag-split">A/B TEST</span>
      <div class="mode-label">Split Test</div>
      <div class="mode-desc">Same scene, two environments to A/B test.</div>
    </button>
    <button class="mode-btn" onclick="setMode('hook')" id="mode-hook">
      <span class="mode-tag tag-hook">HOOK ONLY</span>
      <div class="mode-label">Recreate Hook</div>
      <div class="mode-desc">Extract + rebuild just the scroll-stopping hook.</div>
    </button>
  </div>

  <div class="box" id="splitBox" style="display:none; border-color: #a855f733;">
    <label style="color:#a855f7">WHAT TO CHANGE — VERSION B</label>
    <input type="text" id="splitChange" placeholder="e.g. sunny beach setting, different room..." />
  </div>

  <div class="grid-2">
    <div class="box">
      <label>2. YOUR AVATAR</label>
      <div id="avatarList"></div>
      <input type="text" id="customAvatar" placeholder="Describe your avatar..." style="display:none;margin-top:8px" />
    </div>
    <div class="box">
      <label>3. YOUR PRODUCT</label>
      <div id="productList"></div>
      <input type="text" id="customProduct" placeholder="Describe your product..." style="display:none;margin-top:8px" />
    </div>
  </div>

  <div class="progress" id="progress">
    <div class="progress-title">Processing...</div>
    <div class="progress-sub">Scraping TikTok, downloading video, extracting frames, Claude Vision analyzing... (~60-90 sec)</div>
  </div>

  <div class="error-box" id="errorBox"></div>
  <div class="stats" id="stats"></div>

  <div class="result" id="result">
    <div class="result-header">
      <div class="result-title">PROMPT READY — PASTE INTO HIGGSFIELD</div>
      <button class="copy-btn" id="copyBtn" onclick="copyResult()">COPY</button>
    </div>
    <div class="result-text" id="resultText"></div>
  </div>
</div>

<script>
var AVATARS = [
  { id: "hailey", name: "Hailey", desc: "23, fair skin, light freckles, bright blue eyes, long blonde hair, left eyebrow piercing, small silver hoop nose ring, H initial gold necklace. Self-taught resin lamp artist from Texas." },
  { id: "joss", name: "Joss", desc: "Plus-size woman, dark hair, round face, wire-frame glasses, nerdy artsy vibe." },
  { id: "monkey", name: "Monkey Onesie", desc: "5ft4 girl inside full monkey costume suit. Full monkey face visible, mouth closed, no human hair showing, skinny tail hanging down." },
  { id: "custom", name: "Custom", desc: "" }
];

var PRODUCTS = [
  { id: "lamp", name: "Firefighter Lamp", desc: "LumaForge handcrafted firefighter resin lamp. Irregular organic pentagon shape, walnut base, dark walnut burl and fiery red-orange resin, hand-painted firefighter in yellow-black turnout gear, American flag and thin red line flag inside resin, warm orange and electric blue LED." },
  { id: "jacket", name: "Firefighter Jacket", desc: "Black leather body, deep red accent panels, maltese cross emblem on left chest, thin red line patch, American flag patch, large FIRE DEPT maltese cross on full back." },
  { id: "flag", name: "Firefighter Flag", desc: "Horizontal flag, alternating deep red and black carved wooden planks, maltese cross canton upper left, BORN FOR THE FIRE in orange lettering, dark charred torched black outer frame." },
  { id: "firefighter_mug", name: "Firefighter Mug", desc: "Heavy 3D embossed collector tankard mug. Dark charcoal black textured resin, aged brass and copper accents, bald eagle, maltese cross, crossed fire axes, fire hose handle with brass nozzle." },
  { id: "nurse_mug", name: "Nurse Mug", desc: "Heavy 3D embossed collector tankard mug in dusty rose and blush pink with rose gold accents. Stethoscope, red cross emblem, NURSE embossed top band." },
  { id: "monkey_onesie", name: "Monkey Onesie", desc: "Silly monkey costume pajama onesie. Full monkey face hood, brown body, skinny tail. Fun gift product." },
  { id: "custom", name: "Custom Product", desc: "" }
];

var selectedAvatar = "hailey";
var selectedProduct = "lamp";
var currentMode = "copy";
var resultText = "";

function renderList(items, containerId, selectedId, type) {
  var container = document.getElementById(containerId);
  container.innerHTML = items.map(function(item) {
    return '<div class="' + type + '-item' + (item.id === selectedId ? ' selected' : '') + '" onclick="select' + (type === 'avatar' ? 'Avatar' : 'Product') + '(\'' + item.id + '\')">' +
      '<div class="avatar-icon">' + item.name[0] + '</div>' +
      '<div><div class="avatar-name">' + item.name + '</div>' +
      '<div class="avatar-desc-text">' + (item.id !== 'custom' ? item.desc.slice(0,45) + '...' : 'Describe below') + '</div></div></div>';
  }).join('');
}

function selectAvatar(id) {
  selectedAvatar = id;
  renderList(AVATARS, 'avatarList', id, 'avatar');
  document.getElementById('customAvatar').style.display = id === 'custom' ? 'block' : 'none';
}

function selectProduct(id) {
  selectedProduct = id;
  renderList(PRODUCTS, 'productList', id, 'product');
  document.getElementById('customProduct').style.display = id === 'custom' ? 'block' : 'none';
}

function setMode(mode) {
  currentMode = mode;
  ['copy','split','hook'].forEach(function(m) {
    var btn = document.getElementById('mode-' + m);
    btn.className = 'mode-btn' + (m === mode ? ' active-' + m : '');
  });
  document.getElementById('splitBox').style.display = mode === 'split' ? 'block' : 'none';
}

function getAvatarDesc() {
  if (selectedAvatar === 'custom') return document.getElementById('customAvatar').value;
  var a = AVATARS.find(function(x) { return x.id === selectedAvatar; });
  return a ? a.desc : '';
}

function getProductDesc() {
  if (selectedProduct === 'custom') return document.getElementById('customProduct').value;
  var p = PRODUCTS.find(function(x) { return x.id === selectedProduct; });
  return p ? p.desc : '';
}

function showError(msg) {
  var el = document.getElementById('errorBox');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('progress').style.display = 'none';
  document.getElementById('analyzeBtn').disabled = false;
  document.getElementById('analyzeBtn').textContent = 'ANALYZE';
}

function analyze() {
  var url = document.getElementById('tiktokUrl').value.trim();
  if (!url) { showError('Paste a TikTok URL first.'); return; }

  var btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  btn.textContent = 'ANALYZING...';
  document.getElementById('progress').style.display = 'block';
  document.getElementById('errorBox').style.display = 'none';
  document.getElementById('result').style.display = 'none';
  document.getElementById('stats').innerHTML = '';

  fetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tiktokUrl: url,
      avatarName: getAvatarDesc(),
      productDesc: getProductDesc(),
      mode: currentMode,
      splitChange: document.getElementById('splitChange').value
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.error) { showError(data.error); return; }
    if (data.metadata) {
      var m = data.metadata;
      var stats = '';
      if (m.views) stats += '<div class="stat"><div class="stat-val">' + Number(m.views).toLocaleString() + '</div><div class="stat-label">views</div></div>';
      if (m.likes) stats += '<div class="stat"><div class="stat-val">' + Number(m.likes).toLocaleString() + '</div><div class="stat-label">likes</div></div>';
      if (m.shares) stats += '<div class="stat"><div class="stat-val">' + Number(m.shares).toLocaleString() + '</div><div class="stat-label">shares</div></div>';
      if (m.author) stats += '<div class="stat"><div class="stat-val" style="font-size:11px">@' + m.author + '</div><div class="stat-label">creator</div></div>';
      document.getElementById('stats').innerHTML = stats;
    }
    resultText = data.result;
    document.getElementById('resultText').textContent = data.result;
    document.getElementById('result').style.display = 'block';
  })
  .catch(function(err) { showError('Something went wrong: ' + err.message); })
  .finally(function() {
    btn.disabled = false;
    btn.textContent = 'ANALYZE';
    document.getElementById('progress').style.display = 'none';
  });
}

function copyResult() {
  navigator.clipboard.writeText(resultText);
  var btn = document.getElementById('copyBtn');
  btn.textContent = 'COPIED';
  btn.className = 'copy-btn copied';
  setTimeout(function() { btn.textContent = 'COPY'; btn.className = 'copy-btn'; }, 2000);
}

document.addEventListener('DOMContentLoaded', function() { renderList(AVATARS, 'avatarList', selectedAvatar, 'avatar'); renderList(PRODUCTS, 'productList', selectedProduct, 'product'); });
</script>
</body>
</html>`);
});

async function scrapeTikTok(url) {
  const startRes = await axios.post(
    "https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=" + APIFY_KEY,
    { postURLs: [url], resultsType: "posts", maxPostsPerPage: 1, shouldDownloadVideos: true },
    { headers: { "Content-Type": "application/json" } }
  );
  const runId = startRes.data.data.id;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await axios.get("https://api.apify.com/v2/actor-runs/" + runId + "?token=" + APIFY_KEY);
    const status = statusRes.data.data.status;
    if (status === "SUCCEEDED") {
      const datasetId = statusRes.data.data.defaultDatasetId;
      const items = await axios.get("https://api.apify.com/v2/datasets/" + datasetId + "/items?token=" + APIFY_KEY);
      return items.data[0] || null;
    }
    if (status === "FAILED" || status === "ABORTED") throw new Error("Apify run failed");
  }
  throw new Error("Timed out waiting for Apify");
}

async function downloadVideo(videoUrl) {
  const tmpFile = path.join(os.tmpdir(), "tiktok_" + Date.now() + ".mp4");
  const response = await axios({ url: videoUrl, method: "GET", responseType: "stream" });
  const writer = fs.createWriteStream(tmpFile);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
  return tmpFile;
}

async function extractFrames(videoPath, frameCount) {
  frameCount = frameCount || 6;
  const outDir = path.join(os.tmpdir(), "frames_" + Date.now());
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
    copy: "Create an exact frame-for-frame Higgsfield video prompt that recreates this video. Keep EVERY visual element identical — setting, camera angle, lighting, framing, body language, action sequence. Only swap the person with the avatar described below.",
    split: "Generate TWO Higgsfield video prompts for an A/B split test. Version A = original environment. Version B = change this: " + splitChange + ". Avatar, action, pose, and hook identical in both.",
    hook: "1. Analyze what makes the hook (first 1-3 seconds) stop the scroll. 2. Write a single Higgsfield prompt recreating ONLY the hook with the new avatar, making it hit harder.",
  };
  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: "You are an expert TikTok video analyst and Higgsfield AI prompt engineer. Analyze frames precisely. Generate ready-to-fire Higgsfield video prompts. Style always: UGC, shot on iPhone, no color grading, no studio lighting, hyper realistic, action starts frame one.",
      messages: [{ role: "user", content: [...imageContent, { type: "text", text: "These are " + frames.length + " frames from a viral TikTok.\n\nMETADATA:\n- Views: " + (metadata.playCount || "unknown") + "\n- Likes: " + (metadata.diggCount || "unknown") + "\n- Caption: " + (metadata.text || "none") + "\n- Audio: " + ((metadata.musicMeta && metadata.musicMeta.musicName) || "unknown") + "\n\nAVATAR: " + avatarName + "\nPRODUCT: " + productDesc + "\n\nTASK: " + modeInstructions[mode] }] }],
    },
    { headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" } }
  );
  return (res.data.content && res.data.content.find((b) => b.type === "text") && res.data.content.find((b) => b.type === "text").text) || "";
}

function cleanup() {
  var paths = Array.prototype.slice.call(arguments);
  paths.forEach((p) => { try { if (fs.existsSync(p)) { if (fs.statSync(p).isDirectory()) fs.rmSync(p, { recursive: true }); else fs.unlinkSync(p); } } catch(e) {} });
}

app.post("/analyze", async (req, res) => {
  const { tiktokUrl, avatarName, productDesc, mode, splitChange } = req.body;
  if (!tiktokUrl) return res.status(400).json({ error: "tiktokUrl is required" });

  let videoPath = null;
  try {
    const metadata = await scrapeTikTok(tiktokUrl);
    if (!metadata) return res.status(400).json({ error: "Couldn't scrape that video. Make sure it's public." });

    const videoUrl = metadata.videoUrl || metadata.downloadAddr;
    if (!videoUrl) return res.status(400).json({ error: "No downloadable video found. Try a different TikTok URL." });

    videoPath = await downloadVideo(videoUrl);
    const frames = await extractFrames(videoPath, 6);
    const prompt = await analyzeFrames(frames, metadata, avatarName || "Hailey", productDesc || "LumaForge firefighter lamp", mode || "copy", splitChange || "");

    res.json({
      result: prompt,
      metadata: { views: metadata.playCount, likes: metadata.diggCount, shares: metadata.shareCount, caption: metadata.text, author: metadata.authorMeta && metadata.authorMeta.name },
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
app.listen(PORT, () => console.log("TikTok pipeline running on port " + PORT));

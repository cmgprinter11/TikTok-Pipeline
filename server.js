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

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>LumaForge TikTok Cloner</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#e8e8e8;font-family:system-ui,sans-serif;min-height:100vh}
nav{background:#111;border-bottom:1px solid #222;padding:0 24px;height:48px;display:flex;align-items:center;gap:16px}
.logo{color:#ff6b2b;font-weight:700;font-size:13px}
.wrap{max-width:900px;margin:0 auto;padding:32px 24px}
h1{font-size:20px;font-weight:700;color:#fff;margin-bottom:6px}
p{font-size:12px;color:#444;margin-bottom:24px}
.box{background:#111;border:1.5px solid #222;border-radius:8px;padding:16px;margin-bottom:14px}
.lbl{font-size:11px;color:#555;font-weight:600;letter-spacing:.08em;display:block;margin-bottom:10px;text-transform:uppercase}
input{width:100%;background:#0d0d0d;border:1.5px solid #222;border-radius:6px;color:#ccc;font-size:12px;padding:10px 12px;outline:none;font-family:inherit}
.row{display:flex;gap:10px}
.row input{flex:1}
.btn{background:#ff6b2b;color:#fff;border:none;border-radius:6px;padding:0 20px;height:40px;font-size:12px;font-weight:700;cursor:pointer}
.btn:disabled{background:#333;color:#666;cursor:not-allowed}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.mcard{background:#111;border:1.5px solid #222;border-radius:8px;padding:12px;cursor:pointer;text-align:left;width:100%}
.mcard.on{border-color:#ff6b2b;background:#1a1a1a}
.mtag{font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;display:inline-block;margin-bottom:5px;background:#ff6b2b22;color:#ff6b2b}
.mtag.s{background:#a855f722;color:#a855f7}
.mtag.h{background:#3b82f622;color:#3b82f6}
.mname{font-size:13px;font-weight:600;color:#555;margin-bottom:2px}
.mcard.on .mname{color:#fff}
.mdesc{font-size:11px;color:#333;line-height:1.4}
.aitem{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:6px;border:1.5px solid #222;background:#0d0d0d;cursor:pointer;margin-bottom:7px}
.aitem.on{border-color:#ff6b2b;background:#1a1a1a}
.aicon{width:26px;height:26px;border-radius:50%;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-size:11px;color:#444;font-weight:700;flex-shrink:0}
.aitem.on .aicon{background:#ff6b2b22;color:#ff6b2b}
.aname{font-size:12px;font-weight:600;color:#555}
.aitem.on .aname{color:#fff}
.adesc{font-size:10px;color:#333}
.prog{background:#0d1a0d;border:1.5px solid #ff6b2b33;border-radius:8px;padding:16px;margin-bottom:14px;display:none}
.prog p{color:#ff6b2b;font-size:12px;font-weight:600;margin-bottom:4px}
.prog span{font-size:11px;color:#444}
.err{background:#1a0a0a;border:1.5px solid #f003;border-radius:8px;padding:12px 16px;font-size:12px;color:#f66;margin-bottom:14px;display:none}
.res{background:#0d1a0d;border:1.5px solid #ff6b2b44;border-radius:8px;padding:20px;display:none}
.rhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.rtitle{font-size:11px;color:#ff6b2b;font-weight:700}
.cbtn{background:#fff1;border:1px solid #fff2;border-radius:5px;padding:5px 14px;color:#aaa;font-size:11px;cursor:pointer;font-weight:600}
.rtext{white-space:pre-wrap;font-size:12px;color:#bbb;line-height:1.75;font-family:inherit}
.stats{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.stat{background:#0d1a0d;border:1px solid #1a3a1a;border-radius:6px;padding:8px 14px;text-align:center}
.sval{font-size:13px;font-weight:700;color:#4ade80}
.slbl{font-size:10px;color:#555}
</style>
</head>
<body>
<nav><span class="logo">LUMAFORGE</span><span style="font-size:12px;color:#ff6b2b;font-weight:600">TikTok Cloner</span></nav>
<div class="wrap">
<h1>Paste TikTok → Claude Watches It → Higgsfield Prompt</h1>
<p>AI sees your frames, analyzes the hook, rewrites it with your avatar + product</p>

<div class="box" style="border-color:#ff6b2b44">
<span class="lbl">1. TikTok URL</span>
<div class="row">
<input type="text" id="url" placeholder="https://www.tiktok.com/@username/video/...">
<button class="btn" id="abtn" onclick="go()">ANALYZE →</button>
</div>
</div>

<div class="g3">
<button class="mcard on" id="mc" onclick="setMode('copy')"><span class="mtag">EXACT CLONE</span><div class="mname">Copy 1:1</div><div class="mdesc">Frame-for-frame replica</div></button>
<button class="mcard" id="ms" onclick="setMode('split')"><span class="mtag s">A/B TEST</span><div class="mname">Split Test</div><div class="mdesc">Two environments</div></button>
<button class="mcard" id="mh" onclick="setMode('hook')"><span class="mtag h">HOOK ONLY</span><div class="mname">Recreate Hook</div><div class="mdesc">Just the scroll-stopper</div></button>
</div>

<div class="box" id="splitbox" style="display:none;border-color:#a855f744">
<span class="lbl" style="color:#a855f7">What to change — Version B</span>
<input type="text" id="sc" placeholder="e.g. sunny beach, different room...">
</div>

<div class="g2">
<div class="box">
<span class="lbl">2. Your Avatar</span>
<div id="alist"></div>
<input type="text" id="ca" placeholder="Describe your avatar..." style="display:none;margin-top:8px">
</div>
<div class="box">
<span class="lbl">3. Your Product</span>
<div id="plist"></div>
<input type="text" id="cp" placeholder="Describe your product..." style="display:none;margin-top:8px">
</div>
</div>

<div class="prog" id="prog"><p>Processing...</p><span>Scraping TikTok, downloading, extracting frames, Claude Vision analyzing... (~60-90 sec)</span></div>
<div class="err" id="err"></div>
<div class="stats" id="stats"></div>
<div class="res" id="res">
<div class="rhead"><span class="rtitle">✓ PROMPT READY — PASTE INTO HIGGSFIELD</span><button class="cbtn" id="cbtn" onclick="cp2()">COPY</button></div>
<div class="rtext" id="rtext"></div>
</div>
</div>

<script>
var AV=[
{id:"hailey",n:"Hailey",d:"23, fair skin, light freckles, bright blue eyes, long blonde hair, left eyebrow piercing, small silver hoop nose ring, H initial gold necklace. Self-taught resin lamp artist from Texas."},
{id:"joss",n:"Joss",d:"Plus-size woman, dark hair, round face, wire-frame glasses, nerdy artsy vibe."},
{id:"monkey",n:"Monkey Onesie",d:"5ft4 girl inside full monkey costume. Full monkey face visible, mouth closed, no human hair showing, skinny tail hanging down."},
{id:"custom",n:"Custom",d:""}
];
var PR=[
{id:"lamp",n:"Firefighter Lamp",d:"LumaForge handcrafted firefighter resin lamp. Pentagon shape, walnut base, dark walnut burl and red-orange resin, hand-painted firefighter in turnout gear, American flag and thin red line flag inside resin, orange and blue LED."},
{id:"jacket",n:"Firefighter Jacket",d:"Black leather body, deep red accent panels, maltese cross on left chest, thin red line patch, American flag patch, FIRE DEPT maltese cross on full back."},
{id:"flag",n:"Firefighter Flag",d:"Horizontal flag, alternating deep red and black carved wooden planks, maltese cross upper left, BORN FOR THE FIRE in orange lettering, dark charred outer frame."},
{id:"fmug",n:"Firefighter Mug",d:"Heavy 3D embossed collector tankard. Dark charcoal resin, brass accents, bald eagle, maltese cross, crossed fire axes, fire hose handle with brass nozzle."},
{id:"nmug",n:"Nurse Mug",d:"Heavy 3D embossed collector tankard in dusty rose and blush pink, rose gold accents, stethoscope, red cross emblem, NURSE embossed top band."},
{id:"onesie",n:"Monkey Onesie",d:"Silly monkey costume pajama onesie. Full monkey face hood, brown body, skinny tail. Fun gift product."},
{id:"custom",n:"Custom Product",d:""}
];
var selAv="hailey",selPr="lamp",mode="copy",resultTxt="";

function mkList(arr,cid,sel,type){
  var c=document.getElementById(cid);
  c.innerHTML="";
  arr.forEach(function(x){
    var d=document.createElement("div");
    d.className="aitem"+(x.id===sel?" on":"");
    d.innerHTML='<div class="aicon">'+x.n[0]+'</div><div><div class="aname">'+x.n+'</div><div class="adesc">'+(x.id!=="custom"?x.d.slice(0,50)+"...":"Describe below")+"</div></div>";
    d.onclick=(function(id,t){return function(){
      if(t==="av"){selAv=id;mkList(AV,"alist",id,"av");document.getElementById("ca").style.display=id==="custom"?"block":"none";}
      else{selPr=id;mkList(PR,"plist",id,"pr");document.getElementById("cp").style.display=id==="custom"?"block":"none";}
    };})(x.id,type);
    c.appendChild(d);
  });
}

function setMode(m){
  mode=m;
  ["mc","ms","mh"].forEach(function(id){document.getElementById(id).className="mcard";});
  document.getElementById(m==="copy"?"mc":m==="split"?"ms":"mh").className="mcard on";
  document.getElementById("splitbox").style.display=m==="split"?"block":"none";
}

function getAv(){return selAv==="custom"?document.getElementById("ca").value:AV.find(function(x){return x.id===selAv;}).d;}
function getPr(){return selPr==="custom"?document.getElementById("cp").value:PR.find(function(x){return x.id===selPr;}).d;}

function go(){
  var url=document.getElementById("url").value.trim();
  if(!url){showErr("Paste a TikTok URL first.");return;}
  document.getElementById("abtn").disabled=true;
  document.getElementById("abtn").textContent="ANALYZING...";
  document.getElementById("prog").style.display="block";
  document.getElementById("err").style.display="none";
  document.getElementById("res").style.display="none";
  document.getElementById("stats").innerHTML="";
  fetch("/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tiktokUrl:url,avatarName:getAv(),productDesc:getPr(),mode:mode,splitChange:document.getElementById("sc").value})})
  .then(function(r){return r.json();})
  .then(function(data){
    if(data.error){showErr(data.error);return;}
    if(data.metadata){
      var m=data.metadata,s="";
      if(m.views)s+='<div class="stat"><div class="sval">'+Number(m.views).toLocaleString()+'</div><div class="slbl">views</div></div>';
      if(m.likes)s+='<div class="stat"><div class="sval">'+Number(m.likes).toLocaleString()+'</div><div class="slbl">likes</div></div>';
      if(m.author)s+='<div class="stat"><div class="sval">@'+m.author+'</div><div class="slbl">creator</div></div>';
      document.getElementById("stats").innerHTML=s;
    }
    resultTxt=data.result;
    document.getElementById("rtext").textContent=data.result;
    document.getElementById("res").style.display="block";
  })
  .catch(function(e){showErr("Error: "+e.message);})
  .finally(function(){
    document.getElementById("abtn").disabled=false;
    document.getElementById("abtn").textContent="ANALYZE →";
    document.getElementById("prog").style.display="none";
  });
}

function showErr(msg){
  document.getElementById("err").textContent=msg;
  document.getElementById("err").style.display="block";
  document.getElementById("prog").style.display="none";
  document.getElementById("abtn").disabled=false;
  document.getElementById("abtn").textContent="ANALYZE →";
}

function cp2(){
  navigator.clipboard.writeText(resultTxt);
  document.getElementById("cbtn").textContent="COPIED ✓";
  setTimeout(function(){document.getElementById("cbtn").textContent="COPY";},2000);
}

mkList(AV,"alist","hailey","av");
mkList(PR,"plist","lamp","pr");
</script>
</body>
</html>`;

app.get("/", (req, res) => res.send(HTML));

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

async function extractFrames(videoPath) {
  const outDir = path.join(os.tmpdir(), "frames_" + Date.now());
  fs.mkdirSync(outDir, { recursive: true });
  await new Promise((resolve, reject) => {
    ffmpeg(videoPath).on("end", resolve).on("error", reject)
      .screenshots({ count: 6, folder: outDir, filename: "frame_%i.jpg", size: "720x?" });
  });
  return fs.readdirSync(outDir).sort().map((f) => fs.readFileSync(path.join(outDir, f)).toString("base64"));
}

async function analyzeFrames(frames, metadata, avatarName, productDesc, mode, splitChange) {
  const imageContent = frames.map((b64) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }));
  const tasks = {
    copy: "Create an exact frame-for-frame Higgsfield video prompt recreating this video. Keep EVERY visual element identical — setting, camera angle, lighting, framing, body language. Only swap the person with the avatar below.",
    split: "Generate TWO Higgsfield prompts for A/B split test. Version A = original. Version B = change: " + splitChange + ". Avatar and action identical in both.",
    hook: "Analyze what makes the first 1-3 seconds stop the scroll, then write a Higgsfield prompt recreating ONLY that hook moment with the new avatar, making it hit harder."
  };
  const res = await axios.post("https://api.anthropic.com/v1/messages", {
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: "You are a TikTok video analyst and Higgsfield AI prompt engineer. Analyze frames precisely. Output ready-to-fire Higgsfield prompts. Style: UGC, iPhone, no color grading, no studio lighting, hyper realistic, action starts frame one.",
    messages: [{ role: "user", content: [...imageContent, { type: "text", text: "These are " + frames.length + " frames from a viral TikTok.\nViews: " + (metadata.playCount || "?") + " | Likes: " + (metadata.diggCount || "?") + "\nCaption: " + (metadata.text || "none") + "\nAVATAR: " + avatarName + "\nPRODUCT: " + productDesc + "\nTASK: " + tasks[mode] }] }]
  }, { headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" } });
  return (res.data.content.find((b) => b.type === "text") || {}).text || "";
}

app.post("/analyze", async (req, res) => {
  const { tiktokUrl, avatarName, productDesc, mode, splitChange } = req.body;
  if (!tiktokUrl) return res.status(400).json({ error: "tiktokUrl is required" });
  let videoPath = null;
  try {
    const metadata = await scrapeTikTok(tiktokUrl);
    if (!metadata) return res.status(400).json({ error: "Couldn't scrape that video." });
    const videoUrl = metadata.videoUrl || metadata.downloadAddr;
    if (!videoUrl) return res.status(400).json({ error: "No downloadable video found. Try a different URL." });
    videoPath = await downloadVideo(videoUrl);
    const frames = await extractFrames(videoPath);
    const prompt = await analyzeFrames(frames, metadata, avatarName || "Hailey", productDesc || "LumaForge lamp", mode || "copy", splitChange || "");
    res.json({ result: prompt, metadata: { views: metadata.playCount, likes: metadata.diggCount, shares: metadata.shareCount, author: metadata.authorMeta && metadata.authorMeta.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Something went wrong" });
  } finally {
    if (videoPath) { try { fs.unlinkSync(videoPath); } catch(e) {} }
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Running on port " + PORT));

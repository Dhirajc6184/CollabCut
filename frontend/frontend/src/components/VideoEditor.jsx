// FILE PATH: frontend/frontend/src/components/VideoEditor.jsx
// NEW FILE — create it (adapted from Project 2 VideoEditor.jsx)
//
// CHANGES vs Project 2 original:
//   A. Function signature: ({ project, user, token, onBack }) instead of ({ api, token, username, role, onSignOut })
//   B. Auto-loads the project video from CollabCut's media server on mount
//   C. videoSrc respects _projectVideoUrl for the initial project video
//   D. VideoCommentPanel uses projectId={project.id} instead of outputFilename
//   E. Header button says "← back to dashboard" and calls onBack
//   + Multi-tenant pipeline persistence via localStorage keyed by project.id

import { useState, useRef, useEffect, useCallback } from "react";
import VideoCommentPanel from "./VideoCommentPanel";
import SceneExtractor from "./SceneExtractor";

// ── Op definitions ─────────────────────────────────────────────────────────────
const OPS = [
  { id: "trim", icon: "✂", label: "trim", desc: "cut start / end", color: "#1db954" },
  { id: "resize", icon: "⊞", label: "resize", desc: "change resolution", color: "#4080ff" },
  { id: "crop", icon: "⊡", label: "crop", desc: "crop a region", color: "#f0a030" },
  { id: "text", icon: "T", label: "overlay text", desc: "draw text on video", color: "#d45380" },
  { id: "speed", icon: "⏩", label: "speed", desc: "fast or slow motion", color: "#9060e0" },
  { id: "volume", icon: "♪", label: "volume", desc: "adjust audio level", color: "#10a060" },
  { id: "audio", icon: "✕", label: "remove audio", desc: "strip the audio track", color: "#e05050" },
  { id: "grayscale", icon: "◑", label: "grayscale", desc: "black and white filter", color: "#707075" },
  { id: "thumbnail", icon: "⊙", label: "thumbnail", desc: "generate appealing thumbnail", color: "#e8a020", editorOnly: true },
  { id: "blur", icon: "◌", label: "blur", desc: "apply box blur effect", color: "#2080c0" },
  { id: "compress", icon: "⊿", label: "compress", desc: "reduce file size (h264)", color: "#50a020" },
  { id: "brightness", icon: "☀", label: "brightness", desc: "adjust brightness & contrast", color: "#c09030" },
  { id: "rotate", icon: "↻", label: "rotate", desc: "rotate 90 / 180 / 270°", color: "#a03080" },
];

const OP_DEFAULTS = {
  trim: { start: "00:00:00", end: "00:00:10" },
  resize: { width: "1280", height: "-1" },
  crop: { w: "720", h: "1280", x: "0", y: "0" },
  text: { text: "Hello World", x: "50", y: "50", size: "40", color: "white" },
  speed: { factor: "2.0" },
  volume: { level: "2.0" },
  audio: {},
  grayscale: {},
  thumbnail: {},
  blur: { amount: "10" },
  compress: { crf: "28" },
  brightness: { brightness: "0.1", contrast: "1.2" },
  rotate: { degrees: "90" },
};

function formatTime(s) {
  if (!isFinite(s) || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatTimeFull(s) {
  if (!isFinite(s) || s < 0) return "00:00.0";
  const m = Math.floor(s / 60);
  const secs = (s % 60).toFixed(1);
  const secStr = parseFloat(secs) < 10 ? "0" + secs : secs;
  return `${String(m).padStart(2, "0")}:${secStr}`;
}

// ── Param editor ───────────────────────────────────────────────────────────────
function ParamEditor({ op, vals, onChange }) {
  const set = (k, v) => onChange({ ...vals, [k]: v });
  const inp = (k, placeholder, type = "text") => (
    <input
      style={st.inp}
      type={type}
      value={vals[k] ?? ""}
      placeholder={placeholder}
      onChange={e => set(k, e.target.value)}
    />
  );

  switch (op) {
    case "trim":
      return <div style={st.paramRow}>
        <div style={st.paramG}><label style={st.paramL}>start</label>{inp("start", "00:00:05")}</div>
        <div style={st.paramG}><label style={st.paramL}>end</label>{inp("end", "00:00:15")}</div>
      </div>;
    case "resize":
      return <div style={st.paramRow}>
        <div style={st.paramG}><label style={st.paramL}>width</label>{inp("width", "1280", "number")}</div>
        <div style={st.paramG}><label style={st.paramL}>height</label>{inp("height", "-1", "number")}</div>
      </div>;
    case "crop":
      return <div style={st.paramRow}>
        {["w", "h", "x", "y"].map(k => (
          <div key={k} style={st.paramG}><label style={st.paramL}>{k}</label>{inp(k, "0", "number")}</div>
        ))}
      </div>;
    case "text":
      return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={st.paramG}>
          <label style={st.paramL}>text</label>
          <input style={{ ...st.inp, width: "100%", boxSizing: "border-box" }} value={vals.text ?? ""} placeholder="Hello World" onChange={e => set("text", e.target.value)} />
        </div>
        <div style={st.paramRow}>
          <div style={st.paramG}><label style={st.paramL}>x</label>{inp("x", "50", "number")}</div>
          <div style={st.paramG}><label style={st.paramL}>y</label>{inp("y", "50", "number")}</div>
          <div style={st.paramG}><label style={st.paramL}>size</label>{inp("size", "40", "number")}</div>
          <div style={st.paramG}><label style={st.paramL}>color</label>{inp("color", "white")}</div>
        </div>
      </div>;
    case "speed":
      return <div style={st.paramRow}>
        <div style={st.paramG}><label style={st.paramL}>factor</label>{inp("factor", "2.0", "number")}</div>
        <span style={st.hint}>0.5 = slow · 2.0 = fast</span>
      </div>;
    case "volume":
      return <div style={st.paramRow}>
        <div style={st.paramG}><label style={st.paramL}>level</label>{inp("level", "2.0", "number")}</div>
        <span style={st.hint}>1 = original · 2 = double</span>
      </div>;
    case "blur":
      return <div style={st.paramRow}>
        <div style={st.paramG}><label style={st.paramL}>radius</label>{inp("amount", "10", "number")}</div>
      </div>;
    case "compress":
      return <div style={st.paramRow}>
        <div style={st.paramG}><label style={st.paramL}>crf (0-51)</label>{inp("crf", "28", "number")}</div>
        <span style={st.hint}>lower = better quality</span>
      </div>;
    case "brightness":
      return <div style={st.paramRow}>
        <div style={st.paramG}><label style={st.paramL}>brightness</label>{inp("brightness", "0.1", "number")}</div>
        <div style={st.paramG}><label style={st.paramL}>contrast</label>{inp("contrast", "1.2", "number")}</div>
      </div>;
    case "rotate":
      return <div style={st.paramRow}>
        <div style={st.paramG}>
          <label style={st.paramL}>degrees</label>
          <select style={st.sel} value={vals.degrees ?? "90"} onChange={e => set("degrees", e.target.value)}>
            <option value="90">90 clockwise</option>
            <option value="180">180</option>
            <option value="270">270 clockwise</option>
          </select>
        </div>
      </div>;
    default:
      return <span style={st.hint}>no parameters needed</span>;
  }
}

// ── ThumbnailGenerator (unchanged from Project 2 — client-side canvas) ────────
function ThumbnailGenerator({ videoRef, currentTime, uploadedFile, api, token }) {
  const canvasRef = useRef(null);
  const scoreCanvasRef = useRef(null);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [style, setStyle] = useState("cinematic");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const STYLES = [
    { id: "cinematic", label: "cinematic", filter: "contrast(1.2) saturate(1.1) brightness(0.92)" },
    { id: "vibrant", label: "vibrant", filter: "saturate(1.8) contrast(1.1) brightness(1.05)" },
    { id: "moody", label: "moody", filter: "saturate(0.7) contrast(1.3) brightness(0.85) sepia(0.15)" },
    { id: "clean", label: "clean", filter: "saturate(1.0) contrast(1.0) brightness(1.0)" },
    { id: "warm", label: "warm", filter: "sepia(0.25) saturate(1.3) brightness(1.05)" },
    { id: "cold", label: "cold", filter: "hue-rotate(200deg) saturate(0.9) brightness(1.05)" },
  ];

  const scorePixels = (data) => {
    let rSum = 0, gSum = 0, bSum = 0, rSq = 0, gSq = 0, bSq = 0, darkPixels = 0, count = 0;
    const step = 4;
    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      rSum += r; gSum += g; bSum += b; rSq += r * r; gSq += g * g; bSq += b * b;
      if (lum < 20) darkPixels++;
      count++;
    }
    const rMean = rSum / count, gMean = gSum / count, bMean = bSum / count;
    const lumMean = 0.299 * rMean + 0.587 * gMean + 0.114 * bMean;
    const brightness = lumMean;
    const brightScore = brightness < 30 ? brightness / 30 * 0.3 : brightness < 60 ? 0.3 + (brightness - 30) / 30 * 0.4 : brightness < 180 ? 0.7 + (1 - Math.abs(brightness - 120) / 60) * 0.3 : brightness < 220 ? 0.7 - (brightness - 180) / 40 * 0.4 : 0.3;
    const rVar = (rSq / count) - rMean * rMean, gVar = (gSq / count) - gMean * gMean, bVar = (bSq / count) - bMean * bMean;
    const variance = (rVar + gVar + bVar) / 3;
    const sharpScore = Math.min(1, variance / 2000);
    const spread = Math.max(rMean, gMean, bMean) - Math.min(rMean, gMean, bMean);
    const colorScore = Math.min(1, spread / 80);
    const blackRatio = darkPixels / count;
    const blackPenalty = blackRatio > 0.4 ? 1 - (blackRatio - 0.4) / 0.6 : 1;
    const total_score = (brightScore * 0.35 + sharpScore * 0.45 + colorScore * 0.20) * blackPenalty;
    return { total: Math.round(total_score * 100), brightness: Math.round(brightScore * 100), sharpness: Math.round(sharpScore * 100), colorRichness: Math.round(colorScore * 100) };
  };

  const captureRaw = (v, canvas) => {
    const W = v.videoWidth || 1280, H = v.videoHeight || 720;
    const sw = Math.round(W / 4), sh = Math.round(H / 4);
    canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, sw, sh);
    return ctx.getImageData(0, 0, sw, sh).data;
  };

  const captureStyled = (v, canvas, styleId) => {
    const W = v.videoWidth || 1280, H = v.videoHeight || 720;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.filter = STYLES.find(s => s.id === styleId)?.filter || "none";
    ctx.drawImage(v, 0, 0, W, H);
    ctx.filter = "none";
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.40)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const seekTo = (v, t) => new Promise(resolve => {
    const onSeeked = () => { v.removeEventListener("seeked", onSeeked); resolve(); };
    v.addEventListener("seeked", onSeeked);
    v.currentTime = t;
  });

  const analyzeVideo = async () => {
    const v = videoRef.current, mainCanvas = canvasRef.current, scoreCanvas = scoreCanvasRef.current;
    if (!v || !mainCanvas || !scoreCanvas) return;
    const dur = v.duration;
    if (!isFinite(dur) || dur <= 0) { setError("Video not ready."); return; }
    setScanning(true); setError(null); setCandidates([]); setSelected(null); setSaved(false);
    const SAMPLES = 20, start = dur * 0.05, end = dur * 0.95, step = (end - start) / (SAMPLES - 1);
    const times = Array.from({ length: SAMPLES }, (_, i) => start + i * step);
    const results = [];
    const wasPaused = v.paused;
    if (!wasPaused) v.pause();
    for (let i = 0; i < times.length; i++) {
      try {
        await seekTo(v, times[i]);
        const pixels = captureRaw(v, scoreCanvas);
        const breakdown = scorePixels(pixels);
        const W = v.videoWidth || 1280, H = v.videoHeight || 720;
        mainCanvas.width = Math.round(W / 2); mainCanvas.height = Math.round(H / 2);
        const ctx = mainCanvas.getContext("2d");
        ctx.drawImage(v, 0, 0, mainCanvas.width, mainCanvas.height);
        const previewUrl = mainCanvas.toDataURL("image/jpeg", 0.7);
        results.push({ time: times[i], score: breakdown.total, breakdown, previewUrl });
      } catch (e) { }
      setScanProgress(Math.round(((i + 1) / times.length) * 100));
    }
    results.sort((a, b) => b.score - a.score);
    const top4 = [];
    for (const r of results) {
      if (top4.every(t => Math.abs(t.time - r.time) > 3)) { top4.push(r); if (top4.length === 4) break; }
    }
    const styled = [];
    for (const r of top4) {
      try { await seekTo(v, r.time); styled.push({ ...r, dataUrl: captureStyled(v, mainCanvas, style) }); }
      catch (e) { styled.push({ ...r, dataUrl: r.previewUrl }); }
    }
    await seekTo(v, v.currentTime);
    if (!wasPaused) v.play().catch(() => { });
    setCandidates(styled); setSelected(0); setScanning(false); setScanProgress(0);
  };

  const applyStyleToCandidates = async () => {
    const v = videoRef.current, mainCanvas = canvasRef.current;
    if (!v || !mainCanvas || candidates.length === 0) return;
    const wasPaused = v.paused; if (!wasPaused) v.pause();
    const restyled = [];
    for (const c of candidates) {
      try { await seekTo(v, c.time); restyled.push({ ...c, dataUrl: captureStyled(v, mainCanvas, style) }); }
      catch (e) { restyled.push(c); }
    }
    await seekTo(v, v.currentTime); if (!wasPaused) v.play().catch(() => { });
    setCandidates(restyled);
  };

  const download = () => {
    if (selected === null || !candidates[selected]) return;
    const a = document.createElement("a");
    a.href = candidates[selected].dataUrl;
    a.download = "thumbnail_" + (uploadedFile?.original_name?.replace(/\.[^.]+$/, "") || "frame") + "_" + Math.round(candidates[selected].time) + "s.jpg";
    a.click();
  };

  const saveThumb = async () => {
    if (selected === null || !candidates[selected] || !uploadedFile) return;
    setSaved(false); setError(null);
    try {
      const blob = await (await fetch(candidates[selected].dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, "thumbnail_" + uploadedFile.filename.replace(/\.[^.]+$/, "") + ".jpg");
      const res = await fetch(api + "/upload", { method: "POST", headers: { Authorization: "Bearer " + token }, body: fd });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (e) { setError(e.message); }
  };

  const thumb = selected !== null ? candidates[selected] : null;

  return (
    <div style={{ padding: "0 0 4px" }}>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas ref={scoreCanvasRef} style={{ display: "none" }} />
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: "#555558", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>visual style</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s.id)} style={{ background: style === s.id ? "#e8a02022" : "#1a1a1d", border: "1px solid " + (style === s.id ? "#e8a020" : "#2a2a2e"), color: style === s.id ? "#e8a020" : "#8a8a90", padding: "2px 7px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={analyzeVideo} disabled={scanning} style={{ width: "100%", padding: "7px 0", background: scanning ? "#1a1a1d" : "#2a1a00", border: "1px solid #e8a020", color: "#e8a020", cursor: scanning ? "default" : "pointer", fontSize: 11, fontFamily: "inherit", letterSpacing: ".04em", borderRadius: 6, marginBottom: 8 }}>
        {scanning ? ("scanning... " + scanProgress + "%") : "⊙ find best thumbnails"}
      </button>
      {scanning && <div style={{ height: 2, background: "#1a1a1d", borderRadius: 1, marginBottom: 10, overflow: "hidden" }}><div style={{ height: "100%", width: scanProgress + "%", background: "#e8a020", borderRadius: 1, transition: "width .1s" }} /></div>}
      {error && <div style={{ fontSize: 10, color: "#e07070", marginBottom: 8, padding: "6px 8px", background: "#2a1010", borderRadius: 4 }}>{error}</div>}
      {candidates.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: "#555558", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>top 4 frames — click to select</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {candidates.map((c, i) => (
              <div key={i} onClick={() => setSelected(i)} style={{ position: "relative", cursor: "pointer", borderRadius: 4, overflow: "hidden", border: "1px solid " + (selected === i ? "#e8a020" : "#2a2a2e"), boxSizing: "border-box" }}>
                <img src={c.dataUrl} alt={"candidate " + i} style={{ width: "100%", display: "block" }} />
                <div style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.75)", borderRadius: 3, fontSize: 9, color: "#e8a020", padding: "1px 4px", fontWeight: 600 }}>{c.score}</div>
                <div style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(0,0,0,0.65)", borderRadius: 3, fontSize: 8, color: "rgba(255,255,255,0.7)", padding: "1px 4px" }}>{formatTimeFull(c.time)}</div>
                {selected === i && <div style={{ position: "absolute", inset: 0, border: "2px solid #e8a020", borderRadius: 4, pointerEvents: "none" }} />}
                <div style={{ position: "absolute", top: 3, left: 3, background: i === 0 ? "#e8a020" : "rgba(0,0,0,0.65)", color: i === 0 ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 3, fontSize: 8, padding: "1px 4px", fontWeight: 600 }}>#{i + 1}</div>
              </div>
            ))}
          </div>
          <button onClick={applyStyleToCandidates} style={{ marginTop: 5, width: "100%", padding: "5px 0", background: "#1a1a1d", border: "1px solid #2a2a2e", color: "#8a8a90", cursor: "pointer", fontSize: 10, fontFamily: "inherit", borderRadius: 4 }}>
            ↺ apply "{style}" style to all
          </button>
        </div>
      )}
      {thumb && (
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[{ label: "sharp", val: thumb.breakdown.sharpness }, { label: "bright", val: thumb.breakdown.brightness }, { label: "color", val: thumb.breakdown.colorRichness }].map(m => (
              <div key={m.label} style={{ flex: 1, background: "#1a1a1d", border: "1px solid #2a2a2e", borderRadius: 4, padding: "4px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#555558", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: m.val > 60 ? "#e8a020" : "#8a8a90", fontWeight: 600 }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={download} style={{ flex: 1, padding: "6px 0", background: "#1a1a1d", border: "1px solid #2a2a2e", color: "#e8e8ea", cursor: "pointer", fontSize: 10, fontFamily: "inherit", borderRadius: 5 }}>↓ download</button>
            <button onClick={saveThumb} style={{ flex: 1, padding: "6px 0", background: saved ? "#0a1a0a" : "#1a1a1d", border: "1px solid " + (saved ? "#1db954" : "#2a2a2e"), color: saved ? "#1db954" : "#8a8a90", cursor: "pointer", fontSize: 10, fontFamily: "inherit", borderRadius: 5 }}>{saved ? "✓ saved" : "⊕ save to server"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Timeline (unchanged from Project 2) ────────────────────────────────────────
function Timeline({ duration, currentTime, clips, onSeek, onClipChange, onParamWriteback }) {
  const railRef = useRef(null);
  const rulerRef = useRef(null);
  const [clipDrag, setClipDrag] = useState(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [hoverTime, setHoverTime] = useState(null);

  const pct = t => duration > 0 ? Math.max(0, Math.min(100, (t / duration) * 100)) : 0;
  const xToTime = (x, ref) => {
    if (!ref || !ref.current) return 0;
    const r = ref.current.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((x - r.left) / r.width) * duration));
  };

  const onRulerMouseDown = e => { e.preventDefault(); e.stopPropagation(); onSeek(xToTime(e.clientX, rulerRef)); setScrubbing("ruler"); };
  const onRailClick = e => { if (clipDrag) return; onSeek(xToTime(e.clientX, railRef)); };
  const onRailMouseMove = e => {
    if (!railRef.current) return;
    const r = railRef.current.getBoundingClientRect();
    setHoverTime({ time: xToTime(e.clientX, railRef), x: e.clientX - r.left });
  };
  const onClipMouseDown = (e, idx, type) => { e.stopPropagation(); e.preventDefault(); const c = clips[idx]; setClipDrag({ idx, type, startX: e.clientX, origStart: c.start, origEnd: c.end }); };
  const onPlayheadMouseDown = e => { e.stopPropagation(); e.preventDefault(); setScrubbing("rail"); };

  useEffect(() => {
    if (!clipDrag && !scrubbing) return;
    const onMove = e => {
      if (scrubbing) { onSeek(xToTime(e.clientX, scrubbing === "ruler" ? rulerRef : railRef)); return; }
      if (!clipDrag || !railRef.current) return;
      const r = railRef.current.getBoundingClientRect();
      const dx = ((e.clientX - clipDrag.startX) / r.width) * duration;
      const c = clips[clipDrag.idx];
      let s = c.start, en = c.end;
      if (clipDrag.type === "move") { const w = clipDrag.origEnd - clipDrag.origStart; s = Math.max(0, Math.min(duration - w, clipDrag.origStart + dx)); en = s + w; }
      else if (clipDrag.type === "left") { s = Math.max(0, Math.min(clipDrag.origEnd - 0.5, clipDrag.origStart + dx)); en = clipDrag.origEnd; }
      else { s = clipDrag.origStart; en = Math.min(duration, Math.max(clipDrag.origStart + 0.5, clipDrag.origEnd + dx)); }
      s = Math.round(s * 100) / 100; en = Math.round(en * 100) / 100;
      onClipChange(clipDrag.idx, { ...c, start: s, end: en });
      if (clipDrag.type === "left") onSeek(s); else if (clipDrag.type === "right") onSeek(en); else onSeek(s);
      const label = clipDrag.type === "left" ? ("in: " + formatTimeFull(s)) : clipDrag.type === "right" ? ("out: " + formatTimeFull(en)) : (formatTimeFull(s) + " to " + formatTimeFull(en));
      const tipX = Math.min(Math.max(e.clientX - (railRef.current ? railRef.current.getBoundingClientRect().left : 0), 40), r.width - 40);
      setTooltip({ x: tipX, label });
    };
    const onUp = () => {
      if (clipDrag) { const c = clips[clipDrag.idx]; onParamWriteback(c.id, c.op, c.start, c.end); setClipDrag(null); setTooltip(null); }
      setScrubbing(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [clipDrag, scrubbing, clips, duration, onClipChange, onParamWriteback, onSeek]);

  const tickInt = duration <= 30 ? 5 : duration <= 120 ? 15 : duration <= 600 ? 30 : 60;
  const ticks = [];
  for (let t = 0; t <= duration; t += tickInt) ticks.push(t);
  const playheadPct = pct(currentTime);

  return (
    <div style={st.tlWrap}>
      <div ref={rulerRef} style={{ ...st.ruler, cursor: "col-resize" }} onMouseDown={onRulerMouseDown}>
        {ticks.map(t => (
          <div key={t} style={{ ...st.tick, left: (pct(t) + "%") }}>
            <div style={st.tickLine} /><span style={st.tickLabel}>{formatTime(t)}</span>
          </div>
        ))}
        <div style={{ ...st.rulerPlayhead, left: (playheadPct + "%") }} />
      </div>
      <div ref={railRef} style={{ ...st.rail, cursor: clipDrag ? "grabbing" : "crosshair" }} onClick={onRailClick} onMouseMove={onRailMouseMove} onMouseLeave={() => setHoverTime(null)}>
        {hoverTime && !clipDrag && (<div style={{ ...st.ghostLine, left: hoverTime.x }}><div style={st.ghostTime}>{formatTimeFull(hoverTime.time)}</div></div>)}
        {clips.map((clip, idx) => {
          const def = OPS.find(o => o.id === clip.op); const color = def ? def.color : "#888"; const w = pct(clip.end - clip.start);
          return (
            <div key={clip.id} title={(clip.op + ": " + formatTime(clip.start) + " to " + formatTime(clip.end))}
              style={{ ...st.clip, left: (pct(clip.start) + "%"), width: (Math.max(w, 0.4) + "%"), background: color + "28", border: `1px solid ${color}`, outline: clipDrag && clipDrag.idx === idx ? `2px solid ${color}` : "none" }}
              onMouseDown={e => onClipMouseDown(e, idx, "move")}>
              <div style={st.clipHandle} onMouseDown={e => onClipMouseDown(e, idx, "left")} />
              <span style={{ ...st.clipLabel, color }}>{clip.op}</span>
              <div style={{ ...st.clipHandle, right: 0, left: "auto" }} onMouseDown={e => onClipMouseDown(e, idx, "right")} />
            </div>
          );
        })}
        {tooltip && (<div style={{ ...st.tooltip, left: tooltip.x }}>{tooltip.label}</div>)}
        <div style={{ ...st.playhead, left: (playheadPct + "%") }} onMouseDown={onPlayheadMouseDown} />
      </div>
      <div style={st.waveRow}>
        <span style={st.trackLbl}>audio</span>
        <div style={st.wave}>
          {Array.from({ length: 80 }).map((_, i) => {
            const filled = duration > 0 && (currentTime / duration) > (i / 80);
            return (<div key={i} style={{ ...st.waveBar, height: (20 + Math.abs(Math.sin(i * 0.4) * 60 + Math.cos(i * 0.7) * 20)) + "%", opacity: filled ? 1 : 0.25, background: filled ? "#1db954" : "#1a3a25" }} />);
          })}
        </div>
      </div>
      <div style={st.inOutRow}>
        <span style={st.inOutLabel}>{formatTime(0)}</span>
        <span style={{ ...st.inOutLabel, color: "#1db954", fontWeight: 600 }}>{formatTimeFull(currentTime)}</span>
        <span style={{ ...st.inOutLabel, textAlign: "right" }}>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

// ── Main VideoEditor ───────────────────────────────────────────────────────────
// CHANGE A: accepts { project, user, token, onBack } instead of proj2 props
export default function VideoEditor({ project, user, token, onBack }) {
  // Derived from new props (same names as proj2 uses internally)
  const api = "http://127.0.0.1:8000/api/editor";
  const username = user?.name || "";
  const role = user?.role || "editor";
  const onSignOut = onBack;

  const [uploadedFile, setUploadedFile] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [clips, setClips] = useState([]);
  const [selectedOp, setSelectedOp] = useState(null);
  const [opVals, setOpVals] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activePanel, setActivePanel] = useState("ops");
  const [draggingFile, setDraggingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [scrubDragging, setScrubDragging] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const rafRef = useRef(null);
  const scrubBarRef = useRef(null);
  const scrubDragRef = useRef(false);

  const dur = duration || (uploadedFile && uploadedFile.duration) || 0;

  // ── CHANGE B: auto-load the project video from CollabCut's /media/ ──────────
  useEffect(() => {
    if (project?.video) {
      const projectVideoUrl = `http://127.0.0.1:8000${project.video}`;
      setUploadedFile({
        filename: project.video.split("/").pop(),
        original_name: project.name + " (project video)",
        duration: null,
        width: null,
        height: null,
        size_mb: null,
        _projectVideoUrl: projectVideoUrl,   // signals to videoSrc which URL to use
      });
    }
  }, [project?.id]);

  // ── Multi-tenant persistence: save/restore pipeline per project ──────────────
  const STORAGE_KEY = `collabcut_pipeline_${project?.id}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { pipeline: p, clips: c } = JSON.parse(saved);
        if (p) setPipeline(p);
        if (c) setClips(c);
      } catch (e) { /* ignore corrupt data */ }
    }
  }, [project?.id]);

  useEffect(() => {
    if (pipeline.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pipeline, clips }));
    }
  }, [pipeline, clips]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      const v = videoRef.current;
      if (!v) return;
      if (e.code === "Space") { e.preventDefault(); if (v.paused || v.ended) v.play().catch(() => { }); else v.pause(); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); seek(Math.max(0, v.currentTime - (e.shiftKey ? 1 : 5))); }
      else if (e.code === "ArrowRight") { e.preventDefault(); seek(Math.min(dur, v.currentTime + (e.shiftKey ? 1 : 5))); }
      else if (e.code === "Home") { e.preventDefault(); seek(0); }
      else if (e.code === "End") { e.preventDefault(); seek(dur); }
      else if (e.code === "Period") { e.preventDefault(); seek(Math.min(dur, v.currentTime + 1 / 30)); }
      else if (e.code === "Comma") { e.preventDefault(); seek(Math.max(0, v.currentTime - 1 / 30)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dur]);

  const seek = useCallback(t => {
    const v = videoRef.current;
    const clamped = Math.max(0, Math.min(dur || 999999, t));
    setCurrentTime(clamped);
    if (v) v.currentTime = clamped;
  }, [dur]);

  const scrubTimeFromEvent = useCallback(e => {
    const bar = scrubBarRef.current;
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    seek(ratio * (dur || 0));
  }, [dur, seek]);

  const onScrubMouseDown = useCallback(e => {
    e.preventDefault();
    scrubDragRef.current = true;
    setScrubDragging(true);
    scrubTimeFromEvent(e);
    const onMove = ev => { if (scrubDragRef.current) scrubTimeFromEvent(ev); };
    const onUp   = ev => {
      scrubDragRef.current = false;
      setScrubDragging(false);
      scrubTimeFromEvent(ev);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [scrubTimeFromEvent]);

  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused || v.ended) v.play().catch(() => { }); else v.pause(); };
  const setRate = r => { setPlaybackRate(r); if (videoRef.current) videoRef.current.playbackRate = r; };

  // ── Upload ────────────────────────────────────────────────────────────────────
  const doUpload = file => {
    if (!file) return;
    setUploadStatus("uploading..."); setUploadProgress(10);
    const fd = new FormData();
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", api + "/upload/");
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 85) + 10); };
    xhr.onload = () => {
      setUploadProgress(100);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        setUploadedFile(data); setDuration(data.duration || 0); setCurrentTime(0);
        setUploadStatus(null); setPipeline([]); setClips([]); setResult(null); setError(null); setIsPlaying(false);
      } else if (xhr.status === 401) {
        setUploadStatus("session expired"); onSignOut();
      } else {
        const err = JSON.parse(xhr.responseText);
        setUploadStatus("error: " + err.detail); setUploadProgress(0);
      }
    };
    xhr.onerror = () => { setUploadStatus("upload failed — is the backend running?"); setUploadProgress(0); };
    xhr.send(fd);
  };

  // ── Pipeline ──────────────────────────────────────────────────────────────────
  const addOp = () => {
    if (!selectedOp) return;
    const def = OPS.find(o => o.id === selectedOp);
    const _key = Date.now() + Math.random();
    const vals = Object.assign({}, OP_DEFAULTS[selectedOp], opVals);
    setPipeline(prev => [...prev, { id: selectedOp, _key, vals, label: def.label, color: def.color }]);
    const clipStart = selectedOp === "trim" && vals.start ? timeStrToSec(vals.start) : 0;
    const clipEnd = selectedOp === "trim" && vals.end ? timeStrToSec(vals.end) : (dur || 60);
    setClips(prev => [...prev, { id: _key, op: selectedOp, start: clipStart, end: Math.min(clipEnd, dur || 60) }]);
    setOpVals({}); setActivePanel("pipeline");
  };

  const removeOp = key => { setPipeline(prev => prev.filter(s => s._key !== key)); setClips(prev => prev.filter(c => c.id !== key)); };

  const moveOp = (from, to) => {
    if (to < 0 || to >= pipeline.length) return;
    setPipeline(prev => { const next = [...prev]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; });
  };

  const handleParamWriteback = useCallback((id, op, start, end) => {
    setPipeline(prev => prev.map(step => {
      if (step._key !== id) return step;
      const vals = Object.assign({}, step.vals);
      if (op === "trim") { vals.start = secToTimeStr(start); vals.end = secToTimeStr(end); }
      else if (op === "text") { vals._enable_start = start.toFixed(2); vals._enable_end = end.toFixed(2); }
      else if (["speed", "blur", "brightness", "grayscale", "volume"].includes(op)) { vals._segment_start = start.toFixed(2); vals._segment_end = end.toFixed(2); }
      return Object.assign({}, step, { vals });
    }));
  }, []);

  // ── Process ───────────────────────────────────────────────────────────────────
  const process = async () => {
    if (!uploadedFile || pipeline.length === 0) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      const res = await fetch(api + "/process/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          input_filename: uploadedFile.filename,
          output_filename: "output_" + Date.now() + ".mp4",
          operations: pipeline.map(({ id, vals }) => ({ id, vals })),
        }),
      });
      if (res.status === 401) { onSignOut(); return; }
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Processing failed"); }
      const data = await res.json();
      setResult(Object.assign({}, data, { url: "http://127.0.0.1:8000" + data.output_url }));
      setCurrentTime(0); setDuration(0);
    } catch (e) { setError(e.message); }
    finally { setProcessing(false); }
  };

  // ── Command preview ───────────────────────────────────────────────────────────
  const buildCmd = () => {
    if (!uploadedFile || pipeline.length === 0) return "";
    let cmd = "ffmpeg -y";
    const vf = [], af = [], extra = [];
    const trimOp = pipeline.find(s => s.id === "trim");
    if (trimOp) { if (trimOp.vals.start) cmd += " -ss " + trimOp.vals.start; if (trimOp.vals.end) cmd += " -to " + trimOp.vals.end; }
    cmd += " -i " + uploadedFile.filename;
    pipeline.forEach(({ id, vals }) => {
      if (id === "trim") return;
      if (id === "resize") vf.push("scale=" + vals.width + ":" + vals.height);
      else if (id === "crop") vf.push("crop=" + vals.w + ":" + vals.h + ":" + vals.x + ":" + vals.y);
      else if (id === "text") vf.push("drawtext=text='" + vals.text + "':x=" + vals.x + ":y=" + vals.y + ":fontsize=" + vals.size + ":fontcolor=" + vals.color);
      else if (id === "speed") { vf.push("setpts=" + round(1 / parseFloat(vals.factor || 2), 4) + "*PTS"); af.push("atempo=" + vals.factor); }
      else if (id === "grayscale") vf.push("hue=s=0");
      else if (id === "blur") vf.push("boxblur=" + vals.amount);
      else if (id === "brightness") vf.push("eq=brightness=" + vals.brightness + ":contrast=" + vals.contrast);
      else if (id === "rotate") vf.push("transpose=" + ({ "90": "1", "180": "2,transpose=2", "270": "2" }[vals.degrees] || "1"));
      else if (id === "audio") extra.push("-an");
      else if (id === "volume") af.push("volume=" + vals.level);
      else if (id === "compress") extra.push("-vcodec libx264 -crf " + vals.crf + " -preset fast");
    });
    if (vf.length) cmd += " -vf \"" + vf.join(",") + "\"";
    if (af.length) cmd += " -af \"" + af.join(",") + "\"";
    if (extra.length) cmd += " " + extra.join(" ");
    cmd += " output.mp4";
    return cmd;
  };

  // CHANGE C: videoSrc respects _projectVideoUrl for the initial project video
  const videoSrc = result
    ? result.url
    : uploadedFile
      ? (uploadedFile._projectVideoUrl || (api + "/files/" + uploadedFile.filename))
      : null;

  // ── rAF-based playhead sync ───────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tick    = () => { setCurrentTime(v.currentTime); if (!v.paused && !v.ended) rafRef.current = requestAnimationFrame(tick); };
    const onPlay  = () => { rafRef.current = requestAnimationFrame(tick); setIsPlaying(true); };
    const onPause = () => { cancelAnimationFrame(rafRef.current); setIsPlaying(false); setCurrentTime(v.currentTime); };
    const onEnded = () => { cancelAnimationFrame(rafRef.current); setIsPlaying(false); setCurrentTime(v.currentTime); };
    const onMeta  = () => { setDuration(v.duration || 0); setCurrentTime(v.currentTime); };
    v.addEventListener("play",            onPlay);
    v.addEventListener("pause",           onPause);
    v.addEventListener("ended",           onEnded);
    v.addEventListener("loadedmetadata",  onMeta);
    v.addEventListener("durationchange",  onMeta);
    if (v.readyState >= 1) onMeta();
    return () => { cancelAnimationFrame(rafRef.current); v.removeEventListener("play",onPlay); v.removeEventListener("pause",onPause); v.removeEventListener("ended",onEnded); v.removeEventListener("loadedmetadata",onMeta); v.removeEventListener("durationchange",onMeta); };
  }, []);

  return (
    <div style={st.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0d0d0f; }
        ::-webkit-scrollbar-thumb { background:#2a2a2e; border-radius:2px; }
        input[type=range] { accent-color:#1db954; }
      `}</style>

      {/* Header */}
      <header style={st.header}>
        <div style={st.headerL}>
          <span style={st.logo}>▶ CollabCut Editor</span>
          {uploadedFile && (
            <span style={st.fileMeta}>
              {project?.name || uploadedFile.original_name}
              {dur ? " · " + formatTimeFull(dur) : ""}
              {uploadedFile.width ? " · " + uploadedFile.width + "x" + uploadedFile.height : ""}
              {uploadedFile.size_mb ? " · " + uploadedFile.size_mb + "MB" : ""}
            </span>
          )}
        </div>
        <div style={st.headerR}>
          {uploadedFile && (
            <div style={st.shortcuts}>
              <span style={st.shortcutKey}>Space</span>play
              <span style={st.shortcutKey}>←→</span>5s
              <span style={st.shortcutKey}>⇧+←→</span>1s
              <span style={st.shortcutKey}>,.</span>frame
            </div>
          )}
          <span style={st.userBadge}>● {username}</span>
          {/* CHANGE E: "← back to dashboard" */}
          <button style={st.signOut} onClick={onSignOut}>← back to dashboard</button>
        </div>
      </header>

      <div style={st.body}>
        {/* Sidebar */}
        <aside style={st.sidebar}>
          <div style={st.tabs}>
            <button style={Object.assign({}, st.tab, activePanel === "ops" ? st.tabActive : {})} onClick={() => setActivePanel("ops")}>operations</button>
            <button style={Object.assign({}, st.tab, activePanel === "pipeline" ? st.tabActive : {})} onClick={() => setActivePanel("pipeline")}>
              pipeline {pipeline.length > 0 && <span style={st.badge}>{pipeline.length}</span>}
            </button>
            <button style={Object.assign({}, st.tab, activePanel === "scenes" ? st.tabActive : {})} onClick={() => setActivePanel("scenes")}>scenes</button>
          </div>

          {activePanel === "ops" && (
            <div style={st.opList}>
              {OPS.filter(op => !op.editorOnly || role === "editor").map(op => (
                <div key={op.id}
                  style={Object.assign({}, st.opItem, selectedOp === op.id ? { background: "#161616", borderLeft: "2px solid " + op.color } : {})}
                  onClick={() => { setSelectedOp(op.id); setOpVals(Object.assign({}, OP_DEFAULTS[op.id])); }}
                >
                  <span style={Object.assign({}, st.opIcon, { color: op.color, background: op.color + "20" })}>{op.icon}</span>
                  <div><div style={st.opLabel}>{op.label}</div><div style={st.opDesc}>{op.desc}</div></div>
                </div>
              ))}
            </div>
          )}

          {activePanel === "pipeline" && (
            <div style={st.pipeList}>
              {pipeline.length === 0
                ? <div style={st.emptyPipe}>select an operation and click "add to pipeline"</div>
                : pipeline.map((step, idx) => (
                  <div key={step._key} style={st.pipeStep}>
                    <span style={st.pipeNum}>{idx + 1}</span>
                    <span style={Object.assign({}, st.pipeTag, { background: step.color + "22", color: step.color })}>{step.id}</span>
                    <span style={st.pipeVals}>
                      {Object.entries(step.vals).filter(([k, v]) => v !== "" && !k.startsWith("_")).map(([k, v]) => k + ": " + v).join(" · ")}
                    </span>
                    <div style={st.pipeActions}>
                      <button style={st.pipeBtn} onClick={() => moveOp(idx, idx - 1)} disabled={idx === 0}>↑</button>
                      <button style={st.pipeBtn} onClick={() => moveOp(idx, idx + 1)} disabled={idx === pipeline.length - 1}>↓</button>
                      <button style={Object.assign({}, st.pipeBtn, { color: "#e05050" })} onClick={() => removeOp(step._key)}>✕</button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {activePanel === "scenes" && (
            <SceneExtractor
              token={token}
              uploadedFilename={uploadedFile?.filename || null}
              apiBase={api}
              videoSrc={videoSrc}
            />
          )}

          {activePanel === "ops" && selectedOp && (
            <div style={st.paramPanel}>
              <div style={st.paramTitle}>{selectedOp.replace("_", " ")} options</div>
              {selectedOp === "thumbnail" ? (
                <ThumbnailGenerator videoRef={videoRef} currentTime={currentTime} uploadedFile={uploadedFile} api={api} token={token} />
              ) : (
                <>
                  <ParamEditor op={selectedOp} vals={opVals} onChange={setOpVals} />
                  <button style={st.addBtn} onClick={addOp}>+ add to pipeline</button>
                </>
              )}
            </div>
          )}
        </aside>

        {/* Main */}
        <main style={st.main}>
          <div
            style={Object.assign({}, st.preview, draggingFile ? { outline: "2px dashed #1db954" } : {})}
            onDrop={e => { e.preventDefault(); setDraggingFile(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("video/")) doUpload(f); }}
            onDragOver={e => { e.preventDefault(); setDraggingFile(true); }}
            onDragLeave={() => setDraggingFile(false)}
          >
            {!videoSrc ? (
              <div style={st.dropZone} onClick={() => fileInputRef.current.click()}>
                <div style={st.dropIcon}>◈</div>
                <div style={st.dropTitle}>drop a video file or upload a new version</div>
                <div style={st.dropSub}>mp4 · mov · avi · mkv · webm</div>
                {uploadStatus && (
                  <div style={{ marginTop: 16, width: "100%", maxWidth: 280 }}>
                    <div style={st.progressBar}><div style={Object.assign({}, st.progressFill, { width: uploadProgress + "%" })} /></div>
                    <div style={st.uploadStatus}>{uploadStatus}</div>
                  </div>
                )}
              </div>
            ) : null}
            <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => e.target.files[0] && doUpload(e.target.files[0])} />
            <video ref={videoRef} src={videoSrc || undefined} crossOrigin="anonymous" style={{ ...st.videoEl, display: videoSrc ? "block" : "none" }} onClick={togglePlay} preload="auto" />
          </div>

          {uploadedFile && (
            <div style={st.controls}>
              <button style={st.ctrlBtn} onClick={() => seek(0)} title="Start">⏮</button>
              <button style={st.ctrlBtn} onClick={() => seek(Math.max(0, currentTime - 5))} title="Back 5s">⏪</button>
              <button style={Object.assign({}, st.ctrlBtn, { color: "#1db954", fontSize: 16 })} onClick={togglePlay}>{isPlaying ? "⏸" : "▶"}</button>
              <button style={st.ctrlBtn} onClick={() => seek(Math.min(dur, currentTime + 5))} title="Forward 5s">⏩</button>
              <button style={st.ctrlBtn} onClick={() => seek(dur)} title="End">⏭</button>
              <div ref={scrubBarRef} style={{ ...st.scrubBar, position: "relative", height: 18, display: "flex", alignItems: "center", cursor: "col-resize" }} onMouseDown={onScrubMouseDown}>
                <div style={{ position: "absolute", left: 0, right: 0, height: scrubDragging ? 5 : 3, background: "#1a1a1d", borderRadius: 3, overflow: "hidden", transition: "height .1s" }}>
                  <div style={{ height: "100%", width: (dur > 0 ? (currentTime / dur) * 100 : 0) + "%", background: "#1db954", borderRadius: 3, transition: scrubDragging ? "none" : "width .05s" }} />
                </div>
                {dur > 0 && (<div style={{ position: "absolute", left: (currentTime / dur) * 100 + "%", transform: "translateX(-50%)", width: scrubDragging ? 14 : 10, height: scrubDragging ? 14 : 10, background: "#1db954", borderRadius: "50%", transition: scrubDragging ? "none" : "left .05s, width .1s, height .1s", pointerEvents: "none" }} />)}
              </div>
              <span style={st.timeDisp}>{formatTimeFull(currentTime)} / {formatTimeFull(dur)}</span>
              <select style={st.rateSelect} value={playbackRate} onChange={e => setRate(parseFloat(e.target.value))}>
                <option value={0.25}>0.25x</option><option value={0.5}>0.5x</option><option value={1}>1x</option><option value={1.5}>1.5x</option><option value={2}>2x</option>
              </select>
              <button style={st.newBtn} onClick={() => {
                // Clear localStorage so cleared pipeline doesn't restore on next load
                if (project?.id) {
                  localStorage.removeItem(`collabcut_pipeline_${project.id}`);
                }
                setUploadedFile(null);
                setPipeline([]);
                setClips([]);
                setResult(null);
                setError(null);
                setCurrentTime(0);
                setDuration(0);
                setIsPlaying(false);
              }}>new video</button>
              {result && (<a href={result.url} download={result.output_filename} style={st.downloadBtn}>↓ download</a>)}
            </div>
          )}

          {uploadedFile && (
            <Timeline duration={dur} currentTime={currentTime} clips={clips} onSeek={seek}
              onClipChange={(idx, clip) => setClips(prev => prev.map((c, i) => i === idx ? clip : c))}
              onParamWriteback={handleParamWriteback}
            />
          )}

          {uploadedFile && pipeline.length > 0 && (
            <div style={st.cmdBox}>
              <div style={st.cmdLabel}>generated command</div>
              <pre style={st.cmdPre}>{buildCmd()}</pre>
            </div>
          )}

          {uploadedFile && (
            <div style={st.runRow}>
              <button
                style={Object.assign({}, st.runBtn, { opacity: pipeline.length === 0 || processing ? 0.5 : 1 })}
                onClick={process} disabled={pipeline.length === 0 || processing}
              >
                {processing ? <><span style={st.spinner} /> processing…</> : ("run pipeline (" + pipeline.length + " step" + (pipeline.length !== 1 ? "s" : "") + ")")}
              </button>
            </div>
          )}

          {error && <div style={st.errorBox}><strong>error:</strong> {error}</div>}

          {result && (
            <div style={st.resultBox}>
              <div style={st.resultHead}>output ready</div>
              <div style={st.resultMeta}>
                <span style={st.metaChip}>size: {result.size_mb} MB</span>
                <span style={Object.assign({}, st.metaChip, { color: "#1db954" })}>done</span>
                <a href={result.url} target="_blank" rel="noreferrer" style={Object.assign({}, st.metaChip, { color: "#4080ff", textDecoration: "none" })}>open in tab</a>
              </div>
            </div>
          )}

          {/* CHANGE D: VideoCommentPanel uses projectId={project.id} */}
          {uploadedFile && (
            <div style={{ margin: "8px 16px 16px", padding: "12px 14px", background: "#0e0e0e", border: "1px solid #1a1a1d", borderRadius: 8 }}>
              <VideoCommentPanel
                projectId={project?.id}
                currentTime={currentTime}
                duration={dur}
                token={token}
                currentUser={username}
                currentRole={role}
                apiBase={api}
                onSeek={seek}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeStrToSec(str) {
  if (!str) return 0;
  const parts = String(str).split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseFloat(str) || 0;
}

function secToTimeStr(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

function round(n, dp) { const f = Math.pow(10, dp); return Math.round(n * f) / f; }

// ── Styles (identical to Project 2 — no changes needed) ───────────────────────
const st = {
  root: { display: "flex", flexDirection: "column", height: "100vh", background: "#0d0d0f", color: "#e8e8ea", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 52, borderBottom: "1px solid #2a2a2e", background: "#141416", flexShrink: 0 },
  headerL: { display: "flex", alignItems: "center", gap: 16 },
  headerR: { display: "flex", alignItems: "center", gap: 12 },
  logo: { color: "#1db954", fontWeight: 600, fontSize: 14, letterSpacing: ".05em" },
  fileMeta: { fontSize: 11, color: "#555558", background: "#1a1a1d", border: "1px solid #2a2a2e", padding: "3px 10px", borderRadius: 20 },
  userBadge: { fontSize: 11, color: "#1db954" },
  signOut: { background: "none", border: "none", color: "#555558", cursor: "pointer", fontSize: 11, fontFamily: "inherit" },
  shortcuts: { display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#38383e" },
  shortcutKey: { background: "#1a1a1d", border: "1px solid #2a2a2e", color: "#555558", padding: "1px 5px", borderRadius: 3, fontSize: 9, marginLeft: 4 },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: 248, borderRight: "1px solid #2a2a2e", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, background: "#141416" },
  tabs: { display: "flex", borderBottom: "1px solid #2a2a2e", flexShrink: 0 },
  tab: { flex: 1, padding: "9px 0", background: "none", border: "none", color: "#555558", cursor: "pointer", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "inherit" },
  tabActive: { color: "#e8e8ea", borderBottom: "1px solid #1db954" },
  badge: { background: "#1db954", color: "#000", borderRadius: 8, padding: "1px 5px", fontSize: 9, marginLeft: 4 },
  opList: { flex: 1, overflowY: "auto", padding: "4px 0" },
  opItem: { display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", cursor: "pointer" },
  opIcon: { width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 },
  opLabel: { color: "#e8e8ea", fontSize: 11, fontWeight: 500 },
  opDesc: { color: "#555558", fontSize: 10, marginTop: 1 },
  pipeList: { flex: 1, overflowY: "auto", padding: "6px 0" },
  emptyPipe: { color: "#555558", fontSize: 10, padding: "20px 14px", lineHeight: 1.7 },
  pipeStep: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderBottom: "1px solid #1a1a1d" },
  pipeNum: { fontSize: 10, color: "#555558", width: 14, flexShrink: 0 },
  pipeTag: { fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 500, textTransform: "uppercase", flexShrink: 0 },
  pipeVals: { flex: 1, fontSize: 10, color: "#8a8a90", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pipeActions: { display: "flex", gap: 2, flexShrink: 0 },
  pipeBtn: { background: "none", border: "none", color: "#555558", cursor: "pointer", fontSize: 10, padding: "0 2px", fontFamily: "inherit" },
  paramPanel: { borderTop: "1px solid #2a2a2e", padding: 12, flexShrink: 0 },
  paramTitle: { color: "#555558", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 },
  paramRow: { display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" },
  paramG: { display: "flex", flexDirection: "column", gap: 3 },
  paramL: { color: "#555558", fontSize: 9, textTransform: "uppercase" },
  inp: { background: "#1a1a1d", border: "1px solid #2a2a2e", color: "#e8e8ea", padding: "4px 6px", fontSize: 11, width: 70, fontFamily: "inherit", borderRadius: 6, outline: "none" },
  sel: { background: "#1a1a1d", border: "1px solid #2a2a2e", color: "#e8e8ea", padding: "4px 6px", fontSize: 11, fontFamily: "inherit", borderRadius: 6 },
  hint: { fontSize: 9, color: "#38383e", alignSelf: "flex-end", paddingBottom: 4 },
  addBtn: { marginTop: 10, width: "100%", padding: "7px 0", background: "#1a3a25", border: "1px solid #1db954", color: "#1db954", cursor: "pointer", fontSize: 11, fontFamily: "inherit", letterSpacing: ".04em", borderRadius: 6 },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  preview: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", minHeight: 0, overflow: "hidden", borderBottom: "1px solid #1a1a1d" },
  videoEl: { maxWidth: "100%", maxHeight: "100%", cursor: "pointer" },
  dropZone: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", cursor: "pointer", gap: 10 },
  dropIcon: { fontSize: 36, color: "#2a2a2e" },
  dropTitle: { fontSize: 14, fontWeight: 600, color: "#e8e8ea" },
  dropSub: { fontSize: 11, color: "#8a8a90" },
  progressBar: { height: 3, background: "#222226", borderRadius: 2, overflow: "hidden", width: 280 },
  progressFill: { height: "100%", background: "#1db954", transition: "width .2s" },
  uploadStatus: { fontSize: 10, color: "#8a8a90", marginTop: 6, textAlign: "center" },
  controls: { display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderBottom: "1px solid #1a1a1d", flexShrink: 0 },
  ctrlBtn: { background: "none", border: "none", color: "#555558", cursor: "pointer", fontSize: 14, padding: "2px 4px", fontFamily: "inherit", flexShrink: 0 },
  scrubBar: { flex: 1, cursor: "pointer", height: 3, minWidth: 0 },
  timeDisp: { color: "#38383e", fontSize: 11, fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 },
  rateSelect: { background: "#1a1a1d", border: "1px solid #2a2a2e", color: "#555558", fontSize: 10, fontFamily: "inherit", borderRadius: 4, padding: "2px 4px", cursor: "pointer", flexShrink: 0 },
  newBtn: { padding: "4px 10px", background: "none", border: "1px solid #2a2a2e", color: "#555558", cursor: "pointer", fontSize: 10, fontFamily: "inherit", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0 },
  downloadBtn: { color: "#1db954", fontSize: 11, textDecoration: "none", border: "1px solid #1a3a25", padding: "3px 10px", borderRadius: 4, flexShrink: 0 },
  tlWrap: { flexShrink: 0, borderBottom: "1px solid #1a1a1d", userSelect: "none" },
  ruler: { position: "relative", height: 24, borderBottom: "1px solid #1a1a1d", margin: "0 16px", overflow: "hidden" },
  tick: { position: "absolute", bottom: 0, transform: "translateX(-50%)" },
  tickLine: { width: 1, height: 5, background: "#2a2a2e", margin: "0 auto" },
  tickLabel: { fontSize: 9, color: "#38383e", display: "block", textAlign: "center" },
  rulerPlayhead: { position: "absolute", top: 0, bottom: 0, width: 1, background: "#1db954", pointerEvents: "none", transform: "translateX(-50%)", zIndex: 5 },
  rail: { position: "relative", height: 38, margin: "3px 16px", background: "#0e0e0e", borderRadius: 4, overflow: "visible" },
  clip: { position: "absolute", height: "100%", borderRadius: 3, border: "1px solid", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", overflow: "hidden", minWidth: 4, boxSizing: "border-box", zIndex: 2 },
  clipHandle: { position: "absolute", left: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize", background: "rgba(255,255,255,0.1)", zIndex: 3 },
  clipLabel: { fontSize: 9, pointerEvents: "none", letterSpacing: ".03em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" },
  playhead: { position: "absolute", top: -6, bottom: -6, width: 2, background: "#1db954", cursor: "ew-resize", transform: "translateX(-50%)", zIndex: 10, borderRadius: 1 },
  ghostLine: { position: "absolute", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.08)", pointerEvents: "none", transform: "translateX(-50%)", zIndex: 1 },
  ghostTime: { position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", background: "#1a1a1d", color: "#555558", fontSize: 8, padding: "1px 4px", borderRadius: 2, whiteSpace: "nowrap" },
  tooltip: { position: "absolute", top: -26, transform: "translateX(-50%)", background: "#1a1a1d", border: "1px solid #2a2a2e", color: "#e8e8ea", fontSize: 9, padding: "2px 7px", borderRadius: 3, pointerEvents: "none", whiteSpace: "nowrap", zIndex: 20 },
  waveRow: { display: "flex", alignItems: "center", gap: 8, margin: "3px 16px 0", height: 28 },
  trackLbl: { color: "#2a2a2e", fontSize: 9, width: 28, flexShrink: 0, textAlign: "right" },
  wave: { flex: 1, display: "flex", alignItems: "center", height: "100%", gap: 1 },
  waveBar: { flex: 1, borderRadius: 1, transition: "background .05s" },
  inOutRow: { display: "flex", justifyContent: "space-between", margin: "2px 16px 4px" },
  inOutLabel: { fontSize: 9, color: "#38383e", flex: 1, textAlign: "center" },
  cmdBox: { margin: "6px 16px 0", flexShrink: 0 },
  cmdLabel: { color: "#38383e", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 },
  cmdPre: { background: "#0a0a0a", border: "1px solid #1a1a1d", color: "#2a6a3a", fontSize: 10, padding: "8px 12px", margin: 0, borderRadius: 6, fontFamily: "inherit", overflowX: "auto", whiteSpace: "pre" },
  runRow: { display: "flex", gap: 8, margin: "6px 16px 0", flexShrink: 0 },
  runBtn: { flex: 1, padding: "9px 0", background: "#1db954", border: "none", color: "#000", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, letterSpacing: ".04em", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  spinner: { width: 13, height: 13, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .6s linear infinite", display: "inline-block" },
  errorBox: { margin: "6px 16px 0", padding: "10px 12px", background: "#2a1010", border: "1px solid #5a2020", color: "#e07070", fontSize: 11, borderRadius: 6, flexShrink: 0 },
  resultBox: { margin: "6px 16px", padding: "10px 12px", background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 6, flexShrink: 0 },
  resultHead: { color: "#1db954", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 },
  resultMeta: { display: "flex", gap: 8 },
  metaChip: { fontSize: 11, color: "#8a8a90", background: "#1a1a1d", padding: "3px 8px", borderRadius: 4 },
};
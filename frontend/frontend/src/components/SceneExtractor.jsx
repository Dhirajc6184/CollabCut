// FILE PATH: frontend/frontend/src/components/SceneExtractor.jsx
// REPLACE ENTIRE FILE
//
// NEW in this version:
//   - `videoSrc` prop added — the URL of the currently loaded project video
//   - Clicking a scene card opens a floating popup with a <video> player
//   - The popup auto-seeks to scene.start and plays until scene.end, then pauses
//   - Click anywhere outside the popup (or the ✕ button) to close it
//   - All existing functionality (CV extraction, polling, scores) is unchanged

import { useState, useRef, useCallback, useEffect } from "react";

function fmt(seconds) {
  if (seconds == null) return "--";
  const s   = Math.round(seconds);
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

// ── Scene Preview Popup ────────────────────────────────────────────────────────
function ScenePreview({ scene, videoSrc, rankColor, onClose }) {
  const videoRef  = useRef(null);
  const timerRef  = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);

  const clipDuration = scene.end - scene.start;

  // On mount: seek to start, then auto-play
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;

    const onSeeked = () => {
      v.play().catch(() => {});
    };
    v.addEventListener("seeked", onSeeked, { once: true });
    v.currentTime = scene.start;

    return () => {
      v.removeEventListener("seeked", onSeeked);
      clearTimeout(timerRef.current);
      cancelAnimationFrame(rafRef.current);
      v.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track progress + auto-stop at scene.end
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tick = () => {
      const elapsed = Math.max(0, v.currentTime - scene.start);
      const pct     = Math.min(1, elapsed / clipDuration);
      setProgress(pct);

      if (v.currentTime >= scene.end) {
        v.pause();
        v.currentTime = scene.start;
        setProgress(0);
        setPlaying(false);
        return;
      }
      if (!v.paused) rafRef.current = requestAnimationFrame(tick);
    };

    const onPlay  = () => { setPlaying(true);  rafRef.current = requestAnimationFrame(tick); };
    const onPause = () => { setPlaying(false); cancelAnimationFrame(rafRef.current); };
    const onEnded = () => { setPlaying(false); cancelAnimationFrame(rafRef.current); setProgress(0); };

    v.addEventListener("play",  onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);

    return () => {
      cancelAnimationFrame(rafRef.current);
      v.removeEventListener("play",  onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [scene.start, scene.end, clipDuration]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      if (v.currentTime >= scene.end) v.currentTime = scene.start;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const replay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = scene.start;
    setTimeout(() => v.play().catch(() => {}), 50);
  };

  const color = rankColor[scene.rank] || "#4080ff";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.72)",
          animation: "seFadeIn .15s ease",
        }}
      />

      {/* Popup */}
      <div style={{
        position:    "fixed",
        top:         "50%",
        left:        "50%",
        transform:   "translate(-50%, -50%)",
        zIndex:      201,
        width:       440,
        maxWidth:    "calc(100vw - 32px)",
        background:  "#141416",
        border:      "1px solid #2a2a2e",
        borderRadius: 12,
        overflow:    "hidden",
        boxShadow:   "0 24px 64px rgba(0,0,0,0.8)",
        animation:   "seSlideUp .18s ease",
      }}>

        {/* Header bar */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "10px 14px",
          borderBottom:   "1px solid #1a1a1d",
          background:     "#0e0e10",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>
              {scene.rank}
            </span>
            <span style={{
              fontSize: 10, color: "#555558", background: "#1a1a1d",
              border: "1px solid #2a2a2e", padding: "1px 8px", borderRadius: 10,
            }}>
              score {scene.score}/10
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#555558",
              cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px",
            }}
          >✕</button>
        </div>

        {/* Video */}
        <div style={{ position: "relative", background: "#000", lineHeight: 0 }}>
          <video
            ref={videoRef}
            src={videoSrc}
            crossOrigin="anonymous"
            preload="auto"
            style={{ width: "100%", maxHeight: 240, objectFit: "contain", display: "block" }}
            onClick={togglePlay}
          />

          {/* Play overlay when paused */}
          {!playing && (
            <div
              onClick={togglePlay}
              style={{
                position:       "absolute",
                inset:          0,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                cursor:         "pointer",
                background:     "rgba(0,0,0,0.28)",
              }}
            >
              <div style={{
                width:          48,
                height:         48,
                borderRadius:   "50%",
                background:     "rgba(0,0,0,0.65)",
                border:         `2px solid ${color}`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       20,
                color,
              }}>▶</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "#1a1a1d" }}>
          <div style={{
            height:     "100%",
            width:      (progress * 100) + "%",
            background: color,
            transition: playing ? "none" : "width .1s",
          }} />
        </div>

        {/* Footer: timestamps + controls */}
        <div style={{
          padding:    "10px 14px 12px",
          display:    "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}>
          {/* Time info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color, fontFamily: "monospace", fontWeight: 600 }}>
                {fmt(scene.start)}
              </span>
              <span style={{ color: "#333", fontSize: 10 }}>→</span>
              <span style={{ fontSize: 11, color, fontFamily: "monospace", fontWeight: 600 }}>
                {fmt(scene.end)}
              </span>
              <span style={{ fontSize: 10, color: "#555558" }}>
                ({fmt(scene.duration)})
              </span>
            </div>
            <div style={{ fontSize: 9, color: "#38383e" }}>
              peak at {fmt(scene.peak_time)}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={replay}
              title="Replay from start"
              style={{
                background: "#1a1a1d", border: "1px solid #2a2a2e",
                color: "#8a8a90", borderRadius: 6,
                padding: "5px 10px", cursor: "pointer",
                fontSize: 11, fontFamily: "inherit",
              }}
            >↺ replay</button>
            <button
              onClick={togglePlay}
              style={{
                background: playing ? "#1a1a1d" : color + "22",
                border:     `1px solid ${color}`,
                color,
                borderRadius: 6,
                padding: "5px 12px", cursor: "pointer",
                fontSize: 11, fontFamily: "inherit", fontWeight: 600,
              }}
            >{playing ? "⏸ pause" : "▶ play"}</button>
          </div>
        </div>

        {/* Tip */}
        <div style={{
          padding:    "0 14px 10px",
          fontSize:   9,
          color:      "#38383e",
          lineHeight: 1.5,
        }}>
          💡 Use these timestamps to set trim start/end in the pipeline tab.
        </div>
      </div>
    </>
  );
}

// ── Main SceneExtractor ────────────────────────────────────────────────────────
export default function SceneExtractor({
  token,
  uploadedFilename,
  apiBase   = "http://127.0.0.1:8000/api/editor",
  videoSrc  = null,   // ← NEW: URL of the loaded project video for preview
}) {
  const [jobId,        setJobId]        = useState(null);
  const [job,          setJob]          = useState(null);
  const [error,        setError]        = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [previewScene, setPreviewScene] = useState(null);   // ← NEW: which scene is previewing
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const poll = useCallback((id) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const r    = await fetch(`${apiBase}/scene-extract/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await r.json();
        setJob(data);
        if (data.status === "done" || data.status === "error") {
          stopPolling();
          setLoading(false);
        }
      } catch (e) {
        stopPolling();
        setError("Polling failed: " + e.message);
        setLoading(false);
      }
    }, 1500);
  }, [token, apiBase]);

  const run = async () => {
    if (!uploadedFilename) { setError("Upload a video first."); return; }
    setError(null); setJob(null); setJobId(null); setLoading(true); setPreviewScene(null);

    try {
      const r = await fetch(`${apiBase}/scene-extract/`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ filename: uploadedFilename }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "Failed to start analysis."); setLoading(false); return; }
      setJobId(data.job_id);
      poll(data.job_id);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const statusLabel = {
    queued:    "Queued…",
    opening:   "Opening video…",
    scanning:  "Scanning frames…",
    selecting: "Selecting best scenes…",
    done:      "Analysis complete",
    error:     "Error",
  };

  const rankColor = {
    "🥇 Best Scene": "#f5c518",
    "🥈 2nd Best":   "#aaaaaa",
    "🥉 3rd Best":   "#cd7f32",
  };

  return (
    <div style={st.wrap}>
      <style>{`
        @keyframes seFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes seSlideUp { from { opacity:0; transform:translate(-50%,-44%) } to { opacity:1; transform:translate(-50%,-50%) } }
        @keyframes spin       { to { transform:rotate(360deg) } }
        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div style={st.header}>
        <span style={st.title}>⚡ scene extractor</span>
        <span style={st.sub}>cv · top 3 scenes</span>
      </div>

      {!uploadedFilename && (
        <div style={st.hint}>Upload a video in the editor first, then run extraction.</div>
      )}

      <button
        style={{ ...st.runBtn, opacity: loading || !uploadedFilename ? 0.5 : 1 }}
        onClick={run}
        disabled={loading || !uploadedFilename}
      >
        {loading ? <><span style={st.spinner} /> analysing…</> : "▶ extract top 3 scenes"}
      </button>

      {error && <div style={st.errorBox}>{error}</div>}

      {job && job.status !== "done" && job.status !== "error" && (
        <div style={st.statusBox}>
          <span style={st.dot} /> {statusLabel[job.status] || job.status}
          {job.duration && <span style={st.metaChip}>{fmt(job.duration)}</span>}
        </div>
      )}

      {job?.status === "error" && (
        <div style={st.errorBox}>CV Error: {job.message}</div>
      )}

      {job?.status === "done" && (
        <div style={st.results}>
          <div style={st.summary}>
            <span style={st.metaChip}>📹 {fmt(job.duration)}</span>
            <span style={st.metaChip}>✂ {fmt(job.total_extracted)} extracted</span>
            <span style={st.metaChip}>{job.pct_used}% of video</span>
            <span style={st.metaChip}>{job.fps} fps</span>
          </div>

          {/* ← Scene cards are now clickable */}
          {job.scenes.map((scene, i) => {
            const color     = rankColor[scene.rank] || "#4080ff";
            const canPreview = !!videoSrc;
            return (
              <div
                key={i}
                onClick={() => canPreview && setPreviewScene(scene)}
                title={canPreview ? "Click to preview this scene" : "No video loaded for preview"}
                style={{
                  ...st.sceneCard,
                  cursor:      canPreview ? "pointer" : "default",
                  borderColor: color + "55",
                  transition:  "border-color .15s, transform .1s",
                }}
                onMouseEnter={e => { if (canPreview) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-1px)"; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = color + "55"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={st.sceneTop}>
                  <span style={{ ...st.rankBadge, color }}>
                    {scene.rank}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={st.scoreChip}>score {scene.score}/10</span>
                    {/* Preview hint badge */}
                    {canPreview && (
                      <span style={{
                        fontSize:    8,
                        color:       color,
                        background:  color + "18",
                        border:      "1px solid " + color + "40",
                        borderRadius: 4,
                        padding:     "1px 5px",
                        letterSpacing: ".03em",
                      }}>▶ preview</span>
                    )}
                  </div>
                </div>
                <div style={st.sceneBody}>
                  <div style={st.timeLine}>
                    <span style={{ ...st.timeVal, color }}>
                      {fmt(scene.start)}
                    </span>
                    <span style={st.timeArrow}>→</span>
                    <span style={{ ...st.timeVal, color }}>
                      {fmt(scene.end)}
                    </span>
                    <span style={st.timeDur}>({fmt(scene.duration)})</span>
                  </div>
                  <div style={st.peakLine}>peak at {fmt(scene.peak_time)}</div>
                </div>
              </div>
            );
          })}

          <div style={st.helpText}>
            Click any scene card to preview · use timestamps to set trim in pipeline.
          </div>
        </div>
      )}

      {/* ← Scene preview popup */}
      {previewScene && videoSrc && (
        <ScenePreview
          scene={previewScene}
          videoSrc={videoSrc}
          rankColor={rankColor}
          onClose={() => setPreviewScene(null)}
        />
      )}
    </div>
  );
}

const st = {
  wrap:      { display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", height: "100%", overflowY: "auto" },
  header:    { display: "flex", alignItems: "baseline", gap: 8 },
  title:     { color: "#e8e8ea", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" },
  sub:       { color: "#555558", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em" },
  hint:      { color: "#555558", fontSize: 10, lineHeight: 1.5, padding: "4px 0" },
  runBtn:    { width: "100%", padding: "8px 0", background: "#1a2a3a", border: "1px solid #4080ff", color: "#4080ff", cursor: "pointer", fontSize: 11, fontFamily: "inherit", letterSpacing: ".04em", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  spinner:   { width: 11, height: 11, border: "2px solid #4080ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .6s linear infinite", display: "inline-block" },
  errorBox:  { padding: "8px 10px", background: "#2a1010", border: "1px solid #5a2020", color: "#e07070", fontSize: 10, borderRadius: 6 },
  statusBox: { display: "flex", alignItems: "center", gap: 8, color: "#8a8a90", fontSize: 10, padding: "6px 0" },
  dot:       { width: 6, height: 6, borderRadius: "50%", background: "#4080ff", display: "inline-block", animation: "pulse 1s infinite" },
  metaChip:  { fontSize: 10, color: "#8a8a90", background: "#1a1a1d", padding: "2px 7px", borderRadius: 4 },
  results:   { display: "flex", flexDirection: "column", gap: 8 },
  summary:   { display: "flex", gap: 6, flexWrap: "wrap" },
  sceneCard: { background: "#0e1a0e", border: "1px solid #1a3a1a", borderRadius: 6, padding: "8px 10px" },
  sceneTop:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  rankBadge: { fontSize: 11, fontWeight: 600 },
  scoreChip: { fontSize: 9, color: "#555558", background: "#1a1a1d", padding: "1px 6px", borderRadius: 4 },
  sceneBody: { display: "flex", flexDirection: "column", gap: 3 },
  timeLine:  { display: "flex", alignItems: "center", gap: 6 },
  timeVal:   { fontSize: 11, fontFamily: "inherit" },
  timeArrow: { color: "#555558", fontSize: 10 },
  timeDur:   { color: "#555558", fontSize: 10 },
  peakLine:  { color: "#38383e", fontSize: 9 },
  helpText:  { color: "#38383e", fontSize: 9, lineHeight: 1.6, paddingTop: 2 },
};
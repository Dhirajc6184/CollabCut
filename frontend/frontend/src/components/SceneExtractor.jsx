// FILE PATH: frontend/frontend/src/components/SceneExtractor.jsx
// NEW FILE — create it (adapted from Project 2)
//
// KEY CHANGE vs Project 2 original:
//   - Removed hardcoded `const API = "http://localhost:8000"`
//   - Added `apiBase` prop (default "http://127.0.0.1:8000/api/editor")
//   - All fetch calls now use apiBase instead of API

import { useState, useRef, useCallback } from "react";

function fmt(seconds) {
  if (seconds == null) return "--";
  const s   = Math.round(seconds);
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

export default function SceneExtractor({
  token,
  uploadedFilename,
  apiBase = "http://127.0.0.1:8000/api/editor",   // ← NEW prop
}) {
  const [jobId,   setJobId]   = useState(null);
  const [job,     setJob]     = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);
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
    setError(null); setJob(null); setJobId(null); setLoading(true);

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

          {job.scenes.map((scene, i) => (
            <div key={i} style={st.sceneCard}>
              <div style={st.sceneTop}>
                <span style={{ ...st.rankBadge, color: rankColor[scene.rank] || "#888" }}>
                  {scene.rank}
                </span>
                <span style={st.scoreChip}>score {scene.score}/10</span>
              </div>
              <div style={st.sceneBody}>
                <div style={st.timeLine}>
                  <span style={st.timeVal}>{fmt(scene.start)}</span>
                  <span style={st.timeArrow}>→</span>
                  <span style={st.timeVal}>{fmt(scene.end)}</span>
                  <span style={st.timeDur}>({fmt(scene.duration)})</span>
                </div>
                <div style={st.peakLine}>peak at {fmt(scene.peak_time)}</div>
              </div>
            </div>
          ))}

          <div style={st.helpText}>
            Use the timestamps above to set trim start/end in the editor pipeline.
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  wrap:     { display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", height: "100%", overflowY: "auto" },
  header:   { display: "flex", alignItems: "baseline", gap: 8 },
  title:    { color: "#e8e8ea", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" },
  sub:      { color: "#555558", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em" },
  hint:     { color: "#555558", fontSize: 10, lineHeight: 1.5, padding: "4px 0" },
  runBtn:   { width: "100%", padding: "8px 0", background: "#1a2a3a", border: "1px solid #4080ff", color: "#4080ff", cursor: "pointer", fontSize: 11, fontFamily: "inherit", letterSpacing: ".04em", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  spinner:  { width: 11, height: 11, border: "2px solid #4080ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .6s linear infinite", display: "inline-block" },
  errorBox: { padding: "8px 10px", background: "#2a1010", border: "1px solid #5a2020", color: "#e07070", fontSize: 10, borderRadius: 6 },
  statusBox:{ display: "flex", alignItems: "center", gap: 8, color: "#8a8a90", fontSize: 10, padding: "6px 0" },
  dot:      { width: 6, height: 6, borderRadius: "50%", background: "#4080ff", display: "inline-block", animation: "pulse 1s infinite" },
  metaChip: { fontSize: 10, color: "#8a8a90", background: "#1a1a1d", padding: "2px 7px", borderRadius: 4 },
  results:  { display: "flex", flexDirection: "column", gap: 8 },
  summary:  { display: "flex", gap: 6, flexWrap: "wrap" },
  sceneCard:{ background: "#0e1a0e", border: "1px solid #1a3a1a", borderRadius: 6, padding: "8px 10px" },
  sceneTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  rankBadge:{ fontSize: 11, fontWeight: 600 },
  scoreChip:{ fontSize: 9, color: "#555558", background: "#1a1a1d", padding: "1px 6px", borderRadius: 4 },
  sceneBody:{ display: "flex", flexDirection: "column", gap: 3 },
  timeLine: { display: "flex", alignItems: "center", gap: 6 },
  timeVal:  { color: "#1db954", fontSize: 11, fontFamily: "inherit" },
  timeArrow:{ color: "#555558", fontSize: 10 },
  timeDur:  { color: "#555558", fontSize: 10 },
  peakLine: { color: "#38383e", fontSize: 9 },
  helpText: { color: "#38383e", fontSize: 9, lineHeight: 1.6, paddingTop: 2 },
};
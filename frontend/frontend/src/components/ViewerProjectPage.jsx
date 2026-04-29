// FILE PATH: frontend/frontend/src/components/ViewerProjectPage.jsx
// NEW FILE — create it

/**
 * ViewerProjectPage
 *
 * Shown to:
 *   - Any viewer opening a project
 *   - Editors whose invite hasn't been accepted yet (read-only)
 *
 * Features:
 *   - Plays the project video (stored in Project 1's /media/ folder)
 *   - Shows VideoCommentPanel for viewers to pin comments on the timeline
 *   - Editors see the panel in read-only (view-only badge) mode
 */

import { useRef, useState, useEffect, useCallback } from "react";
import VideoCommentPanel from "./VideoCommentPanel";
import "../styles/auth.css";

const BACKEND = "http://127.0.0.1:8000";

function formatTime(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ViewerProjectPage({ project, user, token, onBack }) {
  const videoRef = useRef(null);
  const rafRef   = useRef(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);

  // Build the video src from the project's media URL
  const videoSrc = project?.video ? `${BACKEND}${project.video}` : null;

  const seek = useCallback((t) => {
    const v       = videoRef.current;
    const clamped = Math.max(0, Math.min(duration || 9999, t));
    setCurrentTime(clamped);
    if (v) v.currentTime = clamped;
  }, [duration]);

  // Sync currentTime via rAF while playing
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tick    = () => { setCurrentTime(v.currentTime); if (!v.paused && !v.ended) rafRef.current = requestAnimationFrame(tick); };
    const onPlay  = () => { rafRef.current = requestAnimationFrame(tick); setIsPlaying(true); };
    const onPause = () => { cancelAnimationFrame(rafRef.current); setIsPlaying(false); setCurrentTime(v.currentTime); };
    const onEnded = () => { cancelAnimationFrame(rafRef.current); setIsPlaying(false); };
    const onMeta  = () => { setDuration(v.duration || 0); };

    v.addEventListener("play",            onPlay);
    v.addEventListener("pause",           onPause);
    v.addEventListener("ended",           onEnded);
    v.addEventListener("loadedmetadata",  onMeta);

    return () => {
      cancelAnimationFrame(rafRef.current);
      v.removeEventListener("play",           onPlay);
      v.removeEventListener("pause",          onPause);
      v.removeEventListener("ended",          onEnded);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div className="dashboard-page" style={{ background: "#0d0d0f", color: "#e8e8ea", fontFamily: "monospace" }}>
      {/* Navbar */}
      <div className="dashboard-navbar">
        <div>
          <h2>CollabCut</h2>
          <p>{project?.name}</p>
        </div>
        <button className="logout-btn" onClick={onBack}>← back</button>
      </div>

      <div className="dashboard-content" style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>

        {/* Video player */}
        {videoSrc ? (
          <div style={{ marginBottom: 16 }}>
            <video
              ref={videoRef}
              src={videoSrc}
              crossOrigin="anonymous"
              style={{ width: "100%", borderRadius: 8, border: "1px solid #2a2a2e", background: "#000" }}
              onClick={togglePlay}
              preload="auto"
            />

            {/* Simple transport bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, color: "#888", fontSize: 12 }}>
              <button
                onClick={togglePlay}
                style={{ background: "#1db954", border: "none", color: "#000", borderRadius: 4, padding: "4px 14px", cursor: "pointer", fontWeight: 700 }}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <span style={{ color: "#1db954", fontWeight: 600 }}>{formatTime(currentTime)}</span>
              <span style={{ color: "#555" }}>/ {formatTime(duration)}</span>

              {/* Progress bar / click-to-seek */}
              <div
                style={{ flex: 1, height: 4, background: "#222", borderRadius: 2, cursor: "pointer", position: "relative" }}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - r.left) / r.width) * duration);
                }}
              >
                <div style={{
                  width:        duration > 0 ? `${(currentTime / duration) * 100}%` : 0,
                  height:       "100%",
                  background:   "#1db954",
                  borderRadius: 2,
                }} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#555", border: "1px dashed #333", borderRadius: 8, marginBottom: 16 }}>
            No video uploaded for this project yet.
          </div>
        )}

        {/* Comment panel */}
        <div style={{ background: "#0e0e0e", border: "1px solid #1a1a1d", borderRadius: 8, padding: 16 }}>
          <VideoCommentPanel
            projectId={project?.id}
            currentTime={currentTime}
            duration={duration}
            token={token}
            currentUser={user?.name}
            currentRole={user?.role}
            apiBase="http://127.0.0.1:8000/api/editor"
            onSeek={seek}
          />
        </div>
      </div>
    </div>
  );
}
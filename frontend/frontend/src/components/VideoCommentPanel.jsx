// FILE PATH: frontend/frontend/src/components/VideoCommentPanel.jsx
// NEW FILE — create it (adapted from Project 2)
//
// KEY CHANGES vs Project 2 original:
//   - `outputFilename` prop renamed to `projectId` everywhere
//   - All fetch URLs use /comments/<projectId>/ instead of /comments/<outputFilename>/
//   - apiBase default changed to "http://127.0.0.1:8000/api/editor"

import { useState, useEffect, useCallback, useRef } from "react";

const API = (base, path) => `${base}${path}`;

function fmtTime(sec) {
  const s  = Math.floor(sec);
  const m  = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

function Avatar({ name, role }) {
  const initials = (name || "?").slice(0, 2).toUpperCase();
  const bg       = role === "editor" ? "#1D9E75" : "#378ADD";
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: bg, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function CommentBubble({ comment, currentUser, currentRole, onDelete, onSeek }) {
  const canDelete = currentRole === "editor" || comment.author === currentUser;
  const isEditor  = comment.author_role === "editor";
  return (
    <div style={{
      display: "flex", gap: 8, padding: "10px 0",
      borderBottom: "1px solid #1e1e22",
      animation: "vcpFadeIn 0.18s ease",
    }}>
      <Avatar name={comment.author} role={comment.author_role} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#e8e8ea" }}>{comment.author}</span>
          <span style={{
            fontSize: 9, padding: "1px 6px", borderRadius: 99,
            background: isEditor ? "#0f3d29" : "#102040",
            color:      isEditor ? "#1D9E75" : "#378ADD",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>{comment.author_role}</span>
          <button
            onClick={() => onSeek(comment.timestamp_sec)}
            style={{
              marginLeft: "auto", fontSize: 10, color: "#7f77dd",
              background: "#1e1c38", border: "none", borderRadius: 5,
              padding: "1px 7px", cursor: "pointer", fontWeight: 600,
            }}
          >{fmtTime(comment.timestamp_sec)}</button>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#b0b0c0", lineHeight: 1.5 }}>
          {comment.text}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#44444e" }}>
            {new Date(comment.created_at).toLocaleString()}
          </span>
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              style={{ fontSize: 10, color: "#c0523a", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.7 }}
              onMouseEnter={e => e.target.style.opacity = 1}
              onMouseLeave={e => e.target.style.opacity = 0.7}
            >delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineRail({ comments, duration, currentTime, onSeek, onPinHover, hoveredId }) {
  if (!duration) return null;
  return (
    <div
      style={{ position: "relative", height: 32, background: "#111114", borderRadius: 6, margin: "10px 0 4px", cursor: "pointer" }}
      onClick={e => {
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration)));
      }}
    >
      {/* Track line */}
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#2a2a30", transform: "translateY(-50%)", pointerEvents: "none" }} />
      {/* Playhead */}
      <div style={{ position: "absolute", left: `${(currentTime / duration) * 100}%`, top: 0, bottom: 0, width: 2, background: "#1db954", transition: "left 0.1s linear", pointerEvents: "none", zIndex: 2 }} />

      {comments.map(c => {
        const pct     = (c.timestamp_sec / duration) * 100;
        const hovered = hoveredId === c.id;
        return (
          <div
            key={c.id}
            onMouseEnter={() => onPinHover(c.id)}
            onMouseLeave={() => onPinHover(null)}
            onClick={e => { e.stopPropagation(); onSeek(c.timestamp_sec); }}
            style={{
              position: "absolute",
              left: `${pct}%`, top: "50%",
              transform: "translate(-50%, -50%)",
              width:  hovered ? 13 : 9,
              height: hovered ? 13 : 9,
              borderRadius: "50%",
              background: c.author_role === "editor" ? "#1D9E75" : "#378ADD",
              border: "2px solid #111114",
              boxShadow: hovered ? "0 0 0 3px rgba(127,119,221,0.4)" : "none",
              zIndex: 3, cursor: "pointer", transition: "all 0.12s ease",
            }}
          >
            {hovered && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%", transform: "translateX(-50%)",
                background: "#1a1a20", border: "1px solid #2e2e38",
                borderRadius: 8, padding: "7px 10px",
                minWidth: 160, maxWidth: 240,
                pointerEvents: "none", zIndex: 50,
                boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                whiteSpace: "normal",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#e8e8ea" }}>{c.author}</span>
                  <span style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 99,
                    background: c.author_role === "editor" ? "#0f3d29" : "#102040",
                    color:      c.author_role === "editor" ? "#1D9E75" : "#378ADD",
                    fontWeight: 700, textTransform: "uppercase",
                  }}>{c.author_role}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#7f77dd", fontWeight: 600 }}>
                    {fmtTime(c.timestamp_sec)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#b0b0c0", lineHeight: 1.45 }}>{c.text}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── ComposeOverlay — uses projectId ──────────────────────────────────────────

function ComposeOverlay({ currentTime, duration, token, apiBase, projectId, onPosted, onClose }) {
  const [text,           setText]           = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [snapToPlayhead, setSnapToPlayhead] = useState(true);
  const [manualTime,     setManualTime]     = useState("");
  const textareaRef = useRef(null);

  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 50); }, []);

  const headers   = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const pendingTs = snapToPlayhead ? currentTime : (parseFloat(manualTime) || 0);

  const postComment = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true); setError("");
    try {
      // ← Uses projectId not outputFilename
      const res = await fetch(API(apiBase, `/comments/${projectId}/`), {
        method: "POST", headers,
        body: JSON.stringify({ timestamp_sec: pendingTs, text: trimmed }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to post"); }
      onPosted(await res.json());
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.45)", animation: "vcpFadeIn 0.15s ease" }} />
      <div style={{
        position: "fixed", bottom: 28, right: 28, width: 340,
        background: "#16161c", border: "1px solid #2e2e38",
        borderRadius: 14, padding: 18, zIndex: 101,
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        animation: "vcpSlideUp 0.18s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#e8e8ea" }}>Add comment</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555560", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          {[true, false].map(snap => (
            <button
              key={String(snap)}
              onClick={() => setSnapToPlayhead(snap)}
              style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                border:      snapToPlayhead === snap ? "1.5px solid #7f77dd" : "1.5px solid #2e2e38",
                background:  snapToPlayhead === snap ? "#1e1c38" : "transparent",
                color:       snapToPlayhead === snap ? "#7f77dd" : "#555560",
                fontWeight: 600,
              }}
            >{snap ? "use playhead" : "custom time"}</button>
          ))}
          {!snapToPlayhead ? (
            <input
              type="number" min={0} max={duration} step={0.1}
              value={manualTime} onChange={e => setManualTime(e.target.value)}
              placeholder="seconds"
              style={{ width: 70, fontSize: 11, padding: "3px 7px", background: "#0e0e14", border: "1px solid #2e2e38", borderRadius: 6, color: "#7f77dd", fontFamily: "monospace" }}
            />
          ) : (
            <span style={{ fontSize: 11, color: "#7f77dd", fontFamily: "monospace", fontWeight: 600 }}>
              @ {fmtTime(currentTime)}
            </span>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }}
          placeholder="Write a comment… (⌘↵ to post)"
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            fontSize: 13, padding: "9px 11px",
            background: "#0e0e14", border: "1px solid #2e2e38",
            borderRadius: 8, color: "#e8e8ea", resize: "vertical",
            fontFamily: "inherit", lineHeight: 1.5, outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "#7f77dd"}
          onBlur={e  => e.target.style.borderColor = "#2e2e38"}
        />

        {error && <div style={{ fontSize: 11, color: "#e07070", marginTop: 6 }}>{error}</div>}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <span style={{ fontSize: 11, color: "#44444e" }}>
            pin at <span style={{ color: "#7f77dd", fontWeight: 600 }}>{fmtTime(pendingTs)}</span>
          </span>
          <button
            onClick={postComment}
            disabled={loading || !text.trim()}
            style={{
              padding: "7px 18px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: loading || !text.trim() ? "#2a2a34" : "#7f77dd",
              color:      loading || !text.trim() ? "#44444e" : "#fff",
              border: "none", cursor: loading || !text.trim() ? "not-allowed" : "pointer",
            }}
          >{loading ? "posting…" : "Post"}</button>
        </div>
      </div>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function VideoCommentPanel({
  projectId,                              // ← CHANGED from outputFilename
  currentTime = 0,
  duration    = 0,
  token,
  currentUser,
  currentRole,
  apiBase     = "http://127.0.0.1:8000/api/editor",
  onSeek      = () => {},
}) {
  const [comments,   setComments]   = useState([]);
  const [hoveredPin, setHoveredPin] = useState(null);
  const [composing,  setComposing]  = useState(false);
  const [error,      setError]      = useState("");
  const listRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ← Uses projectId
  const fetchComments = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(API(apiBase, `/comments/${projectId}/`), { headers });
      if (!res.ok) throw new Error("Failed to load comments");
      setComments(await res.json());
    } catch (e) { setError(e.message); }
  }, [projectId, apiBase, token]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handlePosted = (c) =>
    setComments(prev => [...prev, c].sort((a, b) => a.timestamp_sec - b.timestamp_sec));

  // ← Uses projectId
  const deleteComment = async (id) => {
    try {
      const res = await fetch(API(apiBase, `/comments/${projectId}/${id}/`), { method: "DELETE", headers });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to delete"); }
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ fontFamily: "inherit" }}>
      <style>{`
        @keyframes vcpFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes vcpSlideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
      `}</style>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 11, color: "#555560", textTransform: "uppercase", letterSpacing: "0.08em" }}>Comments</span>
          <span style={{ fontSize: 10, background: "#1e1c38", color: "#7f77dd", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>
            {comments.length}
          </span>
        </div>
        {currentRole === "viewer" ? (
          <button
            onClick={() => setComposing(true)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, padding: "4px 12px", borderRadius: 7,
              background: "#1e1c38", border: "1px solid #3a3860",
              color: "#7f77dd", cursor: "pointer", fontWeight: 600,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#2a2850"}
            onMouseLeave={e => e.currentTarget.style.background = "#1e1c38"}
          >＋ comment</button>
        ) : (
          <span style={{
            fontSize: 10, padding: "3px 10px", borderRadius: 7,
            background: "#0f1a14", border: "1px solid #1a3020",
            color: "#1D9E75", fontWeight: 600,
          }}>👁 view only</span>
        )}
      </div>

      {/* Timeline pin rail */}
      <TimelineRail
        comments={comments} duration={duration} currentTime={currentTime}
        onSeek={onSeek} onPinHover={setHoveredPin} hoveredId={hoveredPin}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#2e2e38", marginBottom: 12 }}>
        <span>0:00</span><span>{fmtTime(duration)}</span>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "#e07070", background: "#2a1010", border: "1px solid #5a2020", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
          {error}
        </div>
      )}

      {/* Comment list */}
      <div ref={listRef} style={{ maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#34343e", fontSize: 12 }}>
            No comments yet
            {currentRole === "viewer" && (
              <> — click <strong style={{ color: "#7f77dd" }}>＋ comment</strong> to pin one</>
            )}
          </div>
        ) : (
          comments.map(c => (
            <CommentBubble
              key={c.id} comment={c}
              currentUser={currentUser} currentRole={currentRole}
              onDelete={deleteComment} onSeek={onSeek}
            />
          ))
        )}
      </div>

      {/* Compose overlay — only viewers can compose */}
      {composing && currentRole === "viewer" && (
        <ComposeOverlay
          currentTime={currentTime} duration={duration}
          token={token} apiBase={apiBase} projectId={projectId}
          onPosted={handlePosted} onClose={() => setComposing(false)}
        />
      )}
    </div>
  );
}
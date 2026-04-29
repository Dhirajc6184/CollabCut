import { useEffect, useState } from "react";
import API from "../api/api";
import "../styles/auth.css";

function Dashboard({ user, onLogout, onOpenProject, goToInvites }) {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [editorUsername, setEditorUsername] = useState("");
  const [error, setError] = useState("");
  const [hasInvites, setHasInvites] = useState(false);

  // ---------------- FETCH PROJECTS ----------------
  const fetchProjects = async () => {
    if (!user?.id) return;
    try {
      const res = await API.get(`projects/?user_id=${user.id}`);
      setProjects(res.data);
    } catch {
      setError("Failed to load projects");
    }
  };

  // ---------------- HAS INVITES (editor only) ----------------
  const checkInvites = async () => {
    if (!user?.id || user?.role !== "editor") {
      setHasInvites(false);
      return;
    }
    try {
      const res = await API.get(`invitations/?editor_id=${user.id}`);
      setHasInvites(res.data.length > 0);
    } catch (err) {
      console.log("INVITE CHECK ERROR:", err.response?.data || err);
      setHasInvites(false);
    }
  };

  // ---------------- CREATE PROJECT (viewer only) ----------------
  const createProject = async () => {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", projectName);
      formData.append("user_id", user.id);

      if (videoFile) {
        formData.append("video", videoFile);
      }

      if (editorUsername.trim()) {
        formData.append("editor_username", editorUsername);
      }

      await API.post("projects/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProjectName("");
      setVideoFile(null);
      setEditorUsername("");
      setError("");

      fetchProjects();
      checkInvites();
    } catch (err) {
      console.log("PROJECT ERROR:", err.response?.data);
      setError(err.response?.data?.error || "Project creation failed");
    }
  };

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    onLogout();
  };

  useEffect(() => {
    fetchProjects();
    checkInvites();
  }, [user]);

  // Helper: status dot color label
  const statusLabel = (status) => {
    if (status === "accepted") return "accepted ✓";
    if (status === "rejected") return "rejected ✗";
    if (status === "pending")  return "pending…";
    return "";
  };

  return (
    <div className="dashboard-page">
      {/* NAVBAR */}
      <div className="dashboard-navbar">
        <div>
          <h2>CollabCut</h2>
          <p>video collaboration workspace</p>
        </div>

        {/* RIGHT SIDE */}
        <div className="navbar-right">
          {/* 🔔 Bell — editor only */}
          {user?.role === "editor" && (
            <button className="invite-icon" onClick={goToInvites}>
              🔔
              {hasInvites && <span className="notify-dot"></span>}
            </button>
          )}

          <button className="logout-btn" onClick={handleLogout}>
            sign out →
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* HEADER */}
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>
            Welcome, <b>{user?.name}</b>{" "}
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 99,
                background: user?.role === "editor" ? "#0f3d29" : "#102040",
                color: user?.role === "editor" ? "#1db954" : "#4080ff",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {user?.role}
            </span>
          </p>
        </div>

        {/* CREATE PROJECT — viewers only */}
        {user?.role === "viewer" && (
          <div className="dashboard-card">
            <h3>Create Project</h3>

            <input
              type="text"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setError("");
              }}
            />

            <input
              type="file"
              accept="video/mp4,video/mov,video/avi,video/mkv,video/webm"
              onChange={(e) => setVideoFile(e.target.files[0])}
            />

            <input
              type="text"
              placeholder="Invite editor by username (optional)"
              value={editorUsername}
              onChange={(e) => {
                setEditorUsername(e.target.value);
                setError("");
              }}
            />

            <button type="button" onClick={createProject}>
              Create Project →
            </button>

            {error && <p className="error">{error}</p>}
          </div>
        )}

        {/* EDITOR hint */}
        {user?.role === "editor" && (
          <div className="dashboard-card" style={{ padding: "14px 18px" }}>
            <p style={{ margin: 0, color: "#8a8a90", fontSize: 13 }}>
              🔔 Accept project invitations via the bell icon above. Once accepted, click a project to open the video editor.
            </p>
          </div>
        )}

        {/* PROJECT LIST */}
        {projects.length === 0 ? (
          <div style={{ color: "#555", textAlign: "center", marginTop: 40, fontSize: 13 }}>
            {user?.role === "viewer"
              ? "No projects yet — create your first one above."
              : "No accepted projects yet — check your invitations."}
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => {
              const isEditorView = user?.role === "editor";
              const canOpen =
                !isEditorView || project.invite_status === "accepted";

              return (
                <div
                  key={project.id}
                  className={`project-card${canOpen ? " clickable" : ""}`}
                  onClick={() => canOpen && onOpenProject(project)}
                  title={
                    isEditorView && !canOpen
                      ? "Accept the invitation first to open this project"
                      : project.name
                  }
                  style={{ opacity: canOpen ? 1 : 0.55, cursor: canOpen ? "pointer" : "default" }}
                >
                  {/* Status dot */}
                  <span
                    className={`status-dot ${project.invite_status}`}
                    title={statusLabel(project.invite_status)}
                  ></span>

                  <h3>{project.name}</h3>
                  <p style={{ fontSize: 11, color: "#555" }}>
                    Project #{project.id}
                  </p>

                  {project.video && (
                    <p style={{ fontSize: 11, color: "#1db954" }}>● Video ready</p>
                  )}

                  {project.invite_status && project.invite_status !== "none" && (
                    <p
                      style={{
                        fontSize: 10,
                        color:
                          project.invite_status === "accepted"
                            ? "#1db954"
                            : project.invite_status === "rejected"
                            ? "#e05050"
                            : "#e8a020",
                        marginTop: 4,
                      }}
                    >
                      {statusLabel(project.invite_status)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
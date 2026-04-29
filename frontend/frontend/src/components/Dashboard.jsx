import { useEffect, useState } from "react";
import API from "../api/api";
import "../styles/auth.css";

function Dashboard({ user, onLogout, onOpenProject, goToInvites }) {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [editorUsername, setEditorUsername] = useState("");
  const [error, setError] = useState("");

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

  // ---------------- CREATE PROJECT ----------------
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
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // reset
      setProjectName("");
      setVideoFile(null);
      setEditorUsername("");
      setError("");

      fetchProjects();
    } catch (err) {
      console.log("PROJECT ERROR:", err.response?.data);
      setError(err.response?.data?.error || "Project creation failed");
    }
  };

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    localStorage.removeItem("user");
    onLogout();
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

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
          {/* 🔔 ONLY FOR EDITOR */}
          {user?.role === "editor" && (
            <button className="invite-icon" onClick={goToInvites}>
              🔔
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
            Welcome, <b>{user?.name}</b> ({user?.role})
          </p>
        </div>

        {/* CREATE PROJECT */}
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
            accept="video/mp4"
            onChange={(e) => setVideoFile(e.target.files[0])}
          />

          <input
            type="text"
            placeholder="Enter editor username"
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

        {/* PROJECT LIST */}
        <div className="project-grid">
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card clickable"
              onClick={() => onOpenProject(project)}
            >
              {/* 🟢 STATUS DOT */}
              <span
                className={`status-dot ${project.invite_status}`}
                title={project.invite_status}
              ></span>

              <h3>{project.name}</h3>
              <p>Project ID: {project.id}</p>

              {project.video && <p>Video Available</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
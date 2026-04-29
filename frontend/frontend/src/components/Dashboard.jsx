import { useEffect, useState } from "react";
import API from "../api/api";
import "../styles/auth.css";

function Dashboard({ user, onLogout, onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [editorEmail, setEditorEmail] = useState("");
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    if (!user?.id) return;

    try {
      const res = await API.get(`projects/?user_id=${user.id}`);
      setProjects(res.data);
    } catch {
      setError("Failed to load projects");
    }
  };

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

      if (editorEmail.trim()) {
        formData.append("editor_email", editorEmail);
      }

      await API.post("projects/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProjectName("");
      setVideoFile(null);
      setEditorEmail("");
      setError("");

      fetchProjects();
    } catch {
      setError("Project creation failed");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-navbar">
        <div>
          <h2>CollabCut</h2>
          <p>video collaboration workspace</p>
        </div>

        <button className="logout-btn" onClick={onLogout}>
          sign out →
        </button>
      </div>

      <div className="dashboard-content">
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
            type="email"
            placeholder="Enter editor email"
            value={editorEmail}
            onChange={(e) => setEditorEmail(e.target.value)}
          />

          <button onClick={createProject}>
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
              <h3>{project.name}</h3>
              <p>Project ID: {project.id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
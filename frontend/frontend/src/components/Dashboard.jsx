import { useEffect, useState } from "react";
import API from "../api/api";
import "../styles/auth.css";

function Dashboard({ user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    if (!user?.id) {
      setError("User not found. Please login again.");
      return;
    }

    try {
      const response = await API.get(`projects/?user_id=${user.id}`);
      setProjects(response.data);
      setError("");
    } catch (error) {
      console.log("FETCH PROJECT ERROR:", error.response?.data);
      setError(error.response?.data?.error || "Failed to load projects");
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (!user?.id) {
      setError("User not found. Please login again.");
      return;
    }

    try {
      const response = await API.post("projects/", {
        name: projectName,
        user_id: user.id,
      });

      console.log("PROJECT CREATED:", response.data);

      setProjectName("");
      setError("");
      fetchProjects();
    } catch (error) {
      console.log("CREATE PROJECT ERROR:", error.response?.data);

      setError(
        error.response?.data?.error ||
          JSON.stringify(error.response?.data) ||
          "Failed to create project"
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.clear();

    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProjects();
    }
  }, [user]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-navbar">
        <div>
          <h2>FFmpeg Studio</h2>
          <p>video collaboration workspace</p>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          sign out →
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Video Collaboration Dashboard</h1>
          <p>
            Welcome, <b>{user?.name}</b> <span>({user?.role})</span>
          </p>
        </div>

        <div className="dashboard-card">
          <h3>Create Project</h3>

          <input
            type="text"
            placeholder="enter project name"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              setError("");
            }}
          />

          <button type="button" onClick={createProject}>
            create project →
          </button>

          {error && <p className="error">{error}</p>}
        </div>

        <div className="project-grid">
          {projects.map((project) => (
            <div className="project-card" key={project.id}>
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
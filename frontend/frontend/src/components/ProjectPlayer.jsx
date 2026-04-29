import "../styles/auth.css";

function ProjectPlayer({ project, onBack }) {
  return (
    <div className="dashboard-page">
      <div className="dashboard-navbar">
        <h2>CollabCut</h2>

        {/* ✅ BACK BUTTON */}
        <button className="logout-btn" onClick={onBack}>
          ← back
        </button>
      </div>

      <div className="dashboard-content">
        <h1>{project.name}</h1>

        {project.video ? (
          <video controls width="800" className="video-player">
            <source src={`http://127.0.0.1:8000${project.video}`} />
          </video>
        ) : (
          <p>No video uploaded</p>
        )}
      </div>
    </div>
  );
}

export default ProjectPlayer;
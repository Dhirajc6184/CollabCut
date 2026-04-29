import { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import ProjectPlayer from "./components/ProjectPlayer";
import Invitations from "./components/Invitations";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setPage("dashboard");
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    setPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedProject(null);
    localStorage.removeItem("user");
    setPage("login");
  };

  return (
    <>
      {page === "register" && (
        <Register switchToLogin={() => setPage("login")} />
      )}

      {page === "login" && (
        <Login
          switchToRegister={() => setPage("register")}
          onLoginSuccess={handleLogin}
        />
      )}

      {page === "dashboard" && !selectedProject && (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onOpenProject={(project) => setSelectedProject(project)}
          goToInvites={() => {
            setSelectedProject(null);
            setPage("invitations");
          }}
        />
      )}

      {selectedProject && (
        <ProjectPlayer
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      )}

      {page === "invitations" && user && (
        <div className="dashboard-page">
          <div className="dashboard-navbar">
            <div>
              <h2>CollabCut</h2>
              <p>project invitations</p>
            </div>

            <button
              className="logout-btn"
              onClick={() => setPage("dashboard")}
            >
              ← back
            </button>
          </div>

          <div className="dashboard-content">
            <Invitations user={user} />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
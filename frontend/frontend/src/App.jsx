// FILE PATH: frontend/frontend/src/App.jsx
// REPLACE ENTIRE FILE
//
// KEY CHANGES vs original:
//   - Added `token` state (JWT returned at login)
//   - handleLogin now accepts (userData, jwtToken) instead of (userData)
//   - Saves/restores token in localStorage
//   - Passes token to ProjectWorkspace (replaces ProjectPlayer)
//   - Imports ProjectWorkspace instead of ProjectPlayer

import { useState, useEffect } from "react";
import Login        from "./components/Login";
import Register     from "./components/Register";
import Dashboard    from "./components/Dashboard";
import Invitations  from "./components/Invitations";
import ProjectWorkspace from "./components/ProjectWorkspace";

function App() {
  const [page,            setPage]            = useState("login");
  const [user,            setUser]            = useState(null);
  const [token,           setToken]           = useState(null);   // ← NEW
  const [selectedProject, setSelectedProject] = useState(null);

  // Restore session on reload
  useEffect(() => {
    const savedUser  = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      setPage("dashboard");
    }
  }, []);

  // Login.jsx calls this with (userData, jwtToken)
  const handleLogin = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("user",  JSON.stringify(userData));
    localStorage.setItem("token", jwtToken || "");
    setPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setSelectedProject(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
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

      {/* ProjectWorkspace routes to VideoEditor (editor) or ViewerProjectPage (viewer) */}
      {selectedProject && (
        <ProjectWorkspace
          project={selectedProject}
          user={user}
          token={token}
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
            <button className="logout-btn" onClick={() => setPage("dashboard")}>
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
import { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import ProjectPlayer from "./components/ProjectPlayer";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // ✅ Persistent login
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
      {/* REGISTER */}
      {page === "register" && (
        <Register switchToLogin={() => setPage("login")} />
      )}

      {/* LOGIN */}
      {page === "login" && (
        <Login
          switchToRegister={() => setPage("register")}
          onLoginSuccess={handleLogin}
        />
      )}

      {/* DASHBOARD */}
      {page === "dashboard" && !selectedProject && (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onOpenProject={(project) => setSelectedProject(project)}
        />
      )}

      {/* VIDEO PLAYER */}
      {selectedProject && (
        <ProjectPlayer
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      )}
    </>
  );
}

export default App;
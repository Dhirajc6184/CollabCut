import { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

  // ✅ Load user from localStorage on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setPage("dashboard");
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData)); // 🔥 persist
    setPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user"); // 🔥 clear
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

      {page === "dashboard" && (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
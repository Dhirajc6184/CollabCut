import { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

  return (
    <>
      {page === "register" && (
        <Register switchToLogin={() => setPage("login")} />
      )}

      {page === "login" && (
        <Login
          switchToRegister={() => setPage("register")}
          onLoginSuccess={(userData) => {
            setUser(userData);
            setPage("dashboard");
          }}
        />
      )}

      {page === "dashboard" && <Dashboard user={user} />}
      
    </>
  );
}

export default App;
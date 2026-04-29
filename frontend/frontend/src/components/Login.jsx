// FILE PATH: frontend/frontend/src/components/Login.jsx
// REPLACE ENTIRE FILE
//
// ONE KEY CHANGE vs original:
//   onLoginSuccess(res.data.user)  →  onLoginSuccess(res.data.user, res.data.token)
//
// Everything else is identical to your original Login.jsx.

import { useState } from "react";
import API from "../api/api";
import "../styles/auth.css";
import logo from "../assets/logo.png";

function Login({ switchToRegister, onLoginSuccess }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message,     setMessage]     = useState("");
  const [messageType, setMessageType] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage("");
    setMessageType("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("login/", form);
      setMessage(res.data.message || "Login successful");
      setMessageType("success");

      setTimeout(() => {
        // ← CHANGED: also pass res.data.token
        onLoginSuccess(res.data.user, res.data.token);
      }, 500);
    } catch (err) {
      console.log("ERROR:", err.response?.data);
      setMessage(
        err.response?.data?.error ||
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        "Login failed"
      );
      setMessageType("error");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="play-icon">▶</div>
          <h1>CollabCut</h1>
          <p className="subtitle">video processing pipeline</p>

          <div className="logo-container">
            <img src={logo} alt="App Logo" className="app-logo" />
          </div>

          <div className="terminal-box">
            <div className="dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>$ ffmpeg -i input.mp4 -vf scale=1280:-1 out.mp4</p>
            <p>frame= 240 fps= 60 size=1024kB time=00:00:08</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-tabs">
            <button className="active">sign in</button>
            <button onClick={switchToRegister}>register</button>
          </div>

          <div className="form-area">
            <h2>welcome back</h2>
            <p className="form-subtitle">sign in to your account</p>

            {message && (
              <div className={`auth-message ${messageType}`}>{message}</div>
            )}

            <form onSubmit={handleSubmit}>
              <label>EMAIL</label>
              <input
                name="email"
                type="email"
                placeholder="your email"
                value={form.email}
                onChange={handleChange}
                required
              />

              <label>PASSWORD</label>
              <input
                name="password"
                type="password"
                placeholder="your password"
                value={form.password}
                onChange={handleChange}
                required
                className="password-input"
              />

              <button type="submit" className="submit-btn">
                sign in →
              </button>
            </form>

            <p className="bottom-text">
              no account ? <span onClick={switchToRegister}>register</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
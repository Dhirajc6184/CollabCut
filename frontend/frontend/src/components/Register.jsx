import { useState } from "react";
import API from "../api/api";
import "../styles/auth.css";
import logo from '../assets/logo.png'
function Register({ switchToLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleChange = (e) => {
    const updatedForm = {
      ...form,
      [e.target.name]: e.target.value,
    };

    setForm(updatedForm);
    setMessage("");
    setMessageType("");

    if (
      updatedForm.password &&
      updatedForm.confirmPassword &&
      updatedForm.password !== updatedForm.confirmPassword
    ) {
      setError("Passwords do not match");
    } else {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await API.post("register/", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      setMessage("Registration successful! Please login.");
      setMessageType("success");
      setError("");

      setTimeout(() => {
        switchToLogin();
      }, 1200);
    } catch (err) {
      console.log("ERROR:", err.response?.data);

      setMessage(
        err.response?.data?.error ||
          err.response?.data?.message ||
          JSON.stringify(err.response?.data) ||
          "Registration failed"
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
            <button onClick={switchToLogin}>sign in</button>
            <button className="active">register</button>
          </div>

          <div className="form-area">
            <h2>create account</h2>
            <p className="form-subtitle">register your workspace</p>

            {message && (
              <div className={`auth-message ${messageType}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label>NAME</label>
              <input
                name="name"
                placeholder="your name"
                value={form.name}
                onChange={handleChange}
                required
              />

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
                placeholder="password"
                value={form.password}
                onChange={handleChange}
                required
              />

              <label>CONFIRM PASSWORD</label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="confirm password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="password-input"
              />

              {error && <p className="error">{error}</p>}

              <label>ROLE</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="">select role</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <button type="submit" className="submit-btn">
                register →
              </button>
            </form>

            <p className="bottom-text">
              already registered ? <span onClick={switchToLogin}>sign in</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
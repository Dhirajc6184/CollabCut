import { useState } from "react";
import API from "../api/api";
import "../styles/auth.css";

function Register({ switchToLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const updatedForm = {
      ...form,
      [e.target.name]: e.target.value,
    };

    setForm(updatedForm);

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

      alert("Registration successful! Please login.");
      switchToLogin();
    } catch (err) {
      console.log("ERROR:", err.response?.data);
      alert(JSON.stringify(err.response?.data));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-left">
          <div className="play-icon">▶</div>

          <h1>FFmpeg Studio</h1>
          <p className="subtitle">video processing pipeline</p>

          <ul className="features">
            <li>trim, crop, resize</li>
            <li>text overlays & effects</li>
            <li>speed, blur, grayscale</li>
            <li>compress & export</li>
          </ul>

          <div className="terminal-box">
            <div className="dots">
              <span></span><span></span><span></span>
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

            <form onSubmit={handleSubmit}>
              <label>NAME</label>
              <input name="name" placeholder="your name" onChange={handleChange} required />

              <label>EMAIL</label>
              <input name="email" type="email" placeholder="your email" onChange={handleChange} required />

              <label>PASSWORD</label>
              <input name="password" type="password" placeholder="password" onChange={handleChange} required />

              <label>CONFIRM PASSWORD</label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="confirm password"
                onChange={handleChange}
                required
                className="password-input"
              />

              {error && <p className="error">{error}</p>}

              <label>ROLE</label>
              <select name="role" onChange={handleChange} required>
                <option value="">select role</option>
                <option value="creator">Creator</option>
                <option value="editor">Editor</option>
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
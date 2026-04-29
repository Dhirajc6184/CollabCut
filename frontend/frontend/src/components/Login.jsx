import { useState } from "react";
import API from "../api/api";
import "../styles/auth.css";

function Login({ switchToRegister, onLoginSuccess }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("login/", form);
      alert(res.data.message);
      onLoginSuccess(res.data.user);
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
            <button className="active">sign in</button>
            <button onClick={switchToRegister}>register</button>
          </div>

          <div className="form-area">
            <h2>welcome back</h2>
            <p className="form-subtitle">sign in to your account</p>

            <form onSubmit={handleSubmit}>
              <label>EMAIL</label>
              <input
                name="email"
                type="email"
                placeholder="your email"
                onChange={handleChange}
                required
              />

              <label>PASSWORD</label>
              <input
                name="password"
                type="password"
                placeholder="your password"
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
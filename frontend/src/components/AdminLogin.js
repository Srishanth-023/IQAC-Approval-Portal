import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api";
import { toast } from "react-toastify";
import "./Login.css";
import logo from '../assets/kite-logo.png';
import ipslogo from '../assets/ips.webp';
import { BsShieldLock, BsKey, BsArrowLeft } from "react-icons/bs";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        role: "ADMIN",
        password: password,
      };

      const res = await loginUser(payload);

      localStorage.setItem("user", JSON.stringify(res.data.user));

      toast.success("Admin Login Successful!");

      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-page-wrapper">

        {/* Header */}
        <div className="login-header">
          <div className="login-header-accent"></div>
          <div className="login-header-content">
            <div className="login-header-left">
              <div className="login-logo-box">
                <img src={logo} alt="KITE Logo" className="login-kite-logo" />
              </div>
              <div className="login-header-text">
                <h2 className="login-header-title">IQAC Approval Portal</h2>
                <div className="login-header-subtitle-wrapper">
                  <div className="login-header-dot"></div>
                  <p className="login-header-subtitle">KGiSL Institute of Technology</p>
                </div>
              </div>
            </div>
            <img src={ipslogo} alt="IPS Logo" className="login-ips-logo" />
          </div>
        </div>

        {/* Login Card */}
        <div className="login-main-card">
          <div className="login-card-header">
            <h1 className="login-card-title"><BsShieldLock style={{ marginRight: '0.5rem' }} /> Admin Login</h1>
            <p className="login-card-subtitle">Enter administrator credentials to access the portal</p>
          </div>

          <div className="login-form-container">
            <form onSubmit={handleLogin} className="login-form">
              
              {/* PASSWORD */}
              <div className="login-form-group">
                <label className="login-label">Password</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-submit-btn">
                <BsKey style={{ marginRight: '0.5rem' }} /> Login
              </button>

              <div style={{ textAlign: "center", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  className="login-submit-btn"
                  onClick={() => navigate("/")}
                  style={{ 
                    background: "linear-gradient(to right, #64748b, #475569)",
                    boxShadow: "0 10px 15px -3px rgba(100, 116, 139, 0.3)"
                  }}
                >
                  <BsArrowLeft style={{ marginRight: '0.5rem' }} /> Back to User Login
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="login-footer">
          <div className="login-footer-card">
            <div className="login-footer-header">
              <div className="login-footer-brand">
                <span className="login-footer-icon">&lt;/&gt;</span>
                <h3 className="login-footer-title">KGISL Institute of Technology</h3>
              </div>
            </div>
            
            <div className="login-footer-divider"></div>
            
            <div className="login-footer-content">
              <p className="login-footer-copyright">
                © {new Date().getFullYear()} KGISL Institute of Technology. All rights reserved.
              </p>
              <p className="login-footer-powered">
                <span>Powered by IPS Tech Community</span>
                <img src={ipslogo} alt="IPS Logo" className="login-footer-logo" />
              </p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

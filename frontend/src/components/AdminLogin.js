import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api";
import { toast } from "react-toastify";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';

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
    <div className="dashboard-page">
      <div className="dashboard-wrapper" style={{ maxWidth: "500px" }}>
        {/* Header */}
        <div className="dashboard-header" style={{ textAlign: "center", flexDirection: "column", gap: "1rem" }}>
          <div className="header-content" style={{ justifyContent: "center" }}>
            <img src={logo} alt="Logo" className="header-logo" />
            <div className="header-text">
              <h1>IQAC Approval Portal</h1>
              <p>Administrator Access</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="dashboard-card">
          <div className="card-header" style={{ justifyContent: "center" }}>
            <h3>🔐 Admin Login</h3>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group-custom">
              <label className="form-label-custom">Password</label>
              <input
                type="password"
                className="form-input-custom"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>

            <button className="btn-primary-custom" type="submit" style={{ width: "100%", marginTop: "1rem" }}>
              🔑 Login
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
            <button
              className="btn-secondary-custom"
              onClick={() => navigate("/")}
              style={{ width: "100%" }}
            >
              ← Back to User Login
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="dashboard-footer">
          <p>© 2025 KITE Group of Institutions. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

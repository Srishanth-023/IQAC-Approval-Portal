import React, { useState } from "react";
import { loginUser } from "../../../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import logo from '../../../assets/kite-logo.png';
import ipslogo from '../../../assets/ips.webp';
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");

  const departments = ["AI&DS", "CSE", "ECE", "IT", "MECH", "AI&ML", "CYS", "R&A", "CSBS", "S&H"];

  const handleLogin = async (e) => {
    e.preventDefault();

    // Admin Login
    if (role === "ADMIN") {
      if (password === "admin@123") {
        const adminUser = {
          name: "Admin",
          role: "ADMIN",
        };
        localStorage.setItem("user", JSON.stringify(adminUser));
        toast.success("Admin Login Successful!");
        return navigate("/admin/dashboard");
      } else {
        return toast.error("Invalid Admin Password");
      }
    }

    // Normal Login
    try {
      const payload = {
        role,
        name,
        password,
        department: role === "HOD" ? department : undefined,
      };

      const res = await loginUser(payload);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Login Successful!");

      if (role === "STAFF") navigate("/staff-home");
      else if (role === "IQAC") navigate("/iqac-home");
      else navigate(`/role/${role.toLowerCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
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
            <h1 className="login-card-title">Login</h1>
            <p className="login-card-subtitle">Enter your credentials to access the portal</p>
          </div>

          <div className="login-form-container">
            <form onSubmit={handleLogin} className="login-form">
              
              {/* ROLE SELECT */}
              <div className="login-form-group">
                <label className="login-label">Role</label>
                <select
                  className="login-input"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setName("");
                  }}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="HOD">HOD</option>
                  <option value="IQAC">IQAC</option>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="AO">AO</option>
                  <option value="CEO">CEO</option>
                </select>
              </div>

              {/* STAFF NAME */}
              {role === "STAFF" && (
                <div className="login-form-group">
                  <label className="login-label">Staff Name</label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* HOD DEPARTMENT SELECT */}
              {role === "HOD" && (
                <div className="login-form-group">
                  <label className="login-label">Department</label>
                  <select
                    className="login-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* PASSWORD */}
              <div className="login-form-group">
                <label className="login-label">Password</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder={role === "ADMIN" ? "Enter Admin Password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-submit-btn">
                Login
              </button>
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

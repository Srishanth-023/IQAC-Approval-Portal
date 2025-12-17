import React, { useEffect, useState } from "react";
import { adminFetchAllRequests, adminDeleteRequest, adminDeleteAllRequests, approvalLetterUrl } from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';

export default function AdminAllRequests() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await adminFetchAllRequests(user.role);
      setRequests(res.data);
    } catch (err) {
      toast.error("Failed to load all requests");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this request? This action cannot be undone.")) {
      return;
    }

    try {
      await adminDeleteRequest(id, user.role);
      toast.success("Request deleted successfully");
      loadRequests();
    } catch (err) {
      toast.error("Failed to delete request");
    }
  };

  const handleDeleteAll = async () => {
    if (requests.length === 0) {
      toast.warning("No requests to delete");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ALL ${requests.length} requests? This action cannot be undone!`)) {
      return;
    }

    if (!window.confirm("Final confirmation: This will permanently delete all requests. Are you absolutely sure?")) {
      return;
    }

    try {
      const res = await adminDeleteAllRequests(user.role);
      toast.success(`Successfully deleted ${res.data.deletedCount} requests`);
      loadRequests();
    } catch (err) {
      toast.error("Failed to delete all requests");
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-wrapper">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <img src={logo} alt="Logo" className="header-logo" />
            <div className="header-text">
              <h1>IQAC Approval Portal</h1>
              <p>Admin Request Management</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button className="btn-secondary-custom" onClick={() => navigate("/admin/dashboard")}>
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📋 All Requests (Admin View)</h3>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span className="badge-custom badge-pending">{requests.length} Total</span>
              <button
                className="btn-danger-custom"
                onClick={handleDeleteAll}
                disabled={requests.length === 0}
                style={{ opacity: requests.length === 0 ? 0.5 : 1 }}
              >
                🗑️ Delete All Requests
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading requests...</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Reference No</th>
                    <th>Staff</th>
                    <th>Department</th>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Report</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center" style={{ padding: "2rem", color: "#64748b" }}>
                        No requests found
                      </td>
                    </tr>
                  ) : (
                    requests.map((req, index) => (
                      <tr key={req._id}>
                        <td><strong>{index + 1}</strong></td>
                        <td>{req.referenceNo || "-"}</td>
                        <td>{req.staffName}</td>
                        <td>{req.department}</td>
                        <td>{req.eventName}</td>
                        <td>{req.eventDate}</td>
                        <td>
                          <span className={req.isCompleted ? "badge-custom badge-approved" : "badge-custom badge-pending"}>
                            {req.overallStatus}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-primary-custom"
                            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                            onClick={() => window.open(approvalLetterUrl(req._id), "_blank")}
                          >
                            📄 View Letter
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn-danger-custom"
                            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                            onClick={() => handleDelete(req._id)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dashboard-footer">
          <p>© 2025 KITE Group of Institutions. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

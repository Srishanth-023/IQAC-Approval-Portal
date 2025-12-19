import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllRequests } from "../api";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';
import { BsClipboardData, BsArrowLeft } from "react-icons/bs";

function AllRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchAllRequests();
      setRequests(res.data?.requests || []);
    } catch (err) {
      console.error("Error fetching all requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("approved") || statusLower.includes("completed")) {
      return "badge-custom badge-approved";
    } else if (statusLower.includes("reject")) {
      return "badge-custom badge-rejected";
    } else if (statusLower.includes("pending")) {
      return "badge-custom badge-pending";
    }
    return "badge-custom badge-pending";
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-wrapper">
        {/* HEADER */}
        <div className="dashboard-header fade-in">
          <div className="dashboard-header-accent"></div>
          <div className="dashboard-header-content">
            <div className="dashboard-header-left">
              <div className="dashboard-logo-box">
                <img src={logo} alt="KITE Logo" className="dashboard-logo" />
              </div>
              <div className="dashboard-title-section">
                <h1>All Requests</h1>
                <p>View all approval requests in the system</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <button 
                className="btn-secondary-custom" 
                onClick={() => navigate(-1)}
              >
                <BsArrowLeft style={{ marginRight: '0.5rem' }} /> Back
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><BsClipboardData style={{ marginRight: '0.5rem' }} /> All Requests</h3>
            <span className="badge-custom badge-pending">{requests.length} Total</span>
          </div>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p className="loading-text">Loading requests...</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Event</th>
                    <th>Staff</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center" style={{ padding: "2rem", color: "#64748b" }}>
                        No requests found
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.id}</strong></td>
                        <td>{r.event_name}</td>
                        <td>{r.name}</td>
                        <td>{r.created_time}</td>
                        <td>
                          <span className={getStatusBadge(r.status)}>
                            {r.status}
                          </span>
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

export default AllRequests;

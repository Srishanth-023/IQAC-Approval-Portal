import React, { useEffect, useState } from "react";
import {
  fetchRequestsForRole,
  actOnRequest,
  approvalLetterUrl,
  getFreshReportUrl,
} from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import useDisableBack from "./useDisableBack";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';

function IQACHome() {
  // ------------------------------------
  // HOOKS
  // ------------------------------------
  const navigate = useNavigate();
  useDisableBack();

  const role = "IQAC";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [refNumbers, setRefNumbers] = useState({}); // per request
  const [workflows, setWorkflows] = useState({}); // per request
  const [comments, setComments] = useState({}); // comments per request

  const flowOptions = ["HOD", "PRINCIPAL", "DIRECTOR", "AO", "CEO"];

  // ------------------------------------
  // LOGOUT
  // ------------------------------------
  const logout = () => {
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // ------------------------------------
  // LOAD REQUESTS
  // ------------------------------------
  const loadRequests = async () => {
    try {
      const res = await fetchRequestsForRole(role);
      setRequests(res.data);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to load requests");
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // ------------------------------------
  // VIEW REPORT - Fetch fresh signed URL
  // ------------------------------------
  const handleViewReport = async (id) => {
    try {
      const res = await getFreshReportUrl(id);
      if (res.data.url) {
        window.open(res.data.url, "_blank");
      }
    } catch {
      toast.error("Failed to load report");
    }
  };

  // ------------------------------------
  // COMMENT HANDLER
  // ------------------------------------
  const handleCommentChange = (id, text) => {
    setComments((prev) => ({ ...prev, [id]: text }));
  };

  // ------------------------------------
  // APPROVE
  // ------------------------------------
  const handleApprove = async (id) => {
    const cmt = comments[id] || "";
    const refNumber = refNumbers[id] || "";
    const flowRoles = workflows[id] || [];

    // Reference number must be exactly 8 digits
    if (!/^\d{8}$/.test(refNumber)) {
      return toast.error("Reference number must be exactly 8 digits (numbers only).");
    }

    // At least one next approver required
    if (flowRoles.length === 0) {
      return toast.error("Select at least one role for the workflow.");
    }

    try {
      await actOnRequest(id, {
        action: "approve",
        comments: cmt,
        refNumber,
        flow: flowRoles,
      });

      toast.success("Approved and forwarded!");

      // reset only for that card
      setComments((prev) => ({ ...prev, [id]: "" }));
      setRefNumbers((prev) => ({ ...prev, [id]: "" }));
      setWorkflows((prev) => ({ ...prev, [id]: [] }));

      loadRequests();
    } catch {
      toast.error("Approval failed");
    }
  };

  // ------------------------------------
  // RECREATE
  // ------------------------------------
  const handleRecreate = async (id) => {
    const cmt = comments[id];

    if (!cmt || cmt.trim() === "") {
      return toast.error("Comments are required for recreation!");
    }

    try {
      await actOnRequest(id, {
        action: "recreate",
        comments: cmt,
      });

      toast.success("Sent back for recreation!");

      // reset comment only for this request
      setComments((prev) => ({ ...prev, [id]: "" }));

      loadRequests();
    } catch {
      toast.error("Recreate failed");
    }
  };

  if (loading) return (
    <div className="dashboard-page">
      <div className="dashboard-wrapper">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading requests...</p>
        </div>
      </div>
    </div>
  );

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
                <h1>IQAC Dashboard</h1>
                <p>Review event requests, assign workflow, approve or recreate</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <div className="dashboard-user-info">
                <div className="dashboard-user-name">Welcome, IQAC</div>
                <div className="dashboard-user-role">Internal Quality Assurance Cell</div>
              </div>
              <button className="btn-logout" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* REQUEST CARDS */}
        {requests.length === 0 ? (
          <div className="dashboard-card fade-in">
            <div className="dashboard-card-body">
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <h4>No pending requests</h4>
                <p>All caught up! No requests are waiting for IQAC review.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {requests.map((req) => (
              <div className="col-lg-4 col-md-6" key={req._id}>
                <div className="dashboard-card fade-in" style={{ height: '100%' }}>
                  <div className="dashboard-card-header" style={{ padding: '1rem 1.25rem' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{req.eventName}</h4>
                    <p style={{ margin: 0, opacity: 0.9 }}>{req.staffName} • {req.department}</p>
                  </div>
                  <div className="dashboard-card-body" style={{ padding: '1.25rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                        <strong>Event Date:</strong> {req.eventDate}
                      </p>
                      <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                        <strong>Status:</strong>{' '}
                        <span className={`badge-custom ${
                          req.isCompleted ? 'badge-approved' : 
                          req.overallStatus?.toLowerCase().includes('pending') ? 'badge-pending' : 
                          'badge-processing'
                        }`}>
                          {req.overallStatus}
                        </span>
                      </p>
                    </div>

                    {req.reportUrl && (
                      <button
                        className="btn-secondary-custom btn-sm-custom w-100"
                        onClick={() => handleViewReport(req._id)}
                        style={{ marginBottom: '0.75rem' }}
                      >
                        📄 View Uploaded Report
                      </button>
                    )}

                    {req.isCompleted && (
                      <button
                        className="btn-success-custom btn-sm-custom w-100"
                        onClick={() => window.open(approvalLetterUrl(req._id), "_blank")}
                      >
                        ✅ Generate Approval Report
                      </button>
                    )}

                    {req.currentRole === role && (
                      <>
                        <div className="section-divider" style={{ margin: '1rem 0' }}></div>

                        <div className="form-group-custom">
                          <label className="form-label-custom">Reference Number (8 digits)</label>
                          <input
                            type="text"
                            className="form-input-custom"
                            maxLength="8"
                            placeholder="Enter 8 digit number"
                            value={refNumbers[req._id] || ""}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, "");
                              setRefNumbers((prev) => ({
                                ...prev,
                                [req._id]: value,
                              }));
                            }}
                          />
                          <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Only numbers allowed (e.g., 12345678)</small>
                        </div>

                        <div className="form-group-custom">
                          <label className="form-label-custom">Workflow Roles</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {flowOptions.map((r) => (
                              <label key={r} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.375rem',
                                padding: '0.375rem 0.75rem',
                                background: (workflows[req._id] || []).includes(r) ? '#dbeafe' : '#f1f5f9',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: (workflows[req._id] || []).includes(r) ? '#1e40af' : '#475569',
                                transition: 'all 0.2s ease'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={(workflows[req._id] || []).includes(r)}
                                  onChange={() =>
                                    setWorkflows((prev) => {
                                      const current = prev[req._id] || [];
                                      return {
                                        ...prev,
                                        [req._id]: current.includes(r)
                                          ? current.filter((x) => x !== r)
                                          : [...current, r],
                                      };
                                    })
                                  }
                                  style={{ accentColor: '#3b82f6' }}
                                />
                                {r}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="form-group-custom">
                          <label className="form-label-custom">Comments</label>
                          <textarea
                            className="form-input-custom"
                            placeholder="Enter comments (required for recreate)"
                            value={comments[req._id] || ""}
                            onChange={(e) => handleCommentChange(req._id, e.target.value)}
                            style={{ minHeight: '80px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-success-custom btn-sm-custom"
                            onClick={() => handleApprove(req._id)}
                            style={{ flex: 1 }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            className="btn-warning-custom btn-sm-custom"
                            onClick={() => handleRecreate(req._id)}
                            style={{ flex: 1 }}
                          >
                            🔄 Recreate
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div className="dashboard-footer fade-in">
          <div className="dashboard-footer-content">
            <div className="dashboard-footer-brand">
              <span>IQAC Approval Portal</span>
            </div>
            <div className="dashboard-footer-text">
              © 2025 KGiSL Institute of Technology. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IQACHome;

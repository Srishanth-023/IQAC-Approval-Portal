import React, { useEffect, useState } from "react";
import {
  fetchRequestsForRole,
  actOnRequest,
  approvalLetterUrl,
  getFreshReportUrl,
  checkReferenceNumber,
} from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import useDisableBack from "./useDisableBack";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';

const flowOptions = ["HOD", "PRINCIPAL", "DIRECTOR", "AO", "CEO"];

function IQACHome() {
  const role = "IQAC";
  const navigate = useNavigate();
  useDisableBack();

  const [requests, setRequests] = useState([]);
  const [refNumbers, setRefNumbers] = useState({});
  const [workflows, setWorkflows] = useState({});
  const [comments, setComments] = useState({});
  const [refWarnings, setRefWarnings] = useState({});
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetchRequestsForRole("IQAC");
      setRequests(res.data);
    } catch (err) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

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

  const checkRefNumberUniqueness = async (refNo, requestId) => {
    if (refNo.length === 8) {
      try {
        const res = await checkReferenceNumber(refNo);
        if (res.data.exists) {
          setRefWarnings(prev => ({
            ...prev,
            [requestId]: `⚠️ Reference number "${refNo}" is already used by another request!`
          }));
        } else {
          setRefWarnings(prev => {
            const newWarnings = { ...prev };
            delete newWarnings[requestId];
            return newWarnings;
          });
        }
      } catch (err) {
        console.error("Error checking ref number:", err);
      }
    } else {
      setRefWarnings(prev => {
        const newWarnings = { ...prev };
        delete newWarnings[requestId];
        return newWarnings;
      });
    }
  };

  const handleCommentChange = (id, value) => {
    setComments((prev) => ({ ...prev, [id]: value }));
  };

  const handleApprove = async (id) => {
    const ref = refNumbers[id] || "";
    const flow = workflows[id] || [];
    const cmt = comments[id] || "";

    if (ref.length !== 8 || !/^[A-Za-z0-9]+$/.test(ref)) {
      return toast.error("Reference Number must be exactly 8 alphanumeric characters");
    }

    if (refWarnings[id]) {
      return toast.error("Please use a different reference number - this one is already in use");
    }

    if (flow.length === 0) {
      return toast.error("Select at least one workflow role");
    }

    try {
      await approveIQAC(id, {
        referenceNo: ref,
        workflowRoles: flow,
        comments: cmt,
      });

      toast.success("Request approved and forwarded!");
      loadRequests();
    } catch (err) {
      if (err.response?.data?.error?.includes("duplicate") || err.response?.data?.error?.includes("already exists")) {
        toast.error("This reference number is already in use. Please choose a different one.");
        setRefWarnings(prev => ({
          ...prev,
          [id]: `⚠️ Reference number "${ref}" is already used!`
        }));
      } else {
        toast.error(err.response?.data?.error || "Failed to approve");
      }
    }
  };

  const handleRecreate = async (id) => {
    const cmt = comments[id];
    if (!cmt) return toast.error("Comments required to recreate");

    try {
      await recreateRequest(id, { role, comments: cmt });
      toast.success("Request returned to staff");
      loadRequests();
    } catch (err) {
      toast.error("Failed to recreate request");
    }
  };

  if (loading) return (
    <div className="dashboard-page">
      <div className="dashboard-wrapper">
        <div className="loading-spinner">
          <div className="spinner"></div>
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
              <div className="col-md-6 col-lg-4" key={req._id}>
                <div className="dashboard-card fade-in h-100">
                  <div className="dashboard-card-body">
                    {/* Basic Details */}
                    <h5 style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '1rem' }}>
                      📋 {req.eventName}
                    </h5>
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                        <strong>Event Date:</strong> {req.eventDate}
                      </p>
                      <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                        <strong>Staff:</strong> {req.staffName}
                      </p>
                      <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                        <strong>Department:</strong> {req.department}
                      </p>
                      <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                        <strong>Status:</strong>{" "}
                        <span className="badge-custom badge-pending">{req.overallStatus}</span>
                      </p>
                    </div>

                    {/* View Report */}
                    {req.reportUrl && (
                      <button
                        className="btn-secondary-custom btn-sm-custom w-100"
                        onClick={() => handleViewReport(req._id)}
                        style={{ marginBottom: '1rem' }}
                      >
                        📄 View Uploaded Report
                      </button>
                    )}

                    {/* Show Approval Report when completed */}
                    {req.isCompleted && (
                      <button
                        className="btn-success-custom btn-sm-custom w-100"
                        onClick={() => window.open(approvalLetterUrl(req._id), "_blank")}
                        style={{ marginBottom: '1rem' }}
                      >
                        ✅ Generate Approval Report
                      </button>
                    )}

                    {/* IQAC Actions */}
                    {req.currentRole === role && (
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        {/* Reference Number */}
                        <div className="form-group-custom">
                          <label className="form-label-custom" style={{ fontWeight: 600 }}>
                            Reference Number (8 characters)
                          </label>
                          <input
                            type="text"
                            className="form-input-custom"
                            maxLength="8"
                            placeholder="Enter 8 character reference"
                            value={refNumbers[req._id] || ""}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                              setRefNumbers((prev) => ({
                                ...prev,
                                [req._id]: value,
                              }));
                              checkRefNumberUniqueness(value, req._id);
                            }}
                            style={refWarnings[req._id] ? { borderColor: '#f59e0b' } : {}}
                          />
                          {refWarnings[req._id] ? (
                            <small style={{ color: '#f59e0b', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                              {refWarnings[req._id]}
                            </small>
                          ) : (
                            <small style={{ color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                              Letters and numbers only (e.g., AB123456)
                            </small>
                          )}
                        </div>

                        {/* Workflow Roles */}
                        <div className="form-group-custom">
                          <label className="form-label-custom" style={{ fontWeight: 600 }}>
                            Select Workflow Roles
                          </label>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '0.5rem', 
                            padding: '0.75rem',
                            border: '1px solid #e2e8f0'
                          }}>
                            {flowOptions.map((r) => (
                              <label key={r} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                padding: '0.375rem 0',
                                cursor: 'pointer',
                                color: '#475569'
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
                                  style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                                />
                                <span>{r}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Comments */}
                        <div className="form-group-custom">
                          <label className="form-label-custom" style={{ fontWeight: 600 }}>
                            Comments
                          </label>
                          <textarea
                            className="form-input-custom"
                            placeholder="Enter comments (required for recreate)"
                            value={comments[req._id] || ""}
                            onChange={(e) => handleCommentChange(req._id, e.target.value)}
                            rows="2"
                            style={{ resize: 'vertical' }}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-primary-custom btn-sm-custom"
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
                      </div>
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

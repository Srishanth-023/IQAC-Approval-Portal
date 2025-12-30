import React, { useEffect, useState } from "react";
import {
  fetchRequestsForRole,
  actOnRequest,
  approvalLetterUrl,
  getFreshReportUrl,
  checkReferenceNumber,
} from "../../../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useDisableBack } from "../../hooks";
import "../../../styles/Dashboard.css";
import logo from '../../../assets/kite-logo.png';
import { 
  BsClipboardData, BsFileEarmarkText, BsCheckCircle, BsSearch, 
  BsArrowRepeat, BsExclamationTriangle, BsClockHistory, BsChatLeftText,
  BsInfoCircle, BsEye
} from "react-icons/bs";

const flowOptions = ["PRINCIPAL", "DIRECTOR", "AO", "CEO"];

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
  const [showPurposeModal, setShowPurposeModal] = useState(null);
  
  // Filter states
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterEventName, setFilterEventName] = useState("");
  
  // Modal state for viewing remarks
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRequestRemarks, setSelectedRequestRemarks] = useState(null);

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetchRequestsForRole("IQAC");
      setRequests(res.data);
      
      // Pre-fill reference numbers and workflows for resubmitted requests
      const newRefNumbers = {};
      const newWorkflows = {};
      res.data.forEach(req => {
        if (req.referenceNo) {
          newRefNumbers[req._id] = req.referenceNo;
        }
        if (req.workflowRoles && req.workflowRoles.length > 0) {
          newWorkflows[req._id] = req.workflowRoles;
        }
      });
      setRefNumbers(prev => ({ ...prev, ...newRefNumbers }));
      setWorkflows(prev => ({ ...prev, ...newWorkflows }));
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

  const handleViewRemarks = (request) => {
    setSelectedRequestRemarks({
      eventName: request.eventName,
      eventDate: request.eventDate,
      staffName: request.staffName,
      department: request.department,
      purpose: request.purpose,
      originalPurpose: request.originalPurpose,
      approvals: request.approvals || []
    });
    setShowRemarksModal(true);
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
      await actOnRequest(id, {
        role: "IQAC",
        action: "approve",
        refNumber: ref,
        flow: flow,
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
      await actOnRequest(id, { 
        role: "IQAC", 
        action: "recreate", 
        comments: cmt 
      });
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
              <button 
                className="btn-track-header" 
                onClick={() => navigate("/track-requests")}
                title="Track Event Requests"
              >
                <BsClockHistory style={{ marginRight: '0.5rem' }} />
                Track Requests
              </button>
              <button className="btn-logout" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* FILTER SECTION */}
        {requests.length > 0 && (
          <div className="dashboard-card fade-in" style={{ marginBottom: '1.5rem' }}>
            <div className="filter-section">
              <div className="filter-row">
                <div className="filter-item">
                  <label className="filter-label">Filter by Department</label>
                  <select
                    className="filter-select"
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {[...new Set(requests.map(req => req.department))].sort().map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-item">
                  <label className="filter-label">Filter by Event Name</label>
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Search event name..."
                    value={filterEventName}
                    onChange={(e) => setFilterEventName(e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label className="filter-label">&nbsp;</label>
                  <button
                    className="btn-secondary-custom"
                    onClick={() => {
                      setFilterDepartment("");
                      setFilterEventName("");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              <div className="filter-info">
                Showing {requests.filter((req) => {
                  const matchesDepartment = filterDepartment === "" || req.department === filterDepartment;
                  const matchesEventName = filterEventName === "" || req.eventName.toLowerCase().includes(filterEventName.toLowerCase());
                  return matchesDepartment && matchesEventName;
                }).length} of {requests.length} requests
              </div>
            </div>
          </div>
        )}

        {/* REQUEST CARDS */}
        {requests.filter((req) => {
          const matchesDepartment = filterDepartment === "" || req.department === filterDepartment;
          const matchesEventName = filterEventName === "" || req.eventName.toLowerCase().includes(filterEventName.toLowerCase());
          return matchesDepartment && matchesEventName;
        }).length === 0 ? (
          <div className="dashboard-card fade-in">
            <div className="dashboard-card-body">
              <div className="empty-state">
                <div className="empty-state-icon"><BsSearch size={48} /></div>
                <h4>No requests found</h4>
                <p>{requests.length === 0 ? "All caught up! No requests are waiting for IQAC review." : "No requests match your filter criteria."}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {requests.filter((req) => {
              const matchesDepartment = filterDepartment === "" || req.department === filterDepartment;
              const matchesEventName = filterEventName === "" || req.eventName.toLowerCase().includes(filterEventName.toLowerCase());
              return matchesDepartment && matchesEventName;
            }).map((req) => {
              // Only show resubmitted flag if IQAC has already reviewed this request
              const hasReviewedBefore = req.isResubmitted && req.approvals && req.approvals.some(a => a.role === 'IQAC');
              
              return (
              <div className="col-md-6 col-lg-4" key={req._id}>
                <div className="dashboard-card fade-in h-100" style={{ position: 'relative' }}>
                  {hasReviewedBefore && (
                    <div className="resubmitted-badge">
                      <span>✓ Resubmitted</span>
                    </div>
                  )}
                  <div className="dashboard-card-body">
                    {/* Basic Details */}
                    <h5 style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '1rem' }}>
                      <BsClipboardData style={{ marginRight: '0.5rem' }} /> {req.eventName}
                    </h5>
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: '0.6rem 0', color: '#475569' }}>
                        <strong>Event Date:</strong> {req.eventDate}
                      </p>
                      <p style={{ margin: '0.6rem 0', color: '#475569' }}>
                        <strong>Staff:</strong> {req.staffName}
                      </p>
                      <p style={{ margin: '0.6rem 0', color: '#475569' }}>
                        <strong>Department:</strong> {req.department}
                      </p>
                      <div style={{ margin: '0.25rem 0' }}>
                        <p style={{ margin: 0, color: '#475569' }}>
                          <strong>Purpose:</strong> <span style={{ 
                            display: '-webkit-box', 
                            WebkitLineClamp: 2, 
                            WebkitBoxOrient: 'vertical', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            lineHeight: '1.5'
                          }}>{req.purpose}</span>
                        </p>
                        {req.purpose && req.purpose.length > 100 && (
                          <button
                            onClick={() => setShowPurposeModal(req)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#3b82f6',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              padding: '0.25rem 0',
                              textDecoration: 'underline',
                              marginTop: '0.25rem'
                            }}
                          >
                            See more
                          </button>
                        )}
                      </div>
                      {req.originalPurpose && req.originalPurpose !== req.purpose && (
                        <p style={{ margin: '0.6rem 0', color: '#dc2626', fontSize: '0.875rem', fontStyle: 'italic' }}>
                          <strong>⚠️ Purpose Modified</strong> (Original: {req.originalPurpose?.length > 80 ? `${req.originalPurpose.substring(0, 80)}...` : req.originalPurpose})
                        </p>
                      )}
                      <p style={{ marginTop: '1rem', marginBottom: '0.6rem', color: '#475569' }}>
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
                        <BsFileEarmarkText style={{ marginRight: '0.25rem' }} /> View Uploaded Report
                      </button>
                    )}

                    {/* Show Approval Report when completed */}
                    {req.isCompleted && (
                      <button
                        className="btn-success-custom btn-sm-custom w-100"
                        onClick={() => window.open(approvalLetterUrl(req._id), "_blank")}
                        style={{ marginBottom: '1rem' }}
                      >
                        <BsCheckCircle style={{ marginRight: '0.25rem' }} /> Generate Approval Report
                      </button>
                    )}

                    {/* IQAC Actions */}
                    {req.currentRole === role && (
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        {/* Reference Number */}
                        <div className="form-group-custom">
                          <label className="form-label-custom" style={{ fontWeight: 600 }}>
                            Reference Number (8 characters) <span style={{color:'red'}}>*</span>
                          </label>
                          {req.referenceNo ? (
                            <div style={{
                              background: '#f1f5f9',
                              border: '2px solid #94a3b8',
                              borderRadius: '0.375rem',
                              padding: '0.625rem 0.75rem',
                              fontWeight: 600,
                              color: '#475569',
                              marginBottom: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <span style={{ color: '#64748b', fontSize: '0.875rem' }}></span>
                              {refNumbers[req._id] || req.referenceNo}
                            </div>
                          ) : (
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
                              required
                            />
                          )}
                          {refWarnings[req._id] && !req.referenceNo ? (
                            <small style={{ color: '#f59e0b', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                              {refWarnings[req._id]}
                            </small>
                          ) : req.referenceNo ? (
                            <small style={{ color: '#64748b', display: 'block', marginTop: '0.25rem', fontStyle: 'italic' }}>
                               Reference number is locked for resubmitted requests
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
                            Select Workflow Roles <span style={{color:'red'}}>*</span>
                          </label>
                          <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '0.5rem', 
                            padding: '0.75rem',
                            border: '1px solid #e2e8f0'
                          }}>
                            {req.workflowRoles && req.workflowRoles.length > 0 ? (
                              <div>
                                <div style={{ 
                                  color: '#475569', 
                                  fontWeight: 600, 
                                  padding: '0.5rem',
                                  background: '#f1f5f9',
                                  borderRadius: '0.375rem',
                                  border: '2px solid #94a3b8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}>
                                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}></span>
                                  {(workflows[req._id] || req.workflowRoles || []).join(' → ')}
                                </div>
                                <small style={{ color: '#64748b', display: 'block', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                   Workflow is locked for resubmitted requests
                                </small>
                              </div>
                            ) : (
                              flowOptions.map((r) => (
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
                              ))
                            )}
                          </div>
                        </div>

                        {/* Comments */}
                        <div className="form-group-custom">
                          <label className="form-label-custom" style={{ fontWeight: 600 }}>
                            Comments
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                              ({(comments[req._id] || "").length}/400)
                            </span>
                          </label>
                          <textarea
                            className="form-input-custom"
                            placeholder="Enter comments (required for recreate)"
                            value={comments[req._id] || ""}
                            onChange={(e) => handleCommentChange(req._id, e.target.value.slice(0, 400))}
                            rows="2"
                            style={{ resize: 'vertical' }}
                            maxLength="400"
                          />
                        </div>

                        {/* View Remarks Button */}
                        <button
                          className="btn-secondary-custom btn-sm-custom w-100"
                          onClick={() => handleViewRemarks(req)}
                          title="View previous authority remarks"
                          style={{ marginBottom: '0.5rem' }}
                        >
                          <BsEye style={{ marginRight: '0.25rem' }} /> Remarks
                        </button>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-primary-custom btn-sm-custom"
                            onClick={() => handleApprove(req._id)}
                            style={{ flex: 1 }}
                          >
                            <BsCheckCircle style={{ marginRight: '0.25rem' }} /> Approve
                          </button>
                          <button
                            className="btn-warning-custom btn-sm-custom"
                            onClick={() => handleRecreate(req._id)}
                            style={{ flex: 1 }}
                          >
                            <BsArrowRepeat style={{ marginRight: '0.25rem' }} /> Recreate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
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

      {/* Purpose Modal */}
      {showPurposeModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowPurposeModal(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.25rem', fontWeight: 700 }}>
                  {showPurposeModal.eventName}
                </h3>
                <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  <strong>Department:</strong> {showPurposeModal.department} | <strong>Staff:</strong> {showPurposeModal.staffName}
                </p>
              </div>
              <button
                onClick={() => setShowPurposeModal(null)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                Close
              </button>
            </div>
            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1rem', fontWeight: 600 }}>Purpose:</h4>
              <p style={{ margin: 0, color: '#475569', lineHeight: '1.8', fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>
                {showPurposeModal.purpose}
              </p>
              {showPurposeModal.originalPurpose && showPurposeModal.originalPurpose !== showPurposeModal.purpose && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '0.9375rem', fontWeight: 600 }}>⚠️ Original Purpose (Modified):</h4>
                  <p style={{ margin: 0, color: '#991b1b', lineHeight: '1.8', fontSize: '0.875rem', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                    {showPurposeModal.originalPurpose}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* REMARKS MODAL */}
      {showRemarksModal && selectedRequestRemarks && (
        <div 
          className="modal-overlay"
          onClick={() => setShowRemarksModal(false)}
        >
          <div 
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '700px' }}
          >
            <div className="modal-header-custom">
              <h5><BsChatLeftText style={{ marginRight: '0.5rem' }} /> Previous Authority Remarks</h5>
              <button
                className="modal-close-btn"
                onClick={() => setShowRemarksModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-custom">
              <div className="alert-custom alert-info" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h6 style={{ fontWeight: 700, marginBottom: '0.75rem' }}><BsClipboardData style={{ marginRight: '0.25rem' }} /> Event Details</h6>
                  <p style={{ margin: '0.25rem 0' }}><strong>Event Name:</strong> {selectedRequestRemarks.eventName}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Staff:</strong> {selectedRequestRemarks.staffName}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Department:</strong> {selectedRequestRemarks.department}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Event Date:</strong> {selectedRequestRemarks.eventDate}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Purpose:</strong> {selectedRequestRemarks.purpose}</p>
                  {selectedRequestRemarks.originalPurpose && selectedRequestRemarks.originalPurpose !== selectedRequestRemarks.purpose && (
                    <p style={{ margin: '0.25rem 0', color: '#dc2626', fontStyle: 'italic' }}>
                      <strong>⚠️ Original Purpose:</strong> {selectedRequestRemarks.originalPurpose}
                    </p>
                  )}
                </div>
              </div>
              
              <h6 style={{ fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}><BsClockHistory style={{ marginRight: '0.25rem' }} /> Approval History & Remarks</h6>
              
              {selectedRequestRemarks.approvals.length === 0 ? (
                <div className="alert-custom alert-warning">
                  <span><BsInfoCircle style={{ marginRight: '0.25rem' }} /> No remarks or comments have been provided yet.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedRequestRemarks.approvals.map((approval, idx) => (
                    <div key={idx} style={{ 
                      background: 'white', 
                      borderRadius: '0.75rem', 
                      padding: '1rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <span className={`badge-custom ${
                          approval.status === 'Approved' ? 'badge-approved' : 
                          approval.status === 'Recreated' ? 'badge-pending' : 
                          'badge-processing'
                        }`}>
                          {approval.role}
                        </span>
                        <small style={{ color: '#64748b' }}>
                          {new Date(approval.decidedAt).toLocaleString()}
                        </small>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Status:</strong> 
                        <span className={`badge-custom ${
                          approval.status === 'Approved' ? 'badge-approved' : 
                          approval.status === 'Recreated' ? 'badge-pending' : 
                          'badge-processing'
                        }`} style={{ marginLeft: '0.5rem' }}>
                          {approval.status}
                        </span>
                      </div>
                      <div>
                        <strong>Comments:</strong>
                        <p style={{ 
                          margin: '0.5rem 0 0 0', 
                          padding: '0.75rem', 
                          background: approval.status === 'Recreated' ? '#fef3c7' : '#f8fafc', 
                          borderRadius: '0.5rem',
                          color: approval.comments ? '#334155' : '#94a3b8',
                          fontStyle: approval.comments ? 'normal' : 'italic',
                          borderLeft: approval.status === 'Recreated' ? '3px solid #f59e0b' : 'none'
                        }}>
                          {approval.comments || (approval.status === 'Recreated' ? 'Recreation requested - No specific comments provided' : 'No comments provided')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer-custom">
              <button
                className="btn-secondary-custom"
                onClick={() => setShowRemarksModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IQACHome;

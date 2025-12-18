import React, { useEffect, useState } from "react";
import {
  fetchStaffRequests,
  createRequest,
  resubmitRequest,
  approvalLetterDownloadUrl,
  getFreshReportUrl,
} from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import useDisableBack from "./useDisableBack";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';
import { 
  BsFileEarmarkText, BsPencilSquare, BsClipboardData, BsExclamationTriangle, 
  BsCheckCircle, BsInbox, BsLightbulb, BsBan, BsJournalText 
} from "react-icons/bs";

function StaffHome() {
  // ----------------------------------------
  // HOOKS
  // ----------------------------------------
  const navigate = useNavigate();
  useDisableBack();

  const [requests, setRequests] = useState([]);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [report, setReport] = useState(null);

  // Duplicate event modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");

  // Rejection details modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRejection, setSelectedRejection] = useState(null);

  // Edit request modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editEventName, setEditEventName] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editPurpose, setEditPurpose] = useState("");
  const [editReport, setEditReport] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Loading states for better UX
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const staffId = user?.id;

  // ----------------------------------------
  // LOGOUT
  // ----------------------------------------
  const logout = () => {
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // ----------------------------------------
  // LOAD STAFF REQUESTS
  // ----------------------------------------
  const loadRequests = async () => {
    setIsLoading(true);
    try {
      if (!staffId) return;
      const res = await fetchStaffRequests(staffId);
      setRequests(res.data);
    } catch (err) {
      toast.error("Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // ----------------------------------------
  // VIEW REPORT - Fetch fresh signed URL
  // ----------------------------------------
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

  // ----------------------------------------
  // VIEW REJECTION DETAILS
  // ----------------------------------------
  const handleViewRejection = (req) => {
    const rejections = (req.approvals || []).filter(
      (a) => a.status === "Recreated"
    );
    
    let rejectorRole = null;
    const status = req.overallStatus || "";
    const match = status.match(/^(\w+)\s+requested\s+recreation/i);
    if (match) {
      rejectorRole = match[1].toUpperCase();
    }
    
    setSelectedRejection({
      eventName: req.eventName,
      eventDate: req.eventDate,
      status: req.overallStatus,
      rejections,
      rejectorRole,
    });
    setShowRejectionModal(true);
  };

  // ----------------------------------------
  // CHECK IF REQUEST IS REJECTED
  // ----------------------------------------
  const isRejected = (req) => {
    const status = (req.overallStatus || "").toLowerCase();
    return status.includes("recreation") || status.includes("rejected");
  };

  // ----------------------------------------
  // OPEN EDIT MODAL
  // ----------------------------------------
  const handleEditRequest = (req) => {
    setEditingRequest(req);
    setEditEventName(req.eventName);
    setEditEventDate(req.eventDate);
    setEditPurpose(req.purpose);
    setEditReport(null);
    setShowEditModal(true);
  };

  // ----------------------------------------
  // SUBMIT EDITED REQUEST
  // ----------------------------------------
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append("event_name", editEventName);
    formData.append("event_date", editEventDate);
    formData.append("purpose", editPurpose);
    if (editReport) {
      formData.append("event_report", editReport);
    }
    
    try {
      await resubmitRequest(editingRequest._id, formData);
      toast.success("Request updated and resubmitted for approval!");
      setShowEditModal(false);
      setEditingRequest(null);
      loadRequests();
    } catch (err) {
      console.error("Update request error:", err);
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else if (err.message) {
        toast.error(err.message);
      } else {
        toast.error("Failed to update request");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------
  // DETERMINE CARD COLOR
  // ----------------------------------------
  const getStatusColor = (req) => {
    const status = (req.overallStatus || "").toLowerCase();

    const isApproved =
      req.isCompleted ||
      status.includes("completed") ||
      status.includes("approved");

    if (isApproved) return "#e6ffed";
    if (req.currentRole === "IQAC") return "#ffe5e5";
    return "#fff8cc";
  };

  // ----------------------------------------
  // CREATE REQUEST
  // ----------------------------------------
  const submit = async (e) => {
    e.preventDefault();

    if (!report) {
      return toast.error("Please upload event report file");
    }

    setIsCreating(true);

    const formData = new FormData();
    formData.append("staffId", staffId);
    formData.append("event_name", eventName);
    formData.append("event_date", eventDate);
    formData.append("purpose", purpose);
    formData.append("event_report", report);

    try {
      await createRequest(formData);
      toast.success("Request submitted!");

      setEventName("");
      setEventDate("");
      setPurpose("");
      setReport(null);

      loadRequests();
    } catch (err) {
      // Check if it's a duplicate event error
      if (err.response && err.response.data && err.response.data.error) {
        const errorMsg = err.response.data.error;
        
        if (errorMsg.includes("already created") || errorMsg.includes("similar event")) {
          setDuplicateMessage(errorMsg);
          setShowDuplicateModal(true);
        } else {
          toast.error(errorMsg);
        }
      } else {
        toast.error("Failed to submit request");
      }
    } finally {
      setIsCreating(false);
    }
  };

  // ----------------------------------------
  // UNAUTHORIZED
  // ----------------------------------------
  if (!user) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-wrapper" style={{ maxWidth: "500px" }}>
          <div className="dashboard-card">
            <div className="dashboard-card-body" style={{ textAlign: "center" }}>
              <h3 style={{ color: "#ef4444" }}>Unauthorized Access</h3>
              <p>Please login again.</p>
              <button
                className="btn-primary-custom"
                onClick={() => navigate("/", { replace: true })}
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // MAIN RENDER
  // ----------------------------------------
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
                <h1>Staff Dashboard</h1>
                <p>Event Request Management Portal</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <div className="dashboard-user-info">
                <div className="dashboard-user-name">Welcome, {user.name}</div>
                <div className="dashboard-user-role">Staff Member</div>
              </div>
              <button className="btn-logout" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* CREATE REQUEST */}
        <div className="dashboard-card mb-4 fade-in">
          <div className="dashboard-card-header">
            <h4><BsJournalText style={{ marginRight: '0.5rem' }} /> Create Event Request</h4>
            <p>Submit a new event for approval</p>
          </div>
          <div className="dashboard-card-body">
            <form onSubmit={submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column */}
                <div>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Event Name</label>
                    <input
                      className="form-input-custom"
                      placeholder="Enter event name"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Event Date</label>
                    <input
                      className="form-input-custom"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Upload Report (PDF)</label>
                    <input
                      className="form-input-custom"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                            toast.error("Only PDF files are allowed. Please upload a PDF file.");
                            e.target.value = "";
                            setReport(null);
                            return;
                          }
                          setReport(file);
                        }
                      }}
                      required
                    />
                    <small style={{ color: '#64748b', fontSize: '0.8125rem' }}>Only PDF files are accepted</small>
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Purpose of Event</label>
                    <textarea
                      className="form-input-custom form-textarea-custom"
                      placeholder="Describe the purpose of this event"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      required
                      style={{ height: '320px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary-custom btn-sm-custom" disabled={isCreating} style={{ minWidth: '150px' }}>
                  {isCreating ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* REQUEST LIST */}
        <div className="dashboard-card fade-in">
          <div className="dashboard-card-header">
            <h4><BsClipboardData style={{ marginRight: '0.5rem' }} /> Your Requests</h4>
            <p>Track your submitted event requests</p>
          </div>
          <div className="dashboard-card-body">
            {isLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p className="loading-text">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><BsInbox size={48} /></div>
                <h4>No requests submitted yet</h4>
                <p>Create your first event request above to get started</p>
              </div>
            ) : (
              <div className="row g-4">
                {requests.map((req) => {
                  const isApproved =
                    req.isCompleted ||
                    (req.overallStatus || "").toLowerCase().includes("completed");
                  
                  const statusClass = isApproved ? 'approved' : 
                    isRejected(req) ? 'rejected' : 
                    req.overallStatus?.toLowerCase().includes('pending') ? 'pending' : 'processing';

                  return (
                    <div key={req._id} className="col-md-6 col-lg-4">
                      <div className={`status-card ${statusClass}`}>
                        <h5 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>{req.eventName}</h5>
                        <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                          <strong>Date:</strong> {req.eventDate}
                        </p>
                        <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                          <strong>Status:</strong> {req.overallStatus}
                        </p>

                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {req.reportUrl && (
                            <button
                              className="btn-secondary-custom btn-sm-custom w-100"
                              onClick={() => handleViewReport(req._id)}
                            >
                              <BsFileEarmarkText style={{ marginRight: '0.25rem' }} /> View Uploaded File
                            </button>
                          )}

                          {isRejected(req) && (
                            <>
                              <button
                                className="btn-danger-custom btn-sm-custom w-100"
                                onClick={() => handleViewRejection(req)}
                              >
                                <BsExclamationTriangle style={{ marginRight: '0.25rem' }} /> View Rejection Details
                              </button>
                              <button
                                className="btn-primary-custom btn-sm-custom w-100"
                                onClick={() => handleEditRequest(req)}
                              >
                                <BsPencilSquare style={{ marginRight: '0.25rem' }} /> Edit & Resubmit
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              className="btn-success-custom btn-sm-custom w-100"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = approvalLetterDownloadUrl(req._id);
                                link.download = `Approval-Report-${req.refNumber || req._id}.pdf`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <BsCheckCircle style={{ marginRight: '0.25rem' }} /> Generate Approval Report
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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

      {/* EDIT REQUEST MODAL */}
      {showEditModal && editingRequest && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header-custom">
              <h5><BsPencilSquare style={{ marginRight: '0.5rem' }} /> Edit & Resubmit Request</h5>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body-custom">
                <div className="alert-custom alert-warning">
                  <div>
                    <strong>Previous Status:</strong> {editingRequest.overallStatus}
                    <br />
                    <small style={{ color: '#92400e' }}>
                      After editing, this request will be resubmitted for HOD approval.
                    </small>
                  </div>
                </div>
                <div className="form-group-custom">
                  <label className="form-label-custom">Event Name</label>
                  <input
                    className="form-input-custom"
                    placeholder="Event Name"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label className="form-label-custom">Event Date</label>
                  <input
                    className="form-input-custom"
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label className="form-label-custom">Purpose of Event</label>
                  <textarea
                    className="form-input-custom form-textarea-custom"
                    placeholder="Purpose of Event"
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label className="form-label-custom">Upload New Report (Optional)</label>
                  <input
                    className="form-input-custom"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                          toast.error("Only PDF files are allowed.");
                          e.target.value = "";
                          setEditReport(null);
                          return;
                        }
                        setEditReport(file);
                      }
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.8125rem' }}>Leave empty to keep the existing file.</small>
                </div>
              </div>
              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn-secondary-custom"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-custom" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Resubmit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION DETAILS MODAL */}
      {showRejectionModal && selectedRejection && (
        <div className="modal-overlay" onClick={() => setShowRejectionModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom danger">
              <h5><BsExclamationTriangle style={{ marginRight: '0.5rem' }} /> Rejection Details</h5>
              <button className="modal-close-btn" onClick={() => setShowRejectionModal(false)}>✕</button>
            </div>
            <div className="modal-body-custom">
              <div className="alert-custom alert-info" style={{ marginBottom: '1rem' }}>
                <div>
                  <h6 style={{ fontWeight: 700, marginBottom: '0.5rem' }}><BsClipboardData style={{ marginRight: '0.25rem' }} /> Event Details</h6>
                  <p style={{ margin: '0.25rem 0' }}><strong>Event Name:</strong> {selectedRejection.eventName}</p>
                  <p style={{ margin: '0' }}><strong>Event Date:</strong> {selectedRejection.eventDate}</p>
                </div>
              </div>
              <div className="alert-custom alert-danger" style={{ marginBottom: '1rem' }}>
                <div>
                  <h6 style={{ fontWeight: 700, marginBottom: '0.5rem' }}><BsBan style={{ marginRight: '0.25rem' }} /> Current Status</h6>
                  <p style={{ margin: '0', fontWeight: 600 }}>{selectedRejection.status}</p>
                </div>
              </div>
              <div className="alert-custom alert-warning">
                <div style={{ width: '100%' }}>
                  <h6 style={{ fontWeight: 700, marginBottom: '0.75rem' }}><BsJournalText style={{ marginRight: '0.25rem' }} /> Rejection Details</h6>
                  {selectedRejection.rejections && selectedRejection.rejections.length > 0 ? (
                    selectedRejection.rejections.map((rej, idx) => (
                      <div key={idx} style={{ 
                        background: 'white', 
                        borderRadius: '0.5rem', 
                        padding: '0.75rem', 
                        marginBottom: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span className="badge-custom badge-rejected" style={{ marginRight: '0.5rem' }}>{rej.role}</span>
                          <small style={{ color: '#64748b' }}>
                            {new Date(rej.decidedAt).toLocaleString()}
                          </small>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '0.375rem' }}>
                          <strong>Reason:</strong>{" "}
                          {rej.comments || <em style={{ color: '#94a3b8' }}>No reason provided</em>}
                        </div>
                      </div>
                    ))
                  ) : selectedRejection.rejectorRole ? (
                    <div style={{ 
                      background: 'white', 
                      borderRadius: '0.5rem', 
                      padding: '0.75rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <span className="badge-custom badge-rejected" style={{ marginRight: '0.5rem' }}>{selectedRejection.rejectorRole}</span>
                      <span style={{ color: '#64748b' }}>requested recreation</span>
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', margin: 0 }}>No detailed remarks available.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button className="btn-secondary-custom" onClick={() => setShowRejectionModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE EVENT WARNING MODAL */}
      {showDuplicateModal && (
        <div className="modal-overlay" onClick={() => setShowDuplicateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              <h5><BsExclamationTriangle style={{ marginRight: '0.5rem' }} /> Duplicate Event Detected</h5>
              <button className="modal-close-btn" onClick={() => setShowDuplicateModal(false)}>✕</button>
            </div>
            <div className="modal-body-custom">
              <div className="alert-custom alert-warning">
                <p style={{ marginBottom: '0.5rem' }}><strong>{duplicateMessage}</strong></p>
                <hr style={{ margin: '0.75rem 0', borderColor: '#fbbf24' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  <BsLightbulb style={{ marginRight: '0.25rem' }} /> <strong>Suggestion:</strong> Please choose a different event name or modify the purpose to make it unique.
                </p>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button className="btn-primary-custom" onClick={() => setShowDuplicateModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffHome;

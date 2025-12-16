import React, { useEffect, useState } from "react";
import {
  fetchStaffRequests,
  createRequest,
  updateRequest,
  approvalLetterDownloadUrl,
  getFreshReportUrl,
} from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import useDisableBack from "./useDisableBack";

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
    try {
      if (!staffId) return;
      const res = await fetchStaffRequests(staffId);
      setRequests(res.data);
    } catch (err) {
      toast.error("Failed to load requests");
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
    // Find the rejection/recreate approval entry
    const rejections = (req.approvals || []).filter(
      (a) => a.status === "Recreated"
    );
    
    // Extract who rejected from status if no approvals found
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
      rejectorRole, // fallback if approvals array is empty
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
      await updateRequest(editingRequest._id, formData);
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

    if (isApproved) return "#e6ffed"; // light green

    if (req.currentRole === "IQAC") return "#ffe5e5"; // light red

    return "#fff8cc"; // light yellow
  };

  // ----------------------------------------
  // CREATE REQUEST
  // ----------------------------------------
  const submit = async (e) => {
    e.preventDefault();

    console.log("Submit clicked!");
    console.log("Event Name:", eventName);
    console.log("Purpose:", purpose);
    console.log("Report:", report);

    if (!report) {
      return toast.error("Please upload event report file");
    }

    const formData = new FormData();
    formData.append("staffId", staffId);
    formData.append("event_name", eventName);
    formData.append("event_date", eventDate);
    formData.append("purpose", purpose);
    formData.append("event_report", report);

    console.log("Sending request to backend...");

    try {
      await createRequest(formData);
      console.log("Request successful!");
      toast.success("Request submitted!");

      // clear form
      setEventName("");
      setEventDate("");
      setPurpose("");
      setReport(null);

      loadRequests();
    } catch (err) {
      console.log("Error caught:", err);
      console.log("Error response:", err.response);
      
      // Check if it's a duplicate event error
      if (err.response && err.response.data && err.response.data.error) {
        const errorMsg = err.response.data.error;
        console.log("Error message:", errorMsg);
        
        // Show custom modal for duplicate events
        if (errorMsg.includes("already created") || errorMsg.includes("similar event")) {
          console.log("Showing duplicate modal");
          setDuplicateMessage(errorMsg);
          setShowDuplicateModal(true);
        } else {
          toast.error(errorMsg);
        }
      } else {
        toast.error("Failed to submit request");
      }
    }
  };

  // ----------------------------------------
  // UNAUTHORIZED
  // ----------------------------------------
  if (!user) {
    return (
      <div className="container mt-5 text-center">
        <h3 className="text-danger">Unauthorized Access</h3>
        <p>Please login again.</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/", { replace: true })}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // ----------------------------------------
  // MAIN RENDER
  // ----------------------------------------
  return (
    <div className="container mt-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center">
        <h2 className="fw-bold text-primary">Staff Dashboard</h2>

        <button className="btn btn-danger btn-sm" onClick={logout}>
          Logout
        </button>
      </div>

      <h5 className="text-secondary">Welcome, {user.name}</h5>
      <hr />

      {/* CREATE REQUEST */}
      <div className="card shadow p-4">
        <h4 className="fw-bold mb-3">Create Event Request</h4>

        <form onSubmit={submit}>
          <input
            className="form-control mb-3"
            placeholder="Event Name"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
          />

          <input
            className="form-control mb-3"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />

          <textarea
            className="form-control mb-3"
            placeholder="Purpose of Event"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />

          <input
            className="form-control mb-3"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                // Check if file is PDF
                if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                  toast.error("Only PDF files are allowed. Please upload a PDF file.");
                  e.target.value = ""; // Clear the input
                  setReport(null);
                  return;
                }
                setReport(file);
              }
            }}
            required
          />
          <small className="text-muted">Only PDF files are accepted</small>

          <button className="btn btn-primary w-100">Submit</button>
        </form>
      </div>

      <hr className="my-4" />

      {/* REQUEST LIST */}
      <h3 className="fw-bold">Your Requests</h3>

      {requests.length === 0 && (
        <p className="text-muted">No requests submitted yet.</p>
      )}

      {requests.map((req) => {
        const bgColor = getStatusColor(req);

        const isApproved =
          req.isCompleted ||
          (req.overallStatus || "").toLowerCase().includes("completed");

        return (
          <div
            key={req._id}
            className="card p-3 mt-3 shadow-sm"
            style={{
              backgroundColor: bgColor,
              borderLeft: "6px solid rgba(0,0,0,0.2)",
            }}
          >
            <h5 className="fw-bold">{req.eventName}</h5>
            <p>
              <b>Date:</b> {req.eventDate}
            </p>
            <p>
              <b>Status:</b> {req.overallStatus}
            </p>

            {/* VIEW FILE */}
            {req.reportUrl && (
              <button
                className="btn btn-secondary btn-sm mt-2 w-100"
                onClick={() => handleViewReport(req._id)}
              >
                View Uploaded File
              </button>
            )}

            {/* VIEW REJECTION DETAILS (when request is rejected/recreated) */}
            {isRejected(req) && (
              <button
                className="btn btn-danger btn-sm mt-2 w-100"
                onClick={() => handleViewRejection(req)}
                style={{ fontWeight: "bold" }}
              >
                 View Rejection Details
              </button>
            )}

            {/* EDIT & RESUBMIT (when request is rejected/recreated) */}
            {isRejected(req) && (
              <button
                className="btn btn-primary btn-sm mt-2 w-100"
                onClick={() => handleEditRequest(req)}
                style={{ fontWeight: "bold" }}
              >
                ✏️ Edit & Resubmit Request
              </button>
            )}

            {/* GENERATE APPROVAL REPORT (only after completion) */}
            {isApproved && (
              <button
                className="btn btn-success btn-sm mt-2 w-100"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = approvalLetterDownloadUrl(req._id);
                  link.download = `Approval-Report-${req.refNumber || req._id}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Generate Approval Report
              </button>
            )}
          </div>
        );
      })}

      {/* EDIT REQUEST MODAL */}
      {showEditModal && editingRequest && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header" style={{ backgroundColor: "#0d6efd", color: "white" }}>
                <h5 className="modal-title fw-bold">✏️ Edit & Resubmit Request</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitEdit}>
                <div className="modal-body">
                  <div className="alert alert-warning mb-3">
                    <small>
                      <b>Previous Status:</b> {editingRequest.overallStatus}
                      <br />
                      <span className="text-muted">
                        After editing, this request will be resubmitted for HOD approval.
                      </span>
                    </small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Event Name</label>
                    <input
                      className="form-control"
                      placeholder="Event Name"
                      value={editEventName}
                      onChange={(e) => setEditEventName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Event Date</label>
                    <input
                      className="form-control"
                      type="date"
                      value={editEventDate}
                      onChange={(e) => setEditEventDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Purpose of Event</label>
                    <textarea
                      className="form-control"
                      placeholder="Purpose of Event"
                      rows={4}
                      value={editPurpose}
                      onChange={(e) => setEditPurpose(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Upload New Report (Optional)</label>
                    <input
                      className="form-control"
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
                    <small className="text-muted">Leave empty to keep the existing file.</small>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Resubmit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION DETAILS MODAL */}
      {showRejectionModal && selectedRejection && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}
          onClick={() => setShowRejectionModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header" style={{ backgroundColor: "#dc3545", color: "white" }}>
                <h5 className="modal-title fw-bold">⚠️ Rejection Details</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRejectionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3 p-3 rounded" style={{ backgroundColor: "#f8f9fa" }}>
                  <h6 className="fw-bold text-dark mb-2">📋 Event Details</h6>
                  <p className="mb-1"><b>Event Name:</b> {selectedRejection.eventName}</p>
                  <p className="mb-0"><b>Event Date:</b> {selectedRejection.eventDate}</p>
                </div>
                <div className="mb-3 p-3 rounded border border-danger" style={{ backgroundColor: "#fff5f5" }}>
                  <h6 className="fw-bold text-danger mb-2">🚫 Current Status</h6>
                  <p className="mb-0 fw-bold text-danger">{selectedRejection.status}</p>
                </div>
                <div className="p-3 rounded" style={{ backgroundColor: "#fff3cd" }}>
                  <h6 className="fw-bold text-dark mb-3">💬 Rejection Details</h6>
                  {selectedRejection.rejections && selectedRejection.rejections.length > 0 ? (
                    selectedRejection.rejections.map((rej, idx) => (
                      <div key={idx} className="card mb-2 border-0 shadow-sm">
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-danger me-2">{rej.role}</span>
                            <small className="text-muted">
                              {new Date(rej.decidedAt).toLocaleString()}
                            </small>
                          </div>
                          <div className="p-2 rounded" style={{ backgroundColor: "#f8f9fa" }}>
                            <b>Reason:</b>{" "}
                            {rej.comments || <i className="text-muted">No reason provided</i>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : selectedRejection.rejectorRole ? (
                    <div className="card border-0 shadow-sm">
                      <div className="card-body p-3">
                        <span className="badge bg-danger me-2">{selectedRejection.rejectorRole}</span>
                        <span className="text-muted">requested recreation</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted mb-0">No detailed remarks available.</p>
                  )}
                </div>
              </div>
              <div className="modal-footer border-0">
                <button
                  className="btn btn-secondary px-4"
                  onClick={() => setShowRejectionModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffHome;

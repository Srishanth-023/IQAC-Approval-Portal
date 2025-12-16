import React, { useEffect, useState } from "react";
import {
  fetchStaffRequests,
  createRequest,
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
  
  // Modal state for duplicate warning
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");

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

    if (!report) {
      return toast.error("Please upload event report file");
    }

    const formData = new FormData();
    formData.append("staffId", staffId);
    formData.append("event_name", eventName);
    formData.append("event_date", eventDate);
    formData.append("purpose", purpose);
    formData.append("event_report", report);

    try {
      await createRequest(formData);
      toast.success("Request submitted!");

      // clear form
      setEventName("");
      setEventDate("");
      setPurpose("");
      setReport(null);

      loadRequests();
    } catch (err) {
      // Check if it's a duplicate event error
      if (err.response && err.response.data && err.response.data.error) {
        const errorMsg = err.response.data.error;
        
        // Show custom modal for duplicate events
        if (errorMsg.includes("already created") || errorMsg.includes("similar event")) {
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
      
      {/* DUPLICATE EVENT WARNING MODAL */}
      {showDuplicateModal && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowDuplicateModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Duplicate Event Warning
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDuplicateModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning mb-0">
                  <h6 className="alert-heading">
                    <strong>Cannot Create Event Request</strong>
                  </h6>
                  <hr />
                  <p className="mb-0">{duplicateMessage}</p>
                </div>
                
                <div className="mt-3">
                  <p className="text-muted small mb-1">
                    <strong>Suggestion:</strong>
                  </p>
                  <ul className="text-muted small">
                    <li>Use a different event name that clearly distinguishes your event</li>
                    <li>Modify the purpose/description to make it unique</li>
                    <li>Contact the other staff member if this is a duplicate submission</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowDuplicateModal(false)}
                >
                  Understood
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

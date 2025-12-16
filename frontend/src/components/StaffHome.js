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
  
  // Modal state for rejection details
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRejection, setSelectedRejection] = useState(null);

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
      
      {/* REJECTION DETAILS MODAL */}
      {showRejectionModal && selectedRejection && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowRejectionModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-x-circle-fill me-2"></i>
                  Rejection Details
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRejectionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <h6 className="fw-bold">Event Details:</h6>
                  <p className="mb-1"><strong>Event Name:</strong> {selectedRejection.eventName}</p>
                  <p className="mb-1"><strong>Event Date:</strong> {selectedRejection.eventDate}</p>
                  <p className="mb-1"><strong>Status:</strong> <span className="badge bg-danger">{selectedRejection.status}</span></p>
                </div>
                
                <hr />
                
                <div className="alert alert-danger">
                  <h6 className="alert-heading fw-bold">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Rejected by: {selectedRejection.rejectorRole}
                  </h6>
                  <hr />
                  <p className="mb-0"><strong>Rejection History:</strong></p>
                  <ul className="mt-2 mb-0">
                    {selectedRejection.rejections.map((rej, idx) => (
                      <li key={idx}>
                        <strong>{rej.role}:</strong> {rej.comments || "No comments provided"}
                        <br />
                        <small className="text-muted">
                          {new Date(rej.decidedAt).toLocaleString()}
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-3">
                  <p className="text-muted small">
                    <strong>Next Steps:</strong> Please review the rejection comments and create a new request with the necessary modifications.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
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

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchRequestsForRole,
  actOnRequest,
  getFreshReportUrl,
} from "../api";
import { toast } from "react-toastify";
import useDisableBack from "./useDisableBack";

function RoleDashboard() {
  // ------------------------------------------
  // HOOKS
  // ------------------------------------------
  const { roleKey } = useParams();
  const role = roleKey.toUpperCase();

  const navigate = useNavigate();
  useDisableBack();

  const user = JSON.parse(localStorage.getItem("user"));
  const [requests, setRequests] = useState([]);

  const [comments, setComments] = useState({}); // comment per request
  
  // Filter states
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterEventName, setFilterEventName] = useState("");
  
  // Modal state for viewing remarks
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRequestRemarks, setSelectedRequestRemarks] = useState(null);

  // ------------------------------------------
  // LOGOUT
  // ------------------------------------------
  const logout = () => {
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // ------------------------------------------
  // LOAD REQUESTS FOR ROLE
  // ------------------------------------------
  const loadRequests = async () => {
    try {
      // If HOD, pass department to filter requests by their department
      const department = role === "HOD" ? user?.department : null;
      const res = await fetchRequestsForRole(role, department);
      setRequests(res.data);
    } catch {
      toast.error("Failed to load requests");
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // ------------------------------------------
  // VIEW REPORT - Fetch fresh signed URL
  // ------------------------------------------
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

  // ------------------------------------------
  // COMMENT HANDLER
  // ------------------------------------------
  const handleCommentChange = (id, value) => {
    setComments((prev) => ({ ...prev, [id]: value }));
  };

  // ------------------------------------------
  // VIEW REMARKS
  // ------------------------------------------
  const handleViewRemarks = (request) => {
    setSelectedRequestRemarks({
      eventName: request.eventName,
      eventDate: request.eventDate,
      staffName: request.staffName,
      department: request.department,
      approvals: request.approvals || []
    });
    setShowRemarksModal(true);
  };

  // ------------------------------------------
  // APPROVE
  // ------------------------------------------
  const handleApprove = async (id) => {
    const commentText = comments[id] || "";

    try {
      await actOnRequest(id, {
        action: "approve",
        comments: commentText,
      });

      toast.success("Approved!");
      loadRequests();
    } catch {
      toast.error("Approval failed");
    }
  };

  // ------------------------------------------
  // RECREATE
  // ------------------------------------------
  const handleRecreate = async (id) => {
    const commentText = comments[id];

    if (!commentText || commentText.trim() === "") {
      return toast.error("Comments are required for recreate!");
    }

    try {
      await actOnRequest(id, {
        action: "recreate",
        comments: commentText,
      });

      toast.success("Sent back for recreation!");
      loadRequests();
    } catch {
      toast.error("Recreate failed");
    }
  };

  // ------------------------------------------
  // UNAUTHORIZED
  // ------------------------------------------
  if (!user || user.role.toUpperCase() !== role) {
    return (
      <div className="container mt-5 text-center">
        <h3 className="text-danger">Unauthorized Access</h3>
        <p>You do not have permission to access this page.</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/", { replace: true })}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Filter requests based on department and event name
  const filteredRequests = requests.filter((req) => {
    const matchesDepartment = filterDepartment === "" || req.department === filterDepartment;
    const matchesEventName = filterEventName === "" || req.eventName.toLowerCase().includes(filterEventName.toLowerCase());
    return matchesDepartment && matchesEventName;
  });

  // Get unique departments for filter dropdown
  const departments = [...new Set(requests.map(req => req.department))].sort();

  // ------------------------------------------
  // MAIN RENDER
  // ------------------------------------------
  return (
    <div className="container mt-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center">
        <h2 className="fw-bold text-primary">{role} Dashboard</h2>
        <button className="btn btn-danger btn-sm" onClick={logout}>
          Logout
        </button>
      </div>

      <hr />

      {/* FILTER SECTION */}
      <div className="card shadow p-3 mb-3">
        <div className="row g-3">
          {role !== "HOD" && (
            <div className="col-md-4">
              <label className="form-label fw-bold">Filter by Department</label>
              <select
                className="form-select"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={role === "HOD" ? "col-md-8" : "col-md-4"}>
            <label className="form-label fw-bold">Filter by Event Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search event name..."
              value={filterEventName}
              onChange={(e) => setFilterEventName(e.target.value)}
            />
          </div>
          <div className={role === "HOD" ? "col-md-4" : "col-md-4"}>
            <button
              className="btn btn-secondary w-100"
              style={{ marginTop: role === "HOD" ? "32px" : "0" }}
              onClick={() => {
                setFilterDepartment("");
                setFilterEventName("");
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="mt-2">
          <small className="text-muted">
            Showing {filteredRequests.length} of {requests.length} requests
          </small>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <p className="text-muted">No requests found matching the filters</p>
      ) : (
        <table className="table table-bordered shadow">
          <thead className="table-light">
            <tr>
              <th>Event</th>
              <th>Staff</th>
              <th>Department</th>
              <th>Event Date</th>
              <th>Uploaded Report</th>
              <th>Comments (Required for Recreate)</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredRequests.map((r) => (
              <tr key={r._id}>
                <td>{r.eventName}</td>
                <td>{r.staffName}</td>
                <td>{r.department}</td>
                <td>{r.eventDate}</td>

                <td>
                  {r.reportUrl ? (
                    <button 
                      className="btn btn-link p-0"
                      onClick={() => handleViewReport(r._id)}
                    >
                      View
                    </button>
                  ) : (
                    "No File"
                  )}
                </td>

                {/* COMMENTS TEXTBOX */}
                <td>
                  <textarea
                    className="form-control"
                    placeholder="Enter comments..."
                    value={comments[r._id] || ""}
                    onChange={(e) =>
                      handleCommentChange(r._id, e.target.value)
                    }
                  />
                </td>

                {/* ACTION BUTTONS */}
                <td>
                  <button
                    className="btn btn-info btn-sm me-2 mb-1"
                    onClick={() => handleViewRemarks(r)}
                    title="View previous authority remarks"
                  >
                    View Remarks
                  </button>
                  <br />
                  <button
                    className="btn btn-success btn-sm me-2"
                    onClick={() => handleApprove(r._id)}
                  >
                    Approve
                  </button>

                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => handleRecreate(r._id)}
                  >
                    Recreate
                  </button>

                  {/* ❌ DO NOT SHOW GENERATE REPORT HERE */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {/* REMARKS MODAL */}
      {showRemarksModal && selectedRequestRemarks && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowRemarksModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-chat-left-text-fill me-2"></i>
                  Previous Authority Remarks
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRemarksModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <h6 className="fw-bold">Event Details:</h6>
                  <p className="mb-1"><strong>Event Name:</strong> {selectedRequestRemarks.eventName}</p>
                  <p className="mb-1"><strong>Staff:</strong> {selectedRequestRemarks.staffName}</p>
                  <p className="mb-1"><strong>Department:</strong> {selectedRequestRemarks.department}</p>
                  <p className="mb-1"><strong>Event Date:</strong> {selectedRequestRemarks.eventDate}</p>
                </div>
                
                <hr />
                
                <h6 className="fw-bold mb-3">Approval History & Remarks:</h6>
                
                {selectedRequestRemarks.approvals.length === 0 ? (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    No remarks or comments have been provided yet.
                  </div>
                ) : (
                  <div className="timeline">
                    {selectedRequestRemarks.approvals.map((approval, idx) => (
                      <div key={idx} className="card mb-3 shadow-sm">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="mb-0">
                              <span className={`badge ${
                                approval.status === 'Approved' ? 'bg-success' : 
                                approval.status === 'Recreated' ? 'bg-warning text-dark' : 
                                'bg-secondary'
                              }`}>
                                {approval.role}
                              </span>
                            </h6>
                            <small className="text-muted">
                              {new Date(approval.decidedAt).toLocaleString()}
                            </small>
                          </div>
                          
                          <div className="mb-2">
                            <strong>Status:</strong> 
                            <span className={`ms-2 badge ${
                              approval.status === 'Approved' ? 'bg-success' : 
                              approval.status === 'Recreated' ? 'bg-warning text-dark' : 
                              'bg-secondary'
                            }`}>
                              {approval.status}
                            </span>
                          </div>
                          
                          <div>
                            <strong>Comments/Remarks:</strong>
                            <p className="mt-1 mb-0 p-2 bg-light rounded">
                              {approval.comments || <em className="text-muted">No comments provided</em>}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRemarksModal(false)}
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

export default RoleDashboard;

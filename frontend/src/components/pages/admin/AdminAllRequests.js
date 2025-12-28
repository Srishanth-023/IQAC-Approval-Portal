import React, { useEffect, useState } from "react";
import { adminFetchAllRequests, adminDeleteRequest, adminDeleteAllRequests, approvalLetterUrl } from "../../../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "../../../styles/Dashboard.css";
import logo from '../../../assets/kite-logo.png';
import { BsSearch, BsClipboardData, BsTrash, BsFileEarmarkText, BsArrowLeft, BsArrowRepeat } from "react-icons/bs";

export default function AdminAllRequests() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterEventName, setFilterEventName] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const res = await adminFetchAllRequests(user.role);
      setRequests(res.data);
    } catch (err) {
      toast.error("Failed to load all requests");
    } finally {
      setIsLoading(false);
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
      console.error("Delete all error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to delete all requests";
      toast.error(errorMsg);
    }
  };

  // Filter requests based on department and event name
  const filteredRequests = requests.filter((req) => {
    const matchesDepartment = filterDepartment === "" || req.department === filterDepartment;
    const matchesEventName = filterEventName === "" || req.eventName.toLowerCase().includes(filterEventName.toLowerCase());
    return matchesDepartment && matchesEventName;
  });

  // Get unique departments for filter dropdown
  const departments = [...new Set(requests.map(req => req.department))].sort();

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
                <p>Admin Request Management</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <button 
                className="btn-secondary-custom" 
                onClick={() => navigate("/admin/dashboard")}
              >
                <BsArrowLeft style={{ marginRight: '0.5rem' }} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="dashboard-card" style={{ marginBottom: "1rem" }}>
          <div className="dashboard-card-header">
            <h4 style={{ margin: 0 }}><BsSearch style={{ marginRight: '0.5rem' }} /> Filter Requests</h4>
          </div>
          <div className="dashboard-card-body">
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1rem" }}>
              <div className="form-group-custom" style={{ flex: "1", minWidth: "200px", marginBottom: 0 }}>
                <label className="form-label-custom">Filter by Department</label>
                <select
                  className="form-input-custom"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="form-group-custom" style={{ flex: "1", minWidth: "200px", marginBottom: 0 }}>
                <label className="form-label-custom">Filter by Event Name</label>
                <input
                  type="text"
                  className="form-input-custom"
                  placeholder="Search event name..."
                  value={filterEventName}
                  onChange={(e) => setFilterEventName(e.target.value)}
                />
              </div>
              <button
                className="btn-secondary-custom"
                onClick={() => {
                  setFilterDepartment("");
                  setFilterEventName("");
                }}
                style={{ height: "fit-content" }}
              >
                Clear Filters
              </button>
            </div>
            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="dashboard-card">
          <div className="dashboard-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <h4 style={{ margin: 0 }}><BsClipboardData style={{ marginRight: '0.5rem' }} /> All Requests (Admin View)</h4>
              <span className="badge-custom badge-pending">{filteredRequests.length} Shown</span>
            </div>
            <button
              className="btn-danger-custom"
              onClick={handleDeleteAll}
              disabled={requests.length === 0}
              style={{ opacity: requests.length === 0 ? 0.5 : 1 }}
            >
              <BsTrash style={{ marginRight: '0.5rem' }} /> Delete All Requests
            </button>
          </div>
          <div className="dashboard-card-body">
            {isLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p className="loading-text">Loading requests...</p>
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
                    <th>Purpose</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Report</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center" style={{ padding: "2rem", color: "#64748b" }}>
                        No requests found
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req, index) => (
                      <tr key={req._id} className={req.isResubmitted ? 'resubmitted-row' : ''}>
                        <td><strong>{index + 1}</strong></td>
                        <td>{req.referenceNo || "-"}</td>
                        <td>{req.staffName}</td>
                        <td>{req.department}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {req.eventName}
                            {req.isResubmitted && (
                              <span className="resubmitted-tag" title="This request has been recreated and resubmitted">
                                <BsArrowRepeat /> Resubmitted
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{req.eventDate}</td>
                        <td>
                          <div>
                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {req.purpose?.length > 60 ? `${req.purpose.substring(0, 60)}...` : req.purpose}
                            </div>
                            {req.originalPurpose && req.originalPurpose !== req.purpose && (
                              <small style={{ color: '#dc2626', fontStyle: 'italic', display: 'block' }}>
                                ⚠️ Modified
                              </small>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem 0' }}>
                            <span className={req.isCompleted ? "badge-custom badge-approved" : "badge-custom badge-pending"} style={{ minWidth: '140px', maxWidth: '180px' }}>
                              {req.overallStatus}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            className="btn-primary-custom"
                            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                            onClick={() => window.open(approvalLetterUrl(req._id), "_blank")}
                          >
                            <BsFileEarmarkText style={{ marginRight: '0.25rem' }} /> View Letter
                          </button>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            className="btn-danger-custom"
                            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                            onClick={() => handleDelete(req._id)}
                          >
                            <BsTrash style={{ marginRight: '0.25rem' }} /> Delete
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
    </div>
  );
}

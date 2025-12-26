import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTrackingRequests } from "../../api";
import { toast } from "react-toastify";
import "../../styles/Dashboard.css";
import logo from '../../assets/kite-logo.png';
import { BsArrowLeft, BsClockHistory, BsCheckCircle, BsArrowRepeat, BsExclamationCircle } from "react-icons/bs";

export default function TrackEventRequests() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  
  // Redirect if no user
  if (!user) {
    navigate("/");
    return null;
  }

  const [activeSection, setActiveSection] = useState(null);
  const [trackingData, setTrackingData] = useState({
    inProgress: [],
    accepted: [],
    recreatedByOwn: [],
    recreatedByOthers: [],
    completed: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterEventName, setFilterEventName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => {
    loadTrackingData();
  }, []);

  const loadTrackingData = async () => {
    setIsLoading(true);
    try {
      const role = user.role ? user.role.toUpperCase() : user.role;
      const res = await fetchTrackingRequests(role, user.department);
      setTrackingData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load tracking data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (activeSection) {
      setActiveSection(null);
    } else {
      navigate(-1);
    }
  };

  const handleBackToHome = () => {
    const role = user.role ? user.role.toUpperCase() : user.role;
    if (role === "IQAC") {
      navigate("/iqac-home");
    } else if (role === "HOD" || role === "PRINCIPAL" || role === "DIRECTOR" || role === "AO" || role === "CEO") {
      navigate(`/role/${role.toLowerCase()}`);
    } else {
      navigate(-1);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // Apply filters to requests
  const filterRequests = (requests) => {
    return requests.filter((req) => {
      const matchesDepartment = filterDepartment === "" || req.department === filterDepartment;
      const matchesEventName = filterEventName === "" || req.eventName.toLowerCase().includes(filterEventName.toLowerCase());
      
      let matchesDate = true;
      if (filterDateFrom) {
        matchesDate = matchesDate && new Date(req.createdAt) >= new Date(filterDateFrom);
      }
      if (filterDateTo) {
        matchesDate = matchesDate && new Date(req.createdAt) <= new Date(filterDateTo);
      }
      
      return matchesDepartment && matchesEventName && matchesDate;
    });
  };

  // Get unique departments for filter
  const getAllDepartments = () => {
    const allRequests = [
      ...(trackingData.inProgress || []),
      ...(trackingData.accepted || []),
      ...(trackingData.recreatedByOwn || []),
      ...(trackingData.recreatedByOthers || []),
      ...(trackingData.completed || [])
    ];
    return [...new Set(allRequests.map(req => req.department))].sort();
  };

  const renderSectionButtons = () => {
    const sections = [
      {
        key: "inProgress",
        label: "In Progress",
        icon: <BsClockHistory />,
        count: trackingData.inProgress?.length || 0,
        color: "#3498db",
        description: "Track ongoing requests (pending or approved by you)"
      },
      {
        key: "accepted",
        label: "Approved",
        icon: <BsCheckCircle />,
        count: trackingData.accepted?.length || 0,
        color: "#2ecc71",
        description: "Requests you have approved"
      },
      {
        key: "recreatedByOwn",
        label: "Recreated by Own",
        icon: <BsArrowRepeat />,
        count: trackingData.recreatedByOwn?.length || 0,
        color: "#f39c12",
        description: "Requests you sent back for recreation"
      },
      {
        key: "recreatedByOthers",
        label: "Recreated by Others",
        icon: <BsExclamationCircle />,
        count: trackingData.recreatedByOthers?.length || 0,
        color: "#e74c3c",
        description: "Requests you approved but higher authorities sent back for changes"
      },
      {
        key: "completed",
        label: "Fully Completed",
        icon: <BsCheckCircle />,
        count: trackingData.completed?.length || 0,
        color: "#27ae60",
        description: "Requests approved by all authorities"
      }
    ];

    return (
      <div className="tracking-sections-grid">
        {sections.map((section) => (
          <div
            key={section.key}
            className={`tracking-section-card ${section.key === 'recreatedByOthers' && section.count > 0 ? 'alert-section' : ''}`}
            onClick={() => setActiveSection(section.key)}
            style={{ borderColor: section.color }}
          >
            <div className="tracking-section-header">
              <div className="tracking-section-icon" style={{ color: section.color }}>
                {section.icon}
              </div>
              <div className="tracking-section-badge" style={{ backgroundColor: section.color }}>
                {section.count}
              </div>
            </div>
            <h3 className="tracking-section-title">{section.label}</h3>
            <p className="tracking-section-description">{section.description}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderRequestCard = (req, sectionType) => {
    const userRole = user.role ? user.role.toUpperCase() : user.role;
    const hasUserApproved = req.approvals && req.approvals.some(a => a.role === userRole && a.status === "Approved");
    const hasUserRecreated = req.approvals && req.approvals.some(a => a.role === userRole && a.status === "Recreated");
    
    const roleHierarchy = {
      'HOD': 1,
      'IQAC': 2,
      'PRINCIPAL': 3,
      'DIRECTOR': 4,
      'AO': 5,
      'CEO': 6
    };
    
    const userApprovalIndex = req.approvals ? req.approvals.findIndex(a => a.role === userRole && a.status === "Approved") : -1;
    const userApproval = userApprovalIndex !== -1 ? req.approvals[userApprovalIndex] : null;
    
    const recreatorApproval = req.approvals && req.approvals.find(a => a.status === "Recreated" && a.role !== userRole);
    
    const recreationIndex = req.approvals ? req.approvals.findIndex(a => a.status === "Recreated" && a.role !== userRole) : -1;
    const hasBeenResubmitted = recreationIndex !== -1 && req.approvals.slice(recreationIndex + 1).length > 0;
    
    const hasUserReapproved = recreationIndex !== -1 && 
      req.approvals.slice(recreationIndex + 1).some(a => a.role === userRole && a.status === "Approved");
    
    const currentRoleLevel = req.currentRole ? (roleHierarchy[req.currentRole] || 0) : 0;
    const userRoleLevel = roleHierarchy[userRole] || 0;
    const isWithHigherAuthority = req.currentRole && currentRoleLevel > userRoleLevel;
    
    const getStatusBadge = () => {
      if (sectionType === "inProgress") {
        if (hasUserRecreated) {
          return <span className="status-badge status-recreated-tracking">Recreated - Tracking</span>;
        }
        else if (hasUserApproved) {
          return <span className="status-badge status-tracking">Tracking Progress</span>;
        } else {
          return <span className="status-badge status-pending">Pending Action</span>;
        }
      } else if (sectionType === "accepted") {
        return <span className="status-badge status-approved">Approved by You</span>;
      } else if (sectionType === "recreatedByOwn") {
        return <span className="status-badge status-recreated">Recreated by You</span>;
      } else if (sectionType === "recreatedByOthers") {
        return (
          <span className="status-badge status-recreated-other">
            Recreated by {req.recreatedByRole || "Higher Authority"}
          </span>
        );
      } else if (sectionType === "completed") {
        return <span className="status-badge status-completed">Fully Approved</span>;
      }
    };

    const getCurrentStatus = () => {
      if (req.isCompleted) {
        return "Completed";
      }
      return req.overallStatus || "Processing";
    };

    // Only show resubmitted flag if current role has already reviewed this request
    const hasReviewedBefore = req.isResubmitted && req.approvals && req.approvals.some(a => a.role === userRole);

    return (
      <div key={req._id} className={`request-tracking-card fade-in ${sectionType === 'recreatedByOthers' ? 'recreated-others-card' : ''}`}>
        {hasReviewedBefore && (
          <div className="resubmitted-badge-track">
            <BsCheckCircle /> Resubmitted
          </div>
        )}
        {sectionType === "recreatedByOthers" && (
          <div className="recreated-alert-box">
            <div className="alert-content">
              <h5 className="alert-title">Higher Authority Recreation Notice</h5>
              <div className="alert-timeline">
                {userApproval && (
                  <div className="timeline-item">
                    <span className="timeline-icon approved">✓</span>
                    <span className="timeline-text">
                      You approved this on <strong>{new Date(userApproval.decidedAt).toLocaleDateString()}</strong>
                    </span>
                  </div>
                )}
                {recreatorApproval && (
                  <div className="timeline-item">
                    <span className="timeline-icon recreated">↻</span>
                    <span className="timeline-text">
                      <strong>{recreatorApproval.role}</strong> sent it back for recreation on{' '}
                      <strong>{new Date(recreatorApproval.decidedAt).toLocaleDateString()}</strong>
                    </span>
                  </div>
                )}
                {(() => {
                  if (hasUserReapproved) {
                    return (
                      <div className="timeline-item">
                        <span className="timeline-icon approved">✓</span>
                        <span className="timeline-text">
                          You have already re-approved this request after the changes were made.
                        </span>
                      </div>
                    );
                  }
                  
                  if (req.isCompleted) {
                    return (
                      <div className="timeline-item">
                        <span className="timeline-icon approved">✓</span>
                        <span className="timeline-text">
                          Request has been completed and approved by all authorities.
                        </span>
                      </div>
                    );
                  }
                  
                  if (req.currentRole === userRole) {
                    return (
                      <div className="timeline-item">
                        <span className="timeline-icon pending">●</span>
                        <span className="timeline-text">
                          Request has been resubmitted and is <strong>currently pending your approval</strong>.
                        </span>
                      </div>
                    );
                  }
                  
                  if (req.currentRole === null) {
                    return (
                      <div className="timeline-item">
                        <span className="timeline-icon pending">●</span>
                        <span className="timeline-text">
                          Awaiting staff to resubmit after making required changes. You may need to review it again.
                        </span>
                      </div>
                    );
                  }
                  
                  if (isWithHigherAuthority) {
                    return (
                      <div className="timeline-item">
                        <span className="timeline-icon pending">●</span>
                        <span className="timeline-text">
                          Request has been resubmitted and is currently with <strong>{req.currentRole}</strong> for approval.
                        </span>
                      </div>
                    );
                  }
                  
                  if (req.currentRole && currentRoleLevel < userRoleLevel) {
                    return (
                      <div className="timeline-item">
                        <span className="timeline-icon pending">●</span>
                        <span className="timeline-text">
                          Request has been resubmitted and is currently with <strong>{req.currentRole}</strong>. It will reach you after their approval.
                        </span>
                      </div>
                    );
                  }
                  
                  if (req.currentRole === 'IQAC') {
                    return (
                      <div className="timeline-item">
                        <span className="timeline-icon pending">●</span>
                        <span className="timeline-text">
                          Request has been resubmitted and is currently with <strong>IQAC</strong> for processing.
                        </span>
                      </div>
                    );
                  }
                  
                  if (hasBeenResubmitted && req.currentRole) {
                    return (
                      <div className="timeline-item">
                        <span className="timeline-icon pending">●</span>
                        <span className="timeline-text">
                          Request has been resubmitted and is currently with <strong>{req.currentRole}</strong> for approval.
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="timeline-item">
                      <span className="timeline-icon pending">●</span>
                      <span className="timeline-text">
                        Awaiting staff to resubmit after making required changes. You may need to review it again.
                      </span>
                    </div>
                  );
                })()}
              </div>
              {recreatorApproval && recreatorApproval.comments && (
                <div className="alert-reason">
                  <strong>Reason for Recreation:</strong>
                  <p className="reason-text">"{recreatorApproval.comments}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="request-card-header">
          <div className="request-card-title">
            <h4>{req.eventName}</h4>
            {getStatusBadge()}
          </div>
          <div className="request-card-meta">
            <span className="meta-badge">{req.department}</span>
            {req.referenceNo && (
              <span className="meta-badge ref-badge">Ref: {req.referenceNo}</span>
            )}
          </div>
        </div>
        
        <div className="request-card-body">
          <div className="request-info-row">
            <span className="info-label">Staff:</span>
            <span className="info-value">{req.staffName}</span>
          </div>
          <div className="request-info-row">
            <span className="info-label">Event Date:</span>
            <span className="info-value">{new Date(req.eventDate).toLocaleDateString()}</span>
          </div>
          <div className="request-info-row">
            <span className="info-label">Current Status:</span>
            <span className="info-value status-highlight">{getCurrentStatus()}</span>
          </div>
          <div className="request-info-row">
            <span className="info-label">Submitted:</span>
            <span className="info-value">{new Date(req.createdAt).toLocaleDateString()}</span>
          </div>

          {req.approvals && req.approvals.length > 0 && (
            <div className="approval-timeline-compact">
              <span className="info-label">Approval Progress:</span>
              <div className="approval-steps">
                {req.approvals.map((approval, idx) => (
                  <div key={idx} className={`approval-step ${approval.status.toLowerCase()}`}>
                    <span className="approval-role">{approval.role}</span>
                    <span className="approval-status-icon">
                      {approval.status === "Approved" ? "✓" : "↻"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(sectionType === "recreatedByOwn" || sectionType === "recreatedByOthers") && (
            <div className="request-remarks">
              {req.approvals
                .filter(a => a.status === "Recreated")
                .map((approval, idx) => (
                  <div key={idx} className="remark-item">
                    <span className="remark-label">{approval.role} Remarks:</span>
                    <span className="remark-text">{approval.comments || "No comments"}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="request-card-footer">
          <button
            className="btn-view-detail"
            onClick={() => navigate(`/request-detail/${req._id}`)}
          >
            View Details
          </button>
        </div>
      </div>
    );
  };

  const renderSectionContent = () => {
    const sectionTitles = {
      inProgress: "In Progress",
      accepted: "Approved",
      recreatedByOwn: "Recreated by Own",
      recreatedByOthers: "Recreated by Others",
      completed: "Fully Completed"
    };

    const sectionColors = {
      inProgress: "#3498db",
      accepted: "#2ecc71",
      recreatedByOwn: "#f39c12",
      recreatedByOthers: "#e74c3c",
      completed: "#27ae60"
    };

    const currentRequests = filterRequests(trackingData[activeSection] || []);
    const departments = getAllDepartments();

    return (
      <div className="section-content-wrapper">
        <div className="section-content-header" style={{ borderColor: sectionColors[activeSection] }}>
          <h2>{sectionTitles[activeSection]}</h2>
          <div className="section-count-badge" style={{ backgroundColor: sectionColors[activeSection] }}>
            {currentRequests.length} Request{currentRequests.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label>Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="filter-input"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Event Name</label>
            <input
              type="text"
              value={filterEventName}
              onChange={(e) => setFilterEventName(e.target.value)}
              placeholder="Search event..."
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="filter-input"
            />
          </div>

          {(filterDepartment || filterEventName || filterDateFrom || filterDateTo) && (
            <button
              className="btn-clear-filters"
              onClick={() => {
                setFilterDepartment("");
                setFilterEventName("");
                setFilterDateFrom("");
                setFilterDateTo("");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="requests-grid">
          {currentRequests.length === 0 ? (
            <div className="no-requests-message">
              <p>No requests in this category</p>
            </div>
          ) : (
            currentRequests.map(req => renderRequestCard(req, activeSection))
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-wrapper">
        <div className="dashboard-header fade-in">
          <div className="dashboard-header-accent"></div>
          <div className="dashboard-header-content">
            <div className="dashboard-header-left">
              <div className="dashboard-logo-box">
                <img src={logo} alt="KITE Logo" className="dashboard-logo" />
              </div>
              <div className="dashboard-title-section">
                <h1>Track Event Requests</h1>
                <p>{activeSection ? "Request Details" : "Monitor and manage your requests"}</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              {activeSection ? (
                <>
                  <button onClick={handleBack} className="btn-back">
                    <BsArrowLeft /> Back
                  </button>
                  <button onClick={handleBackToHome} className="btn-back-home">
                    Back to Home
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleBack} className="btn-back">
                    <BsArrowLeft /> Back
                  </button>
                  <button onClick={handleLogout} className="btn-logout">
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          {!activeSection ? renderSectionButtons() : renderSectionContent()}
        </div>
      </div>

      <style jsx>{`
        .tracking-sections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .tracking-section-card {
          background: white;
          border-radius: 12px;
          border-left: 4px solid;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .tracking-section-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        }

        .tracking-section-card.alert-section {
          border: 2px solid #e74c3c;
          box-shadow: 0 0 0 4px rgba(231, 76, 60, 0.1), 0 4px 12px rgba(0,0,0,0.15);
          animation: pulse-alert 2s ease-in-out infinite;
        }

        @keyframes pulse-alert {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(231, 76, 60, 0.1), 0 4px 12px rgba(0,0,0,0.15);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(231, 76, 60, 0.2), 0 6px 16px rgba(0,0,0,0.2);
          }
        }

        .tracking-section-card.alert-section:hover {
          transform: translateY(-6px);
          box-shadow: 0 0 0 4px rgba(231, 76, 60, 0.15), 0 12px 24px rgba(0,0,0,0.2);
        }

        .tracking-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .tracking-section-icon {
          font-size: 32px;
        }

        .tracking-section-badge {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 20px;
        }

        .tracking-section-title {
          font-size: 20px;
          font-weight: 600;
          margin: 12px 0 8px;
          color: #2c3e50;
        }

        .tracking-section-description {
          color: #7f8c8d;
          font-size: 14px;
          margin: 0;
        }

        .section-content-wrapper {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .section-content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: white;
          border-radius: 12px;
          border-left: 4px solid;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .section-content-header h2 {
          margin: 0;
          color: #2c3e50;
          font-size: 24px;
        }

        .section-count-badge {
          padding: 8px 16px;
          border-radius: 20px;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .filters-section {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          padding: 20px;
          background: white;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          min-width: 200px;
        }

        .filter-group label {
          font-size: 14px;
          font-weight: 600;
          color: #2c3e50;
        }

        .filter-input {
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.3s;
        }

        .filter-input:focus {
          outline: none;
          border-color: #3498db;
        }

        .btn-clear-filters {
          align-self: flex-end;
          padding: 10px 20px;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.3s;
        }

        .btn-clear-filters:hover {
          background: #c0392b;
        }

        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 24px;
        }

        .request-tracking-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .request-tracking-card:hover {
          box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        }

        .request-card-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .request-card-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .request-card-title h4 {
          margin: 0;
          font-size: 18px;
          flex: 1;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-pending {
          background: #f39c12;
          color: white;
        }

        .status-tracking {
          background: #3498db;
          color: white;
        }

        .status-recreated-tracking {
          background: #9b59b6;
          color: white;
        }

        .status-approved {
          background: #2ecc71;
          color: white;
        }

        .status-recreated {
          background: #e67e22;
          color: white;
        }

        .status-recreated-other {
          background: #e74c3c;
          color: white;
        }

        .request-card-meta {
          display: flex;
          gap: 8px;
        }

        .meta-badge {
          padding: 4px 10px;
          background: rgba(255,255,255,0.2);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .ref-badge {
          background: rgba(255,255,255,0.3);
        }

        .request-card-body {
          padding: 20px;
        }

        .request-info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #ecf0f1;
        }

        .info-label {
          font-weight: 600;
          color: #7f8c8d;
          font-size: 14px;
        }

        .info-value {
          color: #2c3e50;
          font-size: 14px;
        }

        .status-highlight {
          font-weight: 600;
          color: #3498db;
        }

        .approval-timeline-compact {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 2px solid #ecf0f1;
        }

        .approval-steps {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .approval-step {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .approval-step.approved {
          background: #d5f4e6;
          color: #27ae60;
        }

        .approval-step.recreated {
          background: #fadbd8;
          color: #e74c3c;
        }

        .approval-role {
          font-size: 12px;
        }

        .approval-status-icon {
          font-size: 14px;
        }

        .request-remarks {
          margin-top: 16px;
          padding: 12px;
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          border-radius: 4px;
        }

        .remark-item {
          margin-bottom: 8px;
        }

        .remark-label {
          display: block;
          font-weight: 600;
          color: #856404;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .remark-text {
          display: block;
          color: #856404;
          font-size: 13px;
        }

        .request-card-footer {
          padding: 16px 20px;
          background: #f8f9fa;
          text-align: right;
        }

        .btn-view-detail {
          padding: 8px 20px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s;
        }

        .btn-view-detail:hover {
          background: #2980b9;
        }

        .no-requests-message {
          text-align: center;
          padding: 60px 20px;
          color: #95a5a6;
          font-size: 18px;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .fade-in {
          animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .tracking-sections-grid {
            grid-template-columns: 1fr;
          }

          .requests-grid {
            grid-template-columns: 1fr;
          }

          .filters-section {
            flex-direction: column;
          }

          .filter-group {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

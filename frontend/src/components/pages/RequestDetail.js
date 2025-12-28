import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRequestDetail } from "../../api";
import { toast } from "react-toastify";
import "../../styles/Dashboard.css";
import logo from '../../assets/kite-logo.png';
import { BsArrowLeft, BsCheckCircle, BsXCircle, BsArrowRepeat } from "react-icons/bs";

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequestDetail();
  }, [id]);

  const loadRequestDetail = async () => {
    setIsLoading(true);
    try {
      const res = await getRequestDetail(id);
      setRequest(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load request details");
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}></div>
            <p className="mt-3 text-muted">Loading request details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const getStatusIcon = (status) => {
    if (status === "Approved") return <BsCheckCircle className="text-success" />;
    if (status === "Recreated") return <BsArrowRepeat className="text-warning" />;
    return <BsXCircle className="text-danger" />;
  };

  const getStatusBadgeClass = (status) => {
    if (status === "Approved") return "badge-approved";
    if (status === "Recreated") return "badge-processing";
    return "badge-rejected";
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-wrapper">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-accent" />
          <div className="dashboard-header-content">
            <div className="dashboard-header-left">
              <div className="dashboard-logo-box">
                <img src={logo} alt="KITE Logo" className="dashboard-logo" />
              </div>
              <div className="dashboard-title-section">
                <h1>Request Details</h1>
                <p>Comprehensive request information</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <button
                className="btn-action-secondary"
                onClick={() => navigate(-1)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <BsArrowLeft /> Back
              </button>
            </div>
          </div>
        </div>

        {/* Request Information Card */}
        <div className="card" style={{ marginBottom: '1.5rem', borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', padding: '1.5rem', color: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{request.eventName}</h3>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span className="badge-custom" style={{ background: 'rgba(255,255,255,0.2)' }}>
                {request.department}
              </span>
              {request.referenceNo && (
                <span className="badge-custom" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  Ref: {request.referenceNo}
                </span>
              )}
              <span className={`badge-custom ${getStatusBadgeClass(request.overallStatus)}`}>
                {request.isCompleted ? 'Completed' : request.overallStatus}
              </span>
            </div>
          </div>

          <div style={{ padding: '2rem' }}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>Staff Name</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>{request.staffName}</p>
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>Department</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>{request.department}</p>
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>Event Date</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
                  {new Date(request.eventDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>Submitted On</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
                  {new Date(request.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="col-12 mb-3">
                <label style={{ fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>Event Purpose</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{request.purpose}</p>
              </div>
              {request.originalPurpose && request.originalPurpose !== request.purpose && (
                <div className="col-12 mb-3">
                  <div style={{ 
                    background: '#fef2f2', 
                    border: '2px solid #fca5a5', 
                    borderRadius: '0.5rem', 
                    padding: '1rem' 
                  }}>
                    <label style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      ⚠️ Original Purpose (Modified during recreation)
                    </label>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', lineHeight: '1.6', color: '#991b1b', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                      {request.originalPurpose}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Approval Timeline */}
        {request.approvals && request.approvals.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>
                Approval Timeline
              </h4>
            </div>
            <div style={{ padding: '2rem' }}>
              <div className="timeline">
                {request.approvals.map((approval, index) => (
                  <div key={index} className="timeline-item" style={{ display: 'flex', gap: '1rem', marginBottom: index < request.approvals.length - 1 ? '2rem' : '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ 
                        width: '3rem', 
                        height: '3rem', 
                        borderRadius: '50%', 
                        background: approval.status === 'Approved' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        {getStatusIcon(approval.status)}
                      </div>
                      {index < request.approvals.length - 1 && (
                        <div style={{ 
                          width: '2px', 
                          flex: 1, 
                          background: '#cbd5e1', 
                          minHeight: '2rem',
                          marginTop: '0.5rem'
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <h5 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                            {approval.role}
                          </h5>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                            {approval.status === 'Approved' ? 'Approved' : 'Requested Recreation'}
                          </p>
                        </div>
                        <span className={`badge-custom ${getStatusBadgeClass(approval.status)}`}>
                          {approval.status}
                        </span>
                      </div>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#475569' }}>
                        {new Date(approval.decidedAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {approval.comments && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '0.875rem', 
                          background: '#f8fafc', 
                          borderLeft: '3px solid #3b82f6',
                          borderRadius: '0.5rem'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.9375rem', color: '#334155', fontStyle: 'italic' }}>
                            "{approval.comments}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Report Link */}
        {request.reportPath && (
          <div className="card" style={{ marginBottom: '1.5rem', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', background: '#f0f9ff', borderLeft: '4px solid #3b82f6' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontWeight: 600 }}>Report Available</h5>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                This request has an attached report document.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

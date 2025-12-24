import React from "react";
import "../../styles/Dashboard.css";

function RequestDetailModal({ data, onClose }) {
  const {
    id,
    staff_name,
    department,
    event_name,
    event_date,
    time_in,
    time_out,
    purpose,
    report_url,
    approvals,
  } = data;

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: "700px" }}>
        <div className="modal-header-custom">
          <h3>📋 Request #{id} - Details</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body-custom">
          {/* Event Info Card */}
          <div style={{ 
            background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)", 
            padding: "1.5rem", 
            borderRadius: "0.75rem",
            marginBottom: "1.5rem"
          }}>
            <h4 style={{ color: "#1e3a8a", marginBottom: "1rem", fontSize: "1.25rem" }}>
              🎯 {event_name}
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
              <p style={{ margin: 0, color: "#475569" }}>
                <strong style={{ color: "#1e3a8a" }}>Staff:</strong> {staff_name}
              </p>
              <p style={{ margin: 0, color: "#475569" }}>
                <strong style={{ color: "#1e3a8a" }}>Department:</strong> {department}
              </p>
              <p style={{ margin: 0, color: "#475569" }}>
                <strong style={{ color: "#1e3a8a" }}>Event Date:</strong> {event_date}
              </p>
              <p style={{ margin: 0, color: "#475569" }}>
                <strong style={{ color: "#1e3a8a" }}>Time:</strong> {time_in} - {time_out}
              </p>
            </div>
            <p style={{ margin: "1rem 0 0 0", color: "#475569" }}>
              <strong style={{ color: "#1e3a8a" }}>Purpose:</strong> {purpose}
            </p>

            {report_url && (
              <p style={{ margin: "1rem 0 0 0" }}>
                <strong style={{ color: "#1e3a8a" }}>Event Report:</strong>{" "}
                <a 
                  href={report_url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: "#3b82f6", textDecoration: "underline" }}
                >
                  📄 View / Download
                </a>
              </p>
            )}
          </div>

          {/* Approval History */}
          <div>
            <h4 style={{ color: "#1e3a8a", marginBottom: "1rem", fontSize: "1.1rem" }}>
              📜 Approval Flow History
            </h4>

            {(!approvals || approvals.length === 0) ? (
              <p style={{ color: "#64748b", fontStyle: "italic" }}>No actions taken yet.</p>
            ) : (
              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Comments</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((a, i) => (
                      <tr key={i}>
                        <td><strong>{a.role}</strong></td>
                        <td>
                          <span className={
                            a.status?.toLowerCase().includes("approved") 
                              ? "badge-custom badge-approved" 
                              : a.status?.toLowerCase().includes("reject")
                              ? "badge-custom badge-rejected"
                              : "badge-custom badge-pending"
                          }>
                            {a.status}
                          </span>
                        </td>
                        <td>{a.comments || "-"}</td>
                        <td>{new Date(a.decided_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer-custom">
          <button className="btn-secondary-custom" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default RequestDetailModal;

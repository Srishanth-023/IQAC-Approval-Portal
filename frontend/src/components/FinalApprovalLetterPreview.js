import React from "react";
import { approvalLetterUrl } from "../api";
import "./Dashboard.css";

function FinalApprovalLetterPreview({ request, onClose }) {
  if (!request) return null;

  const handleOpen = () => {
    window.open(approvalLetterUrl(request.id), "_blank");
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: "500px" }}>
        <div className="modal-header-custom">
          <h3>📄 Approval Letter Preview</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body-custom">
          <div style={{ 
            background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            marginBottom: "1rem"
          }}>
            <p style={{ color: "#475569", marginBottom: "0.75rem" }}>
              <strong style={{ color: "#1e3a8a" }}>Reference No:</strong>{" "}
              <span className="badge-custom badge-approved">
                {request.reference_no || "N/A"}
              </span>
            </p>
            <p style={{ color: "#475569", marginBottom: "0.75rem" }}>
              <strong style={{ color: "#1e3a8a" }}>Event:</strong> {request.event_name}
            </p>
            <p style={{ color: "#475569", marginBottom: "0" }}>
              <strong style={{ color: "#1e3a8a" }}>Requested By:</strong> {request.staff_name}
            </p>
          </div>

          <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", marginBottom: "1rem" }}>
            Click below to download the final approval letter.
          </p>

          <button 
            className="btn-success-custom" 
            onClick={handleOpen}
            style={{ width: "100%", padding: "0.75rem" }}
          >
            📥 Open Approval Letter
          </button>
        </div>

        <div className="modal-footer-custom">
          <button className="btn-secondary-custom" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinalApprovalLetterPreview;

import React from "react";
import "../../styles/Dashboard.css";
import { BsClipboardData, BsExclamationTriangle, BsLightbulb } from "react-icons/bs";

function IQACWorkflowSummary({ referenceNo, selectedRoles }) {
  return (
    <div style={{ 
      background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
      padding: "1.5rem",
      borderRadius: "0.75rem",
      border: "2px solid #3b82f6",
      marginTop: "1rem",
      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.15)"
    }}>
      <h5 style={{ color: "#1e3a8a", fontWeight: "700", marginBottom: "1rem", fontSize: "1.1rem" }}>
        <BsClipboardData style={{ marginRight: '0.5rem' }} /> IQAC Approval Summary
      </h5>

      <p style={{ color: "#475569", marginBottom: "0.75rem" }}>
        <strong style={{ color: "#1e3a8a" }}>Reference Number:</strong>{" "}
        <span style={{ 
          background: referenceNo ? "#3b82f6" : "#ef4444",
          color: "white",
          padding: "0.25rem 0.75rem",
          borderRadius: "0.5rem",
          fontSize: "0.9rem",
          fontWeight: "600"
        }}>
          {referenceNo || "Not assigned"}
        </span>
      </p>

      <p style={{ color: "#1e3a8a", fontWeight: "600", marginBottom: "0.5rem" }}>
        Selected Workflow:
      </p>

      {selectedRoles.length === 0 ? (
        <p style={{ color: "#ef4444", fontStyle: "italic" }}><BsExclamationTriangle style={{ marginRight: '0.25rem' }} /> No roles selected.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {selectedRoles.map((r, i) => (
            <span 
              key={i}
              className="badge-custom badge-approved"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
            >
              {i + 1}. {r}
            </span>
          ))}
        </div>
      )}

      <p style={{ 
        color: "#64748b", 
        fontSize: "0.8rem", 
        marginTop: "1rem",
        padding: "0.75rem",
        background: "rgba(255,255,255,0.7)",
        borderRadius: "0.5rem"
      }}>
        <BsLightbulb style={{ marginRight: '0.25rem' }} /> Workflow flow order:
        <br />
        <strong>Staff → HOD → IQAC → Selected Roles → Completed</strong>
      </p>
    </div>
  );
}

export default IQACWorkflowSummary;

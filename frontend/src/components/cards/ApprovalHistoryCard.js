import React from "react";
import "../../styles/Dashboard.css";

function ApprovalHistoryCard({ approvals }) {
  if (!approvals || approvals.length === 0)
    return <p style={{ color: "#64748b", fontStyle: "italic" }}>No approvals yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
      {approvals.map((item, i) => (
        <div 
          key={i} 
          style={{ 
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            borderRadius: "0.75rem",
            padding: "1rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h6 style={{ color: "#1e3a8a", fontWeight: "700", margin: 0, fontSize: "1rem" }}>
              {item.role}
            </h6>
            <span 
              className={
                item.status?.toLowerCase().includes("approved") 
                  ? "badge-custom badge-approved" 
                  : item.status?.toLowerCase().includes("reject") || item.status?.toLowerCase().includes("recreat")
                  ? "badge-custom badge-rejected"
                  : item.status?.toLowerCase().includes("no response")
                  ? "badge-custom badge-warning"
                  : "badge-custom badge-pending"
              }
            >
              {item.status}
            </span>
          </div>
          <p style={{ color: "#475569", margin: "0.5rem 0", fontSize: "0.9rem" }}>
            <strong style={{ color: "#64748b" }}>Comments:</strong> {item.comments || "-"}
          </p>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: 0 }}>
            🕐 {new Date(item.decided_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

export default ApprovalHistoryCard;

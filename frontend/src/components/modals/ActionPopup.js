import React, { useState } from "react";
import "../../styles/Dashboard.css";

const ROLES = ["HOD", "PRINCIPAL", "DIRECTOR", "AO", "CEO"];

function ActionPopup({ role, request, onSubmit, onClose }) {
  const [action, setAction] = useState("approve");
  const [comments, setComments] = useState("");

  const [refNo, setRefNo] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);

  const isIQAC = role === "IQAC";

  const toggleRole = (r) => {
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const handleSubmit = () => {
    if (action === "approve" && isIQAC) {
      if (!/^[A-Za-z0-9]{8}$/.test(refNo)) {
        alert("Reference No must be 8 alphanumeric characters.");
        return;
      }
      if (selectedRoles.length === 0) {
        alert("Select at least one role for workflow.");
        return;
      }
    }

    const payload = {
      actor_role: role,
      action,
      comments,
    };

    if (isIQAC && action === "approve") {
      payload.reference_no = refNo;
      payload.workflow_roles = selectedRoles;
    }

    onSubmit(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: "500px" }}>
        <div className="modal-header-custom">
          <h3>⚡ {role} - Action for Request #{request.id}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body-custom">
          {/* Action Selection */}
          <div className="form-group-custom">
            <label className="form-label-custom" style={{ fontWeight: "600" }}>Select Action</label>
            <select
              className="form-input-custom"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="approve">✅ Approve</option>
              <option value="recreate">🔄 Recreate</option>
            </select>
          </div>

          {/* IQAC-specific UI */}
          {isIQAC && action === "approve" && (
            <>
              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontWeight: "600" }}>
                  Reference Number (8 Alphanumeric)
                </label>
                <input
                  type="text"
                  className="form-input-custom"
                  maxLength="8"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="e.g., IQAC2024"
                />
              </div>

              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontWeight: "600" }}>
                  Select Workflow Roles
                </label>
                <div style={{ 
                  background: "#f8fafc", 
                  padding: "1rem", 
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0"
                }}>
                  {ROLES.map((r) => (
                    <label key={r} style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.5rem",
                      padding: "0.5rem 0",
                      cursor: "pointer",
                      color: "#475569"
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(r)}
                        onChange={() => toggleRole(r)}
                        style={{ width: "18px", height: "18px", accentColor: "#3b82f6" }}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
                <small style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.5rem", display: "block" }}>
                  Order is automatic: HOD → Principal → Director → AO → CEO
                </small>
              </div>
            </>
          )}

          {/* Comments */}
          <div className="form-group-custom">
            <label className="form-label-custom" style={{ fontWeight: "600" }}>
              Comments (optional)
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "normal", marginLeft: "0.5rem" }}>
                ({comments.length}/400)
              </span>
            </label>
            <textarea
              className="form-input-custom"
              value={comments}
              onChange={(e) => setComments(e.target.value.slice(0, 400))}
              rows="3"
              placeholder="Add any comments or notes..."
              style={{ resize: "vertical" }}
              maxLength="400"
            />
          </div>
        </div>

        <div className="modal-footer-custom">
          <button className="btn-secondary-custom" onClick={onClose}>Cancel</button>
          <button className="btn-success-custom" onClick={handleSubmit}>
            ✅ Submit Action
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActionPopup;

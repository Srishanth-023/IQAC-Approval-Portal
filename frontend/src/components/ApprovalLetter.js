import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { approvalLetterUrl } from "../api";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';

function ApprovalLetter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(approvalLetterUrl(id));
  }, [id]);

  const downloadReport = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `Approval_Report_${id}.html`;
    a.click();
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-wrapper">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <img src={logo} alt="Logo" className="header-logo" />
            <div className="header-text">
              <h1>IQAC Approval Portal</h1>
              <p>Final Approval Report</p>
            </div>
          </div>
          <button className="btn-secondary-custom" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        {/* Main Content */}
        <div className="dashboard-card">
          <div className="card-header" style={{ justifyContent: "center" }}>
            <h3>📄 Final Approval Report</h3>
          </div>

          {url && (
            <div style={{ padding: "1.5rem" }}>
              <iframe
                src={url}
                title="Approval Letter"
                width="100%"
                height="600px"
                style={{
                  border: "2px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              ></iframe>

              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <button
                  className="btn-success-custom"
                  onClick={downloadReport}
                  style={{ padding: "0.75rem 2rem" }}
                >
                  📥 Download Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dashboard-footer">
          <p>© 2025 KITE Group of Institutions. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default ApprovalLetter;

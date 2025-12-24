import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { approvalLetterUrl } from "../../api";
import "../../styles/Dashboard.css";
import logo from '../../assets/kite-logo.png';
import { BsArrowLeft, BsFileEarmarkText, BsDownload } from "react-icons/bs";

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
        <div className="dashboard-header fade-in">
          <div className="dashboard-header-accent"></div>
          <div className="dashboard-header-content">
            <div className="dashboard-header-left">
              <div className="dashboard-logo-box">
                <img src={logo} alt="KITE Logo" className="dashboard-logo" />
              </div>
              <div className="dashboard-title-section">
                <h1>IQAC Approval Portal</h1>
                <p>Final Approval Report</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <button className="btn-secondary-custom" onClick={() => navigate(-1)}>
                <BsArrowLeft style={{ marginRight: '0.5rem' }} /> Back
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="dashboard-card fade-in">
          <div className="card-header" style={{ justifyContent: "center" }}>
            <h3><BsFileEarmarkText style={{ marginRight: '0.5rem' }} /> Final Approval Report</h3>
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
                  <BsDownload style={{ marginRight: '0.5rem' }} /> Download Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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

export default ApprovalLetter;

import React from "react";
import "../../styles/Dashboard.css";

function SharedModal({ title, children, footer, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header-custom">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body-custom">{children}</div>

        <div className="modal-footer-custom">
          {footer || (
            <button className="btn-secondary-custom" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SharedModal;

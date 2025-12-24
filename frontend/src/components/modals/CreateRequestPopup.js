import React, { useState } from "react";
import { toast } from "react-toastify";
import "../../styles/Dashboard.css";

const CreateRequestPopup = ({ isOpen, onClose, onSubmit }) => {
  const [formValues, setFormValues] = useState({
    event_name: "",
    event_date: "",
    time_in: "",
    time_out: "",
    purpose: "",
    event_report: null,
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "event_report") {
      const file = files[0];
      if (file) {
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
          toast.error("Only PDF files are allowed. Please upload a PDF file.");
          e.target.value = "";
          setFormValues((prev) => ({ ...prev, event_report: null }));
          return;
        }
        setFormValues((prev) => ({ ...prev, event_report: file }));
      } else {
        setFormValues((prev) => ({ ...prev, event_report: null }));
      }
    } else {
      setFormValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const today = new Date().toISOString().split("T")[0];

    if (!formValues.event_name) newErrors.event_name = "Event name is required.";
    if (!formValues.event_date) newErrors.event_date = "Event date is required.";
    else if (formValues.event_date < today)
      newErrors.event_date = "Event date cannot be in the past.";

    if (!formValues.time_in) newErrors.time_in = "Time in is required.";
    if (!formValues.time_out) newErrors.time_out = "Time out is required.";
    if (!formValues.purpose) newErrors.purpose = "Purpose is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formValues);
    setFormValues({
      event_name: "",
      event_date: "",
      time_in: "",
      time_out: "",
      purpose: "",
      event_report: null,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: "500px" }}>
        <div className="modal-header-custom">
          <h3>📝 Create Event Request</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-custom">
            <div className="form-group-custom">
              <label className="form-label-custom">Event Name</label>
              <input
                type="text"
                className="form-input-custom"
                name="event_name"
                value={formValues.event_name}
                onChange={handleChange}
                placeholder="Enter event name"
              />
              {errors.event_name && (
                <small style={{ color: "#ef4444", fontSize: "0.8rem" }}>{errors.event_name}</small>
              )}
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Event Date</label>
              <input
                type="date"
                className="form-input-custom"
                name="event_date"
                value={formValues.event_date}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
              />
              {errors.event_date && (
                <small style={{ color: "#ef4444", fontSize: "0.8rem" }}>{errors.event_date}</small>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group-custom">
                <label className="form-label-custom">Time In</label>
                <input
                  type="time"
                  className="form-input-custom"
                  name="time_in"
                  value={formValues.time_in}
                  onChange={handleChange}
                />
                {errors.time_in && (
                  <small style={{ color: "#ef4444", fontSize: "0.8rem" }}>{errors.time_in}</small>
                )}
              </div>

              <div className="form-group-custom">
                <label className="form-label-custom">Time Out</label>
                <input
                  type="time"
                  className="form-input-custom"
                  name="time_out"
                  value={formValues.time_out}
                  onChange={handleChange}
                />
                {errors.time_out && (
                  <small style={{ color: "#ef4444", fontSize: "0.8rem" }}>{errors.time_out}</small>
                )}
              </div>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Purpose</label>
              <textarea
                className="form-input-custom"
                name="purpose"
                rows="3"
                value={formValues.purpose}
                onChange={handleChange}
                placeholder="Enter the purpose of the event"
                style={{ resize: "vertical" }}
              />
              {errors.purpose && (
                <small style={{ color: "#ef4444", fontSize: "0.8rem" }}>{errors.purpose}</small>
              )}
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Event Report (optional, PDF only)</label>
              <input
                type="file"
                className="form-input-custom"
                name="event_report"
                accept=".pdf,application/pdf"
                onChange={handleChange}
                style={{ padding: "0.6rem" }}
              />
              <small style={{ color: "#64748b", fontSize: "0.8rem" }}>Only PDF files are accepted</small>
            </div>
          </div>

          <div className="modal-footer-custom">
            <button type="button" className="btn-secondary-custom" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-custom">
              ✅ Create Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequestPopup;

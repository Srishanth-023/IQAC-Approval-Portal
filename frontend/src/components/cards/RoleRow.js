import React from "react";
import "../../styles/Dashboard.css";

function RoleRow({ request, onView, onAction }) {
  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("approved") || statusLower.includes("completed")) {
      return "badge-custom badge-approved";
    } else if (statusLower.includes("reject") || statusLower.includes("recreat")) {
      return "badge-custom badge-rejected";
    } else if (statusLower.includes("no response")) {
      return "badge-custom badge-warning";
    }
    return "badge-custom badge-pending";
  };

  return (
    <tr>
      <td><strong>{request.id}</strong></td>
      <td>{request.event_name}</td>
      <td>{request.staff_name}</td>
      <td>{request.event_date}</td>
      <td>
        <span className={getStatusBadge(request.overall_status)}>
          {request.overall_status}
        </span>
      </td>
      <td>
        <button 
          className="btn-secondary-custom" 
          onClick={onView}
          style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
        >
          👁️ View
        </button>
      </td>
      <td>
        <button 
          className="btn-primary-custom" 
          onClick={onAction}
          style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
        >
          ⚡ Action
        </button>
      </td>
    </tr>
  );
}

export default RoleRow;

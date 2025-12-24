import React from "react";

const circleStyle = (active, completed) => ({
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  backgroundColor: active ? "#3b82f6" : completed ? "#10b981" : "#e2e8f0",
  color: active || completed ? "white" : "#64748b",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontWeight: "bold",
  margin: "0 auto",
  boxShadow: active ? "0 4px 12px rgba(59, 130, 246, 0.4)" : "0 2px 4px rgba(0,0,0,0.1)",
  border: active ? "3px solid #1e3a8a" : "2px solid transparent",
  transition: "all 0.3s ease",
});

const lineStyle = (completed) => ({
  flex: 1,
  height: "4px",
  background: completed 
    ? "linear-gradient(90deg, #10b981, #10b981)" 
    : "linear-gradient(90deg, #e2e8f0, #e2e8f0)",
  margin: "0 8px",
  borderRadius: "2px",
});

function WorkflowTimeline({ currentRole, workflow }) {
  const fullFlow = ["STAFF", "HOD", "IQAC", ...workflow, "Completed"];

  const getCurrentIndex = () => {
    if (!currentRole || currentRole === null) return fullFlow.length - 1;
    const index = fullFlow.findIndex(r => r.toUpperCase() === currentRole.toUpperCase());
    return index === -1 ? 0 : index;
  };

  const currentIndex = getCurrentIndex();

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      marginTop: "1.5rem",
      padding: "1rem",
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      borderRadius: "1rem",
      maxWidth: "900px",
      margin: "1.5rem auto"
    }}>
      {fullFlow.map((role, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <React.Fragment key={index}>
            <div style={{ textAlign: "center", minWidth: "60px" }}>
              <div style={circleStyle(isActive, isCompleted)}>
                {isCompleted ? "✓" : index + 1}
              </div>
              <div style={{ 
                marginTop: "8px", 
                fontSize: "0.75rem", 
                fontWeight: isActive ? "700" : "500",
                color: isActive ? "#1e3a8a" : isCompleted ? "#10b981" : "#64748b"
              }}>
                {role}
              </div>
            </div>
            {index < fullFlow.length - 1 && (
              <div style={lineStyle(isCompleted)} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default WorkflowTimeline;

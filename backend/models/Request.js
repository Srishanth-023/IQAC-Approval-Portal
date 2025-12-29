const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    status: { type: String, enum: ["Approved", "Recreated", "No Response"], required: true },
    comments: { type: String, default: "" },
    decidedAt: { type: Date, default: Date.now },
    recreatedBy: { type: String, default: null }, // Track who recreated the request
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    department: {
      type: String,
      required: true,
      enum: ["AI&DS", "CSE", "ECE", "IT", "MECH", "AI&ML", "CYS", "R&A", "CSBS", "S&H"],
    },
    eventName: { type: String, required: true },
    eventDate: { type: String, required: true }, // or Date if you want
    purpose: { type: String, required: true },
    originalPurpose: { type: String, default: null }, // Store original purpose when recreated
    reportPath: { type: String, default: null },

    currentRole: { type: String, default: "HOD" },
    overallStatus: { type: String, default: "Waiting approval for HOD" },
    referenceNo: { type: String, default: null },

    workflowRoles: [{ type: String }], // ex: ["HOD","PRINCIPAL","DIRECTOR"]
    approvals: [approvalSchema],

    isCompleted: { type: Boolean, default: false },
    isResubmitted: { type: Boolean, default: false }, // Flag for recreated events that have been resubmitted
    
    // Auto-escalation tracking
    currentRoleStartTime: { type: Date, default: null }, // When request reached current role
    noResponseRoles: [{ type: String }], // Roles that didn't respond and were auto-escalated
    roleTimeouts: { type: Map, of: Date }, // Track when each role received the request
    lockedOutRoles: [{ type: String }], // Roles that are locked out from taking action
  },
  { timestamps: true }
);

// Add indexes for faster queries
requestSchema.index({ staffId: 1 });
requestSchema.index({ currentRole: 1 });
requestSchema.index({ department: 1 });
requestSchema.index({ currentRole: 1, department: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ staffId: 1, eventName: 1 });
requestSchema.index({ department: 1, staffId: 1 });

module.exports = mongoose.model("Request", requestSchema);

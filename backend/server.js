// ===============================
// IMPORTS
// ===============================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");

const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const htmlPdf = require("html-pdf-node");

dotenv.config();

// MODELS
const User = require("./models/User");
const Staff = require("./models/staff");
const Request = require("./models/Request");

// APP SETUP
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-user-role']
}));

// ===============================
// CONSTANTS
// ===============================
const DEPARTMENTS = ["AI&DS", "CSE", "ECE", "IT", "MECH", "AI&ML", "CYS"];

// ===============================
// AWS S3 CONFIG (SDK v3)
// ===============================
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

// ===============================
// MULTER MEMORY STORAGE
// ===============================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF files only
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// ===============================
// FUNCTION: Upload File to S3
// ===============================
async function uploadToS3(file) {
  const fileName = `reports/${Date.now()}_${file.originalname}`;

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
    Body: file.buffer, // Use buffer from memory storage
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(params));

  // Store only the key (not full URL) for generating pre-signed URLs later
  return fileName;
}

// ===============================
// FUNCTION: Generate Pre-signed URL for viewing files
// ===============================
async function getPresignedUrl(fileKey) {
  if (!fileKey) return null;
  
  // If fileKey is a full URL, extract just the key
  let key = fileKey;
  if (fileKey.includes('.amazonaws.com/')) {
    key = fileKey.split('.amazonaws.com/')[1];
  }
  
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
  });
  
  // URL valid for 7 days (604800 seconds)
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 604800 });
  return signedUrl;
}

// ===============================
// NORMALIZE APPROVAL FLOW ORDER (excluding HOD as it's handled separately)
// ===============================
function normalizeFlow(arr) {
  const order = ["PRINCIPAL", "DIRECTOR", "AO", "CEO"];
  if (!Array.isArray(arr)) return [];
  const set = new Set(arr.map((r) => r.toUpperCase()));
  return order.filter((r) => set.has(r));
}

// ===============================
// DEFAULT ROLE USERS
// ===============================
async function createDefaultRoles() {
  const roles = [
    { name: "Admin User", role: "ADMIN", password: "admin123" },
    { name: "IQAC User", role: "IQAC", password: "123" },
    { name: "Principal User", role: "PRINCIPAL", password: "123" },
    { name: "Director User", role: "DIRECTOR", password: "123" },
    { name: "AO User", role: "AO", password: "123" },
    { name: "CEO User", role: "CEO", password: "123" },
  ];

  for (let r of roles) {
    const existing = await User.findOne({ role: r.role });
    if (!existing) {
      await User.create(r);
      console.log(`Created default user for role: ${r.role}`);
    }
  }
}

// ===============================
// DEFAULT STAFF USERS (OPTIONAL)
// ===============================
async function createDefaultStaffs() {
  const staffs = [
    {
      name: "gokul",
      email: "gokul@test.com",
      department: "CSE",
      password: "gokul123",
    },
    {
      name: "arun",
      email: "arun@test.com",
      department: "CSE",
      password: "arun123",
    },
    {
      name: "sathish",
      email: "sathish@test.com",
      department: "IT",
      password: "sathish123",
    },
    {
      name: "mani",
      email: "mani@test.com",
      department: "ECE",
      password: "mani123",
    },
    {
      name: "vijay",
      email: "vijay@test.com",
      department: "MECH",
      password: "vijay123",
    },
  ];

  for (let s of staffs) {
    const existing = await Staff.findOne({ email: s.email });
    if (!existing) {
      await Staff.create(s);
      console.log(`Created default staff: ${s.name}`);
    }
  }
}

// ===============================
// DATABASE CONNECT
// ===============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected (Atlas)");
    await createDefaultRoles();
    await createDefaultStaffs();
    
    // Fix old requests that have 'HOD' in workflowRoles
    const fixedCount = await Request.updateMany(
      { workflowRoles: "HOD" },
      { $pull: { workflowRoles: "HOD" } }
    );
    if (fixedCount.modifiedCount > 0) {
      console.log(`Fixed ${fixedCount.modifiedCount} requests by removing HOD from workflow`);
    }
    
    // Clean up trailing spaces in staff names
    const allStaff = await Staff.find({});
    let cleanedCount = 0;
    for (const staff of allStaff) {
      const trimmedName = staff.name.trim();
      const trimmedPassword = staff.password.trim();
      if (staff.name !== trimmedName || staff.password !== trimmedPassword) {
        await Staff.updateOne(
          { _id: staff._id },
          { name: trimmedName, password: trimmedPassword }
        );
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} staff records by trimming whitespace`);
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// ===============================
// TEXT SIMILARITY FUNCTIONS
// ===============================
// Normalize text for comparison
function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Calculate similarity between two strings (0 to 1)
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);
  
  // Exact match
  if (norm1 === norm2) return 1.0;
  
  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.85;
  }
  
  // Calculate word overlap
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  // Jaccard similarity
  return intersection.size / union.size;
}

// Check if two texts are similar (threshold: 0.7 = 70% similar)
function areTextsSimilar(text1, text2, threshold = 0.7) {
  return calculateSimilarity(text1, text2) >= threshold;
}

// ===============================
// SIMPLE ADMIN MIDDLEWARE
// ===============================
// Expect header: x-user-role = ADMIN (set from frontend after login)
function requireAdmin(req, res, next) {
  const role = (req.headers["x-user-role"] || "").toUpperCase();
  if (role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
}

// ===============================
// LOGIN
// ===============================
app.post("/api/auth/login", async (req, res) => {
  try {
    let { role, name, password, department } = req.body;
    role = (role || "").toUpperCase();

    // STAFF LOGIN
    if (role === "STAFF") {
      // Trim whitespace from input
      const trimmedName = (name || '').trim();
      const trimmedPassword = (password || '').trim();
      
      console.log("Staff login attempt - Name:", trimmedName, "Password:", trimmedPassword);
      
      // Find staff with trimmed name comparison
      const allStaff = await Staff.find({});
      const staff = allStaff.find(s => 
        s.name.trim() === trimmedName && s.password.trim() === trimmedPassword
      );
      
      if (!staff) {
        // Try to find by name only to see if staff exists
        const staffByName = allStaff.find(s => s.name.trim() === trimmedName);
        
        if (staffByName) {
          console.log("Staff found by name:", staffByName.name);
          console.log("Password mismatch. Expected:", staffByName.password.trim(), "Received:", trimmedPassword);
          return res.status(400).json({ error: "Invalid password" });
        }
        
        console.log("Staff not found with name:", trimmedName);
        return res.status(400).json({ error: "Invalid staff credentials" });
      }

      console.log("Staff login successful:", staff.name.trim(), staff.department);

      return res.json({
        user: {
          id: staff._id,
          role: "STAFF",
          name: staff.name,
          department: staff.department,
          email: staff.email,
        },
      });
    }

    // HOD LOGIN (per department)
    if (role === "HOD") {
      department = (department || "").toUpperCase();

      const hodUser = await User.findOne({
        role: "HOD",
        department: department,
      });

      if (!hodUser) {
        return res
          .status(400)
          .json({ error: "HOD for this department not found" });
      }

      if (hodUser.password !== password) {
        return res.status(400).json({ error: "Invalid password" });
      }

      return res.json({
        user: {
          id: hodUser._id,
          role: hodUser.role,
          name: hodUser.name,
          department: hodUser.department,
        },
      });
    }

    // OTHER ROLES (IQAC, PRINCIPAL, DIRECTOR, AO, CEO, ADMIN)
    const user = await User.findOne({ role });
    if (!user) {
      console.log(`User not found for role: ${role}`);
      return res.status(400).json({ error: "Role not found" });
    }

    console.log(`Login attempt for ${role}: User found - ${user.name}, Password match: ${user.password === password}`);

    if (user.password !== password)
      return res.status(400).json({ error: "Invalid password" });

    res.json({
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        department: user.department || null,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// STAFF REQUEST CREATE (UPLOAD TO S3)
// ===============================
app.post("/api/requests", upload.single("event_report"), async (req, res) => {
  try {
    const { staffId, event_name, event_date, purpose } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(400).json({ error: "Invalid staffId" });

    // CONDITION 1: Check if same staff has created similar event before
    const staffRequests = await Request.find({ staffId });
    
    for (const existingReq of staffRequests) {
      if (areTextsSimilar(existingReq.eventName, event_name, 0.7)) {
        return res.status(400).json({ 
          error: `You have already created a similar event: "${existingReq.eventName}". Please use a different event name.` 
        });
      }
    }

    // CONDITION 2: Check if any staff in same department has created similar event
    const departmentRequests = await Request.find({ 
      department: staff.department,
      staffId: { $ne: staffId } // Exclude current staff's requests (already checked above)
    });
    
    for (const existingReq of departmentRequests) {
      const namesSimilar = areTextsSimilar(existingReq.eventName, event_name, 0.7);
      const purposesSimilar = areTextsSimilar(existingReq.purpose, purpose, 0.6);
      
      if (namesSimilar && purposesSimilar) {
        return res.status(400).json({ 
          error: `A similar event request has already been created by ${existingReq.staffName} in your department: "${existingReq.eventName}".` 
        });
      }
    }

    let fileUrl = null;

    if (req.file) {
      fileUrl = await uploadToS3(req.file);
    }

    const newReq = await Request.create({
      staffId,
      staffName: staff.name,
      department: staff.department,
      eventName: event_name,
      eventDate: event_date,
      purpose,
      reportPath: fileUrl,
      currentRole: "IQAC",
      overallStatus: "Waiting approval for IQAC",
      referenceNo: null,
      workflowRoles: [],
      approvals: [],
      isCompleted: false,
    });

    res.json({ message: "Request created", request: newReq });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// STAFF REQUEST RESUBMIT (After Recreation)
// ===============================
app.put("/api/requests/:id/resubmit", upload.single("event_report"), async (req, res) => {
  try {
    const { event_name, event_date, purpose } = req.body;
    
    const doc = await Request.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Request not found" });
    
    // Verify this request was recreated (currentRole should be null)
    if (doc.currentRole !== null) {
      return res.status(400).json({ error: "This request is not awaiting resubmission" });
    }

    // Update the request details
    doc.eventName = event_name;
    doc.eventDate = event_date;
    doc.purpose = purpose;
    
    // Update file if provided
    if (req.file) {
      const fileUrl = await uploadToS3(req.file);
      doc.reportPath = fileUrl;
    }
    
    // Resume workflow: go directly to HOD, skip IQAC
    // Keep the existing referenceNo and workflowRoles from first approval
    doc.currentRole = "HOD";
    doc.overallStatus = "Waiting approval for HOD (Resubmitted)";
    doc.isCompleted = false;
    
    console.log("Request Resubmitted - ID:", req.params.id);
    console.log("Resuming workflow - Going to HOD");
    console.log("Existing workflowRoles:", doc.workflowRoles);
    console.log("Reference Number:", doc.referenceNo);
    
    await doc.save();
    
    res.json({ message: "Request resubmitted successfully", request: doc });
  } catch (e) {
    console.error("Resubmit error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// GET REQUESTS (STAFF / ROLE BASED)
// ===============================
app.get("/api/requests", async (req, res) => {
  try {
    const filter = {};
    if (req.query.staffId) filter.staffId = req.query.staffId;
    if (req.query.current_role)
      filter.currentRole = req.query.current_role.toUpperCase();
    
    // If HOD is requesting, also filter by their department
    if (req.query.current_role?.toUpperCase() === "HOD" && req.query.department) {
      filter.department = req.query.department; // Direct match (departments are stored exactly as in enum)
    }

    console.log("GET /api/requests filter:", filter);
    console.log("Query params - role:", req.query.current_role, "department:", req.query.department);

    const requests = await Request.find(filter).sort({ createdAt: -1 });
    console.log("Found requests:", requests.length);
    if (requests.length > 0) {
      console.log("First request department:", requests[0].department, "currentRole:", requests[0].currentRole);
    }

    // Generate pre-signed URLs for each request
    const requestsWithUrls = await Promise.all(
      requests.map(async (r) => {
        const obj = r.toObject();
        obj.reportUrl = r.reportPath ? await getPresignedUrl(r.reportPath) : null;
        return obj;
      })
    );

    res.json(requestsWithUrls);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// GET SINGLE REQUEST DETAIL
// ===============================
app.get("/api/requests/:id", async (req, res) => {
  try {
    const doc = await Request.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Request not found" });

    // Generate pre-signed URL for the report
    const reportUrl = doc.reportPath ? await getPresignedUrl(doc.reportPath) : null;

    res.json({
      ...doc.toObject(),
      reportUrl,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// GET FRESH SIGNED URL FOR REPORT
// ===============================
app.get("/api/requests/:id/report-url", async (req, res) => {
  try {
    const doc = await Request.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Request not found" });
    
    if (!doc.reportPath) {
      return res.status(404).json({ error: "No report uploaded for this request" });
    }

    // Generate fresh signed URL
    const reportUrl = await getPresignedUrl(doc.reportPath);
    
    res.json({ url: reportUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// UPDATE/EDIT REJECTED REQUEST (STAFF RESUBMIT)
// ===============================
app.post("/api/requests/:id/edit", upload.single("event_report"), async (req, res) => {
  try {
    const { event_name, event_date, purpose } = req.body;
    
    const doc = await Request.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Request not found" });
    
    // Only allow editing if request was rejected/recreation requested
    const status = (doc.overallStatus || "").toLowerCase();
    const canEdit = status.includes("recreat") || status.includes("rejected") || doc.currentRole === null;
    
    console.log("Edit request - Status:", doc.overallStatus, "Can edit:", canEdit);
    
    if (!canEdit) {
      return res.status(400).json({ error: "Only rejected requests can be edited" });
    }
    
    // Update fields
    if (event_name) doc.eventName = event_name;
    if (event_date) doc.eventDate = event_date;
    if (purpose) doc.purpose = purpose;
    
    // If new file uploaded, update it
    if (req.file) {
      const fileUrl = await uploadToS3(req.file);
      doc.reportPath = fileUrl;
    }
    
    // Reset the request to go back to HOD for approval
    doc.currentRole = "HOD";
    doc.overallStatus = "Waiting approval for HOD";
    doc.isCompleted = false;
    // Keep previous approvals for history, but clear workflow roles for fresh start
    doc.workflowRoles = [];
    doc.referenceNo = null;
    
    await doc.save();
    
    res.json({ message: "Request updated and resubmitted for approval", request: doc });
  } catch (e) {
    console.error("Edit request error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// REQUEST ACTION (APPROVE/RECREATE)
// ===============================
app.post("/api/requests/:id/action", async (req, res) => {
  try {
    const { action, comments, refNumber, flow } = req.body;

    const doc = await Request.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Invalid Request ID" });

    const role = doc.currentRole;
    const now = new Date();

    // HOD special logic - check for recreation point BEFORE adding new approval
    if (role === "HOD" && action === "approve") {
      const seq = doc.workflowRoles;
      
      console.log("HOD Approval - workflowRoles:", seq);
      console.log("HOD Approval - request department:", doc.department);
      console.log("HOD Approval - approvals history BEFORE new approval:", JSON.stringify(doc.approvals));
      
      // Check if there was a recreation by a higher authority
      // Find the last "Recreated" status in approvals (BEFORE adding new HOD approval)
      let recreationPoint = null;
      if (seq && seq.length > 0) {
        for (let i = doc.approvals.length - 1; i >= 0; i--) {
          if (doc.approvals[i].status === "Recreated" && 
              seq.includes(doc.approvals[i].role)) {
            recreationPoint = doc.approvals[i].role;
            console.log("Found recreation point:", recreationPoint);
            break;
          }
        }
      }
      
      // Now add HOD's approval
      doc.approvals.push({
        role,
        status: "Approved",
        comments: comments || "",
        decidedAt: now,
      });
      
      if (seq && seq.length > 0) {
        // If there was a recreation by someone in the workflow, resume from that point
        if (recreationPoint) {
          doc.currentRole = recreationPoint;
          doc.overallStatus = `Waiting approval for ${recreationPoint}`;
          console.log("HOD Approval - Resuming at recreation point:", recreationPoint);
        } else {
          // No recreation, start from first workflow role
          doc.currentRole = seq[0];
          doc.overallStatus = `Waiting approval for ${seq[0]}`;
          console.log("HOD Approval - Moving to first role:", seq[0]);
        }
      } else {
        // No workflow, mark as completed
        doc.currentRole = null;
        doc.overallStatus = "Completed";
        doc.isCompleted = true;
        console.log("HOD Approval - No workflow, marking as completed");
      }

      await doc.save();
      return res.json({ message: "HOD Approved" });
    }

    // Add approval for all other roles
    doc.approvals.push({
      role,
      status: action === "approve" ? "Approved" : "Recreated",
      comments: comments || "",
      decidedAt: now,
    });

    // IQAC special logic
    if (role === "IQAC" && action === "approve") {
      doc.referenceNo = refNumber;
      doc.workflowRoles = normalizeFlow(flow);
      
      console.log("IQAC Approval - Reference Number:", refNumber);
      console.log("IQAC Approval - Flow received:", flow);
      console.log("IQAC Approval - Normalized workflowRoles:", doc.workflowRoles);
      
      // After IQAC approval, always send to HOD first (department-specific)
      doc.currentRole = "HOD";
      doc.overallStatus = "Waiting approval for HOD";

      await doc.save();
      return res.json({ message: "IQAC Approved, forwarded to HOD" });
    }

    // RECREATE logic
    if (action === "recreate") {
      // If HOD recreates, send back to staff
      if (role === "HOD") {
        doc.currentRole = null;
        doc.overallStatus = `HOD requested recreation`;
      } else {
        doc.currentRole = null;
        doc.overallStatus = `${role} requested recreation`;
      }
      doc.isCompleted = false;

      await doc.save();
      return res.json({ message: "Recreate issued" });
    }

    // Normal approval flow logic
    const seq = doc.workflowRoles;
    const idx = seq.indexOf(role);

    if (idx === seq.length - 1) {
      doc.currentRole = null;
      doc.overallStatus = "Completed";
      doc.isCompleted = true;
    } else {
      doc.currentRole = seq[idx + 1];
      doc.overallStatus = `Waiting approval for ${doc.currentRole}`;
      doc.isCompleted = false;
    }

    await doc.save();
    res.json({ message: "Status updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// APPROVAL REPORT (PDF)
// ===============================
app.get("/api/requests/:id/approval-letter", async (req, res) => {
  try {
    const doc = await Request.findById(req.params.id);
    if (!doc) return res.status(404).send("Not found");

    // Include HOD at the beginning of the flow
    const flow = ["HOD", "IQAC", ...(doc.workflowRoles || [])];

    const rows = flow
      .map((r) => {
        const a = doc.approvals.find((x) => x.role === r);

        return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${r}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${
            a?.status === "Approved"
              ? "✔ Approved"
              : a?.status === "Recreated"
              ? "↩ Recreated"
              : "Pending"
          }</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${a ? a.comments : "-"}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${a ? new Date(a.decidedAt).toLocaleString() : "-"}</td>
        </tr>`;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
          }
          h2 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
          }
          h3 {
            color: #34495e;
            margin-top: 20px;
          }
          p {
            margin: 8px 0;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #3498db;
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          hr {
            border: 0;
            height: 1px;
            background: #ddd;
            margin: 20px 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Event Approval Report</h2>
        </div>
        
        <h3>Reference No: ${doc.referenceNo || "-"}</h3>
        <h3>Event: ${doc.eventName}</h3>
        <p><b>Staff:</b> ${doc.staffName}</p>
        <p><b>Department:</b> ${doc.department}</p>
        <p><b>Event Date:</b> ${doc.eventDate}</p>
        <p><b>Purpose:</b> ${doc.purpose}</p>
        <p><b>Status:</b> ${doc.overallStatus}</p>
        
        <hr/>
        
        <h3>Approval Timeline</h3>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Status</th>
              <th>Comments</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Generate PDF
    const file = { content: htmlContent };
    const options = { 
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    };

    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    // Check if download parameter is present
    const shouldDownload = req.query.download === 'true';

    // Set headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    
    if (shouldDownload) {
      // Force download
      res.setHeader('Content-Disposition', `attachment; filename="Approval-Report-${doc.referenceNo || doc._id}.pdf"`);
    } else {
      // View inline in browser
      res.setHeader('Content-Disposition', `inline; filename="Approval-Report-${doc.referenceNo || doc._id}.pdf"`);
    }
    
    res.send(pdfBuffer);

  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

// ===============================
// ADMIN APIs
// ===============================

// 👉 Create Staff (Admin)
app.post("/api/admin/create-staff", requireAdmin, async (req, res) => {
  try {
    const { name, email, department, password } = req.body;

    if (!name || !email || !department || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!DEPARTMENTS.includes(department)) {
      return res
        .status(400)
        .json({ error: "Invalid department. Choose a valid one." });
    }

    const existing = await Staff.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Staff with this email already exists" });
    }

    const staff = await Staff.create({ name, email, department, password });
    res.json({ message: "Staff created successfully", staff });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Get all staffs (Admin)
app.get("/api/admin/all-staff", requireAdmin, async (req, res) => {
  try {
    const staffs = await Staff.find({});
    res.json({ staffs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Update Staff (Admin)
app.put("/api/admin/update-staff/:id", requireAdmin, async (req, res) => {
  try {
    const { name, email, department, password } = req.body;

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { name, email, department, password },
      { new: true }
    );

    if (!staff) return res.status(404).json({ error: "Staff not found" });

    res.json({ message: "Staff updated", staff });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Delete Staff (Admin)
app.delete("/api/admin/delete-staff/:id", requireAdmin, async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);

    if (!staff) return res.status(404).json({ error: "Staff not found" });

    res.json({ message: "Staff deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Create HOD (Admin) - one per department
app.post("/api/admin/create-hod", requireAdmin, async (req, res) => {
  try {
    let { name, department, password } = req.body;

    if (!name || !department || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    department = department.toUpperCase();

    if (!DEPARTMENTS.includes(department)) {
      return res
        .status(400)
        .json({ error: "Invalid department. Choose a valid one." });
    }

    const existingHod = await User.findOne({ role: "HOD", department });
    if (existingHod) {
      return res
        .status(400)
        .json({ error: "HOD already exists for this department" });
    }

    const hod = await User.create({
      name,
      role: "HOD",
      password,
      department,
    });

    res.json({ message: "HOD created successfully", hod });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Get HOD by Department (Admin)
app.get("/api/admin/get-hod/:department", requireAdmin, async (req, res) => {
  try {
    const deptParam = (req.params.department || "").toUpperCase();

    const hod = await User.findOne({ role: "HOD", department: deptParam });

    res.json({ hod: hod || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Update HOD (Admin)
app.put("/api/admin/update-hod/:department", requireAdmin, async (req, res) => {
  try {
    const deptParam = (req.params.department || "").toUpperCase();
    const { name, password } = req.body;

    const update = {};
    if (name) update.name = name;
    if (password) update.password = password;

    const hod = await User.findOneAndUpdate(
      { role: "HOD", department: deptParam },
      update,
      { new: true }
    );

    if (!hod)
      return res.status(404).json({ error: "No HOD found for this department" });

    res.json({ message: "HOD updated successfully", hod });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Delete/Unassign HOD (Admin)
app.delete("/api/admin/delete-hod/:department", requireAdmin, async (req, res) => {
  try {
    const deptParam = (req.params.department || "").toUpperCase();

    const hod = await User.findOneAndDelete({
      role: "HOD",
      department: deptParam,
    });

    if (!hod) {
      return res.status(404).json({ error: "No HOD found for this department" });
    }

    res.json({ message: "HOD unassigned successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Get all requests (Admin)
app.get("/api/admin/all-requests", requireAdmin, async (req, res) => {
  try {
    const requests = await Request.find({}).sort({ createdAt: -1 });
    res.json(
      requests.map((r) => ({
        ...r.toObject(),
        reportUrl: r.reportPath || null,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Get departments list
app.get("/api/admin/departments", requireAdmin, (req, res) => {
  res.json({ departments: DEPARTMENTS });
});

// 👉 Delete request (Admin)
app.delete("/api/admin/delete-request/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedRequest = await Request.findByIdAndDelete(id);
    
    if (!deletedRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json({ message: "Request deleted successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// 👉 Delete all requests (Admin)
app.delete("/api/admin/delete-all-requests", requireAdmin, async (req, res) => {
  try {
    const result = await Request.deleteMany({});
    
    res.json({ 
      message: "All requests deleted successfully", 
      deletedCount: result.deletedCount 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// START SERVER
// ===============================
app.listen(5000, () =>
  console.log("Backend running on http://localhost:5000")
);

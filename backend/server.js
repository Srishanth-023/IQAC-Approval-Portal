// ===============================
// IMPORTS
// ===============================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const bcrypt = require("bcrypt");

const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const htmlPdf = require("html-pdf-node");
const { PDFDocument } = require("pdf-lib");
const axios = require("axios");

dotenv.config();

// MODELS
const User = require("./models/User");
const Staff = require("./models/staff");
const Request = require("./models/Request");

// APP SETUP
const app = express();
app.use(compression()); // Enable gzip compression for faster responses
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
// NORMALIZE APPROVAL FLOW ORDER
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
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(r.password, 10);
      await User.create({ ...r, password: hashedPassword });
      console.log(`Created default user for role: ${r.role}`);
    }
  }
}

// ===============================
// DEFAULT STAFF USERS (OPTIONAL) - DISABLED
// ===============================
// Commented out to prevent automatic staff creation on server start
// Staffs should be created through Admin Dashboard instead
/*
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
*/

// ===============================
// DATABASE CONNECT
// ===============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected (Atlas)");
    await createDefaultRoles();
    // await createDefaultStaffs(); // DISABLED - Create staffs through Admin Dashboard instead
    
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
      
      // Find staff by name
      const allStaff = await Staff.find({});
      const staff = allStaff.find(s => s.name.trim() === trimmedName);
      
      if (!staff) {
        return res.status(400).json({ error: "Invalid staff credentials" });
      }
      
      // Check if password is hashed (starts with $2b$ for bcrypt)
      let passwordMatch = false;
      if (staff.password.startsWith('$2b$') || staff.password.startsWith('$2a$')) {
        // Compare with bcrypt
        passwordMatch = await bcrypt.compare(trimmedPassword, staff.password);
      } else {
        // Legacy plain text comparison (for existing accounts)
        passwordMatch = staff.password.trim() === trimmedPassword;
      }
      
      if (!passwordMatch) {
        return res.status(400).json({ error: "Invalid password" });
      }

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

      // Check if password is hashed
      let passwordMatch = false;
      if (hodUser.password.startsWith('$2b$') || hodUser.password.startsWith('$2a$')) {
        passwordMatch = await bcrypt.compare(password, hodUser.password);
      } else {
        passwordMatch = hodUser.password === password;
      }

      if (!passwordMatch) {
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

    // Check if password is hashed
    let passwordMatch = false;
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plain text comparison (for existing accounts)
      passwordMatch = user.password === password;
    }

    console.log(`Login attempt for ${role}: User found - ${user.name}`);

    if (!passwordMatch)
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

    // Run staff lookup and file upload in parallel for speed
    const [staff, fileUrl] = await Promise.all([
      Staff.findById(staffId).lean(),
      req.file ? uploadToS3(req.file) : Promise.resolve(null)
    ]);

    if (!staff) return res.status(400).json({ error: "Invalid staffId" });

    // OPTIMIZED: Only fetch needed fields using projection, use lean() for speed
    // CONDITION 1: Check if same staff has created similar event before
    const staffRequests = await Request.find(
      { staffId },
      { eventName: 1, staffName: 1 }
    ).lean();
    
    for (const existingReq of staffRequests) {
      if (areTextsSimilar(existingReq.eventName, event_name, 0.7)) {
        return res.status(400).json({ 
          error: `You have already created a similar event: "${existingReq.eventName}". Please use a different event name.` 
        });
      }
    }

    // CONDITION 2: Check if any staff in same department has created similar event
    // OPTIMIZED: Only fetch needed fields
    const departmentRequests = await Request.find(
      { 
        department: staff.department,
        staffId: { $ne: staffId }
      },
      { eventName: 1, purpose: 1, staffName: 1 }
    ).lean();
    
    for (const existingReq of departmentRequests) {
      const namesSimilar = areTextsSimilar(existingReq.eventName, event_name, 0.7);
      const purposesSimilar = areTextsSimilar(existingReq.purpose, purpose, 0.6);
      
      // If event names are highly similar (exact or near-exact match)
      const namesVerySimilar = areTextsSimilar(existingReq.eventName, event_name, 0.9);
      
      // Block if: names are very similar OR (names similar AND purposes similar)
      if (namesVerySimilar || (namesSimilar && purposesSimilar)) {
        return res.status(400).json({ 
          error: `A similar event request has already been created by ${existingReq.staffName} in your department: "${existingReq.eventName}".` 
        });
      }
    }

    const newReq = await Request.create({
      staffId,
      staffName: staff.name,
      department: staff.department,
      eventName: event_name,
      eventDate: event_date,
      purpose,
      reportPath: fileUrl,
      currentRole: "HOD",
      overallStatus: "Waiting approval for HOD",
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
    // HOD will then route to the original workflow sequence
    doc.currentRole = "HOD";
    doc.overallStatus = "Waiting approval for HOD (Resubmitted)";
    doc.isCompleted = false;
    
    console.log("=== RESUBMIT DEBUG ===");
    console.log("Request Resubmitted - ID:", req.params.id);
    console.log("Resuming workflow - Going to HOD");
    console.log("Existing workflowRoles (preserved):", doc.workflowRoles);
    console.log("Reference Number (preserved):", doc.referenceNo);
    console.log("Approvals history (preserved):", doc.approvals.map(a => `${a.role}:${a.status}`));
    console.log("Total HOD approvals before resubmit:", doc.approvals.filter(a => a.role === "HOD" && a.status === "Approved").length);
    console.log("======================");
    
    await doc.save();
    
    res.json({ message: "Request resubmitted successfully", request: doc });
  } catch (e) {
    console.error("Resubmit error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// CHECK REFERENCE NUMBER UNIQUENESS (Must be before /:id routes)
// ===============================
app.get("/api/requests/check-reference/:refNumber", async (req, res) => {
  try {
    const { refNumber } = req.params;
    
    // Find any request with this reference number
    const existingRequest = await Request.findOne({ referenceNo: refNumber });
    
    if (existingRequest) {
      return res.json({
        exists: true,
        eventName: existingRequest.eventName,
        staffName: existingRequest.staffName,
      });
    }
    
    res.json({ exists: false });
  } catch (e) {
    console.error("Error checking reference number:", e);
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
    
    // Resubmit to HOD, preserve original workflow and reference number
    // The HOD will route to the original workflow sequence set by IQAC
    doc.currentRole = "HOD";
    doc.overallStatus = "Waiting approval for HOD (Resubmitted after recreation)";
    doc.isCompleted = false;
    // IMPORTANT: Keep workflowRoles and referenceNo from original IQAC approval
    // Do NOT reset them - HOD needs these to route correctly
    
    console.log("Request Re-edited - ID:", req.params.id);
    console.log("Resuming workflow - Going to HOD");
    console.log("Preserved workflowRoles:", doc.workflowRoles);
    console.log("Preserved Reference Number:", doc.referenceNo);
    
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

    // HOD special logic - always forward to IQAC
    if (role === "HOD" && action === "approve") {
      console.log("\n" + "=".repeat(80));
      console.log("HOD APPROVAL - FORWARDING TO IQAC");
      console.log("=".repeat(80));
      console.log("Request ID:", req.params.id);
      console.log("Request Name:", doc.eventName);
      console.log("Department:", doc.department);
      console.log("=".repeat(80) + "\n");
      
      // Add HOD's approval
      doc.approvals.push({
        role,
        status: "Approved",
        comments: comments || "",
        decidedAt: now,
      });
      
      // After HOD approval, always send to IQAC
      doc.currentRole = "IQAC";
      doc.overallStatus = "Waiting approval for IQAC";

      await doc.save();
      return res.json({ message: "HOD Approved, forwarded to IQAC" });
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
      // Check if reference number is already in use
      if (refNumber) {
        // Convert to uppercase for consistency
        const normalizedRefNumber = refNumber.toUpperCase().trim();
        
        const existingRef = await Request.findOne({ 
          referenceNo: normalizedRefNumber,
          _id: { $ne: req.params.id } // Exclude current request
        });
        
        if (existingRef) {
          return res.status(400).json({ 
            error: `Reference number ${normalizedRefNumber} is already assigned to event: "${existingRef.eventName}". Please use a unique reference number.` 
          });
        }
        
        doc.referenceNo = normalizedRefNumber;
      }
      
      doc.workflowRoles = normalizeFlow(flow);
      
      console.log("\n" + "=".repeat(80));
      console.log("IQAC APPROVAL - SETTING WORKFLOW");
      console.log("=".repeat(80));
      console.log("Request ID:", req.params.id);
      console.log("Reference Number:", doc.referenceNo);
      console.log("Flow received from frontend:", JSON.stringify(flow));
      console.log("Normalized workflowRoles:", JSON.stringify(doc.workflowRoles));
      console.log("workflowRoles[0]:", doc.workflowRoles[0]);
      console.log("=".repeat(80) + "\n");
      
      // After IQAC approval, move to first role in workflow (if exists)
      if (doc.workflowRoles && doc.workflowRoles.length > 0) {
        doc.currentRole = doc.workflowRoles[0];
        doc.overallStatus = `Waiting approval for ${doc.workflowRoles[0]}`;
      } else {
        // No workflow selected, mark as completed
        doc.currentRole = null;
        doc.overallStatus = "Completed";
        doc.isCompleted = true;
      }

      await doc.save();
      return res.json({ message: "IQAC Approved, forwarded to workflow" });
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
    
    console.log("Normal Flow - Current role:", role);
    console.log("Normal Flow - Workflow sequence:", seq);
    console.log("Normal Flow - Current role index in workflow:", idx);
    console.log("Normal Flow - All approvals so far:", doc.approvals.map(a => `${a.role}:${a.status}`));

    if (idx === -1) {
      // Role not found in workflow - this shouldn't happen
      console.error("ERROR: Current role not found in workflow sequence!");
      return res.status(400).json({ error: "Invalid workflow state" });
    }

    if (idx === seq.length - 1) {
      doc.currentRole = null;
      doc.overallStatus = "Completed";
      doc.isCompleted = true;
      console.log("Normal Flow - Last role in sequence, marking as completed");
    } else {
      doc.currentRole = seq[idx + 1];
      doc.overallStatus = `Waiting approval for ${doc.currentRole}`;
      doc.isCompleted = false;
      console.log("Normal Flow - Moving to next role:", doc.currentRole);
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

    // Read and convert logo to base64
    const path = require("path");
    const logoPath = path.join(__dirname, "..", "kite-logo.webp");
    let logoBase64 = "";
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/webp;base64,${logoBuffer.toString("base64")}`;
    } catch (err) {
      console.error("Logo not found:", err.message);
    }

    // Show ALL approvals in chronological order (not just unique roles)
    const rows = (doc.approvals || [])
      .map((a) => {
        return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${a.role}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${
            a.status === "Approved"
              ? "✔ Approved"
              : a.status === "Recreated"
              ? "↩ Recreated"
              : a.status || "Pending"
          }</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${a.comments || "-"}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${a.decidedAt ? new Date(a.decidedAt).toLocaleString() : "-"}</td>
        </tr>`;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            height: 100%;
          }
          body {
            font-family: Arial, sans-serif;
            color: #333;
            padding: 20px;
            position: relative;
            min-height: 100vh;
            border: 2px solid #000;
          }
          .letterhead {
            border: 2px solid #000;
            padding: 15px 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
          }
          .letterhead-logo {
            width: 80px;
            height: auto;
            margin-right: 20px;
          }
          .letterhead-content {
            flex: 1;
            text-align: center;
          }
          .letterhead h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 2px;
            color: #000;
          }
          .letterhead h2 {
            font-size: 14px;
            font-weight: normal;
            margin-bottom: 8px;
            color: #000;
          }
          .letterhead h3 {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 2px;
            color: #000;
          }
          .letterhead h4 {
            font-size: 14px;
            font-weight: bold;
            color: #000;
          }
          .content-section {
            margin: 30px 20px;
          }
          h3 {
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 16px;
          }
          .info-grid {
            margin: 15px 0;
          }
          p {
            margin: 8px 0;
            line-height: 1.6;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #3498db;
            color: white;
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
            font-size: 13px;
          }
          td {
            padding: 8px;
            border: 1px solid #ddd;
            font-size: 12px;
          }
          hr {
            border: 0;
            height: 1px;
            background: #ddd;
            margin: 20px 0;
          }
          .footer {
            text-align: right;
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 11px;
            color: #666;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="letterhead">
          ${logoBase64 ? `<img src="${logoBase64}" class="letterhead-logo" alt="KITE Logo" />` : ''}
          <div class="letterhead-content">
            <h1>KGISL INSTITUTE OF TECHNOLOGY,</h1>
            <h2>COIMBATORE -35, TN, INDIA</h2>
            <h3>ACADEMIC - FORMS</h3>
            <h4>EVENT APPROVAL REPORT</h4>
          </div>
        </div>
        
        <div class="content-section">
          <h3>Reference No: ${doc.referenceNo || "-"}</h3>
          <h3>Event: ${doc.eventName}</h3>
          
          <div class="info-grid">
            <p><b>Staff:</b> ${doc.staffName}</p>
            <p><b>Department:</b> ${doc.department}</p>
            <p><b>Event Date:</b> ${doc.eventDate}</p>
            <p><b>Purpose:</b> ${doc.purpose}</p>
            <p><b>Status:</b> ${doc.overallStatus}</p>
          </div>
          
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
          
          <div class="footer">
            Powered by IPS Tech Community
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate approval letter PDF
    const file = { content: htmlContent };
    const options = { 
      format: 'A4',
      margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' }
    };

    const approvalLetterBuffer = await htmlPdf.generatePdf(file, options);

    console.log(`Generated approval letter: ${approvalLetterBuffer.length} bytes`);

    // Merge with original uploaded PDF if it exists
    let finalPdfBuffer = approvalLetterBuffer;
    
    if (doc.reportPath) {
      try {
        console.log("\n=== PDF MERGE STARTING ===");
        console.log("Original report key:", doc.reportPath);
        console.log("Request ID:", doc._id);
        console.log("Reference No:", doc.referenceNo);
        
        // Get the key - reportPath is already just the key (e.g., "reports/12345_file.pdf")
        const key = doc.reportPath;
        
        // Generate signed URL to download the original PDF
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: key,
        });
        
        console.log("Generating S3 signed URL...");
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
        console.log("Signed URL generated successfully");
        
        console.log("Downloading original PDF from S3...");
        
        // Download the original PDF with better error handling
        const response = await axios.get(signedUrl, {
          responseType: 'arraybuffer',
          maxContentLength: 50 * 1024 * 1024, // 50MB max
          timeout: 30000 // 30 second timeout
        });
        
        if (!response.data || response.data.byteLength === 0) {
          throw new Error("Downloaded PDF is empty");
        }
        
        const originalPdfBuffer = Buffer.from(response.data);
        
        console.log(`Downloaded original PDF: ${originalPdfBuffer.length} bytes`);
        
        // Merge PDFs using pdf-lib
        console.log("Creating merged PDF document...");
        const mergedPdf = await PDFDocument.create();
        
        // Load and add approval letter PDF pages first
        console.log("Loading approval letter PDF...");
        const approvalPdf = await PDFDocument.load(approvalLetterBuffer);
        console.log(`Approval PDF has ${approvalPdf.getPageCount()} pages`);
        
        const approvalPages = await mergedPdf.copyPages(approvalPdf, approvalPdf.getPageIndices());
        for (const page of approvalPages) {
          mergedPdf.addPage(page);
        }
        console.log(`✓ Added ${approvalPages.length} approval letter pages`);
        
        // Load and append original report PDF pages
        console.log("Loading original report PDF...");
        const originalPdf = await PDFDocument.load(originalPdfBuffer);
        console.log(`Original PDF has ${originalPdf.getPageCount()} pages`);
        
        const originalPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices());
        for (const page of originalPages) {
          mergedPdf.addPage(page);
        }
        console.log(`✓ Added ${originalPages.length} original report pages`);
        
        // Save merged PDF
        console.log("Saving merged PDF...");
        const mergedPdfBytes = await mergedPdf.save();
        finalPdfBuffer = Buffer.from(mergedPdfBytes);
        
        console.log(`✓ Merged PDF created: ${finalPdfBuffer.length} bytes`);
        console.log(`Total pages in merged PDF: ${mergedPdf.getPageCount()}`);
        console.log("=== PDF MERGE SUCCESS ===\n");
      } catch (mergeError) {
        console.error("\n=== PDF MERGE ERROR ===");
        console.error("Error type:", mergeError.name);
        console.error("Error message:", mergeError.message);
        console.error("Stack trace:", mergeError.stack);
        console.error("Falling back to approval letter only");
        console.error("=== END ERROR ===\n");
        // If merge fails, just send the approval letter
        finalPdfBuffer = approvalLetterBuffer;
      }
    } else {
      console.log("⚠ No original report found (reportPath is null/empty) - sending approval letter only");
    }

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
    
    res.send(finalPdfBuffer);

  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

// ===============================
// ADMIN APIs
// ===============================

//  Create Staff (Admin)
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

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await Staff.create({ name, email, department, password: hashedPassword });
    
    // Return staff info without exposing hashed password
    res.json({ 
      message: "Staff created successfully", 
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        department: staff.department
      }
    });
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

//  Update Staff (Admin)
app.put("/api/admin/update-staff/:id", requireAdmin, async (req, res) => {
  try {
    const { name, email, department, password } = req.body;

    const updateData = { name, email, department };
    
    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!staff) return res.status(404).json({ error: "Staff not found" });

    res.json({ 
      message: "Staff updated", 
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        department: staff.department
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

//  Delete Staff (Admin)
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

//  Reset Staff Password (Admin)
app.post("/api/admin/reset-staff-password/:id", requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ error: "New password is required" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    );

    if (!staff) return res.status(404).json({ error: "Staff not found" });

    res.json({ message: "Staff password reset successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

//  Reset HOD Password (Admin)
app.post("/api/admin/reset-hod-password/:department", requireAdmin, async (req, res) => {
  try {
    const deptParam = (req.params.department || "").toUpperCase();
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ error: "New password is required" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const hod = await User.findOneAndUpdate(
      { role: "HOD", department: deptParam },
      { password: hashedPassword },
      { new: true }
    );

    if (!hod) return res.status(404).json({ error: "HOD not found for this department" });

    res.json({ message: "HOD password reset successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

//  Create HOD (Admin) - one per department
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

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const hod = await User.create({
      name,
      role: "HOD",
      password: hashedPassword,
      department,
    });

    res.json({ 
      message: "HOD created successfully", 
      hod: {
        _id: hod._id,
        name: hod.name,
        role: hod.role,
        department: hod.department
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

//  Get HOD by Department (Admin)
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

//  Update HOD (Admin)
app.put("/api/admin/update-hod/:department", requireAdmin, async (req, res) => {
  try {
    const deptParam = (req.params.department || "").toUpperCase();
    const { name, password } = req.body;

    const update = {};
    if (name) update.name = name;
    
    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      update.password = await bcrypt.hash(password, 10);
    }

    const hod = await User.findOneAndUpdate(
      { role: "HOD", department: deptParam },
      update,
      { new: true }
    );

    if (!hod)
      return res.status(404).json({ error: "No HOD found for this department" });

    res.json({ 
      message: "HOD updated successfully", 
      hod: {
        _id: hod._id,
        name: hod.name,
        role: hod.role,
        department: hod.department
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

//  Delete/Unassign HOD (Admin)
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

//  Get all requests (Admin)
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

//  Get departments list
app.get("/api/admin/departments", requireAdmin, (req, res) => {
  res.json({ departments: DEPARTMENTS });
});

//  Delete request (Admin)
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

//  Delete all requests (Admin)
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

//  Hash all existing plain text passwords (Admin - One-time migration)
app.post("/api/admin/hash-all-passwords", requireAdmin, async (req, res) => {
  try {
    let hashedCount = 0;
    
    // Hash all User passwords (HOD, PRINCIPAL, DIRECTOR, AO, CEO, ADMIN, IQAC)
    const users = await User.find({});
    for (const user of users) {
      // Check if password is already hashed
      if (!user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await User.updateOne({ _id: user._id }, { password: hashedPassword });
        console.log(`Hashed password for ${user.role}: ${user.name}`);
        hashedCount++;
      }
    }
    
    // Hash all Staff passwords
    const staffs = await Staff.find({});
    for (const staff of staffs) {
      // Check if password is already hashed
      if (!staff.password.startsWith('$2b$') && !staff.password.startsWith('$2a$')) {
        const hashedPassword = await bcrypt.hash(staff.password, 10);
        await Staff.updateOne({ _id: staff._id }, { password: hashedPassword });
        console.log(`Hashed password for staff: ${staff.name}`);
        hashedCount++;
      }
    }
    
    res.json({ 
      message: "All passwords hashed successfully", 
      hashedCount 
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

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

dotenv.config();

// MODELS
const User = require("./models/User");
const Staff = require("./models/staff");
const Request = require("./models/Request");

// APP SETUP
const app = express();
app.use(express.json());
app.use(cors());

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
  
  // URL valid for 1 hour (3600 seconds)
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return signedUrl;
}

// ===============================
// NORMALIZE APPROVAL FLOW ORDER
// ===============================
function normalizeFlow(arr) {
  const order = ["HOD", "PRINCIPAL", "DIRECTOR", "AO", "CEO"];
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
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

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
      const staff = await Staff.findOne({ name, password });
      if (!staff)
        return res.status(400).json({ error: "Invalid staff credentials" });

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

    const requests = await Request.find(filter).sort({ createdAt: -1 });
    console.log("Found requests:", requests.length);

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
// REQUEST ACTION (APPROVE/RECREATE)
// ===============================
app.post("/api/requests/:id/action", async (req, res) => {
  try {
    const { action, comments, refNumber, flow } = req.body;

    const doc = await Request.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Invalid Request ID" });

    const role = doc.currentRole;
    const now = new Date();

    doc.approvals.push({
      role,
      status: action === "approve" ? "Approved" : "Recreated",
      comments: comments || "",
      decidedAt: now,
    });

    // HOD special logic - after HOD approves, move to IQAC
    if (role === "HOD" && action === "approve") {
      doc.currentRole = "IQAC";
      doc.overallStatus = "Waiting approval for IQAC";

      await doc.save();
      return res.json({ message: "HOD Approved, forwarded to IQAC" });
    }

    // IQAC special logic
    if (role === "IQAC" && action === "approve") {
      doc.referenceNo = refNumber;
      doc.workflowRoles = normalizeFlow(flow);
      doc.currentRole = doc.workflowRoles[0] || null;

      doc.overallStatus = doc.currentRole
        ? `Waiting approval for ${doc.currentRole}`
        : "Completed";

      if (!doc.currentRole) doc.isCompleted = true;

      await doc.save();
      return res.json({ message: "IQAC Approved" });
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
// APPROVAL REPORT
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
          <td>${r}</td>
          <td>${
            a?.status === "Approved"
              ? "✔"
              : a?.status === "Recreated"
              ? "↩"
              : "Pending"
          }</td>
          <td>${a ? a.comments : "-"}</td>
          <td>${a ? new Date(a.decidedAt).toLocaleString() : "-"}</td>
        </tr>`;
      })
      .join("");

    res.send(`
      <html>
      <body>
        <h2>Approval Report</h2>
        <h3>Reference No: ${doc.referenceNo || "-"}</h3>
        <h3>Event: ${doc.eventName}</h3>
        <p><b>Staff:</b> ${doc.staffName}</p>
        <p><b>Department:</b> ${doc.department}</p>
        <p><b>Event Date:</b> ${doc.eventDate}</p>
        <p><b>Purpose:</b> ${doc.purpose}</p>
        <hr/>
        
        <table border="1" cellpadding="7" cellspacing="0">
          <tr>
            <th>Role</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Date & Time</th>
          </tr>
          ${rows}
        </table>

      </body>
      </html>
    `);
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

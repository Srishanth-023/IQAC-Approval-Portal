# IQAC Approval Portal

A comprehensive event approval workflow management system built with the MERN stack (MongoDB, Express, React, Node.js) and AWS S3 for file storage.

## Overview

The IQAC Approval Portal streamlines the event approval process across multiple hierarchical levels. Staff members can submit event requests that flow through various approval stages including HOD, IQAC, Principal, Director, AO, and CEO based on the workflow configuration.

### Supported Departments
AI&DS, CSE, ECE, IT, MECH, AI&ML, CYS, R&A, CSBS, S&H

## Features

### For Staff
- Create event requests with PDF reports
- Edit and resubmit requests after recreation
- Track request status in real-time
- Download approval reports
- Duplicate event detection (prevents similar events)
- View rejection/recreation details and remarks

### For IQAC
- Approve or request recreation of events
- Assign unique alphanumeric reference numbers (8 characters)
- Configure approval workflow (select roles: Principal, Director, AO, CEO)
- Real-time duplicate reference number warnings
- Generate approval reports

### For HOD (Head of Department)
- Approve or request recreation of departmental events
- View only events from their department
- Filter events by name
- View previous remarks and approval history

### For Approvers (Principal, Director, AO, CEO)
- Approve or request recreation of events
- Filter by department and event name
- Add comments for approvals/recreations
- View complete approval timeline
- View all previous remarks

### For Admin
- Manage staff accounts (create, update, delete)
- Manage HODs (assign, update, delete, reset passwords)
- Manage all role accounts (IQAC, Principal, Director, AO, CEO)
- Reset passwords for all role-based users
- View all requests across departments
- Filter requests by department and event name
- Delete individual or all requests
- Monitor system-wide activity
- Department-wise HOD configuration

## Architecture

### Tech Stack
- **Frontend**: React.js (v18.3.1), React Router (v7.1.1), Bootstrap 5, React Toastify, React Icons
- **Backend**: Node.js, Express.js (v4.19.2)
- **Database**: MongoDB Atlas (Mongoose v8.3.2)
- **File Storage**: AWS S3 (SDK v3)
- **PDF Generation**: html-pdf-node, pdf-lib
- **Authentication**: bcrypt (v6.0.0)
- **Additional**: Compression, CORS, Multer

### Project Structure
```
IQAC-Approval-Portal/
├── backend/
│   ├── models/
│   │   ├── Request.js      # Event request schema
│   │   ├── Staff.js        # Staff user schema
│   │   └── User.js         # Role user schema
│   ├── server.js           # Main backend server
│   ├── package.json
│   ├── README.md
│   └── .env               # Environment variables (gitignored)
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── components/
│   │   │   ├── cards/
│   │   │   │   ├── ApprovalHistoryCard.js
│   │   │   │   ├── ApprovalLetter.js
│   │   │   │   ├── FinalApprovalLetterPreview.js
│   │   │   │   ├── RoleRow.js
│   │   │   │   └── index.js
│   │   │   ├── common/
│   │   │   │   ├── IQACWorkflowSummary.js
│   │   │   │   ├── ProtectedRoute.js
│   │   │   │   ├── WorkflowTimeline.js
│   │   │   │   └── index.js
│   │   │   ├── hooks/
│   │   │   │   ├── useDisableBack.js
│   │   │   │   └── index.js
│   │   │   ├── modals/
│   │   │   │   ├── ActionPopup.js
│   │   │   │   ├── CreateRequestPopup.js
│   │   │   │   ├── RequestDetailModal.js
│   │   │   │   ├── SharedModal.js
│   │   │   │   └── index.js
│   │   │   ├── pages/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── AddHod.js
│   │   │   │   │   ├── AddStaff.js
│   │   │   │   │   ├── AdminAllRequests.js
│   │   │   │   │   ├── AdminDashboard.js
│   │   │   │   │   └── index.js
│   │   │   │   ├── auth/
│   │   │   │   │   ├── AdminLogin.js
│   │   │   │   │   ├── Login.js
│   │   │   │   │   ├── Login.css
│   │   │   │   │   └── index.js
│   │   │   │   ├── role/
│   │   │   │   │   ├── IQACHome.js
│   │   │   │   │   ├── PrincipalRequests.js
│   │   │   │   │   ├── RoleDashboard.js
│   │   │   │   │   ├── RoleRequestHistory.js
│   │   │   │   │   └── index.js
│   │   │   │   ├── staff/
│   │   │   │   │   ├── AllRequests.js
│   │   │   │   │   ├── StaffHome.js
│   │   │   │   │   └── index.js
│   │   │   │   ├── TrackEventRequests.js
│   │   │   │   └── index.js
│   │   │   └── index.js
│   │   ├── styles/
│   │   │   └── Dashboard.css
│   │   ├── assets/          # Static assets
│   │   ├── api.js          # API service layer
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── README.md
│   └── .env               # Environment variables (gitignored)
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB Atlas account
- AWS Account (for S3 bucket)

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

#### Backend `.env`
```env
MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name
```

#### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000
```

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd IQAC-Approval-Portal
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install --legacy-peer-deps
```

**Note**: If you encounter issues with `react-scripts`, you may need to:
```bash
npm install react-scripts@5.0.1 --save --legacy-peer-deps
# OR
npm install -g react-scripts
```

For ESLint configuration issues:
```bash
npm install eslint-config-react-app --legacy-peer-deps
```

On Windows PowerShell, to disable ESLint plugin:
```powershell
Set-Content -Path ".env" -Value "DISABLE_ESLINT_PLUGIN=true"
```

### Running the Application

#### Option 1: Run separately

**Backend (Terminal 1):**
```bash
cd backend
node server.js
```

**Frontend (Terminal 2):**
```bash
cd frontend
react-scripts start
```

#### Option 2: Run with concurrent servers (Recommended)
```bash
cd frontend
npm start
```
*(The frontend package.json is configured to run both frontend and backend servers concurrently using the `concurrently` package)*

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000


#### Staff Users
Staff accounts must be created through the Admin Dashboard.

## Approval Workflow

1. **Staff** submits event request → Sent to **HOD**
2. **HOD** approves → Sent to **IQAC**
3. **IQAC** assigns reference number and selects workflow → Sent to first selected role (e.g., Principal)
4. **Higher Authorities** (Principal/Director/AO/CEO) approve sequentially
5. **Request Completed** → Approval report generated

### Recreation Flow
- Any authority can request recreation with comments
- Request goes back to Staff with recreation status
- Staff edits and resubmits
- Request resumes from HOD → IQAC → Returns to the authority who requested recreation
- Continues through remaining workflow

## Key Features in Detail

### Auto-Escalation System
- Automatic request escalation after timeout (configurable, default: 1 minute for testing)
- Prevents workflow bottlenecks
- IQAC role is exempt from auto-escalation (mandatory review)
- Locked-out roles system prevents repeated recreations

### Tracking System
- **In Progress**: Requests currently pending or approved by the authority
- **Approved**: Requests approved by the authority
- **Recreated by Own**: Requests recreated by the authority themselves
- **Recreated by Others**: Requests recreated by other authorities after this authority's approval
- **Fully Completed**: Requests approved by all authorities in the workflow

### Duplicate Detection
- **Same Staff**: Prevents creating events with 70%+ similar names
- **Department-wide**: Prevents similar events (90%+ name similarity OR 70%+ name + 60%+ purpose similarity)
- Custom modal alerts with suggestions

### Reference Number System
- 8-character alphanumeric codes (e.g., IQAC2025, AB123456)
- Automatic uppercase conversion
- Real-time uniqueness validation
- Duplicate warning before approval

### Filtering
- **Admin Dashboard**: Filter by department and event name
- **Role Dashboards**: Filter by department (except HOD) and event name
- **HOD Dashboard**: Filter by event name only (department-specific)

### File Management
- PDF-only uploads (max 10MB)
- AWS S3 storage with presigned URLs
- Automatic file validation
- Secure temporary file handling

### Approval Reports
- Complete approval timeline
- Shows all approvals including recreations
- Chronological order with timestamps
- PDF generation with inline viewing or download

## Security Features

- Role-based access control (RBAC)
- Password hashing with bcrypt
- Environment variable protection (.env gitignored)
- Secure file upload validation (PDF only, max 10MB)
- MongoDB injection prevention
- CORS configuration
- AWS S3 presigned URLs for secure file access
- Request validation and sanitization

## Troubleshooting

### Port Already in Use
```bash
# Windows - Kill process on port 5000
Get-Process -Name node | Stop-Process -Force

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### MongoDB Connection Issues
- Verify MongoDB Atlas IP whitelist includes your IP
- Check connection string format
- Ensure network access is configured

### AWS S3 Upload Issues
- Verify AWS credentials in .env
- Check S3 bucket permissions
- Ensure bucket region matches configuration
- Verify IAM user has necessary S3 permissions (PutObject, GetObject)

### Debug Mode
The backend has minimal console logging by default. Only the following messages are shown:
- `Backend running on http://localhost:5000`
- `MongoDB Connected (Atlas)`

All other debug logs are commented out for cleaner terminal output.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User/Staff login
- `POST /api/auth/admin-login` - Admin login

### Requests
- `POST /api/requests` - Create event request
- `GET /api/requests` - Get requests (filtered by role/staff)
- `GET /api/requests/:id` - Get single request
- `PUT /api/requests/:id` - Edit request (staff only)
- `PUT /api/requests/:id/resubmit` - Resubmit after recreation
- `POST /api/requests/:id/action` - Approve/Recreate
- `GET /api/requests/check-reference/:refNumber` - Check reference uniqueness
- `GET /api/requests/:id/approval-letter` - Generate approval PDF
- `GET /api/requests/track` - Track requests by status categories
- `GET /api/requests/history/:staffId` - Get request history for staff

### Staff Management
- `POST /api/staff/create` - Create staff account (admin)
- `POST /api/staff/login` - Staff login
- `GET /api/staff/all` - Get all staff (admin)
- `PUT /api/staff/:id` - Update staff (admin)
- `DELETE /api/staff/:id` - Delete staff (admin)

### HOD Management
- `POST /api/admin/hod/create` - Create HOD
- `PUT /api/admin/hod/:department` - Update HOD
- `GET /api/admin/hod/:department` - Get HOD by department
- `PUT /api/admin/hod/:department/reset-password` - Reset HOD password
- `GET /api/admin/departments` - Get all departments

### Role Management (IQAC, Principal, Director, AO, CEO)
- `POST /api/admin/:role/create` - Create role user
- `GET /api/admin/:role` - Get role user details
- `PUT /api/admin/:role/reset-password` - Reset role password

### Admin
- `GET /api/admin/all-requests` - Get all requests
- `DELETE /api/admin/delete-request/:id` - Delete request
- `DELETE /api/admin/delete-all-requests` - Delete all requests

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Team

Developed for IQAC event approval workflow management.

## Support

For issues and questions:
- Create an issue in the repository
- Contact the development team

---

**Note**: Make sure to configure AWS S3, MongoDB Atlas, and all environment variables before running the application.
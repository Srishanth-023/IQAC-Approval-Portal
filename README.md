# IQAC Approval Portal

A comprehensive event approval workflow management system built with the MERN stack (MongoDB, Express, React, Node.js) and AWS S3 for file storage.

## Overview

The IQAC Approval Portal streamlines the event approval process across multiple hierarchical levels. Staff members can submit event requests that flow through various approval stages including HOD, IQAC, Principal, Director, AO, and CEO based on the workflow configuration.

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
- Manage HODs (assign, update, delete)
- View all requests across departments
- Filter requests by department and event name
- Delete individual or all requests
- Monitor system-wide activity

## Architecture

### Tech Stack
- **Frontend**: React.js, React Router, Bootstrap 5, React Toastify
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **File Storage**: AWS S3
- **PDF Generation**: html-pdf-node

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
│   └── .env               # Environment variables (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.js
│   │   │   ├── AdminAllRequests.js
│   │   │   ├── AddStaff.js
│   │   │   ├── AddHod.js
│   │   │   ├── StaffHome.js
│   │   │   ├── IQACHome.js
│   │   │   ├── RoleDashboard.js
│   │   │   └── ... (other components)
│   │   ├── api.js          # API service layer
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env               # Environment variables (gitignored)
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
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
npm install react-scripts --legacy-peer-deps
npm install react-scripts@5.0.1 --save --legacy-peer-deps (or) npm install -g react-scripts
npm install eslint-config-react-app --legacy-peer-deps
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

#### Option 2: Run frontend with concurrent servers
```bash
cd frontend
react-scripts start
```
*(The frontend package.json is configured to run both servers concurrently)*

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

- Role-based access control
- Environment variable protection (.env gitignored)
- Secure file upload validation
- MongoDB injection prevention
- CORS configuration

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

## API Endpoints

### Authentication
- `POST /api/auth/login` - User/Staff login

### Requests
- `POST /api/requests` - Create event request
- `GET /api/requests` - Get requests (filtered by role/staff)
- `GET /api/requests/:id` - Get single request
- `PUT /api/requests/:id/resubmit` - Resubmit after recreation
- `POST /api/requests/:id/action` - Approve/Recreate
- `GET /api/requests/check-reference/:refNumber` - Check reference uniqueness
- `GET /api/requests/:id/approval-letter` - Generate approval PDF

### Admin
- `POST /api/admin/create-staff` - Create staff account
- `POST /api/admin/create-hod` - Assign HOD
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
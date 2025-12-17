import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  adminGetAllStaff, 
  adminDeleteStaff,
  adminGetDepartments,
  adminGetHodByDepartment,
  adminDeleteHod 
} from "../api";
import { toast } from "react-toastify";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user.role;

  const [staffList, setStaffList] = useState([]);
  const [hodList, setHodList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingHod, setLoadingHod] = useState(true);

  useEffect(() => {
    loadStaffs();
    loadHods();

    // Refresh data when returning to this page
    const handleFocus = () => {
      loadStaffs();
      loadHods();
    };

    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const loadStaffs = async () => {
    setLoadingStaff(true);
    try {
      const res = await adminGetAllStaff(role);
      setStaffList(res.data.staffs);
    } catch {
      toast.error("Failed to load staff list");
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadHods = async () => {
    setLoadingHod(true);
    try {
      const depRes = await adminGetDepartments(role);
      const deps = depRes.data.departments || [];

      const results = await Promise.all(
        deps.map(async (dept) => {
          try {
            const res = await adminGetHodByDepartment(dept, role);
            return { department: dept, hod: res.data.hod || null };
          } catch (e) {
            return { department: dept, hod: null };
          }
        })
      );

      setHodList(results);
    } catch {
      toast.error("Failed to load HOD list");
    } finally {
      setLoadingHod(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff?")) return;
    try {
      await adminDeleteStaff(id, role);
      toast.success("Staff Deleted");
      loadStaffs();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleEdit = (staff) => {
    navigate("/admin/add-staff", { state: { editStaff: staff } });
  };

  const handleEditHod = (department) => {
    navigate("/admin/add-hod", { state: { department } });
  };

  const handleUnassignHod = async (department) => {
    if (!window.confirm(`Are you sure you want to unassign the HOD for ${department}? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminDeleteHod(department, role);
      toast.success(`HOD for ${department} unassigned successfully`);
      loadHods();
    } catch (err) {
      toast.error("Failed to unassign HOD");
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-wrapper">
        {/* HEADER */}
        <div className="dashboard-header fade-in">
          <div className="dashboard-header-accent"></div>
          <div className="dashboard-header-content">
            <div className="dashboard-header-left">
              <div className="dashboard-logo-box">
                <img src={logo} alt="KITE Logo" className="dashboard-logo" />
              </div>
              <div className="dashboard-title-section">
                <h1>Admin Dashboard</h1>
                <p>IQAC Approval Portal Management</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <div className="dashboard-user-info">
                <div className="dashboard-user-name">Welcome, {user?.name}</div>
                <div className="dashboard-user-role">Administrator</div>
              </div>
              <button className="btn-logout" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ACTION CARDS */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="action-card fade-in" onClick={() => navigate("/admin/add-staff")}>
              <div className="action-card-icon">👤</div>
              <h4>Add Staff</h4>
              <p>Create new staff accounts</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="action-card fade-in" onClick={() => navigate("/admin/add-hod")}>
              <div className="action-card-icon">👨‍💼</div>
              <h4>Add HOD</h4>
              <p>Assign HOD for each department</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="action-card fade-in" onClick={() => navigate("/admin/all-requests")}>
              <div className="action-card-icon">📋</div>
              <h4>All Requests</h4>
              <p>View every request submitted by staff</p>
            </div>
          </div>
        </div>

        {/* ALL HODs TABLE */}
        <div className="dashboard-card mb-4 fade-in">
          <div className="dashboard-card-header">
            <h4>👨‍💼 All HODs</h4>
            <p>Department head assignments</p>
          </div>
          <div className="dashboard-card-body">
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>HOD Name</th>
                    <th>Password</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hodList.map((h) => (
                    <tr key={h.department}>
                      <td><strong>{h.department}</strong></td>
                      <td>{h.hod ? h.hod.name : "—"}</td>
                      <td>{h.hod ? h.hod.password : "—"}</td>
                      <td>
                        {h.hod ? (
                          <span className="badge-custom badge-approved">Assigned</span>
                        ) : (
                          <span className="badge-custom badge-rejected">Not Assigned</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-warning-custom btn-sm-custom me-2"
                          onClick={() => handleEditHod(h.department)}
                        >
                          {h.hod ? "Edit" : "Assign"}
                        </button>
                        {h.hod && (
                          <button
                            className="btn-danger-custom btn-sm-custom"
                            onClick={() => handleUnassignHod(h.department)}
                          >
                            Unassign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ALL STAFFS TABLE */}
        <div className="dashboard-card fade-in">
          <div className="dashboard-card-header">
            <h4>👥 All Staff Members</h4>
            <p>Registered staff accounts</p>
          </div>
          <div className="dashboard-card-body">
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Password</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        <div className="empty-state">
                          <div className="empty-state-icon">👥</div>
                          <h4>No staff members yet</h4>
                          <p>Add your first staff member to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    staffList.map((s) => (
                      <tr key={s._id}>
                        <td><strong>{s.name}</strong></td>
                        <td>{s.email}</td>
                        <td><span className="badge-custom badge-processing">{s.department}</span></td>
                        <td>{s.password}</td>
                        <td>
                          <button
                            className="btn-warning-custom btn-sm-custom me-2"
                            onClick={() => handleEdit(s)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-danger-custom btn-sm-custom"
                            onClick={() => handleDelete(s._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="dashboard-footer fade-in">
          <div className="dashboard-footer-content">
            <div className="dashboard-footer-brand">
              <span>IQAC Approval Portal</span>
            </div>
            <div className="dashboard-footer-text">
              © 2025 KGiSL Institute of Technology. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

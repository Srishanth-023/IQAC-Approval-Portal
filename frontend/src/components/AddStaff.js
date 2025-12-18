import React, { useEffect, useState } from "react";
import {
  adminCreateStaff,
  adminGetAllStaff,
  adminUpdateStaff,
  adminDeleteStaff,
  adminGetDepartments,
} from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';
import { BsPencilSquare, BsPlusCircle, BsLightbulb, BsPeople, BsArrowLeft, BsTrash } from "react-icons/bs";

export default function StaffManagement() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user.role;

  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // Load departments + staff list
  useEffect(() => {
    loadDepartments();
    loadStaffs();
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await adminGetDepartments(role);
      setDepartments(res.data.departments);
    } catch {
      toast.error("Failed to load departments");
    }
  };

  const loadStaffs = async () => {
    try {
      const res = await adminGetAllStaff(role);
      setStaffList(res.data.staffs);
    } catch {
      toast.error("Failed to load staff list");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // CREATE OR UPDATE STAFF
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editMode) {
        await adminUpdateStaff(editId, form, role);
        toast.success("Staff Updated Successfully");
      } else {
        await adminCreateStaff(form, role);
        toast.success("Staff Created Successfully");
      }

      setForm({ name: "", email: "", department: "", password: "" });
      setEditMode(false);
      setEditId(null);
      loadStaffs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error");
    }
  };

  // DELETE STAFF
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await adminDeleteStaff(id, role);
      toast.success("Staff Deleted");
      loadStaffs();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // LOAD STAFF DATA TO EDIT
  const handleEdit = (staff) => {
    setForm(staff);
    setEditId(staff._id);
    setEditMode(true);
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
                <h1>Staff Management</h1>
                <p>Add, edit, and manage staff accounts</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <button 
                className="btn-secondary-custom" 
                onClick={() => navigate("/admin/dashboard")}
              >
                <BsArrowLeft style={{ marginRight: '0.5rem' }} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* ADD/EDIT STAFF FORM */}
        <div className="dashboard-card mb-4 fade-in">
          <div className="dashboard-card-header">
            <h4>{editMode ? <><BsPencilSquare style={{ marginRight: '0.5rem' }} /> Edit Staff</> : <><BsPlusCircle style={{ marginRight: '0.5rem' }} /> Add New Staff</>}</h4>
            <p>{editMode ? "Update staff information" : "Create a new staff account"}</p>
          </div>
          <div className="dashboard-card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                {/* Left Column */}
                <div>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Name</label>
                    <input
                      type="text"
                      className="form-input-custom"
                      placeholder="Enter staff name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Email</label>
                    <input
                      type="email"
                      className="form-input-custom"
                      placeholder="Enter email address"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Department</label>
                    <select
                      className="form-input-custom"
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Password</label>
                    {!editMode ? (
                      <input
                        type="text"
                        className="form-input-custom"
                        placeholder="Enter password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                      />
                    ) : (
                      <div className="alert-custom alert-info" style={{ margin: '0.5rem 0' }}>
                        <small><BsLightbulb style={{ marginRight: '0.25rem' }} /> To change password, use "Reset Password" button from the Admin Dashboard.</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn-primary-custom btn-sm-custom" type="submit">
                  {editMode ? "Update Staff" : "Create Staff"}
                </button>
                {editMode && (
                  <button 
                    type="button"
                    className="btn-secondary-custom btn-sm-custom"
                    onClick={() => {
                      setForm({ name: "", email: "", department: "", password: "" });
                      setEditMode(false);
                      setEditId(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* STAFF TABLE */}
        <div className="dashboard-card fade-in">
          <div className="dashboard-card-header">
            <h4><BsPeople style={{ marginRight: '0.5rem' }} /> All Staff Members</h4>
            <p>Manage existing staff accounts</p>
          </div>
          <div className="dashboard-card-body">
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    {/*<th>Password</th>*/}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-state">
                          <div className="empty-state-icon"><BsPeople size={48} /></div>
                          <h4>No staff members yet</h4>
                          <p>Add your first staff member using the form above</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    staffList.map((s) => (
                      <tr key={s._id}>
                        <td><strong>{s.name}</strong></td>
                        <td>{s.email}</td>
                        <td><span className="badge-custom badge-processing">{s.department}</span></td>
                        {/*<td>{s.password}</td>*/}
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

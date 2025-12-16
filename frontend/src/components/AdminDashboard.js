import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  adminGetAllStaff, 
  adminDeleteStaff,
  adminGetDepartments,
  adminGetHodByDepartment 
} from "../api";
import { toast } from "react-toastify";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user.role;

  const [staffList, setStaffList] = useState([]);
  const [hodList, setHodList] = useState([]);

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
    try {
      const res = await adminGetAllStaff(role);
      setStaffList(res.data.staffs);
    } catch {
      toast.error("Failed to load staff list");
    }
  };

  const loadHods = async () => {
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

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/admin-login");
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Admin Dashboard</h2>

      <div className="text-end mb-3">
        <span className="me-3 fw-bold text-primary">Welcome, {user?.name}</span>
        <button className="btn btn-danger btn-sm" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="row g-4 justify-content-center">

        {/* Add Staff */}
        <div className="col-md-4">
          <div
            className="card shadow text-center p-4"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/admin/add-staff")}
          >
            <h4>Add Staff</h4>
            <p className="text-muted">Create new staff accounts</p>
          </div>
        </div>

        {/* Add HOD */}
        <div className="col-md-4">
          <div
            className="card shadow text-center p-4"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/admin/add-hod")}
          >
            <h4>Add HOD</h4>
            <p className="text-muted">Assign HOD for each department</p>
          </div>
        </div>

        {/* All Requests */}
        <div className="col-md-4">
          <div
            className="card shadow text-center p-4"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/admin/all-requests")}
          >
            <h4>All Requests</h4>
            <p className="text-muted">View every request submitted by staff</p>
          </div>
        </div>

      </div>

      {/* ALL STAFFS TABLE */}
      <div className="card shadow p-4 mt-5">
        <h5>All Staffs</h5>
        <table className="table table-bordered table-striped mt-3">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Password</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {staffList.map((s) => (
              <tr key={s._id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.department}</td>
                <td>{s.password}</td>
                <td>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => handleEdit(s)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(s._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ALL HODs TABLE */}
      <div className="card shadow p-4 mt-4">
        <h5>All HODs</h5>
        <table className="table table-bordered table-striped mt-3">
          <thead className="table-dark">
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
                <td>{h.department}</td>
                <td>{h.hod ? h.hod.name : "—"}</td>
                <td>{h.hod ? h.hod.password : "—"}</td>
                <td>
                  {h.hod ? (
                    <span className="badge bg-success">Assigned</span>
                  ) : (
                    <span className="badge bg-danger">Not Assigned</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => handleEditHod(h.department)}
                  >
                    {h.hod ? "Edit" : "Assign"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

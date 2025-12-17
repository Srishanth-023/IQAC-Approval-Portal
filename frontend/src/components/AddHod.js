import React, { useEffect, useState } from "react";
import {
  adminGetDepartments,
  adminGetHodByDepartment,
  adminCreateHod,
  adminUpdateHod,
} from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import logo from '../assets/kite-logo.png';

export default function AddHod() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user.role;

  const [departments, setDepartments] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load departments + HODs on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const depRes = await adminGetDepartments(role);
        const deps = depRes.data.departments || [];

        const results = await Promise.all(
          deps.map(async (dept) => {
            try {
              const res = await adminGetHodByDepartment(dept, role);
              return { department: dept, hod: res.data.hod || null };
            } catch (e) {
              console.error("Error loading HOD for", dept, e);
              return { department: dept, hod: null };
            }
          })
        );

        const prepared = results.map((r) => ({
          department: r.department,
          hod: r.hod,
          form: {
            name: r.hod?.name || "",
            password: "",
          },
        }));

        setDepartments(deps);
        setRows(prepared);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load departments / HODs");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (department, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.department === department
          ? { ...row, form: { ...row.form, [field]: value } }
          : row
      )
    );
  };

  const handleSubmit = async (department) => {
    const row = rows.find((r) => r.department === department);
    if (!row) return;

    const { name, password } = row.form;
    const isEdit = !!row.hod;

    if (!name) {
      toast.error("Name is required");
      return;
    }

    if (!isEdit && !password) {
      toast.error("Password is required for new HOD");
      return;
    }

    try {
      if (isEdit) {
        await adminUpdateHod(department, { name, password }, role);
        toast.success(`HOD for ${department} updated successfully`);
      } else {
        await adminCreateHod({ name, password, department }, role);
        toast.success(`HOD for ${department} created successfully`);
      }

      // Refresh just that row
      const res = await adminGetHodByDepartment(department, role);
      const newHod = res.data.hod || null;

      setRows((prev) =>
        prev.map((r) =>
          r.department === department
            ? {
                ...r,
                hod: newHod,
                form: {
                  name: newHod?.name || "",
                  password: "",
                },
              }
            : r
        )
      );
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to save HOD");
    }
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
                <h1>HOD Management</h1>
                <p>Assign and manage Head of Departments</p>
              </div>
            </div>
            <div className="dashboard-header-right">
              <button 
                className="btn-secondary-custom" 
                onClick={() => navigate("/admin/dashboard")}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-spinner fade-in">
            <div className="spinner"></div>
            <p>Loading departments...</p>
          </div>
        )}

        {/* HOD Cards */}
        {!loading && rows.map((row) => {
          const { department, hod, form } = row;
          const isEdit = !!hod;

          return (
            <div key={department} className="dashboard-card mb-4 fade-in">
              <div className="dashboard-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4>🏛️ {department}</h4>
                  <p>Department HOD Configuration</p>
                </div>
                {isEdit ? (
                  <span className="badge-custom badge-approved">
                    ✓ HOD Assigned ({hod.name})
                  </span>
                ) : (
                  <span className="badge-custom badge-rejected">
                    ✗ No HOD Assigned
                  </span>
                )}
              </div>
              <div className="dashboard-card-body">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(department);
                  }}
                  style={{ maxWidth: '500px' }}
                >
                  {/* Name */}
                  <div className="form-group-custom">
                    <label className="form-label-custom">HOD Name</label>
                    <input
                      type="text"
                      className="form-input-custom"
                      placeholder="Enter HOD name"
                      value={form.name}
                      onChange={(e) =>
                        handleInputChange(department, "name", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* Password - only show when creating new HOD */}
                  {!isEdit && (
                    <div className="form-group-custom">
                      <label className="form-label-custom">Password</label>
                      <input
                        type="text"
                        className="form-input-custom"
                        placeholder="Enter password"
                        value={form.password}
                        onChange={(e) =>
                          handleInputChange(department, "password", e.target.value)
                        }
                        required
                      />
                    </div>
                  )}
                  {isEdit && (
                    <div className="info-box" style={{ 
                      background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
                      border: '1px solid #93c5fd',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1e40af'
                    }}>
                      <small>💡 To change password, use "Reset Password" button from the Admin Dashboard.</small>
                    </div>
                  )}

                  <button className="btn-primary-custom w-100" type="submit">
                    {isEdit ? "✏️ Update HOD" : "➕ Create HOD"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}

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

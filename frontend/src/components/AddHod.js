import React, { useEffect, useState } from "react";
import {
  adminGetDepartments,
  adminGetHodByDepartment,
  adminCreateHod,
  adminUpdateHod,
} from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

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
    <div className="container mt-5 pb-5">
      <h3 className="text-center mb-4">HOD Management</h3>

      <button
        className="btn btn-secondary mb-3"
        onClick={() => navigate("/admin/dashboard")}
      >
        ← Back to Dashboard
      </button>

      {loading && <p>Loading...</p>}

      {!loading &&
        rows.map((row) => {
          const { department, hod, form } = row;
          const isEdit = !!hod;

          return (
            <div key={department} className="card shadow p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">{department}</h5>
                {isEdit ? (
                  <span className="badge bg-success">
                    HOD Assigned ({hod.name})
                  </span>
                ) : (
                  <span className="badge bg-danger">No HOD Assigned</span>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(department);
                }}
              >
                {/* Name */}
                <div className="mb-3">
                  <label className="form-label">HOD Name</label>
                  <input
                    type="text"
                    className="form-control"
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
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="text"
                      className="form-control"
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
                  <div className="alert alert-info mb-3">
                    <small>💡 To change password, use "Reset Password" button from the Admin Dashboard.</small>
                  </div>
                )}

                <button className="btn btn-primary w-100" type="submit">
                  {isEdit ? "Update HOD" : "Create HOD"}
                </button>
              </form>
            </div>
          );
        })}
    </div>
  );
}

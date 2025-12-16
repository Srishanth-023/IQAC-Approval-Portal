import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// =============================================
// AUTH
// =============================================
export const loginUser = (data) => API.post("/auth/login", data);

// =============================================
// STAFF: CREATE REQUEST
// =============================================
export const createRequest = (formData) =>
  API.post("/requests", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// =============================================
// STAFF: FETCH THEIR OWN REQUESTS
// =============================================
export const fetchStaffRequests = (staffId) =>
  API.get("/requests", {
    params: { staffId },
  });

// =============================================
// IQAC / ROLE USERS: FETCH REQUESTS BY ROLE
// =============================================
export const fetchRequestsForRole = (role, department = null) =>
  API.get("/requests", {
    params: { current_role: role, department },
  });

// =============================================
// FETCH SINGLE REQUEST DETAIL
// =============================================
export const getRequestDetail = (id) => API.get(`/requests/${id}`);

// =============================================
// APPROVAL / RECREATE ACTION
// =============================================
export const actOnRequest = (id, payload) =>
  API.post(`/requests/${id}/action`, payload);

// =============================================
// APPROVAL LETTER URL
// =============================================
export const approvalLetterUrl = (id) =>
  `${API.defaults.baseURL}/requests/${id}/approval-letter`;

// Download approval letter
export const approvalLetterDownloadUrl = (id) =>
  `${API.defaults.baseURL}/requests/${id}/approval-letter?download=true`;

// =============================================
// GET FRESH SIGNED URL FOR REPORT
// =============================================
export const getFreshReportUrl = (id) =>
  API.get(`/requests/${id}/report-url`);

// =============================================
// ========== ADMIN APIs ==========
// =============================================

// Create Staff
export const adminCreateStaff = (data, role) =>
  API.post("/admin/create-staff", data, {
    headers: { "x-user-role": role },
  });

// Create HOD
export const adminCreateHod = (data, role) =>
  API.post("/admin/create-hod", data, {
    headers: { "x-user-role": role },
  });

// Get all requests
export const adminFetchAllRequests = (role) =>
  API.get("/admin/all-requests", {
    headers: { "x-user-role": role },
  });

// Get departments list
export const adminGetDepartments = (role) =>
  API.get("/admin/departments", {
    headers: { "x-user-role": role },
  });

/* =====================================================
   NEW ADMIN ENDPOINTS (ADDED AS PER YOUR REQUIREMENTS)
===================================================== */

// Get ALL Staff
export const adminGetAllStaff = (role) =>
  API.get("/admin/all-staff", {
    headers: { "x-user-role": role },
  });

// Update Staff
export const adminUpdateStaff = (id, data, role) =>
  API.put(`/admin/update-staff/${id}`, data, {
    headers: { "x-user-role": role },
  });

// Delete Staff
export const adminDeleteStaff = (id, role) =>
  API.delete(`/admin/delete-staff/${id}`, {
    headers: { "x-user-role": role },
  });

// Get HOD for a department
export const adminGetHodByDepartment = (department, role) =>
  API.get(`/admin/get-hod/${department}`, {
    headers: { "x-user-role": role },
  });

// Update HOD
export const adminUpdateHod = (department, data, role) =>
  API.put(`/admin/update-hod/${department}`, data, {
    headers: { "x-user-role": role },
  });

// Delete/Unassign HOD
export const adminDeleteHod = (department, role) =>
  API.delete(`/admin/delete-hod/${department}`, {
    headers: { "x-user-role": role },
  });

// Delete Request
export const adminDeleteRequest = (id, role) =>
  API.delete(`/admin/delete-request/${id}`, {
    headers: { "x-user-role": role },
  });

// Delete All Requests
export const adminDeleteAllRequests = (role) =>
  API.delete(`/admin/delete-all-requests`, {
    headers: { "x-user-role": role },
  });

export default API;

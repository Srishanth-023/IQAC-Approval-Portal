import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

// Eagerly load Login (first page users see)
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load all other components for faster initial load
const StaffHome = lazy(() => import("./components/StaffHome"));
const RoleDashboard = lazy(() => import("./components/RoleDashboard"));
const ApprovalLetter = lazy(() => import("./components/ApprovalLetter"));
const IQACHome = lazy(() => import("./components/IQACHome"));
const AdminLogin = lazy(() => import("./components/AdminLogin"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));
const AddStaff = lazy(() => import("./components/AddStaff"));
const AddHod = lazy(() => import("./components/AddHod"));
const AdminAllRequests = lazy(() => import("./components/AdminAllRequests"));
const RoleRequestHistory = lazy(() => import("./components/RoleRequestHistory"));

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Loading spinner for lazy-loaded components
const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
    <div className="text-center">
      <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}></div>
      <p className="mt-3 text-muted">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Default Login */}
          <Route path="/" element={<Login />} />

          {/* Admin Login */}
          <Route path="/admin-login" element={<AdminLogin />} />

        {/* Staff */}
        <Route
          path="/staff-home"
          element={
            <ProtectedRoute role="staff">
              <StaffHome />
            </ProtectedRoute>
          }
        />

        {/* IQAC */}
        <Route
          path="/iqac-home"
          element={
            <ProtectedRoute role="iqac">
              <IQACHome />
            </ProtectedRoute>
          }
        />

        {/* Role Users */}
        <Route
          path="/role/:roleKey"
          element={
            <ProtectedRoute>
              <RoleDashboard />
            </ProtectedRoute>
          }
        />

        {/* Report */}
        <Route
          path="/approval-letter/:id"
          element={
            <ProtectedRoute>
              <ApprovalLetter />
            </ProtectedRoute>
          }
        />

        {/* ========== ADMIN ROUTES ========== */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/add-staff"
          element={
            <ProtectedRoute role="admin">
              <AddStaff />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/add-hod"
          element={
            <ProtectedRoute role="admin">
              <AddHod />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/all-requests"
          element={
            <ProtectedRoute role="admin">
              <AdminAllRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/role-request-history"
          element={
            <ProtectedRoute role="admin">
              <RoleRequestHistory />
            </ProtectedRoute>
          }
        />

        {/* Role Past/Rejected Requests */}
        <Route
          path="/role/:roleKey/history"
          element={
            <ProtectedRoute>
              <RoleRequestHistory />
            </ProtectedRoute>
          }
        />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;

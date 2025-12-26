import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

// Eagerly load Login and ProtectedRoute (first components users interact with)
import { Login } from "./components/pages/auth";
import { ProtectedRoute } from "./components/common";

// Lazy load all other components for faster initial load
const StaffHome = lazy(() => import("./components/pages/staff/StaffHome"));
const RoleDashboard = lazy(() => import("./components/pages/role/RoleDashboard"));
const ApprovalLetter = lazy(() => import("./components/cards/ApprovalLetter"));
const IQACHome = lazy(() => import("./components/pages/role/IQACHome"));
const AdminLogin = lazy(() => import("./components/pages/auth/AdminLogin"));
const AdminDashboard = lazy(() => import("./components/pages/admin/AdminDashboard"));
const AddStaff = lazy(() => import("./components/pages/admin/AddStaff"));
const AddHod = lazy(() => import("./components/pages/admin/AddHod"));
const AdminAllRequests = lazy(() => import("./components/pages/admin/AdminAllRequests"));
const RoleRequestHistory = lazy(() => import("./components/pages/role/RoleRequestHistory"));
const TrackEventRequests = lazy(() => import("./components/pages/TrackEventRequests"));
const RequestDetail = lazy(() => import("./components/pages/RequestDetail"));

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

        {/* Track Event Requests */}
        <Route
          path="/track-requests"
          element={
            <ProtectedRoute>
              <TrackEventRequests />
            </ProtectedRoute>
          }
        />

        {/* Request Detail */}
        <Route
          path="/request-detail/:id"
          element={
            <ProtectedRoute>
              <RequestDetail />
            </ProtectedRoute>
          }
        />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;

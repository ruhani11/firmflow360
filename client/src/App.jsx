import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";

import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import ClientDashboard from "./pages/ClientDashboard";

import StaffManagement from "./pages/StaffManagement";
import ClientManagement from "./pages/ClientManagement";
import AssignmentManagement from "./pages/AssignmentManagement";
import DocumentCheck from "./pages/DocumentCheck";
import ClientFiles from "./pages/ClientFiles";
import AdminQueries from "./pages/AdminQueries";
import Reports from "./pages/Reports";

import StaffQueries from "./pages/StaffQueries";
import StaffAssignments from "./pages/StaffAssignments";
import StaffClientFiles from "./pages/StaffClientFiles";
import StaffDocuments from "./pages/StaffDocuments";
import StaffReviewSubmission from "./pages/StaffReviewSubmission";

import ClientServices from "./pages/ClientServices";
import ClientDocuments from "./pages/ClientDocuments";
import ClientQueries from "./pages/ClientQueries";
import ClientMyFiles from "./pages/ClientMyFiles";
import ClientProfile from "./pages/ClientProfile";

import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Main Dashboards */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-dashboard"
          element={
            <ProtectedRoute allowedRoles={["CLIENT"]}>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <StaffManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ClientManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/assignments"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AssignmentManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/document-check"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <DocumentCheck />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/client-files"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ClientFiles />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/queries"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminQueries />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Staff Panel Routes */}
        <Route
          path="/staff/assignments"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffAssignments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/documents"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffDocuments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/review-submission"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffReviewSubmission />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/queries"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffQueries />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/client-files"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffClientFiles />
            </ProtectedRoute>
          }
        />

        {/* Client Panel Routes */}
        <Route
          path="/client/services"
          element={
            <ProtectedRoute allowedRoles={["CLIENT"]}>
              <ClientServices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/documents"
          element={
            <ProtectedRoute allowedRoles={["CLIENT"]}>
              <ClientDocuments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/queries"
          element={
            <ProtectedRoute allowedRoles={["CLIENT"]}>
              <ClientQueries />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/files"
          element={
            <ProtectedRoute allowedRoles={["CLIENT"]}>
              <ClientMyFiles />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/profile"
          element={
            <ProtectedRoute allowedRoles={["CLIENT"]}>
              <ClientProfile />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
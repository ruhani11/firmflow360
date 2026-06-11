import { Navigate } from "react-router-dom";
import { getUserRole, isLoggedIn } from "../utils/authUtils";

export default function ProtectedRoute({ allowedRoles, children }) {
  const loggedIn = isLoggedIn();
  const userRole = getUserRole();

  if (!loggedIn) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === "ADMIN") return <Navigate to="/admin-dashboard" replace />;
    if (userRole === "STAFF") return <Navigate to="/staff-dashboard" replace />;
    if (userRole === "CLIENT") return <Navigate to="/client-dashboard" replace />;

    return <Navigate to="/" replace />;
  }

  return children;
}
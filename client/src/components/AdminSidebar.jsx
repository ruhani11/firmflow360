import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { logout } from "../utils/authUtils";
import "./AdminSidebar.css";

export default function AdminSidebar({ active }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="admin-shared-sidebar">
      <div>
        <h2>FirmFlow 360</h2>
        <p>Admin Panel</p>

        <nav>
          <a
            className={active === "dashboard" ? "active" : ""}
            onClick={() => navigate("/admin-dashboard")}
          >
            Dashboard
          </a>

          <a
            className={active === "clients" ? "active" : ""}
            onClick={() => navigate("/admin/clients")}
          >
            Clients
          </a>

          <a
            className={active === "staff" ? "active" : ""}
            onClick={() => navigate("/admin/staff")}
          >
            Staff
          </a>

          <a
            className={active === "assignments" ? "active" : ""}
            onClick={() => navigate("/admin/assignments")}
          >
            Assignments
          </a>

          <a
            className={active === "document-check" ? "active" : ""}
            onClick={() => navigate("/admin/document-check")}
          >
            Document Check
          </a>

          <a
            className={active === "client-files" ? "active" : ""}
            onClick={() => navigate("/admin/client-files")}
          >
            Client Files
          </a>

          <a
            className={active === "queries" ? "active" : ""}
            onClick={() => navigate("/admin/queries")}
          >
            Queries
          </a>

          <a
            className={active === "reports" ? "active" : ""}
            onClick={() => navigate("/admin/reports")}
          >
            Reports
          </a>
        </nav>
      </div>

      <button
        type="button"
        className="admin-shared-logout"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
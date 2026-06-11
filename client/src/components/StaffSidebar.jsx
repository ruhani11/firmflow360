import { useNavigate } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Upload,
  FileCheck,
  MessageSquare,
  FolderOpen,
} from "lucide-react";
import { logout } from "../utils/authUtils";
import "./StaffSidebar.css";

export default function StaffSidebar({ active }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="staff-portal-sidebar">
      <div>
        <h2>FirmFlow 360</h2>
        <p>Staff Panel</p>

        <nav>
          <a
            className={active === "dashboard" ? "active" : ""}
            onClick={() => navigate("/staff-dashboard")}
          >
            <LayoutDashboard size={17} />
            Dashboard
          </a>

          <a
            className={active === "assignments" ? "active" : ""}
            onClick={() => navigate("/staff/assignments")}
          >
            <ClipboardList size={17} />
            My Assignments
          </a>

          <a
            className={active === "documents" ? "active" : ""}
            onClick={() => navigate("/staff/documents")}
          >
            <Upload size={17} />
            Upload Documents
          </a>

          <a
            className={active === "review" ? "active" : ""}
            onClick={() => navigate("/staff/review-submission")}
          >
            <FileCheck size={17} />
            Review Status
          </a>

          <a
            className={active === "queries" ? "active" : ""}
            onClick={() => navigate("/staff/queries")}
          >
            <MessageSquare size={17} />
            Queries
          </a>

          <a
            className={active === "client-files" ? "active" : ""}
            onClick={() => navigate("/staff/client-files")}
          >
            <FolderOpen size={17} />
            Client Deliverables
          </a>
        </nav>
      </div>

      <button
        type="button"
        className="staff-portal-logout"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
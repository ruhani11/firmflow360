import { useNavigate } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  BriefcaseBusiness,
  Upload,
  MessageSquare,
  FolderOpen,
  UserRound,
} from "lucide-react";
import { logout } from "../utils/authUtils";
import "./ClientSidebar.css";

export default function ClientSidebar({ active }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="client-portal-sidebar">
      <div>
        <h2>FirmFlow 360</h2>
        <p>Client Portal</p>

        <nav>
          <a
            className={active === "dashboard" ? "active" : ""}
            onClick={() => navigate("/client-dashboard")}
          >
            <LayoutDashboard size={17} />
            Dashboard
          </a>

          <a
            className={active === "services" ? "active" : ""}
            onClick={() => navigate("/client/services")}
          >
            <BriefcaseBusiness size={17} />
            My Services
          </a>

          <a
            className={active === "documents" ? "active" : ""}
            onClick={() => navigate("/client/documents")}
          >
            <Upload size={17} />
            Upload Documents
          </a>

          <a
            className={active === "queries" ? "active" : ""}
            onClick={() => navigate("/client/queries")}
          >
            <MessageSquare size={17} />
            Queries
          </a>

          <a
            className={active === "files" ? "active" : ""}
            onClick={() => navigate("/client/files")}
          >
            <FolderOpen size={17} />
            My Files
          </a>

          <a
            className={active === "profile" ? "active" : ""}
            onClick={() => navigate("/client/profile")}
          >
            <UserRound size={17} />
            Profile
          </a>
        </nav>
      </div>

      <button
        type="button"
        className="client-portal-logout"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Clock,
  Upload,
  FileText,
  Eye,
  Download,
  MessageSquare,
  FolderOpen,
  RefreshCcw,
  Send,
} from "lucide-react";

import ClientSidebar from "../components/ClientSidebar";
import NotificationBell from "../components/NotificationBell";

import { getClientDashboardStats } from "../services/dashboardService";
import {
  downloadClientFile,
  viewClientFile,
} from "../services/clientFileService";

import "./ClientDashboard.css";

export default function ClientDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [client, setClient] = useState(null);

  const [stats, setStats] = useState({
    services: {},
    documents: {},
    files: {},
    queries: {},
  });

  const [recent, setRecent] = useState({
    services: [],
    documents: [],
    files: [],
    queries: [],
  });

  const [loading, setLoading] = useState(false);
  const [downloadId, setDownloadId] = useState("");
  const [viewId, setViewId] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getClientDashboardStats();

      if (!data?.success) {
        throw new Error(data?.message || "Unable to load client dashboard.");
      }

      setDashboardData(data);
      setClient(data?.client || null);

      setStats({
        services: data?.stats?.services || {},
        documents: data?.stats?.documents || {},
        files: data?.stats?.files || {},
        queries: data?.stats?.queries || {},
      });

      setRecent({
        services: Array.isArray(data?.recent?.services)
          ? data.recent.services
          : [],
        documents: Array.isArray(data?.recent?.documents)
          ? data.recent.documents
          : [],
        files: Array.isArray(data?.recent?.files) ? data.recent.files : [],
        queries: Array.isArray(data?.recent?.queries)
          ? data.recent.queries
          : [],
      });
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch client dashboard."
      );

      setDashboardData(null);
      setClient(null);

      setStats({
        services: {},
        documents: {},
        files: {},
        queries: {},
      });

      setRecent({
        services: [],
        documents: [],
        files: [],
        queries: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const getLoggedInUserName = () => {
    try {
      const user =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(localStorage.getItem("firmflowUser"));

      return user?.name || user?.fullName || "";
    } catch {
      return "";
    }
  };

  const clientName =
    client?.businessName ||
    client?.individualName ||
    client?.user?.name ||
    dashboardData?.client?.user?.name ||
    getLoggedInUserName() ||
    "Client";

  const getStaffName = (staff) => {
    if (!staff) return "-";
    return staff?.user?.name || staff?.name || "-";
  };

  const getAssignmentName = (item) => {
    return item?.assignment?.serviceName || item?.serviceName || "-";
  };

  const getFileName = (file) => {
    return (
      file?.originalName ||
      file?.fileName ||
      file?.fileTitle ||
      "Client File"
    );
  };

  const getStatusClass = (status) => {
    if (status === "Not Started") return "pending";
    if (status === "In Progress") return "progress";
    if (status === "Pending Documents") return "pending";
    if (status === "Submitted for Review") return "review";
    if (status === "Under Review") return "review";
    if (status === "Correction Required") return "correction";
    if (status === "Wrong Document" || status === "Rejected")
      return "correction";
    if (status === "Approved") return "prepared";
    if (status === "Shared with Client") return "prepared";
    if (status === "Completed") return "prepared";
    if (status === "Open") return "open";
    if (status === "Waiting for Client") return "pending";
    if (status === "Resolved" || status === "Closed") return "prepared";

    return "normal";
  };

  const getPriorityClass = (priority) => {
    if (priority === "High" || priority === "Urgent") return "high";
    if (priority === "Low") return "low";
    return "medium";
  };

  const totalServices = stats?.services?.total || 0;
  const pendingServices = stats?.services?.pending || 0;
  const inProgressServices = stats?.services?.inProgress || 0;
  const completedServices = stats?.services?.completed || 0;

  const pendingDocuments = stats?.documents?.pendingOrUnderReview || 0;
  const availableFiles = stats?.files?.available || 0;
  const activeQueries = stats?.queries?.active || 0;

  const handleDownloadFile = async (file) => {
    try {
      setDownloadId(file._id);
      await downloadClientFile(file._id, getFileName(file));
      showSuccess("File downloaded successfully.");
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to download file."
      );
    } finally {
      setDownloadId("");
    }
  };

  const handleViewFile = async (file) => {
    try {
      setViewId(file._id);
      await viewClientFile(file._id);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to open file."
      );
    } finally {
      setViewId("");
    }
  };

  return (
    <div className="client-dashboard-page">
      <ClientSidebar active="dashboard" />

      <main className="client-dashboard-main">
        <header className="client-dashboard-header">
          <div>
            <h1>Client Dashboard</h1>
            <p>
              Welcome, {clientName}. Track your services, documents, files and
              queries.
            </p>
          </div>

          <div className="client-dashboard-header-actions">
            <NotificationBell />

            <button
              type="button"
              className="client-dashboard-refresh-btn"
              onClick={fetchDashboardData}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="client-upload-btn"
              onClick={() => navigate("/client/documents")}
            >
              <Upload size={18} />
              Upload Documents
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="client-dashboard-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="client-dashboard-message success">
            {successMessage}
          </div>
        )}

        <section className="client-dashboard-stats">
          <div
            className="client-stat-card clickable-card"
            onClick={() => navigate("/client/services")}
          >
            <div className="client-stat-icon blue">
              <BriefcaseBusiness />
            </div>

            <div>
              <p>Total Services</p>
              <h3>{loading ? "..." : totalServices}</h3>
            </div>
          </div>

          <div
            className="client-stat-card clickable-card"
            onClick={() => navigate("/client/documents")}
          >
            <div className="client-stat-icon orange">
              <Clock />
            </div>

            <div>
              <p>Pending Documents</p>
              <h3>{loading ? "..." : pendingDocuments}</h3>
            </div>
          </div>

          <div
            className="client-stat-card clickable-card"
            onClick={() => navigate("/client/files")}
          >
            <div className="client-stat-icon green">
              <FolderOpen />
            </div>

            <div>
              <p>Available Files</p>
              <h3>{loading ? "..." : availableFiles}</h3>
            </div>
          </div>

          <div
            className="client-stat-card clickable-card"
            onClick={() => navigate("/client/queries")}
          >
            <div className="client-stat-icon purple">
              <MessageSquare />
            </div>

            <div>
              <p>Active Queries</p>
              <h3>{loading ? "..." : activeQueries}</h3>
            </div>
          </div>
        </section>

        <section className="client-dashboard-grid">
          <div className="client-panel large-panel">
            <div className="client-panel-header">
              <h2>My Services</h2>

              <span onClick={() => navigate("/client/services")}>
                View Services
              </span>
            </div>

            <div className="client-service-summary">
              <div>
                <p>Pending</p>
                <h4>{pendingServices}</h4>
              </div>

              <div>
                <p>In Progress</p>
                <h4>{inProgressServices}</h4>
              </div>

              <div>
                <p>Completed</p>
                <h4>{completedServices}</h4>
              </div>
            </div>

            <div className="client-service-list">
              {loading && recent.services.length === 0 ? (
                <div className="client-dashboard-empty-state">
                  Loading services...
                </div>
              ) : recent.services.length === 0 ? (
                <div className="client-dashboard-empty-state">
                  No services found.
                </div>
              ) : (
                recent.services.map((service) => (
                  <div
                    className="client-service-card clickable-card"
                    key={service._id}
                    onClick={() => navigate("/client/services")}
                  >
                    <div>
                      <h3>{service.serviceName || "-"}</h3>
                      <p>{service.period || "-"}</p>

                      <small>
                        Staff: {getStaffName(service.staff)} • Due:{" "}
                        {service.dueDate || "-"}
                      </small>
                    </div>

                    <div>
                      <span
                        className={`client-status ${getStatusClass(
                          service.status
                        )}`}
                      >
                        {service.status || "Not Started"}
                      </span>

                      <small>{service.completionPercent || 0}% completed</small>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate("/client/services");
                      }}
                    >
                      <Eye size={15} />
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="client-panel">
            <div className="client-panel-header">
              <h2>Recent Documents</h2>

              <span onClick={() => navigate("/client/documents")}>
                View All
              </span>
            </div>

            <div className="client-small-list">
              {loading && recent.documents.length === 0 ? (
                <div className="client-dashboard-empty-state">
                  Loading documents...
                </div>
              ) : recent.documents.length === 0 ? (
                <div className="client-dashboard-empty-state">
                  No documents found.
                </div>
              ) : (
                recent.documents.map((document) => (
                  <div
                    className="client-small-card clickable-card"
                    key={document._id}
                    onClick={() => navigate("/client/documents")}
                  >
                    <FileText />

                    <div>
                      <div className="client-card-title-row">
                        <h4>{document.documentType || "-"}</h4>

                        <span
                          className={`client-status ${getStatusClass(
                            document.status
                          )}`}
                        >
                          {document.status || "-"}
                        </span>
                      </div>

                      <p>
                        {getAssignmentName(document)} •{" "}
                        {document.originalName || document.fileName || "-"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="client-dashboard-grid">
          <div className="client-panel">
            <div className="client-panel-header">
              <h2>Files Shared by Office</h2>

              <span onClick={() => navigate("/client/files")}>View Files</span>
            </div>

            <div className="client-small-list">
              {loading && recent.files.length === 0 ? (
                <div className="client-dashboard-empty-state">
                  Loading files...
                </div>
              ) : recent.files.length === 0 ? (
                <div className="client-dashboard-empty-state">
                  No files shared yet.
                </div>
              ) : (
                recent.files.map((file) => (
                  <div className="client-file-card" key={file._id}>
                    <FolderOpen />

                    <div>
                      <div className="client-card-title-row">
                        <h4>{file.fileTitle || getFileName(file)}</h4>

                        <span
                          className={`client-status ${getStatusClass(
                            file.status
                          )}`}
                        >
                          {file.status || "-"}
                        </span>
                      </div>

                      <p>
                        {file.fileCategory || "Client File"} •{" "}
                        {getAssignmentName(file)}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={viewId === file._id}
                      onClick={() => handleViewFile(file)}
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      disabled={downloadId === file._id}
                      onClick={() => handleDownloadFile(file)}
                    >
                      <Download size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="client-panel">
            <div className="client-panel-header">
              <h2>My Queries</h2>

              <span onClick={() => navigate("/client/queries")}>
                Open Matters
              </span>
            </div>

            <div className="client-dashboard-query-list">
              {loading && recent.queries.length === 0 ? (
                <div className="client-dashboard-empty-state">
                  Loading queries...
                </div>
              ) : recent.queries.length === 0 ? (
                <div className="client-dashboard-empty-state">
                  No queries found.
                </div>
              ) : (
                recent.queries.map((query) => (
                  <div
                    className="client-dashboard-query-card"
                    key={query._id}
                    onClick={() => navigate("/client/queries")}
                  >
                    <MessageSquare />

                    <div>
                      <h4>{query.subject || "-"}</h4>
                      <p>{query.message || "-"}</p>

                      <div className="client-query-meta">
                        <span
                          className={`client-priority ${getPriorityClass(
                            query.priority
                          )}`}
                        >
                          {query.priority || "Medium"}
                        </span>

                        <span
                          className={`client-status ${getStatusClass(
                            query.status
                          )}`}
                        >
                          {query.status || "Open"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate("/client/queries");
                      }}
                    >
                      <Send size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
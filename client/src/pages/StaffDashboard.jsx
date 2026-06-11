import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle,
  Upload,
  FileText,
  Eye,
  Download,
  MessageSquare,
  FolderOpen,
  RefreshCcw,
} from "lucide-react";

import StaffSidebar from "../components/StaffSidebar";
import NotificationBell from "../components/NotificationBell";

import { getStaffDashboardStats } from "../services/dashboardService";
import { getMyStaffAssignments } from "../services/assignmentService";
import { getMyStaffClientDocuments } from "../services/documentService";
import {
  getMyStaffClientFiles,
  downloadClientFile,
} from "../services/clientFileService";
import { getMyStaffClientQueries } from "../services/queryService";

import "./StaffDashboard.css";

export default function StaffDashboard() {
  const navigate = useNavigate();

  const [dashboardStats, setDashboardStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [clientFiles, setClientFiles] = useState([]);
  const [clientQueries, setClientQueries] = useState([]);

  const [loading, setLoading] = useState(false);
  const [downloadId, setDownloadId] = useState("");

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

      const [
        statsData,
        assignmentData,
        documentData,
        clientFileData,
        queryData,
      ] = await Promise.allSettled([
        getStaffDashboardStats(),
        getMyStaffAssignments(),
        getMyStaffClientDocuments(),
        getMyStaffClientFiles(),
        getMyStaffClientQueries(),
      ]);

      if (statsData.status === "fulfilled" && statsData.value?.success) {
        setDashboardStats(statsData.value);
      }

      if (
        assignmentData.status === "fulfilled" &&
        assignmentData.value?.success
      ) {
        setAssignments(assignmentData.value.assignments || []);
      }

      if (documentData.status === "fulfilled" && documentData.value?.success) {
        setDocuments(documentData.value.documents || []);
      }

      if (
        clientFileData.status === "fulfilled" &&
        clientFileData.value?.success
      ) {
        setClientFiles(clientFileData.value.clientFiles || []);
      }

      if (queryData.status === "fulfilled" && queryData.value?.success) {
        setClientQueries(queryData.value.queries || []);
      }

      const failedRequest = [
        statsData,
        assignmentData,
        documentData,
        clientFileData,
        queryData,
      ].find((item) => item.status === "rejected");

      if (failedRequest) {
        showError(
          failedRequest.reason?.response?.data?.message ||
            failedRequest.reason?.message ||
            "Some dashboard data could not be loaded."
        );
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch staff dashboard."
      );
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

  const staffName =
    dashboardStats?.staff?.user?.name ||
    dashboardStats?.staff?.name ||
    dashboardStats?.user?.name ||
    getLoggedInUserName() ||
    "Staff Member";

  const getClientName = (client) => {
    if (!client) return "-";

    if (client.clientType === "BUSINESS") {
      return client.businessName || client.user?.name || "Business Client";
    }

    return client.individualName || client.user?.name || "Individual Client";
  };

  const getClientId = (client) => {
    if (!client) return "";
    return typeof client === "string" ? client : client._id;
  };

  const getAssignmentId = (assignment) => {
    if (!assignment) return "";
    return typeof assignment === "string" ? assignment : assignment._id;
  };

  const getDocumentAssignmentId = (document) => {
    return getAssignmentId(document.assignment);
  };

  const getDocumentClientId = (document) => {
    return getClientId(document.client);
  };

  const normalizeText = (value) => {
    return String(value || "").trim().toLowerCase();
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getFileName = (file) => {
    return file?.originalName || file?.fileName || "Submitted File";
  };

  const isSameDocumentType = (requiredDoc, uploadedDocType) => {
    const required = normalizeText(requiredDoc);
    const uploaded = normalizeText(uploadedDocType);

    if (!required || !uploaded) return false;

    return (
      required === uploaded ||
      uploaded.includes(required) ||
      required.includes(uploaded)
    );
  };

  const getRelatedDocuments = (assignment) => {
    const assignmentId = assignment._id;
    const clientId = getClientId(assignment.client);
    const serviceName = normalizeText(assignment.serviceName);

    return documents.filter((document) => {
      const linkedAssignmentId = getDocumentAssignmentId(document);

      if (linkedAssignmentId && linkedAssignmentId === assignmentId) {
        return true;
      }

      const sameClient = getDocumentClientId(document) === clientId;
      const sameService =
        normalizeText(document.serviceName) &&
        normalizeText(document.serviceName) === serviceName;

      return sameClient && sameService;
    });
  };

  const getPendingDocumentsForAssignment = (assignment) => {
    const requiredDocuments = assignment.requiredDocuments || [];
    const relatedDocuments = getRelatedDocuments(assignment);

    return requiredDocuments
      .filter((requiredDoc) => {
        return !relatedDocuments.find((document) =>
          isSameDocumentType(requiredDoc, document.documentType)
        );
      })
      .map((requiredDoc) => ({
        id: `${assignment._id}-${requiredDoc}`,
        client: getClientName(assignment.client),
        document: requiredDoc,
        service: assignment.serviceName || "-",
        status: "Pending",
      }));
  };

  const pendingDocuments = useMemo(() => {
    return assignments.flatMap((assignment) =>
      getPendingDocumentsForAssignment(assignment)
    );
  }, [assignments, documents]);

  const assignedTasks = useMemo(() => {
    return assignments
      .map((assignment) => ({
        id: assignment._id,
        client: getClientName(assignment.client),
        service: assignment.serviceName || "-",
        dueDate: formatDate(assignment.dueDate),
        priority: assignment.priority || "Medium",
        status: assignment.status || "Not Started",
        pendingDocs: getPendingDocumentsForAssignment(assignment).length,
      }))
      .slice(0, 5);
  }, [assignments, documents]);

  const submittedFiles = useMemo(() => {
    return clientFiles
      .filter((file) => file.uploadedBy === "Office Staff" || file.uploadedByStaff)
      .map((file) => ({
        id: file._id,
        client: getClientName(file.client),
        fileName: getFileName(file),
        type: file.fileCategory || file.fileTitle || "Client File",
        status: file.status || "Pending Admin Approval",
        rawFile: file,
      }))
      .sort((a, b) => {
        const first = new Date(a.rawFile.updatedAt || a.rawFile.createdAt);
        const second = new Date(b.rawFile.updatedAt || b.rawFile.createdAt);
        return second - first;
      })
      .slice(0, 5);
  }, [clientFiles]);

  const openClientQueries = useMemo(() => {
    return clientQueries
      .filter((query) =>
        ["Open", "In Progress", "Waiting for Client"].includes(query.status)
      )
      .map((query) => ({
        id: query._id,
        client: getClientName(query.client),
        query: query.subject || query.message || "-",
        status: query.status || "Open",
      }))
      .slice(0, 5);
  }, [clientQueries]);

  const totalAssignedWork = assignments.length;

  const totalPendingDocuments = pendingDocuments.length;

  const totalSubmittedForReview = clientFiles.filter(
    (file) => file.status === "Pending Admin Approval"
  ).length;

  const totalCorrections = clientFiles.filter(
    (file) => file.status === "Correction Required"
  ).length;

  const getStatusClass = (status) => {
    if (status === "In Progress") return "progress";
    if (status === "Pending Documents") return "pending";
    if (status === "Submitted for Review") return "review";
    if (status === "Working File Prepared") return "prepared";
    if (status === "Correction Required") return "correction";
    if (status === "Approved" || status === "Completed") return "prepared";
    if (status === "Pending Admin Approval") return "review";
    return "normal";
  };

  const getPriorityClass = (priority) => {
    if (priority === "High") return "high";
    if (priority === "Medium") return "medium";
    return "medium";
  };

  const handleDownloadFile = async (file) => {
    try {
      setDownloadId(file.id);
      await downloadClientFile(file.id, file.fileName);
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

  return (
    <div className="staff-dashboard-page">
      <StaffSidebar active="dashboard" />

      <main className="staff-dashboard-main">
        <header className="staff-dashboard-header">
          <div>
            <h1>Staff Dashboard</h1>
            <p>
              Welcome, {staffName}. View assigned work, pending documents,
              submitted files, corrections and client queries.
            </p>
          </div>

          <div className="staff-dashboard-header-actions">
            <NotificationBell />

            <button
              type="button"
              className="staff-dashboard-refresh-btn"
              onClick={fetchDashboardData}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="staff-upload-btn"
              onClick={() => navigate("/staff/assignments")}
            >
              <Upload size={18} />
              Go to Assignments
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="staff-dashboard-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="staff-dashboard-message success">
            {successMessage}
          </div>
        )}

        <section className="staff-dashboard-stats">
          <div
            className="staff-stat-card clickable-card"
            onClick={() => navigate("/staff/assignments")}
          >
            <div className="staff-stat-icon blue">
              <ClipboardList />
            </div>
            <div>
              <p>Assigned Work</p>
              <h3>{loading ? "..." : totalAssignedWork}</h3>
            </div>
          </div>

          <div
            className="staff-stat-card clickable-card"
            onClick={() => navigate("/staff/documents")}
          >
            <div className="staff-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>Pending Documents</p>
              <h3>{loading ? "..." : totalPendingDocuments}</h3>
            </div>
          </div>

          <div
            className="staff-stat-card clickable-card"
            onClick={() => navigate("/staff/review-submission")}
          >
            <div className="staff-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Submitted for Review</p>
              <h3>{loading ? "..." : totalSubmittedForReview}</h3>
            </div>
          </div>

          <div
            className="staff-stat-card clickable-card"
            onClick={() => navigate("/staff/review-submission")}
          >
            <div className="staff-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Corrections</p>
              <h3>{loading ? "..." : totalCorrections}</h3>
            </div>
          </div>
        </section>

        <section className="staff-dashboard-grid">
          <div className="staff-panel large-panel">
            <div className="staff-panel-header">
              <h2>My Assigned Work</h2>
              <span onClick={() => navigate("/staff/assignments")}>
                Active Tasks
              </span>
            </div>

            <div className="staff-task-list">
              {loading && assignedTasks.length === 0 ? (
                <div className="staff-dashboard-empty-state">
                  Loading assigned work...
                </div>
              ) : assignedTasks.length === 0 ? (
                <div className="staff-dashboard-empty-state">
                  No assigned work found.
                </div>
              ) : (
                assignedTasks.map((task) => (
                  <div
                    className="staff-task-card clickable-card"
                    key={task.id}
                    onClick={() => navigate("/staff/assignments")}
                  >
                    <div>
                      <h3>{task.client}</h3>
                      <p>{task.service}</p>
                      <small>Due Date: {task.dueDate}</small>
                    </div>

                    <div>
                      <span
                        className={`staff-priority ${getPriorityClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`staff-status ${getStatusClass(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                      <small>{task.pendingDocs} pending docs</small>
                    </div>

                    <div className="staff-task-actions">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate("/staff/assignments");
                        }}
                      >
                        <Eye size={15} />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate("/staff/assignments");
                        }}
                      >
                        <Upload size={15} />
                        Upload
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="staff-panel">
            <div className="staff-panel-header">
              <h2>Pending Documents</h2>
              <span onClick={() => navigate("/staff/documents")}>
                Follow-up
              </span>
            </div>

            <div className="staff-small-list">
              {loading && pendingDocuments.length === 0 ? (
                <div className="staff-dashboard-empty-state">
                  Loading pending documents...
                </div>
              ) : pendingDocuments.length === 0 ? (
                <div className="staff-dashboard-empty-state">
                  No pending documents.
                </div>
              ) : (
                pendingDocuments.slice(0, 5).map((doc) => (
                  <div
                    className="staff-small-card clickable-card"
                    key={doc.id}
                    onClick={() => navigate("/staff/documents")}
                  >
                    <FileText />
                    <div>
                      <h4>{doc.document}</h4>
                      <p>
                        {doc.client} • {doc.service}
                      </p>
                      <span>{doc.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="staff-dashboard-grid">
          <div className="staff-panel">
            <div className="staff-panel-header">
              <h2>Submitted Files</h2>
              <span onClick={() => navigate("/staff/review-submission")}>
                Admin Review
              </span>
            </div>

            <div className="staff-small-list">
              {loading && submittedFiles.length === 0 ? (
                <div className="staff-dashboard-empty-state">
                  Loading submitted files...
                </div>
              ) : submittedFiles.length === 0 ? (
                <div className="staff-dashboard-empty-state">
                  No submitted files found.
                </div>
              ) : (
                submittedFiles.map((file) => (
                  <div
                    className="staff-file-card clickable-card"
                    key={file.id}
                    onClick={() => navigate("/staff/review-submission")}
                  >
                    <FolderOpen />
                    <div>
                      <h4>{file.fileName}</h4>
                      <p>
                        {file.client} • {file.type}
                      </p>
                      <span
                        className={`staff-status ${getStatusClass(
                          file.status
                        )}`}
                      >
                        {file.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={downloadId === file.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDownloadFile(file);
                      }}
                    >
                      <Download size={15} />
                      {downloadId === file.id ? "..." : ""}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="staff-panel">
            <div className="staff-panel-header">
              <h2>Client Queries</h2>
              <span onClick={() => navigate("/staff/queries")}>
                Open Matters
              </span>
            </div>

            <div className="staff-dashboard-query-list">
              {loading && openClientQueries.length === 0 ? (
                <div className="staff-dashboard-empty-state">
                  Loading client queries...
                </div>
              ) : openClientQueries.length === 0 ? (
                <div className="staff-dashboard-empty-state">
                  No open client queries.
                </div>
              ) : (
                openClientQueries.map((query) => (
                  <div
                    className="staff-dashboard-query-card"
                    key={query.id}
                    onClick={() => navigate("/staff/queries")}
                  >
                    <MessageSquare />
                    <div>
                      <h4>{query.client}</h4>
                      <p>{query.query}</p>
                      <span>{query.status}</span>
                    </div>
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
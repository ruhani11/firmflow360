import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  ClipboardList,
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  PlusCircle,
  BarChart3,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";
import NotificationBell from "../components/NotificationBell";

import { getAdminDashboardStats } from "../services/dashboardService";
import { getAllAssignmentsForAdmin } from "../services/assignmentService";
import { getAllDocumentsForAdmin } from "../services/documentService";

import "./AdminDashboard.css";

const PENDING_DOCUMENT_STATUSES = ["Pending", "Uploaded", "Under Review"];
const WRONG_DOCUMENT_STATUSES = ["Wrong Document", "Rejected"];
const COMPLETED_ASSIGNMENT_STATUSES = ["Completed", "Approved"];

const getClientName = (client) => {
  if (!client) return "-";

  if (client.clientType === "BUSINESS") {
    return client.businessName || client.user?.name || "Business Client";
  }

  return client.individualName || client.user?.name || "Individual Client";
};

const getStaffName = (staff) => {
  return staff?.user?.name || "Unassigned Staff";
};

const formatDate = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
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

const getDocumentAssignmentId = (document) => {
  if (!document?.assignment) return "";

  return typeof document.assignment === "string"
    ? document.assignment
    : document.assignment._id;
};

const isCompletedAssignmentStatus = (status) => {
  return COMPLETED_ASSIGNMENT_STATUSES.includes(status);
};

const isOverdueAssignment = (assignment) => {
  if (!assignment?.dueDate || isCompletedAssignmentStatus(assignment.status)) {
    return false;
  }

  const dueDate = new Date(assignment.dueDate);
  const today = new Date();

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
};

const isDueTodayAssignment = (assignment) => {
  if (!assignment?.dueDate) return false;

  const dueDate = new Date(assignment.dueDate);
  const today = new Date();

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dueDate.getTime() === today.getTime();
};

const getMissingDocumentsForAssignment = (assignment, documents) => {
  const requiredDocuments = assignment.requiredDocuments || [];

  if (requiredDocuments.length === 0) return [];

  const relatedDocuments = documents.filter(
    (document) => getDocumentAssignmentId(document) === assignment._id
  );

  return requiredDocuments.filter((requiredDocument) => {
    return !relatedDocuments.some((document) =>
      isSameDocumentType(requiredDocument, document.documentType)
    );
  });
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [dashboardResponse, assignmentsResponse, documentsResponse] =
        await Promise.all([
          getAdminDashboardStats(),
          getAllAssignmentsForAdmin(),
          getAllDocumentsForAdmin(),
        ]);

      if (dashboardResponse?.success) {
        setDashboardData(dashboardResponse);
      } else {
        setErrorMessage(
          dashboardResponse?.message || "Unable to fetch dashboard data."
        );
      }

      if (assignmentsResponse?.success) {
        setAllAssignments(assignmentsResponse.assignments || []);
      }

      if (documentsResponse?.success) {
        setAllDocuments(documentsResponse.documents || []);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch dashboard data."
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
    if (!errorMessage) return;

    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  const dashboardStats = dashboardData?.stats || {};
  const recent = dashboardData?.recent || {};

  const recentAssignmentsRaw = recent.assignments || [];
  const recentDocuments = recent.documents || [];
  const recentClientFiles = recent.clientFiles || [];

  const completedAssignmentsCount = useMemo(() => {
    return allAssignments.filter((assignment) =>
      isCompletedAssignmentStatus(assignment.status)
    ).length;
  }, [allAssignments]);

  const activeAssignmentsCount = useMemo(() => {
    return allAssignments.filter(
      (assignment) => !isCompletedAssignmentStatus(assignment.status)
    ).length;
  }, [allAssignments]);

  const missingDocumentsCount = useMemo(() => {
    return allAssignments.reduce((total, assignment) => {
      return (
        total + getMissingDocumentsForAssignment(assignment, allDocuments).length
      );
    }, 0);
  }, [allAssignments, allDocuments]);

  const pendingDocumentCount = useMemo(() => {
    return allDocuments.filter((document) =>
      PENDING_DOCUMENT_STATUSES.includes(document.status)
    ).length;
  }, [allDocuments]);

  const approvedDocumentsCount = useMemo(() => {
    return allDocuments.filter((document) => document.status === "Approved")
      .length;
  }, [allDocuments]);

  const wrongOrRejectedDocumentsCount = useMemo(() => {
    return allDocuments.filter((document) =>
      WRONG_DOCUMENT_STATUSES.includes(document.status)
    ).length;
  }, [allDocuments]);

  const documentCompletionScore = useMemo(() => {
    const validationTotal =
      approvedDocumentsCount +
      pendingDocumentCount +
      wrongOrRejectedDocumentsCount +
      missingDocumentsCount;

    if (!validationTotal) return 0;

    return Math.round((approvedDocumentsCount / validationTotal) * 100);
  }, [
    approvedDocumentsCount,
    pendingDocumentCount,
    wrongOrRejectedDocumentsCount,
    missingDocumentsCount,
  ]);

  const overdueAssignments = useMemo(() => {
    return allAssignments.filter(isOverdueAssignment).length;
  }, [allAssignments]);

  const pendingFromClient = missingDocumentsCount + pendingDocumentCount;

  const stats = useMemo(() => {
    const totalClients = dashboardStats.clients?.total || 0;
    const totalStaff = dashboardStats.staff?.total || 0;

    // eslint-disable-next-line no-unused-vars
    const totalAssignments =
      allAssignments.length || dashboardStats.assignments?.total || 0;

    const activeAssignments =
      allAssignments.length > 0
        ? activeAssignmentsCount
        : Math.max(
            (dashboardStats.assignments?.total || 0) -
              (dashboardStats.assignments?.completed || 0),
            0
          );

    const documentsChecked =
      allDocuments.length > 0
        ? approvedDocumentsCount + wrongOrRejectedDocumentsCount
        : (dashboardStats.documents?.approved || 0) +
          (dashboardStats.documents?.wrong || 0) +
          (dashboardStats.documents?.rejected || 0);

    return [
      {
        title: "Total Clients",
        value: totalClients,
        icon: <Users />,
        color: "blue",
        path: "/admin/clients",
      },
      {
        title: "Total Staff",
        value: totalStaff,
        icon: <UserPlus />,
        color: "green",
        path: "/admin/staff",
      },
      {
        title: "Active Assignments",
        value: activeAssignments,
        icon: <ClipboardList />,
        color: "purple",
        path: "/admin/assignments",
      },
      {
        title: "Documents Checked",
        value: documentsChecked,
        icon: <FileCheck />,
        color: "orange",
        path: "/admin/document-check",
      },
    ];
  }, [
    dashboardStats,
    allAssignments.length,
    allDocuments.length,
    activeAssignmentsCount,
    approvedDocumentsCount,
    wrongOrRejectedDocumentsCount,
  ]);

  const assignments = useMemo(() => {
    const source =
      recentAssignmentsRaw.length > 0
        ? recentAssignmentsRaw
        : allAssignments.slice(0, 5);

    return source.map((assignment) => ({
      id: assignment._id,
      client: getClientName(assignment.client),
      service: assignment.serviceName || "-",
      staff: getStaffName(assignment.staff),
      dueDate: formatDate(assignment.dueDate),
      status: assignment.status || "Not Started",
    }));
  }, [recentAssignmentsRaw, allAssignments]);

  const quickActions = [
    {
      title: "Add Client",
      icon: <Users />,
      path: "/admin/clients",
    },
    {
      title: "Create Assignment",
      icon: <PlusCircle />,
      path: "/admin/assignments",
    },
    {
      title: "Staff Monitoring",
      icon: <UserPlus />,
      path: "/admin/staff",
    },
    {
      title: "Document Check",
      icon: <FileCheck />,
      path: "/admin/document-check",
    },
    {
      title: "Queries",
      icon: <MessageSquare />,
      path: "/admin/queries",
    },
    {
      title: "Reports",
      icon: <BarChart3 />,
      path: "/admin/reports",
    },
  ];

  const dueToday = useMemo(() => {
    return allAssignments
      .filter(isDueTodayAssignment)
      .slice(0, 5)
      .map((assignment) => ({
        id: assignment._id,
        client: getClientName(assignment.client),
        work: assignment.serviceName || "-",
        staff: getStaffName(assignment.staff),
        priority: assignment.priority || "Medium",
      }));
  }, [allAssignments]);

  const adminReviewQueue = useMemo(() => {
    const pendingClientFiles = recentClientFiles
      .filter((file) =>
        ["Pending Admin Approval", "Correction Required"].includes(file.status)
      )
      .map((file) => ({
        id: file._id,
        client: getClientName(file.client),
        work: file.fileTitle || file.fileCategory || "Client File",
        staff: file.uploadedBy || "Staff",
        file: file.originalName || file.fileName || "Uploaded File",
        status: file.status,
        path: "/admin/client-files",
      }));

    const pendingDocuments = recentDocuments
      .filter((document) =>
        ["Pending", "Uploaded", "Under Review", "Wrong Document"].includes(
          document.status
        )
      )
      .map((document) => ({
        id: document._id,
        client: getClientName(document.client),
        work: document.documentType || "Client Document",
        staff: document.uploadedBy || "Client",
        file: document.originalName || document.fileName || "Uploaded File",
        status: document.status,
        path: "/admin/document-check",
      }));

    return [...pendingClientFiles, ...pendingDocuments].slice(0, 5);
  }, [recentClientFiles, recentDocuments]);

  const totalUploadedDocuments = allDocuments.length;

  return (
    <div className="admin-page">
      <AdminSidebar active="dashboard" />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>
              Monitor CA office work, staff performance and client document
              status.
            </p>
          </div>

          <div className="admin-header-actions">
            <NotificationBell />

            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate("/admin/assignments")}
            >
              + Create Assignment
            </button>
          </div>
        </header>

        {errorMessage && (
          <section
            className="panel"
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              fontWeight: 700,
            }}
          >
            {errorMessage}
          </section>
        )}

        <section className="stats-grid">
          {stats.map((item, index) => (
            <div
              className={`stat-card ${item.color}`}
              key={index}
              onClick={() => navigate(item.path)}
            >
              <div className="stat-icon">{item.icon}</div>

              <div>
                <p>{item.title}</p>
                <h3>{loading ? "..." : item.value}</h3>
              </div>
            </div>
          ))}
        </section>

        <section className="quick-actions-panel panel">
          <div className="panel-header">
            <h2>Quick Actions</h2>
            <span>Admin Shortcuts</span>
          </div>

          <div className="quick-actions-grid">
            {quickActions.map((item, index) => (
              <button
                type="button"
                className="quick-action-btn"
                key={index}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel large-panel">
            <div className="panel-header">
              <h2>Recent Assignments</h2>
              <span onClick={() => navigate("/admin/assignments")}>
                View All
              </span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Staff</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      {loading
                        ? "Loading assignments..."
                        : "No recent assignments found."}
                    </td>
                  </tr>
                ) : (
                  assignments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.client}</td>
                      <td>{item.service}</td>
                      <td>{item.staff}</td>
                      <td>{item.dueDate}</td>
                      <td>
                        <span className="status-badge">{item.status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-view-btn"
                          onClick={() => navigate("/admin/assignments")}
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2>Work Summary</h2>

            <div
              className="summary-item clickable-summary"
              onClick={() => navigate("/admin/document-check")}
            >
              <Clock />
              <div>
                <h4>{loading ? "..." : pendingFromClient}</h4>
                <p>Pending from Client</p>
              </div>
            </div>

            <div
              className="summary-item clickable-summary"
              onClick={() => navigate("/admin/assignments")}
            >
              <AlertTriangle />
              <div>
                <h4>{loading ? "..." : overdueAssignments}</h4>
                <p>Overdue Assignments</p>
              </div>
            </div>

            <div
              className="summary-item clickable-summary"
              onClick={() => navigate("/admin/reports")}
            >
              <CheckCircle />
              <div>
                <h4>{loading ? "..." : completedAssignmentsCount}</h4>
                <p>Completed Work</p>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-extra-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Due Today</h2>
              <span onClick={() => navigate("/admin/assignments")}>
                Open Assignments
              </span>
            </div>

            <div className="due-list">
              {dueToday.length === 0 ? (
                <div className="due-card">
                  <div className="due-icon">
                    <CalendarDays />
                  </div>

                  <div>
                    <h3>No work due today</h3>
                    <p>There are no assignments due today.</p>
                    <small>Open assignments for complete list</small>
                  </div>
                </div>
              ) : (
                dueToday.map((item) => (
                  <div className="due-card" key={item.id}>
                    <div className="due-icon">
                      <CalendarDays />
                    </div>

                    <div>
                      <h3>{item.client}</h3>
                      <p>{item.work}</p>
                      <small>Assigned to {item.staff}</small>
                    </div>

                    <span
                      className={
                        item.priority === "High"
                          ? "priority-badge high"
                          : "priority-badge medium"
                      }
                    >
                      {item.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Pending Admin Review</h2>
              <span onClick={() => navigate("/admin/client-files")}>
                Review Queue
              </span>
            </div>

            <div className="review-list">
              {adminReviewQueue.length === 0 ? (
                <div className="review-card-small">
                  <div className="review-small-icon">
                    <FileCheck />
                  </div>

                  <div>
                    <h3>No pending review</h3>
                    <p>No recent files or documents pending admin review.</p>
                    <small>Everything looks clear</small>
                  </div>
                </div>
              ) : (
                adminReviewQueue.map((item) => (
                  <div className="review-card-small" key={item.id}>
                    <div className="review-small-icon">
                      <FileCheck />
                    </div>

                    <div>
                      <h3>{item.client}</h3>
                      <p>{item.work}</p>
                      <small>
                        {item.staff} uploaded {item.file}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="review-small-btn"
                      onClick={() => navigate(item.path)}
                    >
                      Review
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>AI Document Check Overview</h2>
            <span onClick={() => navigate("/admin/document-check")}>
              Smart Validator
            </span>
          </div>

          <div
            className="doc-check-box"
            onClick={() => navigate("/admin/document-check")}
          >
            <div>
              <h3>Document Validation Summary</h3>
              <p>
                System detected {totalUploadedDocuments} uploaded document(s),{" "}
                {approvedDocumentsCount} approved document(s),{" "}
                {missingDocumentsCount} missing required document(s),{" "}
                {pendingDocumentCount} pending or under review document(s), and{" "}
                {wrongOrRejectedDocumentsCount} wrong or rejected document(s).
              </p>
            </div>

            <div className="doc-score">
              <strong>{documentCompletionScore}%</strong>
              <span>Completion Score</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
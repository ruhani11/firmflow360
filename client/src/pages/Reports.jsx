import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  FileText,
  Download,
  Users,
  ClipboardList,
  CheckCircle,
  Clock,
  TrendingUp,
  PieChart,
  CalendarDays,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";

import { getAllClients, getAllStaff } from "../services/adminService";
import { getAllAssignmentsForAdmin } from "../services/assignmentService";
import { getAllDocumentsForAdmin } from "../services/documentService";
import { getAdminDashboardStats } from "../services/dashboardService";

import "./Reports.css";

export default function Reports() {
  const [dashboardData, setDashboardData] = useState(null);
  const [clients, setClients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const completedStatuses = ["Approved", "Completed"];

  const reviewStatuses = [
    "Submitted for Review",
    "Working File Prepared",
    "Correction Required",
  ];

  const reports = [
    {
      key: "monthly-staff-login-report",
      title: "Monthly Staff Login / Logout Report",
      description:
        "Staff-wise monthly login, last logout, online status and workload summary.",
      type: "CSV",
      icon: <Clock />,
    },
    {
      key: "monthly-work-summary",
      title: "Monthly Work Summary",
      description:
        "Overall summary of assignments completed, pending and under review.",
      type: "CSV",
      icon: <BarChart3 />,
    },
    {
      key: "client-pending-document-report",
      title: "Client Pending Document Report",
      description:
        "List of clients whose required documents are pending or incomplete.",
      type: "CSV",
      icon: <FileText />,
    },
    {
      key: "staff-performance-report",
      title: "Staff Performance Report",
      description:
        "Staff-wise assignment count, completion status and pending workload.",
      type: "CSV",
      icon: <TrendingUp />,
    },
    {
      key: "document-check-report",
      title: "AI Document Check Report",
      description:
        "Verified, missing, wrong and manual review document status report.",
      type: "CSV",
      icon: <PieChart />,
    },
  ];

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const [
        dashboardResponse,
        clientsResponse,
        staffResponse,
        assignmentsResponse,
        documentsResponse,
      ] = await Promise.all([
        getAdminDashboardStats(),
        getAllClients(),
        getAllStaff(),
        getAllAssignmentsForAdmin(),
        getAllDocumentsForAdmin(),
      ]);

      if (dashboardResponse?.success) {
        setDashboardData(dashboardResponse);
      }

      if (clientsResponse?.success) {
        setClients(clientsResponse.clients || []);
      }

      if (staffResponse?.success) {
        setStaffList(staffResponse.staff || []);
      }

      if (assignmentsResponse?.success) {
        setAssignments(assignmentsResponse.assignments || []);
      }

      if (documentsResponse?.success) {
        setDocuments(documentsResponse.documents || []);
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch reports data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReportsData();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

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

  const getAssignmentClientName = (assignment) => {
    return getClientName(assignment.client);
  };

  const getAssignmentStaffName = (assignment) => {
    return getStaffName(assignment.staff);
  };

  const normalizeText = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase();
  };

  const getDocumentAssignmentId = (document) => {
    if (!document?.assignment) return "";

    return typeof document.assignment === "string"
      ? document.assignment
      : document.assignment._id;
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
    return documents.filter(
      (document) => getDocumentAssignmentId(document) === assignment._id
    );
  };

  const getMissingDocumentsForAssignment = (assignment) => {
    const requiredDocuments = assignment.requiredDocuments || [];

    if (requiredDocuments.length === 0) return [];

    const relatedDocuments = getRelatedDocuments(assignment);

    return requiredDocuments.filter((requiredDocument) => {
      return !relatedDocuments.some((document) =>
        isSameDocumentType(requiredDocument, document.documentType)
      );
    });
  };

  const getPendingDocsCount = (assignment) => {
    return getMissingDocumentsForAssignment(assignment).length;
  };

  const isCompletedAssignment = (assignment) => {
    return completedStatuses.includes(assignment.status);
  };

  const isOverdueAssignment = (assignment) => {
    if (!assignment.dueDate || isCompletedAssignment(assignment)) return false;

    const dueDate = new Date(assignment.dueDate);
    const today = new Date();

    if (Number.isNaN(dueDate.getTime())) return false;

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
  };

  const formatPercent = (numerator, denominator) => {
    if (!denominator) return "0%";

    return `${Math.round((numerator / denominator) * 100)}%`;
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateOnly = (dateValue) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return dateValue;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getLastLogoutText = (staff) => {
    if (staff.onlineStatus === "Online") {
      return "Currently Online";
    }

    if (staff.onlineStatus === "Idle") {
      return "Currently Idle";
    }

    return formatDateTime(staff.lastLogoutAt);
  };

  const getMonthFilePart = () => {
    return new Date()
      .toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
      .replace(/\s+/g, "-")
      .toLowerCase();
  };

  const reportStats = useMemo(() => {
    const totalClients =
      dashboardData?.stats?.clients?.total ?? clients.length ?? 0;

    const totalAssignments =
      dashboardData?.stats?.assignments?.total ?? assignments.length ?? 0;

    const completedWork = assignments.filter((assignment) =>
      completedStatuses.includes(assignment.status)
    ).length;

    const pendingWork = assignments.filter(
      (assignment) => !completedStatuses.includes(assignment.status)
    ).length;

    return [
      {
        title: "Total Clients",
        value: totalClients,
        icon: <Users />,
        color: "blue",
      },
      {
        title: "Assignments",
        value: totalAssignments,
        icon: <ClipboardList />,
        color: "purple",
      },
      {
        title: "Completed Work",
        value: completedWork,
        icon: <CheckCircle />,
        color: "green",
      },
      {
        title: "Pending Work",
        value: pendingWork,
        icon: <Clock />,
        color: "orange",
      },
    ];
  }, [dashboardData, clients.length, assignments]);

  const staffPerformance = useMemo(() => {
    return staffList.map((staff) => {
      const staffAssignments = assignments.filter(
        (assignment) => assignment.staff?._id === staff._id
      );

      const assigned = staffAssignments.length;

      const completed = staffAssignments.filter((assignment) =>
        completedStatuses.includes(assignment.status)
      ).length;

      const pending = assigned - completed;

      return {
        id: staff._id,
        name: getStaffName(staff),
        assigned,
        completed,
        pending,
        efficiency: formatPercent(completed, assigned),
      };
    });
  }, [staffList, assignments]);

  const clientSummary = useMemo(() => {
    return assignments
      .map((assignment) => ({
        id: assignment._id,
        client: getAssignmentClientName(assignment),
        service: assignment.serviceName || "-",
        status: assignment.status || "Not Started",
        pendingDocs: getPendingDocsCount(assignment),
      }))
      .sort((a, b) => b.pendingDocs - a.pendingDocs)
      .slice(0, 10);
  }, [assignments, documents]);

  const totalMissingDocuments = useMemo(() => {
    return assignments.reduce((total, assignment) => {
      return total + getMissingDocumentsForAssignment(assignment).length;
    }, 0);
  }, [assignments, documents]);

  const overdueAssignments = useMemo(() => {
    return assignments.filter(isOverdueAssignment).length;
  }, [assignments]);

  const completedAssignments = useMemo(() => {
    return assignments.filter(isCompletedAssignment).length;
  }, [assignments]);

  const approvedDocuments = documents.filter(
    (document) => document.status === "Approved"
  ).length;

  const documentReviewBase = documents.filter((document) =>
    ["Approved", "Wrong Document", "Rejected"].includes(document.status)
  ).length;

  const aiReviewAccuracy = formatPercent(approvedDocuments, documentReviewBase);

  const completionRate = formatPercent(completedAssignments, assignments.length);

  const currentReportingPeriod = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const getStatusClass = (status) => {
    if (status === "In Progress") return "progress";
    if (status === "Pending Documents") return "pending";

    if (reviewStatuses.includes(status)) {
      return "review";
    }

    if (completedStatuses.includes(status)) {
      return "completed";
    }

    return "not-started";
  };

  const escapeCSVValue = (value) => {
    const stringValue = String(value ?? "");

    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const downloadCSV = (fileName, rows) => {
    if (!rows || rows.length === 0) {
      showError("No data available for this report.");
      return;
    }

    const headers = Object.keys(rows[0]);

    const csvContent = [
      headers.map(escapeCSVValue).join(","),
      ...rows.map((row) =>
        headers.map((header) => escapeCSVValue(row[header])).join(",")
      ),
    ].join("\n");

    const excelFriendlyContent = `\uFEFF${csvContent}`;

    const blob = new Blob([excelFriendlyContent], {
      type: "text/csv;charset=utf-8;",
    });

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = blobUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(blobUrl);

    showSuccess("Report downloaded successfully.");
  };

  const buildMonthlyStaffLoginRows = () => {
    return staffList.map((staff) => {
      const staffAssignments = assignments.filter(
        (assignment) => assignment.staff?._id === staff._id
      );

      const assigned = staffAssignments.length;

      const completed = staffAssignments.filter((assignment) =>
        completedStatuses.includes(assignment.status)
      ).length;

      const pending = assigned - completed;

      return {
        Report_Month: currentReportingPeriod,
        Staff_Name: getStaffName(staff),
        Email: staff.user?.email || "-",
        Mobile: staff.mobile || "-",
        Designation: staff.designation || "-",
        Department: staff.department || "-",
        Online_Status: staff.onlineStatus || "Offline",
        Daily_Login: formatDateTime(staff.lastLoginAt),
        Last_Logout: getLastLogoutText(staff),
        Last_Active: formatDateTime(staff.lastActiveAt),
        Current_Page: staff.currentPage || "-",
        Assigned_Work: assigned,
        Completed_Work: completed,
        Pending_Work: pending,
        Efficiency: formatPercent(completed, assigned),
      };
    });
  };

  const buildMonthlyWorkSummaryRows = () => {
    return assignments.map((assignment) => ({
      Client: getAssignmentClientName(assignment),
      Service: assignment.serviceName || "-",
      Staff: getAssignmentStaffName(assignment),
      Period: assignment.period || "-",
      Due_Date: formatDateOnly(assignment.dueDate),
      Priority: assignment.priority || "-",
      Status: assignment.status || "-",
      Completion_Percent: assignment.completionPercent || 0,
      Required_Documents: (assignment.requiredDocuments || []).length,
      Pending_Documents: getPendingDocsCount(assignment),
      Overdue: isOverdueAssignment(assignment) ? "Yes" : "No",
    }));
  };

  const buildPendingDocumentRows = () => {
    return assignments
      .map((assignment) => {
        const missingDocuments = getMissingDocumentsForAssignment(assignment);

        return {
          Client: getAssignmentClientName(assignment),
          Service: assignment.serviceName || "-",
          Period: assignment.period || "-",
          Status: assignment.status || "-",
          Required_Documents: (assignment.requiredDocuments || []).length,
          Pending_Documents: missingDocuments.length,
          Missing_Document_List: missingDocuments.join(" | ") || "-",
        };
      })
      .filter((row) => row.Pending_Documents > 0);
  };

  const buildStaffPerformanceRows = () => {
    return staffPerformance.map((staff) => ({
      Staff: staff.name,
      Assigned: staff.assigned,
      Completed: staff.completed,
      Pending: staff.pending,
      Efficiency: staff.efficiency,
    }));
  };

  const buildDocumentCheckRows = () => {
    return documents.map((document) => ({
      Client: getClientName(document.client),
      Service: document.assignment?.serviceName || document.serviceName || "-",
      Period: document.assignment?.period || document.period || "-",
      Document_Type: document.documentType || "-",
      Uploaded_File: document.originalName || document.fileName || "-",
      Uploaded_By: document.uploadedBy || "-",
      Upload_Source: document.uploadSource || "-",
      Status: document.status || "-",
      Admin_Remark: document.adminRemark || "-",
      Remarks: document.remarks || "-",
    }));
  };

  const handleExportReport = (reportKey) => {
    const monthPart = getMonthFilePart();

    if (reportKey === "monthly-staff-login-report") {
      downloadCSV(
        `monthly-staff-login-report-${monthPart}.csv`,
        buildMonthlyStaffLoginRows()
      );
      return;
    }

    if (reportKey === "monthly-work-summary") {
      downloadCSV(
        `monthly-work-summary-${monthPart}.csv`,
        buildMonthlyWorkSummaryRows()
      );
      return;
    }

    if (reportKey === "client-pending-document-report") {
      downloadCSV(
        `client-pending-document-report-${monthPart}.csv`,
        buildPendingDocumentRows()
      );
      return;
    }

    if (reportKey === "staff-performance-report") {
      downloadCSV(
        `staff-performance-report-${monthPart}.csv`,
        buildStaffPerformanceRows()
      );
      return;
    }

    if (reportKey === "document-check-report") {
      downloadCSV(
        `document-check-report-${monthPart}.csv`,
        buildDocumentCheckRows()
      );
      return;
    }

    showError("Invalid report selected.");
  };

  return (
    <div className="reports-page">
      <AdminSidebar active="reports" />

      <main className="reports-main">
        <header className="reports-header">
          <div>
            <h1>Reports & Analytics</h1>
            <p>
              View CA office performance, client pending documents, staff
              workload and downloadable reports.
            </p>
          </div>

          <button
            type="button"
            className="download-main-btn"
            onClick={() =>
              downloadCSV(
                `monthly-staff-login-report-${getMonthFilePart()}.csv`,
                buildMonthlyStaffLoginRows()
              )
            }
            disabled={loading}
          >
            <Download size={18} />
            Download Monthly Report
          </button>
        </header>

        {errorMessage && (
          <div
            className="reports-panel"
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
          </div>
        )}

        {successMessage && (
          <div
            className="reports-panel"
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              fontWeight: 700,
            }}
          >
            {successMessage}
          </div>
        )}

        <section className="reports-stats-grid">
          {reportStats.map((item, index) => (
            <div className="reports-stat-card" key={index}>
              <div className={`reports-stat-icon ${item.color}`}>
                {item.icon}
              </div>

              <div>
                <p>{item.title}</p>
                <h3>{loading ? "..." : item.value}</h3>
              </div>
            </div>
          ))}
        </section>

        <section className="reports-layout">
          <div className="reports-panel">
            <div className="reports-panel-header">
              <h2>Available Reports</h2>
              <span>Export Center</span>
            </div>

            <div className="report-card-list">
              {reports.map((report) => (
                <div className="report-card" key={report.key}>
                  <div className="report-card-left">
                    <div className="report-icon">{report.icon}</div>

                    <div>
                      <h3>{report.title}</h3>
                      <p>{report.description}</p>
                      <small>Format: {report.type}</small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="report-download-btn"
                    onClick={() => handleExportReport(report.key)}
                    disabled={loading}
                  >
                    <Download size={16} />
                    Export
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="reports-panel">
            <h2>Monthly Snapshot</h2>

            <div className="snapshot-box">
              <CalendarDays />
              <div>
                <h3>{currentReportingPeriod}</h3>
                <p>Current reporting period</p>
              </div>
            </div>

            <div className="snapshot-list">
              <div>
                <span>Completion Rate</span>
                <strong>{completionRate}</strong>
              </div>

              <div>
                <span>Pending Documents</span>
                <strong>{totalMissingDocuments}</strong>
              </div>

              <div>
                <span>Overdue Assignments</span>
                <strong>{overdueAssignments}</strong>
              </div>

              <div>
                <span>AI Review Accuracy</span>
                <strong>{aiReviewAccuracy}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="reports-grid-bottom">
          <div className="reports-panel">
            <div className="reports-panel-header">
              <h2>Staff Performance</h2>
              <span>Workload Analysis</span>
            </div>

            <div className="reports-table">
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Efficiency</th>
                  </tr>
                </thead>

                <tbody>
                  {staffPerformance.length === 0 ? (
                    <tr>
                      <td colSpan="5">No staff performance data available.</td>
                    </tr>
                  ) : (
                    staffPerformance.map((staff) => (
                      <tr key={staff.id}>
                        <td>{staff.name}</td>
                        <td>{staff.assigned}</td>
                        <td>{staff.completed}</td>
                        <td>{staff.pending}</td>
                        <td>
                          <span className="efficiency-badge">
                            {staff.efficiency}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="reports-panel">
            <div className="reports-panel-header">
              <h2>Client Pending Summary</h2>
              <span>Document Follow-up</span>
            </div>

            <div className="reports-table">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Pending Docs</th>
                  </tr>
                </thead>

                <tbody>
                  {clientSummary.length === 0 ? (
                    <tr>
                      <td colSpan="4">No client pending summary available.</td>
                    </tr>
                  ) : (
                    clientSummary.map((client) => (
                      <tr key={client.id}>
                        <td>{client.client}</td>
                        <td>{client.service}</td>
                        <td>
                          <span
                            className={`report-status ${getStatusClass(
                              client.status
                            )}`}
                          >
                            {client.status}
                          </span>
                        </td>
                        <td>{client.pendingDocs}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
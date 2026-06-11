import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  Eye,
  FileText,
  UserRound,
  CalendarDays,
  MessageSquare,
  RefreshCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import ClientSidebar from "../components/ClientSidebar";

import { getMyClientServices } from "../services/assignmentService";
import { getMyClientDocuments } from "../services/documentService";

import "./ClientServices.css";

export default function ClientServices() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchClientServicesData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [serviceData, documentData] = await Promise.all([
        getMyClientServices(),
        getMyClientDocuments(),
      ]);

      if (serviceData?.success) {
        setServices(serviceData.services || serviceData.assignments || []);
      } else {
        setErrorMessage(serviceData?.message || "Unable to fetch services.");
      }

      if (documentData?.success) {
        setDocuments(documentData.documents || []);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch services."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientServicesData();
  }, []);

  useEffect(() => {
    if (!errorMessage) return;

    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  const normalizeText = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase();
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

  const getStaffName = (staff) => {
    if (!staff) return "Not Assigned";

    return (
      staff.user?.name ||
      staff.name ||
      staff.fullName ||
      staff.email ||
      "Office Staff"
    );
  };

  const getAssignmentId = (assignment) => {
    if (!assignment) return "";

    return typeof assignment === "string" ? assignment : assignment._id;
  };

  const getDocumentAssignmentId = (document) => {
    return getAssignmentId(document.assignment);
  };

  const getDocumentClientId = (document) => {
    if (!document?.client) return "";

    return typeof document.client === "string"
      ? document.client
      : document.client._id;
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

  const getRelatedDocuments = (service) => {
    const serviceId = service._id;
    const clientId =
      typeof service.client === "string" ? service.client : service.client?._id;
    const serviceName = normalizeText(service.serviceName);

    return documents.filter((document) => {
      const linkedAssignmentId = getDocumentAssignmentId(document);

      if (linkedAssignmentId && linkedAssignmentId === serviceId) {
        return true;
      }

      const sameClient = clientId
        ? getDocumentClientId(document) === clientId
        : true;

      const sameService =
        normalizeText(document.serviceName) &&
        normalizeText(document.serviceName) === serviceName;

      return sameClient && sameService;
    });
  };

  const getPendingDocs = (service) => {
    const requiredDocuments = service.requiredDocuments || [];
    const relatedDocuments = getRelatedDocuments(service);

    return requiredDocuments.filter((requiredDoc) => {
      return !relatedDocuments.find((document) =>
        isSameDocumentType(requiredDoc, document.documentType)
      );
    });
  };

  const getProgress = (service) => {
    const value = Number(service.completionPercent || 0);

    return `${Math.min(Math.max(value, 0), 100)}%`;
  };

  const getStatusClass = (status) => {
    if (status === "In Progress") return "progress";
    if (status === "Pending Documents") return "pending";
    if (status === "Submitted for Review") return "review";
    if (status === "Correction Required") return "correction";
    if (status === "Approved" || status === "Completed") return "completed";
    if (status === "Not Started") return "not-started";

    return "normal";
  };

  const getLatestUpdate = (service, pendingDocs) => {
    if (service.instructions) {
      return service.instructions;
    }

    if (service.status === "Completed") {
      return "This service has been completed by the office.";
    }

    if (service.status === "Approved") {
      return "Work has been approved and is awaiting final closure or sharing.";
    }

    if (service.status === "Submitted for Review") {
      return "Work has been submitted for internal review.";
    }

    if (service.status === "Correction Required") {
      return "Correction is required. Please check office remarks or contact staff.";
    }

    if (pendingDocs.length > 0) {
      return `${pendingDocs.length} document(s) are pending. Please upload required documents to continue the work.`;
    }

    if (service.status === "In Progress") {
      return "Office team is working on this service.";
    }

    return "Service has been assigned by the office.";
  };

  const serviceRows = useMemo(() => {
    return services.map((service) => {
      const pendingDocs = getPendingDocs(service);

      return {
        id: service._id,
        service: service.serviceName || "-",
        period: service.period || "-",
        assignedStaff: getStaffName(service.staff),
        dueDate: formatDate(service.dueDate),
        status: service.status || "Not Started",
        pendingDocsCount: pendingDocs.length,
        progress: getProgress(service),
        requiredDocs: service.requiredDocuments || [],
        latestUpdate: getLatestUpdate(service, pendingDocs),
        rawService: service,
      };
    });
  }, [services, documents]);

  const activeServices = serviceRows.length;

  const inProgress = serviceRows.filter(
    (item) => item.status === "In Progress"
  ).length;

  const pendingDocuments = serviceRows.reduce(
    (total, item) => total + item.pendingDocsCount,
    0
  );

  const underReview = serviceRows.filter((item) =>
    ["Submitted for Review", "Approved"].includes(item.status)
  ).length;

  const handleUploadDocuments = () => {
    navigate("/client/documents");
  };

  const handleRaiseQuery = () => {
    navigate("/client/queries");
  };

  return (
    <div className="client-services-page">
      <ClientSidebar active="services" />

      <main className="client-services-main">
        <header className="client-services-header">
          <div>
            <h1>My Services</h1>
            <p>
              View all services assigned by the CA office, track progress, check
              pending documents and upload required files.
            </p>
          </div>

          <div className="client-services-header-actions">
            <button
              type="button"
              className="client-service-refresh-btn"
              onClick={fetchClientServicesData}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="client-service-upload-btn"
              onClick={handleUploadDocuments}
            >
              <Upload size={18} />
              Upload Pending Documents
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="client-service-message error">{errorMessage}</div>
        )}

        <section className="client-service-stats">
          <div className="client-service-stat-card">
            <div className="client-service-stat-icon blue">
              <BriefcaseBusiness />
            </div>
            <div>
              <p>Active Services</p>
              <h3>{loading ? "..." : activeServices}</h3>
            </div>
          </div>

          <div className="client-service-stat-card">
            <div className="client-service-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>In Progress</p>
              <h3>{loading ? "..." : inProgress}</h3>
            </div>
          </div>

          <div className="client-service-stat-card">
            <div className="client-service-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Pending Documents</p>
              <h3>{loading ? "..." : pendingDocuments}</h3>
            </div>
          </div>

          <div className="client-service-stat-card">
            <div className="client-service-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Under Review</p>
              <h3>{loading ? "..." : underReview}</h3>
            </div>
          </div>
        </section>

        <section className="client-service-panel">
          <div className="client-service-panel-header">
            <div>
              <h2>Service Work Status</h2>
              <p>Track each service and its document requirement.</p>
            </div>
          </div>

          <div className="client-service-list-page">
            {loading && serviceRows.length === 0 ? (
              <div className="client-service-empty-state">
                Loading services...
              </div>
            ) : serviceRows.length === 0 ? (
              <div className="client-service-empty-state">
                No services assigned yet.
              </div>
            ) : (
              serviceRows.map((item) => (
                <div className="client-service-detail-card" key={item.id}>
                  <div className="client-service-top">
                    <div className="client-service-name-box">
                      <div className="client-service-user-icon">
                        <BriefcaseBusiness />
                      </div>

                      <div>
                        <h3>{item.service}</h3>
                        <p>{item.period}</p>
                        <small>
                          <UserRound size={14} />
                          Assigned Staff: {item.assignedStaff}
                        </small>
                      </div>
                    </div>

                    <div className="client-service-date-box">
                      <p>Due Date</p>
                      <h4>
                        <CalendarDays size={15} />
                        {item.dueDate}
                      </h4>
                    </div>

                    <div className="client-service-status-box">
                      <span
                        className={`client-service-status ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                      <small>{item.pendingDocsCount} pending docs</small>
                    </div>

                    <div className="client-service-progress-box">
                      <p>Progress</p>
                      <h4>{item.progress}</h4>
                    </div>

                    <div className="client-service-actions">
                      <button type="button" onClick={handleUploadDocuments}>
                        <Upload size={15} />
                        Upload
                      </button>

                      <button type="button" onClick={handleRaiseQuery}>
                        <MessageSquare size={15} />
                        Query
                      </button>
                    </div>
                  </div>

                  <div className="client-service-update-box">
                    <h4>
                      <Eye size={16} />
                      Latest Update
                    </h4>
                    <p>{item.latestUpdate}</p>
                  </div>

                  <div className="client-service-docs-box">
                    <h4>
                      <FileText size={16} />
                      Required Documents
                    </h4>

                    <div className="client-service-doc-tags">
                      {item.requiredDocs.length === 0 ? (
                        <span>No document checklist added</span>
                      ) : (
                        item.requiredDocs.map((doc, docIndex) => (
                          <span key={docIndex}>{doc}</span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
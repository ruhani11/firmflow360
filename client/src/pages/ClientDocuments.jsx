import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  Send,
  X,
  Search,
  BriefcaseBusiness,
  RefreshCcw,
} from "lucide-react";

import ClientSidebar from "../components/ClientSidebar";

import { getMyClientServices } from "../services/assignmentService";

import {
  getMyClientDocuments,
  uploadDocumentByClient,
  replaceDocumentFile,
  downloadDocument,
  viewDocument,
} from "../services/documentService";

import "./ClientDocuments.css";

const DEFAULT_DOCUMENT_TYPES = [
  "Sales Register",
  "Purchase Register",
  "Bank Statement",
  "Form 16",
  "Form 16 / Salary Details",
  "PAN Card",
  "Aadhaar Card",
  "Capital Gain Statement",
  "Bank Interest Certificate",
  "Deduction Proofs",
  "Expense Vouchers",
  "GST Challan",
  "GSTR-1",
  "GSTR-3B",
  "Other Supporting Document",
];

export default function ClientDocuments() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [services, setServices] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [uploadForm, setUploadForm] = useState({
    assignmentId: "",
    serviceName: "",
    period: "",
    documentType: "",
    remarks: "",
    file: null,
  });

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const fetchClientDocumentsData = async () => {
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
        showError(serviceData?.message || "Unable to fetch services.");
      }

      if (documentData?.success) {
        setDocuments(documentData.documents || []);
      } else {
        showError(documentData?.message || "Unable to fetch documents.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch client documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientDocumentsData();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const resetUploadForm = () => {
    setUploadForm({
      assignmentId: "",
      serviceName: "",
      period: "",
      documentType: "",
      remarks: "",
      file: null,
    });
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

  const getAssignmentId = (assignment) => {
    if (!assignment) return "";
    return typeof assignment === "string" ? assignment : assignment._id;
  };

  const getDocumentAssignmentId = (document) => {
    return getAssignmentId(document.assignment);
  };

  const getFileName = (document) => {
    return document?.originalName || document?.fileName || "Uploaded File";
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
    const serviceName = normalizeText(service.serviceName);

    return documents.filter((document) => {
      const linkedAssignmentId = getDocumentAssignmentId(document);

      if (linkedAssignmentId && linkedAssignmentId === serviceId) {
        return true;
      }

      const sameService =
        normalizeText(document.serviceName) &&
        normalizeText(document.serviceName) === serviceName;

      return sameService;
    });
  };

  const getDisplayStatus = (document) => {
    if (!document) return "Pending";

    if (document.status === "Approved" || document.status === "Uploaded") {
      return "Uploaded";
    }

    if (document.status === "Under Review" || document.status === "Pending") {
      return "Under Review";
    }

    if (document.status === "Wrong Document") {
      return "Wrong Document";
    }

    if (document.status === "Rejected") {
      return "Not Clear";
    }

    return document.status || "Under Review";
  };

  const getStatusClass = (status) => {
    if (status === "Uploaded") return "uploaded";
    if (status === "Pending") return "pending";
    if (status === "Under Review") return "review";
    if (status === "Wrong Document") return "wrong";
    if (status === "Not Clear") return "not-clear";
    return "normal";
  };

  const getSourceClass = (source) => {
    if (source === "Client Portal") return "portal";
    if (source === "WhatsApp") return "whatsapp";
    if (source === "Email") return "email";
    return "normal";
  };

  const canReplaceDocument = (doc) => {
    const backendStatus = doc?.rawDocument?.status;

    return (
      doc?.rawDocument?._id &&
      [
        "Under Review",
        "Pending",
        "Uploaded",
        "Wrong Document",
        "Rejected",
      ].includes(backendStatus)
    );
  };

  const canUploadDocument = (doc) => {
    return !doc?.rawDocument && doc.status === "Pending";
  };

  const documentRows = useMemo(() => {
    const rows = [];
    const usedDocumentIds = new Set();

    services.forEach((service) => {
      const requiredDocuments = service.requiredDocuments || [];
      const relatedDocuments = getRelatedDocuments(service);

      requiredDocuments.forEach((requiredDoc) => {
        const matchedDocument = relatedDocuments.find((document) =>
          isSameDocumentType(requiredDoc, document.documentType)
        );

        if (matchedDocument?._id) {
          usedDocumentIds.add(matchedDocument._id);
        }

        rows.push({
          id: matchedDocument?._id || `${service._id}-${requiredDoc}`,
          service: service.serviceName || "-",
          period: service.period || "",
          assignmentId: service._id,
          documentType: requiredDoc,
          fileName: matchedDocument
            ? getFileName(matchedDocument)
            : "Not Uploaded",
          uploadedOn: matchedDocument?.createdAt
            ? formatDate(matchedDocument.createdAt)
            : "-",
          uploadedBy: matchedDocument?.uploadedBy || "-",
          uploadSource: matchedDocument?.uploadSource || "-",
          status: getDisplayStatus(matchedDocument),
          remarks:
            matchedDocument?.adminRemark ||
            matchedDocument?.remarks ||
            (matchedDocument
              ? "Document uploaded for CA office verification."
              : "Required document has not been uploaded yet."),
          rawDocument: matchedDocument || null,
          rawService: service,
        });
      });

      relatedDocuments.forEach((document) => {
        if (usedDocumentIds.has(document._id)) return;

        usedDocumentIds.add(document._id);

        rows.push({
          id: document._id,
          service: document.serviceName || service.serviceName || "-",
          period: document.period || service.period || "",
          assignmentId: getDocumentAssignmentId(document) || service._id,
          documentType: document.documentType || "Other Supporting Document",
          fileName: getFileName(document),
          uploadedOn: document.createdAt ? formatDate(document.createdAt) : "-",
          uploadedBy: document.uploadedBy || "-",
          uploadSource: document.uploadSource || "-",
          status: getDisplayStatus(document),
          remarks:
            document.adminRemark ||
            document.remarks ||
            "Document uploaded for CA office verification.",
          rawDocument: document,
          rawService: service,
        });
      });
    });

    documents.forEach((document) => {
      if (usedDocumentIds.has(document._id)) return;

      usedDocumentIds.add(document._id);

      rows.push({
        id: document._id,
        service: document.serviceName || "Other Service",
        period: document.period || "",
        assignmentId: getDocumentAssignmentId(document),
        documentType: document.documentType || "Other Supporting Document",
        fileName: getFileName(document),
        uploadedOn: document.createdAt ? formatDate(document.createdAt) : "-",
        uploadedBy: document.uploadedBy || "-",
        uploadSource: document.uploadSource || "-",
        status: getDisplayStatus(document),
        remarks:
          document.adminRemark ||
          document.remarks ||
          "Document uploaded for CA office verification.",
        rawDocument: document,
        rawService: null,
      });
    });

    return rows;
  }, [services, documents]);

  const filteredDocuments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return documentRows;

    return documentRows.filter((doc) => {
      return (
        doc.service.toLowerCase().includes(term) ||
        doc.documentType.toLowerCase().includes(term) ||
        doc.fileName.toLowerCase().includes(term) ||
        doc.status.toLowerCase().includes(term) ||
        doc.uploadSource.toLowerCase().includes(term)
      );
    });
  }, [documentRows, searchTerm]);

  const totalDocs = documentRows.length;

  const uploadedDocs = documentRows.filter(
    (doc) => doc.status === "Uploaded"
  ).length;

  const pendingDocs = documentRows.filter(
    (doc) => doc.status === "Pending"
  ).length;

  const reviewDocs = documentRows.filter(
    (doc) => doc.status === "Under Review"
  ).length;

  const issueDocs = documentRows.filter((doc) =>
    ["Wrong Document", "Not Clear"].includes(doc.status)
  ).length;

  const selectedService = useMemo(() => {
    if (!uploadForm.assignmentId) return null;

    return services.find((service) => service._id === uploadForm.assignmentId);
  }, [services, uploadForm.assignmentId]);

  const documentTypeOptions = useMemo(() => {
    const serviceDocs = selectedService?.requiredDocuments || [];

    return Array.from(new Set([...serviceDocs, ...DEFAULT_DOCUMENT_TYPES]));
  }, [selectedService]);

  const openUploadForm = (doc = null) => {
    if (doc) {
      setSelectedDocument(doc);

      setUploadForm({
        assignmentId: doc.assignmentId || "",
        serviceName: doc.service || "",
        period: doc.period || "",
        documentType:
          doc.documentType === "Other Supporting Document"
            ? ""
            : doc.documentType || "",
        remarks: canReplaceDocument(doc)
          ? `Revised file uploaded for ${doc.status}.`
          : "",
        file: null,
      });
    } else {
      setSelectedDocument(null);
      resetUploadForm();
    }

    setShowUploadForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeUploadForm = () => {
    if (uploading) return;

    setSelectedDocument(null);
    resetUploadForm();
    setShowUploadForm(false);
    setErrorMessage("");
  };

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "file") {
      setUploadForm((prev) => ({
        ...prev,
        file: files?.[0] || null,
      }));
      return;
    }

    if (name === "assignmentId") {
      const service = services.find((item) => item._id === value);

      setUploadForm((prev) => ({
        ...prev,
        assignmentId: value,
        serviceName: service?.serviceName || "",
        period: service?.period || "",
        documentType: "",
      }));
      return;
    }

    setUploadForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleViewDocument = async (doc) => {
    if (!doc?.rawDocument?._id) return;

    try {
      await viewDocument(doc.rawDocument._id);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to view document."
      );
    }
  };

  const handleDownloadDocument = async (doc) => {
    if (!doc?.rawDocument?._id) return;

    try {
      await downloadDocument(doc.rawDocument._id, doc.fileName);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to download document."
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!uploadForm.documentType.trim()) {
      showError("Please select document type.");
      return;
    }

    if (!uploadForm.file) {
      showError("Please select file.");
      return;
    }

    try {
      setUploading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const formData = new FormData();

      formData.append("file", uploadForm.file);
      formData.append("remarks", uploadForm.remarks || "");

      if (selectedDocument?.rawDocument?._id) {
        if (!canReplaceDocument(selectedDocument)) {
          showError(
            "Only Under Review, Pending, Uploaded, Wrong Document or Not Clear document can be replaced."
          );
          return;
        }

        const data = await replaceDocumentFile(
          selectedDocument.rawDocument._id,
          formData
        );

        if (data?.success) {
          showSuccess(
            "Document replaced successfully. It is now under review."
          );
          await fetchClientDocumentsData();
          closeUploadForm();
        } else {
          showError(data?.message || "Unable to replace document.");
        }

        return;
      }

      if (uploadForm.assignmentId) {
        formData.append("assignmentId", uploadForm.assignmentId);
      }

      formData.append("serviceName", uploadForm.serviceName || "");
      formData.append("period", uploadForm.period || "");
      formData.append("documentType", uploadForm.documentType);
      formData.append("uploadSource", "Client Portal");

      const data = await uploadDocumentByClient(formData);

      if (data?.success) {
        showSuccess("Document uploaded successfully for CA office verification.");
        await fetchClientDocumentsData();
        closeUploadForm();
      } else {
        showError(data?.message || "Unable to upload document.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to upload document."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="client-documents-page">
      <ClientSidebar active="documents" />

      <main className="client-documents-main">
        <header className="client-documents-header">
          <div>
            <h1>Upload Documents</h1>
            <p>
              Upload required documents for GST, Income Tax, Accounting and
              other services. Documents sent through WhatsApp or email may also
              appear here if uploaded by office staff.
            </p>
          </div>

          <div className="client-document-header-actions">
            <button
              type="button"
              className="client-document-refresh-btn"
              onClick={fetchClientDocumentsData}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="client-document-upload-btn"
              onClick={() => openUploadForm()}
            >
              <Upload size={18} />
              Upload Document
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="client-document-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="client-document-message success">
            {successMessage}
          </div>
        )}

        <section className="client-document-stats">
          <div className="client-document-stat-card">
            <div className="client-document-stat-icon blue">
              <FileText />
            </div>
            <div>
              <p>Total Documents</p>
              <h3>{loading ? "..." : totalDocs}</h3>
            </div>
          </div>

          <div className="client-document-stat-card">
            <div className="client-document-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Uploaded</p>
              <h3>{loading ? "..." : uploadedDocs}</h3>
            </div>
          </div>

          <div className="client-document-stat-card">
            <div className="client-document-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>Pending</p>
              <h3>{loading ? "..." : pendingDocs}</h3>
            </div>
          </div>

          <div className="client-document-stat-card">
            <div className="client-document-stat-icon purple">
              <Eye />
            </div>
            <div>
              <p>Under Review</p>
              <h3>{loading ? "..." : reviewDocs}</h3>
            </div>
          </div>

          <div className="client-document-stat-card">
            <div className="client-document-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Wrong / Not Clear</p>
              <h3>{loading ? "..." : issueDocs}</h3>
            </div>
          </div>
        </section>

        {showUploadForm && (
          <section className="client-document-upload-panel">
            <div className="client-document-upload-header">
              <div>
                <h2>
                  {selectedDocument?.rawDocument
                    ? "Replace Document"
                    : "Upload Required Document"}
                </h2>
                <p>
                  {selectedDocument?.rawDocument
                    ? "Upload a revised file. It will replace the old file and remain Under Review."
                    : "Select service, document type and upload the correct file for CA office verification."}
                </p>
              </div>

              <button
                type="button"
                className="client-document-close-btn"
                onClick={closeUploadForm}
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </div>

            <form className="client-document-upload-form" onSubmit={handleSubmit}>
              <div className="client-document-form-grid">
                <div className="client-document-form-group">
                  <label>Service</label>
                  <select
                    name="assignmentId"
                    value={uploadForm.assignmentId}
                    onChange={handleInputChange}
                    disabled={Boolean(selectedDocument?.rawDocument)}
                  >
                    <option value="">Select service</option>
                    {services.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.serviceName}
                        {service.period ? ` • ${service.period}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="client-document-form-group">
                  <label>Document Type</label>
                  <select
                    name="documentType"
                    value={uploadForm.documentType}
                    onChange={handleInputChange}
                    required
                    disabled={Boolean(selectedDocument?.rawDocument)}
                  >
                    <option value="">Select document type</option>
                    {documentTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="client-document-form-group full-width">
                  <label>
                    {selectedDocument?.rawDocument
                      ? "Upload Revised File"
                      : "Upload File"}
                  </label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="client-document-form-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    rows="4"
                    placeholder={
                      selectedDocument?.rawDocument
                        ? "Example: Revised document uploaded before final approval."
                        : "Example: Purchase register for April 2026 uploaded for GST return filing."
                    }
                    value={uploadForm.remarks}
                    onChange={handleInputChange}
                  ></textarea>
                </div>

                <div className="client-document-upload-note full-width">
                  <strong>Note:</strong>{" "}
                  {selectedDocument?.rawDocument
                    ? "This file will replace the old file. After upload, status will remain “Under Review”."
                    : "This document will be submitted to the CA office for verification. After upload, the document status will be marked as “Under Review”."}
                </div>
              </div>

              <div className="client-document-upload-actions">
                <button
                  type="button"
                  onClick={closeUploadForm}
                  disabled={uploading}
                >
                  Cancel
                </button>

                <button type="submit" disabled={uploading}>
                  <Send size={17} />
                  {uploading
                    ? "Submitting..."
                    : selectedDocument?.rawDocument
                    ? "Replace Document"
                    : "Submit Document"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="client-document-panel">
          <div className="client-document-panel-header">
            <div>
              <h2>Required Document List</h2>
              <p>
                Upload pending documents and track verification status from CA
                office. Files sent on WhatsApp/email and uploaded by staff will
                also be shown here.
              </p>
            </div>

            <div className="client-document-search">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search document..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="client-document-list">
            {loading && filteredDocuments.length === 0 ? (
              <div className="client-document-empty-state">
                Loading documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="client-document-empty-state">
                {searchTerm
                  ? "No matching document found."
                  : "No document checklist found."}
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div className="client-document-card" key={doc.id}>
                  <div className="client-document-left">
                    <div className="client-document-icon">
                      <BriefcaseBusiness />
                    </div>

                    <div>
                      <h3>{doc.documentType}</h3>
                      <p>{doc.service}</p>
                      <small>{doc.remarks}</small>
                    </div>
                  </div>

                  <div className="client-document-file">
                    <p>File Name</p>
                    <h4>
                      <FileText size={15} />
                      {doc.fileName}
                    </h4>

                    <small>Uploaded on: {doc.uploadedOn}</small>

                    <div className="client-document-source-row">
                      <span
                        className={`client-document-source ${getSourceClass(
                          doc.uploadSource
                        )}`}
                      >
                        {doc.uploadSource}
                      </span>

                      <span className="client-document-uploaded-by">
                        Uploaded by: {doc.uploadedBy}
                      </span>
                    </div>
                  </div>

                  <div className="client-document-status-box">
                    <span
                      className={`client-document-status ${getStatusClass(
                        doc.status
                      )}`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="client-document-actions">
                    {doc.rawDocument && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <Eye size={15} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(doc)}
                        >
                          <Download size={15} />
                          Download
                        </button>
                      </>
                    )}

                    {canUploadDocument(doc) && (
                      <button type="button" onClick={() => openUploadForm(doc)}>
                        <Upload size={15} />
                        Upload
                      </button>
                    )}

                    {canReplaceDocument(doc) && (
                      <button
                        type="button"
                        className="client-document-replace-btn"
                        onClick={() => openUploadForm(doc)}
                      >
                        <RefreshCcw size={15} />
                        Replace File
                      </button>
                    )}
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
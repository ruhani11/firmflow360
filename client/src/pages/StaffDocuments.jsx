import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Send,
  Search,
  CheckCircle,
  Clock,
  X,
  UserRound,
  RefreshCcw,
} from "lucide-react";

import StaffSidebar from "../components/StaffSidebar";

import { getMyStaffAssignments } from "../services/assignmentService";

import {
  getMyStaffClientDocuments,
  uploadDocumentByStaff,
  replaceDocumentFile,
  downloadDocument,
  viewDocument,
} from "../services/documentService";

import "./StaffDocuments.css";

const DEFAULT_DOCUMENT_TYPES = [
  "Sales Register",
  "Purchase Register",
  "Bank Statement",
  "Form 16",
  "PAN Card",
  "Trial Balance",
  "Ledger",
  "GST Return",
  "TDS Return",
  "Capital Gain Statement",
  "House Property Details",
  "Working Paper",
  "Other Supporting Document",
];

const UPLOAD_SOURCES = ["WhatsApp", "Email", "Offline", "Other"];

export default function StaffDocuments() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [replaceTargetRow, setReplaceTargetRow] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [uploadForm, setUploadForm] = useState({
    clientId: "",
    assignmentId: "",
    serviceName: "",
    period: "",
    documentType: "",
    uploadSource: "WhatsApp",
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

  const fetchStaffDocumentsData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [assignmentData, documentData] = await Promise.all([
        getMyStaffAssignments(),
        getMyStaffClientDocuments(),
      ]);

      if (assignmentData?.success) {
        setAssignments(assignmentData.assignments || []);
      } else {
        showError(assignmentData?.message || "Unable to fetch assignments.");
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
          "Unable to fetch staff documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaffDocumentsData();
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
      clientId: "",
      assignmentId: "",
      serviceName: "",
      period: "",
      documentType: "",
      uploadSource: "WhatsApp",
      remarks: "",
      file: null,
    });
  };

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

  const getDocumentClientId = (document) => {
    return getClientId(document.client);
  };

  const getDocumentAssignmentId = (document) => {
    return getAssignmentId(document.assignment);
  };

  const normalizeText = (value) => {
    return String(value || "").trim().toLowerCase();
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

  const getFileName = (document) => {
    return document?.originalName || document?.fileName || "Uploaded File";
  };

  const getAssignmentLabel = (assignment) => {
    if (!assignment) return "-";

    const service = assignment.serviceName || "Assignment";
    const period = assignment.period ? ` • ${assignment.period}` : "";

    return `${service}${period}`;
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

  const getDisplayStatus = (document) => {
    if (!document) return "Pending";

    if (document.status === "Wrong Document") return "Wrong Document";
    if (document.status === "Rejected") return "Not Clear";
    if (document.status === "Under Review") return "Under Review";

    if (document.uploadedBy === "Office Staff") {
      return "Staff Uploaded";
    }

    if (
      document.status === "Approved" ||
      document.status === "Uploaded" ||
      document.status === "Pending"
    ) {
      return "Received";
    }

    return document.status || "Received";
  };

  const getStatusClass = (status) => {
    if (status === "Received") return "received";
    if (status === "Pending") return "pending";
    if (status === "Staff Uploaded") return "staff-uploaded";
    if (status === "Wrong Document") return "wrong";
    if (status === "Not Clear") return "not-clear";
    if (status === "Under Review") return "review";
    return "normal";
  };

  const canReplaceDocument = (row) => {
    const backendStatus = row?.rawDocument?.status;

    return (
      row?.rawDocument?._id &&
      ["Wrong Document", "Rejected", "Under Review"].includes(backendStatus)
    );
  };

  const documentRows = useMemo(() => {
    const rows = [];
    const usedDocumentIds = new Set();

    assignments.forEach((assignment) => {
      const requiredDocuments = assignment.requiredDocuments || [];
      const relatedDocuments = getRelatedDocuments(assignment);

      requiredDocuments.forEach((requiredDoc) => {
        const matchedDocument = relatedDocuments.find((document) =>
          isSameDocumentType(requiredDoc, document.documentType)
        );

        if (matchedDocument?._id) {
          usedDocumentIds.add(matchedDocument._id);
        }

        rows.push({
          id: matchedDocument?._id || `${assignment._id}-${requiredDoc}`,
          client: getClientName(assignment.client),
          clientId: getClientId(assignment.client),
          assignmentId: assignment._id,
          service: assignment.serviceName || "-",
          period: assignment.period || "",
          documentType: requiredDoc,
          fileName: matchedDocument
            ? getFileName(matchedDocument)
            : "Not Uploaded",
          uploadedBy: matchedDocument?.uploadedBy || "-",
          uploadedOn: matchedDocument?.createdAt
            ? formatDate(matchedDocument.createdAt)
            : "-",
          status: getDisplayStatus(matchedDocument),
          rawDocument: matchedDocument || null,
          rawAssignment: assignment,
        });
      });

      relatedDocuments.forEach((document) => {
        if (usedDocumentIds.has(document._id)) return;

        usedDocumentIds.add(document._id);

        rows.push({
          id: document._id,
          client: getClientName(document.client || assignment.client),
          clientId:
            getDocumentClientId(document) || getClientId(assignment.client),
          assignmentId: getDocumentAssignmentId(document) || assignment._id,
          service:
            document.assignment?.serviceName ||
            document.serviceName ||
            assignment.serviceName ||
            "-",
          period: document.assignment?.period || document.period || "",
          documentType: document.documentType || "Other Document",
          fileName: getFileName(document),
          uploadedBy: document.uploadedBy || "-",
          uploadedOn: document.createdAt ? formatDate(document.createdAt) : "-",
          status: getDisplayStatus(document),
          rawDocument: document,
          rawAssignment: assignment,
        });
      });
    });

    return rows;
  }, [assignments, documents]);

  const filteredDocuments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return documentRows;

    return documentRows.filter((doc) => {
      return (
        doc.client.toLowerCase().includes(term) ||
        doc.service.toLowerCase().includes(term) ||
        doc.documentType.toLowerCase().includes(term) ||
        doc.fileName.toLowerCase().includes(term) ||
        doc.status.toLowerCase().includes(term)
      );
    });
  }, [documentRows, searchTerm]);

  const totalDocs = documentRows.length;

  const receivedDocs = documentRows.filter(
    (doc) => doc.status === "Received"
  ).length;

  const pendingDocs = documentRows.filter(
    (doc) => doc.status === "Pending"
  ).length;

  const staffUploadedDocs = documentRows.filter(
    (doc) => doc.status === "Staff Uploaded"
  ).length;

  const clientOptions = useMemo(() => {
    const map = new Map();

    assignments.forEach((assignment) => {
      const clientId = getClientId(assignment.client);

      if (!clientId) return;

      if (!map.has(clientId)) {
        map.set(clientId, {
          id: clientId,
          name: getClientName(assignment.client),
        });
      }
    });

    return Array.from(map.values());
  }, [assignments]);

  const selectedClientAssignments = useMemo(() => {
    if (!uploadForm.clientId) return assignments;

    return assignments.filter(
      (assignment) => getClientId(assignment.client) === uploadForm.clientId
    );
  }, [assignments, uploadForm.clientId]);

  const selectedAssignment = useMemo(() => {
    if (!uploadForm.assignmentId) return null;

    return assignments.find(
      (assignment) => assignment._id === uploadForm.assignmentId
    );
  }, [assignments, uploadForm.assignmentId]);

  const documentTypeOptions = useMemo(() => {
    const requiredDocs = selectedAssignment?.requiredDocuments || [];

    return Array.from(new Set([...requiredDocs, ...DEFAULT_DOCUMENT_TYPES]));
  }, [selectedAssignment]);

  const openUploadForm = (row = null) => {
    if (row) {
      const isReplace = canReplaceDocument(row);

      setReplaceTargetRow(isReplace ? row : null);

      setUploadForm({
        clientId: row.clientId || "",
        assignmentId: row.assignmentId || "",
        serviceName: row.service || "",
        period: row.period || "",
        documentType:
          row.documentType === "Other Document" ? "" : row.documentType || "",
        uploadSource: "WhatsApp",
        remarks: isReplace ? `Revised file uploaded for ${row.status}.` : "",
        file: null,
      });
    } else {
      setReplaceTargetRow(null);
      resetUploadForm();
    }

    setShowUploadForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeUploadForm = () => {
    if (uploading) return;

    setReplaceTargetRow(null);
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

    if (name === "clientId") {
      setUploadForm((prev) => ({
        ...prev,
        clientId: value,
        assignmentId: "",
        serviceName: "",
        period: "",
        documentType: "",
      }));
      return;
    }

    if (name === "assignmentId") {
      const assignment = assignments.find((item) => item._id === value);

      setUploadForm((prev) => ({
        ...prev,
        assignmentId: value,
        clientId: assignment ? getClientId(assignment.client) : prev.clientId,
        serviceName: assignment?.serviceName || "",
        period: assignment?.period || "",
        documentType: "",
      }));
      return;
    }

    setUploadForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleViewDocument = async (document) => {
    if (!document?._id) return;

    try {
      await viewDocument(document._id);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to view document."
      );
    }
  };

  const handleDownloadDocument = async (document) => {
    if (!document?._id) return;

    try {
      await downloadDocument(document._id, getFileName(document));
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

    if (!uploadForm.clientId) {
      showError("Please select client.");
      return;
    }

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
      formData.append("uploadSource", uploadForm.uploadSource || "WhatsApp");

      if (replaceTargetRow?.rawDocument?._id) {
        const data = await replaceDocumentFile(
          replaceTargetRow.rawDocument._id,
          formData
        );

        if (data?.success) {
          showSuccess("Document replaced successfully for admin review.");
          await fetchStaffDocumentsData();
          closeUploadForm();
        } else {
          showError(data?.message || "Unable to replace document.");
        }

        return;
      }

      formData.append("clientId", uploadForm.clientId);

      if (uploadForm.assignmentId) {
        formData.append("assignmentId", uploadForm.assignmentId);
      }

      if (uploadForm.serviceName) {
        formData.append("serviceName", uploadForm.serviceName);
      }

      if (uploadForm.period) {
        formData.append("period", uploadForm.period);
      }

      formData.append("documentType", uploadForm.documentType);
      formData.append("uploadSource", uploadForm.uploadSource);
      formData.append("remarks", uploadForm.remarks);

      const data = await uploadDocumentByStaff(formData);

      if (data?.success) {
        showSuccess("Document uploaded successfully for admin review.");
        await fetchStaffDocumentsData();
        closeUploadForm();
      } else {
        showError(data?.message || "Unable to upload document.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to save document."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="staff-documents-page">
      <StaffSidebar active="documents" />

      <main className="staff-documents-main">
        <header className="staff-documents-header">
          <div>
            <h1>Upload Documents</h1>
            <p>
              View client uploaded documents, upload missing files, working
              papers and supporting documents for assigned work.
            </p>
          </div>

          <button
            type="button"
            className="staff-document-upload-btn"
            onClick={() => openUploadForm()}
          >
            <Upload size={18} />
            Upload Document
          </button>
        </header>

        {errorMessage && (
          <div className="staff-document-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="staff-document-message success">{successMessage}</div>
        )}

        <section className="staff-document-stats">
          <div className="staff-document-stat-card">
            <div className="staff-document-stat-icon blue">
              <FileText />
            </div>
            <div>
              <p>Total Documents</p>
              <h3>{loading ? "..." : totalDocs}</h3>
            </div>
          </div>

          <div className="staff-document-stat-card">
            <div className="staff-document-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Received</p>
              <h3>{loading ? "..." : receivedDocs}</h3>
            </div>
          </div>

          <div className="staff-document-stat-card">
            <div className="staff-document-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>Pending</p>
              <h3>{loading ? "..." : pendingDocs}</h3>
            </div>
          </div>

          <div className="staff-document-stat-card">
            <div className="staff-document-stat-icon purple">
              <Upload />
            </div>
            <div>
              <p>Staff Uploaded</p>
              <h3>{loading ? "..." : staffUploadedDocs}</h3>
            </div>
          </div>
        </section>

        {showUploadForm && (
          <section className="staff-document-upload-panel">
            <div className="staff-document-upload-header">
              <div>
                <h2>
                  {replaceTargetRow
                    ? "Replace Document"
                    : "Upload Client / Work Document"}
                </h2>
                <p>
                  {replaceTargetRow
                    ? "Upload a revised file. It will replace the existing file and go back for admin review."
                    : "Upload missing client document, supporting file or working paper for assigned work."}
                </p>
              </div>

              <button
                type="button"
                className="staff-document-close-btn"
                onClick={closeUploadForm}
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </div>

            <form className="staff-document-upload-form" onSubmit={handleSubmit}>
              <div className="staff-document-form-grid">
                <div className="staff-document-form-group">
                  <label>Client Name</label>
                  <select
                    name="clientId"
                    value={uploadForm.clientId}
                    onChange={handleInputChange}
                    required
                    disabled={Boolean(replaceTargetRow)}
                  >
                    <option value="">Select client</option>
                    {clientOptions.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-document-form-group">
                  <label>Related Assignment</label>
                  <select
                    name="assignmentId"
                    value={uploadForm.assignmentId}
                    onChange={handleInputChange}
                    disabled={Boolean(replaceTargetRow)}
                  >
                    <option value="">Select assignment</option>
                    {selectedClientAssignments.map((assignment) => (
                      <option key={assignment._id} value={assignment._id}>
                        {getAssignmentLabel(assignment)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-document-form-group">
                  <label>Document Type</label>
                  <select
                    name="documentType"
                    value={uploadForm.documentType}
                    onChange={handleInputChange}
                    required
                    disabled={Boolean(replaceTargetRow)}
                  >
                    <option value="">Select document type</option>
                    {documentTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-document-form-group">
                  <label>Upload Source</label>
                  <select
                    name="uploadSource"
                    value={uploadForm.uploadSource}
                    onChange={handleInputChange}
                    required
                  >
                    {UPLOAD_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-document-form-group full-width">
                  <label>
                    {replaceTargetRow ? "Upload Revised File" : "Upload File"}
                  </label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="staff-document-form-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    rows="4"
                    placeholder={
                      replaceTargetRow
                        ? "Example: Revised readable document uploaded."
                        : "Example: Purchase register received from client and uploaded for GST return filing."
                    }
                    value={uploadForm.remarks}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>

              <div className="staff-document-upload-actions">
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
                    ? "Saving..."
                    : replaceTargetRow
                    ? "Replace Document"
                    : "Save Document"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="staff-document-panel">
          <div className="staff-document-panel-header">
            <div>
              <h2>Assigned Client Documents</h2>
              <p>
                Documents uploaded by client and documents uploaded by staff for
                assigned work.
              </p>
            </div>

            <div className="staff-document-header-actions">
              <div className="staff-document-search">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search document..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="staff-document-refresh-btn"
                onClick={fetchStaffDocumentsData}
                disabled={loading}
              >
                <RefreshCcw size={16} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="staff-document-list">
            {loading && filteredDocuments.length === 0 ? (
              <div className="staff-document-empty-state">
                Loading documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="staff-document-empty-state">
                {searchTerm
                  ? "No matching document found."
                  : "No assigned client documents found."}
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div className="staff-document-card" key={doc.id}>
                  <div className="staff-document-client">
                    <div className="staff-document-user-icon">
                      <UserRound />
                    </div>

                    <div>
                      <h3>{doc.client}</h3>
                      <p>{doc.service}</p>
                      <small>{doc.documentType}</small>
                    </div>
                  </div>

                  <div className="staff-document-file">
                    <p>File Name</p>
                    <h4>
                      <FileText size={15} />
                      {doc.fileName}
                    </h4>
                    <small>
                      Uploaded by {doc.uploadedBy} • {doc.uploadedOn}
                    </small>
                  </div>

                  <div className="staff-document-status-box">
                    <span
                      className={`staff-document-status ${getStatusClass(
                        doc.status
                      )}`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="staff-document-actions">
                    {doc.rawDocument ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc.rawDocument)}
                        >
                          <Eye size={15} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadDocument(doc.rawDocument)
                          }
                        >
                          <Download size={15} />
                          Download
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => openUploadForm(doc)}>
                        <Upload size={15} />
                        Upload
                      </button>
                    )}

                    {canReplaceDocument(doc) && (
                      <button
                        type="button"
                        className="staff-document-replace-btn"
                        onClick={() => openUploadForm(doc)}
                      >
                        <RefreshCcw size={15} />
                        Replace
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
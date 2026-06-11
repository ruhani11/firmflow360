import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  FileCheck,
  FileX,
  FileWarning,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  X,
  Send,
  Download,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";

import { getAllClients } from "../services/adminService";
import { getAllAssignmentsForAdmin } from "../services/assignmentService";

import {
  getAllDocumentsForAdmin,
  uploadDocumentByAdmin,
  updateDocumentStatusByAdmin,
  viewDocument,
  downloadDocument,
} from "../services/documentService";

import "./DocumentCheck.css";

const DEFAULT_DOCUMENT_TYPES = [
  "Sales Register",
  "Purchase Register",
  "GSTR-1",
  "GSTR-3B",
  "Bank Statement",
  "Form 16",
  "Trial Balance",
  "Capital Gain Statement",
  "PAN Card",
  "Other",
];

export default function DocumentCheck() {
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [viewingId, setViewingId] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState("");

  const [reviewTargetItem, setReviewTargetItem] = useState(null);
  const [statusTargetAction, setStatusTargetAction] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [uploadForm, setUploadForm] = useState({
    clientId: "",
    assignmentId: "",
    serviceName: "",
    period: "",
    documentType: "",
    uploadSource: "Offline",
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

  const fetchDocumentCheckData = async () => {
    try {
      setLoading(true);

      const [documentData, clientData, assignmentData] = await Promise.all([
        getAllDocumentsForAdmin(),
        getAllClients(),
        getAllAssignmentsForAdmin(),
      ]);

      if (documentData?.success) {
        setDocuments(documentData.documents || []);
      } else {
        showError(documentData?.message || "Unable to fetch documents.");
      }

      if (clientData?.success) {
        setClients(clientData.clients || []);
      }

      if (assignmentData?.success) {
        setAssignments(assignmentData.assignments || []);
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch document check data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocumentCheckData();
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
      uploadSource: "Offline",
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

  const getDocumentClientName = (document) => {
    return getClientName(document.client);
  };

  const getAssignmentId = (assignment) => {
    if (!assignment) return "";
    return typeof assignment === "string" ? assignment : assignment._id;
  };

  const getDocumentAssignmentId = (document) => {
    return getAssignmentId(document.assignment);
  };

  const getAssignmentLabel = (assignment) => {
    const clientName = getClientName(assignment.client);
    const serviceName = assignment.serviceName || "Service";
    const period = assignment.period ? ` • ${assignment.period}` : "";

    return `${clientName} • ${serviceName}${period}`;
  };

  const getDocumentServiceName = (document) => {
    return (
      document.assignment?.serviceName ||
      document.serviceName ||
      "Unlinked Service"
    );
  };

  const getUploadedFileName = (document) => {
    return document.originalName || document.fileName || "Uploaded File";
  };

  const getExpectedType = (documentName = "") => {
    const name = documentName.toLowerCase();

    if (
      name.includes("sales") ||
      name.includes("purchase") ||
      name.includes("ledger") ||
      name.includes("trial") ||
      name.includes("statement")
    ) {
      return "PDF / Excel";
    }

    if (name.includes("gstr") || name.includes("form") || name.includes("pan")) {
      return "PDF";
    }

    return "PDF / Excel / Image";
  };

  const mapBackendStatusToUiStatus = (status) => {
    if (status === "Approved") return "Verified";
    if (status === "Wrong Document") return "Wrong Document";
    if (status === "Rejected") return "Not Clear";

    if (status === "Pending" || status === "Uploaded") {
      return "Manual Review";
    }

    if (status === "Under Review") {
      return "Manual Review";
    }

    return "Manual Review";
  };

  const getConfidence = (status) => {
    if (status === "Approved") return "96%";
    if (status === "Wrong Document") return "55%";
    if (status === "Rejected") return "45%";
    if (status === "Under Review") return "78%";
    if (status === "Uploaded" || status === "Pending") return "70%";

    return "0%";
  };

  const getRemark = (document) => {
    if (document.adminRemark) return document.adminRemark;
    if (document.remarks) return document.remarks;

    if (document.status === "Approved") {
      return "Document verified and approved by admin.";
    }

    if (document.status === "Wrong Document") {
      return "Uploaded file is not matching the required document type.";
    }

    if (document.status === "Rejected") {
      return "Uploaded document is not clear/readable and needs replacement.";
    }

    return "Document is pending for manual validation.";
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

  const makeDocumentCheckRow = (document, requiredDocumentName = null) => {
    const displayDocumentName = requiredDocumentName || document.documentType;

    return {
      id: document._id,
      isMissing: false,
      client: getDocumentClientName(document),
      service: getDocumentServiceName(document),
      document: displayDocumentName,
      expectedType: getExpectedType(displayDocumentName),
      uploadedFile: getUploadedFileName(document),
      status: mapBackendStatusToUiStatus(document.status),
      backendStatus: document.status,
      confidence: getConfidence(document.status),
      remark: getRemark(document),
      rawDocument: document,
    };
  };

  const documentChecks = useMemo(() => {
    const checks = [];
    const usedDocumentIds = new Set();

    assignments.forEach((assignment) => {
      const requiredDocuments = assignment.requiredDocuments || [];

      if (requiredDocuments.length === 0) return;

      const relatedDocuments = documents.filter(
        (document) => getDocumentAssignmentId(document) === assignment._id
      );

      requiredDocuments.forEach((requiredDocument) => {
        const matchedDocument = relatedDocuments.find((document) =>
          isSameDocumentType(requiredDocument, document.documentType)
        );

        if (matchedDocument) {
          usedDocumentIds.add(matchedDocument._id);
          checks.push(makeDocumentCheckRow(matchedDocument, requiredDocument));
        } else {
          checks.push({
            id: `${assignment._id}-${requiredDocument}`,
            isMissing: true,
            client: getClientName(assignment.client),
            service: assignment.serviceName,
            document: requiredDocument,
            expectedType: getExpectedType(requiredDocument),
            uploadedFile: "Not Uploaded",
            status: "Missing",
            backendStatus: "Missing",
            confidence: "0%",
            remark: "Required document has not been uploaded by client.",
            rawDocument: null,
          });
        }
      });
    });

    documents.forEach((document) => {
      if (!usedDocumentIds.has(document._id)) {
        checks.push(makeDocumentCheckRow(document));
      }
    });

    return checks;
  }, [assignments, documents]);

  const checklist = useMemo(() => {
    return assignments
      .filter((assignment) => (assignment.requiredDocuments || []).length > 0)
      .map((assignment) => {
        const requiredDocuments = assignment.requiredDocuments || [];

        const relatedDocuments = documents.filter(
          (document) => getDocumentAssignmentId(document) === assignment._id
        );

        const received = requiredDocuments.filter((requiredDocument) =>
          relatedDocuments.some((document) =>
            isSameDocumentType(requiredDocument, document.documentType)
          )
        ).length;

        const required = requiredDocuments.length;
        const missing = Math.max(required - received, 0);
        const score =
          required === 0 ? 0 : Math.round((received / required) * 100);

        return {
          id: assignment._id,
          service: `${getClientName(assignment.client)} • ${
            assignment.serviceName
          }`,
          required,
          received,
          missing,
          score: `${score}%`,
        };
      });
  }, [assignments, documents]);

  const documentStats = useMemo(() => {
    const uploaded = documents.length;

    const verified = documents.filter(
      (document) => document.status === "Approved"
    ).length;

    const missing = documentChecks.filter((item) => item.isMissing).length;

    const manualReview = documents.filter((document) =>
      ["Pending", "Uploaded", "Under Review"].includes(document.status)
    ).length;

    return [
      {
        title: "Documents Uploaded",
        value: uploaded,
        icon: <Upload />,
        color: "blue",
      },
      {
        title: "Verified Documents",
        value: verified,
        icon: <CheckCircle />,
        color: "green",
      },
      {
        title: "Missing Documents",
        value: missing,
        icon: <FileX />,
        color: "orange",
      },
      {
        title: "Manual Review",
        value: manualReview,
        icon: <AlertTriangle />,
        color: "red",
      },
    ];
  }, [documents, documentChecks]);

  const selectedClientAssignments = useMemo(() => {
    if (!uploadForm.clientId) return [];

    return assignments.filter(
      (assignment) => assignment.client?._id === uploadForm.clientId
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

  const getStatusClass = (status) => {
    if (status === "Verified") return "verified";
    if (status === "Missing") return "missing";
    if (status === "Wrong Document") return "wrong";
    if (status === "Not Clear") return "not-clear";
    if (status === "Manual Review") return "review";
    return "pending";
  };

  const getStatusIcon = (status) => {
    if (status === "Verified") return <FileCheck size={17} />;
    if (status === "Missing") return <FileX size={17} />;
    if (status === "Wrong Document") return <FileWarning size={17} />;
    if (status === "Not Clear") return <AlertTriangle size={17} />;
    return <Clock size={17} />;
  };

  const isUploadedItem = (item) => {
    return Boolean(!item.isMissing && item.rawDocument?._id);
  };

  const isApprovedItem = (item) => {
    return item.backendStatus === "Approved";
  };

  const isWrongDocumentItem = (item) => {
    return item.backendStatus === "Wrong Document";
  };

  const isNotClearItem = (item) => {
    return item.backendStatus === "Rejected";
  };

  const handleViewDocument = async (item) => {
    if (!isUploadedItem(item)) {
      showError("No uploaded file available to view.");
      return;
    }

    try {
      setViewingId(item.rawDocument._id);
      await viewDocument(item.rawDocument._id);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to open document."
      );
    } finally {
      setViewingId("");
    }
  };

  const handleDownloadDocument = async (item) => {
    if (!isUploadedItem(item)) {
      showError("No uploaded file available to download.");
      return;
    }

    try {
      setDownloadingId(item.rawDocument._id);
      await downloadDocument(item.rawDocument._id, item.uploadedFile);
      showSuccess("Document downloaded successfully.");
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to download document."
      );
    } finally {
      setDownloadingId("");
    }
  };

  const handleOpenStatusAction = (item, status, adminRemark, successText) => {
    if (!isUploadedItem(item)) {
      showError("No uploaded file available for status update.");
      return;
    }

    setStatusTargetAction({
      item,
      status,
      adminRemark,
      successText,
    });

    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseStatusAction = () => {
    if (statusUpdatingId) return;

    setStatusTargetAction(null);
    setErrorMessage("");
  };

  const handleConfirmStatusAction = async () => {
    if (!statusTargetAction?.item?.rawDocument?._id) return;

    const { item, status, adminRemark, successText } = statusTargetAction;
    const documentId = item.rawDocument._id;

    try {
      setStatusUpdatingId(documentId);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await updateDocumentStatusByAdmin(documentId, {
        status,
        adminRemark,
      });

      if (data?.success) {
        setStatusTargetAction(null);
        showSuccess(successText);
        await fetchDocumentCheckData();
      } else {
        showError(data?.message || "Unable to update document status.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update document status."
      );
    } finally {
      setStatusUpdatingId("");
    }
  };

  const handleUploadInputChange = (event) => {
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

  const handleUploadSubmit = async (event) => {
    event.preventDefault();

    if (!uploadForm.clientId) {
      showError("Please select client.");
      return;
    }

    if (!uploadForm.documentType) {
      showError("Please select document type.");
      return;
    }

    if (!uploadForm.file) {
      showError("Please upload file.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

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
      formData.append("file", uploadForm.file);

      const data = await uploadDocumentByAdmin(formData);

      if (data?.success) {
        showSuccess("Document uploaded successfully.");
        await fetchDocumentCheckData();
        resetUploadForm();
        setShowUploadForm(false);
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

  const handleOpenReviewDocument = (item) => {
    if (item.isMissing || !item.rawDocument?._id) {
      showError("Missing document cannot be reviewed until uploaded.");
      return;
    }

    setReviewTargetItem(item);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseReviewDocument = () => {
    if (reviewingId) return;

    setReviewTargetItem(null);
    setErrorMessage("");
  };

  const handleConfirmReviewDocument = async () => {
    if (!reviewTargetItem?.rawDocument?._id) return;

    try {
      setReviewingId(reviewTargetItem.rawDocument._id);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await updateDocumentStatusByAdmin(
        reviewTargetItem.rawDocument._id,
        {
          status: "Approved",
          adminRemark: "Document reviewed and approved by admin.",
        }
      );

      if (data?.success) {
        setReviewTargetItem(null);
        showSuccess("Document approved successfully.");
        await fetchDocumentCheckData();
      } else {
        showError(data?.message || "Unable to update document status.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update document status."
      );
    } finally {
      setReviewingId("");
    }
  };

  return (
    <div className="document-check-page">
      <AdminSidebar active="document-check" />

      <main className="document-check-main">
        <header className="document-check-header">
          <div>
            <h1>AI Document Check</h1>
            <p>
              Validate client documents uploaded by Client, Staff or Admin
              against CA office checklist and identify missing, wrong or
              review-required documents.
            </p>
          </div>

          <button
            type="button"
            className="document-upload-btn"
            onClick={() => setShowUploadForm(true)}
          >
            <Upload size={18} />
            Upload Client Document
          </button>
        </header>

        {errorMessage && !reviewTargetItem && !statusTargetAction && (
          <div
            className="document-panel"
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

        {successMessage && !reviewTargetItem && !statusTargetAction && (
          <div
            className="document-panel"
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

        {showUploadForm && (
          <section className="document-upload-panel">
            <div className="document-upload-panel-header">
              <div>
                <h2>Upload Client Document</h2>
                <p>
                  Admin or Staff can upload documents received from client
                  through portal, email, WhatsApp or physical scan.
                </p>
              </div>

              <button
                type="button"
                className="document-upload-close"
                onClick={() => {
                  resetUploadForm();
                  setShowUploadForm(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form className="document-upload-form" onSubmit={handleUploadSubmit}>
              <div className="document-upload-grid">
                <div className="document-upload-group">
                  <label>Client Name</label>
                  <select
                    name="clientId"
                    value={uploadForm.clientId}
                    onChange={handleUploadInputChange}
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {getClientName(client)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="document-upload-group">
                  <label>Service / Assignment</label>
                  <select
                    name="assignmentId"
                    value={uploadForm.assignmentId}
                    onChange={handleUploadInputChange}
                  >
                    <option value="">Select assignment</option>
                    {selectedClientAssignments.map((assignment) => (
                      <option key={assignment._id} value={assignment._id}>
                        {getAssignmentLabel(assignment)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="document-upload-group">
                  <label>Document Type</label>
                  <select
                    name="documentType"
                    value={uploadForm.documentType}
                    onChange={handleUploadInputChange}
                    required
                  >
                    <option value="">Select document type</option>
                    {documentTypeOptions.map((documentType) => (
                      <option key={documentType} value={documentType}>
                        {documentType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="document-upload-group">
                  <label>Upload Source</label>
                  <select
                    name="uploadSource"
                    value={uploadForm.uploadSource}
                    onChange={handleUploadInputChange}
                    required
                  >
                    <option value="Offline">Offline</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="Client Portal">Client Portal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="document-upload-group full-width">
                  <label>Upload File</label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleUploadInputChange}
                    required
                  />
                </div>

                <div className="document-upload-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    rows="4"
                    placeholder="Example: Document received on WhatsApp and uploaded by Admin."
                    value={uploadForm.remarks}
                    onChange={handleUploadInputChange}
                  ></textarea>
                </div>
              </div>

              <div className="document-upload-actions">
                <button
                  type="button"
                  className="document-cancel-btn"
                  onClick={() => {
                    resetUploadForm();
                    setShowUploadForm(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="document-submit-btn"
                  disabled={uploading}
                >
                  <Send size={17} />
                  {uploading ? "Uploading..." : "Submit for Validation"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="document-stats-grid">
          {documentStats.map((item, index) => (
            <div className="document-stat-card" key={index}>
              <div className={`document-stat-icon ${item.color}`}>
                {item.icon}
              </div>

              <div>
                <p>{item.title}</p>
                <h3>{item.value}</h3>
              </div>
            </div>
          ))}
        </section>

        <section
          className="document-check-layout"
          style={{ gridTemplateColumns: "1fr" }}
        >
          <div className="document-panel document-analysis-panel">
            <div className="document-panel-header">
              <h2>Document Validation Results</h2>
              <span>
                {loading
                  ? "Loading..."
                  : `${documentChecks.length} Validation Item(s)`}
              </span>
            </div>

            <div className="document-result-list">
              {!loading && documentChecks.length === 0 ? (
                <div className="document-remark">
                  <p>No documents or checklist items found.</p>
                </div>
              ) : (
                documentChecks.map((item) => (
                  <div className="document-result-card" key={item.id}>
                    <div className="document-result-left">
                      <div
                        className={`document-status-icon ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {getStatusIcon(item.status)}
                      </div>

                      <div>
                        <h3>{item.document}</h3>
                        <p>
                          {item.client} • {item.service}
                        </p>
                        <small>Expected Type: {item.expectedType}</small>
                      </div>
                    </div>

                    <div className="document-file-info">
                      <p>Uploaded File</p>
                      <h4>{item.uploadedFile}</h4>
                    </div>

                    <div className="document-confidence">
                      <p>Confidence</p>
                      <h4>{item.confidence}</h4>
                    </div>

                    <div className="document-status-area">
                      <span
                        className={`document-status-badge ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>

                      {isUploadedItem(item) ? (
                        <div className="document-check-action-group">
                          <button
                            type="button"
                            className="document-action-btn"
                            onClick={() => handleViewDocument(item)}
                            disabled={viewingId === item.rawDocument._id}
                          >
                            <Eye size={15} />
                            {viewingId === item.rawDocument._id
                              ? "Opening..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            className="document-action-btn"
                            onClick={() => handleDownloadDocument(item)}
                            disabled={downloadingId === item.rawDocument._id}
                          >
                            <Download size={15} />
                            {downloadingId === item.rawDocument._id
                              ? "..."
                              : "Download"}
                          </button>

                          <button
                            type="button"
                            className="document-approve-btn"
                            onClick={() => handleOpenReviewDocument(item)}
                            disabled={
                              isApprovedItem(item) ||
                              reviewingId === item.rawDocument._id ||
                              statusUpdatingId === item.rawDocument._id
                            }
                          >
                            <CheckCircle size={15} />
                            {isApprovedItem(item) ? "Approved" : "Approve"}
                          </button>

                          <button
                            type="button"
                            className="document-wrong-btn"
                            onClick={() =>
                              handleOpenStatusAction(
                                item,
                                "Wrong Document",
                                "Uploaded file is not matching the required document type.",
                                "Document marked as Wrong Document."
                              )
                            }
                            disabled={
                              isWrongDocumentItem(item) ||
                              reviewingId === item.rawDocument._id ||
                              statusUpdatingId === item.rawDocument._id
                            }
                          >
                            <FileWarning size={15} />
                            Wrong Doc
                          </button>

                          <button
                            type="button"
                            className="document-not-clear-btn"
                            onClick={() =>
                              handleOpenStatusAction(
                                item,
                                "Rejected",
                                "Uploaded document is not clear/readable. Client must replace it.",
                                "Document marked as Not Clear."
                              )
                            }
                            disabled={
                              isNotClearItem(item) ||
                              reviewingId === item.rawDocument._id ||
                              statusUpdatingId === item.rawDocument._id
                            }
                          >
                            <AlertTriangle size={15} />
                            Not Clear
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="document-missing-btn"
                          disabled
                        >
                          <FileX size={15} />
                          Missing
                        </button>
                      )}
                    </div>

                    <div className="document-remark">
                      <p>{item.remark}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="document-panel checklist-panel">
          <div className="document-panel-header">
            <h2>Checklist Completion Summary</h2>
            <span>Client-wise Document Score</span>
          </div>

          <div className="checklist-summary-grid">
            {checklist.length === 0 ? (
              <div className="document-remark">
                <p>No checklist summary available.</p>
              </div>
            ) : (
              checklist.map((item) => (
                <div className="checklist-card" key={item.id}>
                  <div>
                    <h3>{item.service}</h3>
                    <p>
                      Required: {item.required} • Received: {item.received} •
                      Missing: {item.missing}
                    </p>
                  </div>

                  <div className="checklist-score">
                    <strong>{item.score}</strong>
                    <span>Complete</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {reviewTargetItem && (
          <div className="document-review-backdrop">
            <div className="document-review-modal">
              <button
                type="button"
                className="document-review-close"
                onClick={handleCloseReviewDocument}
                disabled={Boolean(reviewingId)}
              >
                <X size={18} />
              </button>

              <div className="document-review-icon">
                <FileCheck size={28} />
              </div>

              <h2>Approve Document?</h2>

              <p>
                Are you sure you want to approve{" "}
                <strong>{reviewTargetItem.document}</strong> for{" "}
                <strong>{reviewTargetItem.client}</strong>?
              </p>

              <small>Uploaded File: {reviewTargetItem.uploadedFile}</small>

              {errorMessage && (
                <div className="document-review-error">{errorMessage}</div>
              )}

              <div className="document-review-actions">
                <button
                  type="button"
                  className="document-review-cancel"
                  onClick={handleCloseReviewDocument}
                  disabled={Boolean(reviewingId)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="document-review-confirm"
                  onClick={handleConfirmReviewDocument}
                  disabled={Boolean(reviewingId)}
                >
                  <CheckCircle size={16} />
                  {reviewingId ? "Approving..." : "Approve Document"}
                </button>
              </div>
            </div>
          </div>
        )}

        {statusTargetAction && (
          <div className="document-status-action-backdrop">
            <div className="document-status-action-modal">
              <button
                type="button"
                className="document-status-action-close"
                onClick={handleCloseStatusAction}
                disabled={Boolean(statusUpdatingId)}
              >
                <X size={18} />
              </button>

              <div
                className={`document-status-action-icon ${
                  statusTargetAction.status === "Wrong Document"
                    ? "wrong"
                    : "not-clear"
                }`}
              >
                {statusTargetAction.status === "Wrong Document" ? (
                  <FileWarning size={28} />
                ) : (
                  <AlertTriangle size={28} />
                )}
              </div>

              <h2>
                {statusTargetAction.status === "Wrong Document"
                  ? "Mark as Wrong Document?"
                  : "Mark as Not Clear?"}
              </h2>

              <p>
                Are you sure you want to update{" "}
                <strong>{statusTargetAction.item.document}</strong> for{" "}
                <strong>{statusTargetAction.item.client}</strong>?
              </p>

              <small>Uploaded File: {statusTargetAction.item.uploadedFile}</small>

              {errorMessage && (
                <div className="document-review-error">{errorMessage}</div>
              )}

              <div className="document-status-action-actions">
                <button
                  type="button"
                  className="document-status-action-cancel"
                  onClick={handleCloseStatusAction}
                  disabled={Boolean(statusUpdatingId)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={`document-status-action-confirm ${
                    statusTargetAction.status === "Wrong Document"
                      ? "wrong"
                      : "not-clear"
                  }`}
                  onClick={handleConfirmStatusAction}
                  disabled={Boolean(statusUpdatingId)}
                >
                  {statusTargetAction.status === "Wrong Document" ? (
                    <FileWarning size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}

                  {statusUpdatingId
                    ? "Updating..."
                    : statusTargetAction.status === "Wrong Document"
                    ? "Mark Wrong"
                    : "Mark Not Clear"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
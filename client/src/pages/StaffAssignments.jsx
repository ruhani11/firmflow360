import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Upload,
  Send,
  FileText,
  X,
  Search,
  UserRound,
  Download,
  RefreshCcw,
  Save,
} from "lucide-react";

import StaffSidebar from "../components/StaffSidebar";

import {
  getMyStaffAssignments,
  updateAssignmentStatus,
} from "../services/assignmentService";

import {
  getMyStaffClientDocuments,
  downloadDocument,
} from "../services/documentService";

import { uploadClientFileByStaff } from "../services/clientFileService";

import "./StaffAssignments.css";

const UPLOAD_TYPES = [
  "Working File",
  "Completed Report",
  "Final File for Client",
  "Supporting Document",
  "Correction File Submitted",
];

const FILE_CATEGORIES = [
  "Working File",
  "Computation of Income",
  "GST Working",
  "Tax Audit Working",
  "Final Report",
  "CA Certificate",
  "ITR Acknowledgement",
  "GST Return Filed Copy",
  "TDS Return Filed Copy",
  "Notice Reply / Draft",
  "Other Final Report",
];

export default function StaffAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [detailAssignment, setDetailAssignment] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [uploadForm, setUploadForm] = useState({
    uploadType: "Working File",
    fileCategory: "Working File",
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

  const fetchStaffAssignmentData = async () => {
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
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch staff assignments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaffAssignmentData();
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
      uploadType: "Working File",
      fileCategory: "Working File",
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

  const getClientType = (client) => {
    if (!client) return "Client";

    return client.clientType === "BUSINESS"
      ? "Business Client"
      : "Individual / Personal Client";
  };

  const getAssignmentClientId = (assignment) => {
    return assignment?.client?._id || assignment?.client || "";
  };

  const getDocumentAssignmentId = (document) => {
    if (!document?.assignment) return "";

    return typeof document.assignment === "string"
      ? document.assignment
      : document.assignment._id;
  };

  const getDocumentClientId = (document) => {
    if (!document?.client) return "";

    return typeof document.client === "string"
      ? document.client
      : document.client._id;
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

  const getRelatedDocuments = (assignment) => {
    const assignmentId = assignment._id;
    const clientId = getAssignmentClientId(assignment);
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

  const getMatchedDocument = (requiredDoc, relatedDocuments) => {
    return relatedDocuments.find((document) =>
      isSameDocumentType(requiredDoc, document.documentType)
    );
  };

  const getUploadedDocRows = (assignment) => {
    const requiredDocuments = assignment.requiredDocuments || [];
    const relatedDocuments = getRelatedDocuments(assignment);

    const matchedDocumentIds = new Set();

    const requiredRows = requiredDocuments.map((requiredDoc) => {
      const matchedDocument = getMatchedDocument(requiredDoc, relatedDocuments);

      if (matchedDocument?._id) {
        matchedDocumentIds.add(matchedDocument._id);
      }

      return {
        type: requiredDoc,
        fileName: matchedDocument
          ? matchedDocument.originalName || matchedDocument.fileName
          : "Not Uploaded",
        uploadedBy: matchedDocument?.uploadedBy || "-",
        uploadedOn: matchedDocument?.createdAt
          ? formatDate(matchedDocument.createdAt)
          : "-",
        status: matchedDocument ? matchedDocument.status : "Pending",
        rawDocument: matchedDocument || null,
      };
    });

    const extraRows = relatedDocuments
      .filter((document) => !matchedDocumentIds.has(document._id))
      .map((document) => ({
        type: document.documentType || "Other Document",
        fileName: document.originalName || document.fileName || "Uploaded File",
        uploadedBy: document.uploadedBy || "-",
        uploadedOn: document.createdAt ? formatDate(document.createdAt) : "-",
        status: document.status || "Under Review",
        rawDocument: document,
      }));

    return [...requiredRows, ...extraRows];
  };

  const getPendingDocsCount = (assignment) => {
    const requiredDocuments = assignment.requiredDocuments || [];
    const relatedDocuments = getRelatedDocuments(assignment);

    return requiredDocuments.filter(
      (requiredDoc) => !getMatchedDocument(requiredDoc, relatedDocuments)
    ).length;
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

  const getPriorityClass = (priority) => {
    if (priority === "High") return "high";
    if (priority === "Medium") return "medium";
    return "low";
  };

  const getStatusClass = (status) => {
    if (status === "In Progress") return "progress";
    if (status === "Pending Documents") return "pending";
    if (status === "Submitted for Review") return "prepared";
    if (status === "Correction Required") return "pending";
    if (status === "Approved" || status === "Completed") return "prepared";
    if (status === "Not Started") return "not-started";
    return "normal";
  };

  const getDocStatusClass = (status) => {
    if (status === "Approved" || status === "Uploaded") return "received";
    if (status === "Pending" || status === "Under Review") return "pending";
    if (status === "Wrong Document" || status === "Rejected") return "wrong";
    return "normal";
  };

  const getCompletionText = (assignment) => {
    const value = Number(assignment.completionPercent || 0);
    return `${Math.min(Math.max(value, 0), 100)}%`;
  };

  const getFileName = (document) => {
    return document?.originalName || document?.fileName || "document";
  };

  const openUploadForm = (assignment) => {
    setSelectedAssignment(assignment);
    setDetailAssignment(null);
    setShowUploadForm(true);
    resetUploadForm();
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeUploadForm = () => {
    if (uploading) return;

    setSelectedAssignment(null);
    setShowUploadForm(false);
    resetUploadForm();
    setErrorMessage("");
  };

  const openAssignmentDetails = (assignment) => {
    setDetailAssignment(assignment);
    setSelectedAssignment(null);
    setShowUploadForm(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeAssignmentDetails = () => {
    setDetailAssignment(null);
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

    if (name === "uploadType") {
      setUploadForm((prev) => ({
        ...prev,
        uploadType: value,
        fileCategory:
          value === "Correction File Submitted"
            ? "Other Final Report"
            : value,
      }));
      return;
    }

    setUploadForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStatusUpdate = async (
    assignment,
    status,
    completionPercent = assignment.completionPercent || 0
  ) => {
    if (!assignment?._id) return;

    try {
      setUpdatingId(assignment._id);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await updateAssignmentStatus(assignment._id, {
        status,
        completionPercent,
      });

      if (data?.success) {
        showSuccess(`Assignment marked as ${status}.`);
        await fetchStaffAssignmentData();
      } else {
        showError(data?.message || "Unable to update assignment status.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update assignment status."
      );
    } finally {
      setUpdatingId("");
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

    if (!selectedAssignment?._id) {
      showError("Please select assignment.");
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

      const fileTitle = `${selectedAssignment.serviceName || "Assignment"} - ${
        uploadForm.uploadType
      }`;

      formData.append("clientId", getAssignmentClientId(selectedAssignment));
      formData.append("assignmentId", selectedAssignment._id);
      formData.append("fileTitle", fileTitle);
      formData.append("fileCategory", uploadForm.fileCategory);
      formData.append("serviceName", selectedAssignment.serviceName || "");
      formData.append("period", selectedAssignment.period || "");
      formData.append("remarks", uploadForm.remarks || "");
      formData.append("file", uploadForm.file);

      const uploadData = await uploadClientFileByStaff(formData);

      if (!uploadData?.success) {
        showError(uploadData?.message || "Unable to submit assignment file.");
        return;
      }

      await updateAssignmentStatus(selectedAssignment._id, {
        status: "Submitted for Review",
        completionPercent: 100,
      });

      showSuccess("Assignment file submitted successfully for admin review.");

      await fetchStaffAssignmentData();
      closeUploadForm();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to submit assignment file."
      );
    } finally {
      setUploading(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return assignments;

    return assignments.filter((assignment) => {
      const clientName = getClientName(assignment.client).toLowerCase();
      const serviceName = String(assignment.serviceName || "").toLowerCase();
      const period = String(assignment.period || "").toLowerCase();
      const status = String(assignment.status || "").toLowerCase();
      const priority = String(assignment.priority || "").toLowerCase();

      return (
        clientName.includes(term) ||
        serviceName.includes(term) ||
        period.includes(term) ||
        status.includes(term) ||
        priority.includes(term)
      );
    });
  }, [assignments, searchTerm]);

  const totalAssignments = assignments.length;

  const inProgressCount = assignments.filter(
    (item) => item.status === "In Progress"
  ).length;

  const pendingDocsCount = assignments.reduce(
    (total, item) => total + getPendingDocsCount(item),
    0
  );

  const readyForReviewCount = assignments.filter(
    (item) => item.status === "Submitted for Review"
  ).length;

  return (
    <div className="staff-assignments-page">
      <StaffSidebar active="assignments" />

      <main className="staff-assignments-main">
        <header className="staff-assignments-header">
          <div>
            <h1>My Assignments</h1>
            <p>
              View assigned client work, client uploaded documents, checklist,
              due dates and submit completed files for Admin review.
            </p>
          </div>

          <button
            type="button"
            className="staff-assignment-upload-btn"
            onClick={() => {
              if (assignments[0]) {
                openUploadForm(assignments[0]);
              } else {
                showError("No assignment available for upload.");
              }
            }}
          >
            <Upload size={18} />
            Upload Assignment File
          </button>
        </header>

        {errorMessage && (
          <div className="staff-assignment-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="staff-assignment-message success">
            {successMessage}
          </div>
        )}

        <section className="staff-assignment-stats">
          <div className="staff-assignment-stat-card">
            <div className="staff-assignment-stat-icon blue">
              <ClipboardList />
            </div>
            <div>
              <p>Total Assignments</p>
              <h3>{loading ? "..." : totalAssignments}</h3>
            </div>
          </div>

          <div className="staff-assignment-stat-card">
            <div className="staff-assignment-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>In Progress</p>
              <h3>{loading ? "..." : inProgressCount}</h3>
            </div>
          </div>

          <div className="staff-assignment-stat-card">
            <div className="staff-assignment-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Pending Documents</p>
              <h3>{loading ? "..." : pendingDocsCount}</h3>
            </div>
          </div>

          <div className="staff-assignment-stat-card">
            <div className="staff-assignment-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Ready for Review</p>
              <h3>{loading ? "..." : readyForReviewCount}</h3>
            </div>
          </div>
        </section>

        {detailAssignment && (
          <section className="staff-assignment-upload-panel">
            <div className="staff-assignment-upload-header">
              <div>
                <h2>Assignment Details</h2>
                <p>
                  {getClientName(detailAssignment.client)} •{" "}
                  {detailAssignment.serviceName}
                </p>
              </div>

              <button
                type="button"
                className="staff-assignment-close-btn"
                onClick={closeAssignmentDetails}
              >
                <X size={18} />
              </button>
            </div>

            <div className="staff-assignment-form-grid">
              <div className="staff-assignment-form-group">
                <label>Client</label>
                <input
                  type="text"
                  value={getClientName(detailAssignment.client)}
                  readOnly
                />
              </div>

              <div className="staff-assignment-form-group">
                <label>Service</label>
                <input
                  type="text"
                  value={detailAssignment.serviceName || "-"}
                  readOnly
                />
              </div>

              <div className="staff-assignment-form-group">
                <label>Period</label>
                <input
                  type="text"
                  value={detailAssignment.period || "-"}
                  readOnly
                />
              </div>

              <div className="staff-assignment-form-group">
                <label>Status</label>
                <input
                  type="text"
                  value={detailAssignment.status || "Not Started"}
                  readOnly
                />
              </div>

              <div className="staff-assignment-form-group">
                <label>Priority</label>
                <input
                  type="text"
                  value={detailAssignment.priority || "Medium"}
                  readOnly
                />
              </div>

              <div className="staff-assignment-form-group">
                <label>Due Date</label>
                <input
                  type="text"
                  value={formatDate(detailAssignment.dueDate)}
                  readOnly
                />
              </div>

              <div className="staff-assignment-form-group full-width">
                <label>Instructions</label>
                <textarea
                  rows="3"
                  value={detailAssignment.instructions || "No instructions."}
                  readOnly
                ></textarea>
              </div>

              <div className="staff-assignment-form-group full-width">
                <label>Required Documents</label>
                <textarea
                  rows="4"
                  value={
                    (detailAssignment.requiredDocuments || []).join("\n") ||
                    "No checklist available."
                  }
                  readOnly
                ></textarea>
              </div>
            </div>

            <div className="staff-assignment-upload-actions">
              <button type="button" onClick={closeAssignmentDetails}>
                Close
              </button>

              {detailAssignment.status === "Not Started" && (
                <button
                  type="button"
                  disabled={updatingId === detailAssignment._id}
                  onClick={() =>
                    handleStatusUpdate(detailAssignment, "In Progress", 25)
                  }
                >
                  <Save size={17} />
                  {updatingId === detailAssignment._id
                    ? "Updating..."
                    : "Start Work"}
                </button>
              )}

              <button
                type="button"
                onClick={() => openUploadForm(detailAssignment)}
              >
                <Upload size={17} />
                Upload File
              </button>
            </div>
          </section>
        )}

        {showUploadForm && (
          <section className="staff-assignment-upload-panel">
            <div className="staff-assignment-upload-header">
              <div>
                <h2>Submit Assignment File</h2>
                <p>
                  Upload working file, completed report or final file for Admin
                  review.
                </p>
              </div>

              <button
                type="button"
                className="staff-assignment-close-btn"
                onClick={closeUploadForm}
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="staff-assignment-upload-form"
              onSubmit={handleSubmit}
            >
              <div className="staff-assignment-form-grid">
                <div className="staff-assignment-form-group">
                  <label>Client Name</label>
                  <input
                    type="text"
                    value={getClientName(selectedAssignment?.client)}
                    readOnly
                  />
                </div>

                <div className="staff-assignment-form-group">
                  <label>Service / Assignment</label>
                  <input
                    type="text"
                    value={selectedAssignment?.serviceName || ""}
                    readOnly
                  />
                </div>

                <div className="staff-assignment-form-group">
                  <label>Upload Type</label>
                  <select
                    name="uploadType"
                    value={uploadForm.uploadType}
                    onChange={handleUploadInputChange}
                    required
                  >
                    {UPLOAD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-assignment-form-group">
                  <label>File Category</label>
                  <select
                    name="fileCategory"
                    value={uploadForm.fileCategory}
                    onChange={handleUploadInputChange}
                    required
                  >
                    {FILE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-assignment-form-group full-width">
                  <label>Upload File</label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleUploadInputChange}
                    required
                  />
                </div>

                <div className="staff-assignment-form-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    rows="4"
                    placeholder="Example: Working file prepared and submitted for Admin review."
                    value={uploadForm.remarks}
                    onChange={handleUploadInputChange}
                  ></textarea>
                </div>
              </div>

              <div className="staff-assignment-upload-actions">
                <button
                  type="button"
                  onClick={closeUploadForm}
                  disabled={uploading}
                >
                  Cancel
                </button>

                <button type="submit" disabled={uploading}>
                  <Send size={17} />
                  {uploading ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="staff-assignment-panel">
          <div className="staff-assignment-panel-header">
            <div>
              <h2>Assigned Work List</h2>
              <p>All current assignments allotted by Admin.</p>
            </div>

            <div className="staff-assignment-header-actions">
              <div className="staff-assignment-search">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search assignment..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="staff-assignment-refresh-btn"
                onClick={fetchStaffAssignmentData}
                disabled={loading}
              >
                <RefreshCcw size={16} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="staff-assignment-list">
            {loading && filteredAssignments.length === 0 ? (
              <div className="staff-assignment-empty-state">
                Loading assignments...
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="staff-assignment-empty-state">
                {searchTerm
                  ? "No matching assignment found."
                  : "No assignments assigned yet."}
              </div>
            ) : (
              filteredAssignments.map((item) => {
                const pendingDocs = getPendingDocsCount(item);
                const uploadedDocRows = getUploadedDocRows(item);

                return (
                  <div className="staff-assignment-card" key={item._id}>
                    <div className="staff-assignment-client">
                      <div className="staff-assignment-user-icon">
                        <UserRound />
                      </div>

                      <div>
                        <h3>{getClientName(item.client)}</h3>
                        <p>{getClientType(item.client)}</p>
                        <small>{item.serviceName}</small>
                      </div>
                    </div>

                    <div className="staff-assignment-date">
                      <p>Due Date</p>
                      <h4>
                        <CalendarDays size={15} />
                        {formatDate(item.dueDate)}
                      </h4>
                    </div>

                    <div className="staff-assignment-badges">
                      <span
                        className={`staff-assignment-priority ${getPriorityClass(
                          item.priority
                        )}`}
                      >
                        {item.priority || "Medium"}
                      </span>

                      <span
                        className={`staff-assignment-status ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status || "Not Started"}
                      </span>
                    </div>

                    <div className="staff-assignment-progress">
                      <p>Completion</p>
                      <h4>{getCompletionText(item)}</h4>
                      <small>{pendingDocs} pending docs</small>
                    </div>

                    <div className="staff-assignment-actions">
                      <button
                        type="button"
                        onClick={() => openAssignmentDetails(item)}
                      >
                        <Eye size={15} />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => openUploadForm(item)}
                      >
                        <Upload size={15} />
                        Upload
                      </button>
                    </div>

                    <div className="staff-assignment-checklist">
                      <h4>
                        <FileText size={16} />
                        Required Checklist
                      </h4>

                      <div className="staff-checklist-tags">
                        {(item.requiredDocuments || []).length === 0 ? (
                          <span>No checklist added</span>
                        ) : (
                          item.requiredDocuments.map((doc, docIndex) => (
                            <span key={docIndex}>{doc}</span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="staff-assignment-client-docs">
                      <h4>
                        <FileText size={16} />
                        Client Uploaded Documents
                      </h4>

                      <div className="staff-uploaded-doc-list">
                        {uploadedDocRows.length === 0 ? (
                          <div className="staff-uploaded-doc-item">
                            <div>
                              <strong>No documents uploaded</strong>
                              <p>Client documents are not available yet.</p>
                              <small>-</small>
                            </div>
                          </div>
                        ) : (
                          uploadedDocRows.map((doc, docIndex) => (
                            <div
                              className="staff-uploaded-doc-item"
                              key={`${item._id}-${doc.type}-${docIndex}`}
                            >
                              <div>
                                <strong>{doc.type}</strong>
                                <p>{doc.fileName}</p>
                                <small>
                                  Uploaded by {doc.uploadedBy} •{" "}
                                  {doc.uploadedOn}
                                </small>
                              </div>

                              <div className="staff-uploaded-doc-actions">
                                <span
                                  className={`staff-uploaded-doc-status ${getDocStatusClass(
                                    doc.status
                                  )}`}
                                >
                                  {doc.status}
                                </span>

                                {doc.rawDocument && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadDocument(doc.rawDocument)
                                    }
                                  >
                                    <Download size={14} />
                                    Download
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
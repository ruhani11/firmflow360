import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Send,
  CheckCircle,
  Clock,
  UserRound,
  Building2,
  X,
  AlertTriangle,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";

import { getAllClients } from "../services/adminService";
import { getAllAssignmentsForAdmin } from "../services/assignmentService";

import {
  getAllClientFilesForAdmin,
  uploadClientFileByAdmin,
  updateClientFileStatusByAdmin,
  downloadClientFile,
  viewClientFile,
} from "../services/clientFileService";

import "./ClientFiles.css";

export default function ClientFiles() {
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [clientFiles, setClientFiles] = useState([]);
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [approvingId, setApprovingId] = useState("");

  const [approveTargetFile, setApproveTargetFile] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    clientId: "",
    assignmentId: "",
    fileTitle: "",
    fileCategory: "",
    serviceName: "",
    period: "",
    status: "Shared with Client",
    remarks: "",
    adminRemark: "",
    file: null,
  });

  const fileCategories = [
    "Net Worth Certificate",
    "ITR Acknowledgement",
    "GST Return Filed Copy",
    "TDS Return Filed Copy",
    "Computation of Income",
    "Project Report",
    "CMA Data",
    "DSCR Report",
    "Tax Audit Report",
    "Balance Sheet",
    "CA Certificate",
    "Loan Proposal Report",
    "Notice Reply / Draft",
    "Other Final Report",
  ];

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const fetchClientFilesData = async () => {
    try {
      setLoading(true);

      const [fileData, clientData, assignmentData] = await Promise.all([
        getAllClientFilesForAdmin(),
        getAllClients(),
        getAllAssignmentsForAdmin(),
      ]);

      if (fileData?.success) {
        setClientFiles(fileData.clientFiles || []);
      } else {
        showError(fileData?.message || "Unable to fetch client files.");
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
          "Unable to fetch client files."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientFilesData();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const resetForm = () => {
    setFormData({
      clientId: "",
      assignmentId: "",
      fileTitle: "",
      fileCategory: "",
      serviceName: "",
      period: "",
      status: "Shared with Client",
      remarks: "",
      adminRemark: "",
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
    if (!client) return "Individual";

    return client.clientType === "BUSINESS" ? "Business" : "Individual";
  };

  const getFileClientName = (file) => {
    return getClientName(file.client);
  };

  const getFileClientType = (file) => {
    return getClientType(file.client);
  };

  const getAssignmentLabel = (assignment) => {
    const service = assignment.serviceName || "Assignment";
    const period = assignment.period ? ` • ${assignment.period}` : "";

    return `${service}${period}`;
  };

  const getFileAssignmentName = (file) => {
    if (file.assignment?.serviceName) {
      return `${file.assignment.serviceName}${
        file.assignment.period ? ` / ${file.assignment.period}` : ""
      }`;
    }

    return file.serviceName || "Not linked";
  };

  const getUploadedBy = (file) => {
    return file.uploadedBy === "Office Staff" ? "Staff" : "Admin";
  };

  const getFileName = (file) => {
    return file.originalName || file.fileName || "Uploaded File";
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

  const getStatusClass = (status) => {
    if (status === "Shared with Client") return "shared";
    if (status === "Approved") return "shared";
    if (status === "Pending Admin Approval") return "pending-approval";
    if (status === "Correction Required") return "draft";
    if (status === "Archived") return "draft";

    return "pending";
  };

  const selectedClientAssignments = useMemo(() => {
    if (!formData.clientId) return [];

    return assignments.filter(
      (assignment) => assignment.client?._id === formData.clientId
    );
  }, [assignments, formData.clientId]);

  const totalFiles = clientFiles.length;

  const sharedCount = clientFiles.filter((file) =>
    ["Shared with Client", "Approved"].includes(file.status)
  ).length;

  const pendingApprovalCount = clientFiles.filter(
    (file) => file.status === "Pending Admin Approval"
  ).length;

  const draftCount = clientFiles.filter((file) =>
    ["Correction Required", "Archived"].includes(file.status)
  ).length;

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "file") {
      setFormData((prev) => ({
        ...prev,
        file: files?.[0] || null,
      }));
      return;
    }

    if (name === "clientId") {
      setFormData((prev) => ({
        ...prev,
        clientId: value,
        assignmentId: "",
        serviceName: "",
        period: "",
      }));
      return;
    }

    if (name === "assignmentId") {
      const selectedAssignment = assignments.find(
        (assignment) => assignment._id === value
      );

      setFormData((prev) => ({
        ...prev,
        assignmentId: value,
        serviceName: selectedAssignment?.serviceName || "",
        period: selectedAssignment?.period || "",
      }));
      return;
    }

    if (name === "fileCategory") {
      setFormData((prev) => ({
        ...prev,
        fileCategory: value,
        fileTitle: prev.fileTitle || value,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.clientId) {
      showError("Please select client.");
      return;
    }

    if (!formData.fileTitle.trim()) {
      showError("Please enter file title.");
      return;
    }

    if (!formData.fileCategory) {
      showError("Please select file category.");
      return;
    }

    if (!formData.file) {
      showError("Please upload file.");
      return;
    }

    try {
      setUploading(true);

      const payload = new FormData();

      payload.append("clientId", formData.clientId);

      if (formData.assignmentId) {
        payload.append("assignmentId", formData.assignmentId);
      }

      payload.append("fileTitle", formData.fileTitle);
      payload.append("fileCategory", formData.fileCategory);

      if (formData.serviceName) {
        payload.append("serviceName", formData.serviceName);
      }

      if (formData.period) {
        payload.append("period", formData.period);
      }

      payload.append("status", formData.status);
      payload.append("remarks", formData.remarks);
      payload.append("adminRemark", formData.adminRemark);
      payload.append("file", formData.file);

      const data = await uploadClientFileByAdmin(payload);

      if (data?.success) {
        showSuccess("Client file uploaded successfully.");
        await fetchClientFilesData();
        resetForm();
        setShowUploadForm(false);
      } else {
        showError(data?.message || "Unable to upload client file.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to upload client file."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleOpenApproveFile = (file) => {
    setApproveTargetFile(file);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseApproveFile = () => {
    if (approvingId) return;

    setApproveTargetFile(null);
    setErrorMessage("");
  };

  const handleConfirmApproveFile = async () => {
    if (!approveTargetFile?._id) return;

    try {
      setApprovingId(approveTargetFile._id);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await updateClientFileStatusByAdmin(approveTargetFile._id, {
        status: "Shared with Client",
        adminRemark: "Approved and shared with client.",
      });

      if (data?.success) {
        setApproveTargetFile(null);
        showSuccess("Client file approved and shared.");
        await fetchClientFilesData();
      } else {
        showError(data?.message || "Unable to approve client file.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to approve client file."
      );
    } finally {
      setApprovingId("");
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadClientFile(file._id, getFileName(file));
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to download file."
      );
    }
  };

  const handleView = async (file) => {
    try {
      await viewClientFile(file._id);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to view file."
      );
    }
  };

  return (
    <div className="client-files-page">
      <AdminSidebar active="client-files" />

      <main className="client-files-main">
        <header className="client-files-header">
          <div>
            <h1>Client File Sharing</h1>
            <p>
              Admin and Staff can upload completed files, certificates, reports
              and filed copies for client download.
            </p>
          </div>

          <button
            type="button"
            className="upload-client-file-btn"
            onClick={() => setShowUploadForm(true)}
          >
            <Upload size={18} />
            Upload Completed File
          </button>
        </header>

        {errorMessage && !approveTargetFile && (
          <div
            className="client-files-panel"
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

        {successMessage && !approveTargetFile && (
          <div
            className="client-files-panel"
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
          <section className="client-file-upload-panel">
            <div className="client-file-upload-header">
              <div>
                <h2>Upload Completed File for Client</h2>
                <p>
                  Use this when Admin or Staff has completed client work and
                  wants to share final file, report or certificate with client.
                </p>
              </div>

              <button
                type="button"
                className="client-file-close-btn"
                onClick={() => {
                  resetForm();
                  setShowUploadForm(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form className="client-file-upload-form" onSubmit={handleSubmit}>
              <div className="client-file-form-grid">
                <div className="client-file-form-group">
                  <label>Client Name</label>
                  <select
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleInputChange}
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

                <div className="client-file-form-group">
                  <label>File Title</label>
                  <input
                    type="text"
                    name="fileTitle"
                    placeholder="Example: GST Return Filed Copy"
                    value={formData.fileTitle}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="client-file-form-group">
                  <label>File Category</label>
                  <select
                    name="fileCategory"
                    value={formData.fileCategory}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select file category</option>
                    {fileCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="client-file-form-group">
                  <label>Related Assignment</label>
                  <select
                    name="assignmentId"
                    value={formData.assignmentId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select assignment</option>
                    {selectedClientAssignments.map((assignment) => (
                      <option key={assignment._id} value={assignment._id}>
                        {getAssignmentLabel(assignment)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="client-file-form-group">
                  <label>Approval / Sharing Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Shared with Client">
                      Shared with Client
                    </option>
                    <option value="Approved">Approved</option>
                    <option value="Pending Admin Approval">
                      Pending Admin Approval
                    </option>
                    <option value="Correction Required">
                      Correction Required
                    </option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="client-file-form-group">
                  <label>Service / Period</label>
                  <input
                    type="text"
                    value={
                      formData.serviceName
                        ? `${formData.serviceName}${
                            formData.period ? ` / ${formData.period}` : ""
                          }`
                        : "Auto-filled from assignment"
                    }
                    readOnly
                  />
                </div>

                <div className="client-file-form-group full-width">
                  <label>Upload Final File / Report</label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="client-file-form-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    rows="4"
                    placeholder="Example: Final signed net worth certificate uploaded for client download."
                    value={formData.remarks}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>

              <div className="client-file-upload-actions">
                <button
                  type="button"
                  className="client-file-cancel-btn"
                  onClick={() => {
                    resetForm();
                    setShowUploadForm(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="client-file-submit-btn"
                  disabled={uploading}
                >
                  <Send size={17} />
                  {uploading ? "Uploading..." : "Share with Client"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="client-files-stats-grid">
          <div className="client-file-stat-card">
            <div className="client-file-stat-icon blue">
              <FileText />
            </div>
            <div>
              <p>Total Files</p>
              <h3>{totalFiles}</h3>
            </div>
          </div>

          <div className="client-file-stat-card">
            <div className="client-file-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Shared with Client</p>
              <h3>{sharedCount}</h3>
            </div>
          </div>

          <div className="client-file-stat-card">
            <div className="client-file-stat-icon orange">
              <AlertTriangle />
            </div>
            <div>
              <p>Pending Admin Approval</p>
              <h3>{pendingApprovalCount}</h3>
            </div>
          </div>

          <div className="client-file-stat-card">
            <div className="client-file-stat-icon purple">
              <Clock />
            </div>
            <div>
              <p>Internal Drafts</p>
              <h3>{draftCount}</h3>
            </div>
          </div>
        </section>

        <section className="client-files-panel">
          <div className="client-files-panel-header">
            <div>
              <h2>Completed Files / Reports for Clients</h2>
              <p>
                Client deliverables, certificates, reports, filed copies and
                other completed work files.
              </p>
            </div>

            <span>
              {loading ? "Loading..." : `${clientFiles.length} File(s)`}
            </span>
          </div>

          <div className="client-shared-file-list">
            {!loading && clientFiles.length === 0 ? (
              <div
                className="client-files-panel"
                style={{
                  boxShadow: "none",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                }}
              >
                No client files found.
              </div>
            ) : (
              clientFiles.map((file) => (
                <div className="client-shared-file-card" key={file._id}>
                  <div className="client-shared-file-left">
                    <div
                      className={
                        getFileClientType(file) === "Business"
                          ? "client-shared-file-icon business"
                          : "client-shared-file-icon individual"
                      }
                    >
                      {getFileClientType(file) === "Business" ? (
                        <Building2 />
                      ) : (
                        <UserRound />
                      )}
                    </div>

                    <div>
                      <h3>{getFileClientName(file)}</h3>
                      <p>{getFileAssignmentName(file)}</p>
                      <small>{file.fileCategory}</small>
                    </div>
                  </div>

                  <div className="client-shared-file-info">
                    <p>File Name</p>
                    <h4>{getFileName(file)}</h4>
                    <small>Uploaded by {getUploadedBy(file)}</small>
                  </div>

                  <div className="client-shared-file-date">
                    <p>Date</p>
                    <h4>{formatDate(file.sharedAt || file.createdAt)}</h4>
                  </div>

                  <div className="client-shared-file-status">
                    <span
                      className={`file-status ${getStatusClass(file.status)}`}
                    >
                      {file.status}
                    </span>
                    <small>
                      {file.adminRemark || file.remarks || "No remarks."}
                    </small>
                  </div>

                  <div className="client-shared-file-actions">
                    <button
                      type="button"
                      className="file-view-btn"
                      onClick={() => handleView(file)}
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      type="button"
                      className="file-download-btn"
                      onClick={() => handleDownload(file)}
                    >
                      <Download size={15} />
                      Download
                    </button>

                    {file.status === "Pending Admin Approval" && (
                      <button
                        type="button"
                        className="file-approve-btn"
                        disabled={approvingId === file._id}
                        onClick={() => handleOpenApproveFile(file)}
                      >
                        <CheckCircle size={15} />
                        {approvingId === file._id ? "Approving..." : "Approve"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {approveTargetFile && (
          <div className="client-file-approve-backdrop">
            <div className="client-file-approve-modal">
              <button
                type="button"
                className="client-file-approve-close"
                onClick={handleCloseApproveFile}
                disabled={Boolean(approvingId)}
              >
                <X size={18} />
              </button>

              <div className="client-file-approve-icon">
                <CheckCircle size={28} />
              </div>

              <h2>Approve & Share File?</h2>

              <p>
                Are you sure you want to approve{" "}
                <strong>{getFileName(approveTargetFile)}</strong> for{" "}
                <strong>{getFileClientName(approveTargetFile)}</strong>?
              </p>

              <small>
                This file will be shared with the client for download.
              </small>

              {errorMessage && (
                <div className="client-file-approve-error">{errorMessage}</div>
              )}

              <div className="client-file-approve-actions">
                <button
                  type="button"
                  className="client-file-approve-cancel"
                  onClick={handleCloseApproveFile}
                  disabled={Boolean(approvingId)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="client-file-approve-confirm"
                  onClick={handleConfirmApproveFile}
                  disabled={Boolean(approvingId)}
                >
                  <CheckCircle size={16} />
                  {approvingId ? "Approving..." : "Approve & Share"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
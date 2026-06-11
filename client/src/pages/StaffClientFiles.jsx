import { useEffect, useMemo, useState } from "react";
import {
  FolderOpen,
  Upload,
  Download,
  Eye,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  UserRound,
  X,
  RefreshCcw,
  Search,
} from "lucide-react";

import StaffSidebar from "../components/StaffSidebar";

import { getMyStaffAssignments } from "../services/assignmentService";

import {
  getMyStaffClientFiles,
  uploadClientFileByStaff,
  replaceClientFile,
  downloadClientFile,
  viewClientFile,
} from "../services/clientFileService";

import "./StaffClientFiles.css";

const FILE_CATEGORIES = [
  "Net Worth Certificate",
  "ITR Computation",
  "ITR Acknowledgement",
  "GST Filed Return Copy",
  "GST Challan",
  "TDS Return Acknowledgement",
  "Tax Audit Report",
  "Final Balance Sheet",
  "Project Report",
  "CMA Report",
  "Working File",
  "Computation of Income",
  "CA Certificate",
  "Other Client Deliverable",
];

export default function StaffClientFiles() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [clientFiles, setClientFiles] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [uploadForm, setUploadForm] = useState({
    clientId: "",
    assignmentId: "",
    fileTitle: "",
    fileCategory: "Other Client Deliverable",
    serviceName: "",
    period: "",
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

  const fetchClientFileData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [assignmentData, fileData] = await Promise.all([
        getMyStaffAssignments(),
        getMyStaffClientFiles(),
      ]);

      if (assignmentData?.success) {
        setAssignments(assignmentData.assignments || []);
      }

      if (fileData?.success) {
        setClientFiles(fileData.clientFiles || []);
      } else {
        showError(fileData?.message || "Unable to fetch client deliverables.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch client deliverables."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientFileData();
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
      fileTitle: "",
      fileCategory: "Other Client Deliverable",
      serviceName: "",
      period: "",
      remarks: "",
      file: null,
    });
  };

  const getClientId = (client) => {
    if (!client) return "";
    return typeof client === "string" ? client : client._id;
  };

  const getAssignmentId = (assignment) => {
    if (!assignment) return "";
    return typeof assignment === "string" ? assignment : assignment._id;
  };

  const getClientName = (client) => {
    if (!client) return "-";

    if (client.clientType === "BUSINESS") {
      return client.businessName || client.user?.name || "Business Client";
    }

    return client.individualName || client.user?.name || "Individual Client";
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
    return file?.originalName || file?.fileName || "Client Deliverable";
  };

  const getServiceName = (file) => {
    return file?.assignment?.serviceName || file?.serviceName || "-";
  };

  const getPeriod = (file) => {
    return file?.assignment?.period || file?.period || "";
  };

  const getStatusClass = (status) => {
    if (status === "Approved" || status === "Shared with Client") {
      return "approved";
    }

    if (status === "Pending Admin Approval") return "pending";
    if (status === "Correction Required") return "correction";
    if (status === "Archived") return "normal";

    return "normal";
  };

  const canReplaceClientFile = (fileRow) => {
    if (!fileRow?.rawFile?._id) return false;

    return fileRow.status !== "Archived";
  };

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

  const rows = useMemo(() => {
    return clientFiles.map((file) => ({
      id: file._id,
      client: getClientName(file.client),
      clientId: getClientId(file.client),
      assignmentId: getAssignmentId(file.assignment),
      service: getServiceName(file),
      period: getPeriod(file),
      fileType: file.fileCategory || file.fileTitle || "Client Deliverable",
      fileTitle: file.fileTitle || "",
      fileName: getFileName(file),
      uploadedOn: formatDate(file.createdAt),
      status: file.status || "Pending Admin Approval",
      remarks:
        file.adminRemark ||
        file.remarks ||
        "Submitted to Admin for review before client sharing.",
      rawFile: file,
    }));
  }, [clientFiles]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return rows;

    return rows.filter((file) => {
      return (
        file.client.toLowerCase().includes(term) ||
        file.service.toLowerCase().includes(term) ||
        file.fileType.toLowerCase().includes(term) ||
        file.fileName.toLowerCase().includes(term) ||
        file.status.toLowerCase().includes(term)
      );
    });
  }, [rows, searchTerm]);

  const totalFiles = rows.length;

  const approvedFiles = rows.filter(
    (file) => file.status === "Approved" || file.status === "Shared with Client"
  ).length;

  const pendingFiles = rows.filter(
    (file) => file.status === "Pending Admin Approval"
  ).length;

  const correctionFiles = rows.filter(
    (file) => file.status === "Correction Required"
  ).length;

  const openUploadForm = (fileRow = null) => {
    if (fileRow) {
      setSelectedFile(fileRow.rawFile);

      setUploadForm({
        clientId: fileRow.clientId || "",
        assignmentId: fileRow.assignmentId || "",
        fileTitle: fileRow.fileTitle || fileRow.fileType || "Client Deliverable",
        fileCategory: fileRow.fileType || "Other Client Deliverable",
        serviceName: fileRow.service || "",
        period: fileRow.period || "",
        remarks: `Revised deliverable uploaded for ${fileRow.status}.`,
        file: null,
      });
    } else {
      setSelectedFile(null);
      resetUploadForm();
    }

    setShowUploadForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeUploadForm = () => {
    if (uploading) return;

    setSelectedFile(null);
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
        fileTitle:
          prev.fileTitle ||
          `${assignment?.serviceName || "Client Deliverable"} - Final File`,
      }));
      return;
    }

    setUploadForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleView = async (file) => {
    try {
      await viewClientFile(file.rawFile._id);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to view file."
      );
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadClientFile(file.rawFile._id, file.fileName);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to download file."
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!uploadForm.clientId) {
      showError("Please select client.");
      return;
    }

    if (!uploadForm.fileTitle.trim()) {
      showError("Please enter file title.");
      return;
    }

    if (!uploadForm.fileCategory) {
      showError("Please select file category.");
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

      if (selectedFile?._id) {
        const data = await replaceClientFile(selectedFile._id, formData);

        if (data?.success) {
          showSuccess("Deliverable replaced successfully and sent for Admin review.");
          await fetchClientFileData();
          closeUploadForm();
        } else {
          showError(data?.message || "Unable to replace deliverable.");
        }

        return;
      }

      formData.append("clientId", uploadForm.clientId);

      if (uploadForm.assignmentId) {
        formData.append("assignmentId", uploadForm.assignmentId);
      }

      formData.append("fileTitle", uploadForm.fileTitle);
      formData.append("fileCategory", uploadForm.fileCategory);
      formData.append("serviceName", uploadForm.serviceName || "");
      formData.append("period", uploadForm.period || "");

      const data = await uploadClientFileByStaff(formData);

      if (data?.success) {
        showSuccess("Client deliverable submitted successfully for Admin approval.");
        await fetchClientFileData();
        closeUploadForm();
      } else {
        showError(data?.message || "Unable to upload client deliverable.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to save client deliverable."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="staff-client-files-page">
      <StaffSidebar active="client-files" />

      <main className="staff-client-files-main">
        <header className="staff-client-files-header">
          <div>
            <h1>Client Deliverables</h1>
            <p>
              Upload completed files, certificates, reports, acknowledgements
              and final documents to be shared with clients after Admin approval.
            </p>
          </div>

          <button
            type="button"
            className="staff-client-file-upload-btn"
            onClick={() => openUploadForm()}
          >
            <Upload size={18} />
            Upload File for Client
          </button>
        </header>

        {errorMessage && (
          <div className="staff-client-file-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="staff-client-file-message success">
            {successMessage}
          </div>
        )}

        <section className="staff-client-file-stats">
          <div className="staff-client-file-stat-card">
            <div className="staff-client-file-stat-icon blue">
              <FolderOpen />
            </div>
            <div>
              <p>Total Deliverables</p>
              <h3>{loading ? "..." : totalFiles}</h3>
            </div>
          </div>

          <div className="staff-client-file-stat-card">
            <div className="staff-client-file-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Approved</p>
              <h3>{loading ? "..." : approvedFiles}</h3>
            </div>
          </div>

          <div className="staff-client-file-stat-card">
            <div className="staff-client-file-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>Pending Approval</p>
              <h3>{loading ? "..." : pendingFiles}</h3>
            </div>
          </div>

          <div className="staff-client-file-stat-card">
            <div className="staff-client-file-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Corrections</p>
              <h3>{loading ? "..." : correctionFiles}</h3>
            </div>
          </div>
        </section>

        {showUploadForm && (
          <section className="staff-client-file-upload-panel">
            <div className="staff-client-file-upload-header">
              <div>
                <h2>
                  {selectedFile ? "Replace Deliverable" : "Upload File for Client"}
                </h2>
                <p>
                  {selectedFile
                    ? "Upload a revised client deliverable. It will replace the existing file and go back to Admin for review."
                    : "Client will see the file only after Admin approval."}
                </p>
              </div>

              <button
                type="button"
                className="staff-client-file-close-btn"
                onClick={closeUploadForm}
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="staff-client-file-upload-form"
              onSubmit={handleSubmit}
            >
              <div className="staff-client-file-form-grid">
                <div className="staff-client-file-form-group">
                  <label>Client Name</label>
                  <select
                    name="clientId"
                    value={uploadForm.clientId}
                    onChange={handleInputChange}
                    required
                    disabled={Boolean(selectedFile)}
                  >
                    <option value="">Select client</option>
                    {clientOptions.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-client-file-form-group">
                  <label>Related Work / Service</label>
                  <select
                    name="assignmentId"
                    value={uploadForm.assignmentId}
                    onChange={handleInputChange}
                    disabled={Boolean(selectedFile)}
                  >
                    <option value="">Select assignment</option>
                    {selectedClientAssignments.map((assignment) => (
                      <option key={assignment._id} value={assignment._id}>
                        {assignment.serviceName}
                        {assignment.period ? ` • ${assignment.period}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-client-file-form-group">
                  <label>File Title</label>
                  <input
                    type="text"
                    name="fileTitle"
                    placeholder="Example: GST Filed Return Copy"
                    value={uploadForm.fileTitle}
                    onChange={handleInputChange}
                    required
                    disabled={Boolean(selectedFile)}
                  />
                </div>

                <div className="staff-client-file-form-group">
                  <label>File Category</label>
                  <select
                    name="fileCategory"
                    value={uploadForm.fileCategory}
                    onChange={handleInputChange}
                    required
                    disabled={Boolean(selectedFile)}
                  >
                    {FILE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-client-file-form-group full-width">
                  <label>
                    {selectedFile
                      ? "Upload Revised Deliverable"
                      : "Upload Final File / Deliverable"}
                  </label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="staff-client-file-form-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    rows="4"
                    placeholder={
                      selectedFile
                        ? "Example: Revised computation uploaded after correction."
                        : "Example: GST filed return copy uploaded for client sharing after Admin approval."
                    }
                    value={uploadForm.remarks}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>

              <div className="staff-client-file-upload-actions">
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
                    : selectedFile
                    ? "Replace Deliverable"
                    : "Submit to Admin"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="staff-client-file-panel">
          <div className="staff-client-file-panel-header">
            <div>
              <h2>Files Prepared for Client</h2>
              <p>
                Track client deliverables submitted for Admin approval and final
                client sharing.
              </p>
            </div>

            <div className="staff-client-file-header-actions">
              <div className="staff-client-file-search">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search deliverable..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="staff-client-file-refresh-btn"
                onClick={fetchClientFileData}
                disabled={loading}
              >
                <RefreshCcw size={16} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="staff-client-file-list">
            {loading && filteredRows.length === 0 ? (
              <div className="staff-client-file-empty-state">
                Loading client deliverables...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="staff-client-file-empty-state">
                {searchTerm
                  ? "No matching deliverable found."
                  : "No client deliverables uploaded yet."}
              </div>
            ) : (
              filteredRows.map((file) => (
                <div className="staff-client-file-card" key={file.id}>
                  <div className="staff-client-file-left">
                    <div className="staff-client-file-icon">
                      <UserRound />
                    </div>

                    <div>
                      <h3>{file.client}</h3>
                      <p>{file.service}</p>
                      <small>{file.fileType}</small>
                    </div>
                  </div>

                  <div className="staff-client-file-info">
                    <p>File Name</p>
                    <h4>
                      <FileText size={15} />
                      {file.fileName}
                    </h4>
                    <small>{file.uploadedOn}</small>
                  </div>

                  <div className="staff-client-file-status-box">
                    <span
                      className={`staff-client-file-status ${getStatusClass(
                        file.status
                      )}`}
                    >
                      {file.status}
                    </span>
                    <small>{file.remarks}</small>
                  </div>

                  <div className="staff-client-file-actions">
                    <button type="button" onClick={() => handleView(file)}>
                      <Eye size={15} />
                      View
                    </button>

                    <button type="button" onClick={() => handleDownload(file)}>
                      <Download size={15} />
                      Download
                    </button>

                    {canReplaceClientFile(file) && (
                      <button
                        type="button"
                        className="staff-client-file-replace-btn"
                        onClick={() => openUploadForm(file)}
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
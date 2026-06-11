import { useEffect, useMemo, useState } from "react";
import {
  FileCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Upload,
  Send,
  X,
  UserRound,
  FileText,
  RefreshCcw,
} from "lucide-react";

import StaffSidebar from "../components/StaffSidebar";

import {
  getMyStaffClientFiles,
  replaceClientFile,
  downloadClientFile,
  viewClientFile,
} from "../services/clientFileService";

import "./StaffReviewSubmission.css";

const SUBMISSION_TYPES = [
  "Correction File",
  "Revised Working File",
  "Revised Report",
  "Supporting Document",
];

export default function StaffReviewSubmission() {
  const [clientFiles, setClientFiles] = useState([]);

  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [correctionForm, setCorrectionForm] = useState({
    submissionType: "Correction File",
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

  const fetchReviewFiles = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getMyStaffClientFiles();

      if (data?.success) {
        setClientFiles(data.clientFiles || []);
      } else {
        showError(data?.message || "Unable to fetch review files.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch review files."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviewFiles();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const resetCorrectionForm = () => {
    setCorrectionForm({
      submissionType: "Correction File",
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

  const getServiceName = (file) => {
    return file?.assignment?.serviceName || file?.serviceName || "-";
  };

  const getDisplayStatus = (status) => {
    if (status === "Pending Admin Approval") return "Pending Admin Review";
    if (status === "Correction Required") return "Correction Required";
    if (status === "Approved") return "Approved";
    if (status === "Shared with Client") return "Approved";
    if (status === "Archived") return "Rejected";

    return status || "Pending Admin Review";
  };

  const getStatusClass = (status) => {
    if (status === "Pending Admin Review") return "pending";
    if (status === "Correction Required") return "correction";
    if (status === "Approved") return "approved";
    if (status === "Rejected") return "rejected";
    return "normal";
  };

  const reviewFiles = useMemo(() => {
    return clientFiles
      .filter((file) => file.uploadedBy === "Office Staff" || file.uploadedByStaff)
      .map((file) => {
        const displayStatus = getDisplayStatus(file.status);

        return {
          id: file._id,
          client: getClientName(file.client),
          service: getServiceName(file),
          fileName: getFileName(file),
          fileType: file.fileCategory || file.fileTitle || "Client File",
          submittedOn: formatDate(file.createdAt),
          submittedFrom: "My Assignments",
          status: displayStatus,
          backendStatus: file.status,
          adminRemark:
            file.adminRemark ||
            file.remarks ||
            (displayStatus === "Pending Admin Review"
              ? "Waiting for Admin/CA review."
              : "-"),
          rawFile: file,
        };
      });
  }, [clientFiles]);

  const pendingReview = reviewFiles.filter(
    (file) => file.status === "Pending Admin Review"
  ).length;

  const correctionRequired = reviewFiles.filter(
    (file) => file.status === "Correction Required"
  ).length;

  const approvedFiles = reviewFiles.filter(
    (file) => file.status === "Approved"
  ).length;

  const rejectedFiles = reviewFiles.filter(
    (file) => file.status === "Rejected"
  ).length;

  const openCorrectionForm = (file) => {
    setSelectedFile(file);
    setShowCorrectionForm(true);
    resetCorrectionForm();
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeCorrectionForm = () => {
    if (submitting) return;

    setSelectedFile(null);
    setShowCorrectionForm(false);
    resetCorrectionForm();
    setErrorMessage("");
  };

  const handleCorrectionInputChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "file") {
      setCorrectionForm((prev) => ({
        ...prev,
        file: files?.[0] || null,
      }));
      return;
    }

    setCorrectionForm((prev) => ({
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

  const handleCorrectionSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile?.rawFile?._id) {
      showError("Please select correction file.");
      return;
    }

    if (!correctionForm.file) {
      showError("Please upload corrected file.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const formData = new FormData();

      formData.append("file", correctionForm.file);
      formData.append(
        "remarks",
        `${correctionForm.submissionType}: ${correctionForm.remarks}`.trim()
      );

      const data = await replaceClientFile(selectedFile.rawFile._id, formData);

      if (data?.success) {
        showSuccess("Correction file resubmitted successfully for admin review.");
        await fetchReviewFiles();
        closeCorrectionForm();
      } else {
        showError(data?.message || "Unable to resubmit correction file.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to resubmit correction file."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="staff-review-page">
      <StaffSidebar active="review" />

      <main className="staff-review-main">
        <header className="staff-review-header">
          <div>
            <h1>Review Status</h1>
            <p>
              Track files submitted from My Assignments and view Admin approval,
              correction, rejection or pending review status.
            </p>
          </div>

          <div className="staff-review-header-actions">
            <div className="staff-review-info-badge">
              <FileCheck size={18} />
              Submitted files are reviewed by Admin
            </div>

            <button
              type="button"
              className="staff-review-refresh-btn"
              onClick={fetchReviewFiles}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="staff-review-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="staff-review-message success">{successMessage}</div>
        )}

        <section className="staff-review-stats">
          <div className="staff-review-stat-card">
            <div className="staff-review-stat-icon blue">
              <FileCheck />
            </div>
            <div>
              <p>Total Submitted</p>
              <h3>{loading ? "..." : reviewFiles.length}</h3>
            </div>
          </div>

          <div className="staff-review-stat-card">
            <div className="staff-review-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>Pending Review</p>
              <h3>{loading ? "..." : pendingReview}</h3>
            </div>
          </div>

          <div className="staff-review-stat-card">
            <div className="staff-review-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Corrections</p>
              <h3>{loading ? "..." : correctionRequired}</h3>
            </div>
          </div>

          <div className="staff-review-stat-card">
            <div className="staff-review-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Approved</p>
              <h3>{loading ? "..." : approvedFiles}</h3>
            </div>
          </div>

          <div className="staff-review-stat-card">
            <div className="staff-review-stat-icon gray">
              <XCircle />
            </div>
            <div>
              <p>Rejected</p>
              <h3>{loading ? "..." : rejectedFiles}</h3>
            </div>
          </div>
        </section>

        {showCorrectionForm && (
          <section className="staff-review-form-panel">
            <div className="staff-review-form-header">
              <div>
                <h2>Resubmit Correction File</h2>
                <p>
                  Upload corrected file only for assignments marked as Correction
                  Required by Admin.
                </p>
              </div>

              <button
                type="button"
                className="staff-review-close-btn"
                onClick={closeCorrectionForm}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="staff-review-form"
              onSubmit={handleCorrectionSubmit}
            >
              <div className="staff-review-form-grid">
                <div className="staff-review-form-group">
                  <label>Client Name</label>
                  <input
                    type="text"
                    value={selectedFile?.client || ""}
                    readOnly
                  />
                </div>

                <div className="staff-review-form-group">
                  <label>Assignment / Service</label>
                  <input
                    type="text"
                    value={selectedFile?.service || ""}
                    readOnly
                  />
                </div>

                <div className="staff-review-form-group">
                  <label>Original File</label>
                  <input
                    type="text"
                    value={selectedFile?.fileName || ""}
                    readOnly
                  />
                </div>

                <div className="staff-review-form-group">
                  <label>Submission Type</label>
                  <select
                    name="submissionType"
                    value={correctionForm.submissionType}
                    onChange={handleCorrectionInputChange}
                    required
                  >
                    {SUBMISSION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff-review-form-group full-width">
                  <label>Admin Remark</label>
                  <textarea
                    value={selectedFile?.adminRemark || ""}
                    readOnly
                  ></textarea>
                </div>

                <div className="staff-review-form-group full-width">
                  <label>Upload Corrected File</label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleCorrectionInputChange}
                    required
                  />
                </div>

                <div className="staff-review-form-group full-width">
                  <label>Staff Reply / Correction Note</label>
                  <textarea
                    name="remarks"
                    rows="4"
                    placeholder="Example: Ledger scrutiny and depreciation schedule corrected as per Admin remark."
                    value={correctionForm.remarks}
                    onChange={handleCorrectionInputChange}
                    required
                  ></textarea>
                </div>
              </div>

              <div className="staff-review-form-actions">
                <button
                  type="button"
                  onClick={closeCorrectionForm}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button type="submit" disabled={submitting}>
                  <Send size={17} />
                  {submitting ? "Resubmitting..." : "Resubmit to Admin"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="staff-review-panel">
          <div className="staff-review-panel-header">
            <div>
              <h2>Submitted Work Review Status</h2>
              <p>
                These files are submitted from My Assignments. This page is only
                for tracking review status and resubmitting corrections.
              </p>
            </div>
          </div>

          <div className="staff-review-list">
            {loading && reviewFiles.length === 0 ? (
              <div className="staff-review-empty-state">
                Loading submitted files...
              </div>
            ) : reviewFiles.length === 0 ? (
              <div className="staff-review-empty-state">
                No submitted files found.
              </div>
            ) : (
              reviewFiles.map((file) => (
                <div className="staff-review-card" key={file.id}>
                  <div className="staff-review-client">
                    <div className="staff-review-user-icon">
                      <UserRound />
                    </div>

                    <div>
                      <h3>{file.client}</h3>
                      <p>{file.service}</p>
                      <small>{file.fileType}</small>
                    </div>
                  </div>

                  <div className="staff-review-file">
                    <p>Submitted File</p>
                    <h4>
                      <FileText size={15} />
                      {file.fileName}
                    </h4>
                    <small>
                      Submitted on {file.submittedOn} • From{" "}
                      {file.submittedFrom}
                    </small>
                  </div>

                  <div className="staff-review-status-box">
                    <span
                      className={`staff-review-status ${getStatusClass(
                        file.status
                      )}`}
                    >
                      {file.status}
                    </span>
                    <small>{file.adminRemark}</small>
                  </div>

                  <div className="staff-review-actions">
                    <button type="button" onClick={() => handleView(file)}>
                      <Eye size={15} />
                      View
                    </button>

                    <button type="button" onClick={() => handleDownload(file)}>
                      <Download size={15} />
                      Download
                    </button>

                    {file.status === "Correction Required" && (
                      <button
                        type="button"
                        onClick={() => openCorrectionForm(file)}
                      >
                        <Upload size={15} />
                        Resubmit
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="staff-review-note">
          <AlertTriangle size={18} />
          <p>
            New work submission should be done from My Assignments. This page is
            only for tracking Admin review status and resubmitting correction
            files.
          </p>
        </section>
      </main>
    </div>
  );
}
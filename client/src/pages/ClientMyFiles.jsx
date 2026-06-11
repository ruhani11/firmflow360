import { useEffect, useMemo, useState } from "react";
import {
  FolderOpen,
  Download,
  Eye,
  Search,
  CheckCircle,
  Clock,
  FileText,
  BriefcaseBusiness,
  CalendarDays,
  RefreshCcw,
} from "lucide-react";

import ClientSidebar from "../components/ClientSidebar";

import {
  getMyClientFiles,
  viewClientFile,
  downloadClientFile,
} from "../services/clientFileService";

import "./ClientMyFiles.css";

export default function ClientMyFiles() {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [activeFileId, setActiveFileId] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const fetchClientFiles = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getMyClientFiles();

      if (data?.success) {
        setFiles(data.clientFiles || []);
      } else {
        showError(data?.message || "Unable to fetch shared files.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch shared files."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientFiles();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

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

  const getFileName = (file) => {
    return file?.originalName || file?.fileName || "Shared File";
  };

  const getServiceName = (file) => {
    return file?.assignment?.serviceName || file?.serviceName || "General";
  };

  const getSharedDate = (file) => {
    return formatDate(file?.sharedAt || file?.updatedAt || file?.createdAt);
  };

  const getDisplayStatus = (status) => {
    if (status === "Approved" || status === "Shared with Client") {
      return "Available";
    }

    if (status === "Pending Admin Approval") {
      return "Awaiting Approval";
    }

    if (status === "Correction Required") {
      return "Correction Required";
    }

    if (status === "Archived") {
      return "Archived";
    }

    return status || "Awaiting Approval";
  };

  const getStatusClass = (status) => {
    if (status === "Available") return "available";
    if (status === "Awaiting Approval") return "awaiting";
    if (status === "Correction Required") return "correction";
    return "normal";
  };

  const fileRows = useMemo(() => {
    return files
      .map((file) => ({
        id: file._id,
        service: getServiceName(file),
        fileCategory: file.fileCategory || file.fileTitle || "Client File",
        fileName: getFileName(file),
        sharedOn: getSharedDate(file),
        status: getDisplayStatus(file.status),
        remarks:
          file.adminRemark ||
          file.remarks ||
          "File approved and shared by CA office.",
        rawFile: file,
      }))
      .sort((a, b) => {
        const first = new Date(a.rawFile.sharedAt || a.rawFile.updatedAt || a.rawFile.createdAt);
        const second = new Date(b.rawFile.sharedAt || b.rawFile.updatedAt || b.rawFile.createdAt);

        return second - first;
      });
  }, [files]);

  const filteredFiles = useMemo(() => {
    const term = normalizeText(searchTerm);

    if (!term) return fileRows;

    return fileRows.filter((file) => {
      return (
        normalizeText(file.service).includes(term) ||
        normalizeText(file.fileCategory).includes(term) ||
        normalizeText(file.fileName).includes(term) ||
        normalizeText(file.status).includes(term) ||
        normalizeText(file.remarks).includes(term)
      );
    });
  }, [fileRows, searchTerm]);

  const totalFiles = fileRows.length;

  const availableFiles = fileRows.filter(
    (file) => file.status === "Available"
  ).length;

  const awaitingApproval = fileRows.filter(
    (file) => file.status !== "Available"
  ).length;

  const handleView = async (file) => {
    try {
      setActiveFileId(file.id);
      await viewClientFile(file.id);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to view file."
      );
    } finally {
      setActiveFileId("");
    }
  };

  const handleDownload = async (file) => {
    try {
      setActiveFileId(file.id);
      await downloadClientFile(file.id, file.fileName);
      showSuccess("File downloaded successfully.");
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to download file."
      );
    } finally {
      setActiveFileId("");
    }
  };

  return (
    <div className="client-my-files-page">
      <ClientSidebar active="files" />

      <main className="client-my-files-main">
        <header className="client-my-files-header">
          <div>
            <h1>My Files</h1>
            <p>
              Download final files, certificates, acknowledgements and reports
              shared by the CA office after approval.
            </p>
          </div>

          <div className="client-my-files-header-actions">
            <button
              type="button"
              className="client-my-files-refresh-btn"
              onClick={fetchClientFiles}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <div className="client-my-files-badge">
              <CheckCircle size={18} />
              Admin Approved Files
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="client-my-files-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="client-my-files-message success">
            {successMessage}
          </div>
        )}

        <section className="client-my-files-stats">
          <div className="client-my-file-stat-card">
            <div className="client-my-file-stat-icon blue">
              <FolderOpen />
            </div>
            <div>
              <p>Total Files</p>
              <h3>{loading ? "..." : totalFiles}</h3>
            </div>
          </div>

          <div className="client-my-file-stat-card">
            <div className="client-my-file-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Available</p>
              <h3>{loading ? "..." : availableFiles}</h3>
            </div>
          </div>

          <div className="client-my-file-stat-card">
            <div className="client-my-file-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>Awaiting Approval</p>
              <h3>{loading ? "..." : awaitingApproval}</h3>
            </div>
          </div>
        </section>

        <section className="client-my-file-panel">
          <div className="client-my-file-panel-header">
            <div>
              <h2>Shared Files</h2>
              <p>
                Files visible here are final deliverables shared by the CA
                office for client use.
              </p>
            </div>

            <div className="client-my-file-search">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search file..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="client-my-file-list">
            {loading && filteredFiles.length === 0 ? (
              <div className="client-my-file-empty-state">
                Loading shared files...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="client-my-file-empty-state">
                {searchTerm
                  ? "No matching file found."
                  : "No file shared by office yet."}
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div className="client-my-file-card" key={file.id}>
                  <div className="client-my-file-left">
                    <div className="client-my-file-icon">
                      <FolderOpen />
                    </div>

                    <div>
                      <h3>{file.fileCategory}</h3>
                      <p>
                        <BriefcaseBusiness size={14} />
                        {file.service}
                      </p>
                      <small>{file.remarks}</small>
                    </div>
                  </div>

                  <div className="client-my-file-info">
                    <p>File Name</p>
                    <h4>
                      <FileText size={15} />
                      {file.fileName}
                    </h4>
                    <small>
                      <CalendarDays size={14} />
                      Shared on: {file.sharedOn}
                    </small>
                  </div>

                  <div className="client-my-file-status-box">
                    <span
                      className={`client-my-file-status ${getStatusClass(
                        file.status
                      )}`}
                    >
                      {file.status}
                    </span>
                  </div>

                  <div className="client-my-file-actions">
                    <button
                      type="button"
                      disabled={
                        file.status !== "Available" || activeFileId === file.id
                      }
                      onClick={() => handleView(file)}
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      type="button"
                      disabled={
                        file.status !== "Available" || activeFileId === file.id
                      }
                      onClick={() => handleDownload(file)}
                    >
                      <Download size={15} />
                      Download
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="client-my-file-note">
          <CheckCircle size={18} />
          <p>
            Only Admin/CA approved files are available for download. If any file
            is not visible, it may still be under review by the office.
          </p>
        </section>
      </main>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  ClipboardList,
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  UserRound,
  Building2,
  CalendarDays,
  Circle,
  Eye,
  RotateCcw,
  Pencil,
  Trash2,
  Save,
  X,
  Download,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";

import { getAllClients, getAllStaff } from "../services/adminService";

import {
  createAssignment,
  deleteAssignment,
  getAllAssignmentsForAdmin,
  updateAssignment,
  updateAssignmentStatus,
} from "../services/assignmentService";

import {
  getAllClientFilesForAdmin,
  viewClientFile,
  downloadClientFile,
} from "../services/clientFileService";

import "./AssignmentManagement.css";

export default function AssignmentManagement() {
  const [assignments, setAssignments] = useState([]);
  const [clients, setClients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [clientFiles, setClientFiles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deleteTargetAssignment, setDeleteTargetAssignment] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    clientId: "",
    staffId: "",
    serviceName: "",
    period: "",
    priority: "Medium",
    dueDate: "",
    instructions: "",

    status: "Not Started",
    completionPercent: 0,
    requiredDocumentsText: "",
    latestUpdate: "",
    remarks: "",
  });

  const documentTemplates = [
    {
      service: "GST Return Filing",
      documents: [
        "Sales Register",
        "Purchase Register",
        "GSTR-1",
        "GSTR-3B",
        "Bank Statement",
        "Expense Bills",
      ],
    },
    {
      service: "Personal Income Tax Return",
      documents: [
        "PAN Card",
        "Form 16",
        "Bank Statement",
        "Capital Gain Statement",
        "House Property Details",
      ],
    },
    {
      service: "Tax Audit",
      documents: [
        "Trial Balance",
        "Ledger",
        "Bank Statement",
        "Fixed Asset Register",
        "GST Returns",
        "TDS Returns",
        "Loan Statements",
      ],
    },
  ];

  const serviceOptions = [
    "GST Return Filing",
    "Personal Income Tax Return",
    "Tax Audit",
    "Capital Gain Computation",
    "TDS Return",
    "Accounting",
    "ROC Filing",
  ];

  const statusOptions = [
    "Not Started",
    "In Progress",
    "Pending Documents",
    "Working File Prepared",
    "Submitted for Review",
    "Correction Required",
    "Approved",
    "Completed",
  ];

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [assignmentData, clientData, staffData, clientFileData] =
        await Promise.all([
          getAllAssignmentsForAdmin(),
          getAllClients(),
          getAllStaff(),
          getAllClientFilesForAdmin(),
        ]);

      if (assignmentData?.success) {
        setAssignments(assignmentData.assignments || []);
      } else {
        setErrorMessage(
          assignmentData?.message || "Unable to fetch assignments."
        );
      }

      if (clientData?.success) {
        setClients(clientData.clients || []);
      }

      if (staffData?.success) {
        setStaffList(staffData.staff || []);
      }

      if (clientFileData?.success) {
        setClientFiles(
          clientFileData.clientFiles ||
            clientFileData.files ||
            clientFileData.data ||
            []
        );
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch assignment data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialData();
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
      staffId: "",
      serviceName: "",
      period: "",
      priority: "Medium",
      dueDate: "",
      instructions: "",

      status: "Not Started",
      completionPercent: 0,
      requiredDocumentsText: "",
      latestUpdate: "",
      remarks: "",
    });
  };

  const getId = (value) => {
    if (!value) return "";
    return typeof value === "string" ? value : value._id;
  };

  const getClientName = (client) => {
    if (!client) return "-";

    if (client.clientType === "BUSINESS") {
      return client.businessName || client.user?.name || "Business Client";
    }

    return client.individualName || client.user?.name || "Individual Client";
  };

  const getClientType = (client) => {
    if (!client) return "-";
    return client.clientType === "BUSINESS" ? "Business" : "Individual";
  };

  const getStaffName = (staff) => {
    return staff?.user?.name || "Unassigned Staff";
  };

  const getStatusClass = (status) => {
    if (status === "In Progress") return "progress";
    if (status === "Pending Documents") return "pending";
    if (status === "Submitted for Review") return "review";
    if (status === "Working File Prepared") return "review";
    if (status === "Correction Required") return "correction";
    if (status === "Approved") return "approved";
    if (status === "Completed") return "completed";

    return "not-started";
  };

  const getPriorityClass = (priority) => {
    if (priority === "High") return "high";
    if (priority === "Medium") return "medium";
    return "low";
  };

  const getReviewStatusClass = (status) => {
    if (status === "Submitted for Review") return "pending-review";
    if (status === "Correction Required") return "correction";
    if (status === "Approved") return "approved";
    return "pending-review";
  };

  const getRequiredDocumentsText = (assignment) => {
    return (assignment.requiredDocuments || []).join("\n");
  };

  const getDocumentCountText = (assignment) => {
    const total = assignment.requiredDocuments?.length || 0;

    if (total === 0) return "0 Required";

    return `${total} Required`;
  };

  const getProgressWidth = (assignment) => {
    const value = Number(assignment.completionPercent || 0);
    return `${Math.min(Math.max(value, 0), 100)}%`;
  };

  const getFileDisplayName = (file) => {
    return (
      file?.fileTitle ||
      file?.originalName ||
      file?.fileName ||
      "Submitted File"
    );
  };

  const getFileDownloadName = (file) => {
    return file?.originalName || file?.fileName || "client-file";
  };

  const getFilesForAssignment = (assignmentId) => {
    if (!assignmentId) return [];

    return clientFiles.filter((file) => {
      const fileAssignmentId = getId(file.assignment);
      return fileAssignmentId === assignmentId;
    });
  };

  const handleViewSubmittedFile = async (file) => {
    try {
      await viewClientFile(file._id);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to view submitted file."
      );
    }
  };

  const handleDownloadSubmittedFile = async (file) => {
    try {
      await downloadClientFile(file._id, getFileDownloadName(file));
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to download submitted file."
      );
    }
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "completionPercent"
          ? Math.min(Math.max(Number(value), 0), 100)
          : value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleTemplateSelect = (event) => {
    const selectedService = event.target.value;

    const selectedTemplate = documentTemplates.find(
      (template) => template.service === selectedService
    );

    setFormData((prev) => ({
      ...prev,
      serviceName: selectedService,
      requiredDocumentsText: selectedTemplate
        ? selectedTemplate.documents.join("\n")
        : prev.requiredDocumentsText,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };

  const buildPayload = () => {
    const requiredDocuments = formData.requiredDocumentsText
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      clientId: formData.clientId,
      staffId: formData.staffId,
      serviceName: formData.serviceName.trim(),
      period: formData.period.trim(),
      priority: formData.priority,
      dueDate: formData.dueDate,
      instructions: formData.instructions.trim(),
      requiredDocuments,
    };

    if (editingAssignment) {
      payload.status = formData.status;
      payload.completionPercent = Number(formData.completionPercent || 0);
      payload.latestUpdate = formData.latestUpdate.trim();
      payload.remarks = formData.remarks.trim();
    }

    return payload;
  };

  const validatePayload = (payload) => {
    if (!payload.clientId) return "Please select client.";
    if (!payload.staffId) return "Please select staff.";
    if (!payload.serviceName) return "Please enter service name.";

    return "";
  };

  const handleSubmitAssignment = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const payload = buildPayload();
    const validationError = validatePayload(payload);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setSaving(true);

      let data;

      if (editingAssignment) {
        data = await updateAssignment(editingAssignment._id, payload);
      } else {
        data = await createAssignment(payload);
      }

      if (data?.success) {
        setSuccessMessage(
          editingAssignment
            ? "Assignment updated successfully."
            : "Assignment created successfully."
        );

        await fetchInitialData();
        resetForm();
        setEditingAssignment(null);
      } else {
        setErrorMessage(data?.message || "Unable to save assignment.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to save assignment."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);

    setFormData({
      clientId: assignment.client?._id || "",
      staffId: assignment.staff?._id || "",
      serviceName: assignment.serviceName || "",
      period: assignment.period || "",
      priority: assignment.priority || "Medium",
      dueDate: assignment.dueDate || "",
      instructions: assignment.instructions || "",

      status: assignment.status || "Not Started",
      completionPercent: assignment.completionPercent || 0,
      requiredDocumentsText: getRequiredDocumentsText(assignment),
      latestUpdate: assignment.latestUpdate || "",
      remarks: assignment.remarks || "",
    });

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    setEditingAssignment(null);
    resetForm();
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleOpenDeleteAssignment = (assignment) => {
    setDeleteTargetAssignment(assignment);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseDeleteAssignment = () => {
    if (deletingId) return;
    setDeleteTargetAssignment(null);
    setErrorMessage("");
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!deleteTargetAssignment?._id) return;

    try {
      setDeletingId(deleteTargetAssignment._id);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await deleteAssignment(deleteTargetAssignment._id);

      if (data?.success) {
        setDeleteTargetAssignment(null);
        setSuccessMessage("Assignment deleted successfully.");
        await fetchInitialData();
      } else {
        setErrorMessage(data?.message || "Unable to delete assignment.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete assignment."
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleQuickStatusUpdate = async (assignment, newStatus) => {
    try {
      setErrorMessage("");
      setSuccessMessage("");

      const data = await updateAssignmentStatus(assignment._id, {
        status: newStatus,
        completionPercent:
          newStatus === "Approved" || newStatus === "Completed"
            ? 100
            : assignment.completionPercent || 0,
        latestUpdate:
          newStatus === "Approved"
            ? "Reviewed and approved by admin."
            : newStatus === "Correction Required"
            ? "Correction required. Sent back by admin."
            : assignment.latestUpdate,
      });

      if (data?.success) {
        setSuccessMessage(`Assignment marked as ${newStatus}.`);
        await fetchInitialData();
      } else {
        setErrorMessage(data?.message || "Unable to update assignment.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to update assignment."
      );
    }
  };

  const reviewSubmissions = useMemo(() => {
    return assignments.filter((assignment) =>
      ["Submitted for Review", "Correction Required", "Approved"].includes(
        assignment.status
      )
    );
  }, [assignments]);

  const totalAssignments = assignments.length;

  const pendingDocuments = assignments.filter(
    (assignment) => assignment.status === "Pending Documents"
  ).length;

  const underReview = assignments.filter((assignment) =>
    [
      "Submitted for Review",
      "Working File Prepared",
      "Correction Required",
    ].includes(assignment.status)
  ).length;

  const completed = assignments.filter((assignment) =>
    ["Approved", "Completed"].includes(assignment.status)
  ).length;

  return (
    <div className="assignment-page">
      <AdminSidebar active="assignments" />

      <main className="assignment-main">
        <header className="assignment-header">
          <div>
            <h1>Assignment Management</h1>
            <p>
              Create, assign and monitor CA office assignments with document
              checklist tracking.
            </p>
          </div>

          <button
            type="button"
            className="create-assignment-btn"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            <Plus size={18} />
            Create Assignment
          </button>
        </header>

        {errorMessage && !deleteTargetAssignment && (
          <div className="assignment-message error">{errorMessage}</div>
        )}

        {successMessage && !deleteTargetAssignment && (
          <div className="assignment-message success">{successMessage}</div>
        )}

        <section className="assignment-stats-grid">
          <div className="assignment-stat-card">
            <div className="assignment-stat-icon blue">
              <ClipboardList />
            </div>
            <div>
              <p>Total Assignments</p>
              <h3>{totalAssignments}</h3>
            </div>
          </div>

          <div className="assignment-stat-card">
            <div className="assignment-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>Pending Documents</p>
              <h3>{pendingDocuments}</h3>
            </div>
          </div>

          <div className="assignment-stat-card">
            <div className="assignment-stat-icon purple">
              <AlertTriangle />
            </div>
            <div>
              <p>Under Review</p>
              <h3>{underReview}</h3>
            </div>
          </div>

          <div className="assignment-stat-card">
            <div className="assignment-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Completed</p>
              <h3>{completed}</h3>
            </div>
          </div>
        </section>

        <section className="assignment-layout">
          <div className="assignment-panel assignment-list-panel">
            <div className="assignment-panel-header">
              <h2>Active Assignments</h2>
              <span>{assignments.length} Record(s)</span>
            </div>

            {loading ? (
              <div className="assignment-empty-state">
                Loading assignments...
              </div>
            ) : assignments.length === 0 ? (
              <div className="assignment-empty-state">
                No assignments found. Create first assignment from the form.
              </div>
            ) : (
              <div className="assignment-card-list">
                {assignments.map((item) => (
                  <div className="assignment-row-card" key={item._id}>
                    <div className="assignment-client-info">
                      <div
                        className={
                          getClientType(item.client) === "Business"
                            ? "assignment-client-icon business"
                            : "assignment-client-icon individual"
                        }
                      >
                        {getClientType(item.client) === "Business" ? (
                          <Building2 />
                        ) : (
                          <UserRound />
                        )}
                      </div>

                      <div>
                        <h3>{getClientName(item.client)}</h3>
                        <p>{getClientType(item.client)} Client</p>
                        <small>{item.serviceName}</small>
                      </div>
                    </div>

                    <div className="assignment-meta">
                      <p>
                        <CalendarDays size={15} />
                        Period: {item.period || "-"}
                      </p>
                      <p>Due Date: {formatDate(item.dueDate)}</p>
                      <p>Assigned To: {getStaffName(item.staff)}</p>
                    </div>

                    <div className="assignment-document-status">
                      <p>Documents</p>
                      <h4>{getDocumentCountText(item)}</h4>

                      <div className="assignment-progress-bar">
                        <div style={{ width: getProgressWidth(item) }}></div>
                      </div>

                      <small>{item.completionPercent || 0}% complete</small>
                    </div>

                    <div className="assignment-status-area">
                      <span
                        className={`assignment-status ${getStatusClass(
                          item.status
                        )}`}
                      >
                        <Circle size={9} fill="currentColor" />
                        {item.status}
                      </span>

                      <span
                        className={`assignment-priority ${getPriorityClass(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>

                      <div className="assignment-row-actions">
                        <button
                          type="button"
                          className="assignment-edit-btn"
                          onClick={() => handleEditAssignment(item)}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="assignment-delete-btn"
                          disabled={deletingId === item._id}
                          onClick={() => handleOpenDeleteAssignment(item)}
                        >
                          <Trash2 size={14} />
                          {deletingId === item._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="assignment-panel">
            <div className="assignment-form-header">
              <h2>
                {editingAssignment
                  ? "Edit Assignment"
                  : "Quick Create Assignment"}
              </h2>

              {editingAssignment && (
                <button
                  type="button"
                  className="assignment-cancel-edit-btn"
                  onClick={handleCancelEdit}
                >
                  <X size={15} />
                  Cancel
                </button>
              )}
            </div>

            <form className="assignment-form" onSubmit={handleSubmitAssignment}>
              <label>Client *</label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleInputChange}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {getClientName(client)}
                  </option>
                ))}
              </select>

              <label>Service *</label>
              <select
                name="serviceName"
                value={formData.serviceName}
                onChange={handleTemplateSelect}
              >
                <option value="">Select service</option>
                {serviceOptions.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>

              <label>Assign Staff *</label>
              <select
                name="staffId"
                value={formData.staffId}
                onChange={handleInputChange}
              >
                <option value="">Select staff</option>
                {staffList.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {getStaffName(staff)}
                  </option>
                ))}
              </select>

              <label>Period</label>
              <input
                type="text"
                name="period"
                placeholder="Example: April 2026 / FY 2025-26"
                value={formData.period}
                onChange={handleInputChange}
              />

              <label>Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
              />

              <label>Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

              <label>Instructions</label>
              <textarea
                name="instructions"
                rows="3"
                placeholder="Any special instruction for staff"
                value={formData.instructions}
                onChange={handleInputChange}
              ></textarea>

              {editingAssignment && (
                <>
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <label>Completion %</label>
                  <input
                    type="number"
                    name="completionPercent"
                    min="0"
                    max="100"
                    value={formData.completionPercent}
                    onChange={handleInputChange}
                  />

                  <label>Required Documents</label>
                  <textarea
                    name="requiredDocumentsText"
                    rows="4"
                    placeholder="Enter one document per line"
                    value={formData.requiredDocumentsText}
                    onChange={handleInputChange}
                  ></textarea>

                  <label>Latest Update</label>
                  <textarea
                    name="latestUpdate"
                    rows="3"
                    placeholder="Latest progress update"
                    value={formData.latestUpdate}
                    onChange={handleInputChange}
                  ></textarea>

                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    rows="3"
                    placeholder="Internal remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                  ></textarea>
                </>
              )}

              <button type="submit" disabled={saving}>
                <Save size={16} />
                {saving
                  ? "Saving..."
                  : editingAssignment
                  ? "Update Assignment"
                  : "Create Assignment"}
              </button>
            </form>
          </div>
        </section>

        <section className="assignment-panel admin-review-panel">
          <div className="assignment-panel-header">
            <h2>Staff Work Submitted for Admin Review</h2>
            <span>{reviewSubmissions.length} Review Item(s)</span>
          </div>

          {reviewSubmissions.length === 0 ? (
            <div className="assignment-empty-state">
              No staff submissions pending for review.
            </div>
          ) : (
            <div className="review-submission-list">
              {reviewSubmissions.map((item) => {
                const submittedFiles = getFilesForAssignment(item._id);

                return (
                  <div className="review-submission-card" key={item._id}>
                    <div className="review-submission-left">
                      <div className="review-file-icon">
                        <FileCheck />
                      </div>

                      <div>
                        <h3>{getClientName(item.client)}</h3>
                        <p>{item.serviceName}</p>
                        <small>
                          Assigned to {getStaffName(item.staff)} •{" "}
                          {formatDate(item.updatedAt)}
                        </small>
                      </div>
                    </div>

                    <div className="review-file-box">
                      <p>Progress</p>
                      <h4>{item.completionPercent || 0}% Completed</h4>
                    </div>

                    <div className="review-remarks">
                      <p>{item.remarks || item.latestUpdate || "No remarks."}</p>
                    </div>

                    <div className="review-submitted-files">
                      <p className="review-submitted-files-title">
                        Submitted File(s)
                      </p>

                      {submittedFiles.length === 0 ? (
                        <span className="review-submitted-file-empty">
                          No file attached
                        </span>
                      ) : (
                        submittedFiles.map((file) => (
                          <div
                            className="review-submitted-file-row"
                            key={file._id}
                          >
                            <div>
                              <strong>{getFileDisplayName(file)}</strong>
                              <small>
                                {file.fileCategory || "Client Deliverable"}
                                {file.period ? ` • ${file.period}` : ""}
                                {file.status ? ` • ${file.status}` : ""}
                              </small>
                            </div>

                            <div className="review-submitted-file-actions">
                              <button
                                type="button"
                                onClick={() => handleViewSubmittedFile(file)}
                              >
                                <Eye size={14} />
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadSubmittedFile(file)
                                }
                              >
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="review-status-actions">
                      <span
                        className={`review-status ${getReviewStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>

                      <div className="review-action-buttons">
                        <button
                          type="button"
                          className="review-view-btn"
                          onClick={() => handleEditAssignment(item)}
                        >
                          <Eye size={15} />
                          Review
                        </button>

                        <button
                          type="button"
                          className="review-approve-btn"
                          onClick={() =>
                            handleQuickStatusUpdate(item, "Approved")
                          }
                        >
                          <CheckCircle size={15} />
                          Approve
                        </button>

                        <button
                          type="button"
                          className="review-return-btn"
                          onClick={() =>
                            handleQuickStatusUpdate(
                              item,
                              "Correction Required"
                            )
                          }
                        >
                          <RotateCcw size={15} />
                          Send Back
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="assignment-panel template-panel">
          <div className="assignment-panel-header">
            <h2>Smart Document Checklist Templates</h2>
            <span>Auto Requirement Generator</span>
          </div>

          <div className="template-grid">
            {documentTemplates.map((template) => (
              <div className="template-card" key={template.service}>
                <div className="template-title">
                  <FileCheck />
                  <h3>{template.service}</h3>
                </div>

                <div className="template-doc-list">
                  {template.documents.map((doc) => (
                    <span key={doc}>{doc}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {deleteTargetAssignment && (
          <div className="assignment-delete-backdrop">
            <div className="assignment-delete-modal">
              <button
                type="button"
                className="assignment-delete-close"
                onClick={handleCloseDeleteAssignment}
                disabled={Boolean(deletingId)}
              >
                <X size={18} />
              </button>

              <div className="assignment-delete-icon">
                <Trash2 size={26} />
              </div>

              <h2>Delete Assignment?</h2>

              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteTargetAssignment.serviceName}</strong>?
              </p>

              <small>
                This action will permanently remove this assignment record and
                cannot be undone.
              </small>

              {errorMessage && (
                <div className="assignment-message error">{errorMessage}</div>
              )}

              <div className="assignment-delete-actions">
                <button
                  type="button"
                  className="assignment-delete-cancel"
                  onClick={handleCloseDeleteAssignment}
                  disabled={Boolean(deletingId)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="assignment-delete-confirm"
                  onClick={handleConfirmDeleteAssignment}
                  disabled={Boolean(deletingId)}
                >
                  <Trash2 size={15} />
                  {deletingId ? "Deleting..." : "Delete Assignment"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
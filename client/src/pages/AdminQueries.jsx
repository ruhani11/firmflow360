import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  MessagesSquare,
  Send,
  Trash2,
  PlusCircle,
  RefreshCcw,
  UserRound,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";

import { getAllClients, getAllStaff } from "../services/adminService";
import { getAllAssignmentsForAdmin } from "../services/assignmentService";

import {
  getAllClientQueriesForAdmin,
  createClientQueryByAdmin,
  addReplyToClientQuery,
  updateClientQueryStatus,
  deleteClientQueryByAdmin,
  getAllInternalQueriesForAdmin,
  createInternalQuery,
  addReplyToInternalQuery,
  updateInternalQueryStatus,
  deleteInternalQueryByAdmin,
} from "../services/queryService";

import "./AdminQueries.css";

const CLIENT_QUERY_STATUSES = [
  "Open",
  "In Progress",
  "Waiting for Client",
  "Resolved",
  "Closed",
];

const INTERNAL_QUERY_STATUSES = [
  "Open",
  "In Progress",
  "Waiting",
  "Resolved",
  "Closed",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const CLIENT_QUERY_CATEGORIES = [
  "General",
  "Document",
  "GST",
  "Income Tax",
  "TDS",
  "Audit",
  "Billing",
  "Other",
];

const INTERNAL_QUERY_CATEGORIES = [
  "General",
  "Document",
  "GST",
  "Income Tax",
  "TDS",
  "Audit",
  "Client Follow-up",
  "Review",
  "Billing",
  "Other",
];

const getClientName = (client) => {
  if (!client) return "-";

  if (client.clientType === "BUSINESS") {
    return client.businessName || client.user?.name || "Business Client";
  }

  return client.individualName || client.user?.name || "Individual Client";
};

const getStaffName = (staff) => {
  return staff?.user?.name || "Unassigned";
};

const getUserName = (user) => {
  return user?.name || "User";
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getAssignmentLabel = (assignment) => {
  if (!assignment) return "-";

  const service = assignment.serviceName || "Assignment";
  const period = assignment.period ? ` • ${assignment.period}` : "";

  return `${service}${period}`;
};

const getQueryStatusClass = (status) => {
  if (status === "Open") return "open";
  if (status === "In Progress") return "progress";
  if (status === "Waiting for Client" || status === "Waiting") return "waiting";
  if (status === "Resolved") return "resolved";
  if (status === "Closed") return "closed";
  return "open";
};

const getPriorityClass = (priority) => {
  if (priority === "Urgent") return "urgent";
  if (priority === "High") return "high";
  if (priority === "Low") return "low";
  return "medium";
};

export default function AdminQueries() {
  const [activeTab, setActiveTab] = useState("client");

  const [clientQueries, setClientQueries] = useState([]);
  const [internalQueries, setInternalQueries] = useState([]);

  const [clients, setClients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedClientQueryId, setSelectedClientQueryId] = useState("");
  const [selectedInternalQueryId, setSelectedInternalQueryId] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [clientReplyMessage, setClientReplyMessage] = useState("");
  const [internalReplyMessage, setInternalReplyMessage] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(null);

  const [clientCreateForm, setClientCreateForm] = useState({
    clientId: "",
    assignmentId: "",
    assignedStaffId: "",
    subject: "",
    message: "",
    category: "General",
    priority: "Medium",
    status: "Open",
  });

  const [internalCreateForm, setInternalCreateForm] = useState({
    subject: "",
    message: "",
    assignedToStaffId: "",
    relatedClientId: "",
    relatedAssignmentId: "",
    category: "General",
    priority: "Medium",
  });

  const [clientEditForm, setClientEditForm] = useState({
    status: "Open",
    priority: "Medium",
    assignedStaffId: "",
  });

  const [internalEditForm, setInternalEditForm] = useState({
    status: "Open",
    priority: "Medium",
    assignedToStaffId: "",
  });

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const fetchQueriesData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        clientQueryData,
        internalQueryData,
        clientData,
        staffData,
        assignmentData,
      ] = await Promise.all([
        getAllClientQueriesForAdmin(),
        getAllInternalQueriesForAdmin(),
        getAllClients(),
        getAllStaff(),
        getAllAssignmentsForAdmin(),
      ]);

      if (clientQueryData?.success) {
        setClientQueries(clientQueryData.queries || []);
      }

      if (internalQueryData?.success) {
        setInternalQueries(internalQueryData.queries || []);
      }

      if (clientData?.success) {
        setClients(clientData.clients || []);
      }

      if (staffData?.success) {
        setStaffList(staffData.staff || []);
      }

      if (assignmentData?.success) {
        setAssignments(assignmentData.assignments || []);
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch queries."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueriesData();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  useEffect(() => {
    if (
      clientQueries.length > 0 &&
      !clientQueries.some((query) => query._id === selectedClientQueryId)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedClientQueryId(clientQueries[0]._id);
    }

    if (clientQueries.length === 0) {
      setSelectedClientQueryId("");
    }
  }, [clientQueries, selectedClientQueryId]);

  useEffect(() => {
    if (
      internalQueries.length > 0 &&
      !internalQueries.some((query) => query._id === selectedInternalQueryId)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedInternalQueryId(internalQueries[0]._id);
    }

    if (internalQueries.length === 0) {
      setSelectedInternalQueryId("");
    }
  }, [internalQueries, selectedInternalQueryId]);

  const selectedClientQuery = useMemo(() => {
    return (
      clientQueries.find((query) => query._id === selectedClientQueryId) ||
      clientQueries[0] ||
      null
    );
  }, [clientQueries, selectedClientQueryId]);

  const selectedInternalQuery = useMemo(() => {
    return (
      internalQueries.find((query) => query._id === selectedInternalQueryId) ||
      internalQueries[0] ||
      null
    );
  }, [internalQueries, selectedInternalQueryId]);

  useEffect(() => {
    if (!selectedClientQuery) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientEditForm({
      status: selectedClientQuery.status || "Open",
      priority: selectedClientQuery.priority || "Medium",
      assignedStaffId: selectedClientQuery.assignedStaff?._id || "",
    });

    setClientReplyMessage("");
  }, [selectedClientQuery]);

  useEffect(() => {
    if (!selectedInternalQuery) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInternalEditForm({
      status: selectedInternalQuery.status || "Open",
      priority: selectedInternalQuery.priority || "Medium",
      assignedToStaffId: selectedInternalQuery.assignedToStaff?._id || "",
    });

    setInternalReplyMessage("");
  }, [selectedInternalQuery]);

  const clientStats = useMemo(() => {
    return {
      total: clientQueries.length,
      open: clientQueries.filter((query) =>
        ["Open", "In Progress", "Waiting for Client"].includes(query.status)
      ).length,
      resolved: clientQueries.filter((query) => query.status === "Resolved")
        .length,
      urgent: clientQueries.filter((query) => query.priority === "Urgent")
        .length,
    };
  }, [clientQueries]);

  const internalStats = useMemo(() => {
    return {
      total: internalQueries.length,
      open: internalQueries.filter((query) =>
        ["Open", "In Progress", "Waiting"].includes(query.status)
      ).length,
      resolved: internalQueries.filter((query) => query.status === "Resolved")
        .length,
      urgent: internalQueries.filter((query) => query.priority === "Urgent")
        .length,
    };
  }, [internalQueries]);

  const selectedClientAssignments = useMemo(() => {
    if (!clientCreateForm.clientId) return [];

    return assignments.filter(
      (assignment) => assignment.client?._id === clientCreateForm.clientId
    );
  }, [assignments, clientCreateForm.clientId]);

  const selectedInternalClientAssignments = useMemo(() => {
    if (!internalCreateForm.relatedClientId) return assignments;

    return assignments.filter(
      (assignment) =>
        assignment.client?._id === internalCreateForm.relatedClientId
    );
  }, [assignments, internalCreateForm.relatedClientId]);

  const resetClientCreateForm = () => {
    setClientCreateForm({
      clientId: "",
      assignmentId: "",
      assignedStaffId: "",
      subject: "",
      message: "",
      category: "General",
      priority: "Medium",
      status: "Open",
    });
  };

  const resetInternalCreateForm = () => {
    setInternalCreateForm({
      subject: "",
      message: "",
      assignedToStaffId: "",
      relatedClientId: "",
      relatedAssignmentId: "",
      category: "General",
      priority: "Medium",
    });
  };

  const handleClientCreateChange = (event) => {
    const { name, value } = event.target;

    if (name === "clientId") {
      setClientCreateForm((prev) => ({
        ...prev,
        clientId: value,
        assignmentId: "",
        assignedStaffId: "",
      }));
      return;
    }

    if (name === "assignmentId") {
      const assignment = assignments.find((item) => item._id === value);

      setClientCreateForm((prev) => ({
        ...prev,
        assignmentId: value,
        assignedStaffId: assignment?.staff?._id || prev.assignedStaffId,
      }));
      return;
    }

    setClientCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInternalCreateChange = (event) => {
    const { name, value } = event.target;

    if (name === "relatedClientId") {
      setInternalCreateForm((prev) => ({
        ...prev,
        relatedClientId: value,
        relatedAssignmentId: "",
      }));
      return;
    }

    if (name === "relatedAssignmentId") {
      const assignment = assignments.find((item) => item._id === value);

      setInternalCreateForm((prev) => ({
        ...prev,
        relatedAssignmentId: value,
        relatedClientId: assignment?.client?._id || prev.relatedClientId,
        assignedToStaffId: assignment?.staff?._id || prev.assignedToStaffId,
      }));
      return;
    }

    setInternalCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateClientQuery = async (event) => {
    event.preventDefault();

    if (!clientCreateForm.clientId) {
      showError("Please select client.");
      return;
    }

    if (!clientCreateForm.subject.trim()) {
      showError("Please enter subject.");
      return;
    }

    if (!clientCreateForm.message.trim()) {
      showError("Please enter message.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        clientId: clientCreateForm.clientId,
        assignmentId: clientCreateForm.assignmentId || null,
        assignedStaffId: clientCreateForm.assignedStaffId || null,
        subject: clientCreateForm.subject,
        message: clientCreateForm.message,
        category: clientCreateForm.category,
        priority: clientCreateForm.priority,
        status: clientCreateForm.status,
      };

      const data = await createClientQueryByAdmin(payload);

      if (data?.success) {
        showSuccess("Client query created successfully.");
        resetClientCreateForm();
        setShowCreateForm(false);
        await fetchQueriesData();

        if (data.query?._id) {
          setSelectedClientQueryId(data.query._id);
        }
      } else {
        showError(data?.message || "Unable to create client query.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to create client query."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInternalQuery = async (event) => {
    event.preventDefault();

    if (!internalCreateForm.subject.trim()) {
      showError("Please enter subject.");
      return;
    }

    if (!internalCreateForm.message.trim()) {
      showError("Please enter message.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        subject: internalCreateForm.subject,
        message: internalCreateForm.message,
        assignedToStaffId: internalCreateForm.assignedToStaffId || null,
        relatedClientId: internalCreateForm.relatedClientId || null,
        relatedAssignmentId: internalCreateForm.relatedAssignmentId || null,
        category: internalCreateForm.category,
        priority: internalCreateForm.priority,
      };

      const data = await createInternalQuery(payload);

      if (data?.success) {
        showSuccess("Internal query created successfully.");
        resetInternalCreateForm();
        setShowCreateForm(false);
        await fetchQueriesData();

        if (data.query?._id) {
          setSelectedInternalQueryId(data.query._id);
        }
      } else {
        showError(data?.message || "Unable to create internal query.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to create internal query."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateClientQuery = async () => {
    if (!selectedClientQuery?._id) return;

    try {
      setSaving(true);

      const data = await updateClientQueryStatus(selectedClientQuery._id, {
        status: clientEditForm.status,
        priority: clientEditForm.priority,
        assignedStaffId: clientEditForm.assignedStaffId || null,
      });

      if (data?.success) {
        showSuccess("Client query updated successfully.");
        await fetchQueriesData();
      } else {
        showError(data?.message || "Unable to update client query.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update client query."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateInternalQuery = async () => {
    if (!selectedInternalQuery?._id) return;

    try {
      setSaving(true);

      const data = await updateInternalQueryStatus(selectedInternalQuery._id, {
        status: internalEditForm.status,
        priority: internalEditForm.priority,
        assignedToStaffId: internalEditForm.assignedToStaffId || null,
      });

      if (data?.success) {
        showSuccess("Internal query updated successfully.");
        await fetchQueriesData();
      } else {
        showError(data?.message || "Unable to update internal query.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update internal query."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReplyToClientQuery = async (event) => {
    event.preventDefault();

    if (!selectedClientQuery?._id) return;

    if (!clientReplyMessage.trim()) {
      showError("Please enter reply message.");
      return;
    }

    try {
      setSaving(true);

      const data = await addReplyToClientQuery(selectedClientQuery._id, {
        message: clientReplyMessage,
      });

      if (data?.success) {
        showSuccess("Reply sent successfully.");
        setClientReplyMessage("");
        await fetchQueriesData();
      } else {
        showError(data?.message || "Unable to send reply.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to send reply."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReplyToInternalQuery = async (event) => {
    event.preventDefault();

    if (!selectedInternalQuery?._id) return;

    if (!internalReplyMessage.trim()) {
      showError("Please enter reply message.");
      return;
    }

    try {
      setSaving(true);

      const data = await addReplyToInternalQuery(selectedInternalQuery._id, {
        message: internalReplyMessage,
      });

      if (data?.success) {
        showSuccess("Reply sent successfully.");
        setInternalReplyMessage("");
        await fetchQueriesData();
      } else {
        showError(data?.message || "Unable to send reply.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to send reply."
      );
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (type, query) => {
    setConfirmDelete({
      type,
      id: query._id,
      title: query.subject,
    });

    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeDeleteConfirm = () => {
    if (saving) return;

    setConfirmDelete(null);
    setErrorMessage("");
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete?.id || !confirmDelete?.type) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const data =
        confirmDelete.type === "client"
          ? await deleteClientQueryByAdmin(confirmDelete.id)
          : await deleteInternalQueryByAdmin(confirmDelete.id);

      if (data?.success) {
        showSuccess("Query deleted successfully.");
        setConfirmDelete(null);
        await fetchQueriesData();
      } else {
        showError(data?.message || "Unable to delete query.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete query."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowCreateForm(false);
    setConfirmDelete(null);
  };

  const renderReplies = (query) => {
    const replies = query?.replies || [];

    if (replies.length === 0) {
      return (
        <div className="admin-query-empty-thread">
          No replies yet. Start conversation from reply box below.
        </div>
      );
    }

    return replies.map((reply) => (
      <div
        className={
          reply.senderRole === "ADMIN"
            ? "admin-query-reply admin"
            : "admin-query-reply"
        }
        key={reply._id || `${reply.senderRole}-${reply.createdAt}`}
      >
        <div className="admin-query-reply-top">
          <strong>
            {getUserName(reply.senderUser)} ({reply.senderRole})
          </strong>
          <span>{formatDateTime(reply.createdAt)}</span>
        </div>

        <p>{reply.message}</p>
      </div>
    ));
  };

  const renderClientCreateForm = () => (
    <section className="admin-query-form-panel">
      <div className="admin-query-form-header">
        <div>
          <h2>Create Client Query</h2>
          <p>Create query on behalf of office/client and assign to staff.</p>
        </div>

        <button
          type="button"
          className="admin-query-icon-btn"
          onClick={() => {
            resetClientCreateForm();
            setShowCreateForm(false);
          }}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleCreateClientQuery}>
        <div className="admin-query-form-grid">
          <div className="admin-query-form-group">
            <label>Client</label>
            <select
              name="clientId"
              value={clientCreateForm.clientId}
              onChange={handleClientCreateChange}
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

          <div className="admin-query-form-group">
            <label>Assignment</label>
            <select
              name="assignmentId"
              value={clientCreateForm.assignmentId}
              onChange={handleClientCreateChange}
            >
              <option value="">Select assignment</option>
              {selectedClientAssignments.map((assignment) => (
                <option key={assignment._id} value={assignment._id}>
                  {getAssignmentLabel(assignment)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group">
            <label>Assigned Staff</label>
            <select
              name="assignedStaffId"
              value={clientCreateForm.assignedStaffId}
              onChange={handleClientCreateChange}
            >
              <option value="">Select staff</option>
              {staffList.map((staff) => (
                <option key={staff._id} value={staff._id}>
                  {getStaffName(staff)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group">
            <label>Category</label>
            <select
              name="category"
              value={clientCreateForm.category}
              onChange={handleClientCreateChange}
            >
              {CLIENT_QUERY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group">
            <label>Priority</label>
            <select
              name="priority"
              value={clientCreateForm.priority}
              onChange={handleClientCreateChange}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group">
            <label>Status</label>
            <select
              name="status"
              value={clientCreateForm.status}
              onChange={handleClientCreateChange}
            >
              {CLIENT_QUERY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group full-width">
            <label>Subject</label>
            <input
              type="text"
              name="subject"
              placeholder="Example: GST document clarification"
              value={clientCreateForm.subject}
              onChange={handleClientCreateChange}
              required
            />
          </div>

          <div className="admin-query-form-group full-width">
            <label>Message</label>
            <textarea
              name="message"
              rows="4"
              placeholder="Write query details..."
              value={clientCreateForm.message}
              onChange={handleClientCreateChange}
              required
            ></textarea>
          </div>
        </div>

        <div className="admin-query-form-actions">
          <button
            type="button"
            className="admin-query-cancel-btn"
            onClick={() => {
              resetClientCreateForm();
              setShowCreateForm(false);
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="admin-query-submit-btn"
            disabled={saving}
          >
            <Send size={17} />
            {saving ? "Creating..." : "Create Query"}
          </button>
        </div>
      </form>
    </section>
  );

  const renderInternalCreateForm = () => (
    <section className="admin-query-form-panel">
      <div className="admin-query-form-header">
        <div>
          <h2>Create Internal Query</h2>
          <p>Create office internal query for staff/admin discussion.</p>
        </div>

        <button
          type="button"
          className="admin-query-icon-btn"
          onClick={() => {
            resetInternalCreateForm();
            setShowCreateForm(false);
          }}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleCreateInternalQuery}>
        <div className="admin-query-form-grid">
          <div className="admin-query-form-group">
            <label>Assigned Staff</label>
            <select
              name="assignedToStaffId"
              value={internalCreateForm.assignedToStaffId}
              onChange={handleInternalCreateChange}
            >
              <option value="">Select staff</option>
              {staffList.map((staff) => (
                <option key={staff._id} value={staff._id}>
                  {getStaffName(staff)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group">
            <label>Related Client</label>
            <select
              name="relatedClientId"
              value={internalCreateForm.relatedClientId}
              onChange={handleInternalCreateChange}
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {getClientName(client)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group">
            <label>Related Assignment</label>
            <select
              name="relatedAssignmentId"
              value={internalCreateForm.relatedAssignmentId}
              onChange={handleInternalCreateChange}
            >
              <option value="">Select assignment</option>
              {selectedInternalClientAssignments.map((assignment) => (
                <option key={assignment._id} value={assignment._id}>
                  {getClientName(assignment.client)} •{" "}
                  {getAssignmentLabel(assignment)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group">
            <label>Category</label>
            <select
              name="category"
              value={internalCreateForm.category}
              onChange={handleInternalCreateChange}
            >
              {INTERNAL_QUERY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group">
            <label>Priority</label>
            <select
              name="priority"
              value={internalCreateForm.priority}
              onChange={handleInternalCreateChange}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-query-form-group full-width">
            <label>Subject</label>
            <input
              type="text"
              name="subject"
              placeholder="Example: Review required for ITR computation"
              value={internalCreateForm.subject}
              onChange={handleInternalCreateChange}
              required
            />
          </div>

          <div className="admin-query-form-group full-width">
            <label>Message</label>
            <textarea
              name="message"
              rows="4"
              placeholder="Write internal query details..."
              value={internalCreateForm.message}
              onChange={handleInternalCreateChange}
              required
            ></textarea>
          </div>
        </div>

        <div className="admin-query-form-actions">
          <button
            type="button"
            className="admin-query-cancel-btn"
            onClick={() => {
              resetInternalCreateForm();
              setShowCreateForm(false);
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="admin-query-submit-btn"
            disabled={saving}
          >
            <Send size={17} />
            {saving ? "Creating..." : "Create Query"}
          </button>
        </div>
      </form>
    </section>
  );

  return (
    <div className="admin-queries-page">
      <AdminSidebar active="queries" />

      <main className="admin-queries-main">
        <header className="admin-queries-header">
          <div>
            <h1>Queries</h1>
            <p>
              Manage client queries and internal office queries from admin
              portal. Client queries assigned/shared with staff are also visible
              here.
            </p>
          </div>

          <div className="admin-queries-header-actions">
            <button
              type="button"
              className="admin-query-refresh-btn"
              onClick={fetchQueriesData}
              disabled={loading}
            >
              <RefreshCcw size={17} />
              Refresh
            </button>

            <button
              type="button"
              className="admin-query-primary-btn"
              onClick={() => setShowCreateForm(true)}
            >
              <PlusCircle size={18} />
              {activeTab === "client"
                ? "Create Client Query"
                : "Create Internal Query"}
            </button>
          </div>
        </header>

        {errorMessage && !confirmDelete && (
          <div className="admin-query-alert error">{errorMessage}</div>
        )}

        {successMessage && !confirmDelete && (
          <div className="admin-query-alert success">{successMessage}</div>
        )}

        <section className="admin-query-stats-grid">
          <div className="admin-query-stat-card">
            <div className="admin-query-stat-icon blue">
              <MessageSquare />
            </div>
            <div>
              <p>Client Queries</p>
              <h3>{loading ? "..." : clientStats.total}</h3>
            </div>
          </div>

          <div className="admin-query-stat-card">
            <div className="admin-query-stat-icon purple">
              <MessagesSquare />
            </div>
            <div>
              <p>Internal Queries</p>
              <h3>{loading ? "..." : internalStats.total}</h3>
            </div>
          </div>

          <div className="admin-query-stat-card">
            <div className="admin-query-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>Active Queries</p>
              <h3>
                {loading ? "..." : clientStats.open + internalStats.open}
              </h3>
            </div>
          </div>

          <div className="admin-query-stat-card">
            <div className="admin-query-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Urgent Queries</p>
              <h3>
                {loading ? "..." : clientStats.urgent + internalStats.urgent}
              </h3>
            </div>
          </div>
        </section>

        <section className="admin-query-tabs">
          <button
            type="button"
            className={activeTab === "client" ? "active" : ""}
            onClick={() => handleTabChange("client")}
          >
            Client Queries
            <span>{clientStats.total}</span>
          </button>

          <button
            type="button"
            className={activeTab === "internal" ? "active" : ""}
            onClick={() => handleTabChange("internal")}
          >
            Internal Queries
            <span>{internalStats.total}</span>
          </button>
        </section>

        {showCreateForm &&
          (activeTab === "client"
            ? renderClientCreateForm()
            : renderInternalCreateForm())}

        <section className="admin-query-layout">
          <div className="admin-query-list-panel">
            <div className="admin-query-panel-header">
              <h2>
                {activeTab === "client"
                  ? "Client Query List"
                  : "Internal Query List"}
              </h2>
              <span>{loading ? "Loading..." : "Select query"}</span>
            </div>

            <div className="admin-query-list">
              {activeTab === "client" &&
                (clientQueries.length === 0 ? (
                  <div className="admin-query-empty-card">
                    No client queries found.
                  </div>
                ) : (
                  clientQueries.map((query) => (
                    <button
                      type="button"
                      className={
                        selectedClientQuery?._id === query._id
                          ? "admin-query-list-card active"
                          : "admin-query-list-card"
                      }
                      key={query._id}
                      onClick={() => setSelectedClientQueryId(query._id)}
                    >
                      <div className="admin-query-card-top">
                        <h3>{query.subject}</h3>
                        <span
                          className={`admin-query-priority ${getPriorityClass(
                            query.priority
                          )}`}
                        >
                          {query.priority}
                        </span>
                      </div>

                      <p>{query.message}</p>

                      <div className="admin-query-card-meta">
                        <span>
                          <UserRound size={14} />
                          {getClientName(query.client)}
                        </span>

                        <span>
                          <Users size={14} />
                          {getStaffName(query.assignedStaff)}
                        </span>
                      </div>

                      <div className="admin-query-card-footer">
                        <span
                          className={`admin-query-status ${getQueryStatusClass(
                            query.status
                          )}`}
                        >
                          {query.status}
                        </span>

                        <small>{formatDateTime(query.updatedAt)}</small>
                      </div>
                    </button>
                  ))
                ))}

              {activeTab === "internal" &&
                (internalQueries.length === 0 ? (
                  <div className="admin-query-empty-card">
                    No internal queries found.
                  </div>
                ) : (
                  internalQueries.map((query) => (
                    <button
                      type="button"
                      className={
                        selectedInternalQuery?._id === query._id
                          ? "admin-query-list-card active"
                          : "admin-query-list-card"
                      }
                      key={query._id}
                      onClick={() => setSelectedInternalQueryId(query._id)}
                    >
                      <div className="admin-query-card-top">
                        <h3>{query.subject}</h3>
                        <span
                          className={`admin-query-priority ${getPriorityClass(
                            query.priority
                          )}`}
                        >
                          {query.priority}
                        </span>
                      </div>

                      <p>{query.message}</p>

                      <div className="admin-query-card-meta">
                        <span>
                          <UserRound size={14} />
                          {getUserName(query.raisedByUser)}
                        </span>

                        <span>
                          <Users size={14} />
                          {getStaffName(query.assignedToStaff)}
                        </span>
                      </div>

                      <div className="admin-query-card-footer">
                        <span
                          className={`admin-query-status ${getQueryStatusClass(
                            query.status
                          )}`}
                        >
                          {query.status}
                        </span>

                        <small>{formatDateTime(query.updatedAt)}</small>
                      </div>
                    </button>
                  ))
                ))}
            </div>
          </div>

          <div className="admin-query-detail-panel">
            {activeTab === "client" && selectedClientQuery ? (
              <>
                <div className="admin-query-detail-header">
                  <div>
                    <h2>{selectedClientQuery.subject}</h2>
                    <p>
                      {getClientName(selectedClientQuery.client)} •{" "}
                      {getAssignmentLabel(selectedClientQuery.assignment)}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-query-delete-btn"
                    onClick={() =>
                      openDeleteConfirm("client", selectedClientQuery)
                    }
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>

                <div className="admin-query-badges">
                  <span
                    className={`admin-query-status ${getQueryStatusClass(
                      selectedClientQuery.status
                    )}`}
                  >
                    {selectedClientQuery.status}
                  </span>

                  <span
                    className={`admin-query-priority ${getPriorityClass(
                      selectedClientQuery.priority
                    )}`}
                  >
                    {selectedClientQuery.priority}
                  </span>

                  <span className="admin-query-category">
                    {selectedClientQuery.category}
                  </span>
                </div>

                <div className="admin-query-message-box">
                  <h3>Original Message</h3>
                  <p>{selectedClientQuery.message}</p>
                  <small>
                    Created by {selectedClientQuery.createdByRole} on{" "}
                    {formatDateTime(selectedClientQuery.createdAt)}
                  </small>
                </div>

                <div className="admin-query-update-grid">
                  <div className="admin-query-form-group">
                    <label>Status</label>
                    <select
                      value={clientEditForm.status}
                      onChange={(event) =>
                        setClientEditForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                    >
                      {CLIENT_QUERY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-query-form-group">
                    <label>Priority</label>
                    <select
                      value={clientEditForm.priority}
                      onChange={(event) =>
                        setClientEditForm((prev) => ({
                          ...prev,
                          priority: event.target.value,
                        }))
                      }
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-query-form-group">
                    <label>Assigned Staff</label>
                    <select
                      value={clientEditForm.assignedStaffId}
                      onChange={(event) =>
                        setClientEditForm((prev) => ({
                          ...prev,
                          assignedStaffId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {getStaffName(staff)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="admin-query-save-btn"
                    onClick={handleUpdateClientQuery}
                    disabled={saving}
                  >
                    <CheckCircle size={16} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="admin-query-thread">
                  <h3>Conversation</h3>
                  {renderReplies(selectedClientQuery)}
                </div>

                <form
                  className="admin-query-reply-form"
                  onSubmit={handleReplyToClientQuery}
                >
                  <textarea
                    rows="4"
                    placeholder="Write reply to client..."
                    value={clientReplyMessage}
                    onChange={(event) =>
                      setClientReplyMessage(event.target.value)
                    }
                  ></textarea>

                  <button
                    type="submit"
                    className="admin-query-submit-btn"
                    disabled={saving}
                  >
                    <Send size={17} />
                    {saving ? "Sending..." : "Send Reply"}
                  </button>
                </form>
              </>
            ) : null}

            {activeTab === "internal" && selectedInternalQuery ? (
              <>
                <div className="admin-query-detail-header">
                  <div>
                    <h2>{selectedInternalQuery.subject}</h2>
                    <p>
                      Raised by {getUserName(selectedInternalQuery.raisedByUser)}
                      {selectedInternalQuery.relatedClient
                        ? ` • ${getClientName(
                            selectedInternalQuery.relatedClient
                          )}`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-query-delete-btn"
                    onClick={() =>
                      openDeleteConfirm("internal", selectedInternalQuery)
                    }
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>

                <div className="admin-query-badges">
                  <span
                    className={`admin-query-status ${getQueryStatusClass(
                      selectedInternalQuery.status
                    )}`}
                  >
                    {selectedInternalQuery.status}
                  </span>

                  <span
                    className={`admin-query-priority ${getPriorityClass(
                      selectedInternalQuery.priority
                    )}`}
                  >
                    {selectedInternalQuery.priority}
                  </span>

                  <span className="admin-query-category">
                    {selectedInternalQuery.category}
                  </span>
                </div>

                <div className="admin-query-message-box">
                  <h3>Original Message</h3>
                  <p>{selectedInternalQuery.message}</p>
                  <small>
                    Related assignment:{" "}
                    {getAssignmentLabel(selectedInternalQuery.relatedAssignment)}
                  </small>
                </div>

                <div className="admin-query-update-grid">
                  <div className="admin-query-form-group">
                    <label>Status</label>
                    <select
                      value={internalEditForm.status}
                      onChange={(event) =>
                        setInternalEditForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                    >
                      {INTERNAL_QUERY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-query-form-group">
                    <label>Priority</label>
                    <select
                      value={internalEditForm.priority}
                      onChange={(event) =>
                        setInternalEditForm((prev) => ({
                          ...prev,
                          priority: event.target.value,
                        }))
                      }
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-query-form-group">
                    <label>Assigned Staff</label>
                    <select
                      value={internalEditForm.assignedToStaffId}
                      onChange={(event) =>
                        setInternalEditForm((prev) => ({
                          ...prev,
                          assignedToStaffId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {getStaffName(staff)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="admin-query-save-btn"
                    onClick={handleUpdateInternalQuery}
                    disabled={saving}
                  >
                    <CheckCircle size={16} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="admin-query-thread">
                  <h3>Conversation</h3>
                  {renderReplies(selectedInternalQuery)}
                </div>

                <form
                  className="admin-query-reply-form"
                  onSubmit={handleReplyToInternalQuery}
                >
                  <textarea
                    rows="4"
                    placeholder="Write internal reply..."
                    value={internalReplyMessage}
                    onChange={(event) =>
                      setInternalReplyMessage(event.target.value)
                    }
                  ></textarea>

                  <button
                    type="submit"
                    className="admin-query-submit-btn"
                    disabled={saving}
                  >
                    <Send size={17} />
                    {saving ? "Sending..." : "Send Reply"}
                  </button>
                </form>
              </>
            ) : null}

            {activeTab === "client" && !selectedClientQuery ? (
              <div className="admin-query-empty-detail">
                Select a client query to view details.
              </div>
            ) : null}

            {activeTab === "internal" && !selectedInternalQuery ? (
              <div className="admin-query-empty-detail">
                Select an internal query to view details.
              </div>
            ) : null}
          </div>
        </section>

        {confirmDelete && (
          <div className="admin-query-delete-overlay">
            <div className="admin-query-delete-modal">
              <button
                type="button"
                className="admin-query-delete-close"
                onClick={closeDeleteConfirm}
                disabled={saving}
              >
                <X size={18} />
              </button>

              <div className="admin-query-delete-icon">
                <Trash2 size={26} />
              </div>

              <h2>Delete Query?</h2>

              <p>
                Are you sure you want to permanently delete{" "}
                <strong>{confirmDelete.title}</strong>?
              </p>

              <small>
                This action cannot be undone. All replies linked with this query
                will also be removed.
              </small>

              {errorMessage && (
                <div className="admin-query-delete-error">{errorMessage}</div>
              )}

              <div className="admin-query-delete-actions">
                <button
                  type="button"
                  className="admin-query-delete-cancel"
                  onClick={closeDeleteConfirm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="admin-query-delete-confirm-btn"
                  onClick={handleConfirmDelete}
                  disabled={saving}
                >
                  <Trash2 size={16} />
                  {saving ? "Deleting..." : "Delete Query"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
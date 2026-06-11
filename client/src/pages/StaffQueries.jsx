import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Send,
  Search,
  UserRound,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Reply,
  RefreshCcw,
  X,
} from "lucide-react";

import StaffSidebar from "../components/StaffSidebar";

import { getMyStaffAssignments } from "../services/assignmentService";

import {
  getMyStaffClientQueries,
  createClientQueryByStaff,
  addReplyToClientQuery,
  updateClientQueryStatus,
  getMyInternalQueriesForStaff,
  createInternalQuery,
  addReplyToInternalQuery,
  updateInternalQueryStatus,
} from "../services/queryService";

import "./StaffQueries.css";

const CLIENT_STATUS_OPTIONS = [
  "Open",
  "In Progress",
  "Waiting for Client",
  "Resolved",
  "Closed",
];

const INTERNAL_STATUS_OPTIONS = [
  "Open",
  "In Progress",
  "Waiting",
  "Resolved",
  "Closed",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

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

const INTERNAL_NOTE_CATEGORIES = [
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

export default function StaffQueries() {
  const [clientQueries, setClientQueries] = useState([]);
  const [internalQueries, setInternalQueries] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [activeTab, setActiveTab] = useState("client");

  const [selectedQuery, setSelectedQuery] = useState(null);
  const [formMode, setFormMode] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [replyForm, setReplyForm] = useState({
    message: "",
    status: "Open",
  });

  const [clientQueryForm, setClientQueryForm] = useState({
    clientId: "",
    assignmentId: "",
    subject: "",
    message: "",
    category: "General",
    priority: "Medium",
  });

  const [internalNoteForm, setInternalNoteForm] = useState({
    subject: "",
    message: "",
    category: "General",
    priority: "Medium",
  });

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const fetchQueries = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [assignmentData, clientQueryData, internalQueryData] =
        await Promise.all([
          getMyStaffAssignments(),
          getMyStaffClientQueries(),
          getMyInternalQueriesForStaff(),
        ]);

      if (assignmentData?.success) {
        setAssignments(assignmentData.assignments || []);
      }

      if (clientQueryData?.success) {
        setClientQueries(clientQueryData.queries || []);
      } else {
        showError(clientQueryData?.message || "Unable to fetch client queries.");
      }

      if (internalQueryData?.success) {
        setInternalQueries(internalQueryData.queries || []);
      } else {
        showError(
          internalQueryData?.message || "Unable to fetch internal notes."
        );
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
    fetchQueries();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

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

  const normalizeText = (value) => {
    return String(value || "").trim().toLowerCase();
  };

  const getStatusClass = (status) => {
    if (status === "Open") return "open";

    if (
      status === "In Progress" ||
      status === "Waiting for Client" ||
      status === "Waiting"
    ) {
      return "discussion";
    }

    if (status === "Resolved" || status === "Closed") return "resolved";

    return "normal";
  };

  const getPriorityClass = (priority) => {
    if (priority === "Urgent" || priority === "High") return "high";
    if (priority === "Medium") return "medium";
    return "low";
  };

  const getSenderLabel = (reply) => {
    const role = reply?.senderRole || "-";
    const name = reply?.senderUser?.name || "";

    return name ? `${name} (${role})` : role;
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
    if (!clientQueryForm.clientId) return assignments;

    return assignments.filter(
      (assignment) => getClientId(assignment.client) === clientQueryForm.clientId
    );
  }, [assignments, clientQueryForm.clientId]);

  const clientQueryRows = useMemo(() => {
    return clientQueries.map((query) => ({
      id: query._id,
      queryType: "CLIENT",
      client: getClientName(query.client),
      service: query.assignment?.serviceName || query.category || "Client Query",
      subject: query.subject || "-",
      query: query.message || "-",
      date: formatDate(query.updatedAt || query.createdAt),
      priority: query.priority || "Medium",
      status: query.status || "Open",
      category: query.category || "General",
      replies: query.replies || [],
      rawQuery: query,
    }));
  }, [clientQueries]);

  const internalQueryRows = useMemo(() => {
    return internalQueries.map((query) => ({
      id: query._id,
      queryType: "INTERNAL",
      client: query.relatedClient
        ? getClientName(query.relatedClient)
        : "Internal Office Note",
      service:
        query.relatedAssignment?.serviceName ||
        query.category ||
        "Internal Query",
      subject: query.subject || "-",
      query: query.message || "-",
      date: formatDate(query.updatedAt || query.createdAt),
      priority: query.priority || "Medium",
      status: query.status || "Open",
      category: query.category || "General",
      replies: query.replies || [],
      rawQuery: query,
    }));
  }, [internalQueries]);

  const currentRows = activeTab === "client" ? clientQueryRows : internalQueryRows;

  const filteredQueries = useMemo(() => {
    const term = normalizeText(searchTerm);

    const sortedRows = [...currentRows].sort((a, b) => {
      const first = new Date(a.rawQuery.updatedAt || a.rawQuery.createdAt);
      const second = new Date(b.rawQuery.updatedAt || b.rawQuery.createdAt);

      return second - first;
    });

    if (!term) return sortedRows;

    return sortedRows.filter((item) => {
      return (
        normalizeText(item.client).includes(term) ||
        normalizeText(item.service).includes(term) ||
        normalizeText(item.subject).includes(term) ||
        normalizeText(item.query).includes(term) ||
        normalizeText(item.priority).includes(term) ||
        normalizeText(item.status).includes(term)
      );
    });
  }, [currentRows, searchTerm]);

  const openQueries = currentRows.filter((item) => item.status === "Open").length;

  const discussionQueries = currentRows.filter((item) =>
    ["In Progress", "Waiting for Client", "Waiting"].includes(item.status)
  ).length;

  const resolvedQueries = currentRows.filter((item) =>
    ["Resolved", "Closed"].includes(item.status)
  ).length;

  const resetReplyForm = () => {
    setReplyForm({
      message: "",
      status: "Open",
    });
  };

  const resetClientQueryForm = () => {
    setClientQueryForm({
      clientId: "",
      assignmentId: "",
      subject: "",
      message: "",
      category: "General",
      priority: "Medium",
    });
  };

  const resetInternalNoteForm = () => {
    setInternalNoteForm({
      subject: "",
      message: "",
      category: "General",
      priority: "Medium",
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setSelectedQuery(null);
    setFormMode("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const openClientQueryBox = () => {
    setSelectedQuery(null);
    setFormMode("client-create");
    resetClientQueryForm();
    setActiveTab("client");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const openReplyBox = (query) => {
    setSelectedQuery(query);
    setFormMode(query.queryType === "CLIENT" ? "client-reply" : "internal-reply");

    setReplyForm({
      message: "",
      status: query.status || "Open",
    });

    setErrorMessage("");
    setSuccessMessage("");
  };

  const openInternalNoteBox = () => {
    setSelectedQuery(null);
    setFormMode("note");
    resetInternalNoteForm();
    setActiveTab("internal");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeBox = () => {
    if (submitting) return;

    setSelectedQuery(null);
    setFormMode("");
    resetReplyForm();
    resetClientQueryForm();
    resetInternalNoteForm();
    setErrorMessage("");
  };

  const handleReplyInputChange = (event) => {
    const { name, value } = event.target;

    setReplyForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClientQueryInputChange = (event) => {
    const { name, value } = event.target;

    if (name === "clientId") {
      setClientQueryForm((prev) => ({
        ...prev,
        clientId: value,
        assignmentId: "",
      }));
      return;
    }

    setClientQueryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInternalNoteInputChange = (event) => {
    const { name, value } = event.target;

    setInternalNoteForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (formMode === "client-create") {
        if (!clientQueryForm.clientId) {
          showError("Please select client.");
          return;
        }

        if (!clientQueryForm.subject.trim()) {
          showError("Subject is required.");
          return;
        }

        if (!clientQueryForm.message.trim()) {
          showError("Query message is required.");
          return;
        }

        const data = await createClientQueryByStaff({
          clientId: clientQueryForm.clientId,
          assignmentId: clientQueryForm.assignmentId,
          subject: clientQueryForm.subject,
          message: clientQueryForm.message,
          category: clientQueryForm.category,
          priority: clientQueryForm.priority,
        });

        if (data?.success) {
          showSuccess("Client query sent successfully.");
          await fetchQueries();
          closeBox();
          setActiveTab("client");
        } else {
          showError(data?.message || "Unable to send client query.");
        }

        return;
      }

      if (formMode === "note") {
        if (!internalNoteForm.subject.trim()) {
          showError("Subject is required.");
          return;
        }

        if (!internalNoteForm.message.trim()) {
          showError("Internal note is required.");
          return;
        }

        const data = await createInternalQuery({
          subject: internalNoteForm.subject,
          message: internalNoteForm.message,
          category: internalNoteForm.category,
          priority: internalNoteForm.priority,
        });

        if (data?.success) {
          showSuccess("Internal note added successfully.");
          await fetchQueries();
          closeBox();
          setActiveTab("internal");
        } else {
          showError(data?.message || "Unable to add internal note.");
        }

        return;
      }

      if (!selectedQuery?.id) {
        showError("Please select query.");
        return;
      }

      const trimmedMessage = replyForm.message.trim();
      const statusChanged = replyForm.status !== selectedQuery.status;

      if (!trimmedMessage && !statusChanged) {
        showError("Please write reply or update status.");
        return;
      }

      if (selectedQuery.queryType === "CLIENT") {
        if (trimmedMessage) {
          await addReplyToClientQuery(selectedQuery.id, {
            message: trimmedMessage,
          });
        }

        if (replyForm.status) {
          await updateClientQueryStatus(selectedQuery.id, {
            status: replyForm.status,
          });
        }

        showSuccess("Client query updated successfully.");
      }

      if (selectedQuery.queryType === "INTERNAL") {
        if (trimmedMessage) {
          await addReplyToInternalQuery(selectedQuery.id, {
            message: trimmedMessage,
          });
        }

        if (replyForm.status) {
          await updateInternalQueryStatus(selectedQuery.id, {
            status: replyForm.status,
          });
        }

        showSuccess("Internal query updated successfully.");
      }

      await fetchQueries();
      closeBox();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to submit query response."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions =
    selectedQuery?.queryType === "INTERNAL"
      ? INTERNAL_STATUS_OPTIONS
      : CLIENT_STATUS_OPTIONS;

  return (
    <div className="staff-queries-page">
      <StaffSidebar active="queries" />

      <main className="staff-queries-main">
        <header className="staff-queries-header">
          <div>
            <h1>Queries</h1>
            <p>
              View client queries, send queries to clients and manage internal
              office notes separately.
            </p>
          </div>

          <div className="staff-query-header-actions">
            <button
              type="button"
              className="staff-query-action-btn"
              onClick={openClientQueryBox}
            >
              <MessageSquare size={18} />
              Raise Client Query
            </button>

            <button
              type="button"
              className="staff-query-action-btn"
              onClick={openInternalNoteBox}
            >
              <MessageSquare size={18} />
              Add Internal Note
            </button>

            <button
              type="button"
              className="staff-query-refresh-btn"
              onClick={fetchQueries}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="staff-query-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="staff-query-message success">{successMessage}</div>
        )}

        <section className="staff-query-tabs-panel">
          <button
            type="button"
            className={activeTab === "client" ? "active" : ""}
            onClick={() => handleTabChange("client")}
          >
            Client Queries
            <span>{clientQueryRows.length}</span>
          </button>

          <button
            type="button"
            className={activeTab === "internal" ? "active" : ""}
            onClick={() => handleTabChange("internal")}
          >
            Internal Notes
            <span>{internalQueryRows.length}</span>
          </button>
        </section>

        <section className="staff-query-stats">
          <div className="staff-query-stat-card">
            <div className="staff-query-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Open</p>
              <h3>{loading ? "..." : openQueries}</h3>
            </div>
          </div>

          <div className="staff-query-stat-card">
            <div className="staff-query-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>In Discussion</p>
              <h3>{loading ? "..." : discussionQueries}</h3>
            </div>
          </div>

          <div className="staff-query-stat-card">
            <div className="staff-query-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Resolved</p>
              <h3>{loading ? "..." : resolvedQueries}</h3>
            </div>
          </div>
        </section>

        <section className="staff-query-panel">
          <div className="staff-query-panel-header">
            <div>
              <h2>
                {activeTab === "client" ? "Client Queries" : "Internal Notes"}
              </h2>
              <p>
                {activeTab === "client"
                  ? "Queries raised by clients, admin or staff for client follow-up."
                  : "Internal office notes raised by staff/admin."}
              </p>
            </div>

            <div className="staff-query-search">
              <Search size={17} />
              <input
                type="text"
                placeholder={
                  activeTab === "client"
                    ? "Search client query..."
                    : "Search internal note..."
                }
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="staff-query-list">
            {loading && filteredQueries.length === 0 ? (
              <div className="staff-query-empty-state">Loading queries...</div>
            ) : filteredQueries.length === 0 ? (
              <div className="staff-query-empty-state">
                {searchTerm
                  ? "No matching record found."
                  : activeTab === "client"
                  ? "No client queries assigned yet."
                  : "No internal notes found."}
              </div>
            ) : (
              filteredQueries.map((item) => (
                <div className="staff-query-card" key={item.id}>
                  <div className="staff-query-left">
                    <div className="staff-query-user-icon">
                      <UserRound />
                    </div>

                    <div>
                      <h3>{item.client}</h3>
                      <p>
                        {item.service} •{" "}
                        {item.queryType === "CLIENT"
                          ? "Client Query"
                          : "Internal Note"}
                      </p>
                      <small>
                        <strong>{item.subject}</strong> — {item.query}
                      </small>
                    </div>
                  </div>

                  <div className="staff-query-meta">
                    <p>Date</p>
                    <h4>{item.date}</h4>
                  </div>

                  <div className="staff-query-badges">
                    <span
                      className={`staff-query-priority ${getPriorityClass(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>

                    <span
                      className={`staff-query-status ${getStatusClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="staff-query-actions">
                    <button type="button" onClick={() => openReplyBox(item)}>
                      <Eye size={15} />
                      View
                    </button>

                    <button type="button" onClick={() => openReplyBox(item)}>
                      <Reply size={15} />
                      Reply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {formMode && (
          <section className="staff-query-reply-panel">
            <div className="staff-query-reply-header">
              <div>
                <h2>
                  {formMode === "client-create"
                    ? "Raise Client Query"
                    : formMode === "note"
                    ? "Add Internal Note"
                    : selectedQuery?.queryType === "CLIENT"
                    ? "Reply to Client Query"
                    : "Reply to Internal Note"}
                </h2>

                <p>
                  {formMode === "client-create"
                    ? "Send query or document requirement to assigned client."
                    : formMode === "note"
                    ? "Internal office communication for Admin."
                    : `${selectedQuery?.client} • ${selectedQuery?.service}`}
                </p>
              </div>

              <button type="button" onClick={closeBox} disabled={submitting}>
                <X size={16} />
                Close
              </button>
            </div>

            {formMode !== "note" &&
              formMode !== "client-create" &&
              selectedQuery && (
                <>
                  <div className="staff-selected-query">
                    <h3>{selectedQuery.subject}</h3>
                    <p>{selectedQuery.query}</p>
                  </div>

                  <div className="staff-query-replies-box">
                    <h3>Conversation</h3>

                    {selectedQuery.replies.length === 0 ? (
                      <p>No replies added yet.</p>
                    ) : (
                      selectedQuery.replies.map((reply) => (
                        <div className="staff-query-reply-item" key={reply._id}>
                          <strong>{getSenderLabel(reply)}</strong>
                          <p>{reply.message}</p>
                          <small>{formatDateTime(reply.createdAt)}</small>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

            <form onSubmit={handleSubmit}>
              {formMode === "client-create" ? (
                <>
                  <div className="staff-query-form-grid">
                    <div className="staff-query-form-group">
                      <label>Client</label>
                      <select
                        name="clientId"
                        value={clientQueryForm.clientId}
                        onChange={handleClientQueryInputChange}
                        required
                      >
                        <option value="">Select client</option>
                        {clientOptions.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="staff-query-form-group">
                      <label>Related Assignment</label>
                      <select
                        name="assignmentId"
                        value={clientQueryForm.assignmentId}
                        onChange={handleClientQueryInputChange}
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
                  </div>

                  <div className="staff-query-form-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      name="subject"
                      placeholder="Example: Pending documents required for GST return"
                      value={clientQueryForm.subject}
                      onChange={handleClientQueryInputChange}
                      required
                    />
                  </div>

                  <div className="staff-query-form-group">
                    <label>Query Message</label>
                    <textarea
                      name="message"
                      rows="5"
                      placeholder="Write query/message for client..."
                      value={clientQueryForm.message}
                      onChange={handleClientQueryInputChange}
                      required
                    ></textarea>
                  </div>

                  <div className="staff-query-form-grid">
                    <div className="staff-query-form-group">
                      <label>Category</label>
                      <select
                        name="category"
                        value={clientQueryForm.category}
                        onChange={handleClientQueryInputChange}
                      >
                        {CLIENT_QUERY_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="staff-query-form-group">
                      <label>Priority</label>
                      <select
                        name="priority"
                        value={clientQueryForm.priority}
                        onChange={handleClientQueryInputChange}
                      >
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : formMode === "note" ? (
                <>
                  <div className="staff-query-form-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      name="subject"
                      placeholder="Example: Client follow-up required"
                      value={internalNoteForm.subject}
                      onChange={handleInternalNoteInputChange}
                      required
                    />
                  </div>

                  <div className="staff-query-form-group">
                    <label>Internal Note</label>
                    <textarea
                      name="message"
                      rows="5"
                      placeholder="Write internal note for Admin or office record..."
                      value={internalNoteForm.message}
                      onChange={handleInternalNoteInputChange}
                      required
                    ></textarea>
                  </div>

                  <div className="staff-query-form-grid">
                    <div className="staff-query-form-group">
                      <label>Category</label>
                      <select
                        name="category"
                        value={internalNoteForm.category}
                        onChange={handleInternalNoteInputChange}
                      >
                        {INTERNAL_NOTE_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="staff-query-form-group">
                      <label>Priority</label>
                      <select
                        name="priority"
                        value={internalNoteForm.priority}
                        onChange={handleInternalNoteInputChange}
                      >
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="staff-query-form-group">
                    <label>
                      {selectedQuery?.queryType === "CLIENT"
                        ? "Reply to Client"
                        : "Internal Reply"}
                    </label>

                    <textarea
                      name="message"
                      rows="5"
                      placeholder={
                        selectedQuery?.queryType === "CLIENT"
                          ? "Write reply for client..."
                          : "Write internal reply for admin or office record..."
                      }
                      value={replyForm.message}
                      onChange={handleReplyInputChange}
                    ></textarea>
                  </div>

                  <div className="staff-query-form-grid">
                    <div className="staff-query-form-group">
                      <label>Update Status</label>

                      <select
                        name="status"
                        value={replyForm.status}
                        onChange={handleReplyInputChange}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="staff-query-form-group">
                      <label>Query Type</label>

                      <input
                        type="text"
                        value={
                          selectedQuery?.queryType === "CLIENT"
                            ? "Client Query"
                            : "Internal Note"
                        }
                        readOnly
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="staff-query-submit-row">
                <button type="button" onClick={closeBox} disabled={submitting}>
                  Cancel
                </button>

                <button type="submit" disabled={submitting}>
                  <Send size={17} />
                  {submitting
                    ? "Submitting..."
                    : formMode === "client-create"
                    ? "Send Client Query"
                    : formMode === "note"
                    ? "Save Internal Note"
                    : "Submit Reply"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
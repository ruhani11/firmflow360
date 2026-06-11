import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  X,
  Search,
  BriefcaseBusiness,
  UserRound,
  Reply,
  Plus,
  RefreshCcw,
} from "lucide-react";

import ClientSidebar from "../components/ClientSidebar";

import { getMyClientServices } from "../services/assignmentService";

import {
  getMyClientQueries,
  createQueryByClient,
  addReplyToClientQuery,
} from "../services/queryService";

import "./ClientQueries.css";

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const CATEGORY_OPTIONS = [
  "General",
  "Document",
  "GST",
  "Income Tax",
  "TDS",
  "Audit",
  "Billing",
  "Other",
];

export default function ClientQueries() {
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [formMode, setFormMode] = useState("create");

  const [services, setServices] = useState([]);
  const [queries, setQueries] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [queryForm, setQueryForm] = useState({
    assignmentId: "",
    subject: "",
    message: "",
    category: "General",
    priority: "Medium",
  });

  const [replyForm, setReplyForm] = useState({
    message: "",
  });

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const fetchClientQueriesData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [serviceData, queryData] = await Promise.all([
        getMyClientServices(),
        getMyClientQueries(),
      ]);

      if (serviceData?.success) {
        setServices(serviceData.services || serviceData.assignments || []);
      }

      if (queryData?.success) {
        setQueries(queryData.queries || []);
      } else {
        showError(queryData?.message || "Unable to fetch queries.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch client queries."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientQueriesData();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const resetQueryForm = () => {
    setQueryForm({
      assignmentId: "",
      subject: "",
      message: "",
      category: "General",
      priority: "Medium",
    });
  };

  const resetReplyForm = () => {
    setReplyForm({
      message: "",
    });
  };

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

  const getServiceName = (assignment) => {
    if (!assignment) return "General Query";

    return assignment.serviceName || assignment.category || "General Query";
  };

  // eslint-disable-next-line no-unused-vars
  const getStaffName = (query) => {
    const staffUser = query.assignedStaff?.user;

    return (
      staffUser?.name ||
      query.assignedStaff?.name ||
      query.assignment?.staff?.user?.name ||
      "CA Office"
    );
  };

  const getLatestReply = (query) => {
    const replies = query.replies || [];

    if (replies.length === 0) {
      return {
        repliedBy: "Awaiting Reply",
        lastReply: "No reply received yet.",
      };
    }

    const lastReply = replies[replies.length - 1];

    return {
      repliedBy:
        lastReply.senderUser?.name ||
        lastReply.senderRole ||
        "CA Office",
      lastReply: lastReply.message || "-",
    };
  };

  const getSenderLabel = (reply) => {
    const role = reply?.senderRole || "-";
    const name = reply?.senderUser?.name || "";

    return name ? `${name} (${role})` : role;
  };

  const getDisplayStatus = (status) => {
    if (status === "In Progress") return "In Discussion";
    if (status === "Waiting for Client") return "In Discussion";
    return status || "Open";
  };

  const getStatusClass = (status) => {
    const displayStatus = getDisplayStatus(status);

    if (displayStatus === "Open") return "open";
    if (displayStatus === "In Discussion") return "discussion";
    if (displayStatus === "Resolved" || displayStatus === "Closed") {
      return "resolved";
    }

    return "normal";
  };

  const getPriorityClass = (priority) => {
    if (priority === "Urgent" || priority === "High") return "high";
    if (priority === "Medium") return "medium";
    return "low";
  };

  const queryRows = useMemo(() => {
    return queries
      .map((query) => {
        const latestReply = getLatestReply(query);

        return {
          id: query._id,
          service: getServiceName(query.assignment),
          subject: query.subject || "-",
          message: query.message || "-",
          raisedOn: formatDate(query.createdAt),
          status: query.status || "Open",
          displayStatus: getDisplayStatus(query.status),
          priority: query.priority || "Medium",
          category: query.category || "General",
          repliedBy: latestReply.repliedBy,
          lastReply: latestReply.lastReply,
          replies: query.replies || [],
          rawQuery: query,
        };
      })
      .sort((a, b) => {
        const first = new Date(a.rawQuery.updatedAt || a.rawQuery.createdAt);
        const second = new Date(b.rawQuery.updatedAt || b.rawQuery.createdAt);
        return second - first;
      });
  }, [queries]);

  const filteredQueries = useMemo(() => {
    const term = normalizeText(searchTerm);

    if (!term) return queryRows;

    return queryRows.filter((query) => {
      return (
        normalizeText(query.service).includes(term) ||
        normalizeText(query.subject).includes(term) ||
        normalizeText(query.message).includes(term) ||
        normalizeText(query.displayStatus).includes(term) ||
        normalizeText(query.priority).includes(term) ||
        normalizeText(query.category).includes(term)
      );
    });
  }, [queryRows, searchTerm]);

  const totalQueries = queryRows.length;

  const openQueries = queryRows.filter(
    (query) => query.displayStatus === "Open"
  ).length;

  const discussionQueries = queryRows.filter(
    (query) => query.displayStatus === "In Discussion"
  ).length;

  const resolvedQueries = queryRows.filter((query) =>
    ["Resolved", "Closed"].includes(query.displayStatus)
  ).length;

  const openCreateForm = () => {
    setFormMode("create");
    setSelectedQuery(null);
    resetQueryForm();
    resetReplyForm();
    setShowQueryForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const openReplyForm = (query) => {
    setFormMode("reply");
    setSelectedQuery(query);
    resetReplyForm();
    setShowQueryForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeQueryForm = () => {
    if (submitting) return;

    setShowQueryForm(false);
    setSelectedQuery(null);
    setFormMode("create");
    resetQueryForm();
    resetReplyForm();
    setErrorMessage("");
  };

  const handleQueryInputChange = (event) => {
    const { name, value } = event.target;

    setQueryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReplyInputChange = (event) => {
    const { name, value } = event.target;

    setReplyForm((prev) => ({
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

      if (formMode === "create") {
        if (!queryForm.subject.trim()) {
          showError("Subject is required.");
          return;
        }

        if (!queryForm.message.trim()) {
          showError("Query message is required.");
          return;
        }

        const data = await createQueryByClient({
          assignmentId: queryForm.assignmentId,
          subject: queryForm.subject,
          message: queryForm.message,
          category: queryForm.category,
          priority: queryForm.priority,
        });

        if (data?.success) {
          showSuccess("Query submitted successfully.");
          await fetchClientQueriesData();
          closeQueryForm();
        } else {
          showError(data?.message || "Unable to submit query.");
        }

        return;
      }

      if (formMode === "reply") {
        if (!selectedQuery?.id) {
          showError("Please select query.");
          return;
        }

        if (!replyForm.message.trim()) {
          showError("Reply message is required.");
          return;
        }

        const data = await addReplyToClientQuery(selectedQuery.id, {
          message: replyForm.message,
        });

        if (data?.success) {
          showSuccess("Reply submitted successfully.");
          await fetchClientQueriesData();
          closeQueryForm();
        } else {
          showError(data?.message || "Unable to submit reply.");
        }
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to submit query."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="client-queries-page">
      <ClientSidebar active="queries" />

      <main className="client-queries-main">
        <header className="client-queries-header">
          <div>
            <h1>Queries</h1>
            <p>
              Raise questions to the CA office, track replies and view query
              status for your assigned services.
            </p>
          </div>

          <div className="client-query-header-actions">
            <button
              type="button"
              className="client-query-refresh-btn"
              onClick={fetchClientQueriesData}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="client-query-create-btn"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Raise New Query
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="client-query-page-message error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="client-query-page-message success">
            {successMessage}
          </div>
        )}

        <section className="client-query-stats">
          <div className="client-query-stat-card">
            <div className="client-query-stat-icon blue">
              <MessageSquare />
            </div>
            <div>
              <p>Total Queries</p>
              <h3>{loading ? "..." : totalQueries}</h3>
            </div>
          </div>

          <div className="client-query-stat-card">
            <div className="client-query-stat-icon red">
              <AlertTriangle />
            </div>
            <div>
              <p>Open</p>
              <h3>{loading ? "..." : openQueries}</h3>
            </div>
          </div>

          <div className="client-query-stat-card">
            <div className="client-query-stat-icon orange">
              <Clock />
            </div>
            <div>
              <p>In Discussion</p>
              <h3>{loading ? "..." : discussionQueries}</h3>
            </div>
          </div>

          <div className="client-query-stat-card">
            <div className="client-query-stat-icon green">
              <CheckCircle />
            </div>
            <div>
              <p>Resolved</p>
              <h3>{loading ? "..." : resolvedQueries}</h3>
            </div>
          </div>
        </section>

        {showQueryForm && (
          <section className="client-query-form-panel">
            <div className="client-query-form-header">
              <div>
                <h2>
                  {formMode === "reply" ? "Reply to Query" : "Raise New Query"}
                </h2>
                <p>
                  {formMode === "reply"
                    ? "Send your reply to CA office / assigned staff."
                    : "Ask a question related to GST, ITR, accounting, documents, final files or any active service."}
                </p>
              </div>

              <button
                type="button"
                className="client-query-close-btn"
                onClick={closeQueryForm}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            {formMode === "reply" && selectedQuery && (
              <>
                <div className="client-query-selected-box">
                  <h3>{selectedQuery.subject}</h3>
                  <p>{selectedQuery.message}</p>
                  <small>
                    {selectedQuery.service} • {selectedQuery.displayStatus}
                  </small>
                </div>

                <div className="client-query-conversation-box">
                  <h3>Conversation</h3>

                  {selectedQuery.replies.length === 0 ? (
                    <p>No replies added yet.</p>
                  ) : (
                    selectedQuery.replies.map((reply) => (
                      <div className="client-query-conversation-item" key={reply._id}>
                        <strong>{getSenderLabel(reply)}</strong>
                        <p>{reply.message}</p>
                        <small>{formatDateTime(reply.createdAt)}</small>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            <form className="client-query-form" onSubmit={handleSubmit}>
              {formMode === "create" ? (
                <div className="client-query-form-grid">
                  <div className="client-query-form-group">
                    <label>Related Service</label>
                    <select
                      name="assignmentId"
                      value={queryForm.assignmentId}
                      onChange={handleQueryInputChange}
                    >
                      <option value="">General Query</option>
                      {services.map((service) => (
                        <option key={service._id} value={service._id}>
                          {service.serviceName}
                          {service.period ? ` • ${service.period}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="client-query-form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      value={queryForm.category}
                      onChange={handleQueryInputChange}
                      required
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="client-query-form-group">
                    <label>Priority</label>
                    <select
                      name="priority"
                      value={queryForm.priority}
                      onChange={handleQueryInputChange}
                      required
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="client-query-form-group full-width">
                    <label>Subject</label>
                    <input
                      type="text"
                      name="subject"
                      placeholder="Example: GST liability working required"
                      value={queryForm.subject}
                      onChange={handleQueryInputChange}
                      required
                    />
                  </div>

                  <div className="client-query-form-group full-width">
                    <label>Query Message</label>
                    <textarea
                      name="message"
                      rows="5"
                      placeholder="Write your query clearly..."
                      value={queryForm.message}
                      onChange={handleQueryInputChange}
                      required
                    ></textarea>
                  </div>

                  <div className="client-query-note full-width">
                    <strong>Note:</strong> Your query will be visible to the CA
                    office / assigned staff. You can track replies from this page.
                  </div>
                </div>
              ) : (
                <div className="client-query-form-grid">
                  <div className="client-query-form-group full-width">
                    <label>Reply Message</label>
                    <textarea
                      name="message"
                      rows="5"
                      placeholder="Write your reply clearly..."
                      value={replyForm.message}
                      onChange={handleReplyInputChange}
                      required
                    ></textarea>
                  </div>

                  <div className="client-query-note full-width">
                    <strong>Note:</strong> Your reply will be visible to the CA
                    office and assigned staff.
                  </div>
                </div>
              )}

              <div className="client-query-form-actions">
                <button
                  type="button"
                  onClick={closeQueryForm}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button type="submit" disabled={submitting}>
                  <Send size={17} />
                  {submitting
                    ? "Submitting..."
                    : formMode === "reply"
                    ? "Submit Reply"
                    : "Submit Query"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="client-query-panel">
          <div className="client-query-panel-header">
            <div>
              <h2>My Query List</h2>
              <p>Track query replies and current status from the CA office.</p>
            </div>

            <div className="client-query-search">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search query..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="client-query-list">
            {loading && filteredQueries.length === 0 ? (
              <div className="client-query-empty-state">
                Loading queries...
              </div>
            ) : filteredQueries.length === 0 ? (
              <div className="client-query-empty-state">
                {searchTerm
                  ? "No matching query found."
                  : "No query raised yet."}
              </div>
            ) : (
              filteredQueries.map((query) => (
                <div className="client-query-card" key={query.id}>
                  <div className="client-query-left">
                    <div className="client-query-icon">
                      <MessageSquare />
                    </div>

                    <div>
                      <h3>{query.subject}</h3>
                      <p>
                        <BriefcaseBusiness size={14} />
                        {query.service}
                      </p>
                      <small>Raised on: {query.raisedOn}</small>
                    </div>
                  </div>

                  <div className="client-query-message">
                    <p>Query Message</p>
                    <h4>{query.message}</h4>
                  </div>

                  <div className="client-query-reply">
                    <p>
                      <UserRound size={14} />
                      Reply by {query.repliedBy}
                    </p>
                    <small>{query.lastReply}</small>
                  </div>

                  <div className="client-query-status-box">
                    <span
                      className={`client-query-priority ${getPriorityClass(
                        query.priority
                      )}`}
                    >
                      {query.priority}
                    </span>

                    <span
                      className={`client-query-status ${getStatusClass(
                        query.status
                      )}`}
                    >
                      {query.displayStatus}
                    </span>
                  </div>

                  <div className="client-query-actions">
                    <button type="button" onClick={() => openReplyForm(query)}>
                      <Eye size={15} />
                      View
                    </button>

                    {!["Resolved", "Closed"].includes(query.displayStatus) && (
                      <button type="button" onClick={() => openReplyForm(query)}>
                        <Reply size={15} />
                        Reply
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
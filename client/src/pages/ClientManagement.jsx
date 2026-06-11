import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  UserRound,
  Search,
  Plus,
  FileText,
  Circle,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  X,
  Save,
  Pencil,
  Trash2,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";
import {
  createClientByAdmin,
  deleteClientByAdmin,
  getAllClients,
  updateClientByAdmin,
} from "../services/adminService";

import "./ClientManagement.css";

export default function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteTargetClient, setDeleteTargetClient] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    clientType: "BUSINESS",
    name: "",
    businessName: "",
    individualName: "",
    email: "",
    password: "",
    pan: "",
    gstin: "",
    constitution: "",
    contactPerson: "",
    mobile: "",
    address: "",
    portalStatus: "Active",
    userStatus: "ACTIVE",
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getAllClients();

      if (data?.success) {
        setClients(data.clients || []);
      } else {
        setErrorMessage(data?.message || "Unable to fetch clients.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch clients."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClients();
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
      clientType: "BUSINESS",
      name: "",
      businessName: "",
      individualName: "",
      email: "",
      password: "",
      pan: "",
      gstin: "",
      constitution: "",
      contactPerson: "",
      mobile: "",
      address: "",
      portalStatus: "Active",
      userStatus: "ACTIVE",
    });
  };

  const getClientDisplayName = (client) => {
    if (client.clientType === "BUSINESS") {
      return client.businessName || client.user?.name || "Business Client";
    }

    return client.individualName || client.user?.name || "Individual Client";
  };

  const getClientEmail = (client) => {
    return client.user?.email || "-";
  };

  const getClientStatus = (client) => {
    return client.portalStatus || client.user?.status || "Active";
  };

  const getGstinValue = (client) => {
    if (client.clientType !== "BUSINESS") return "Not Applicable";
    return client.gstin || "-";
  };

  const getStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (value === "active") return "active";
    if (value === "under review") return "review";
    if (value === "pending documents") return "pending";

    return "inactive";
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      const nextData = {
        ...prev,
        [name]: value,
      };

      if (name === "clientType") {
        nextData.name = "";
        nextData.businessName = "";
        nextData.individualName = "";
        nextData.gstin = "";
        nextData.constitution = "";
        nextData.contactPerson = "";
      }

      return nextData;
    });

    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleOpenAddClient = () => {
    resetForm();
    setEditingClient(null);
    setShowClientModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleOpenEditClient = (client) => {
    const isBusiness = client.clientType === "BUSINESS";

    setEditingClient(client);

    setFormData({
      clientType: client.clientType || "BUSINESS",
      name: client.user?.name || getClientDisplayName(client),
      businessName: isBusiness ? client.businessName || "" : "",
      individualName: !isBusiness ? client.individualName || "" : "",
      email: client.user?.email || "",
      password: "",
      pan: client.pan || "",
      gstin: isBusiness ? client.gstin || "" : "",
      constitution: isBusiness ? client.constitution || "" : "",
      contactPerson: isBusiness ? client.contactPerson || "" : "",
      mobile: client.mobile || "",
      address: client.address || "",
      portalStatus: client.portalStatus || "Active",
      userStatus: client.user?.status || "ACTIVE",
    });

    setShowClientModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setEditingClient(null);
    resetForm();
    setErrorMessage("");
    setSuccessMessage("");
  };

  const buildPayload = () => {
    const isBusiness = formData.clientType === "BUSINESS";

    const payload = {
      name: isBusiness
        ? formData.businessName.trim()
        : formData.individualName.trim(),
      email: formData.email.trim(),
      clientType: formData.clientType,
      businessName: isBusiness ? formData.businessName.trim() : undefined,
      individualName: !isBusiness ? formData.individualName.trim() : undefined,
      pan: formData.pan.trim(),
      gstin: isBusiness ? formData.gstin.trim() : undefined,
      constitution: isBusiness ? formData.constitution.trim() : undefined,
      contactPerson: isBusiness ? formData.contactPerson.trim() : undefined,
      mobile: formData.mobile.trim(),
      address: formData.address.trim(),
      portalStatus: formData.portalStatus,
      userStatus: formData.userStatus,
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    return payload;
  };

  const validatePayload = (payload) => {
    const isBusiness = payload.clientType === "BUSINESS";

    if (!payload.name || !payload.email || !payload.clientType) {
      return "Client name, email and client type are required.";
    }

    if (!editingClient && !formData.password.trim()) {
      return "Password is required while creating a new client.";
    }

    if (isBusiness && !payload.businessName) {
      return "Business name is required for business client.";
    }

    if (!isBusiness && !payload.individualName) {
      return "Individual name is required for individual client.";
    }

    return "";
  };

  const handleSubmitClient = async (event) => {
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

      if (editingClient) {
        data = await updateClientByAdmin(editingClient._id, payload);
      } else {
        data = await createClientByAdmin({
          ...payload,
          password: formData.password.trim(),
        });
      }

      if (data?.success) {
        const message = editingClient
          ? "Client updated successfully."
          : "Client created successfully.";

        await fetchClients();

        setShowClientModal(false);
        setEditingClient(null);
        resetForm();
        setSuccessMessage(message);
        setErrorMessage("");
      } else {
        setErrorMessage(data?.message || "Unable to save client.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to save client."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteClient = (client) => {
    setDeleteTargetClient(client);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseDeleteClient = () => {
    if (deletingId) return;
    setDeleteTargetClient(null);
    setErrorMessage("");
  };

  const handleConfirmDeleteClient = async () => {
    if (!deleteTargetClient?._id) return;

    try {
      setDeletingId(deleteTargetClient._id);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await deleteClientByAdmin(deleteTargetClient._id);

      if (data?.success) {
        setDeleteTargetClient(null);
        setSuccessMessage("Client deleted successfully.");
        await fetchClients();
      } else {
        setErrorMessage(data?.message || "Unable to delete client.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete client."
      );
    } finally {
      setDeletingId("");
    }
  };

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return clients;

    return clients.filter((client) => {
      const name = getClientDisplayName(client).toLowerCase();
      const email = getClientEmail(client).toLowerCase();
      const pan = String(client.pan || "").toLowerCase();
      const gstin = String(client.gstin || "").toLowerCase();
      const mobile = String(client.mobile || "").toLowerCase();

      return (
        name.includes(term) ||
        email.includes(term) ||
        pan.includes(term) ||
        gstin.includes(term) ||
        mobile.includes(term)
      );
    });
  }, [clients, searchTerm]);

  const businessClients = clients.filter(
    (client) => client.clientType === "BUSINESS"
  ).length;

  const individualClients = clients.filter(
    (client) => client.clientType === "INDIVIDUAL"
  ).length;

  return (
    <div className="client-management-page">
      <AdminSidebar active="clients" />

      <main className="client-management-main">
        <header className="client-management-header">
          <div>
            <h1>Client Management</h1>
            <p>
              Manage business and individual clients, PAN/GSTIN details and
              client portal access.
            </p>
          </div>

          <button
            type="button"
            className="add-client-btn"
            onClick={handleOpenAddClient}
          >
            <Plus size={18} />
            Add Client
          </button>
        </header>

        <section className="client-management-stats">
          <div className="client-monitor-card">
            <div className="client-monitor-icon blue">
              <Building2 />
            </div>
            <div>
              <p>Business Clients</p>
              <h3>{businessClients}</h3>
            </div>
          </div>

          <div className="client-monitor-card">
            <div className="client-monitor-icon green">
              <UserRound />
            </div>
            <div>
              <p>Individual Clients</p>
              <h3>{individualClients}</h3>
            </div>
          </div>

          <div className="client-monitor-card">
            <div className="client-monitor-icon orange">
              <FileText />
            </div>
            <div>
              <p>Pending Documents</p>
              <h3>0</h3>
            </div>
          </div>

          <div className="client-monitor-card">
            <div className="client-monitor-icon purple">
              <ClipboardList />
            </div>
            <div>
              <p>Total Clients</p>
              <h3>{clients.length}</h3>
            </div>
          </div>
        </section>

        <section className="client-list-panel">
          <div className="client-list-header">
            <div>
              <h2>Client Directory</h2>
              <p>
                Data is fetched from backend. GSTIN is shown only where
                applicable.
              </p>
            </div>

            <div className="client-search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search client..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {errorMessage && !showClientModal && !deleteTargetClient && (
            <div className="client-message error">{errorMessage}</div>
          )}

          {successMessage && !showClientModal && !deleteTargetClient && (
            <div className="client-message success">{successMessage}</div>
          )}

          {loading ? (
            <div className="client-empty-state">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="client-empty-state">
              {searchTerm ? "No matching clients found." : "No clients found."}
            </div>
          ) : (
            <div className="client-card-list">
              {filteredClients.map((client) => (
                <div className="client-directory-card" key={client._id}>
                  <div className="client-directory-left">
                    <div
                      className={
                        client.clientType === "BUSINESS"
                          ? "client-directory-icon business"
                          : "client-directory-icon individual"
                      }
                    >
                      {client.clientType === "BUSINESS" ? (
                        <Building2 />
                      ) : (
                        <UserRound />
                      )}
                    </div>

                    <div>
                      <h3>{getClientDisplayName(client)}</h3>
                      <p>
                        {client.clientType === "BUSINESS"
                          ? "Business Client"
                          : "Individual ITR Client"}
                      </p>

                      <div className="client-contact-row">
                        <span>
                          <Phone size={14} />
                          {client.mobile || "-"}
                        </span>

                        <span>
                          <Mail size={14} />
                          {getClientEmail(client)}
                        </span>

                        <span>
                          <MapPin size={14} />
                          {client.address || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="client-tax-details">
                    <p>
                      <strong>PAN:</strong> {client.pan || "-"}
                    </p>
                    <p>
                      <strong>GSTIN:</strong> {getGstinValue(client)}
                    </p>

                    {client.clientType === "BUSINESS" && (
                      <p>
                        <strong>Constitution:</strong>{" "}
                        {client.constitution || "-"}
                      </p>
                    )}
                  </div>

                  <div className="client-services">
                    <span>{client.clientType}</span>

                    {client.contactPerson && (
                      <span>Contact: {client.contactPerson}</span>
                    )}

                    <div className="client-card-actions">
                      <button
                        type="button"
                        className="edit-record-btn"
                        onClick={() => handleOpenEditClient(client)}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="delete-record-btn"
                        disabled={deletingId === client._id}
                        onClick={() => handleOpenDeleteClient(client)}
                      >
                        <Trash2 size={14} />
                        {deletingId === client._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="client-status-box">
                    <span
                      className={`client-status ${getStatusClass(
                        getClientStatus(client)
                      )}`}
                    >
                      <Circle size={9} fill="currentColor" />
                      {getClientStatus(client)}
                    </span>

                    <p>{client.user?.status || "ACTIVE"}</p>
                    <small>
                      Created:{" "}
                      {client.createdAt
                        ? new Date(client.createdAt).toLocaleDateString("en-IN")
                        : "-"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showClientModal && (
          <div className="client-modal-backdrop">
            <div className="client-modal">
              <div className="client-modal-header">
                <div>
                  <h2>{editingClient ? "Edit Client" : "Add New Client"}</h2>
                  <p>
                    {editingClient
                      ? "Update client details and login access."
                      : "Admin will create client login credentials."}
                  </p>
                </div>

                <button
                  type="button"
                  className="client-modal-close"
                  onClick={handleCloseClientModal}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="client-form" onSubmit={handleSubmitClient}>
                <div className="client-form-grid">
                  <div className="client-form-group">
                    <label>Client Type</label>
                    <select
                      name="clientType"
                      value={formData.clientType}
                      onChange={handleInputChange}
                    >
                      <option value="BUSINESS">Business</option>
                      <option value="INDIVIDUAL">Individual</option>
                    </select>
                  </div>

                  {formData.clientType === "BUSINESS" ? (
                    <>
                      <div className="client-form-group">
                        <label>Business Name *</label>
                        <input
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleInputChange}
                          placeholder="Enter business name"
                        />
                      </div>

                      <div className="client-form-group">
                        <label>Contact Person</label>
                        <input
                          name="contactPerson"
                          value={formData.contactPerson}
                          onChange={handleInputChange}
                          placeholder="Enter contact person"
                        />
                      </div>

                      <div className="client-form-group">
                        <label>Constitution</label>
                        <select
                          name="constitution"
                          value={formData.constitution}
                          onChange={handleInputChange}
                        >
                          <option value="">Select constitution</option>
                          <option value="Proprietorship">Proprietorship</option>
                          <option value="Partnership">Partnership</option>
                          <option value="LLP">LLP</option>
                          <option value="Private Limited">
                            Private Limited
                          </option>
                          <option value="Public Limited">Public Limited</option>
                        </select>
                      </div>

                      <div className="client-form-group">
                        <label>GSTIN</label>
                        <input
                          name="gstin"
                          value={formData.gstin}
                          onChange={handleInputChange}
                          placeholder="Enter GSTIN"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="client-form-group">
                      <label>Individual Name *</label>
                      <input
                        name="individualName"
                        value={formData.individualName}
                        onChange={handleInputChange}
                        placeholder="Enter individual name"
                      />
                    </div>
                  )}

                  <div className="client-form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email"
                    />
                  </div>

                  <div className="client-form-group">
                    <label>
                      Password {editingClient ? "(leave blank to keep old)" : "*"}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={
                        editingClient
                          ? "Enter new password only if required"
                          : "Set client password"
                      }
                    />
                  </div>

                  <div className="client-form-group">
                    <label>PAN</label>
                    <input
                      name="pan"
                      value={formData.pan}
                      onChange={handleInputChange}
                      placeholder="Enter PAN"
                    />
                  </div>

                  <div className="client-form-group">
                    <label>Mobile</label>
                    <input
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="Enter mobile"
                    />
                  </div>

                  <div className="client-form-group">
                    <label>Portal Status</label>
                    <select
                      name="portalStatus"
                      value={formData.portalStatus}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="client-form-group">
                    <label>User Status</label>
                    <select
                      name="userStatus"
                      value={formData.userStatus}
                      onChange={handleInputChange}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  <div className="client-form-group full-width">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Enter address"
                    ></textarea>
                  </div>
                </div>

                {errorMessage && (
                  <div className="client-message error">{errorMessage}</div>
                )}

                {successMessage && (
                  <div className="client-message success">{successMessage}</div>
                )}

                <div className="client-form-actions">
                  <button
                    type="button"
                    className="client-cancel-btn"
                    onClick={handleCloseClientModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="client-save-btn"
                    disabled={saving}
                  >
                    <Save size={17} />
                    {saving
                      ? "Saving..."
                      : editingClient
                      ? "Update Client"
                      : "Create Client"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTargetClient && (
          <div className="client-delete-backdrop">
            <div className="client-delete-modal">
              <button
                type="button"
                className="client-delete-close"
                onClick={handleCloseDeleteClient}
                disabled={Boolean(deletingId)}
              >
                <X size={18} />
              </button>

              <div className="client-delete-icon">
                <Trash2 size={26} />
              </div>

              <h2>Delete Client?</h2>

              <p>
                Are you sure you want to delete{" "}
                <strong>{getClientDisplayName(deleteTargetClient)}</strong>?
              </p>

              <small>
                This action will also remove client login access and cannot be
                undone.
              </small>

              {errorMessage && (
                <div className="client-message error">{errorMessage}</div>
              )}

              <div className="client-delete-actions">
                <button
                  type="button"
                  className="client-delete-cancel"
                  onClick={handleCloseDeleteClient}
                  disabled={Boolean(deletingId)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="client-delete-confirm"
                  onClick={handleConfirmDeleteClient}
                  disabled={Boolean(deletingId)}
                >
                  <Trash2 size={15} />
                  {deletingId ? "Deleting..." : "Delete Client"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
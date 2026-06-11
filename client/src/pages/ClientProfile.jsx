import { useEffect, useState } from "react";
import {
  UserRound,
  Building2,
  Mail,
  Phone,
  MapPin,
  BadgeCheck,
  FileText,
  ShieldCheck,
  Save,
  Pencil,
  BriefcaseBusiness,
  CalendarDays,
  X,
  CheckCircle,
  RefreshCcw,
} from "lucide-react";

import ClientSidebar from "../components/ClientSidebar";

import {
  getMyClientProfile,
  updateMyClientProfile,
} from "../services/clientProfileService";

import "./ClientProfile.css";

export default function ClientProfile() {
  const [isEditing, setIsEditing] = useState(false);

  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);

  const [formData, setFormData] = useState({
    businessName: "",
    individualName: "",
    pan: "",
    gstin: "",
    constitution: "",
    contactPerson: "",
    mobile: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const mapClientToForm = (clientData) => {
    setFormData({
      businessName: clientData?.businessName || "",
      individualName: clientData?.individualName || "",
      pan: clientData?.pan || "",
      gstin: clientData?.gstin || "",
      constitution: clientData?.constitution || "",
      contactPerson: clientData?.contactPerson || "",
      mobile: clientData?.mobile || "",
      address: clientData?.address || "",
    });
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getMyClientProfile();

      if (data?.success) {
        setClient(data.client || null);
        setServices(data.services || []);
        mapClientToForm(data.client || {});
      } else {
        showError(data?.message || "Unable to fetch profile.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const clientType = client?.clientType || "INDIVIDUAL";

  const isBusiness = clientType === "BUSINESS";

  const displayName = isBusiness
    ? client?.businessName || client?.user?.name || "Business Client"
    : client?.individualName || client?.user?.name || "Individual Client";

  const displaySubtitle = isBusiness
    ? client?.constitution || "Business Client"
    : "Individual Client";

  const portalStatus = client?.portalStatus || "Active";

  const email = client?.user?.email || "-";

  const activeServicesCount = services.length;

  const handleEdit = () => {
    setIsEditing(true);
    setSuccessMessage("");
    setErrorMessage("");
    mapClientToForm(client || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSuccessMessage("");
    setErrorMessage("");
    mapClientToForm(client || {});
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = isBusiness
        ? {
            businessName: formData.businessName,
            constitution: formData.constitution,
            pan: formData.pan,
            gstin: formData.gstin,
            contactPerson: formData.contactPerson,
            mobile: formData.mobile,
            address: formData.address,
          }
        : {
            individualName: formData.individualName,
            pan: formData.pan,
            mobile: formData.mobile,
            address: formData.address,
          };

      const data = await updateMyClientProfile(payload);

      if (data?.success) {
        setClient(data.client || null);
        setServices(data.services || []);
        mapClientToForm(data.client || {});
        setIsEditing(false);
        showSuccess("Profile updated successfully.");
      } else {
        showError(data?.message || "Unable to update profile.");
      }
    } catch (error) {
      showError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="client-profile-page">
      <ClientSidebar active="profile" />

      <main className="client-profile-main">
        <header className="client-profile-header">
          <div>
            <h1>Profile</h1>
            <p>
              View and update your basic details, contact information, tax
              identification details and registered services with the CA office.
            </p>
          </div>

          <div className="client-profile-header-actions">
            <button
              type="button"
              className="client-profile-refresh-btn"
              onClick={fetchProfile}
              disabled={loading || saving}
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <div className="client-profile-badge">
              <ShieldCheck size={18} />
              {isBusiness ? "Business" : "Individual"} Client Profile
            </div>
          </div>
        </header>

        {successMessage && (
          <div className="client-profile-success-message">
            <div className="client-profile-success-icon">
              <CheckCircle size={22} />
            </div>

            <div>
              <h4>Profile Updated Successfully</h4>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="client-profile-error-message">
            <div className="client-profile-error-icon">
              <X size={22} />
            </div>

            <div>
              <h4>Action Failed</h4>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <section className="client-profile-overview">
          <div className="client-profile-card">
            <div
              className={
                isBusiness
                  ? "client-profile-avatar business"
                  : "client-profile-avatar individual"
              }
            >
              {isBusiness ? <Building2 /> : <UserRound />}
            </div>

            <div>
              <h2>{loading ? "Loading..." : displayName}</h2>

              <p>{displaySubtitle}</p>

              <span className="client-profile-status">
                <BadgeCheck size={15} />
                Portal {portalStatus}
              </span>
            </div>
          </div>

          <div className="client-profile-summary-card">
            <div className="client-profile-summary-icon blue">
              <FileText />
            </div>

            <div>
              <p>PAN Number</p>
              <h3>{formData.pan || "-"}</h3>
            </div>
          </div>

          <div className="client-profile-summary-card">
            <div className="client-profile-summary-icon green">
              <BriefcaseBusiness />
            </div>

            <div>
              <p>Active Services</p>
              <h3>{loading ? "..." : activeServicesCount}</h3>
            </div>
          </div>
        </section>

        <section className="client-profile-grid">
          <div className="client-profile-panel">
            <div className="client-profile-panel-header">
              <div>
                <h2>{isBusiness ? "Business Details" : "Individual Details"}</h2>

                <p>
                  {isBusiness
                    ? "Business registration, GST and tax identification details."
                    : "Personal tax profile and identification details."}
                </p>
              </div>

              {!isEditing ? (
                <button type="button" onClick={handleEdit} disabled={loading}>
                  <Pencil size={15} />
                  Edit
                </button>
              ) : (
                <span className="client-profile-editing-badge">
                  Editing Mode
                </span>
              )}
            </div>

            {isBusiness ? (
              <div className="client-profile-form-grid">
                <div className="client-profile-form-group">
                  <label>Business / Firm Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>

                <div className="client-profile-form-group">
                  <label>Constitution</label>
                  <select
                    name="constitution"
                    value={formData.constitution}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  >
                    <option value="">Select Constitution</option>
                    <option>Proprietorship</option>
                    <option>Partnership Firm</option>
                    <option>LLP</option>
                    <option>Private Limited Company</option>
                    <option>Public Limited Company</option>
                    <option>Trust / Society</option>
                  </select>
                </div>

                <div className="client-profile-form-group">
                  <label>PAN Number</label>
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>

                <div className="client-profile-form-group">
                  <label>GSTIN</label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>

                <div className="client-profile-form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>

                <div className="client-profile-form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>

                <div className="client-profile-form-group full-width">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>
              </div>
            ) : (
              <div className="client-profile-form-grid">
                <div className="client-profile-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="individualName"
                    value={formData.individualName}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>

                <div className="client-profile-form-group">
                  <label>PAN Number</label>
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>

                <div className="client-profile-form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>

                <div className="client-profile-form-group">
                  <label>Portal Status</label>
                  <input type="text" value={portalStatus} disabled />
                </div>

                <div className="client-profile-form-group full-width">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="client-profile-panel">
            <div className="client-profile-panel-header">
              <div>
                <h2>Contact Details</h2>
                <p>Email, mobile and address for office communication.</p>
              </div>
            </div>

            <div className="client-profile-contact-list">
              <div className="client-profile-contact-item">
                <div>
                  <Mail />
                </div>

                <section>
                  <p>Email Address</p>
                  <h4>{email}</h4>
                </section>
              </div>

              <div className="client-profile-contact-item">
                <div>
                  <Phone />
                </div>

                <section>
                  <p>Mobile Number</p>
                  <h4>{formData.mobile || "-"}</h4>
                </section>
              </div>

              <div className="client-profile-contact-item">
                <div>
                  <MapPin />
                </div>

                <section>
                  <p>Address</p>
                  <h4>{formData.address || "-"}</h4>
                </section>
              </div>

              <div className="client-profile-contact-item">
                <div>
                  <CalendarDays />
                </div>

                <section>
                  <p>Portal Status</p>
                  <h4>{portalStatus}</h4>
                </section>
              </div>
            </div>
          </div>
        </section>

        <section className="client-profile-panel">
          <div className="client-profile-panel-header">
            <div>
              <h2>Registered Services</h2>
              <p>Services currently handled by the CA office for this client.</p>
            </div>
          </div>

          <div className="client-profile-service-tags">
            {services.length === 0 ? (
              <span>No active service assigned</span>
            ) : (
              services.map((service) => (
                <span key={service._id}>
                  {service.serviceName}
                  {service.period ? ` • ${service.period}` : ""}
                </span>
              ))
            )}
          </div>
        </section>

        {isEditing && (
          <section className="client-profile-actions">
            <button
              type="button"
              className="client-profile-cancel-btn"
              onClick={handleCancel}
              disabled={saving}
            >
              <X size={17} />
              Cancel
            </button>

            <button
              type="button"
              className="client-profile-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
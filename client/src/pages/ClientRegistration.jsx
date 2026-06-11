import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  UserRound,
  FileText,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  KeyRound,
  Send,
} from "lucide-react";
import "./ClientRegistration.css";

export default function ClientRegistration() {
  const navigate = useNavigate();

  const [clientType, setClientType] = useState("Business");

  const handleSubmit = (e) => {
    e.preventDefault();

    alert(
      "Client registration submitted successfully.\nClient access will be reviewed by Admin."
    );

    navigate("/admin/clients");
  };

  return (
    <div className="client-registration-page">
      <div className="client-registration-container">
        <header className="client-registration-header">
          <div>
            <button
              className="client-back-btn"
              onClick={() => navigate("/admin/clients")}
            >
              <ArrowLeft size={17} />
              Back to Clients
            </button>

            <h1>Client Registration</h1>
            <p>
              Add a new business or individual / personal client and submit
              client access request for Admin approval.
            </p>
          </div>

          <div className="client-registration-badge">
            <BadgeCheck />
            <span>Admin / Client Entry</span>
          </div>
        </header>

        <form className="client-registration-form" onSubmit={handleSubmit}>
          <section className="client-registration-section">
            <h2>Client Basic Details</h2>

            <div className="client-form-grid">
              <div className="client-form-group">
                <label>Client Type</label>
                <div className="client-input-with-icon">
                  {clientType === "Business" ? (
                    <Building2 size={16} />
                  ) : (
                    <UserRound size={16} />
                  )}

                  <select
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value)}
                    required
                  >
                    <option value="Business">Business Client</option>
                    <option value="Individual">
                      Individual / Personal Client
                    </option>
                  </select>
                </div>
              </div>

              <div className="client-form-group">
                <label>
                  {clientType === "Business"
                    ? "Business / Firm Name"
                    : "Individual / Personal Client Name"}
                </label>

                <div className="client-input-with-icon">
                  {clientType === "Business" ? (
                    <Building2 size={16} />
                  ) : (
                    <UserRound size={16} />
                  )}

                  <input
                    type="text"
                    placeholder={
                      clientType === "Business"
                        ? "Enter business / firm name"
                        : "Enter individual / personal client name"
                    }
                    required
                  />
                </div>
              </div>

              <div className="client-form-group">
                <label>PAN Number</label>
                <input type="text" placeholder="Enter PAN number" required />
              </div>

              <div className="client-form-group">
                <label>GSTIN</label>
                <input
                  type="text"
                  placeholder={
                    clientType === "Business"
                      ? "Enter GSTIN, if applicable"
                      : "Not Applicable"
                  }
                  disabled={clientType === "Individual"}
                />
              </div>

              <div className="client-form-group">
                <label>Mobile Number</label>
                <div className="client-input-with-icon">
                  <Phone size={16} />
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    required
                  />
                </div>
              </div>

              <div className="client-form-group">
                <label>Email Address</label>
                <div className="client-input-with-icon">
                  <Mail size={16} />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="client-form-group full-width">
                <label>Address</label>
                <div className="client-input-with-icon">
                  <MapPin size={16} />
                  <input type="text" placeholder="Enter client address" />
                </div>
              </div>
            </div>
          </section>

          <section className="client-registration-section">
            <h2>Service Details</h2>

            <div className="client-form-grid">
              <div className="client-form-group">
                <label>Primary Service</label>
                <div className="client-input-with-icon">
                  <FileText size={16} />

                  <select required>
                    {clientType === "Business" ? (
                      <>
                        <option>GST Return</option>
                        <option>Income Tax Return</option>
                        <option>Tax Audit</option>
                        <option>TDS Return</option>
                        <option>Accounting</option>
                        <option>ROC Filing</option>
                        <option>Project Report</option>
                        <option>Other</option>
                      </>
                    ) : (
                      <>
                        <option>Personal Income Tax Return</option>
                        <option>Salary ITR</option>
                        <option>Capital Gain</option>
                        <option>Form 16 Review</option>
                        <option>Bank Statement Review</option>
                        <option>House Property Income</option>
                        <option>Other</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="client-form-group">
                <label>Client Status</label>
                <select defaultValue="Pending Approval" required>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Active">Active</option>
                  <option value="Pending Documents">Pending Documents</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="client-form-group full-width">
                <label>Service / Work Details</label>
                <textarea
                  rows="4"
                  placeholder={
                    clientType === "Business"
                      ? "Example: GST return filing from April 2026, tax audit work, TDS return, accounting work etc."
                      : "Example: Personal ITR for FY 2025-26, salary income, capital gain, Form 16 review etc."
                  }
                ></textarea>
              </div>
            </div>
          </section>

          <section className="client-registration-section">
            <h2>Opening Document Requirement</h2>

            <div className="client-document-box">
              <div className="client-document-icon">
                <FileText />
              </div>

              <div>
                <h3>Document checklist will be generated based on service.</h3>
                <p>
                  {clientType === "Business"
                    ? "For business clients, staff may ask for sales register, purchase register, GSTR-1, GSTR-3B, bank statement, TDS details, ledgers and audit-related records."
                    : "For individual / personal clients, staff may ask for PAN, Aadhaar, Form 16, bank statement, capital gain details, house property details and deduction proofs."}
                </p>
              </div>
            </div>
          </section>

          <section className="client-registration-section">
            <h2>Client Portal Login Access</h2>

            <div className="client-login-box">
              <div className="client-login-icon">
                <KeyRound />
              </div>

              <div>
                <h3>Login access will be activated after Admin approval.</h3>
                <p>
                  Client can login only after Admin approves the request from
                  Client Management page.
                </p>
              </div>
            </div>

            <div className="client-form-grid">
              <div className="client-form-group">
                <label>Temporary Password</label>
                <input type="text" placeholder="Example: Client@123" />
              </div>

              <div className="client-form-group">
                <label>Portal Status</label>
                <select defaultValue="Pending Approval">
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Active">Active</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>
          </section>

          <section className="client-registration-section">
            <h2>Remarks</h2>

            <div className="client-form-group">
              <label>Special Instructions</label>
              <textarea
                rows="4"
                placeholder="Enter any special instruction for this client..."
              ></textarea>
            </div>
          </section>

          <div className="client-registration-actions">
            <button
              type="button"
              className="client-cancel-btn"
              onClick={() => navigate("/admin/clients")}
            >
              Cancel
            </button>

            <button type="submit" className="client-submit-btn">
              <Send size={18} />
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  Mail,
  Phone,
  Briefcase,
  Building2,
  KeyRound,
  Send,
  BadgeCheck,
} from "lucide-react";
import "./StaffRequest.css";

export default function StaffRequest() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    alert(
      "Staff access request submitted successfully.\nRequest will be reviewed by Admin."
    );

    navigate("/admin/staff");
  };

  return (
    <div className="staff-request-page">
      <div className="staff-request-container">
        <header className="staff-request-header">
          <div>
            <button
              className="staff-back-btn"
              onClick={() => navigate("/admin/staff")}
            >
              <ArrowLeft size={17} />
              Back to Staff
            </button>

            <h1>Staff Access Request</h1>
            <p>
              Add a new staff member or article assistant and submit access
              request for Admin approval.
            </p>
          </div>

          <div className="staff-request-badge">
            <BadgeCheck />
            <span>Admin / Staff Entry</span>
          </div>
        </header>

        <form className="staff-request-form" onSubmit={handleSubmit}>
          <section className="staff-request-section">
            <h2>Staff Basic Details</h2>

            <div className="staff-form-grid">
              <div className="staff-form-group">
                <label>Full Name</label>
                <div className="staff-input-with-icon">
                  <UserRound size={16} />
                  <input type="text" placeholder="Enter staff name" required />
                </div>
              </div>

              <div className="staff-form-group">
                <label>Email Address</label>
                <div className="staff-input-with-icon">
                  <Mail size={16} />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="staff-form-group">
                <label>Mobile Number</label>
                <div className="staff-input-with-icon">
                  <Phone size={16} />
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    required
                  />
                </div>
              </div>

              <div className="staff-form-group">
                <label>Department</label>
                <div className="staff-input-with-icon">
                  <Building2 size={16} />
                  <select required>
                    <option>GST & Income Tax</option>
                    <option>Audit</option>
                    <option>Accounting</option>
                    <option>ROC & TDS</option>
                    <option>Admin & Office Work</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="staff-request-section">
            <h2>Role Details</h2>

            <div className="staff-form-grid">
              <div className="staff-form-group">
                <label>Custom Role / Designation</label>
                <div className="staff-input-with-icon">
                  <Briefcase size={16} />
                  <input
                    type="text"
                    placeholder="Example: Article Assistant, GST Staff, Audit Staff"
                    required
                  />
                </div>
              </div>

              <div className="staff-form-group">
                <label>Joining / Access Date</label>
                <input type="date" />
              </div>
            </div>
          </section>

          <section className="staff-request-section">
            <h2>Login Access</h2>

            <div className="staff-login-box">
              <div className="staff-login-icon">
                <KeyRound />
              </div>

              <div>
                <h3>Login access will be activated after Admin approval.</h3>
                <p>
                  Staff can login only after Admin approves the request from
                  Staff Monitoring page.
                </p>
              </div>
            </div>

            <div className="staff-form-grid">
              <div className="staff-form-group">
                <label>Temporary Password</label>
                <input type="text" placeholder="Example: Staff@123" />
              </div>

              <div className="staff-form-group">
                <label>Access Status</label>
                <select defaultValue="Pending Approval">
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Active">Active</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>
          </section>

          <section className="staff-request-section">
            <h2>Remarks</h2>

            <div className="staff-form-group">
              <label>Special Instructions</label>
              <textarea
                rows="4"
                placeholder="Enter any special instruction for this staff..."
              ></textarea>
            </div>
          </section>

          <div className="staff-request-actions">
            <button
              type="button"
              className="staff-cancel-btn"
              onClick={() => navigate("/admin/staff")}
            >
              Cancel
            </button>

            <button type="submit" className="staff-submit-btn">
              <Send size={18} />
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
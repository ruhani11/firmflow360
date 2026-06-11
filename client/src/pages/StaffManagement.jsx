import { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  Circle,
  Clock,
  Wifi,
  Laptop,
  ClipboardList,
  CalendarCheck,
  LogIn,
  LogOut,
  Timer,
  Plus,
  X,
  Save,
  Search,
  Mail,
  Phone,
  Pencil,
  Trash2,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";
import {
  createStaffByAdmin,
  deleteStaffByAdmin,
  getAllStaff,
  updateStaffByAdmin,
} from "../services/adminService";

import "./StaffManagement.css";

export default function StaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deleteTargetStaff, setDeleteTargetStaff] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    designation: "",
    department: "",
    joiningDate: "",
    status: "Active",
    userStatus: "ACTIVE",
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getAllStaff();

      if (data?.success) {
        setStaffList(data.staff || []);
      } else {
        setErrorMessage(data?.message || "Unable to fetch staff.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to fetch staff."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaff();
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
      name: "",
      email: "",
      password: "",
      mobile: "",
      designation: "",
      department: "",
      joiningDate: "",
      status: "Active",
      userStatus: "ACTIVE",
    });
  };

  const getStaffName = (staff) => {
    return staff.user?.name || "Staff Member";
  };

  const getStaffEmail = (staff) => {
    return staff.user?.email || "-";
  };

  const getStaffStatus = (staff) => {
    const value = String(staff.onlineStatus || "Offline").toLowerCase();

    if (value === "online") return "Online";
    if (value === "idle") return "Idle";
    if (value === "busy") return "Online";

    return "Offline";
  };

  const getAttendanceStatus = (staff) => {
    const status = getStaffStatus(staff);

    if (status === "Online" || status === "Idle") {
      return "Present";
    }

    return "Offline";
  };

  const getLoginTime = (staff) => {
    if (!staff.lastLoginAt) return "-";

    return new Date(staff.lastLoginAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLogoutTime = (staff) => {
    const status = getStaffStatus(staff);

    if (status === "Online" || status === "Idle") {
      return null;
    }

    if (!staff.lastLogoutAt) return "-";

    return new Date(staff.lastLogoutAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLastActivity = (staff) => {
    const status = getStaffStatus(staff);

    if (status === "Online") {
      return "Active now";
    }

    if (!staff.lastActiveAt) {
      return status === "Idle" ? "Idle" : "No recent activity";
    }

    const lastActive = new Date(staff.lastActiveAt);
    const now = new Date();
    const diffMs = now - lastActive;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (status === "Idle") {
      if (diffMinutes < 1) return "Idle now";
      if (diffMinutes < 60) return `Idle for ${diffMinutes} min`;

      const diffHours = Math.floor(diffMinutes / 60);
      return `Idle for ${diffHours} hour(s)`;
    }

    if (diffMinutes < 1) return "Last active just now";
    if (diffMinutes < 60) return `Last active ${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) return `Last active ${diffHours} hour(s) ago`;

    return `Last active ${lastActive.toLocaleDateString("en-IN")}`;
  };

  const getCurrentActivity = (staff) => {
    if (staff.currentPage) return staff.currentPage;
    return "No active page";
  };

  const getStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (value === "online") return "online";
    if (value === "idle") return "idle";

    return "offline";
  };

  const getTotalHoursText = (staff) => {
    const status = getStaffStatus(staff);

    if (status === "Online" || status === "Idle") {
      return "Working";
    }

    return "-";
  };

  const handleOpenAddStaff = () => {
    resetForm();
    setEditingStaff(null);
    setShowStaffModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleOpenEditStaff = (staff) => {
    setEditingStaff(staff);

    setFormData({
      name: staff.user?.name || "",
      email: staff.user?.email || "",
      password: "",
      mobile: staff.mobile || "",
      designation: staff.designation || "",
      department: staff.department || "",
      joiningDate: staff.joiningDate
        ? String(staff.joiningDate).slice(0, 10)
        : "",
      status: staff.status || "Active",
      userStatus: staff.user?.status || "ACTIVE",
    });

    setShowStaffModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseStaffModal = () => {
    setShowStaffModal(false);
    setEditingStaff(null);
    resetForm();
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };

  const buildPayload = () => {
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      mobile: formData.mobile.trim(),
      designation: formData.designation.trim(),
      department: formData.department.trim(),
      joiningDate: formData.joiningDate,
      status: formData.status,
      userStatus: formData.userStatus,
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    return payload;
  };

  const validatePayload = (payload) => {
    if (!payload.name || !payload.email) {
      return "Name and email are required.";
    }

    if (!editingStaff && !formData.password.trim()) {
      return "Password is required while creating new staff.";
    }

    return "";
  };

  const handleSubmitStaff = async (event) => {
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

      if (editingStaff) {
        data = await updateStaffByAdmin(editingStaff._id, payload);
      } else {
        data = await createStaffByAdmin({
          ...payload,
          password: formData.password.trim(),
        });
      }

      if (data?.success) {
        const message = editingStaff
          ? "Staff updated successfully."
          : "Staff created successfully.";

        await fetchStaff();

        setShowStaffModal(false);
        setEditingStaff(null);
        resetForm();
        setSuccessMessage(message);
        setErrorMessage("");
      } else {
        setErrorMessage(data?.message || "Unable to save staff.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to save staff."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteStaff = (staff) => {
    setDeleteTargetStaff(staff);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseDeleteStaff = () => {
    if (deletingId) return;
    setDeleteTargetStaff(null);
    setErrorMessage("");
  };

  const handleConfirmDeleteStaff = async () => {
    if (!deleteTargetStaff?._id) return;

    try {
      setDeletingId(deleteTargetStaff._id);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await deleteStaffByAdmin(deleteTargetStaff._id);

      if (data?.success) {
        setDeleteTargetStaff(null);
        setSuccessMessage("Staff deleted successfully.");
        await fetchStaff();
      } else {
        setErrorMessage(data?.message || "Unable to delete staff.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete staff."
      );
    } finally {
      setDeletingId("");
    }
  };

  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return staffList;

    return staffList.filter((staff) => {
      const name = getStaffName(staff).toLowerCase();
      const email = getStaffEmail(staff).toLowerCase();
      const mobile = String(staff.mobile || "").toLowerCase();
      const designation = String(staff.designation || "").toLowerCase();
      const department = String(staff.department || "").toLowerCase();

      return (
        name.includes(term) ||
        email.includes(term) ||
        mobile.includes(term) ||
        designation.includes(term) ||
        department.includes(term)
      );
    });
  }, [staffList, searchTerm]);

  const onlineStaff = staffList.filter(
    (staff) => getStaffStatus(staff) === "Online"
  ).length;

  const idleStaff = staffList.filter(
    (staff) => getStaffStatus(staff) === "Idle"
  ).length;

  const offlineStaff = staffList.filter(
    (staff) => getStaffStatus(staff) === "Offline"
  ).length;

  const presentToday = staffList.filter(
    (staff) => getAttendanceStatus(staff) === "Present"
  ).length;

  return (
    <div className="staff-management-page">
      <AdminSidebar active="staff" />

      <main className="staff-management-main">
        <header className="staff-management-header">
          <div>
            <h1>Staff Monitoring</h1>
            <p>
              Track staff online, idle and offline status with login, logout and
              current activity.
            </p>
          </div>

          <button
            type="button"
            className="add-staff-btn"
            onClick={handleOpenAddStaff}
          >
            <Plus size={18} />
            Add Staff
          </button>
        </header>

        <section className="staff-monitor-stats">
          <div className="monitor-card">
            <div className="monitor-icon green">
              <Wifi />
            </div>
            <div>
              <p>Online Staff</p>
              <h3>{onlineStaff}</h3>
            </div>
          </div>

          <div className="monitor-card">
            <div className="monitor-icon orange">
              <Clock />
            </div>
            <div>
              <p>Idle Staff</p>
              <h3>{idleStaff}</h3>
            </div>
          </div>

          <div className="monitor-card">
            <div className="monitor-icon red">
              <LogOut />
            </div>
            <div>
              <p>Offline Staff</p>
              <h3>{offlineStaff}</h3>
            </div>
          </div>

          <div className="monitor-card">
            <div className="monitor-icon purple">
              <CalendarCheck />
            </div>
            <div>
              <p>Present Today</p>
              <h3>{presentToday}</h3>
            </div>
          </div>
        </section>

        <section className="staff-live-panel">
          <div className="staff-live-header">
            <div>
              <h2>Live Staff Activity</h2>
              <p>
                Online means working, Idle means inactive, Offline means logged
                out.
              </p>
            </div>

            <div className="staff-search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {errorMessage && !showStaffModal && !deleteTargetStaff && (
            <div className="staff-message error">{errorMessage}</div>
          )}

          {successMessage && !showStaffModal && !deleteTargetStaff && (
            <div className="staff-message success">{successMessage}</div>
          )}

          {loading ? (
            <div className="staff-empty-state">Loading staff...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="staff-empty-state">
              {searchTerm ? "No matching staff found." : "No staff found."}
            </div>
          ) : (
            <div className="staff-live-list">
              {filteredStaff.map((staff) => {
                const staffStatus = getStaffStatus(staff);
                const logoutTime = getLogoutTime(staff);

                return (
                  <div className="staff-live-card" key={staff._id}>
                    <div className="staff-live-left">
                      <div className="staff-user-icon">
                        <UserRound />
                      </div>

                      <div>
                        <h3>{getStaffName(staff)}</h3>
                        <p>
                          {staff.designation || "Staff"} •{" "}
                          {staff.department || "Department not set"}
                        </p>

                        <div className="staff-current-task">
                          <ClipboardList size={15} />
                          <span>{getCurrentActivity(staff)}</span>
                        </div>

                        <div className="staff-contact-line">
                          <span>
                            <Mail size={13} />
                            {getStaffEmail(staff)}
                          </span>

                          <span>
                            <Phone size={13} />
                            {staff.mobile || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="staff-live-status">
                      <span
                        className={`live-status ${getStatusClass(staffStatus)}`}
                      >
                        <Circle size={9} fill="currentColor" />
                        {staffStatus}
                      </span>
                      <small>{getLastActivity(staff)}</small>
                    </div>

                    <div className="staff-live-details">
                      <p>
                        <strong>Attendance:</strong>{" "}
                        {getAttendanceStatus(staff)}
                      </p>

                      <p>
                        <LogIn size={14} />
                        <strong>Login:</strong> {getLoginTime(staff)}
                      </p>

                      {logoutTime && (
                        <p>
                          <LogOut size={14} />
                          <strong>Logout:</strong> {logoutTime}
                        </p>
                      )}

                      <p>
                        <Timer size={14} />
                        <strong>Total Hours:</strong> {getTotalHoursText(staff)}
                      </p>
                    </div>

                    <div className="staff-live-device">
                      <p>
                        <strong>Status:</strong> {staff.status || "Active"}
                      </p>

                      <p>
                        <Laptop size={14} />
                        {getCurrentActivity(staff)}
                      </p>

                      <div className="staff-card-actions">
                        <button
                          type="button"
                          className="edit-record-btn"
                          onClick={() => handleOpenEditStaff(staff)}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-record-btn"
                          disabled={deletingId === staff._id}
                          onClick={() => handleOpenDeleteStaff(staff)}
                        >
                          <Trash2 size={14} />
                          {deletingId === staff._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {showStaffModal && (
          <div className="staff-modal-backdrop">
            <div className="staff-modal">
              <div className="staff-modal-header">
                <div>
                  <h2>{editingStaff ? "Edit Staff" : "Add New Staff"}</h2>
                  <p>
                    {editingStaff
                      ? "Update staff details and login access."
                      : "Admin will create staff login credentials."}
                  </p>
                </div>

                <button
                  type="button"
                  className="staff-modal-close"
                  onClick={handleCloseStaffModal}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="staff-form" onSubmit={handleSubmitStaff}>
                <div className="staff-form-grid">
                  <div className="staff-form-group">
                    <label>Staff Name *</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter staff name"
                    />
                  </div>

                  <div className="staff-form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter staff email"
                    />
                  </div>

                  <div className="staff-form-group">
                    <label>
                      Password {editingStaff ? "(leave blank to keep old)" : "*"}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={
                        editingStaff
                          ? "Enter new password only if required"
                          : "Set staff password"
                      }
                    />
                  </div>

                  <div className="staff-form-group">
                    <label>Mobile</label>
                    <input
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="Enter mobile number"
                    />
                  </div>

                  <div className="staff-form-group">
                    <label>Designation</label>
                    <input
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      placeholder="Article Assistant / Senior Staff"
                    />
                  </div>

                  <div className="staff-form-group">
                    <label>Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                    >
                      <option value="">Select department</option>
                      <option value="GST">GST</option>
                      <option value="Income Tax">Income Tax</option>
                      <option value="Audit">Audit</option>
                      <option value="Accounting">Accounting</option>
                      <option value="ROC">ROC</option>
                      <option value="TDS">TDS</option>
                    </select>
                  </div>

                  <div className="staff-form-group">
                    <label>Joining Date</label>
                    <input
                      type="date"
                      name="joiningDate"
                      value={formData.joiningDate}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="staff-form-group">
                    <label>Staff Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="staff-form-group">
                    <label>User Login Status</label>
                    <select
                      name="userStatus"
                      value={formData.userStatus}
                      onChange={handleInputChange}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                {errorMessage && (
                  <div className="staff-message error">{errorMessage}</div>
                )}

                {successMessage && (
                  <div className="staff-message success">{successMessage}</div>
                )}

                <div className="staff-form-actions">
                  <button
                    type="button"
                    className="staff-cancel-btn"
                    onClick={handleCloseStaffModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="staff-save-btn"
                    disabled={saving}
                  >
                    <Save size={17} />
                    {saving
                      ? "Saving..."
                      : editingStaff
                      ? "Update Staff"
                      : "Create Staff"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTargetStaff && (
          <div className="staff-delete-backdrop">
            <div className="staff-delete-modal">
              <button
                type="button"
                className="staff-delete-close"
                onClick={handleCloseDeleteStaff}
                disabled={Boolean(deletingId)}
              >
                <X size={18} />
              </button>

              <div className="staff-delete-icon">
                <Trash2 size={26} />
              </div>

              <h2>Delete Staff?</h2>

              <p>
                Are you sure you want to delete{" "}
                <strong>{getStaffName(deleteTargetStaff)}</strong>?
              </p>

              <small>
                This action will also remove staff login access and cannot be
                undone.
              </small>

              {errorMessage && (
                <div className="staff-message error">{errorMessage}</div>
              )}

              <div className="staff-delete-actions">
                <button
                  type="button"
                  className="staff-delete-cancel"
                  onClick={handleCloseDeleteStaff}
                  disabled={Boolean(deletingId)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="staff-delete-confirm"
                  onClick={handleConfirmDeleteStaff}
                  disabled={Boolean(deletingId)}
                >
                  <Trash2 size={15} />
                  {deletingId ? "Deleting..." : "Delete Staff"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
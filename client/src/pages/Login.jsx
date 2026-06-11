import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  BriefcaseBusiness,
  ChevronDown,
} from "lucide-react";

import axiosInstance from "../api/axiosInstance";
import {
  getDashboardPathByRole,
  getUser,
  isLoggedIn,
  saveAuthData,
} from "../utils/authUtils";

import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("ADMIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [openDropdown, setOpenDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const roles = [
    {
      value: "ADMIN",
      label: "Admin / CA",
    },
    {
      value: "STAFF",
      label: "Existing Staff / Article",
    },
    {
      value: "CLIENT",
      label: "Existing Client",
    },
  ];

  const selectedRole = roles.find((item) => item.value === role);

  useEffect(() => {
    if (isLoggedIn()) {
      const user = getUser();
      navigate(getDashboardPathByRole(user?.role), { replace: true });
    }
  }, [navigate]);

  const handleRoleSelect = (item) => {
    setRole(item.value);
    setOpenDropdown(false);
    setErrorMessage("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!role) {
      setErrorMessage("Please select your role.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.post("/auth/login", {
        email: email.trim(),
        password: password.trim(),
        role,
      });

      const data = response.data;

      if (!data?.success) {
        setErrorMessage(data?.message || "Login failed.");
        return;
      }

      const token = data.token || data.accessToken;
      const user = data.user || data.loggedInUser || data.data?.user;

      if (!token || !user) {
        setErrorMessage("Login response is incomplete. Token or user missing.");
        return;
      }

      const backendRole = String(user.role || "").toUpperCase();

      if (backendRole !== role) {
        setErrorMessage(
          "Selected role does not match this account. Please select the correct role."
        );
        return;
      }

      saveAuthData(token, user);

      navigate(getDashboardPathByRole(backendRole), { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to login. Please check backend server.";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div>
            <h1>FirmFlow 360</h1>
            <p>Client–Staff–Admin Ecosystem for CA Offices</p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <ShieldCheck />
              <span>Secure CA Office Workflow</span>
            </div>

            <div className="feature-item">
              <Users />
              <span>Client, Staff & Admin Collaboration</span>
            </div>

            <div className="feature-item">
              <BriefcaseBusiness />
              <span>AI Document Check Engine</span>
            </div>
          </div>

          <p className="capstone-text">
            Developed for AICA Level 2 Capstone Project
          </p>
        </div>

        <div className="login-right">
          <h2>Login</h2>
          <p className="subtitle">Select your role and enter credentials</p>

          <form onSubmit={handleLogin}>
            <label>Select Role</label>

            <div className="custom-dropdown">
              <button
                type="button"
                className="dropdown-selected"
                onClick={() => setOpenDropdown(!openDropdown)}
                disabled={loading}
              >
                <span>{selectedRole?.label}</span>
                <ChevronDown size={18} />
              </button>

              {openDropdown && (
                <div className="dropdown-menu">
                  {roles.map((item) => (
                    <div
                      key={item.value}
                      className={`dropdown-item ${
                        role === item.value ? "active" : ""
                      }`}
                      onClick={() => handleRoleSelect(item)}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            {errorMessage && <div className="login-error">{errorMessage}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Please wait..." : "Login to Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
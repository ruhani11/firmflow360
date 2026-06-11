import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  deleteNotification,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService";

import { getUserRole } from "../utils/authUtils";
import "./NotificationBell.css";

export default function NotificationBell() {
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const data = await getMyNotifications();

      if (data?.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Notification fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        const clickedBell = event.target.closest(".notification-icon-button");

        if (!clickedBell) {
          setOpen(false);
        }
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const getTypeClass = (type) => {
    const value = String(type || "").toLowerCase();

    if (value === "success") return "success";
    if (value === "warning") return "warning";
    if (value === "error") return "error";

    return "info";
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSafeNavigationPath = (notification) => {
    const role = getUserRole();
    const moduleName = String(notification?.module || "").toUpperCase();

    if (moduleName === "DOCUMENT") {
      if (role === "STAFF") return "/staff/documents";
      if (role === "CLIENT") return "/client/documents";
      return "/admin/document-check";
    }

    if (moduleName === "CLIENT_FILE") {
      if (role === "STAFF") return "/staff/client-files";
      if (role === "CLIENT") return "/client/files";
      return "/admin/client-files";
    }

    if (moduleName === "CLIENT_QUERY") {
      if (role === "STAFF") return "/staff/queries";
      if (role === "CLIENT") return "/client/queries";
      return "/admin/queries";
    }

    if (moduleName === "INTERNAL_QUERY") {
      if (role === "STAFF") return "/staff/queries";
      return "/admin/queries";
    }

    if (moduleName === "ASSIGNMENT") {
      if (role === "STAFF") return "/staff/assignments";
      if (role === "CLIENT") return "/client/services";
      return "/admin/assignments";
    }

    if (role === "ADMIN") return "/admin-dashboard";
    if (role === "STAFF") return "/staff-dashboard";
    if (role === "CLIENT") return "/client-dashboard";

    return "/";
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification._id);
      }

      await fetchNotifications();
      setOpen(false);

      navigate(getSafeNavigationPath(notification));
    } catch (error) {
      console.error("Notification click error:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error("Mark all read error:", error);
    }
  };

  const handleDelete = async (event, id) => {
    event.stopPropagation();

    try {
      await deleteNotification(id);
      await fetchNotifications();
    } catch (error) {
      console.error("Delete notification error:", error);
    }
  };

  return (
    <>
      <button
        type="button"
        className="notification-icon-button"
        onClick={() => setOpen((prev) => !prev)}
        title="Notifications"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="notification-count-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && <div className="notification-backdrop" />}

      <aside
        ref={drawerRef}
        className={`notification-side-drawer ${open ? "open" : ""}`}
      >
        <div className="notification-drawer-header">
          <div>
            <h3>Notifications</h3>
            <p>{unreadCount} unread notification(s)</p>
          </div>

          <button
            type="button"
            className="notification-drawer-close"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="notification-drawer-actions">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>

        <div className="notification-drawer-list">
          {loading && notifications.length === 0 ? (
            <div className="notification-empty-state">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty-state">
              No notifications found.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-card ${
                  !notification.isRead ? "unread" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-card-top">
                  <span
                    className={`notification-label ${getTypeClass(
                      notification.type
                    )}`}
                  >
                    {notification.type || "Info"}
                  </span>

                  <button
                    type="button"
                    className="notification-card-delete"
                    onClick={(event) =>
                      handleDelete(event, notification._id)
                    }
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h4>{notification.title}</h4>
                <p>{notification.message}</p>

                <div className="notification-card-footer">
                  <span>{notification.module}</span>
                  <span>{formatDateTime(notification.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
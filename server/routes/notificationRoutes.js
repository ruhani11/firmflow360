const express = require("express");

const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteMyNotification,
  getAllNotificationsForAdmin,
} = require("../controllers/notificationController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

// My notifications
router.get("/my", getMyNotifications);

// My unread count
router.get("/unread-count", getUnreadNotificationCount);

// Admin can view all notifications
router.get(
  "/admin/all",
  allowRoles("ADMIN"),
  getAllNotificationsForAdmin
);

// Mark all notifications as read
// Keep this BEFORE "/:id/read"
router.patch("/mark-all/read", markAllNotificationsAsRead);

// Mark single notification as read
router.patch("/:id/read", markNotificationAsRead);

// Delete single notification
router.delete("/:id", deleteMyNotification);

module.exports = router;
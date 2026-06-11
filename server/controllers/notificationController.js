const mongoose = require("mongoose");

const Notification = require("../models/Notification");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const populateNotification = (query) => {
  return query
    .populate("recipientUser", "name email role status")
    .populate("actorUser", "name email role status")
    .populate({
      path: "client",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate({
      path: "staff",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate("assignment", "serviceName period status priority dueDate");
};

const getMyNotifications = async (req, res) => {
  try {
    const { isRead, module, limit } = req.query;

    const filter = {
      recipientUser: req.user.id,
    };

    if (isRead === "true") filter.isRead = true;
    if (isRead === "false") filter.isRead = false;
    if (module) filter.module = module;

    const notifications = await populateNotification(
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 100)
    );

    const unreadCount = await Notification.countDocuments({
      recipientUser: req.user.id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Get My Notifications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching notifications.",
    });
  }
};

const getUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipientUser: req.user.id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Get Unread Notification Count Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching unread count.",
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipientUser: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();

    await notification.save();

    const updatedNotification = await populateNotification(
      Notification.findById(notification._id)
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while marking notification as read.",
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        recipientUser: req.user.id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark All Notifications Read Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while marking all notifications as read.",
    });
  }
};

const deleteMyNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipientUser: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    await notification.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Notification Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting notification.",
    });
  }
};

const getAllNotificationsForAdmin = async (req, res) => {
  try {
    const { recipientRole, actorRole, module, isRead, limit } = req.query;

    const filter = {};

    if (recipientRole) filter.recipientRole = recipientRole;
    if (actorRole) filter.actorRole = actorRole;
    if (module) filter.module = module;
    if (isRead === "true") filter.isRead = true;
    if (isRead === "false") filter.isRead = false;

    const notifications = await populateNotification(
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 200)
    );

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Get Admin Notifications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching all notifications.",
    });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteMyNotification,
  getAllNotificationsForAdmin,
};
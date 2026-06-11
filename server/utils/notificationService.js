const Notification = require("../models/Notification");

const createNotification = async ({
  recipientUser,
  recipientRole,
  actorUser = null,
  actorRole = "SYSTEM",
  title,
  message,
  module,
  type = "Info",
  entityType = "",
  entityId = null,
  client = null,
  staff = null,
  assignment = null,
  link = "",
  metadata = {},
}) => {
  try {
    if (!recipientUser || !recipientRole || !title || !message || !module) {
      return null;
    }

    const notification = await Notification.create({
      recipientUser,
      recipientRole,
      actorUser,
      actorRole,
      title,
      message,
      module,
      type,
      entityType,
      entityId,
      client,
      staff,
      assignment,
      link,
      metadata,
    });

    return notification;
  } catch (error) {
    console.error("Create Notification Error:", error.message);
    return null;
  }
};

const createManyNotifications = async (notifications = []) => {
  try {
    const validNotifications = notifications.filter(
      (item) =>
        item.recipientUser &&
        item.recipientRole &&
        item.title &&
        item.message &&
        item.module
    );

    if (validNotifications.length === 0) {
      return [];
    }

    const createdNotifications = await Notification.insertMany(
      validNotifications,
      { ordered: false }
    );

    return createdNotifications;
  } catch (error) {
    console.error("Create Many Notifications Error:", error.message);
    return [];
  }
};

module.exports = {
  createNotification,
  createManyNotifications,
};
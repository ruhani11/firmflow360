const ActivityLog = require("../models/ActivityLog");

const recordActivity = async ({
  req,
  actorUser = null,
  actorRole = null,
  action,
  module,
  entityType,
  entityId = null,
  client = null,
  staff = null,
  assignment = null,
  title,
  description = "",
  metadata = {},
}) => {
  try {
    await ActivityLog.create({
      actorUser: actorUser || req?.user?.id || null,
      actorRole: actorRole || req?.user?.role || "SYSTEM",
      action,
      module,
      entityType,
      entityId,
      client,
      staff,
      assignment,
      title,
      description,
      metadata,
      ipAddress:
        req?.headers?.["x-forwarded-for"] ||
        req?.socket?.remoteAddress ||
        req?.ip ||
        "",
      userAgent: req?.headers?.["user-agent"] || "",
    });
  } catch (error) {
    console.error("Activity Log Error:", error.message);
  }
};

module.exports = recordActivity;
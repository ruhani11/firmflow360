const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    actorRole: {
      type: String,
      enum: ["ADMIN", "STAFF", "CLIENT", "SYSTEM"],
      default: "SYSTEM",
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    module: {
      type: String,
      required: true,
      enum: [
        "AUTH",
        "ADMIN",
        "ASSIGNMENT",
        "DOCUMENT",
        "CLIENT_FILE",
        "CLIENT_QUERY",
        "INTERNAL_QUERY",
        "DOWNLOAD",
        "DASHBOARD",
        "SYSTEM",
      ],
    },

    entityType: {
      type: String,
      trim: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    metadata: {
      type: Object,
      default: {},
    },

    ipAddress: {
      type: String,
      trim: true,
    },

    userAgent: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
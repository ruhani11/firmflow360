const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipientRole: {
      type: String,
      enum: ["ADMIN", "STAFF", "CLIENT"],
      required: true,
    },

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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    module: {
      type: String,
      enum: [
        "AUTH",
        "ASSIGNMENT",
        "DOCUMENT",
        "CLIENT_FILE",
        "CLIENT_QUERY",
        "INTERNAL_QUERY",
        "DOWNLOAD",
        "ACTIVITY",
        "SYSTEM",
      ],
      required: true,
    },

    type: {
      type: String,
      enum: ["Info", "Success", "Warning", "Error"],
      default: "Info",
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

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },

    link: {
      type: String,
      trim: true,
      default: "",
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
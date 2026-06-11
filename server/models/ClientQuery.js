const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },

    senderUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    senderRole: {
      type: String,
      enum: ["ADMIN", "STAFF", "CLIENT"],
      required: true,
    },
  },
  { timestamps: true }
);

const clientQuerySchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      default: null,
    },

    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "General",
        "Document",
        "GST",
        "Income Tax",
        "TDS",
        "Audit",
        "Billing",
        "Other",
      ],
      default: "General",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: [
        "Open",
        "In Progress",
        "Waiting for Client",
        "Resolved",
        "Closed",
      ],
      default: "Open",
    },

    createdByRole: {
      type: String,
      enum: ["ADMIN", "STAFF", "CLIENT"],
      required: true,
    },

    replies: [replySchema],

    lastReplyAt: {
      type: Date,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientQuery", clientQuerySchema);
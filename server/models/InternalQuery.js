const mongoose = require("mongoose");

const internalReplySchema = new mongoose.Schema(
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
      enum: ["ADMIN", "STAFF"],
      required: true,
    },
  },
  { timestamps: true }
);

const internalQuerySchema = new mongoose.Schema(
  {
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

    raisedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    raisedByRole: {
      type: String,
      enum: ["ADMIN", "STAFF"],
      required: true,
    },

    assignedToStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    relatedClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    relatedAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      default: null,
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
        "Client Follow-up",
        "Review",
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
      enum: ["Open", "In Progress", "Waiting", "Resolved", "Closed"],
      default: "Open",
    },

    replies: [internalReplySchema],

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

module.exports = mongoose.model("InternalQuery", internalQuerySchema);
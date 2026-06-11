const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
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

    serviceName: {
      type: String,
      trim: true,
    },

    period: {
      type: String,
      trim: true,
    },

    documentType: {
      type: String,
      required: [true, "Document type is required"],
      trim: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      trim: true,
    },

    filePath: {
      type: String,
      required: true,
      trim: true,
    },

    fileMimeType: {
      type: String,
      trim: true,
    },

    fileSize: {
      type: Number,
    },

    uploadedBy: {
      type: String,
      enum: ["Client", "Office Staff", "Admin"],
      required: true,
    },

    uploadSource: {
      type: String,
      enum: ["Client Portal", "WhatsApp", "Email", "Offline", "Other"],
      default: "Client Portal",
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Uploaded",
        "Under Review",
        "Approved",
        "Wrong Document",
        "Rejected",
      ],
      default: "Under Review",
    },

    remarks: {
      type: String,
      trim: true,
    },

    adminRemark: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
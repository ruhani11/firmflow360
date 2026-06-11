const mongoose = require("mongoose");

const clientFileSchema = new mongoose.Schema(
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

    uploadedByStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    fileTitle: {
      type: String,
      required: [true, "File title is required"],
      trim: true,
    },

    fileCategory: {
      type: String,
      required: [true, "File category is required"],
      trim: true,
    },

    serviceName: {
      type: String,
      trim: true,
    },

    period: {
      type: String,
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
      enum: ["Office Staff", "Admin"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "Pending Admin Approval",
        "Correction Required",
        "Approved",
        "Shared with Client",
        "Archived",
      ],
      default: "Pending Admin Approval",
    },

    remarks: {
      type: String,
      trim: true,
    },

    adminRemark: {
      type: String,
      trim: true,
    },

    sharedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientFile", clientFileSchema);
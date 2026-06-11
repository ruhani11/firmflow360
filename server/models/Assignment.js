const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    serviceName: {
      type: String,
      required: true,
      trim: true,
    },

    period: {
      type: String,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: [
        "Not Started",
        "In Progress",
        "Pending Documents",
        "Submitted for Review",
        "Correction Required",
        "Approved",
        "Completed",
      ],
      default: "Not Started",
    },

    dueDate: {
      type: String,
      trim: true,
    },

    completionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    requiredDocuments: [
      {
        type: String,
        trim: true,
      },
    ],

    instructions: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
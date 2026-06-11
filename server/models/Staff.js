const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    designation: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    joiningDate: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "On Leave"],
      default: "Active",
    },

    onlineStatus: {
      type: String,
      enum: ["Online", "Idle", "Offline"],
      default: "Offline",
    },

    lastActiveAt: {
      type: Date,
      default: null,
    },

    currentPage: {
      type: String,
      trim: true,
      default: "",
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLogoutAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
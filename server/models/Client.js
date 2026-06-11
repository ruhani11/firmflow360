const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    clientType: {
      type: String,
      enum: ["BUSINESS", "INDIVIDUAL"],
      required: true,
    },

    businessName: {
      type: String,
      trim: true,
    },

    individualName: {
      type: String,
      trim: true,
    },

    pan: {
      type: String,
      trim: true,
      uppercase: true,
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },

    constitution: {
      type: String,
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    portalStatus: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
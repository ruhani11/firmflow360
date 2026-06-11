const Client = require("../models/Client");
const Assignment = require("../models/Assignment");

const getMyClientProfile = async (req, res) => {
  try {
    const client = await Client.findOne({ user: req.user.id }).populate(
      "user",
      "name email role status"
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const services = await Assignment.find({ client: client._id })
      .select("serviceName period status dueDate completionPercent")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      client,
      services,
    });
  } catch (error) {
    console.error("Get Client Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching client profile.",
    });
  }
};

const updateMyClientProfile = async (req, res) => {
  try {
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const allowedFields = [
      "businessName",
      "individualName",
      "pan",
      "gstin",
      "constitution",
      "contactPerson",
      "mobile",
      "address",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        client[field] =
          typeof req.body[field] === "string"
            ? req.body[field].trim()
            : req.body[field];
      }
    });

    await client.save();

    const updatedClient = await Client.findById(client._id).populate(
      "user",
      "name email role status"
    );

    const services = await Assignment.find({ client: client._id })
      .select("serviceName period status dueDate completionPercent")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      client: updatedClient,
      services,
    });
  } catch (error) {
    console.error("Update Client Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while updating profile.",
    });
  }
};

module.exports = {
  getMyClientProfile,
  updateMyClientProfile,
};
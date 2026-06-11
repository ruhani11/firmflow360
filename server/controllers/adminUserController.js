const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Staff = require("../models/Staff");
const Client = require("../models/Client");

const normalizeEmail = (email) => {
  return String(email || "").toLowerCase().trim();
};

/* =========================
   CREATE STAFF BY ADMIN
========================= */

const createStaffByAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      mobile,
      designation,
      department,
      joiningDate,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const finalEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: finalEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Staff or client already exists with this email.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: finalEmail,
      password: hashedPassword,
      role: "STAFF",
      status: "ACTIVE",
    });

    const staff = await Staff.create({
      user: user._id,
      mobile: mobile?.trim(),
      designation: designation?.trim(),
      department: department?.trim(),
      joiningDate,
      status: "Active",
      onlineStatus: "Offline",
    });

    const createdStaff = await Staff.findById(staff._id).populate(
      "user",
      "name email role status"
    );

    return res.status(201).json({
      success: true,
      message: "Staff created successfully by Admin.",
      staff: createdStaff,
    });
  } catch (error) {
    console.error("Create Staff Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating staff.",
    });
  }
};

/* =========================
   CREATE CLIENT BY ADMIN
========================= */

const createClientByAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      clientType,
      businessName,
      individualName,
      pan,
      gstin,
      constitution,
      contactPerson,
      mobile,
      address,
    } = req.body;

    if (!email || !password || !clientType) {
      return res.status(400).json({
        success: false,
        message: "Email, password and client type are required.",
      });
    }

    if (!["BUSINESS", "INDIVIDUAL"].includes(clientType)) {
      return res.status(400).json({
        success: false,
        message: "Client type must be BUSINESS or INDIVIDUAL.",
      });
    }

    if (clientType === "BUSINESS" && !businessName) {
      return res.status(400).json({
        success: false,
        message: "Business name is required for business client.",
      });
    }

    if (clientType === "INDIVIDUAL" && !individualName) {
      return res.status(400).json({
        success: false,
        message: "Individual name is required for individual client.",
      });
    }

    const finalName =
      clientType === "BUSINESS"
        ? businessName.trim()
        : individualName.trim();

    const finalEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: finalEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Staff or client already exists with this email.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name?.trim() || finalName,
      email: finalEmail,
      password: hashedPassword,
      role: "CLIENT",
      status: "ACTIVE",
    });

    const client = await Client.create({
      user: user._id,
      clientType,
      businessName: clientType === "BUSINESS" ? businessName.trim() : undefined,
      individualName:
        clientType === "INDIVIDUAL" ? individualName.trim() : undefined,
      pan: pan?.trim(),
      gstin: clientType === "BUSINESS" ? gstin?.trim() : undefined,
      constitution:
        clientType === "BUSINESS" ? constitution?.trim() : undefined,
      contactPerson:
        clientType === "BUSINESS" ? contactPerson?.trim() : undefined,
      mobile: mobile?.trim(),
      address: address?.trim(),
      portalStatus: "Active",
    });

    const createdClient = await Client.findById(client._id).populate(
      "user",
      "name email role status"
    );

    return res.status(201).json({
      success: true,
      message: "Client created successfully by Admin.",
      client: createdClient,
    });
  } catch (error) {
    console.error("Create Client Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating client.",
    });
  }
};

/* =========================
   GET ALL USERS
========================= */

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching users.",
    });
  }
};

/* =========================
   GET ALL STAFF
========================= */

const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find()
      .populate("user", "name email role status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: staff.length,
      staff,
    });
  } catch (error) {
    console.error("Get Staff Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff.",
    });
  }
};

/* =========================
   GET ALL CLIENTS
========================= */

const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find()
      .populate("user", "name email role status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("Get Clients Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching clients.",
    });
  }
};

/* =========================
   UPDATE STAFF BY ADMIN
========================= */

const updateStaffByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      password,
      mobile,
      designation,
      department,
      joiningDate,
      status,
      userStatus,
    } = req.body;

    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found.",
      });
    }

    const user = await User.findById(staff.user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Linked user not found for this staff.",
      });
    }

    if (email !== undefined && email.trim()) {
      const finalEmail = normalizeEmail(email);

      const existingUser = await User.findOne({ email: finalEmail });

      if (existingUser && String(existingUser._id) !== String(user._id)) {
        return res.status(409).json({
          success: false,
          message: "Another user already exists with this email.",
        });
      }

      user.email = finalEmail;
    }

    if (name !== undefined && name.trim()) {
      user.name = name.trim();
    }

    if (password !== undefined && password.trim()) {
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    if (userStatus !== undefined) {
      user.status = userStatus;
    }

    await user.save();

    if (mobile !== undefined) staff.mobile = mobile?.trim();
    if (designation !== undefined) staff.designation = designation?.trim();
    if (department !== undefined) staff.department = department?.trim();
    if (joiningDate !== undefined) staff.joiningDate = joiningDate;
    if (status !== undefined) staff.status = status;

    await staff.save();

    const updatedStaff = await Staff.findById(id).populate(
      "user",
      "name email role status"
    );

    return res.status(200).json({
      success: true,
      message: "Staff updated successfully.",
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("Update Staff Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating staff.",
    });
  }
};

/* =========================
   UPDATE CLIENT BY ADMIN
========================= */

const updateClientByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      password,
      clientType,
      businessName,
      individualName,
      pan,
      gstin,
      constitution,
      contactPerson,
      mobile,
      address,
      portalStatus,
      userStatus,
    } = req.body;

    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    const user = await User.findById(client.user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Linked user not found for this client.",
      });
    }

    const finalClientType = clientType || client.clientType;

    if (!["BUSINESS", "INDIVIDUAL"].includes(finalClientType)) {
      return res.status(400).json({
        success: false,
        message: "Client type must be BUSINESS or INDIVIDUAL.",
      });
    }

    if (finalClientType === "BUSINESS") {
      const finalBusinessName = businessName || client.businessName;

      if (!finalBusinessName) {
        return res.status(400).json({
          success: false,
          message: "Business name is required for business client.",
        });
      }
    }

    if (finalClientType === "INDIVIDUAL") {
      const finalIndividualName = individualName || client.individualName;

      if (!finalIndividualName) {
        return res.status(400).json({
          success: false,
          message: "Individual name is required for individual client.",
        });
      }
    }

    if (email !== undefined && email.trim()) {
      const finalEmail = normalizeEmail(email);

      const existingUser = await User.findOne({ email: finalEmail });

      if (existingUser && String(existingUser._id) !== String(user._id)) {
        return res.status(409).json({
          success: false,
          message: "Another user already exists with this email.",
        });
      }

      user.email = finalEmail;
    }

    let finalUserName = name?.trim();

    client.clientType = finalClientType;

    if (finalClientType === "BUSINESS") {
      if (businessName !== undefined) {
        client.businessName = businessName?.trim();
      }

      client.individualName = undefined;

      if (gstin !== undefined) client.gstin = gstin?.trim();
      if (constitution !== undefined) {
        client.constitution = constitution?.trim();
      }
      if (contactPerson !== undefined) {
        client.contactPerson = contactPerson?.trim();
      }

      if (!finalUserName) {
        finalUserName = client.businessName || user.name;
      }
    }

    if (finalClientType === "INDIVIDUAL") {
      if (individualName !== undefined) {
        client.individualName = individualName?.trim();
      }

      client.businessName = undefined;
      client.gstin = undefined;
      client.constitution = undefined;
      client.contactPerson = undefined;

      if (!finalUserName) {
        finalUserName = client.individualName || user.name;
      }
    }

    if (finalUserName) {
      user.name = finalUserName;
    }

    if (password !== undefined && password.trim()) {
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    if (userStatus !== undefined) {
      user.status = userStatus;
    }

    await user.save();

    if (pan !== undefined) client.pan = pan?.trim();
    if (mobile !== undefined) client.mobile = mobile?.trim();
    if (address !== undefined) client.address = address?.trim();
    if (portalStatus !== undefined) client.portalStatus = portalStatus;

    await client.save();

    const updatedClient = await Client.findById(id).populate(
      "user",
      "name email role status"
    );

    return res.status(200).json({
      success: true,
      message: "Client updated successfully.",
      client: updatedClient,
    });
  } catch (error) {
    console.error("Update Client Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating client.",
    });
  }
};

/* =========================
   DELETE STAFF BY ADMIN
========================= */

const deleteStaffByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found.",
      });
    }

    await User.findByIdAndDelete(staff.user);
    await Staff.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Staff deleted successfully.",
      deletedStaffId: id,
    });
  } catch (error) {
    console.error("Delete Staff Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting staff.",
    });
  }
};

/* =========================
   DELETE CLIENT BY ADMIN
========================= */

const deleteClientByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    await User.findByIdAndDelete(client.user);
    await Client.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Client deleted successfully.",
      deletedClientId: id,
    });
  } catch (error) {
    console.error("Delete Client Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting client.",
    });
  }
};

module.exports = {
  createStaffByAdmin,
  createClientByAdmin,
  getAllUsers,
  getAllStaff,
  getAllClients,
  updateStaffByAdmin,
  updateClientByAdmin,
  deleteStaffByAdmin,
  deleteClientByAdmin,
};
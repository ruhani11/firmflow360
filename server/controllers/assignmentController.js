const mongoose = require("mongoose");

const Assignment = require("../models/Assignment");
const Client = require("../models/Client");
const Staff = require("../models/Staff");

const recordActivity = require("../utils/activityLogger");

/* =========================
   UTILS
========================= */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanRequiredDocuments = (requiredDocuments) => {
  if (!Array.isArray(requiredDocuments)) return [];

  return requiredDocuments
    .map((doc) => String(doc || "").trim())
    .filter(Boolean);
};

const populateAssignment = (query) => {
  return query
    .populate({
      path: "client",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate({
      path: "staff",
      populate: {
        path: "user",
        select: "name email role status",
      },
    });
};

/* =========================
   CREATE ASSIGNMENT (ADMIN)
========================= */

const createAssignment = async (req, res) => {
  try {
    const {
      clientId,
      staffId,
      serviceName,
      period,
      priority,
      dueDate,
      instructions,
      requiredDocuments,
    } = req.body;

    if (!clientId || !staffId || !serviceName) {
      return res.status(400).json({
        success: false,
        message: "Client, Staff and Service Name are required.",
      });
    }

    if (!isValidObjectId(clientId) || !isValidObjectId(staffId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Client or Staff ID.",
      });
    }

    const client = await Client.findById(clientId);
    const staff = await Staff.findById(staffId);

    if (!client || !staff) {
      return res.status(404).json({
        success: false,
        message: "Client or Staff not found.",
      });
    }

    const assignment = await Assignment.create({
      client: clientId,
      staff: staffId,
      serviceName: serviceName.trim(),
      period: period?.trim(),
      priority: priority || "Medium",
      dueDate,
      instructions: instructions?.trim(),

      requiredDocuments: cleanRequiredDocuments(requiredDocuments),

      // SYSTEM CONTROLLED
      status: "Not Started",
      completionPercent: 0,
    });

    await recordActivity({
      req,
      action: "CREATE_ASSIGNMENT",
      module: "ASSIGNMENT",
      entityType: "Assignment",
      entityId: assignment._id,
      client: clientId,
      staff: staffId,
      assignment: assignment._id,
      title: "Assignment Created",
      description: `Assignment created: ${assignment.serviceName}`,
      metadata: {
        serviceName: assignment.serviceName,
        period: assignment.period,
        priority: assignment.priority,
        dueDate: assignment.dueDate,
        instructions: assignment.instructions,
        requiredDocuments: assignment.requiredDocuments,
      },
    });

    const data = await populateAssignment(Assignment.findById(assignment._id));

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment: data,
    });
  } catch (error) {
    console.error("Create Assignment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while creating assignment.",
    });
  }
};

/* =========================
   ADMIN - GET ALL
========================= */

const getAllAssignmentsForAdmin = async (req, res) => {
  try {
    const assignments = await populateAssignment(
      Assignment.find().sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get Admin Assignments Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while fetching assignments.",
    });
  }
};

/* =========================
   STAFF - MY ASSIGNMENTS
========================= */

const getMyStaffAssignments = async (req, res) => {
  try {
    const staff = await Staff.findOne({ user: req.user.id });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const assignments = await populateAssignment(
      Assignment.find({ staff: staff._id }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get Staff Assignments Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while fetching staff assignments.",
    });
  }
};

/* =========================
   CLIENT - MY SERVICES
========================= */

const getMyClientServices = async (req, res) => {
  try {
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const services = await populateAssignment(
      Assignment.find({ client: client._id }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    console.error("Get Client Services Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while fetching client services.",
    });
  }
};

/* =========================
   UPDATE ASSIGNMENT (ADMIN)
========================= */

const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const {
      clientId,
      staffId,
      serviceName,
      period,
      priority,
      dueDate,
      status,
      completionPercent,
      instructions,
      requiredDocuments,
      latestUpdate,
      remarks,
    } = req.body;

    if (clientId !== undefined) {
      if (!isValidObjectId(clientId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Client ID.",
        });
      }

      const client = await Client.findById(clientId);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client not found.",
        });
      }

      assignment.client = clientId;
    }

    if (staffId !== undefined) {
      if (!isValidObjectId(staffId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Staff ID.",
        });
      }

      const staff = await Staff.findById(staffId);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff not found.",
        });
      }

      assignment.staff = staffId;
    }

    if (serviceName !== undefined) assignment.serviceName = serviceName.trim();
    if (period !== undefined) assignment.period = period?.trim();
    if (priority !== undefined) assignment.priority = priority;
    if (dueDate !== undefined) assignment.dueDate = dueDate;
    if (status !== undefined) assignment.status = status;
    if (instructions !== undefined) assignment.instructions = instructions?.trim();

    if (requiredDocuments !== undefined) {
      assignment.requiredDocuments = cleanRequiredDocuments(requiredDocuments);
    }

    if (latestUpdate !== undefined) {
      assignment.latestUpdate = latestUpdate?.trim();
    }

    if (remarks !== undefined) {
      assignment.remarks = remarks?.trim();
    }

    if (completionPercent !== undefined) {
      assignment.completionPercent = Math.min(
        Math.max(Number(completionPercent || 0), 0),
        100
      );
    }

    await assignment.save();

    await recordActivity({
      req,
      action: "UPDATE_ASSIGNMENT",
      module: "ASSIGNMENT",
      entityType: "Assignment",
      entityId: assignment._id,
      client: assignment.client,
      staff: assignment.staff,
      assignment: assignment._id,
      title: "Assignment Updated",
      description: `Assignment updated: ${assignment.serviceName}`,
      metadata: {
        serviceName: assignment.serviceName,
        period: assignment.period,
        priority: assignment.priority,
        status: assignment.status,
        dueDate: assignment.dueDate,
        completionPercent: assignment.completionPercent,
        instructions: assignment.instructions,
        requiredDocuments: assignment.requiredDocuments,
        latestUpdate: assignment.latestUpdate,
        remarks: assignment.remarks,
      },
    });

    const updated = await populateAssignment(Assignment.findById(id));

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment: updated,
    });
  } catch (error) {
    console.error("Update Assignment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while updating assignment.",
    });
  }
};

/* =========================
   STATUS UPDATE (ADMIN / STAFF)
========================= */

const updateAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const { status, completionPercent, latestUpdate, remarks } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    assignment.status = status;

    if (completionPercent !== undefined) {
      assignment.completionPercent = Math.min(
        Math.max(Number(completionPercent || 0), 0),
        100
      );
    }

    if (latestUpdate !== undefined) {
      assignment.latestUpdate = latestUpdate?.trim();
    }

    if (remarks !== undefined) {
      assignment.remarks = remarks?.trim();
    }

    await assignment.save();

    await recordActivity({
      req,
      action: "UPDATE_ASSIGNMENT_STATUS",
      module: "ASSIGNMENT",
      entityType: "Assignment",
      entityId: assignment._id,
      client: assignment.client,
      staff: assignment.staff,
      assignment: assignment._id,
      title: "Assignment Status Updated",
      description: `Assignment marked as ${assignment.status}`,
      metadata: {
        status: assignment.status,
        completionPercent: assignment.completionPercent,
        latestUpdate: assignment.latestUpdate,
        remarks: assignment.remarks,
      },
    });

    const updated = await populateAssignment(Assignment.findById(id));

    return res.status(200).json({
      success: true,
      message: "Assignment status updated successfully",
      assignment: updated,
    });
  } catch (error) {
    console.error("Update Assignment Status Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while updating assignment status.",
    });
  }
};

/* =========================
   DELETE ASSIGNMENT
========================= */

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    await recordActivity({
      req,
      action: "DELETE_ASSIGNMENT",
      module: "ASSIGNMENT",
      entityType: "Assignment",
      entityId: assignment._id,
      client: assignment.client,
      staff: assignment.staff,
      assignment: assignment._id,
      title: "Assignment Deleted",
      description: `Assignment deleted: ${assignment.serviceName}`,
      metadata: {
        serviceName: assignment.serviceName,
        period: assignment.period,
        priority: assignment.priority,
        status: assignment.status,
        dueDate: assignment.dueDate,
        completionPercent: assignment.completionPercent,
        instructions: assignment.instructions,
        requiredDocuments: assignment.requiredDocuments,
      },
    });

    await assignment.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete Assignment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while deleting assignment.",
    });
  }
};

/* =========================
   EXPORTS
========================= */

module.exports = {
  createAssignment,
  getAllAssignmentsForAdmin,
  getMyStaffAssignments,
  getMyClientServices,
  updateAssignment,
  updateAssignmentStatus,
  deleteAssignment,
};
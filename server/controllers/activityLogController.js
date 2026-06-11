const ActivityLog = require("../models/ActivityLog");
const Client = require("../models/Client");
const Staff = require("../models/Staff");
const Assignment = require("../models/Assignment");

const populateActivityLog = (query) => {
  return query
    .populate("actorUser", "name email role status")
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
    })
    .populate("assignment", "serviceName period status priority dueDate");
};

const getAllActivityLogsForAdmin = async (req, res) => {
  try {
    const { module, action, actorRole, limit } = req.query;

    const filter = {};

    if (module) filter.module = module;
    if (action) filter.action = action;
    if (actorRole) filter.actorRole = actorRole;

    const logs = await populateActivityLog(
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 100)
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Get Admin Activity Logs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching activity logs.",
    });
  }
};

const getMyStaffActivityLogs = async (req, res) => {
  try {
    const staff = await Staff.findOne({ user: req.user.id });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    const assignments = await Assignment.find({ staff: staff._id }).select(
      "_id client"
    );

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const clientIds = assignments.map((assignment) => assignment.client);

    const logs = await populateActivityLog(
      ActivityLog.find({
        $or: [
          { actorUser: req.user.id },
          { staff: staff._id },
          { client: { $in: clientIds } },
          { assignment: { $in: assignmentIds } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(100)
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Get Staff Activity Logs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff activity logs.",
    });
  }
};

const getMyClientActivityLogs = async (req, res) => {
  try {
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const logs = await populateActivityLog(
      ActivityLog.find({
        client: client._id,
      })
        .sort({ createdAt: -1 })
        .limit(100)
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Get Client Activity Logs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching client activity logs.",
    });
  }
};

module.exports = {
  getAllActivityLogsForAdmin,
  getMyStaffActivityLogs,
  getMyClientActivityLogs,
};
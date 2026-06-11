const mongoose = require("mongoose");

const InternalQuery = require("../models/InternalQuery");
const Staff = require("../models/Staff");
const Client = require("../models/Client");
const Assignment = require("../models/Assignment");
const User = require("../models/User");

const recordActivity = require("../utils/activityLogger");
const { createManyNotifications } = require("../utils/notificationService");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const cleanOptionalObjectId = (id) => {
  if (!id) return null;

  const value = String(id).trim();

  if (!value || value === "null" || value === "undefined") {
    return null;
  }

  return value;
};

const populateInternalQuery = (query) => {
  return query
    .populate("raisedByUser", "name email role status")
    .populate({
      path: "assignedToStaff",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate({
      path: "relatedClient",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate({
      path: "relatedAssignment",
      select: "serviceName period priority status dueDate completionPercent",
    })
    .populate("replies.senderUser", "name email role status");
};

const getAdminUserIds = async () => {
  const admins = await User.find({
    role: "ADMIN",
    status: "ACTIVE",
  }).select("_id");

  return admins.map((admin) => admin._id);
};

const getStaffUserId = async (staffId) => {
  if (!staffId) return null;

  const staff = await Staff.findById(staffId).select("user");

  return staff?.user || null;
};

const notifyInternalUsers = async ({
  req,
  recipientUserIds = [],
  title,
  message,
  type = "Info",
  entityId,
  staff = null,
  client = null,
  assignment = null,
  metadata = {},
}) => {
  const uniqueRecipientIds = [
    ...new Set(
      recipientUserIds
        .filter(Boolean)
        .map((id) => String(id))
        .filter((id) => id !== String(req.user.id))
    ),
  ];

  if (uniqueRecipientIds.length === 0) return;

  const users = await User.find({
    _id: { $in: uniqueRecipientIds },
    status: "ACTIVE",
    role: { $in: ["ADMIN", "STAFF"] },
  }).select("_id role");

  if (!users.length) return;

  const notifications = users.map((user) => ({
    recipientUser: user._id,
    recipientRole: user.role,
    actorUser: req.user.id,
    actorRole: req.user.role,
    title,
    message,
    module: "INTERNAL_QUERY",
    type,
    entityType: "InternalQuery",
    entityId,
    client,
    staff,
    assignment,
    link:
      user.role === "ADMIN"
        ? `/internal-queries/${entityId}`
        : `/staff/internal-queries/${entityId}`,
    metadata,
  }));

  await createManyNotifications(notifications);
};

const createInternalQuery = async (req, res) => {
  try {
    let {
      subject,
      message,
      assignedToStaffId,
      relatedClientId,
      relatedAssignmentId,
      category,
      priority,
    } = req.body;

    assignedToStaffId = cleanOptionalObjectId(assignedToStaffId);
    relatedClientId = cleanOptionalObjectId(relatedClientId);
    relatedAssignmentId = cleanOptionalObjectId(relatedAssignmentId);

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required.",
      });
    }

    let assignedToStaff = null;
    let relatedClient = null;
    let relatedAssignment = null;
    let loggedInStaff = null;

    if (req.user.role === "STAFF") {
      loggedInStaff = await Staff.findOne({ user: req.user.id });

      if (!loggedInStaff) {
        return res.status(404).json({
          success: false,
          message: "Staff profile not found.",
        });
      }

      assignedToStaff = loggedInStaff;
    }

    if (assignedToStaffId && req.user.role === "ADMIN") {
      if (!isValidObjectId(assignedToStaffId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned staff ID.",
        });
      }

      assignedToStaff = await Staff.findById(assignedToStaffId);

      if (!assignedToStaff) {
        return res.status(404).json({
          success: false,
          message: "Assigned staff not found.",
        });
      }
    }

    if (relatedClientId) {
      if (!isValidObjectId(relatedClientId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid client ID.",
        });
      }

      relatedClient = await Client.findById(relatedClientId);

      if (!relatedClient) {
        return res.status(404).json({
          success: false,
          message: "Client not found.",
        });
      }
    }

    if (relatedAssignmentId) {
      if (!isValidObjectId(relatedAssignmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID.",
        });
      }

      relatedAssignment = await Assignment.findById(relatedAssignmentId);

      if (!relatedAssignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found.",
        });
      }

      if (
        relatedClient &&
        String(relatedAssignment.client) !== String(relatedClient._id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Assignment does not belong to selected client.",
        });
      }

      if (!relatedClient) {
        relatedClient = await Client.findById(relatedAssignment.client);
      }

      if (!assignedToStaff && relatedAssignment.staff) {
        assignedToStaff = relatedAssignment.staff;
      }
    }

    if (req.user.role === "STAFF" && relatedClient) {
      const staffHasClient = await Assignment.findOne({
        client: relatedClient._id,
        staff: loggedInStaff._id,
      });

      if (!staffHasClient) {
        return res.status(403).json({
          success: false,
          message: "You can create query only for your assigned client.",
        });
      }
    }

    const finalAssignedStaffId = assignedToStaff
      ? assignedToStaff._id || assignedToStaff
      : null;

    const internalQuery = await InternalQuery.create({
      subject: subject.trim(),
      message: message.trim(),
      raisedByUser: req.user.id,
      raisedByRole: req.user.role,
      assignedToStaff: finalAssignedStaffId,
      relatedClient: relatedClient ? relatedClient._id : null,
      relatedAssignment: relatedAssignment ? relatedAssignment._id : null,
      category: category || "General",
      priority: priority || "Medium",
      status: "Open",
    });

    await recordActivity({
      req,
      action: "CREATE_INTERNAL_QUERY",
      module: "INTERNAL_QUERY",
      entityType: "InternalQuery",
      entityId: internalQuery._id,
      client: internalQuery.relatedClient || null,
      staff: internalQuery.assignedToStaff || null,
      assignment: internalQuery.relatedAssignment || null,
      title: "Internal query created",
      description: `${req.user.role} created internal query: ${internalQuery.subject}`,
      metadata: {
        subject: internalQuery.subject,
        category: internalQuery.category,
        priority: internalQuery.priority,
        status: internalQuery.status,
        raisedByRole: internalQuery.raisedByRole,
        assignedToStaff: internalQuery.assignedToStaff,
        relatedClient: internalQuery.relatedClient,
        relatedAssignment: internalQuery.relatedAssignment,
      },
    });

    if (req.user.role === "STAFF") {
      const adminUserIds = await getAdminUserIds();

      await notifyInternalUsers({
        req,
        recipientUserIds: adminUserIds,
        title: "New internal query raised by staff",
        message: `Staff raised internal query: ${internalQuery.subject}`,
        type: "Info",
        entityId: internalQuery._id,
        staff: internalQuery.assignedToStaff || null,
        client: internalQuery.relatedClient || null,
        assignment: internalQuery.relatedAssignment || null,
        metadata: {
          subject: internalQuery.subject,
          category: internalQuery.category,
          priority: internalQuery.priority,
          status: internalQuery.status,
          raisedByRole: internalQuery.raisedByRole,
        },
      });
    }

    if (req.user.role === "ADMIN" && internalQuery.assignedToStaff) {
      const staffUserId = await getStaffUserId(internalQuery.assignedToStaff);

      await notifyInternalUsers({
        req,
        recipientUserIds: [staffUserId],
        title: "Internal query assigned by admin",
        message: `Admin created internal query: ${internalQuery.subject}`,
        type: "Info",
        entityId: internalQuery._id,
        staff: internalQuery.assignedToStaff || null,
        client: internalQuery.relatedClient || null,
        assignment: internalQuery.relatedAssignment || null,
        metadata: {
          subject: internalQuery.subject,
          category: internalQuery.category,
          priority: internalQuery.priority,
          status: internalQuery.status,
          raisedByRole: internalQuery.raisedByRole,
        },
      });
    }

    const populatedQuery = await populateInternalQuery(
      InternalQuery.findById(internalQuery._id)
    );

    return res.status(201).json({
      success: true,
      message: "Internal query created successfully.",
      query: populatedQuery,
    });
  } catch (error) {
    console.error("Create Internal Query Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Something went wrong while creating internal query.",
    });
  }
};

const getAllInternalQueriesForAdmin = async (req, res) => {
  try {
    const queries = await populateInternalQuery(
      InternalQuery.find().sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: queries.length,
      queries,
    });
  } catch (error) {
    console.error("Get Admin Internal Queries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching internal queries.",
    });
  }
};

const getMyInternalQueriesForStaff = async (req, res) => {
  try {
    const staff = await Staff.findOne({ user: req.user.id });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    const queries = await populateInternalQuery(
      InternalQuery.find({
        $or: [{ assignedToStaff: staff._id }, { raisedByUser: req.user.id }],
      }).sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: queries.length,
      queries,
    });
  } catch (error) {
    console.error("Get Staff Internal Queries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff internal queries.",
    });
  }
};

const addReplyToInternalQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internal query ID.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required.",
      });
    }

    const internalQuery = await InternalQuery.findById(id);

    if (!internalQuery) {
      return res.status(404).json({
        success: false,
        message: "Internal query not found.",
      });
    }

    let replyingStaff = null;

    if (req.user.role === "STAFF") {
      const staff = await Staff.findOne({ user: req.user.id });
      replyingStaff = staff;

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff profile not found.",
        });
      }

      if (
        String(internalQuery.assignedToStaff || "") !== String(staff._id) &&
        String(internalQuery.raisedByUser) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to reply to this internal query.",
        });
      }
    }

    const oldStatus = internalQuery.status;
    const oldResolvedAt = internalQuery.resolvedAt;
    const oldClosedAt = internalQuery.closedAt;

    internalQuery.replies.push({
      message: message.trim(),
      senderUser: req.user.id,
      senderRole: req.user.role,
    });

    internalQuery.lastReplyAt = new Date();

    if (
      internalQuery.status === "Closed" ||
      internalQuery.status === "Resolved"
    ) {
      internalQuery.status = "Open";
      internalQuery.resolvedAt = null;
      internalQuery.closedAt = null;
    }

    await internalQuery.save();

    await recordActivity({
      req,
      action: "ADD_INTERNAL_QUERY_REPLY",
      module: "INTERNAL_QUERY",
      entityType: "InternalQuery",
      entityId: internalQuery._id,
      client: internalQuery.relatedClient || null,
      staff: replyingStaff?._id || internalQuery.assignedToStaff || null,
      assignment: internalQuery.relatedAssignment || null,
      title: "Reply added to internal query",
      description: `${req.user.role} replied to internal query: ${internalQuery.subject}`,
      metadata: {
        subject: internalQuery.subject,
        replyByRole: req.user.role,
        oldStatus,
        newStatus: internalQuery.status,
        oldResolvedAt,
        newResolvedAt: internalQuery.resolvedAt,
        oldClosedAt,
        newClosedAt: internalQuery.closedAt,
        lastReplyAt: internalQuery.lastReplyAt,
        replyMessage: message.trim(),
      },
    });

    const recipientIds = new Set();

    if (req.user.role === "STAFF") {
      const adminUserIds = await getAdminUserIds();
      adminUserIds.forEach((userId) => recipientIds.add(String(userId)));

      if (internalQuery.raisedByUser) {
        recipientIds.add(String(internalQuery.raisedByUser));
      }

      if (internalQuery.assignedToStaff) {
        const assignedStaffUserId = await getStaffUserId(
          internalQuery.assignedToStaff
        );

        if (assignedStaffUserId) {
          recipientIds.add(String(assignedStaffUserId));
        }
      }

      await notifyInternalUsers({
        req,
        recipientUserIds: [...recipientIds],
        title: "Staff replied to internal query",
        message: `Staff replied to internal query: ${internalQuery.subject}`,
        type: "Info",
        entityId: internalQuery._id,
        staff: replyingStaff?._id || internalQuery.assignedToStaff || null,
        client: internalQuery.relatedClient || null,
        assignment: internalQuery.relatedAssignment || null,
        metadata: {
          subject: internalQuery.subject,
          oldStatus,
          newStatus: internalQuery.status,
          replyByRole: req.user.role,
          lastReplyAt: internalQuery.lastReplyAt,
        },
      });
    }

    if (req.user.role === "ADMIN") {
      if (internalQuery.raisedByUser) {
        recipientIds.add(String(internalQuery.raisedByUser));
      }

      if (internalQuery.assignedToStaff) {
        const assignedStaffUserId = await getStaffUserId(
          internalQuery.assignedToStaff
        );

        if (assignedStaffUserId) {
          recipientIds.add(String(assignedStaffUserId));
        }
      }

      await notifyInternalUsers({
        req,
        recipientUserIds: [...recipientIds],
        title: "Admin replied to internal query",
        message: `Admin replied to internal query: ${internalQuery.subject}`,
        type: "Info",
        entityId: internalQuery._id,
        staff: internalQuery.assignedToStaff || null,
        client: internalQuery.relatedClient || null,
        assignment: internalQuery.relatedAssignment || null,
        metadata: {
          subject: internalQuery.subject,
          oldStatus,
          newStatus: internalQuery.status,
          replyByRole: req.user.role,
          lastReplyAt: internalQuery.lastReplyAt,
        },
      });
    }

    const updatedQuery = await populateInternalQuery(
      InternalQuery.findById(internalQuery._id)
    );

    return res.status(200).json({
      success: true,
      message: "Reply added successfully.",
      query: updatedQuery,
    });
  } catch (error) {
    console.error("Add Internal Query Reply Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding reply.",
    });
  }
};

const updateInternalQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedToStaffId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internal query ID.",
      });
    }

    const allowedStatuses = [
      "Open",
      "In Progress",
      "Waiting",
      "Resolved",
      "Closed",
    ];

    const allowedPriorities = ["Low", "Medium", "High", "Urgent"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internal query status.",
      });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority.",
      });
    }

    const internalQuery = await InternalQuery.findById(id);

    if (!internalQuery) {
      return res.status(404).json({
        success: false,
        message: "Internal query not found.",
      });
    }

    let updatingStaff = null;

    if (req.user.role === "STAFF") {
      const staff = await Staff.findOne({ user: req.user.id });
      updatingStaff = staff;

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff profile not found.",
        });
      }

      if (
        String(internalQuery.assignedToStaff || "") !== String(staff._id) &&
        String(internalQuery.raisedByUser) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to update this internal query.",
        });
      }
    }

    const oldStatus = internalQuery.status;
    const oldPriority = internalQuery.priority;
    const oldAssignedToStaff = internalQuery.assignedToStaff;
    const oldResolvedAt = internalQuery.resolvedAt;
    const oldClosedAt = internalQuery.closedAt;

    if (status !== undefined) {
      internalQuery.status = status;

      if (status === "Resolved") {
        internalQuery.resolvedAt = new Date();
      } else {
        internalQuery.resolvedAt = null;
      }

      if (status === "Closed") {
        internalQuery.closedAt = new Date();
      } else {
        internalQuery.closedAt = null;
      }
    }

    if (priority !== undefined) {
      internalQuery.priority = priority;
    }

    if (req.user.role === "ADMIN" && assignedToStaffId !== undefined) {
      const cleanStaffId = cleanOptionalObjectId(assignedToStaffId);

      if (!cleanStaffId) {
        internalQuery.assignedToStaff = null;
      } else {
        if (!isValidObjectId(cleanStaffId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid assigned staff ID.",
          });
        }

        const staff = await Staff.findById(cleanStaffId);

        if (!staff) {
          return res.status(404).json({
            success: false,
            message: "Assigned staff not found.",
          });
        }

        internalQuery.assignedToStaff = staff._id;
      }
    }

    await internalQuery.save();

    await recordActivity({
      req,
      action: "UPDATE_INTERNAL_QUERY",
      module: "INTERNAL_QUERY",
      entityType: "InternalQuery",
      entityId: internalQuery._id,
      client: internalQuery.relatedClient || null,
      staff: updatingStaff?._id || internalQuery.assignedToStaff || null,
      assignment: internalQuery.relatedAssignment || null,
      title: "Internal query updated",
      description: `Internal query updated: ${internalQuery.subject}`,
      metadata: {
        subject: internalQuery.subject,
        oldStatus,
        newStatus: internalQuery.status,
        oldPriority,
        newPriority: internalQuery.priority,
        oldAssignedToStaff,
        newAssignedToStaff: internalQuery.assignedToStaff,
        oldResolvedAt,
        newResolvedAt: internalQuery.resolvedAt,
        oldClosedAt,
        newClosedAt: internalQuery.closedAt,
        updatedByRole: req.user.role,
      },
    });

    const recipientIds = new Set();

    if (req.user.role === "STAFF") {
      const adminUserIds = await getAdminUserIds();
      adminUserIds.forEach((userId) => recipientIds.add(String(userId)));

      if (internalQuery.raisedByUser) {
        recipientIds.add(String(internalQuery.raisedByUser));
      }

      if (internalQuery.assignedToStaff) {
        const assignedStaffUserId = await getStaffUserId(
          internalQuery.assignedToStaff
        );

        if (assignedStaffUserId) {
          recipientIds.add(String(assignedStaffUserId));
        }
      }

      await notifyInternalUsers({
        req,
        recipientUserIds: [...recipientIds],
        title: "Internal query updated by staff",
        message: `Staff updated internal query: ${internalQuery.subject}`,
        type:
          internalQuery.status === "Resolved" || internalQuery.status === "Closed"
            ? "Success"
            : "Info",
        entityId: internalQuery._id,
        staff: updatingStaff?._id || internalQuery.assignedToStaff || null,
        client: internalQuery.relatedClient || null,
        assignment: internalQuery.relatedAssignment || null,
        metadata: {
          subject: internalQuery.subject,
          oldStatus,
          newStatus: internalQuery.status,
          oldPriority,
          newPriority: internalQuery.priority,
          updatedByRole: req.user.role,
        },
      });
    }

    if (req.user.role === "ADMIN") {
      if (internalQuery.raisedByUser) {
        recipientIds.add(String(internalQuery.raisedByUser));
      }

      if (internalQuery.assignedToStaff) {
        const assignedStaffUserId = await getStaffUserId(
          internalQuery.assignedToStaff
        );

        if (assignedStaffUserId) {
          recipientIds.add(String(assignedStaffUserId));
        }
      }

      await notifyInternalUsers({
        req,
        recipientUserIds: [...recipientIds],
        title: "Internal query updated by admin",
        message: `Admin updated internal query: ${internalQuery.subject}`,
        type:
          internalQuery.status === "Resolved" || internalQuery.status === "Closed"
            ? "Success"
            : "Info",
        entityId: internalQuery._id,
        staff: internalQuery.assignedToStaff || null,
        client: internalQuery.relatedClient || null,
        assignment: internalQuery.relatedAssignment || null,
        metadata: {
          subject: internalQuery.subject,
          oldStatus,
          newStatus: internalQuery.status,
          oldPriority,
          newPriority: internalQuery.priority,
          oldAssignedToStaff,
          newAssignedToStaff: internalQuery.assignedToStaff,
          updatedByRole: req.user.role,
        },
      });
    }

    const updatedQuery = await populateInternalQuery(
      InternalQuery.findById(internalQuery._id)
    );

    return res.status(200).json({
      success: true,
      message: "Internal query updated successfully.",
      query: updatedQuery,
    });
  } catch (error) {
    console.error("Update Internal Query Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating internal query.",
    });
  }
};

const deleteInternalQueryByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internal query ID.",
      });
    }

    const internalQuery = await InternalQuery.findById(id);

    if (!internalQuery) {
      return res.status(404).json({
        success: false,
        message: "Internal query not found.",
      });
    }

    await recordActivity({
      req,
      action: "DELETE_INTERNAL_QUERY",
      module: "INTERNAL_QUERY",
      entityType: "InternalQuery",
      entityId: internalQuery._id,
      client: internalQuery.relatedClient || null,
      staff: internalQuery.assignedToStaff || null,
      assignment: internalQuery.relatedAssignment || null,
      title: "Internal query deleted",
      description: `Internal query deleted: ${internalQuery.subject}`,
      metadata: {
        subject: internalQuery.subject,
        message: internalQuery.message,
        category: internalQuery.category,
        priority: internalQuery.priority,
        status: internalQuery.status,
        raisedByRole: internalQuery.raisedByRole,
        repliesCount: internalQuery.replies?.length || 0,
      },
    });

    const recipientIds = new Set();

    if (internalQuery.raisedByUser) {
      recipientIds.add(String(internalQuery.raisedByUser));
    }

    if (internalQuery.assignedToStaff) {
      const assignedStaffUserId = await getStaffUserId(
        internalQuery.assignedToStaff
      );

      if (assignedStaffUserId) {
        recipientIds.add(String(assignedStaffUserId));
      }
    }

    await notifyInternalUsers({
      req,
      recipientUserIds: [...recipientIds],
      title: "Internal query deleted",
      message: `Internal query deleted by admin: ${internalQuery.subject}`,
      type: "Warning",
      entityId: internalQuery._id,
      staff: internalQuery.assignedToStaff || null,
      client: internalQuery.relatedClient || null,
      assignment: internalQuery.relatedAssignment || null,
      metadata: {
        subject: internalQuery.subject,
        category: internalQuery.category,
        priority: internalQuery.priority,
        status: internalQuery.status,
        deletedByRole: req.user.role,
      },
    });

    await internalQuery.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Internal query deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Internal Query Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting internal query.",
    });
  }
};

module.exports = {
  createInternalQuery,
  getAllInternalQueriesForAdmin,
  getMyInternalQueriesForStaff,
  addReplyToInternalQuery,
  updateInternalQueryStatus,
  deleteInternalQueryByAdmin,
};
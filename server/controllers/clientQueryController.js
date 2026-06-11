const mongoose = require("mongoose");

const ClientQuery = require("../models/ClientQuery");
const Client = require("../models/Client");
const Staff = require("../models/Staff");
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

const populateClientQuery = (query) => {
  return query
    .populate({
      path: "client",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate({
      path: "assignment",
      select:
        "serviceName period priority status dueDate completionPercent staff client",
    })
    .populate({
      path: "assignedStaff",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate("replies.senderUser", "name email role status");
};

const getAdminUsers = async () => {
  return User.find({
    role: "ADMIN",
    status: "ACTIVE",
  }).select("_id role");
};

const getClientUserId = async (clientId) => {
  if (!clientId) return null;

  const client = await Client.findById(clientId).select("user");

  return client?.user || null;
};

const getStaffUserId = async (staffId) => {
  if (!staffId) return null;

  const staff = await Staff.findById(staffId).select("user");

  return staff?.user || null;
};

const getAssignmentStaffId = async (assignmentId) => {
  if (!assignmentId) return null;

  const assignment = await Assignment.findById(assignmentId).select("staff");

  return assignment?.staff || null;
};

const getQueryStaffId = async (clientQuery) => {
  if (clientQuery?.assignedStaff) {
    return clientQuery.assignedStaff;
  }

  if (clientQuery?.assignment) {
    return getAssignmentStaffId(clientQuery.assignment);
  }

  return null;
};

const notifyAdmins = async ({
  req,
  title,
  message,
  type = "Info",
  entityId,
  client = null,
  staff = null,
  assignment = null,
  metadata = {},
}) => {
  const admins = await getAdminUsers();

  const notifications = admins.map((admin) => ({
    recipientUser: admin._id,
    recipientRole: "ADMIN",
    actorUser: req.user.id,
    actorRole: req.user.role,
    title,
    message,
    module: "CLIENT_QUERY",
    type,
    entityType: "ClientQuery",
    entityId,
    client,
    staff,
    assignment,
    link: `/client-queries/${entityId}`,
    metadata,
  }));

  await createManyNotifications(notifications);
};

const notifyClient = async ({
  req,
  clientId,
  title,
  message,
  type = "Info",
  entityId,
  staff = null,
  assignment = null,
  metadata = {},
}) => {
  const clientUserId = await getClientUserId(clientId);

  if (!clientUserId) return;

  await createManyNotifications([
    {
      recipientUser: clientUserId,
      recipientRole: "CLIENT",
      actorUser: req.user.id,
      actorRole: req.user.role,
      title,
      message,
      module: "CLIENT_QUERY",
      type,
      entityType: "ClientQuery",
      entityId,
      client: clientId,
      staff,
      assignment,
      link: `/client/queries/${entityId}`,
      metadata,
    },
  ]);
};

const notifyStaff = async ({
  req,
  staffId,
  title,
  message,
  type = "Info",
  entityId,
  client = null,
  assignment = null,
  metadata = {},
}) => {
  const staffUserId = await getStaffUserId(staffId);

  if (!staffUserId) return;

  await createManyNotifications([
    {
      recipientUser: staffUserId,
      recipientRole: "STAFF",
      actorUser: req.user.id,
      actorRole: req.user.role,
      title,
      message,
      module: "CLIENT_QUERY",
      type,
      entityType: "ClientQuery",
      entityId,
      client,
      staff: staffId,
      assignment,
      link: `/staff/queries`,
      metadata,
    },
  ]);
};

const createQueryByClient = async (req, res) => {
  try {
    let { assignmentId, subject, message, category, priority } = req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required.",
      });
    }

    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    let assignment = null;
    let assignedStaff = null;

    if (assignmentId) {
      if (!isValidObjectId(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID.",
        });
      }

      assignment = await Assignment.findOne({
        _id: assignmentId,
        client: client._id,
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: "This assignment does not belong to this client.",
        });
      }

      assignedStaff = assignment.staff;
    }

    const clientQuery = await ClientQuery.create({
      client: client._id,
      assignment: assignment ? assignment._id : null,
      assignedStaff,
      subject: subject.trim(),
      message: message.trim(),
      category: category || "General",
      priority: priority || "Medium",
      status: "Open",
      createdByRole: "CLIENT",
    });

    await recordActivity({
      req,
      action: "CREATE_CLIENT_QUERY_BY_CLIENT",
      module: "CLIENT_QUERY",
      entityType: "ClientQuery",
      entityId: clientQuery._id,
      client: clientQuery.client,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      title: "Client query raised",
      description: `Client raised query: ${clientQuery.subject}`,
      metadata: {
        subject: clientQuery.subject,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        createdByRole: clientQuery.createdByRole,
      },
    });

    await notifyAdmins({
      req,
      title: "New client query raised",
      message: `Client raised query: ${clientQuery.subject}`,
      type: "Info",
      entityId: clientQuery._id,
      client: clientQuery.client,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      metadata: {
        subject: clientQuery.subject,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        createdByRole: clientQuery.createdByRole,
      },
    });

    if (clientQuery.assignedStaff) {
      await notifyStaff({
        req,
        staffId: clientQuery.assignedStaff,
        title: "New client query assigned",
        message: `Client raised query: ${clientQuery.subject}`,
        type: "Info",
        entityId: clientQuery._id,
        client: clientQuery.client,
        assignment: clientQuery.assignment || null,
        metadata: {
          subject: clientQuery.subject,
          category: clientQuery.category,
          priority: clientQuery.priority,
          status: clientQuery.status,
          createdByRole: clientQuery.createdByRole,
        },
      });
    }

    const populatedQuery = await populateClientQuery(
      ClientQuery.findById(clientQuery._id)
    );

    return res.status(201).json({
      success: true,
      message: "Query raised successfully.",
      query: populatedQuery,
    });
  } catch (error) {
    console.error("Create Client Query Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while creating query.",
    });
  }
};

const createQueryByStaff = async (req, res) => {
  try {
    let { clientId, assignmentId, subject, message, category, priority } =
      req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);

    if (!clientId || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Client, subject and message are required.",
      });
    }

    if (!isValidObjectId(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    const staff = await Staff.findOne({ user: req.user.id });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    let assignment = null;

    if (assignmentId) {
      if (!isValidObjectId(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID.",
        });
      }

      assignment = await Assignment.findOne({
        _id: assignmentId,
        client: clientId,
        staff: staff._id,
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message:
            "This assignment does not belong to your assigned client work.",
        });
      }
    } else {
      assignment = await Assignment.findOne({
        client: clientId,
        staff: staff._id,
      });
    }

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: "You can create query only for your assigned client.",
      });
    }

    const clientQuery = await ClientQuery.create({
      client: client._id,
      assignment: assignment ? assignment._id : null,
      assignedStaff: staff._id,
      subject: subject.trim(),
      message: message.trim(),
      category: category || "General",
      priority: priority || "Medium",
      status: "Open",
      createdByRole: "STAFF",
    });

    await recordActivity({
      req,
      action: "CREATE_CLIENT_QUERY_BY_STAFF",
      module: "CLIENT_QUERY",
      entityType: "ClientQuery",
      entityId: clientQuery._id,
      client: clientQuery.client,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      title: "Client query created by staff",
      description: `Staff created client query: ${clientQuery.subject}`,
      metadata: {
        subject: clientQuery.subject,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        createdByRole: clientQuery.createdByRole,
      },
    });

    await notifyClient({
      req,
      clientId: clientQuery.client,
      title: "New query from office",
      message: `Staff raised query: ${clientQuery.subject}`,
      type: "Info",
      entityId: clientQuery._id,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      metadata: {
        subject: clientQuery.subject,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        createdByRole: clientQuery.createdByRole,
      },
    });

    await notifyAdmins({
      req,
      title: "Client query created by staff",
      message: `Staff raised query for client: ${clientQuery.subject}`,
      type: "Info",
      entityId: clientQuery._id,
      client: clientQuery.client,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      metadata: {
        subject: clientQuery.subject,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        createdByRole: clientQuery.createdByRole,
      },
    });

    const populatedQuery = await populateClientQuery(
      ClientQuery.findById(clientQuery._id)
    );

    return res.status(201).json({
      success: true,
      message: "Client query created successfully by Staff.",
      query: populatedQuery,
    });
  } catch (error) {
    console.error("Staff Create Client Query Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Something went wrong while creating client query.",
    });
  }
};

const createQueryByAdmin = async (req, res) => {
  try {
    let {
      clientId,
      assignmentId,
      assignedStaffId,
      subject,
      message,
      category,
      priority,
      status,
    } = req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);
    assignedStaffId = cleanOptionalObjectId(assignedStaffId);

    if (!clientId || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Client, subject and message are required.",
      });
    }

    if (!isValidObjectId(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    let assignment = null;
    let assignedStaff = null;

    if (assignmentId) {
      if (!isValidObjectId(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID.",
        });
      }

      assignment = await Assignment.findOne({
        _id: assignmentId,
        client: clientId,
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: "This assignment does not belong to this client.",
        });
      }

      assignedStaff = assignment.staff;
    }

    if (assignedStaffId) {
      if (!isValidObjectId(assignedStaffId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid staff ID.",
        });
      }

      const staff = await Staff.findById(assignedStaffId);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff not found.",
        });
      }

      assignedStaff = staff._id;
    }

    const clientQuery = await ClientQuery.create({
      client: clientId,
      assignment: assignment ? assignment._id : null,
      assignedStaff,
      subject: subject.trim(),
      message: message.trim(),
      category: category || "General",
      priority: priority || "Medium",
      status: status || "Open",
      createdByRole: "ADMIN",
    });

    await recordActivity({
      req,
      action: "CREATE_CLIENT_QUERY_BY_ADMIN",
      module: "CLIENT_QUERY",
      entityType: "ClientQuery",
      entityId: clientQuery._id,
      client: clientQuery.client,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      title: "Client query created by admin",
      description: `Admin created client query: ${clientQuery.subject}`,
      metadata: {
        subject: clientQuery.subject,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        createdByRole: clientQuery.createdByRole,
      },
    });

    await notifyClient({
      req,
      clientId: clientQuery.client,
      title: "Query created by office",
      message: `Office created query: ${clientQuery.subject}`,
      type: "Info",
      entityId: clientQuery._id,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      metadata: {
        subject: clientQuery.subject,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        createdByRole: clientQuery.createdByRole,
      },
    });

    if (clientQuery.assignedStaff) {
      await notifyStaff({
        req,
        staffId: clientQuery.assignedStaff,
        title: "Client query assigned by admin",
        message: `Admin created/assigned query: ${clientQuery.subject}`,
        type: "Info",
        entityId: clientQuery._id,
        client: clientQuery.client,
        assignment: clientQuery.assignment || null,
        metadata: {
          subject: clientQuery.subject,
          category: clientQuery.category,
          priority: clientQuery.priority,
          status: clientQuery.status,
          createdByRole: clientQuery.createdByRole,
        },
      });
    }

    const populatedQuery = await populateClientQuery(
      ClientQuery.findById(clientQuery._id)
    );

    return res.status(201).json({
      success: true,
      message: "Query created successfully by Admin.",
      query: populatedQuery,
    });
  } catch (error) {
    console.error("Admin Create Query Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while creating query.",
    });
  }
};

const getAllQueriesForAdmin = async (req, res) => {
  try {
    const queries = await populateClientQuery(
      ClientQuery.find().sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: queries.length,
      queries,
    });
  } catch (error) {
    console.error("Get Admin Queries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching queries.",
    });
  }
};

const getMyClientQueries = async (req, res) => {
  try {
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const queries = await populateClientQuery(
      ClientQuery.find({ client: client._id }).sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: queries.length,
      queries,
    });
  } catch (error) {
    console.error("Get Client Queries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching client queries.",
    });
  }
};

const getMyStaffQueries = async (req, res) => {
  try {
    const staff = await Staff.findOne({ user: req.user.id });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    const assignments = await Assignment.find({ staff: staff._id }).select(
      "client"
    );

    const clientIds = assignments.map((assignment) => assignment.client);

    const queries = await populateClientQuery(
      ClientQuery.find({
        $or: [{ assignedStaff: staff._id }, { client: { $in: clientIds } }],
      }).sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: queries.length,
      queries,
    });
  } catch (error) {
    console.error("Get Staff Queries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff queries.",
    });
  }
};

const addReplyToQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid query ID.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required.",
      });
    }

    const clientQuery = await ClientQuery.findById(id);

    if (!clientQuery) {
      return res.status(404).json({
        success: false,
        message: "Query not found.",
      });
    }

    let replyingStaff = null;

    if (req.user.role === "CLIENT") {
      const client = await Client.findOne({ user: req.user.id });

      if (!client || String(clientQuery.client) !== String(client._id)) {
        return res.status(403).json({
          success: false,
          message: "You can reply only to your own query.",
        });
      }
    }

    if (req.user.role === "STAFF") {
      const staff = await Staff.findOne({ user: req.user.id });
      replyingStaff = staff;

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff profile not found.",
        });
      }

      const staffHasClient = await Assignment.findOne({
        client: clientQuery.client,
        staff: staff._id,
      });

      if (
        String(clientQuery.assignedStaff || "") !== String(staff._id) &&
        !staffHasClient
      ) {
        return res.status(403).json({
          success: false,
          message: "This query is not related to your assigned client.",
        });
      }
    }

    const oldStatus = clientQuery.status;

    clientQuery.replies.push({
      message: message.trim(),
      senderUser: req.user.id,
      senderRole: req.user.role,
    });

    clientQuery.lastReplyAt = new Date();

    if (req.user.role === "CLIENT") {
      clientQuery.status = "Open";
    }

    if (req.user.role === "STAFF" || req.user.role === "ADMIN") {
      clientQuery.status = "Waiting for Client";
    }

    await clientQuery.save();

    await recordActivity({
      req,
      action: "ADD_CLIENT_QUERY_REPLY",
      module: "CLIENT_QUERY",
      entityType: "ClientQuery",
      entityId: clientQuery._id,
      client: clientQuery.client,
      staff: replyingStaff?._id || clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      title: "Reply added to client query",
      description: `${req.user.role} replied to query: ${clientQuery.subject}`,
      metadata: {
        subject: clientQuery.subject,
        replyByRole: req.user.role,
        oldStatus,
        newStatus: clientQuery.status,
        lastReplyAt: clientQuery.lastReplyAt,
        replyMessage: message.trim(),
      },
    });

    if (req.user.role === "CLIENT") {
      await notifyAdmins({
        req,
        title: "Client replied to query",
        message: `Client replied to query: ${clientQuery.subject}`,
        type: "Info",
        entityId: clientQuery._id,
        client: clientQuery.client,
        staff: clientQuery.assignedStaff || null,
        assignment: clientQuery.assignment || null,
        metadata: {
          subject: clientQuery.subject,
          oldStatus,
          newStatus: clientQuery.status,
          lastReplyAt: clientQuery.lastReplyAt,
          replyByRole: req.user.role,
        },
      });

      const staffId = await getQueryStaffId(clientQuery);

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Client replied to query",
          message: `Client replied to query: ${clientQuery.subject}`,
          type: "Info",
          entityId: clientQuery._id,
          client: clientQuery.client,
          assignment: clientQuery.assignment || null,
          metadata: {
            subject: clientQuery.subject,
            oldStatus,
            newStatus: clientQuery.status,
            lastReplyAt: clientQuery.lastReplyAt,
            replyByRole: req.user.role,
          },
        });
      }
    }

    if (req.user.role === "STAFF" || req.user.role === "ADMIN") {
      await notifyClient({
        req,
        clientId: clientQuery.client,
        title: "Reply received on query",
        message: `${req.user.role} replied to your query: ${clientQuery.subject}`,
        type: "Info",
        entityId: clientQuery._id,
        staff: replyingStaff?._id || clientQuery.assignedStaff || null,
        assignment: clientQuery.assignment || null,
        metadata: {
          subject: clientQuery.subject,
          oldStatus,
          newStatus: clientQuery.status,
          lastReplyAt: clientQuery.lastReplyAt,
          replyByRole: req.user.role,
        },
      });
    }

    const updatedQuery = await populateClientQuery(
      ClientQuery.findById(clientQuery._id)
    );

    return res.status(200).json({
      success: true,
      message: "Reply added successfully.",
      query: updatedQuery,
    });
  } catch (error) {
    console.error("Add Query Reply Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding reply.",
    });
  }
};

const updateQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedStaffId, priority } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid query ID.",
      });
    }

    const allowedStatuses = [
      "Open",
      "In Progress",
      "Waiting for Client",
      "Resolved",
      "Closed",
    ];

    const allowedPriorities = ["Low", "Medium", "High", "Urgent"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid query status.",
      });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority.",
      });
    }

    const clientQuery = await ClientQuery.findById(id);

    if (!clientQuery) {
      return res.status(404).json({
        success: false,
        message: "Query not found.",
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

      const staffHasClient = await Assignment.findOne({
        client: clientQuery.client,
        staff: staff._id,
      });

      if (
        String(clientQuery.assignedStaff || "") !== String(staff._id) &&
        !staffHasClient
      ) {
        return res.status(403).json({
          success: false,
          message: "This query is not related to your assigned client.",
        });
      }
    }

    const oldStatus = clientQuery.status;
    const oldPriority = clientQuery.priority;
    const oldAssignedStaff = clientQuery.assignedStaff;
    const oldResolvedAt = clientQuery.resolvedAt;
    const oldClosedAt = clientQuery.closedAt;

    if (status !== undefined) {
      clientQuery.status = status;

      if (status === "Resolved") {
        clientQuery.resolvedAt = new Date();
      } else {
        clientQuery.resolvedAt = null;
      }

      if (status === "Closed") {
        clientQuery.closedAt = new Date();
      } else {
        clientQuery.closedAt = null;
      }
    }

    if (priority !== undefined) {
      clientQuery.priority = priority;
    }

    if (req.user.role === "ADMIN" && assignedStaffId !== undefined) {
      const cleanAssignedStaffId = cleanOptionalObjectId(assignedStaffId);

      if (!cleanAssignedStaffId) {
        clientQuery.assignedStaff = null;
      } else {
        if (!isValidObjectId(cleanAssignedStaffId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid assigned staff ID.",
          });
        }

        const staff = await Staff.findById(cleanAssignedStaffId);

        if (!staff) {
          return res.status(404).json({
            success: false,
            message: "Assigned staff not found.",
          });
        }

        clientQuery.assignedStaff = staff._id;
      }
    }

    await clientQuery.save();

    await recordActivity({
      req,
      action: "UPDATE_CLIENT_QUERY",
      module: "CLIENT_QUERY",
      entityType: "ClientQuery",
      entityId: clientQuery._id,
      client: clientQuery.client,
      staff: updatingStaff?._id || clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      title: "Client query updated",
      description: `Client query updated: ${clientQuery.subject}`,
      metadata: {
        subject: clientQuery.subject,
        oldStatus,
        newStatus: clientQuery.status,
        oldPriority,
        newPriority: clientQuery.priority,
        oldAssignedStaff,
        newAssignedStaff: clientQuery.assignedStaff,
        oldResolvedAt,
        newResolvedAt: clientQuery.resolvedAt,
        oldClosedAt,
        newClosedAt: clientQuery.closedAt,
        updatedByRole: req.user.role,
      },
    });

    const staffId = await getQueryStaffId(clientQuery);

    if (req.user.role === "ADMIN") {
      await notifyClient({
        req,
        clientId: clientQuery.client,
        title: "Query status updated",
        message: `Your query status is now ${clientQuery.status}: ${clientQuery.subject}`,
        type:
          clientQuery.status === "Resolved" || clientQuery.status === "Closed"
            ? "Success"
            : "Info",
        entityId: clientQuery._id,
        staff: clientQuery.assignedStaff || null,
        assignment: clientQuery.assignment || null,
        metadata: {
          subject: clientQuery.subject,
          oldStatus,
          newStatus: clientQuery.status,
          oldPriority,
          newPriority: clientQuery.priority,
          updatedByRole: req.user.role,
        },
      });

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Client query updated by admin",
          message: `Admin updated query: ${clientQuery.subject}`,
          type:
            clientQuery.status === "Resolved" || clientQuery.status === "Closed"
              ? "Success"
              : "Info",
          entityId: clientQuery._id,
          client: clientQuery.client,
          assignment: clientQuery.assignment || null,
          metadata: {
            subject: clientQuery.subject,
            oldStatus,
            newStatus: clientQuery.status,
            oldPriority,
            newPriority: clientQuery.priority,
            updatedByRole: req.user.role,
          },
        });
      }
    }

    if (req.user.role === "STAFF") {
      await notifyClient({
        req,
        clientId: clientQuery.client,
        title: "Query status updated",
        message: `Your query status is now ${clientQuery.status}: ${clientQuery.subject}`,
        type:
          clientQuery.status === "Resolved" || clientQuery.status === "Closed"
            ? "Success"
            : "Info",
        entityId: clientQuery._id,
        staff: updatingStaff?._id || clientQuery.assignedStaff || null,
        assignment: clientQuery.assignment || null,
        metadata: {
          subject: clientQuery.subject,
          oldStatus,
          newStatus: clientQuery.status,
          oldPriority,
          newPriority: clientQuery.priority,
          updatedByRole: req.user.role,
        },
      });

      await notifyAdmins({
        req,
        title: "Client query updated by staff",
        message: `Staff updated query: ${clientQuery.subject}`,
        type:
          clientQuery.status === "Resolved" || clientQuery.status === "Closed"
            ? "Success"
            : "Info",
        entityId: clientQuery._id,
        client: clientQuery.client,
        staff: updatingStaff?._id || clientQuery.assignedStaff || null,
        assignment: clientQuery.assignment || null,
        metadata: {
          subject: clientQuery.subject,
          oldStatus,
          newStatus: clientQuery.status,
          oldPriority,
          newPriority: clientQuery.priority,
          updatedByRole: req.user.role,
        },
      });
    }

    const updatedQuery = await populateClientQuery(
      ClientQuery.findById(clientQuery._id)
    );

    return res.status(200).json({
      success: true,
      message: "Query updated successfully.",
      query: updatedQuery,
    });
  } catch (error) {
    console.error("Update Query Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating query.",
    });
  }
};

const deleteQueryByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid query ID.",
      });
    }

    const clientQuery = await ClientQuery.findById(id);

    if (!clientQuery) {
      return res.status(404).json({
        success: false,
        message: "Query not found.",
      });
    }

    await recordActivity({
      req,
      action: "DELETE_CLIENT_QUERY",
      module: "CLIENT_QUERY",
      entityType: "ClientQuery",
      entityId: clientQuery._id,
      client: clientQuery.client,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      title: "Client query deleted",
      description: `Client query deleted: ${clientQuery.subject}`,
      metadata: {
        subject: clientQuery.subject,
        message: clientQuery.message,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        createdByRole: clientQuery.createdByRole,
        repliesCount: clientQuery.replies?.length || 0,
      },
    });

    await notifyClient({
      req,
      clientId: clientQuery.client,
      title: "Client query deleted",
      message: `Your query has been deleted by admin: ${clientQuery.subject}`,
      type: "Warning",
      entityId: clientQuery._id,
      staff: clientQuery.assignedStaff || null,
      assignment: clientQuery.assignment || null,
      metadata: {
        subject: clientQuery.subject,
        category: clientQuery.category,
        priority: clientQuery.priority,
        status: clientQuery.status,
        deletedByRole: req.user.role,
      },
    });

    if (clientQuery.assignedStaff) {
      await notifyStaff({
        req,
        staffId: clientQuery.assignedStaff,
        title: "Client query deleted",
        message: `Client query deleted by admin: ${clientQuery.subject}`,
        type: "Warning",
        entityId: clientQuery._id,
        client: clientQuery.client,
        assignment: clientQuery.assignment || null,
        metadata: {
          subject: clientQuery.subject,
          category: clientQuery.category,
          priority: clientQuery.priority,
          status: clientQuery.status,
          deletedByRole: req.user.role,
        },
      });
    }

    await clientQuery.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Query deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Query Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting query.",
    });
  }
};

module.exports = {
  createQueryByClient,
  createQueryByStaff,
  createQueryByAdmin,
  getAllQueriesForAdmin,
  getMyClientQueries,
  getMyStaffQueries,
  addReplyToQuery,
  updateQueryStatus,
  deleteQueryByAdmin,
};
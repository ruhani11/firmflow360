const Client = require("../models/Client");
const Staff = require("../models/Staff");
const Assignment = require("../models/Assignment");
const Document = require("../models/Document");
const ClientFile = require("../models/ClientFile");
const ClientQuery = require("../models/ClientQuery");
const InternalQuery = require("../models/InternalQuery");

const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      totalClients,
      activeClients,
      totalStaff,
      activeStaff,
      onlineStaff,
      totalAssignments,
      pendingAssignments,
      inProgressAssignments,
      completedAssignments,
      totalDocuments,
      pendingDocuments,
      approvedDocuments,
      wrongDocuments,
      rejectedDocuments,
      totalClientFiles,
      clientFilesPendingApproval,
      clientFilesShared,
      clientFilesCorrectionRequired,
      openClientQueries,
      inProgressClientQueries,
      waitingClientQueries,
      resolvedClientQueries,
      openInternalQueries,
      inProgressInternalQueries,
      resolvedInternalQueries,
      closedInternalQueries,
    ] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ portalStatus: "Active" }),

      Staff.countDocuments(),
      Staff.countDocuments({ status: "Active" }),
      Staff.countDocuments({ onlineStatus: "Online" }),

      Assignment.countDocuments(),
      Assignment.countDocuments({ status: "Pending" }),
      Assignment.countDocuments({ status: "In Progress" }),
      Assignment.countDocuments({ status: "Completed" }),

      Document.countDocuments(),
      Document.countDocuments({ status: { $in: ["Pending", "Uploaded", "Under Review"] } }),
      Document.countDocuments({ status: "Approved" }),
      Document.countDocuments({ status: "Wrong Document" }),
      Document.countDocuments({ status: "Rejected" }),

      ClientFile.countDocuments(),
      ClientFile.countDocuments({ status: "Pending Admin Approval" }),
      ClientFile.countDocuments({ status: "Shared with Client" }),
      ClientFile.countDocuments({ status: "Correction Required" }),

      ClientQuery.countDocuments({ status: "Open" }),
      ClientQuery.countDocuments({ status: "In Progress" }),
      ClientQuery.countDocuments({ status: "Waiting for Client" }),
      ClientQuery.countDocuments({ status: "Resolved" }),

      InternalQuery.countDocuments({ status: "Open" }),
      InternalQuery.countDocuments({ status: "In Progress" }),
      InternalQuery.countDocuments({ status: "Resolved" }),
      InternalQuery.countDocuments({ status: "Closed" }),
    ]);

    const recentAssignments = await Assignment.find()
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
      .sort({ createdAt: -1 })
      .limit(5);

    const recentDocuments = await Document.find()
      .populate({
        path: "client",
        populate: {
          path: "user",
          select: "name email role status",
        },
      })
      .populate("assignment", "serviceName period status")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentClientFiles = await ClientFile.find()
      .populate({
        path: "client",
        populate: {
          path: "user",
          select: "name email role status",
        },
      })
      .populate("assignment", "serviceName period status")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentClientQueries = await ClientQuery.find()
      .populate({
        path: "client",
        populate: {
          path: "user",
          select: "name email role status",
        },
      })
      .populate("assignment", "serviceName period status")
      .populate({
        path: "assignedStaff",
        populate: {
          path: "user",
          select: "name email role status",
        },
      })
      .sort({ updatedAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      dashboard: "ADMIN",
      stats: {
        clients: {
          total: totalClients,
          active: activeClients,
        },
        staff: {
          total: totalStaff,
          active: activeStaff,
          online: onlineStaff,
        },
        assignments: {
          total: totalAssignments,
          pending: pendingAssignments,
          inProgress: inProgressAssignments,
          completed: completedAssignments,
        },
        documents: {
          total: totalDocuments,
          pendingOrUnderReview: pendingDocuments,
          approved: approvedDocuments,
          wrong: wrongDocuments,
          rejected: rejectedDocuments,
        },
        clientFiles: {
          total: totalClientFiles,
          pendingApproval: clientFilesPendingApproval,
          sharedWithClient: clientFilesShared,
          correctionRequired: clientFilesCorrectionRequired,
        },
        clientQueries: {
          open: openClientQueries,
          inProgress: inProgressClientQueries,
          waitingForClient: waitingClientQueries,
          resolved: resolvedClientQueries,
        },
        internalQueries: {
          open: openInternalQueries,
          inProgress: inProgressInternalQueries,
          resolved: resolvedInternalQueries,
          closed: closedInternalQueries,
        },
      },
      recent: {
        assignments: recentAssignments,
        documents: recentDocuments,
        clientFiles: recentClientFiles,
        clientQueries: recentClientQueries,
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching admin dashboard stats.",
    });
  }
};

const getStaffDashboardStats = async (req, res) => {
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

    const [
      myAssignments,
      myPendingAssignments,
      myInProgressAssignments,
      myCompletedAssignments,
      myClientDocuments,
      myPendingDocuments,
      myApprovedDocuments,
      myWrongDocuments,
      myClientFiles,
      myPendingClientFiles,
      mySharedClientFiles,
      myClientQueries,
      myOpenClientQueries,
      myInternalQueries,
      myOpenInternalQueries,
    ] = await Promise.all([
      Assignment.countDocuments({ staff: staff._id }),
      Assignment.countDocuments({ staff: staff._id, status: "Pending" }),
      Assignment.countDocuments({ staff: staff._id, status: "In Progress" }),
      Assignment.countDocuments({ staff: staff._id, status: "Completed" }),

      Document.countDocuments({ client: { $in: clientIds } }),
      Document.countDocuments({
        client: { $in: clientIds },
        status: { $in: ["Pending", "Uploaded", "Under Review"] },
      }),
      Document.countDocuments({
        client: { $in: clientIds },
        status: "Approved",
      }),
      Document.countDocuments({
        client: { $in: clientIds },
        status: "Wrong Document",
      }),

      ClientFile.countDocuments({ client: { $in: clientIds } }),
      ClientFile.countDocuments({
        client: { $in: clientIds },
        status: "Pending Admin Approval",
      }),
      ClientFile.countDocuments({
        client: { $in: clientIds },
        status: "Shared with Client",
      }),

      ClientQuery.countDocuments({
        $or: [{ assignedStaff: staff._id }, { client: { $in: clientIds } }],
      }),
      ClientQuery.countDocuments({
        $or: [{ assignedStaff: staff._id }, { client: { $in: clientIds } }],
        status: { $in: ["Open", "In Progress", "Waiting for Client"] },
      }),

      InternalQuery.countDocuments({
        $or: [{ assignedToStaff: staff._id }, { raisedByUser: req.user.id }],
      }),
      InternalQuery.countDocuments({
        $or: [{ assignedToStaff: staff._id }, { raisedByUser: req.user.id }],
        status: { $in: ["Open", "In Progress", "Waiting"] },
      }),
    ]);

    const recentAssignments = await Assignment.find({ staff: staff._id })
      .populate({
        path: "client",
        populate: {
          path: "user",
          select: "name email role status",
        },
      })
      .sort({ updatedAt: -1 })
      .limit(5);

    const recentClientQueries = await ClientQuery.find({
      $or: [{ assignedStaff: staff._id }, { client: { $in: clientIds } }],
    })
      .populate({
        path: "client",
        populate: {
          path: "user",
          select: "name email role status",
        },
      })
      .populate("assignment", "serviceName period status")
      .sort({ updatedAt: -1 })
      .limit(5);

    const recentInternalQueries = await InternalQuery.find({
      $or: [{ assignedToStaff: staff._id }, { raisedByUser: req.user.id }],
    })
      .populate({
        path: "relatedClient",
        populate: {
          path: "user",
          select: "name email role status",
        },
      })
      .populate("relatedAssignment", "serviceName period status")
      .sort({ updatedAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      dashboard: "STAFF",
      staff,
      stats: {
        assignments: {
          total: myAssignments,
          pending: myPendingAssignments,
          inProgress: myInProgressAssignments,
          completed: myCompletedAssignments,
        },
        documents: {
          total: myClientDocuments,
          pendingOrUnderReview: myPendingDocuments,
          approved: myApprovedDocuments,
          wrong: myWrongDocuments,
        },
        clientFiles: {
          total: myClientFiles,
          pendingApproval: myPendingClientFiles,
          sharedWithClient: mySharedClientFiles,
        },
        clientQueries: {
          total: myClientQueries,
          active: myOpenClientQueries,
        },
        internalQueries: {
          total: myInternalQueries,
          active: myOpenInternalQueries,
        },
      },
      recent: {
        assignments: recentAssignments,
        clientQueries: recentClientQueries,
        internalQueries: recentInternalQueries,
      },
    });
  } catch (error) {
    console.error("Staff Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff dashboard stats.",
    });
  }
};

const getClientDashboardStats = async (req, res) => {
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

    const [
      myServices,
      myPendingServices,
      myInProgressServices,
      myCompletedServices,
      myDocuments,
      myPendingDocuments,
      myApprovedDocuments,
      myWrongDocuments,
      myFiles,
      myOpenQueries,
      myResolvedQueries,
      myClosedQueries,
    ] = await Promise.all([
      Assignment.countDocuments({ client: client._id }),
      Assignment.countDocuments({ client: client._id, status: "Pending" }),
      Assignment.countDocuments({ client: client._id, status: "In Progress" }),
      Assignment.countDocuments({ client: client._id, status: "Completed" }),

      Document.countDocuments({ client: client._id }),
      Document.countDocuments({
        client: client._id,
        status: { $in: ["Pending", "Uploaded", "Under Review"] },
      }),
      Document.countDocuments({ client: client._id, status: "Approved" }),
      Document.countDocuments({ client: client._id, status: "Wrong Document" }),

      ClientFile.countDocuments({
        client: client._id,
        status: { $in: ["Approved", "Shared with Client"] },
      }),

      ClientQuery.countDocuments({
        client: client._id,
        status: { $in: ["Open", "In Progress", "Waiting for Client"] },
      }),
      ClientQuery.countDocuments({
        client: client._id,
        status: "Resolved",
      }),
      ClientQuery.countDocuments({
        client: client._id,
        status: "Closed",
      }),
    ]);

    const recentServices = await Assignment.find({ client: client._id })
      .populate({
        path: "staff",
        populate: {
          path: "user",
          select: "name email role status",
        },
      })
      .sort({ updatedAt: -1 })
      .limit(5);

    const recentDocuments = await Document.find({ client: client._id })
      .populate("assignment", "serviceName period status")
      .sort({ updatedAt: -1 })
      .limit(5);

    const recentFiles = await ClientFile.find({
      client: client._id,
      status: { $in: ["Approved", "Shared with Client"] },
    })
      .populate("assignment", "serviceName period status")
      .sort({ updatedAt: -1 })
      .limit(5);

    const recentQueries = await ClientQuery.find({ client: client._id })
      .populate("assignment", "serviceName period status")
      .sort({ updatedAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      dashboard: "CLIENT",
      client,
      stats: {
        services: {
          total: myServices,
          pending: myPendingServices,
          inProgress: myInProgressServices,
          completed: myCompletedServices,
        },
        documents: {
          total: myDocuments,
          pendingOrUnderReview: myPendingDocuments,
          approved: myApprovedDocuments,
          wrong: myWrongDocuments,
        },
        files: {
          available: myFiles,
        },
        queries: {
          active: myOpenQueries,
          resolved: myResolvedQueries,
          closed: myClosedQueries,
        },
      },
      recent: {
        services: recentServices,
        documents: recentDocuments,
        files: recentFiles,
        queries: recentQueries,
      },
    });
  } catch (error) {
    console.error("Client Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching client dashboard stats.",
    });
  }
};

module.exports = {
  getAdminDashboardStats,
  getStaffDashboardStats,
  getClientDashboardStats,
};
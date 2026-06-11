const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const ClientFile = require("../models/ClientFile");
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

const deletePhysicalFile = (filePath) => {
  if (!filePath) return;

  const cleanPath = filePath.startsWith("/")
    ? filePath.substring(1)
    : filePath;

  const fullPath = path.join(__dirname, "..", cleanPath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

const deleteUploadedRequestFile = (req) => {
  if (!req.file) return;
  deletePhysicalFile(`/uploads/client-files/${req.file.filename}`);
};

const populateClientFile = (query) => {
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
      select: "serviceName period priority status dueDate completionPercent staff client",
    })
    .populate({
      path: "uploadedByStaff",
      populate: {
        path: "user",
        select: "name email role status",
      },
    });
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

const getClientFileStaffId = async (clientFile) => {
  if (clientFile?.uploadedByStaff) {
    return clientFile.uploadedByStaff;
  }

  if (clientFile?.assignment) {
    return getAssignmentStaffId(clientFile.assignment);
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
    module: "CLIENT_FILE",
    type,
    entityType: "ClientFile",
    entityId,
    client,
    staff,
    assignment,
    link: `/client-files/${entityId}`,
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
      module: "CLIENT_FILE",
      type,
      entityType: "ClientFile",
      entityId,
      client: clientId,
      staff,
      assignment,
      link: `/client/files/${entityId}`,
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
      module: "CLIENT_FILE",
      type,
      entityType: "ClientFile",
      entityId,
      client,
      staff: staffId,
      assignment,
      link: `/staff/client-files/${entityId}`,
      metadata,
    },
  ]);
};

const uploadClientFileByStaff = async (req, res) => {
  try {
    let {
      clientId,
      assignmentId,
      fileTitle,
      fileCategory,
      serviceName,
      period,
      remarks,
    } = req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);

    if (!clientId || !fileTitle || !fileCategory) {
      deleteUploadedRequestFile(req);

      return res.status(400).json({
        success: false,
        message: "Client, file title and file category are required.",
      });
    }

    if (!isValidObjectId(clientId)) {
      deleteUploadedRequestFile(req);

      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required.",
      });
    }

    const staff = await Staff.findOne({ user: req.user.id });

    if (!staff) {
      deleteUploadedRequestFile(req);

      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      deleteUploadedRequestFile(req);

      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    let assignment = null;

    if (assignmentId) {
      if (!isValidObjectId(assignmentId)) {
        deleteUploadedRequestFile(req);

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
        deleteUploadedRequestFile(req);

        return res.status(403).json({
          success: false,
          message: "This assignment is not assigned to this staff.",
        });
      }
    } else {
      const staffHasClient = await Assignment.findOne({
        client: clientId,
        staff: staff._id,
      });

      if (!staffHasClient) {
        deleteUploadedRequestFile(req);

        return res.status(403).json({
          success: false,
          message: "This client is not assigned to this staff.",
        });
      }
    }

    const trimmedFileTitle = fileTitle.trim();
    const trimmedFileCategory = fileCategory.trim();

    const duplicateFile = await ClientFile.findOne({
      client: clientId,
      assignment: assignment ? assignment._id : null,
      fileTitle: trimmedFileTitle,
      fileCategory: trimmedFileCategory,
      status: { $ne: "Archived" },
    });

    if (duplicateFile) {
      deleteUploadedRequestFile(req);

      return res.status(409).json({
        success: false,
        message:
          "This client file already exists. Please replace existing file instead of uploading duplicate.",
        existingFileId: duplicateFile._id,
      });
    }

    const clientFile = await ClientFile.create({
      client: clientId,
      assignment: assignment ? assignment._id : null,
      uploadedByStaff: staff._id,
      fileTitle: trimmedFileTitle,
      fileCategory: trimmedFileCategory,
      serviceName: serviceName?.trim() || assignment?.serviceName,
      period: period?.trim() || assignment?.period,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/client-files/${req.file.filename}`,
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: "Office Staff",
      status: "Pending Admin Approval",
      remarks: remarks?.trim(),
      sharedAt: null,
    });

    await recordActivity({
      req,
      action: "UPLOAD_CLIENT_FILE_BY_STAFF",
      module: "CLIENT_FILE",
      entityType: "ClientFile",
      entityId: clientFile._id,
      client: clientFile.client,
      staff: staff._id,
      assignment: clientFile.assignment || null,
      title: "Client deliverable uploaded by staff",
      description: `Staff uploaded client deliverable: ${clientFile.fileTitle}`,
      metadata: {
        fileTitle: clientFile.fileTitle,
        fileCategory: clientFile.fileCategory,
        serviceName: clientFile.serviceName,
        period: clientFile.period,
        originalName: clientFile.originalName,
        fileName: clientFile.fileName,
        filePath: clientFile.filePath,
        uploadedBy: clientFile.uploadedBy,
        status: clientFile.status,
      },
    });

    await notifyAdmins({
      req,
      title: "Client deliverable uploaded by staff",
      message: `${clientFile.fileTitle} uploaded by staff and sent for admin approval.`,
      type: "Info",
      entityId: clientFile._id,
      client: clientFile.client,
      staff: staff._id,
      assignment: clientFile.assignment || null,
      metadata: {
        fileTitle: clientFile.fileTitle,
        fileCategory: clientFile.fileCategory,
        originalName: clientFile.originalName,
        status: clientFile.status,
        uploadedBy: clientFile.uploadedBy,
      },
    });

    const populatedClientFile = await populateClientFile(
      ClientFile.findById(clientFile._id)
    );

    return res.status(201).json({
      success: true,
      message: "Client deliverable uploaded successfully by Staff.",
      clientFile: populatedClientFile,
    });
  } catch (error) {
    console.error("Staff Upload Client File Error:", error);

    deleteUploadedRequestFile(req);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Something went wrong while uploading client file.",
    });
  }
};

const uploadClientFileByAdmin = async (req, res) => {
  try {
    let {
      clientId,
      assignmentId,
      fileTitle,
      fileCategory,
      serviceName,
      period,
      status,
      remarks,
      adminRemark,
    } = req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);

    if (!clientId || !fileTitle || !fileCategory) {
      deleteUploadedRequestFile(req);

      return res.status(400).json({
        success: false,
        message: "Client, file title and file category are required.",
      });
    }

    if (!isValidObjectId(clientId)) {
      deleteUploadedRequestFile(req);

      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required.",
      });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      deleteUploadedRequestFile(req);

      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    let assignment = null;

    if (assignmentId) {
      if (!isValidObjectId(assignmentId)) {
        deleteUploadedRequestFile(req);

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
        deleteUploadedRequestFile(req);

        return res.status(403).json({
          success: false,
          message: "This assignment does not belong to this client.",
        });
      }
    }

    const allowedStatuses = [
      "Pending Admin Approval",
      "Correction Required",
      "Approved",
      "Shared with Client",
      "Archived",
    ];

    const finalStatus = status || "Shared with Client";

    if (!allowedStatuses.includes(finalStatus)) {
      deleteUploadedRequestFile(req);

      return res.status(400).json({
        success: false,
        message: "Invalid client file status.",
      });
    }

    const trimmedFileTitle = fileTitle.trim();
    const trimmedFileCategory = fileCategory.trim();

    const duplicateFile = await ClientFile.findOne({
      client: clientId,
      assignment: assignment ? assignment._id : null,
      fileTitle: trimmedFileTitle,
      fileCategory: trimmedFileCategory,
      status: { $ne: "Archived" },
    });

    if (duplicateFile) {
      deleteUploadedRequestFile(req);

      return res.status(409).json({
        success: false,
        message:
          "This client file already exists. Please replace existing file instead of uploading duplicate.",
        existingFileId: duplicateFile._id,
      });
    }

    const clientFile = await ClientFile.create({
      client: clientId,
      assignment: assignment ? assignment._id : null,
      uploadedByStaff: null,
      fileTitle: trimmedFileTitle,
      fileCategory: trimmedFileCategory,
      serviceName: serviceName?.trim() || assignment?.serviceName,
      period: period?.trim() || assignment?.period,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/client-files/${req.file.filename}`,
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: "Admin",
      status: finalStatus,
      remarks: remarks?.trim(),
      adminRemark: adminRemark?.trim(),
      sharedAt:
        finalStatus === "Approved" || finalStatus === "Shared with Client"
          ? new Date()
          : null,
    });

    await recordActivity({
      req,
      action: "UPLOAD_CLIENT_FILE_BY_ADMIN",
      module: "CLIENT_FILE",
      entityType: "ClientFile",
      entityId: clientFile._id,
      client: clientFile.client,
      assignment: clientFile.assignment || null,
      title: "Client deliverable uploaded by admin",
      description: `Admin uploaded client deliverable: ${clientFile.fileTitle}`,
      metadata: {
        fileTitle: clientFile.fileTitle,
        fileCategory: clientFile.fileCategory,
        serviceName: clientFile.serviceName,
        period: clientFile.period,
        originalName: clientFile.originalName,
        fileName: clientFile.fileName,
        filePath: clientFile.filePath,
        uploadedBy: clientFile.uploadedBy,
        status: clientFile.status,
        adminRemark: clientFile.adminRemark,
        sharedAt: clientFile.sharedAt,
      },
    });

    if (
      clientFile.status === "Approved" ||
      clientFile.status === "Shared with Client"
    ) {
      await notifyClient({
        req,
        clientId: clientFile.client,
        title: "New file shared by admin",
        message: `${clientFile.fileTitle} has been shared with you.`,
        type: "Success",
        entityId: clientFile._id,
        assignment: clientFile.assignment || null,
        metadata: {
          fileTitle: clientFile.fileTitle,
          fileCategory: clientFile.fileCategory,
          originalName: clientFile.originalName,
          status: clientFile.status,
          adminRemark: clientFile.adminRemark,
        },
      });
    }

    if (assignment?.staff) {
      await notifyStaff({
        req,
        staffId: assignment.staff,
        title: "Client deliverable uploaded by admin",
        message: `${clientFile.fileTitle} uploaded by admin for assigned client.`,
        type: "Info",
        entityId: clientFile._id,
        client: clientFile.client,
        assignment: clientFile.assignment || null,
        metadata: {
          fileTitle: clientFile.fileTitle,
          fileCategory: clientFile.fileCategory,
          originalName: clientFile.originalName,
          status: clientFile.status,
        },
      });
    }

    const populatedClientFile = await populateClientFile(
      ClientFile.findById(clientFile._id)
    );

    return res.status(201).json({
      success: true,
      message: "Client deliverable uploaded successfully by Admin.",
      clientFile: populatedClientFile,
    });
  } catch (error) {
    console.error("Admin Upload Client File Error:", error);

    deleteUploadedRequestFile(req);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Something went wrong while uploading client file.",
    });
  }
};

const getAllClientFilesForAdmin = async (req, res) => {
  try {
    const clientFiles = await populateClientFile(
      ClientFile.find().sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: clientFiles.length,
      clientFiles,
    });
  } catch (error) {
    console.error("Get Admin Client Files Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching client files.",
    });
  }
};

const getMyClientFiles = async (req, res) => {
  try {
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const clientFiles = await populateClientFile(
      ClientFile.find({
        client: client._id,
        status: { $in: ["Approved", "Shared with Client"] },
      }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: clientFiles.length,
      clientFiles,
    });
  } catch (error) {
    console.error("Get Client Files Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching client files.",
    });
  }
};

const getMyStaffClientFiles = async (req, res) => {
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

    const clientFiles = await populateClientFile(
      ClientFile.find({
        client: { $in: clientIds },
      }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: clientFiles.length,
      clientFiles,
    });
  } catch (error) {
    console.error("Get Staff Client Files Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff client files.",
    });
  }
};

const updateClientFileStatusByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client file ID.",
      });
    }

    const allowedStatuses = [
      "Pending Admin Approval",
      "Correction Required",
      "Approved",
      "Shared with Client",
      "Archived",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client file status.",
      });
    }

    const clientFile = await ClientFile.findById(id);

    if (!clientFile) {
      return res.status(404).json({
        success: false,
        message: "Client file not found.",
      });
    }

    const oldStatus = clientFile.status;
    const oldSharedAt = clientFile.sharedAt;

    clientFile.status = status;

    if (adminRemark !== undefined) {
      clientFile.adminRemark = adminRemark;
    }

    if (status === "Approved" || status === "Shared with Client") {
      clientFile.sharedAt = new Date();
    } else {
      clientFile.sharedAt = null;
    }

    await clientFile.save();

    await recordActivity({
      req,
      action: "UPDATE_CLIENT_FILE_STATUS",
      module: "CLIENT_FILE",
      entityType: "ClientFile",
      entityId: clientFile._id,
      client: clientFile.client,
      staff: clientFile.uploadedByStaff || null,
      assignment: clientFile.assignment || null,
      title: "Client file status updated",
      description: `Client file status changed from ${oldStatus} to ${clientFile.status}`,
      metadata: {
        fileTitle: clientFile.fileTitle,
        fileCategory: clientFile.fileCategory,
        oldStatus,
        newStatus: clientFile.status,
        oldSharedAt,
        newSharedAt: clientFile.sharedAt,
        adminRemark: clientFile.adminRemark,
        originalName: clientFile.originalName,
      },
    });

    if (
      clientFile.status === "Approved" ||
      clientFile.status === "Shared with Client"
    ) {
      await notifyClient({
        req,
        clientId: clientFile.client,
        title: "File shared with client",
        message: `${clientFile.fileTitle} has been approved and shared with you.`,
        type: "Success",
        entityId: clientFile._id,
        staff: clientFile.uploadedByStaff || null,
        assignment: clientFile.assignment || null,
        metadata: {
          fileTitle: clientFile.fileTitle,
          fileCategory: clientFile.fileCategory,
          oldStatus,
          newStatus: clientFile.status,
          adminRemark: clientFile.adminRemark,
        },
      });

      const staffId = await getClientFileStaffId(clientFile);

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Client file approved",
          message: `${clientFile.fileTitle} has been approved/shared by admin.`,
          type: "Success",
          entityId: clientFile._id,
          client: clientFile.client,
          assignment: clientFile.assignment || null,
          metadata: {
            fileTitle: clientFile.fileTitle,
            fileCategory: clientFile.fileCategory,
            oldStatus,
            newStatus: clientFile.status,
            adminRemark: clientFile.adminRemark,
          },
        });
      }
    }

    if (clientFile.status === "Correction Required") {
      const staffId = await getClientFileStaffId(clientFile);

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Correction required in client file",
          message: `Correction required for ${clientFile.fileTitle}.`,
          type: "Warning",
          entityId: clientFile._id,
          client: clientFile.client,
          assignment: clientFile.assignment || null,
          metadata: {
            fileTitle: clientFile.fileTitle,
            fileCategory: clientFile.fileCategory,
            oldStatus,
            newStatus: clientFile.status,
            adminRemark: clientFile.adminRemark,
          },
        });
      }
    }

    if (clientFile.status === "Archived") {
      const staffId = await getClientFileStaffId(clientFile);

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Client file archived",
          message: `${clientFile.fileTitle} has been archived by admin.`,
          type: "Warning",
          entityId: clientFile._id,
          client: clientFile.client,
          assignment: clientFile.assignment || null,
          metadata: {
            fileTitle: clientFile.fileTitle,
            fileCategory: clientFile.fileCategory,
            oldStatus,
            newStatus: clientFile.status,
            adminRemark: clientFile.adminRemark,
          },
        });
      }
    }

    const updatedClientFile = await populateClientFile(
      ClientFile.findById(clientFile._id)
    );

    return res.status(200).json({
      success: true,
      message: "Client file status updated successfully.",
      clientFile: updatedClientFile,
    });
  } catch (error) {
    console.error("Update Client File Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating client file status.",
    });
  }
};

const replaceClientFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!isValidObjectId(id)) {
      deleteUploadedRequestFile(req);

      return res.status(400).json({
        success: false,
        message: "Invalid client file ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "New file is required.",
      });
    }

    const clientFile = await ClientFile.findById(id);

    if (!clientFile) {
      deleteUploadedRequestFile(req);

      return res.status(404).json({
        success: false,
        message: "Client file not found.",
      });
    }

    const oldStatus = clientFile.status;
    const oldFileName = clientFile.fileName;
    const oldOriginalName = clientFile.originalName;
    const oldSharedAt = clientFile.sharedAt;

    let replacingStaff = null;

    if (req.user.role === "STAFF") {
      const staff = await Staff.findOne({ user: req.user.id });
      replacingStaff = staff;

      if (!staff) {
        deleteUploadedRequestFile(req);

        return res.status(404).json({
          success: false,
          message: "Staff profile not found.",
        });
      }

      if (
        clientFile.uploadedByStaff &&
        String(clientFile.uploadedByStaff) !== String(staff._id)
      ) {
        deleteUploadedRequestFile(req);

        return res.status(403).json({
          success: false,
          message: "You can replace only your own uploaded client file.",
        });
      }

      if (clientFile.status !== "Correction Required") {
        deleteUploadedRequestFile(req);

        return res.status(400).json({
          success: false,
          message: "Only correction required files can be replaced by staff.",
        });
      }

      clientFile.status = "Pending Admin Approval";
      clientFile.sharedAt = null;
    }

    if (req.user.role === "ADMIN") {
      clientFile.status = "Shared with Client";
      clientFile.sharedAt = new Date();
    }

    deletePhysicalFile(clientFile.filePath);

    clientFile.fileName = req.file.filename;
    clientFile.originalName = req.file.originalname;
    clientFile.filePath = `/uploads/client-files/${req.file.filename}`;
    clientFile.fileMimeType = req.file.mimetype;
    clientFile.fileSize = req.file.size;
    clientFile.remarks = remarks?.trim() || clientFile.remarks;

    if (req.user.role === "STAFF") {
      clientFile.adminRemark = "";
    }

    await clientFile.save();

    await recordActivity({
      req,
      action: "REPLACE_CLIENT_FILE",
      module: "CLIENT_FILE",
      entityType: "ClientFile",
      entityId: clientFile._id,
      client: clientFile.client,
      staff: clientFile.uploadedByStaff || null,
      assignment: clientFile.assignment || null,
      title: "Client file replaced",
      description: `Client file replaced: ${clientFile.fileTitle}`,
      metadata: {
        fileTitle: clientFile.fileTitle,
        fileCategory: clientFile.fileCategory,
        oldStatus,
        newStatus: clientFile.status,
        oldFileName,
        oldOriginalName,
        newFileName: clientFile.fileName,
        newOriginalName: clientFile.originalName,
        oldSharedAt,
        newSharedAt: clientFile.sharedAt,
        replacedByRole: req.user.role,
      },
    });

    if (req.user.role === "STAFF") {
      await notifyAdmins({
        req,
        title: "Corrected client file uploaded",
        message: `${clientFile.fileTitle} has been replaced by staff and sent for admin approval.`,
        type: "Info",
        entityId: clientFile._id,
        client: clientFile.client,
        staff: replacingStaff?._id || clientFile.uploadedByStaff || null,
        assignment: clientFile.assignment || null,
        metadata: {
          fileTitle: clientFile.fileTitle,
          fileCategory: clientFile.fileCategory,
          oldStatus,
          newStatus: clientFile.status,
          newOriginalName: clientFile.originalName,
        },
      });
    }

    if (req.user.role === "ADMIN") {
      await notifyClient({
        req,
        clientId: clientFile.client,
        title: "Client file replaced and shared",
        message: `${clientFile.fileTitle} has been replaced and shared with you.`,
        type: "Success",
        entityId: clientFile._id,
        staff: clientFile.uploadedByStaff || null,
        assignment: clientFile.assignment || null,
        metadata: {
          fileTitle: clientFile.fileTitle,
          fileCategory: clientFile.fileCategory,
          oldStatus,
          newStatus: clientFile.status,
          newOriginalName: clientFile.originalName,
        },
      });

      const staffId = await getClientFileStaffId(clientFile);

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Client file replaced by admin",
          message: `${clientFile.fileTitle} has been replaced by admin.`,
          type: "Info",
          entityId: clientFile._id,
          client: clientFile.client,
          assignment: clientFile.assignment || null,
          metadata: {
            fileTitle: clientFile.fileTitle,
            fileCategory: clientFile.fileCategory,
            oldStatus,
            newStatus: clientFile.status,
          },
        });
      }
    }

    const updatedClientFile = await populateClientFile(
      ClientFile.findById(clientFile._id)
    );

    return res.status(200).json({
      success: true,
      message: "Client file replaced successfully.",
      clientFile: updatedClientFile,
    });
  } catch (error) {
    console.error("Replace Client File Error:", error);

    deleteUploadedRequestFile(req);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while replacing file.",
    });
  }
};

const deleteClientFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client file ID.",
      });
    }

    const clientFile = await ClientFile.findById(id);

    if (!clientFile) {
      return res.status(404).json({
        success: false,
        message: "Client file not found.",
      });
    }

    let deletingStaff = null;

    if (req.user.role === "STAFF") {
      const staff = await Staff.findOne({ user: req.user.id });
      deletingStaff = staff;

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff profile not found.",
        });
      }

      if (
        clientFile.uploadedByStaff &&
        String(clientFile.uploadedByStaff) !== String(staff._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can delete only your own uploaded client file.",
        });
      }

      if (
        clientFile.status === "Approved" ||
        clientFile.status === "Shared with Client"
      ) {
        return res.status(400).json({
          success: false,
          message: "Approved/shared client file cannot be deleted by staff.",
        });
      }
    }

    await recordActivity({
      req,
      action: "DELETE_CLIENT_FILE",
      module: "CLIENT_FILE",
      entityType: "ClientFile",
      entityId: clientFile._id,
      client: clientFile.client,
      staff: clientFile.uploadedByStaff || null,
      assignment: clientFile.assignment || null,
      title: "Client file deleted",
      description: `Client file deleted: ${clientFile.fileTitle}`,
      metadata: {
        fileTitle: clientFile.fileTitle,
        fileCategory: clientFile.fileCategory,
        originalName: clientFile.originalName,
        fileName: clientFile.fileName,
        filePath: clientFile.filePath,
        uploadedBy: clientFile.uploadedBy,
        status: clientFile.status,
        deletedByRole: req.user.role,
      },
    });

    if (req.user.role === "STAFF") {
      await notifyAdmins({
        req,
        title: "Client file deleted by staff",
        message: `${clientFile.fileTitle} has been deleted by staff.`,
        type: "Warning",
        entityId: clientFile._id,
        client: clientFile.client,
        staff: deletingStaff?._id || clientFile.uploadedByStaff || null,
        assignment: clientFile.assignment || null,
        metadata: {
          fileTitle: clientFile.fileTitle,
          fileCategory: clientFile.fileCategory,
          originalName: clientFile.originalName,
          status: clientFile.status,
          deletedByRole: req.user.role,
        },
      });
    }

    if (req.user.role === "ADMIN") {
      await notifyClient({
        req,
        clientId: clientFile.client,
        title: "Client file deleted by admin",
        message: `${clientFile.fileTitle} has been deleted by admin.`,
        type: "Warning",
        entityId: clientFile._id,
        staff: clientFile.uploadedByStaff || null,
        assignment: clientFile.assignment || null,
        metadata: {
          fileTitle: clientFile.fileTitle,
          fileCategory: clientFile.fileCategory,
          originalName: clientFile.originalName,
          status: clientFile.status,
          deletedByRole: req.user.role,
        },
      });

      const staffId = await getClientFileStaffId(clientFile);

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Client file deleted by admin",
          message: `${clientFile.fileTitle} has been deleted by admin.`,
          type: "Warning",
          entityId: clientFile._id,
          client: clientFile.client,
          assignment: clientFile.assignment || null,
          metadata: {
            fileTitle: clientFile.fileTitle,
            fileCategory: clientFile.fileCategory,
            originalName: clientFile.originalName,
            status: clientFile.status,
            deletedByRole: req.user.role,
          },
        });
      }
    }

    deletePhysicalFile(clientFile.filePath);

    await clientFile.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Client file deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Client File Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting client file.",
    });
  }
};

module.exports = {
  uploadClientFileByStaff,
  uploadClientFileByAdmin,
  getAllClientFilesForAdmin,
  getMyClientFiles,
  getMyStaffClientFiles,
  updateClientFileStatusByAdmin,
  replaceClientFile,
  deleteClientFile,
};
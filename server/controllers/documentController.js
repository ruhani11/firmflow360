const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Document = require("../models/Document");
const Client = require("../models/Client");
const Staff = require("../models/Staff");
const Assignment = require("../models/Assignment");
const User = require("../models/User");

const recordActivity = require("../utils/activityLogger");
const { createManyNotifications } = require("../utils/notificationService");

const populateDocument = (query) => {
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
        "serviceName period priority status dueDate completionPercent requiredDocuments staff client",
    });
};

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
    module: "DOCUMENT",
    type,
    entityType: "Document",
    entityId,
    client,
    staff,
    assignment,
    link: `/documents/${entityId}`,
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
      module: "DOCUMENT",
      type,
      entityType: "Document",
      entityId,
      client: clientId,
      staff,
      assignment,
      link: `/client/documents/${entityId}`,
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
      module: "DOCUMENT",
      type,
      entityType: "Document",
      entityId,
      client,
      staff: staffId,
      assignment,
      link: `/staff/documents/${entityId}`,
      metadata,
    },
  ]);
};

const uploadDocumentByClient = async (req, res) => {
  try {
    let { assignmentId, serviceName, period, documentType, remarks } = req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: "Document type is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required.",
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
    }

    const document = await Document.create({
      client: client._id,
      assignment: assignment ? assignment._id : null,
      serviceName: serviceName?.trim(),
      period: period?.trim(),
      documentType: documentType.trim(),
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/documents/${req.file.filename}`,
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: "Client",
      uploadSource: "Client Portal",
      status: "Under Review",
      remarks: remarks?.trim(),
    });

    await recordActivity({
      req,
      action: "UPLOAD_DOCUMENT_BY_CLIENT",
      module: "DOCUMENT",
      entityType: "Document",
      entityId: document._id,
      client: document.client,
      assignment: document.assignment || null,
      title: "Document uploaded by client",
      description: `Client uploaded document: ${document.documentType}`,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        fileName: document.fileName,
        filePath: document.filePath,
        uploadSource: document.uploadSource,
        uploadedBy: document.uploadedBy,
        status: document.status,
      },
    });

    await notifyAdmins({
      req,
      title: "New document uploaded by client",
      message: `${document.documentType} uploaded by client and sent for review.`,
      type: "Info",
      entityId: document._id,
      client: document.client,
      assignment: document.assignment || null,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        status: document.status,
      },
    });

    if (assignment?.staff) {
      await notifyStaff({
        req,
        staffId: assignment.staff,
        title: "New client document received",
        message: `${document.documentType} uploaded by client for ${assignment.serviceName}.`,
        type: "Info",
        entityId: document._id,
        client: document.client,
        assignment: document.assignment,
        metadata: {
          documentType: document.documentType,
          originalName: document.originalName,
          status: document.status,
        },
      });
    }

    const populatedDocument = await populateDocument(
      Document.findById(document._id)
    );

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully by Client.",
      document: populatedDocument,
    });
  } catch (error) {
    console.error("Client Upload Document Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while uploading document.",
    });
  }
};

const uploadDocumentByStaff = async (req, res) => {
  try {
    let {
      clientId,
      assignmentId,
      serviceName,
      period,
      documentType,
      uploadSource,
      remarks,
    } = req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);

    if (!clientId || !documentType) {
      return res.status(400).json({
        success: false,
        message: "Client and document type are required.",
      });
    }

    if (!isValidObjectId(clientId)) {
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
          message: "This assignment is not assigned to this staff.",
        });
      }
    }

    const document = await Document.create({
      client: clientId,
      assignment: assignment ? assignment._id : null,
      serviceName: serviceName?.trim(),
      period: period?.trim(),
      documentType: documentType.trim(),
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/documents/${req.file.filename}`,
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: "Office Staff",
      uploadSource: uploadSource || "WhatsApp",
      status: "Under Review",
      remarks: remarks?.trim(),
    });

    await recordActivity({
      req,
      action: "UPLOAD_DOCUMENT_BY_STAFF",
      module: "DOCUMENT",
      entityType: "Document",
      entityId: document._id,
      client: document.client,
      staff: staff._id,
      assignment: document.assignment || null,
      title: "Document uploaded by staff",
      description: `Staff uploaded document: ${document.documentType}`,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        fileName: document.fileName,
        filePath: document.filePath,
        uploadSource: document.uploadSource,
        uploadedBy: document.uploadedBy,
        status: document.status,
      },
    });

    await notifyAdmins({
      req,
      title: "Document uploaded by staff",
      message: `${document.documentType} uploaded by staff and sent for review.`,
      type: "Info",
      entityId: document._id,
      client: document.client,
      staff: staff._id,
      assignment: document.assignment || null,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        status: document.status,
        uploadSource: document.uploadSource,
      },
    });

    await notifyClient({
      req,
      clientId: document.client,
      title: "Document received by office",
      message: `${document.documentType} has been uploaded by office staff for your record.`,
      type: "Info",
      entityId: document._id,
      staff: staff._id,
      assignment: document.assignment || null,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        status: document.status,
        uploadSource: document.uploadSource,
      },
    });

    const populatedDocument = await populateDocument(
      Document.findById(document._id)
    );

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully by Staff.",
      document: populatedDocument,
    });
  } catch (error) {
    console.error("Staff Upload Document Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while uploading document.",
    });
  }
};

const uploadDocumentByAdmin = async (req, res) => {
  try {
    let {
      clientId,
      assignmentId,
      serviceName,
      period,
      documentType,
      uploadSource,
      remarks,
    } = req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);

    if (!clientId || !documentType) {
      return res.status(400).json({
        success: false,
        message: "Client and document type are required.",
      });
    }

    if (!isValidObjectId(clientId)) {
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
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: "This assignment does not belong to this client.",
        });
      }
    }

    const document = await Document.create({
      client: clientId,
      assignment: assignment ? assignment._id : null,
      serviceName: serviceName?.trim(),
      period: period?.trim(),
      documentType: documentType.trim(),
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/documents/${req.file.filename}`,
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: "Admin",
      uploadSource: uploadSource || "Offline",
      status: "Under Review",
      remarks: remarks?.trim(),
    });

    await recordActivity({
      req,
      action: "UPLOAD_DOCUMENT_BY_ADMIN",
      module: "DOCUMENT",
      entityType: "Document",
      entityId: document._id,
      client: document.client,
      assignment: document.assignment || null,
      title: "Document uploaded by admin",
      description: `Admin uploaded document: ${document.documentType}`,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        fileName: document.fileName,
        filePath: document.filePath,
        uploadSource: document.uploadSource,
        uploadedBy: document.uploadedBy,
        status: document.status,
      },
    });

    await notifyClient({
      req,
      clientId: document.client,
      title: "Document uploaded by admin",
      message: `${document.documentType} has been uploaded by admin.`,
      type: "Info",
      entityId: document._id,
      assignment: document.assignment || null,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        status: document.status,
        uploadSource: document.uploadSource,
      },
    });

    if (assignment?.staff) {
      await notifyStaff({
        req,
        staffId: assignment.staff,
        title: "Document uploaded by admin",
        message: `${document.documentType} uploaded by admin for assigned client.`,
        type: "Info",
        entityId: document._id,
        client: document.client,
        assignment: document.assignment,
        metadata: {
          documentType: document.documentType,
          originalName: document.originalName,
          status: document.status,
        },
      });
    }

    const populatedDocument = await populateDocument(
      Document.findById(document._id)
    );

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully by Admin.",
      document: populatedDocument,
    });
  } catch (error) {
    console.error("Admin Upload Document Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while uploading document.",
    });
  }
};

const getAllDocumentsForAdmin = async (req, res) => {
  try {
    const documents = await populateDocument(
      Document.find().sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Get Admin Documents Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching documents.",
    });
  }
};

const getMyClientDocuments = async (req, res) => {
  try {
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const documents = await populateDocument(
      Document.find({ client: client._id }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Get Client Documents Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching client documents.",
    });
  }
};

const getMyStaffClientDocuments = async (req, res) => {
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

    const documents = await populateDocument(
      Document.find({ client: { $in: clientIds } }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Get Staff Client Documents Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff client documents.",
    });
  }
};

const updateDocumentStatusByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const allowedStatuses = [
      "Pending",
      "Uploaded",
      "Under Review",
      "Approved",
      "Wrong Document",
      "Rejected",
    ];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document status.",
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const oldStatus = document.status;

    if (status !== undefined) {
      document.status = status;
    }

    if (adminRemark !== undefined) {
      document.adminRemark = adminRemark;
    }

    await document.save();

    await recordActivity({
      req,
      action: "UPDATE_DOCUMENT_STATUS",
      module: "DOCUMENT",
      entityType: "Document",
      entityId: document._id,
      client: document.client,
      assignment: document.assignment || null,
      title: "Document status updated",
      description: `Document status changed from ${oldStatus} to ${document.status}`,
      metadata: {
        documentType: document.documentType,
        oldStatus,
        newStatus: document.status,
        adminRemark: document.adminRemark,
        originalName: document.originalName,
      },
    });

    let notificationType = "Info";
    let notificationTitle = "Document status updated";

    if (document.status === "Approved") {
      notificationType = "Success";
      notificationTitle = "Document approved";
    }

    if (document.status === "Wrong Document" || document.status === "Rejected") {
      notificationType = "Warning";
      notificationTitle =
        document.status === "Wrong Document"
          ? "Wrong document marked"
          : "Document rejected";
    }

    await notifyClient({
      req,
      clientId: document.client,
      title: notificationTitle,
      message: `${document.documentType} status changed from ${oldStatus} to ${document.status}.`,
      type: notificationType,
      entityId: document._id,
      assignment: document.assignment || null,
      metadata: {
        documentType: document.documentType,
        oldStatus,
        newStatus: document.status,
        adminRemark: document.adminRemark,
      },
    });

    const staffId = await getAssignmentStaffId(document.assignment);

    if (staffId) {
      await notifyStaff({
        req,
        staffId,
        title: notificationTitle,
        message: `${document.documentType} status changed to ${document.status}.`,
        type: notificationType,
        entityId: document._id,
        client: document.client,
        assignment: document.assignment || null,
        metadata: {
          documentType: document.documentType,
          oldStatus,
          newStatus: document.status,
          adminRemark: document.adminRemark,
        },
      });
    }

    const updatedDocument = await populateDocument(
      Document.findById(document._id)
    );

    return res.status(200).json({
      success: true,
      message: "Document status updated successfully.",
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Update Document Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating document.",
    });
  }
};

const linkDocumentToAssignmentByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    let { assignmentId } = req.body;

    assignmentId = cleanOptionalObjectId(assignmentId);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required.",
      });
    }

    if (!isValidObjectId(assignmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    if (String(document.client) !== String(assignment.client)) {
      return res.status(400).json({
        success: false,
        message:
          "This document and assignment do not belong to the same client.",
      });
    }

    const oldAssignment = document.assignment;

    document.assignment = assignment._id;
    document.serviceName = assignment.serviceName;
    document.period = assignment.period;
    document.status = "Under Review";

    await document.save();

    await recordActivity({
      req,
      action: "LINK_DOCUMENT_TO_ASSIGNMENT",
      module: "DOCUMENT",
      entityType: "Document",
      entityId: document._id,
      client: document.client,
      assignment: document.assignment || null,
      title: "Document linked with assignment",
      description: `Document linked with assignment: ${document.documentType}`,
      metadata: {
        documentType: document.documentType,
        oldAssignment,
        newAssignment: assignment._id,
        serviceName: document.serviceName,
        period: document.period,
        status: document.status,
      },
    });

    await notifyClient({
      req,
      clientId: document.client,
      title: "Document linked with service",
      message: `${document.documentType} has been linked with ${assignment.serviceName}.`,
      type: "Info",
      entityId: document._id,
      assignment: document.assignment || null,
      metadata: {
        documentType: document.documentType,
        serviceName: document.serviceName,
        period: document.period,
      },
    });

    if (assignment.staff) {
      await notifyStaff({
        req,
        staffId: assignment.staff,
        title: "Document linked with assignment",
        message: `${document.documentType} linked with your assignment ${assignment.serviceName}.`,
        type: "Info",
        entityId: document._id,
        client: document.client,
        assignment: document.assignment || null,
        metadata: {
          documentType: document.documentType,
          serviceName: document.serviceName,
          period: document.period,
        },
      });
    }

    const updatedDocument = await populateDocument(
      Document.findById(document._id)
    );

    return res.status(200).json({
      success: true,
      message: "Document linked with assignment successfully.",
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Link Document Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while linking document with assignment.",
    });
  }
};

const replaceDocumentFile = async (req, res) => {
  const deleteNewUploadedFile = () => {
    if (req.file?.filename) {
      deletePhysicalFile(`/uploads/documents/${req.file.filename}`);
    }
  };

  try {
    const { id } = req.params;
    const { remarks, uploadSource } = req.body;

    if (!isValidObjectId(id)) {
      deleteNewUploadedFile();

      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "New file is required.",
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      deleteNewUploadedFile();

      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const oldFileName = document.fileName;
    const oldOriginalName = document.originalName;
    const oldStatus = document.status;

    let replacingStaff = null;

    if (req.user.role === "CLIENT") {
      const client = await Client.findOne({ user: req.user.id });

      if (!client || String(document.client) !== String(client._id)) {
        deleteNewUploadedFile();

        return res.status(403).json({
          success: false,
          message: "You can replace only your own document.",
        });
      }

      const clientAllowedReplaceStatuses = [
        "Under Review",
        "Pending",
        "Uploaded",
        "Wrong Document",
        "Rejected",
      ];

      if (!clientAllowedReplaceStatuses.includes(document.status)) {
        deleteNewUploadedFile();

        return res.status(400).json({
          success: false,
          message:
            "Only under review, pending, wrong or rejected documents can be replaced by client.",
        });
      }

      document.uploadedBy = "Client";
      document.uploadSource = "Client Portal";
    }

    if (req.user.role === "STAFF") {
      const staff = await Staff.findOne({ user: req.user.id });
      replacingStaff = staff;

      if (!staff) {
        deleteNewUploadedFile();

        return res.status(404).json({
          success: false,
          message: "Staff profile not found.",
        });
      }

      const assignment = await Assignment.findOne({
        client: document.client,
        staff: staff._id,
      });

      if (!assignment) {
        deleteNewUploadedFile();

        return res.status(403).json({
          success: false,
          message: "This client is not assigned to this staff.",
        });
      }

      document.uploadedBy = "Office Staff";
      document.uploadSource = uploadSource || "WhatsApp";
    }

    if (req.user.role === "ADMIN") {
      document.uploadedBy = "Admin";
      document.uploadSource = uploadSource || "Offline";
    }

    deletePhysicalFile(document.filePath);

    document.fileName = req.file.filename;
    document.originalName = req.file.originalname;
    document.filePath = `/uploads/documents/${req.file.filename}`;
    document.fileMimeType = req.file.mimetype;
    document.fileSize = req.file.size;
    document.status = "Under Review";
    document.remarks = remarks?.trim() || document.remarks;
    document.adminRemark = "";

    await document.save();

    await recordActivity({
      req,
      action: "REPLACE_DOCUMENT",
      module: "DOCUMENT",
      entityType: "Document",
      entityId: document._id,
      client: document.client,
      staff: replacingStaff?._id || null,
      assignment: document.assignment || null,
      title: "Document replaced",
      description: `Document replaced and sent for review again: ${document.documentType}`,
      metadata: {
        documentType: document.documentType,
        oldStatus,
        newStatus: document.status,
        oldFileName,
        oldOriginalName,
        newFileName: document.fileName,
        newOriginalName: document.originalName,
        uploadedBy: document.uploadedBy,
        uploadSource: document.uploadSource,
      },
    });

    if (req.user.role === "CLIENT") {
      await notifyAdmins({
        req,
        title: "Client replaced document",
        message: `${document.documentType} has been replaced by client and sent for review again.`,
        type: "Info",
        entityId: document._id,
        client: document.client,
        assignment: document.assignment || null,
        metadata: {
          documentType: document.documentType,
          oldStatus,
          newStatus: document.status,
          newOriginalName: document.originalName,
        },
      });

      const staffId = await getAssignmentStaffId(document.assignment);

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Client replaced document",
          message: `${document.documentType} has been replaced by client.`,
          type: "Info",
          entityId: document._id,
          client: document.client,
          assignment: document.assignment || null,
          metadata: {
            documentType: document.documentType,
            oldStatus,
            newStatus: document.status,
          },
        });
      }
    }

    if (req.user.role === "STAFF") {
      await notifyAdmins({
        req,
        title: "Staff replaced document",
        message: `${document.documentType} has been replaced by staff.`,
        type: "Info",
        entityId: document._id,
        client: document.client,
        staff: replacingStaff?._id || null,
        assignment: document.assignment || null,
        metadata: {
          documentType: document.documentType,
          oldStatus,
          newStatus: document.status,
        },
      });

      await notifyClient({
        req,
        clientId: document.client,
        title: "Document replaced by office",
        message: `${document.documentType} has been replaced by office staff.`,
        type: "Info",
        entityId: document._id,
        staff: replacingStaff?._id || null,
        assignment: document.assignment || null,
        metadata: {
          documentType: document.documentType,
          oldStatus,
          newStatus: document.status,
        },
      });
    }

    if (req.user.role === "ADMIN") {
      await notifyClient({
        req,
        clientId: document.client,
        title: "Document replaced by admin",
        message: `${document.documentType} has been replaced by admin.`,
        type: "Info",
        entityId: document._id,
        assignment: document.assignment || null,
        metadata: {
          documentType: document.documentType,
          oldStatus,
          newStatus: document.status,
        },
      });

      const staffId = await getAssignmentStaffId(document.assignment);

      if (staffId) {
        await notifyStaff({
          req,
          staffId,
          title: "Document replaced by admin",
          message: `${document.documentType} has been replaced by admin.`,
          type: "Info",
          entityId: document._id,
          client: document.client,
          assignment: document.assignment || null,
          metadata: {
            documentType: document.documentType,
            oldStatus,
            newStatus: document.status,
          },
        });
      }
    }

    const updatedDocument = await populateDocument(
      Document.findById(document._id)
    );

    return res.status(200).json({
      success: true,
      message: "Document replaced successfully and sent for review again.",
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Replace Document Error:", error);

    deleteNewUploadedFile();

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while replacing document.",
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    let deletingStaff = null;

    if (req.user.role === "CLIENT") {
      const client = await Client.findOne({ user: req.user.id });

      if (!client || String(document.client) !== String(client._id)) {
        return res.status(403).json({
          success: false,
          message: "You can delete only your own document.",
        });
      }

      if (document.status === "Approved") {
        return res.status(400).json({
          success: false,
          message: "Approved document cannot be deleted by client.",
        });
      }
    }

    if (req.user.role === "STAFF") {
      const staff = await Staff.findOne({ user: req.user.id });
      deletingStaff = staff;

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff profile not found.",
        });
      }

      const assignment = await Assignment.findOne({
        client: document.client,
        staff: staff._id,
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: "This client is not assigned to this staff.",
        });
      }

      if (document.status === "Approved") {
        return res.status(400).json({
          success: false,
          message: "Approved document cannot be deleted by staff.",
        });
      }
    }

    await recordActivity({
      req,
      action: "DELETE_DOCUMENT",
      module: "DOCUMENT",
      entityType: "Document",
      entityId: document._id,
      client: document.client,
      staff: deletingStaff?._id || null,
      assignment: document.assignment || null,
      title: "Document deleted",
      description: `Document deleted: ${document.documentType}`,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        fileName: document.fileName,
        filePath: document.filePath,
        status: document.status,
        uploadedBy: document.uploadedBy,
        uploadSource: document.uploadSource,
      },
    });

    if (req.user.role === "CLIENT" || req.user.role === "STAFF") {
      await notifyAdmins({
        req,
        title: "Document deleted",
        message: `${document.documentType} has been deleted by ${req.user.role}.`,
        type: "Warning",
        entityId: document._id,
        client: document.client,
        staff: deletingStaff?._id || null,
        assignment: document.assignment || null,
        metadata: {
          documentType: document.documentType,
          originalName: document.originalName,
          deletedByRole: req.user.role,
        },
      });
    }

    if (req.user.role === "ADMIN") {
      await notifyClient({
        req,
        clientId: document.client,
        title: "Document deleted by admin",
        message: `${document.documentType} has been deleted by admin.`,
        type: "Warning",
        entityId: document._id,
        assignment: document.assignment || null,
        metadata: {
          documentType: document.documentType,
          originalName: document.originalName,
          deletedByRole: req.user.role,
        },
      });
    }

    deletePhysicalFile(document.filePath);

    await document.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Document Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting document.",
    });
  }
};

module.exports = {
  uploadDocumentByClient,
  uploadDocumentByStaff,
  uploadDocumentByAdmin,
  getAllDocumentsForAdmin,
  getMyClientDocuments,
  getMyStaffClientDocuments,
  updateDocumentStatusByAdmin,
  linkDocumentToAssignmentByAdmin,
  replaceDocumentFile,
  deleteDocument,
};
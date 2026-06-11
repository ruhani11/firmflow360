const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Document = require("../models/Document");
const ClientFile = require("../models/ClientFile");
const Client = require("../models/Client");
const Staff = require("../models/Staff");
const Assignment = require("../models/Assignment");

const recordActivity = require("../utils/activityLogger");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getSafeFilePath = (filePath) => {
  if (!filePath) return null;

  const cleanPath = filePath.startsWith("/")
    ? filePath.substring(1)
    : filePath;

  const fullPath = path.join(__dirname, "..", cleanPath);

  return fullPath;
};

const isStaffAssignedToClient = async (userId, clientId) => {
  const staff = await Staff.findOne({ user: userId });

  if (!staff) {
    return {
      allowed: false,
      message: "Staff profile not found.",
    };
  }

  const assignment = await Assignment.findOne({
    client: clientId,
    staff: staff._id,
  });

  if (!assignment) {
    return {
      allowed: false,
      message: "This client is not assigned to this staff.",
    };
  }

  return {
    allowed: true,
    staff,
  };
};

const downloadDocument = async (req, res) => {
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

    if (req.user.role === "CLIENT") {
      const client = await Client.findOne({ user: req.user.id });

      if (!client || String(document.client) !== String(client._id)) {
        return res.status(403).json({
          success: false,
          message: "You can download only your own documents.",
        });
      }
    }

    if (req.user.role === "STAFF") {
      const staffCheck = await isStaffAssignedToClient(
        req.user.id,
        document.client
      );

      if (!staffCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: staffCheck.message,
        });
      }
    }

    const fullPath = getSafeFilePath(document.filePath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server.",
      });
    }

    await recordActivity({
      req,
      action: "DOWNLOAD_DOCUMENT",
      module: "DOWNLOAD",
      entityType: "Document",
      entityId: document._id,
      client: document.client,
      assignment: document.assignment || null,
      title: "Document downloaded",
      description: `${req.user.role} downloaded document: ${
        document.documentType || document.originalName || document.fileName
      }`,
      metadata: {
        documentType: document.documentType,
        originalName: document.originalName,
        fileName: document.fileName,
        filePath: document.filePath,
        downloadedByRole: req.user.role,
      },
    });

    const downloadName = document.originalName || document.fileName;

    return res.download(fullPath, downloadName);
  } catch (error) {
    console.error("Download Document Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while downloading document.",
    });
  }
};

const downloadClientFile = async (req, res) => {
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

    if (req.user.role === "CLIENT") {
      const client = await Client.findOne({ user: req.user.id });

      if (!client || String(clientFile.client) !== String(client._id)) {
        return res.status(403).json({
          success: false,
          message: "You can download only your own files.",
        });
      }

      if (
        clientFile.status !== "Approved" &&
        clientFile.status !== "Shared with Client"
      ) {
        return res.status(403).json({
          success: false,
          message: "This file is not yet shared with client.",
        });
      }
    }

    if (req.user.role === "STAFF") {
      const staffCheck = await isStaffAssignedToClient(
        req.user.id,
        clientFile.client
      );

      if (!staffCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: staffCheck.message,
        });
      }
    }

    const fullPath = getSafeFilePath(clientFile.filePath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server.",
      });
    }

    await recordActivity({
      req,
      action: "DOWNLOAD_CLIENT_FILE",
      module: "DOWNLOAD",
      entityType: "ClientFile",
      entityId: clientFile._id,
      client: clientFile.client,
      staff: clientFile.uploadedByStaff || null,
      assignment: clientFile.assignment || null,
      title: "Client file downloaded",
      description: `${req.user.role} downloaded client file: ${
        clientFile.fileTitle || clientFile.originalName || clientFile.fileName
      }`,
      metadata: {
        fileTitle: clientFile.fileTitle,
        fileCategory: clientFile.fileCategory,
        originalName: clientFile.originalName,
        fileName: clientFile.fileName,
        filePath: clientFile.filePath,
        status: clientFile.status,
        downloadedByRole: req.user.role,
      },
    });

    const downloadName = clientFile.originalName || clientFile.fileName;

    return res.download(fullPath, downloadName);
  } catch (error) {
    console.error("Download Client File Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while downloading client file.",
    });
  }
};

module.exports = {
  downloadDocument,
  downloadClientFile,
};
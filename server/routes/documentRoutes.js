const express = require("express");

const {
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
} = require("../controllers/documentController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");
const uploadDocument = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.use(protect);

router.post(
  "/client/upload",
  allowRoles("CLIENT"),
  uploadDocument.single("file"),
  uploadDocumentByClient
);

router.post(
  "/staff/upload",
  allowRoles("STAFF"),
  uploadDocument.single("file"),
  uploadDocumentByStaff
);

router.post(
  "/admin/upload",
  allowRoles("ADMIN"),
  uploadDocument.single("file"),
  uploadDocumentByAdmin
);

router.get("/admin/all", allowRoles("ADMIN"), getAllDocumentsForAdmin);

router.get("/client/my", allowRoles("CLIENT"), getMyClientDocuments);

router.get("/staff/my-clients", allowRoles("STAFF"), getMyStaffClientDocuments);

router.patch(
  "/admin/:id/status",
  allowRoles("ADMIN"),
  updateDocumentStatusByAdmin
);

router.patch(
  "/admin/:id/link-assignment",
  allowRoles("ADMIN"),
  linkDocumentToAssignmentByAdmin
);

router.patch(
  "/:id/replace",
  allowRoles("ADMIN", "STAFF", "CLIENT"),
  uploadDocument.single("file"),
  replaceDocumentFile
);

router.delete(
  "/:id",
  allowRoles("ADMIN", "STAFF", "CLIENT"),
  deleteDocument
);

module.exports = router;
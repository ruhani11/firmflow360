const express = require("express");

const {
  uploadClientFileByStaff,
  uploadClientFileByAdmin,
  getAllClientFilesForAdmin,
  getMyClientFiles,
  getMyStaffClientFiles,
  updateClientFileStatusByAdmin,
  replaceClientFile,
  deleteClientFile,
} = require("../controllers/clientFileController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");
const uploadClientFile = require("../middlewares/clientFileUploadMiddleware");

const router = express.Router();

router.use(protect);

router.post(
  "/staff/upload",
  allowRoles("STAFF"),
  uploadClientFile.single("file"),
  uploadClientFileByStaff
);

router.post(
  "/admin/upload",
  allowRoles("ADMIN"),
  uploadClientFile.single("file"),
  uploadClientFileByAdmin
);

router.get("/admin/all", allowRoles("ADMIN"), getAllClientFilesForAdmin);

router.get("/staff/my", allowRoles("STAFF"), getMyStaffClientFiles);

router.get("/client/my", allowRoles("CLIENT"), getMyClientFiles);

router.patch(
  "/admin/:id/status",
  allowRoles("ADMIN"),
  updateClientFileStatusByAdmin
);

router.patch(
  "/:id/replace",
  allowRoles("ADMIN", "STAFF"),
  uploadClientFile.single("file"),
  replaceClientFile
);

router.delete("/:id", allowRoles("ADMIN", "STAFF"), deleteClientFile);

module.exports = router;
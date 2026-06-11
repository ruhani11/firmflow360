const express = require("express");

const {
  getAllActivityLogsForAdmin,
  getMyStaffActivityLogs,
  getMyClientActivityLogs,
} = require("../controllers/activityLogController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/admin/all", allowRoles("ADMIN"), getAllActivityLogsForAdmin);

router.get("/staff/my", allowRoles("STAFF"), getMyStaffActivityLogs);

router.get("/client/my", allowRoles("CLIENT"), getMyClientActivityLogs);

module.exports = router;
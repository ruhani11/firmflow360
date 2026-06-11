const express = require("express");

const {
  updateMyActivity,
  logoutMyActivity,
  getMyActivity,
  getStaffMonitoringForAdmin,
} = require("../controllers/staffActivityController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/ping", allowRoles("STAFF"), updateMyActivity);

router.post("/logout", allowRoles("STAFF"), logoutMyActivity);

router.get("/me", allowRoles("STAFF"), getMyActivity);

router.get("/admin/monitoring", allowRoles("ADMIN"), getStaffMonitoringForAdmin);

module.exports = router;
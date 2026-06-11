const express = require("express");

const {
  getAdminDashboardStats,
  getStaffDashboardStats,
  getClientDashboardStats,
} = require("../controllers/dashboardController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/admin", allowRoles("ADMIN"), getAdminDashboardStats);

router.get("/staff", allowRoles("STAFF"), getStaffDashboardStats);

router.get("/client", allowRoles("CLIENT"), getClientDashboardStats);

module.exports = router;
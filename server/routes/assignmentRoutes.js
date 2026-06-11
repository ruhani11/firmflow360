const express = require("express");

const {
  createAssignment,
  getAllAssignmentsForAdmin,
  getMyStaffAssignments,
  getMyClientServices,
  updateAssignment,
  updateAssignmentStatus,
  deleteAssignment,
} = require("../controllers/assignmentController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

/* ADMIN */
router.post("/", allowRoles("ADMIN"), createAssignment);
router.get("/admin/all", allowRoles("ADMIN"), getAllAssignmentsForAdmin);
router.patch("/:id", allowRoles("ADMIN"), updateAssignment);
router.delete("/:id", allowRoles("ADMIN"), deleteAssignment);

/* STAFF */
router.get("/staff/my", allowRoles("STAFF"), getMyStaffAssignments);

/* CLIENT */
router.get("/client/my", allowRoles("CLIENT"), getMyClientServices);

/* STATUS UPDATE */
router.patch(
  "/:id/status",
  allowRoles("ADMIN", "STAFF"),
  updateAssignmentStatus
);

module.exports = router;
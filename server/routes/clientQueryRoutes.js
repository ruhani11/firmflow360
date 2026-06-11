const express = require("express");

const {
  createQueryByClient,
  createQueryByStaff,
  createQueryByAdmin,
  getAllQueriesForAdmin,
  getMyClientQueries,
  getMyStaffQueries,
  addReplyToQuery,
  updateQueryStatus,
  deleteQueryByAdmin,
} = require("../controllers/clientQueryController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/client/create", allowRoles("CLIENT"), createQueryByClient);

router.post("/staff/create", allowRoles("STAFF"), createQueryByStaff);

router.post("/admin/create", allowRoles("ADMIN"), createQueryByAdmin);

router.get("/admin/all", allowRoles("ADMIN"), getAllQueriesForAdmin);

router.get("/client/my", allowRoles("CLIENT"), getMyClientQueries);

router.get("/staff/my", allowRoles("STAFF"), getMyStaffQueries);

router.post(
  "/:id/reply",
  allowRoles("ADMIN", "STAFF", "CLIENT"),
  addReplyToQuery
);

router.patch(
  "/:id/status",
  allowRoles("ADMIN", "STAFF"),
  updateQueryStatus
);

router.delete("/admin/:id", allowRoles("ADMIN"), deleteQueryByAdmin);

module.exports = router;
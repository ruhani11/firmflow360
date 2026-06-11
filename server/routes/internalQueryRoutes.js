const express = require("express");

const {
  createInternalQuery,
  getAllInternalQueriesForAdmin,
  getMyInternalQueriesForStaff,
  addReplyToInternalQuery,
  updateInternalQueryStatus,
  deleteInternalQueryByAdmin,
} = require("../controllers/internalQueryController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/create", allowRoles("ADMIN", "STAFF"), createInternalQuery);

router.get(
  "/admin/all",
  allowRoles("ADMIN"),
  getAllInternalQueriesForAdmin
);

router.get(
  "/staff/my",
  allowRoles("STAFF"),
  getMyInternalQueriesForStaff
);

router.post(
  "/:id/reply",
  allowRoles("ADMIN", "STAFF"),
  addReplyToInternalQuery
);

router.patch(
  "/:id/status",
  allowRoles("ADMIN", "STAFF"),
  updateInternalQueryStatus
);

router.delete(
  "/admin/:id",
  allowRoles("ADMIN"),
  deleteInternalQueryByAdmin
);

module.exports = router;
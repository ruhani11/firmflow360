const express = require("express");

const {
  downloadDocument,
  downloadClientFile,
} = require("../controllers/downloadController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get(
  "/document/:id",
  allowRoles("ADMIN", "STAFF", "CLIENT"),
  downloadDocument
);

router.get(
  "/client-file/:id",
  allowRoles("ADMIN", "STAFF", "CLIENT"),
  downloadClientFile
);

module.exports = router;
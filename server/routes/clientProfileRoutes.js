const express = require("express");

const {
  getMyClientProfile,
  updateMyClientProfile,
} = require("../controllers/clientProfileController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/my", allowRoles("CLIENT"), getMyClientProfile);

router.patch("/my", allowRoles("CLIENT"), updateMyClientProfile);

module.exports = router;
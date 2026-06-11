const express = require("express");

const {
  loginUser,
  getLoggedInUser,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", loginUser);
router.get("/me", protect, getLoggedInUser);

module.exports = router;
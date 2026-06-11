const express = require("express");

const {
  createStaffByAdmin,
  createClientByAdmin,
  getAllUsers,
  getAllStaff,
  getAllClients,
  updateStaffByAdmin,
  updateClientByAdmin,
  deleteStaffByAdmin,
  deleteClientByAdmin,
} = require("../controllers/adminUserController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(allowRoles("ADMIN"));

router.post("/staff", createStaffByAdmin);
router.post("/client", createClientByAdmin);

router.get("/users", getAllUsers);
router.get("/staff", getAllStaff);
router.get("/clients", getAllClients);

router.patch("/staff/:id", updateStaffByAdmin);
router.patch("/client/:id", updateClientByAdmin);

router.delete("/staff/:id", deleteStaffByAdmin);
router.delete("/client/:id", deleteClientByAdmin);

module.exports = router;
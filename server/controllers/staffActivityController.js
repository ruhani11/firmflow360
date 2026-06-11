const Staff = require("../models/Staff");

const getLiveStatus = (staff) => {
  if (!staff.lastActiveAt) {
    return "Offline";
  }

  if (
    staff.lastLogoutAt &&
    new Date(staff.lastLogoutAt).getTime() >
      new Date(staff.lastActiveAt).getTime()
  ) {
    return "Offline";
  }

  const now = new Date();
  const lastActive = new Date(staff.lastActiveAt);

  const diffInMinutes = (now - lastActive) / (1000 * 60);

  if (diffInMinutes <= 2) {
    return "Online";
  }

  if (diffInMinutes > 2 && diffInMinutes <= 10) {
    return "Idle";
  }

  return "Offline";
};

const updateMyActivity = async (req, res) => {
  try {
    const { currentPage } = req.body;

    const staff = await Staff.findOne({ user: req.user.id });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    staff.onlineStatus = "Online";
    staff.lastActiveAt = new Date();

    if (currentPage !== undefined) {
      staff.currentPage = currentPage.trim();
    }

    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Staff activity updated successfully.",
      staff: {
        id: staff._id,
        onlineStatus: staff.onlineStatus,
        lastActiveAt: staff.lastActiveAt,
        currentPage: staff.currentPage,
      },
    });
  } catch (error) {
    console.error("Update Staff Activity Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating staff activity.",
    });
  }
};

const logoutMyActivity = async (req, res) => {
  try {
    const staff = await Staff.findOne({ user: req.user.id });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    staff.onlineStatus = "Offline";
    staff.lastLogoutAt = new Date();
    staff.currentPage = "";

    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Staff logout activity updated successfully.",
      staff: {
        id: staff._id,
        onlineStatus: staff.onlineStatus,
        lastLogoutAt: staff.lastLogoutAt,
      },
    });
  } catch (error) {
    console.error("Staff Logout Activity Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating logout activity.",
    });
  }
};

const getMyActivity = async (req, res) => {
  try {
    const staff = await Staff.findOne({ user: req.user.id }).populate(
      "user",
      "name email role status"
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    const liveStatus = getLiveStatus(staff);

    return res.status(200).json({
      success: true,
      staff: {
        id: staff._id,
        user: staff.user,
        mobile: staff.mobile,
        designation: staff.designation,
        department: staff.department,
        status: staff.status,
        onlineStatus: liveStatus,
        lastActiveAt: staff.lastActiveAt,
        currentPage: staff.currentPage,
        lastLoginAt: staff.lastLoginAt,
        lastLogoutAt: staff.lastLogoutAt,
      },
    });
  } catch (error) {
    console.error("Get Staff Activity Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff activity.",
    });
  }
};

const getStaffMonitoringForAdmin = async (req, res) => {
  try {
    const staffList = await Staff.find()
      .populate("user", "name email role status")
      .sort({ updatedAt: -1 });

    const monitoring = staffList.map((staff) => {
      const liveStatus = getLiveStatus(staff);

      return {
        id: staff._id,
        user: staff.user,
        mobile: staff.mobile,
        designation: staff.designation,
        department: staff.department,
        status: staff.status,
        onlineStatus: liveStatus,
        lastActiveAt: staff.lastActiveAt,
        currentPage: staff.currentPage,
        lastLoginAt: staff.lastLoginAt,
        lastLogoutAt: staff.lastLogoutAt,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: monitoring.length,
      staff: monitoring,
    });
  } catch (error) {
    console.error("Admin Staff Monitoring Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching staff monitoring.",
    });
  }
};

module.exports = {
  updateMyActivity,
  logoutMyActivity,
  getMyActivity,
  getStaffMonitoringForAdmin,
};
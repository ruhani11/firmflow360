const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Staff = require("../models/Staff");
const Client = require("../models/Client");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const getRedirectPath = (role) => {
  if (role === "ADMIN") return "/admin-dashboard";
  if (role === "STAFF") return "/staff-dashboard";
  if (role === "CLIENT") return "/client-dashboard";
  return "/";
};

const loginUser = async (req, res) => {
  try {
    let { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password and role are required.",
      });
    }

    email = String(email).toLowerCase().trim();
    password = String(password).trim();
    role = String(role).toUpperCase().trim();

    if (!["ADMIN", "STAFF", "CLIENT"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected.",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `This account is not registered as ${role}. Please select correct login role.`,
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact Admin.",
      });
    }

    let isPasswordValid = false;

    if (user.password && user.password.startsWith("$2")) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      isPasswordValid = password === user.password;

      if (isPasswordValid) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    let staff = null;
    let client = null;

    if (user.role === "STAFF") {
      staff = await Staff.findOneAndUpdate(
        { user: user._id },
        {
          onlineStatus: "Online",
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
          currentPage: "Dashboard",
        },
        { new: true }
      );

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff profile not found for this user.",
        });
      }
    }

    if (user.role === "CLIENT") {
      client = await Client.findOne({ user: user._id });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client profile not found for this user.",
        });
      }
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      redirectPath: getRedirectPath(user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        staff,
        client,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while login.",
    });
  }
};

const getLoggedInUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    let staff = null;
    let client = null;

    if (user.role === "STAFF") {
      staff = await Staff.findOne({ user: user._id });
    }

    if (user.role === "CLIENT") {
      client = await Client.findOne({ user: user._id });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        staff,
        client,
      },
    });
  } catch (error) {
    console.error("Get Logged In User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching user.",
    });
  }
};

module.exports = {
  loginUser,
  getLoggedInUser,
};
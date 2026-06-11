const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");

const checkPassword = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.DB_URI;

    await mongoose.connect(mongoUri);

    const email = "rishav.staff@firmflow.com";
    const passwordToCheck = "staff@123";

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("User not found.");
      process.exit(1);
    }

    console.log("User found:", {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      passwordHash: user.password,
    });

    const isMatch = await bcrypt.compare(passwordToCheck, user.password);

    console.log("Password checked:", passwordToCheck);
    console.log("Password match:", isMatch);

    process.exit(0);
  } catch (error) {
    console.error("Check Password Error:", error);
    process.exit(1);
  }
};

checkPassword();
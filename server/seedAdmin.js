const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

const connectDB = require("./config/db");
const User = require("./models/User");

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({
      email: "admin@firmflow.com",
    });

    if (existingAdmin) {
      console.log("Admin already exists.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    await User.create({
      name: "Admin User",
      email: "admin@firmflow.com",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    });

    console.log("Admin created successfully.");
    console.log("Email: admin@firmflow.com");
    console.log("Password: Admin@123");

    process.exit(0);
  } catch (error) {
    console.error("Seed Admin Error:", error);
    process.exit(1);
  }
};

seedAdmin();
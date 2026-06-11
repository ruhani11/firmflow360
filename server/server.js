const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");

dotenv.config();

const connectDB = require("./config/db");

/* =========================
   ROUTES IMPORTS
========================= */
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const staffActivityRoutes = require("./routes/staffActivityRoutes");
const documentRoutes = require("./routes/documentRoutes");
const clientFileRoutes = require("./routes/clientFileRoutes");
const clientQueryRoutes = require("./routes/clientQueryRoutes");
const internalQueryRoutes = require("./routes/internalQueryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const downloadRoutes = require("./routes/downloadRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const clientProfileRoutes = require("./routes/clientProfileRoutes");

/* =========================
   DB CONNECT
========================= */
connectDB();

const app = express();

app.disable("x-powered-by");

/* =========================
   MIDDLEWARES
========================= */
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FirmFlow 360 backend server is running successfully.",
  });
});

/* =========================
   API ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/staff-activity", staffActivityRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/client-files", clientFileRoutes);
app.use("/api/client-queries", clientQueryRoutes);
app.use("/api/internal-queries", internalQueryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/client-profile", clientProfileRoutes);

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((error, req, res, next) => {
  console.error("GLOBAL ERROR:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File is too large. Please upload a smaller file.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FirmFlow 360 backend running on port ${PORT}`);
});
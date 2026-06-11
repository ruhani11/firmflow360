const multer = require("multer");
const path = require("path");
const fs = require("fs");

const clientFilesPath = path.join(__dirname, "../uploads/client-files");

if (!fs.existsSync(clientFilesPath)) {
  fs.mkdirSync(clientFilesPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, clientFilesPath);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only PDF, Word, Excel, CSV, ZIP and image files are allowed."),
      false
    );
  }
};

const uploadClientFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

module.exports = uploadClientFile;
const express = require("express");
const route = express.Router();
const multer = require("multer");

const controller = require("../controllers/documents.controller");

// Multer giữ file trong memory để controller đọc nội dung PDF/TXT.
const upload = multer({
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024 },
});

route.post("/create", upload.single("filePath"), controller.create);

module.exports = route;

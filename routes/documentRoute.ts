const express = require("express");
const route = express.Router();
const multer = require("multer");

const controller = require("../controllers/documents.controller");

// Multer giữ file trong memory để controller đọc nội dung PDF/TXT/DOCX.
const upload = multer({
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024 },
});

route.get("/", controller.list);
route.get("/list", controller.list);
route.post("/create", upload.single("filePath"), controller.create);
route.delete("/:id", controller.deleteDocument);
route.get("/:id/file", controller.getFile);

module.exports = route;

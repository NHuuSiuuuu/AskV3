import express from "express";
import multer from "multer";
import * as controller from "../controllers/documents.controller";

const route = express.Router();

// Multer giữ file trong memory để controller đọc nội dung PDF/TXT/DOCX.
const upload = multer({
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024 },
});

route.get("/", controller.list);
route.post("/create", upload.single("filePath"), controller.create);
route.patch("/:id/status", controller.updateStatus);
route.put("/:id/status", controller.updateStatus);
route.delete("/:id", controller.deleteDocument);
route.get("/:id/file", controller.getFile);

export default route;

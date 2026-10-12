import type { Response, NextFunction } from "express";
const jwt = require("jsonwebtoken");

module.exports.verifyToken = (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Không tìm thấy token xác thực.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET || "admin_jwt_secret"
    );

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }
};

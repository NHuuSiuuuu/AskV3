const { pool } = require("../pool");
import type { Request, Response } from "express";
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports.login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email và password là bắt buộc.",
      });
    }

    // 1. Tìm admin theo email
    const result = await pool.query(
      "SELECT id, email, password_hash, created_at FROM admins WHERE email = $1 LIMIT 1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Email hoặc mật khẩu không chính xác.",
      });
    }

    const admin = result.rows[0];

    // 2. So khớp mật khẩu
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        message: "Email hoặc mật khẩu không chính xác.",
      });
    }

    // 3. Tạo token
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.ADMIN_JWT_SECRET || "admin_jwt_secret",
      { expiresIn: `${process.env.ADMIN_TOKEN_TTL_HOURS || 2}h` }
    );

    return res.status(200).json({
      message: "Đăng nhập thành công.",
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        created_at: admin.created_at,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập admin:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ.",
    });
  }
};

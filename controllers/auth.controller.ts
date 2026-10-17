import { pool } from "../pool";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
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
    const tokenTtlHours = Number(process.env.ADMIN_TOKEN_TTL_HOURS || 24);
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.ADMIN_JWT_SECRET || "admin_jwt_secret",
      { expiresIn: `${tokenTtlHours}h` }
    );

    // Lưu token vào cookie
    res.cookie("admin_token", token, {
      maxAge: tokenTtlHours * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });

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

export const logout = async (_req: Request, res: Response) => {
  try {
    res.clearCookie("admin_token", { path: "/" });
    return res.status(200).json({
      message: "Đăng xuất thành công.",
    });
  } catch (error) {
    console.error("Lỗi đăng xuất admin:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ.",
    });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({
        message: "Chưa xác thực.",
      });
    }

    const result = await pool.query(
      "SELECT id, email, created_at FROM admins WHERE id = $1 LIMIT 1",
      [admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin quản trị viên.",
      });
    }

    return res.status(200).json({
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin admin:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ.",
    });
  }
};

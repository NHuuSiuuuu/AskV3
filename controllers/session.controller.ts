import { pool } from "../pool";
import type { Request, Response } from "express";

export const create = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      INSERT INTO sessions DEFAULT VALUES
      RETURNING id, created_at, last_seen_at
    `);

    const session = result.rows[0];

    // Thiết lập cookie session_id (30 ngày)
    res.cookie("session_id", session.id, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });

    return res.status(201).json({
      data: session,
    });
  } catch (error) {
    console.error("Lỗi tạo session:", error);

    return res.status(500).json({
      message: "Không tạo được session.",
    });
  }
};
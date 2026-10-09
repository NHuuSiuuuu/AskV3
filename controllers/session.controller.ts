const { pool } = require("../pool");
import type { Request, Response } from "express";

module.exports.create = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      INSERT INTO sessions DEFAULT VALUES
      RETURNING id, created_at, last_seen_at
    `);

    return res.status(201).json({
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Lỗi tạo session:", error);

    return res.status(500).json({
      message: "Không tạo được session.",
    });
  }
};
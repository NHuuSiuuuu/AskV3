require("dotenv").config();
const { pool } = require("../pool");
const bcrypt = require("bcryptjs");

async function seedAdmin() {
  try {
    // 1. Tạo bảng admins nếu chưa có
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Lấy thông tin từ .env
    const email = process.env.ADMIN_SEED_EMAIL || "admin@humg.edu.vn";
    const password = process.env.ADMIN_SEED_PASSWORD || "Admin@123456psosst";

    const hash = await bcrypt.hash(password, 10);

    // 3. Thêm hoặc cập nhật mật khẩu admin
    await pool.query(
      `
      INSERT INTO admins (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email) 
      DO UPDATE SET password_hash = $2
      `,
      [email, hash]
    );

    console.log(`Đã khởi tạo tài khoản admin: ${email}`);
  } catch (error) {
    console.error("Lỗi khởi tạo admin:", error);
  } finally {
    await pool.end();
  }
}

seedAdmin();

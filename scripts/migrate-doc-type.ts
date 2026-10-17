import dotenv from "dotenv";
dotenv.config();
import { pool } from "../pool";

async function migrate() {
  try {
    console.log("Đang cập nhật CHECK constraint cho cột doc_type trong bảng documents...");

    // 1. Xóa constraint cũ
    await pool.query(`
      ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_doc_type_check;
    `);

    // 2. Thêm constraint mới bao gồm cả danh mục mới và danh mục cũ
    await pool.query(`
      ALTER TABLE documents ADD CONSTRAINT documents_doc_type_check 
      CHECK (doc_type = ANY (ARRAY[
        'quy_che_dao_tao',
        'chuong_trinh_hoc',
        'chuan_dau_ra',
        'thuc_tap_do_an',
        'hoc_bong_ren_luyen',
        'hoc_phi_che_do',
        'thu_tuc_khac',
        'regulation',
        'announcement',
        'form',
        'guide',
        'other'
      ]));
    `);

    console.log("Cập nhật CHECK constraint documents_doc_type_check thành công!");
  } catch (error) {
    console.error("Lỗi khi migrate:", error);
  } finally {
    await pool.end();
  }
}

migrate();

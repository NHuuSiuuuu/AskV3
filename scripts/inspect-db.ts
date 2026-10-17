import dotenv from "dotenv";
dotenv.config();
import { pool } from "../pool";

async function inspect() {
  const tables = ['conversations', 'messages', 'documents', 'sessions', 'admins'];
  for (const t of tables) {
    const res = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [t]
    );
    console.log(`\nTable: ${t}`);
    for (const row of res.rows) {
      console.log(`  - ${row.column_name} (${row.data_type}) [nullable: ${row.is_nullable}]`);
    }
  }
  await pool.end();
}

inspect();

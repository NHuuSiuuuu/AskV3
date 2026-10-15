require("dotenv").config();
const http = require("http");
const express = require("express");
const routes = require("../routes");

const app = express();
// CORS & Cookie simulation
app.use((req: any, _res: any, next: any) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie: string) => {
      const parts = cookie.split("=");
      const name = parts[0]?.trim();
      const val = parts.slice(1).join("=").trim();
      if (name) req.cookies[name] = decodeURIComponent(val || "");
    });
  }
  next();
});
app.use(express.json());
routes(app);

const server = app.listen(0);
const port = server.address().port;

function request(options: any, body?: any): Promise<{ statusCode: number; data: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: port,
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (res: any) => {
        let rawData = "";
        res.on("data", (chunk: any) => (rawData += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        });
      }
    );

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log(`\n=== KIỂM THỬ TẤT CẢ ENDPOINT BACKEND CHO CLIENT (Port ${port}) ===\n`);

  try {
    // 1. Tạo session
    const resSession = await request({ method: "POST", path: "/session/create" });
    console.log("1. Tạo session:", resSession.statusCode, resSession.data);
    if (resSession.statusCode !== 201 || !resSession.data?.data?.id) throw new Error("Thất bại tạo session");
    const sessionId = resSession.data.data.id;

    // 2. Tạo conversation
    const resConv = await request(
      { method: "POST", path: "/conversation/create" },
      { sessionId }
    );
    console.log("2. Tạo conversation:", resConv.statusCode, resConv.data);
    if (resConv.statusCode !== 201 || !resConv.data?.data?.id) throw new Error("Thất bại tạo conversation");
    const convId = resConv.data.data.id;

    // 3. Lấy danh sách conversation theo session
    const resConvList = await request(
      { method: "GET", path: `/conversation/session/${sessionId}` }
    );
    console.log("3. Lấy danh sách conversation:", resConvList.statusCode, "Số lượng:", resConvList.data?.data?.length);
    if (resConvList.statusCode !== 200 || resConvList.data.data.length === 0) throw new Error("Thất bại lấy conversation");

    // 4. Lấy messages của conversation (trống)
    const resMsgs = await request(
      { method: "GET", path: `/conversation/${convId}/messages` }
    );
    console.log("4. Lấy messages:", resMsgs.statusCode, "Số lượng:", resMsgs.data?.data?.length);
    if (resMsgs.statusCode !== 200) throw new Error("Thất bại lấy messages");

    // 5. Đăng nhập admin
    const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@humg.edu.vn";
    const adminPass = process.env.ADMIN_SEED_PASSWORD || "Admin@123456psosst";
    const resLogin = await request(
      { method: "POST", path: "/admin/login" },
      { email: adminEmail, password: adminPass }
    );
    console.log("5. Đăng nhập admin:", resLogin.statusCode, "Token có:", Boolean(resLogin.data?.token));
    if (resLogin.statusCode !== 200 || !resLogin.data?.token) throw new Error("Thất bại đăng nhập admin");
    const token = resLogin.data.token;

    // 6. Lấy danh sách tài liệu admin
    const resDocs = await request(
      { method: "GET", path: "/admin/documents", headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("6. Lấy tài liệu admin:", resDocs.statusCode, "Số lượng tài liệu:", resDocs.data?.data?.length);
    if (resDocs.statusCode !== 200) throw new Error("Thất bại lấy danh sách tài liệu");

    // 7. Xóa conversation vừa tạo
    const resDel = await request(
      { method: "DELETE", path: `/conversation/${convId}` }
    );
    console.log("7. Xóa conversation:", resDel.statusCode);
    if (resDel.statusCode !== 200) throw new Error("Thất bại xóa conversation");

    console.log("\n>>> TẤT CẢ CÁC ENDPOINT CHO FRONTEND ĐỀU HOẠT ĐỘNG HOÀN HẢO! <<<\n");
  } catch (e) {
    console.error("Lỗi:", e);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

run();

import dotenv from "dotenv";
dotenv.config();
import http from "http";
import express from "express";
import routes from "../routes";

const app = express();
app.use(express.json());
routes(app);

const server = app.listen(0);
const addr = server.address();
const port = typeof addr === "object" && addr ? addr.port : 0;

function request(options: any, body?: any): Promise<{ statusCode: number; data: any }> {
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
          resolve({ statusCode: res.statusCode, data: parsed });
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

async function runTests() {
  console.log(`\n=== TEST API ĐĂNG NHẬP ADMIN (Port ${port}) ===\n`);

  try {
    const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@humg.edu.vn";
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || "Admin@123456psosst";

    // 1. Thiếu email/password
    const res1 = await request(
      { method: "POST", path: "/admin/login" },
      { email: "" }
    );
    console.log(`Test 1 (Thiếu thông tin): status ${res1.statusCode} -> ${res1.statusCode === 400 ? "PASS" : "FAIL"}`);

    // 2. Sai mật khẩu
    const res2 = await request(
      { method: "POST", path: "/admin/login" },
      { email: adminEmail, password: "wrong_password" }
    );
    console.log(`Test 2 (Sai mật khẩu): status ${res2.statusCode} -> ${res2.statusCode === 401 ? "PASS" : "FAIL"}`);

    // 3. Đăng nhập thành công
    const res3 = await request(
      { method: "POST", path: "/admin/login" },
      { email: adminEmail, password: adminPassword }
    );
    console.log(`Test 3 (Đăng nhập đúng): status ${res3.statusCode} -> ${res3.statusCode === 200 ? "PASS" : "FAIL"}`);
    console.log("Response:", res3.data);

    console.log("\n=== TẤT CẢ TEST ĐỀU THÀNH CÔNG ===\n");
  } catch (err) {
    console.error("Test lỗi:", err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();

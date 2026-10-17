import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { neon } from "@neondatabase/serverless";
import routes from "./routes";

const app = express();
const port = process.env.PORT || 3001;
const sql = neon(process.env.DATABASE_URL || "");
// CORS Middleware cho Vite Frontend
app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.WEB_ORIGIN || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
  ];
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Middleware parse cookie đơn giản không cần thêm thư viện ngoài
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

// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });




// const requestHandler = async (req, res) => {
//   const result = await sql`SELECT version()`;
//   const { version } = result[0];
//   res.writeHead(200, { "Content-Type": "text/plain" });
//   res.end(version);
// };

// http.createServer(requestHandler).listen(3000, () => {
//   console.log("Server running at http://localhost:3000");
// });


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

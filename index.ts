require("dotenv").config();
const express = require("express");
const { neon } = require('@neondatabase/serverless');
const app = express();
const routes = require("./routes");
// Cấu hình env
const port = process.env.PORT || 3001;
const sql = neon(process.env.DATABASE_URL);
const http = require("http");
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

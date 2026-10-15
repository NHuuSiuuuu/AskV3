import type { Express } from "express";
const documentRoute = require("./documentRoute");
const sessionRoute = require("./sessionRoute");
const conversationRoute = require("./conversationRoute");
const authRoute = require("./authRoute");

module.exports = (app: Express): void => {
  app.use("/admin", authRoute);
  app.use("/admin/documents", documentRoute);
  app.use("/documents", documentRoute);
  app.use("/admin/sessions", sessionRoute);
  app.use("/session", sessionRoute);
  app.use("/conversation", conversationRoute);
};

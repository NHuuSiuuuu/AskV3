// import type {Express} from "express"
import type { Express } from "express";
const documentRoute = require("./documentRoute");
const sessionRoute = require("./sessionRoute");
const conversationRoute = require("./conversationRoute");

module.exports = (app: Express): void => {
  app.use("/admin/documents", documentRoute);
  app.use("/admin/sessions", sessionRoute);
  app.use("/conversation", conversationRoute);
};

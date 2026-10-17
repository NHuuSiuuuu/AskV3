import type { Express } from "express";
import documentRoute from "./documentRoute";
import sessionRoute from "./sessionRoute";
import conversationRoute from "./conversationRoute";
import authRoute from "./authRoute";

const setupRoutes = (app: Express): void => {
  app.use("/admin", authRoute);
  app.use("/admin/documents", documentRoute);
  app.use("/documents", documentRoute);
  app.use("/admin/sessions", sessionRoute);
  app.use("/session", sessionRoute);
  app.use("/conversation", conversationRoute);
};

export default setupRoutes;

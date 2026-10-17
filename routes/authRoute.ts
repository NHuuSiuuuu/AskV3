import express from "express";
import * as controller from "../controllers/auth.controller";
import { verifyToken } from "../middleware/authMiddleware";

const route = express.Router();

route.post("/login", controller.login);
route.post("/logout", controller.logout);
route.get("/me", verifyToken, controller.getMe);

export default route;

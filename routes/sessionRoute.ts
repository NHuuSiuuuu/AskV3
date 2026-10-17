import express from "express";
import * as controller from "../controllers/session.controller";

const route = express.Router();

route.post("/create", controller.create);

export default route;

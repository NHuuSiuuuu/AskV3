const express = require("express");
const route = express.Router();

const controller = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/authMiddleware");

route.post("/login", controller.login);
route.post("/logout", controller.logout);
route.get("/me", verifyToken, controller.getMe);

module.exports = route;

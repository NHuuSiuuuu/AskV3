const express = require("express");
const route = express.Router();

const controller = require("../controllers/auth.controller");

route.post("/login", controller.login);

module.exports = route;

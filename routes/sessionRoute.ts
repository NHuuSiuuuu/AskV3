const express = require("express");
const route = express.Router();

const controller = require("../controllers/session.controller");

route.post("/create", controller.create);

module.exports = route;

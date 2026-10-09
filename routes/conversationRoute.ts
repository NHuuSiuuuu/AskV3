const express = require("express");
const route = express.Router();

const controller = require("../controllers/conversation.controller");

route.post("/create", controller.createConversation);

route.post("/:conversationId/messages", controller.chat);

module.exports = route;

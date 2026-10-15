const express = require("express");
const route = express.Router();

const controller = require("../controllers/conversation.controller");

route.post("/create", controller.createConversation);
route.get("/session/:sessionId", controller.getConversationsBySession);
route.get("/", controller.getConversationsBySession);
route.get("/:conversationId/messages", controller.getMessages);
route.post("/messages", controller.chat);
route.post("/:conversationId/messages", controller.chat);
route.delete("/:conversationId", controller.deleteConversation);

module.exports = route;

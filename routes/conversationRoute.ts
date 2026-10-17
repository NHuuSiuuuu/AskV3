import express from "express";
import * as controller from "../controllers/conversation.controller";

const route = express.Router();

route.post("/create", controller.createConversation);
route.get("/session/:sessionId", controller.getConversationsBySession);
route.get("/", controller.getConversationsBySession);
route.get("/:conversationId/messages", controller.getMessages);
route.post("/messages", controller.chat);
route.post("/:conversationId/messages", controller.chat);
route.delete("/:conversationId", controller.deleteConversation);

export default route;

import { Router } from "express";
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  listConversations,
  updateConversation,
} from "../controllers/chat.controller.js";

export const conversationRoutes = Router({ mergeParams: true });

conversationRoutes.get("/", listConversations);
conversationRoutes.post("/", createConversation);
conversationRoutes.get("/:conversationId/messages", getConversationMessages);
conversationRoutes.patch("/:conversationId", updateConversation);
conversationRoutes.delete("/:conversationId", deleteConversation);

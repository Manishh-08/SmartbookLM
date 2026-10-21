import { Router } from "express";
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  listConversations,
} from "../controllers/chat.controller.js";

export const conversationRoutes = Router({ mergeParams: true });

conversationRoutes.get("/", listConversations);
conversationRoutes.post("/", createConversation);
conversationRoutes.get("/:conversationId/messages", getConversationMessages);
conversationRoutes.delete("/:conversationId", deleteConversation);

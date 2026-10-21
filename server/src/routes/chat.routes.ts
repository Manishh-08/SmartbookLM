import { Router } from "express";
import { streamChat } from "../controllers/chat.controller.js";

export const chatRoutes = Router({ mergeParams: true });

chatRoutes.post("/", streamChat);

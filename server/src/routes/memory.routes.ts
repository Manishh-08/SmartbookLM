import { Router } from "express";
import {
  createMemory,
  deleteMemory,
  listMemories,
  updateMemory,
} from "../controllers/memory.controller.js";
import { requireAuth } from "../middleware/require-auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const memoryRoutes = Router();

memoryRoutes.use(requireAuth);

memoryRoutes.get("/",listMemories);
memoryRoutes.post("/",createMemory);
memoryRoutes.patch("/:memoryId", updateMemory);
memoryRoutes.delete("/:memoryId", deleteMemory);
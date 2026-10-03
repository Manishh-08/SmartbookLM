import { Router } from "express";
import {
    createWorkspace,
    deleteWorkspace,
    getWorkspace,
    listWorkspaces,
    updateWorkspace,
} from "../controllers/workspace.controller.js";
import { requireAuth } from "../middleware/require-auth.middleware.js";

export const workspaceRoutes = Router();

workspaceRoutes.use(requireAuth);

workspaceRoutes.get("/", listWorkspaces);
workspaceRoutes.post("/", createWorkspace);
workspaceRoutes.get("/:workspaceId", getWorkspace);
workspaceRoutes.patch("/:workspaceId", updateWorkspace);
workspaceRoutes.delete("/:workspaceId", deleteWorkspace);
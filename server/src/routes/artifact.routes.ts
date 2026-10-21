import { Router } from "express";
import {
  createArtifact,
  deleteArtifact,
  getArtifact,
  listArtifacts,
} from "../controllers/artifact.controller.js";

export const artifactRoutes = Router({ mergeParams: true });

artifactRoutes.get("/", listArtifacts);
artifactRoutes.post("/", createArtifact);
artifactRoutes.get("/:artifactId", getArtifact);
artifactRoutes.delete("/:artifactId", deleteArtifact);

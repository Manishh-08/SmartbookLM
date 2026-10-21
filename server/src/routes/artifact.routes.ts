import { Router } from "express";
import {
  createArtifact,
  deleteArtifact,
  getArtifact,
  listArtifacts,
  updateArtifact,
} from "../controllers/artifact.controller.js";

export const artifactRoutes = Router({ mergeParams: true });

artifactRoutes.get("/", listArtifacts);
artifactRoutes.post("/", createArtifact);
artifactRoutes.get("/:artifactId", getArtifact);
artifactRoutes.patch("/:artifactId", updateArtifact);
artifactRoutes.delete("/:artifactId", deleteArtifact);

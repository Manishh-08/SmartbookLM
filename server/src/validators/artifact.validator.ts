import { z } from "zod";
import { workspaceIdParamSchema } from "./workspace.validator.js";

export const artifactTypes = [
  "SUMMARY",
  "TAKEAWAYS",
  "FLASHCARDS",
  "QUIZ",
  "MINDMAP",
  "REPORT",
] as const;

export const artifactIdParamSchema = workspaceIdParamSchema.extend({
  artifactId: z.string().trim().min(1, "Artifact id is required"),
});

export const createArtifactSchema = z.object({
  type: z.enum(artifactTypes),
  title: z.string().trim().min(1).max(120).optional(),
  sourceIds: z.array(z.string().trim().min(1)).optional(),
});

export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;

export const updateArtifactSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>;
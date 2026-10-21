import type { Prisma } from "../generated/prisma/client.js";
import {
  enqueueArtifactGeneration,
  cancelArtifactGeneration,
} from "../lib/artifact-events.js";
import {
  createArtifactRecord,
  deleteArtifactRecord,
  findArtifactById,
  findArtifactByIdAndWorkspaceId,
  findArtifactsByWorkspaceId,
  updateArtifactRecord,
  type ArtifactRecord,
} from "../repository/artifact.repository.js";
import { findSourcesByWorkspaceId } from "../repository/source.repository.js";
import { NotFoundError, ValidationError } from "../types/app-error.js";
import {
  gatherSourceContext,
  generateArtifactContent,
  generateQuizIncrementally,
  generateReportIncrementally,
  type QuizQuestion,
  type ReportSection,
} from "./artifact-generation.services.js";
import { getWorkspaceByIdForUser } from "./workspace.services.js";
import type { CreateArtifactInput } from "../validators/artifact.validator.js";

// In-memory set to immediately halt in-flight jobs when deleted
const abortedArtifacts = new Set<string>();
const runningArtifactJobs = new Set<string>();

export function abortArtifactGeneration(artifactId: string) {
  abortedArtifacts.add(artifactId);
}

export function isArtifactGenerationAborted(artifactId: string) {
  return abortedArtifacts.has(artifactId);
}

/**
 * Lists all learning artifacts in a workspace.
 *
 * @param workspaceId - Workspace to list artifacts from
 * @param userId - Authenticated user's id
 * @returns Artifact records ordered by creation time
 */
export async function listArtifactsForWorkspace(
  workspaceId: string,
  userId: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);
  return findArtifactsByWorkspaceId(workspaceId);
}

/**
 * Loads a single artifact after verifying workspace ownership.
 *
 * @param workspaceId - Workspace the artifact belongs to
 * @param artifactId - Artifact to fetch
 * @param userId - Authenticated user's id
 * @returns Artifact record with content when status is `READY`
 * @throws {NotFoundError} When the artifact does not exist in this workspace
 */
export async function getArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  const artifact = await findArtifactByIdAndWorkspaceId(
    artifactId,
    workspaceId,
  );

  if (!artifact) {
    throw new NotFoundError("Artifact not found");
  }

  return artifact;
}

/**
 * Creates a pending artifact and enqueues background generation via Inngest.
 *
 * Validates that ready sources exist and gets their IDs WITHOUT concatenating contents.
 * The actual AI generation and text gathering runs asynchronously in {@link processArtifactById}.
 *
 * @param workspaceId - Workspace to attach the artifact to
 * @param userId - Authenticated user's id
 * @param input - Artifact type, optional title, optional source id filter
 * @returns New artifact with status `PENDING`
 * @throws {ValidationError} When no ready sources are available
 */
export async function createArtifactForWorkspace(
  workspaceId: string,
  userId: string,
  input: CreateArtifactInput,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  // Validate ready sources exist and get their IDs without reading/concatenating contents
  const allSources = await findSourcesByWorkspaceId(workspaceId);

  const selected = input.sourceIds?.length
    ? allSources.filter((source) => input.sourceIds!.includes(source.id))
    : allSources;

  if (selected.length === 0) {
    throw new ValidationError(
      "No sources found. Add sources before generating learning tools.",
    );
  }

  const readySources = selected.filter(
    (source) =>
      source.status === "READY" ||
      (typeof source.content === "string" && source.content.trim().length > 0),
  );

  if (readySources.length === 0) {
    throw new ValidationError(
      "Selected sources are not ready or have no extracted content yet. Please wait for indexing to finish.",
    );
  }

  const sourceIds = readySources.map((source) => source.id);

  const artifact = await createArtifactRecord({
    workspaceId,
    type: input.type,
    title:
      input.title ||
      `${{
        SUMMARY: "Summary",
        TAKEAWAYS: "Key Takeaways",
        FLASHCARDS: "Flashcards",
        QUIZ: "Quiz",
        MINDMAP: "Mind Map",
        REPORT: "AI Report",
      }[input.type]
      } · ${new Date().toLocaleDateString()}`,
    sourceIds,
    status: "PENDING",
  });

  try {
    await enqueueArtifactGeneration({
      artifactId: artifact.id,
      workspaceId,
    });
  } catch (err) {
    console.warn("Inngest enqueue failed:", err);
  }

  // Trigger background generation so it never stalls if Inngest worker is offline
  void processArtifactById(artifact.id).catch((err) => {
    console.error("Async artifact generation error:", err);
  });

  return artifact;
}

/**
 * Deletes an artifact from the workspace and cancels any active generation job.
 *
 * @param workspaceId - Workspace the artifact belongs to
 * @param artifactId - Artifact to delete
 * @param userId - Authenticated user's id
 * @returns Resolves when the artifact row is deleted
 * @throws {NotFoundError} When the artifact is not found
 */
export async function deleteArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
) {
  await getArtifactForWorkspace(workspaceId, artifactId, userId);

  // 1. Tell Inngest to cancel any running job for this artifact
  await cancelArtifactGeneration({
    artifactId,
    workspaceId,
  });

  // 2. Mark local abort flag so in-flight execution halts immediately
  abortArtifactGeneration(artifactId);

  // 3. Delete database record
  await deleteArtifactRecord(artifactId);
}

/**
 * Runs the full artifact generation pipeline (used by Inngest worker or fallback).
 *
 * Quizzes and deep-dive reports are generated incrementally:
 * - The first batch of questions/sections is generated and saved within seconds.
 * - Remaining chunk batches are processed in the background with progress saved after each batch.
 * - When all chunks have been processed, the artifact status is finalized to `READY`.
 *
 * @param artifactId - Artifact to generate content for
 * @returns Updated artifact with `READY` status and generated content, or null if deleted
 * @throws When generation fails (status set to `FAILED`)
 */
export async function processArtifactById(artifactId: string) {
  if (isArtifactGenerationAborted(artifactId)) {
    abortedArtifacts.delete(artifactId);
    return null;
  }

  // Prevent duplicate concurrent execution of the same artifact
  if (runningArtifactJobs.has(artifactId)) {
    return null;
  }
  runningArtifactJobs.add(artifactId);

  try {
    const artifact = await findArtifactById(artifactId);
    if (!artifact) {
      return null;
    }

    if (artifact.status === "READY") {
      return artifact;
    }

    await updateArtifactRecord(artifactId, {
      status: "PROCESSING",
      metadata: {
        ...(artifact.metadata && typeof artifact.metadata === "object"
          ? artifact.metadata
          : {}),
        progress: 5,
        isGenerating: true,
      },
    });

    if (isArtifactGenerationAborted(artifactId)) {
      return null;
    }

    // Load target sources
    const allSources = await findSourcesByWorkspaceId(artifact.workspaceId);
    const selectedSources = artifact.sourceIds?.length
      ? allSources.filter((s) => artifact.sourceIds.includes(s.id))
      : allSources;

    const readySources = selectedSources.filter(
      (source) =>
        source.status === "READY" ||
        (typeof source.content === "string" && source.content.trim().length > 0),
    );

    if (readySources.length === 0) {
      throw new ValidationError(
        "No ready sources found with extracted content for this artifact.",
      );
    }

    // ---------------- Incremental Generation for QUIZ ---------------- //
    if (artifact.type === "QUIZ") {
      const existingContent = artifact.content as {
        questions?: QuizQuestion[];
      } | null;
      const existingQuestions = existingContent?.questions || [];

      const finalQuestions = await generateQuizIncrementally({
        sources: readySources,
        existingQuestions,
        isAborted: () => isArtifactGenerationAborted(artifactId),
        onBatchProgress: async (questions, meta) => {
          const stillThere = await findArtifactById(artifactId);
          if (!stillThere || isArtifactGenerationAborted(artifactId)) return;

          await updateArtifactRecord(artifactId, {
            content: { questions } as Prisma.InputJsonValue,
            metadata: {
              ...(stillThere.metadata && typeof stillThere.metadata === "object"
                ? stillThere.metadata
                : {}),
              ...meta,
              isGenerating: meta.currentBatch < meta.totalBatches,
              lastBatchAt: new Date().toISOString(),
            },
          });
        },
      });

      if (isArtifactGenerationAborted(artifactId)) {
        return null;
      }

      return await updateArtifactRecord(artifactId, {
        status: "READY",
        content: { questions: finalQuestions } as Prisma.InputJsonValue,
        metadata: {
          progress: 100,
          isGenerating: false,
          totalQuestions: finalQuestions.length,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // ---------------- Incremental Generation for REPORT ---------------- //
    if (artifact.type === "REPORT") {
      const existingContent = artifact.content as {
        markdown?: string;
        sections?: ReportSection[];
      } | null;
      const existingSections = existingContent?.sections || [];

      const finalReport = await generateReportIncrementally({
        sources: readySources,
        existingSections,
        isAborted: () => isArtifactGenerationAborted(artifactId),
        onBatchProgress: async (report, meta) => {
          const stillThere = await findArtifactById(artifactId);
          if (!stillThere || isArtifactGenerationAborted(artifactId)) return;

          await updateArtifactRecord(artifactId, {
            content: report as Prisma.InputJsonValue,
            metadata: {
              ...(stillThere.metadata && typeof stillThere.metadata === "object"
                ? stillThere.metadata
                : {}),
              ...meta,
              isGenerating: meta.currentBatch < meta.totalBatches,
              lastBatchAt: new Date().toISOString(),
            },
          });
        },
      });

      if (isArtifactGenerationAborted(artifactId)) {
        return null;
      }

      return await updateArtifactRecord(artifactId, {
        status: "READY",
        content: finalReport as Prisma.InputJsonValue,
        metadata: {
          progress: 100,
          isGenerating: false,
          totalSections: finalReport.sections.length,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // ---------------- Single-Shot for SUMMARY, FLASHCARDS, TAKEAWAYS, MINDMAP ---------------- //
    const context = await gatherSourceContext(
      artifact.workspaceId,
      artifact.sourceIds,
      artifact.type,
    );

    if (isArtifactGenerationAborted(artifactId)) {
      return null;
    }

    const content = await generateArtifactContent(
      artifact.type,
      context.text,
    );

    if (isArtifactGenerationAborted(artifactId)) {
      return null;
    }

    const stillExistsAfterAi = await findArtifactById(artifactId);
    if (!stillExistsAfterAi) {
      return null;
    }

    return await updateArtifactRecord(artifactId, {
      status: "READY",
      content: content as Prisma.InputJsonValue,
      metadata: {
        progress: 100,
        isGenerating: false,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (isArtifactGenerationAborted(artifactId)) {
      return null;
    }

    // If deleted from DB, do not attempt to write FAILED status
    const stillExists = await findArtifactById(artifactId);
    if (!stillExists) {
      return null;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Artifact generation failed";

    await updateArtifactRecord(artifactId, {
      status: "FAILED",
      metadata: {
        processingError: message,
      },
    });

    throw error;
  } finally {
    runningArtifactJobs.delete(artifactId);
    abortedArtifacts.delete(artifactId);
  }
}

export type { ArtifactRecord };
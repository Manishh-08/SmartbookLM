import { findChunksBySourceId } from "../repository/source-chunk.repository.js";
import { findSourceById } from "../repository/source.repository.js";
import { processArtifactById } from "../services/artifact.services.js";
import { summarizeConversationById } from "../services/conversation-memory.services.js";
import {
  abortSourceProcessing,
  chunkSourceContent,
  clearAbortedSource,
  embedAndIndexSource,
  extractSourceContent,
  isSourceProcessingAborted,
  markSourceFailed,
  markSourceProcessing,
} from "../services/source-processing.services.js";
import { inngest } from "./client.js";

export const processSource = inngest.createFunction(
  {
    id: "process-source",
    retries: 3,
    triggers: [{ event: "source/created" }],
    cancelOn: [
      {
        event: "source/cancel",
        match: "data.sourceId",
      },
    ],
  },
  async ({ event, step }) => {
    const { sourceId } = event.data;

    try {
      if (isSourceProcessingAborted(sourceId)) {
        return { sourceId, status: "CANCELLED" };
      }

      await step.run("mark-processing", async () => {
        if (isSourceProcessingAborted(sourceId)) return null;
        return markSourceProcessing(sourceId);
      });

      if (isSourceProcessingAborted(sourceId)) {
        return { sourceId, status: "CANCELLED" };
      }

      const extracted = await step.run("extract-content", async () => {
        if (isSourceProcessingAborted(sourceId)) return null;
        return extractSourceContent(sourceId);
      });

      if (!extracted || isSourceProcessingAborted(sourceId)) {
        return { sourceId, status: "CANCELLED" };
      }

      await step.run("chunk-content", async () => {
        if (isSourceProcessingAborted(sourceId)) return [];
        return chunkSourceContent(
          sourceId,
          extracted.text,
          extracted.pages,
        );
      });

      if (isSourceProcessingAborted(sourceId)) {
        return { sourceId, status: "CANCELLED" };
      }

      const result = await step.run("embed-and-index", async () => {
        if (isSourceProcessingAborted(sourceId)) return { chunkCount: 0 };
        const source = await findSourceById(sourceId);
        if (!source) {
          return { chunkCount: 0 };
        }

        const chunks = await findChunksBySourceId(sourceId);
        if (isSourceProcessingAborted(sourceId)) return { chunkCount: chunks.length };

        await embedAndIndexSource(source, chunks);

        return { chunkCount: chunks.length };
      });

      return { sourceId, status: "READY", ...result };
    } catch (error) {
      if (isSourceProcessingAborted(sourceId)) {
        return { sourceId, status: "CANCELLED" };
      }

      await step.run("mark-failed", async () => {
        if (isSourceProcessingAborted(sourceId)) return;
        const source = await findSourceById(sourceId);
        if (source) {
          await markSourceFailed(sourceId, error, source.metadata);
        }
      });
      throw error;
    } finally {
      clearAbortedSource(sourceId);
    }
  },
);

export const generateArtifact = inngest.createFunction(
  {
    id: "generate-artifact",
    retries: 2,
    triggers: [{ event: "artifact/generate" }],
    cancelOn: [
      {
        event: "artifact/cancel",
        match: "data.artifactId",
      },
    ],
  },
  async ({ event, step }) => {
    const { artifactId } = event.data;

    await step.run("generate", () => processArtifactById(artifactId));

    return { artifactId, status: "READY" };
  },
);


export const summarizeConversation = inngest.createFunction(
  {
    id: "summarize-conversation",
    retries: 2,
    triggers: [{ event: "conversation/summarize" }],
  },
  async ({ event, step }) => {
    const { conversationId, userId } = event.data;

    await step.run("summarize", () =>
      summarizeConversationById(conversationId, userId),
    );

    return { conversationId, status: "SUMMARIZED" };
  },
);
export const functions = [processSource, generateArtifact, summarizeConversation];
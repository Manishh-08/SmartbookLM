import { processArtifactById } from "../services/artifact.services.js";
import { summarizeConversationById } from "../services/conversation-memory.services.js";
import { processSourceById } from "../services/source-processing.services.js";
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

    const result = await step.run("process-source", () =>
      processSourceById(sourceId),
    );

    return { sourceId, status: result?.status ?? "READY" };
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
import { inngest } from "../inngest/client.js";

/**
 * Enqueues a source processing job to run asynchronously via Inngest.
 *
 * The worker runs extract → chunk → embed → Pinecone upsert.
 *
 * @param input - Source and workspace ids for the processing worker
 * @returns Resolves when the event is accepted by Inngest
 *
 */
export async function enqueueSourceProcessing(input: {
  sourceId: string;
  workspaceId: string;
}) {
  await inngest.send({
    name: "source/created",
    data: input,
  });
}

/**
 * Sends a cancellation event to Inngest to cancel active processing of a source.
 *
 * @param input - Source and workspace ids to cancel
 */
export async function cancelSourceProcessing(input: {
  sourceId: string;
  workspaceId: string;
}) {
  try {
    await inngest.send({
      name: "source/cancel",
      data: input,
    });
  } catch (err) {
    console.warn("Inngest cancel event failed to send for source:", err);
  }
}
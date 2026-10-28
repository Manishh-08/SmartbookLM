import { RAG_MIN_SCORE, RAG_TOP_K } from "../ai-config.js";
import { embedTexts } from "../openai.js";
import { queryWorkspaceVectors } from "../pinecone.js";
import { findSourcesByWorkspaceId } from "../../repository/source.repository.js";
import { findChunksBySourceIds } from "../../repository/source-chunk.repository.js";
import { chunkText } from "../chunking.js";
import { processSourceById } from "../../services/source-processing.services.js";

export type RetrievedChunk = {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  chunkId: string;
  chunkIndex: number;
  page?: number;
  text: string;
  score: number;
};

export async function retrieveWorkspaceContext(
  workspaceId: string,
  query: string,
): Promise<RetrievedChunk[]> {
  try {
    const [embedding] = await embedTexts([query]);
    const matches = await queryWorkspaceVectors(
      workspaceId,
      embedding,
      RAG_TOP_K,
    );

    const chunks: RetrievedChunk[] = [];

    for (const match of matches) {
      const score = match.score ?? 0;
      if (score < RAG_MIN_SCORE) {
        continue;
      }

      const metadata = match.metadata as
        | Record<string, unknown>
        | undefined;
      if (
        !metadata ||
        typeof metadata.sourceId !== "string" ||
        typeof metadata.sourceTitle !== "string" ||
        typeof metadata.sourceType !== "string" ||
        typeof metadata.chunkId !== "string" ||
        typeof metadata.text !== "string"
      ) {
        continue;
      }

      chunks.push({
        sourceId: metadata.sourceId,
        sourceTitle: metadata.sourceTitle,
        sourceType: metadata.sourceType,
        chunkId: metadata.chunkId,
        chunkIndex: Number(metadata.chunkIndex ?? 0),
        ...(typeof metadata.page === "number"
          ? { page: metadata.page }
          : {}),
        text: metadata.text,
        score,
      });
    }

    if (chunks.length > 0) {
      return chunks;
    }
  } catch (error) {
    console.warn("Pinecone retrieval failed or empty, checking fallback:", error);
  }

  // Graceful Fallback:
  // If Pinecone returns 0 chunks (e.g. newly uploaded source still indexing or Pinecone offline),
  // retrieve relevant chunks from PostgreSQL and trigger background indexing if unindexed.
  try {
    const sources = await findSourcesByWorkspaceId(workspaceId);
    const readySources = sources.filter(
      (s) => s.status === "READY" || (typeof s.content === "string" && s.content.trim().length > 0),
    );

    if (readySources.length === 0) {
      return [];
    }

    // Trigger self-healing background indexing for any sources that missed it
    for (const s of readySources) {
      const meta = (s.metadata && typeof s.metadata === "object" && !Array.isArray(s.metadata))
        ? (s.metadata as Record<string, unknown>)
        : {};
      if (!meta.indexedAt) {
        void processSourceById(s.id).catch(() => {});
      }
    }

    const sourceMap = new Map(readySources.map((s) => [s.id, s]));
    const dbChunks = await findChunksBySourceIds(readySources.map((s) => s.id));

    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (dbChunks.length > 0) {
      const scored = dbChunks.map((chunk) => {
        const textLower = chunk.content.toLowerCase();
        let matches = 0;
        for (const w of queryWords) {
          if (textLower.includes(w)) matches++;
        }
        return { chunk, score: matches };
      });

      scored.sort((a, b) => b.score - a.score);
      const topMatches = (scored[0]?.score ?? 0) > 0
        ? scored.slice(0, RAG_TOP_K)
        : scored.slice(0, 3);

      return topMatches.map(({ chunk, score }) => {
        const source = sourceMap.get(chunk.sourceId);
        const meta = chunk.metadata && typeof chunk.metadata === "object" && !Array.isArray(chunk.metadata)
          ? (chunk.metadata as Record<string, unknown>)
          : {};

        return {
          sourceId: chunk.sourceId,
          sourceTitle: source?.title ?? "Document",
          sourceType: source?.type ?? "PDF",
          chunkId: chunk.id,
          chunkIndex: chunk.index,
          ...(typeof meta.page === "number" ? { page: meta.page } : {}),
          text: chunk.content,
          score: score > 0 ? 0.6 : 0.4,
        };
      });
    }

    // If chunks are not yet written to source_chunk table, chunk source.content on the fly
    const fallbackChunks: RetrievedChunk[] = [];
    for (const source of readySources) {
      if (!source.content) continue;
      const generated = chunkText(source.content.trim(), {
        chunkSize: 1000,
        chunkOverlap: 100,
      });

      const scored = generated.map((g) => {
        const textLower = g.content.toLowerCase();
        let matches = 0;
        for (const w of queryWords) {
          if (textLower.includes(w)) matches++;
        }
        return { ...g, score: matches };
      });

      scored.sort((a, b) => b.score - a.score);
      const top = (scored[0]?.score ?? 0) > 0
        ? scored.slice(0, 3)
        : scored.slice(0, 2);

      for (const g of top) {
        fallbackChunks.push({
          sourceId: source.id,
          sourceTitle: source.title,
          sourceType: source.type,
          chunkId: `fallback-${source.id}-${g.index}`,
          chunkIndex: g.index,
          text: g.content,
          score: g.score > 0 ? 0.6 : 0.4,
        });
      }

      if (fallbackChunks.length >= RAG_TOP_K) break;
    }

    return fallbackChunks.slice(0, RAG_TOP_K);
  } catch (fallbackErr) {
    console.warn("DB fallback context retrieval failed:", fallbackErr);
    return [];
  }
}

export type UserMemoryContext = string;

export function buildChatSystemPrompt(input: {
  chunks: RetrievedChunk[];
  conversationSummary?: string | null;
  userMemories?: UserMemoryContext[];
  webSearchEnabled?: boolean;
}) {
  const instructions: string[] = [
    "You are Smartbook, an assistant that helps users learn from their workspace sources. Sources can be Text, Markdown, PDF, Website, Youtube Video",
  ];

  if (input.webSearchEnabled) {
    instructions.push(
      "You have access to a web_search tool for up-to-date information outside the workspace.",
      "Use it when the user asks about recent events or topics not covered by their sources.",
      "Cite web results inline using [W1], [W2], etc. matching the web result blocks.",
    );
  }

  if (input.userMemories?.length) {
    const memoryBlock = input.userMemories
      .map((memory) => `- ${memory}`)
      .join("\n");

    instructions.push(
      "Known facts about this user (use when relevant):",
      memoryBlock,
    );
  }

  const summary = input.conversationSummary?.trim();
  if (summary) {
    instructions.push("Earlier conversation summary:", summary);
  }

  if (input.chunks.length === 0) {
    instructions.push(
      "This workspace has no indexed source content yet, or nothing relevant was retrieved.",
      input.webSearchEnabled
        ? "Use web search when needed, or answer from general knowledge."
        : "Answer helpfully from general knowledge and suggest adding or processing sources when appropriate.",
      "Do not invent citations.",
    );
    return instructions.join("\n");
  }

  const context = input.chunks
    .map((chunk, index) => {
      const label = `[${index + 1}] ${chunk.sourceTitle} (${chunk.sourceType})${chunk.page ? `, page ${chunk.page}` : ""
        }`;
      return `${label}\n${chunk.text}`;
    })
    .join("\n\n");

  instructions.push(
    "Use ONLY the retrieved context below when making factual claims about their materials.",
    "If the context is insufficient, say so clearly.",
    "Cite sources inline using [1], [2], etc. matching the numbered context blocks.",
    "Keep answers concise, accurate, and educational.",
    "",
    "Retrieved context:",
    context,
  );

  return instructions.join("\n");
}
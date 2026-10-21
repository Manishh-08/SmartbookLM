import { generateText, Output } from "ai";
import { openaiProvider, resolveModelName } from "../lib/openai.js";
import { z } from "zod";
import { CHAT_MODEL } from "../lib/ai-config.js";
import { chunkText } from "../lib/chunking.js";
import {
  findSourcesByWorkspaceId,
  type SourceRecord,
} from "../repository/source.repository.js";
import {
  findChunksBySourceIds,
  type SourceChunkRecord,
} from "../repository/source-chunk.repository.js";
import type { ArtifactRecord } from "../repository/artifact.repository.js";
import { ValidationError } from "../types/app-error.js";

const MAX_CONTEXT_CHARS = 120_000;

export const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2).max(5),
  correctIndex: z.number().int().min(0),
  explanation: z.string(),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

const quizBatchSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(8),
});

export const reportSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export type ReportSection = z.infer<typeof reportSectionSchema>;

const reportExecutiveSummarySchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  sections: z.array(reportSectionSchema).min(1).max(4),
});

const reportBatchSchema = z.object({
  sections: z.array(reportSectionSchema).min(1).max(4),
});

const flashcardsSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string(),
        back: z.string(),
      }),
    )
    .min(3)
    .max(30),
});

const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(3).max(50),
});

const mindmapSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
      }),
    )
    .min(2)
    .max(40),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
    }),
  ),
});

const takeawaysSchema = z.object({
  items: z.array(z.string()).min(3).max(20),
});

const reportSchema = z.object({
  markdown: z.string(),
  sections: z.array(reportSectionSchema),
});

export type SourceChunkItem = {
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
};

/**
 * Normalizes question text for deduplication.
 */
function normalizeQuestionStem(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a candidate question duplicates an existing question using exact match
 * or high word overlap.
 */
export function isDuplicateQuizQuestion(
  existingList: QuizQuestion[],
  candidate: QuizQuestion,
): boolean {
  const normCandidate = normalizeQuestionStem(candidate.question);
  if (!normCandidate) return true;

  const candidateWords = new Set(normCandidate.split(" "));

  for (const existing of existingList) {
    const normExisting = normalizeQuestionStem(existing.question);
    if (normCandidate === normExisting) {
      return true;
    }

    const existingWords = new Set(normExisting.split(" "));
    let intersection = 0;
    for (const w of candidateWords) {
      if (existingWords.has(w)) intersection++;
    }
    const union = new Set([...candidateWords, ...existingWords]).size;
    if (union > 0 && intersection / union > 0.75) {
      return true;
    }
  }

  return false;
}

/**
 * Gathers all chunks for the provided sources in order, falling back to dynamic
 * text chunking if DB chunks are not yet indexed.
 */
export async function getAllSourceChunks(
  sources: SourceRecord[],
): Promise<SourceChunkItem[]> {
  const sourceIds = sources.map((s) => s.id);
  const dbChunks = await findChunksBySourceIds(sourceIds);

  const chunksBySourceId = new Map<string, SourceChunkRecord[]>();
  for (const c of dbChunks) {
    const list = chunksBySourceId.get(c.sourceId) ?? [];
    list.push(c);
    chunksBySourceId.set(c.sourceId, list);
  }

  const result: SourceChunkItem[] = [];

  for (const source of sources) {
    const chunks = chunksBySourceId.get(source.id) ?? [];
    if (chunks.length > 0) {
      for (const c of chunks) {
        result.push({
          sourceId: source.id,
          sourceTitle: source.title,
          chunkIndex: c.index,
          content: c.content.trim(),
        });
      }
    } else if (source.content && source.content.trim().length > 0) {
      const generated = chunkText(source.content.trim(), {
        chunkSize: 1500,
        chunkOverlap: 150,
      });
      for (const g of generated) {
        result.push({
          sourceId: source.id,
          sourceTitle: source.title,
          chunkIndex: g.index,
          content: g.content.trim(),
        });
      }
    }
  }

  return result;
}

/**
 * Partitions items into batches of up to batchSize.
 */
export function partitionIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export type BatchProgressMeta = {
  totalBatches: number;
  currentBatch: number;
  progress: number;
  totalChunks: number;
  processedChunks: number;
};

/**
 * Incrementally generates a comprehensive quiz from all chunks across selected sources,
 * returning the first batch rapidly and accumulating deduplicated questions in the background.
 */
export async function generateQuizIncrementally({
  sources,
  existingQuestions = [],
  onBatchProgress,
  isAborted,
}: {
  sources: SourceRecord[];
  existingQuestions?: QuizQuestion[];
  onBatchProgress: (
    questions: QuizQuestion[],
    meta: BatchProgressMeta,
  ) => Promise<void>;
  isAborted: () => boolean;
}): Promise<QuizQuestion[]> {
  const allChunks = await getAllSourceChunks(sources);

  if (allChunks.length === 0) {
    throw new ValidationError("Selected sources have no extractable content.");
  }

  // Group chunks into batches (2-3 chunks per batch, ~2500-3500 chars)
  // Ensures all chunks are covered across up to 12 batches max
  const BATCH_SIZE = Math.max(2, Math.ceil(allChunks.length / 12));
  const batches = partitionIntoBatches(allChunks, BATCH_SIZE);
  const totalBatches = batches.length;
  const totalChunks = allChunks.length;

  const accumulated: QuizQuestion[] = [...existingQuestions];
  const model = openaiProvider(resolveModelName(CHAT_MODEL));

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    if (isAborted()) {
      return accumulated;
    }

    const batchChunks = batches[bIdx];
    const processedChunks = Math.min(totalChunks, (bIdx + 1) * BATCH_SIZE);
    const progress = Math.round(((bIdx + 1) / totalBatches) * 100);

    const batchContext = batchChunks
      .map(
        (c) =>
          `[Source: "${c.sourceTitle}" | Section ${c.chunkIndex + 1}]\n${c.content}`,
      )
      .join("\n\n---\n\n");

    const recentExistingStems = accumulated
      .slice(-15)
      .map((q) => `- ${q.question}`)
      .join("\n");

    let batchQuestions: QuizQuestion[] = [];

    // Retry each batch up to 2 times for reliability
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const prompt = [
          "Create 3 to 5 clear multiple-choice questions with answer options (2 to 5 options), the correctIndex (0-indexed integer), and an educational explanation based on the excerpt below.",
          recentExistingStems
            ? `Do NOT duplicate or rephrase any of these previously generated questions:\n${recentExistingStems}\n`
            : "",
          "Excerpt:\n" + batchContext,
        ].join("\n\n");

        const result = await generateText({
          model,
          system:
            "You are an expert learning assistant creating multiple-choice practice quiz questions. Focus strictly on key facts, definitions, and concepts in the provided excerpt.",
          output: Output.object({ schema: quizBatchSchema }),
          prompt,
        });

        batchQuestions = result.output.questions;
        break;
      } catch (err) {
        if (attempt === 1) {
          console.warn(`Quiz batch ${bIdx + 1} generation failed after retry:`, err);
        }
      }
    }

    // Deduplicate against all accumulated questions
    for (const q of batchQuestions) {
      if (!isDuplicateQuizQuestion(accumulated, q)) {
        accumulated.push(q);
      }
    }

    if (isAborted()) {
      return accumulated;
    }

    // Deliver progressive results immediately to DB
    await onBatchProgress(accumulated, {
      totalBatches,
      currentBatch: bIdx + 1,
      progress,
      totalChunks,
      processedChunks,
    });
  }

  return accumulated;
}

/**
 * Incrementally generates a structured deep-dive research report, producing the
 * executive summary and initial sections first, then enriching subsequent sections.
 */
export async function generateReportIncrementally({
  sources,
  existingSections = [],
  onBatchProgress,
  isAborted,
}: {
  sources: SourceRecord[];
  existingSections?: ReportSection[];
  onBatchProgress: (
    report: { markdown: string; sections: ReportSection[] },
    meta: BatchProgressMeta,
  ) => Promise<void>;
  isAborted: () => boolean;
}): Promise<{ markdown: string; sections: ReportSection[] }> {
  const allChunks = await getAllSourceChunks(sources);

  if (allChunks.length === 0) {
    throw new ValidationError("Selected sources have no extractable content.");
  }

  const BATCH_SIZE = Math.max(3, Math.ceil(allChunks.length / 8));
  const batches = partitionIntoBatches(allChunks, BATCH_SIZE);
  const totalBatches = batches.length;
  const totalChunks = allChunks.length;

  const accumulatedSections: ReportSection[] = [...existingSections];
  let reportMarkdown = "";
  const model = openaiProvider(resolveModelName(CHAT_MODEL));

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    if (isAborted()) {
      return { markdown: reportMarkdown, sections: accumulatedSections };
    }

    const batchChunks = batches[bIdx];
    const processedChunks = Math.min(totalChunks, (bIdx + 1) * BATCH_SIZE);
    const progress = Math.round(((bIdx + 1) / totalBatches) * 100);

    const batchContext = batchChunks
      .map(
        (c) =>
          `[Source: "${c.sourceTitle}" | Part ${c.chunkIndex + 1}]\n${c.content}`,
      )
      .join("\n\n---\n\n");

    if (bIdx === 0 && accumulatedSections.length === 0) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await generateText({
            model,
            system:
              "You are an expert research analyst writing a deep-dive research report. Produce a structured executive summary and 2-3 analytical sections from the provided material.",
            output: Output.object({ schema: reportExecutiveSummarySchema }),
            prompt: `Generate the executive summary and initial 2-3 deep-dive sections for the following source material:\n\n${batchContext}`,
          });

          accumulatedSections.push({
            title: "Executive Summary",
            content: result.output.executiveSummary,
          });
          accumulatedSections.push(...result.output.sections);
          break;
        } catch (err) {
          if (attempt === 1) console.warn("Report initial batch failed:", err);
        }
      }
    } else {
      const existingTitles = accumulatedSections.map((s) => s.title).join(", ");
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await generateText({
            model,
            system:
              "You are expanding an in-depth research report. Analyze new source excerpts and generate detailed, non-duplicate sections.",
            output: Output.object({ schema: reportBatchSchema }),
            prompt: `Sections written so far: ${existingTitles}.\n\nAnalyze this new excerpt and write 1-2 new, detailed, non-duplicate analytical sections exploring these concepts:\n\n${batchContext}`,
          });

          for (const sec of result.output.sections) {
            if (
              !accumulatedSections.some(
                (s) => s.title.toLowerCase() === sec.title.toLowerCase(),
              )
            ) {
              accumulatedSections.push(sec);
            }
          }
          break;
        } catch (err) {
          if (attempt === 1) console.warn(`Report batch ${bIdx + 1} failed:`, err);
        }
      }
    }

    reportMarkdown = accumulatedSections
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");

    if (isAborted()) {
      return { markdown: reportMarkdown, sections: accumulatedSections };
    }

    await onBatchProgress(
      { markdown: reportMarkdown, sections: accumulatedSections },
      {
        totalBatches,
        currentBatch: bIdx + 1,
        progress,
        totalChunks,
        processedChunks,
      },
    );
  }

  return { markdown: reportMarkdown, sections: accumulatedSections };
}

/**
 * Collects text from ready workspace sources for artifact generation.
 */
export async function gatherSourceContext(
  workspaceId: string,
  sourceIds?: string[],
  artifactType?: ArtifactRecord["type"],
) {
  const allSources = await findSourcesByWorkspaceId(workspaceId);

  const selected = sourceIds?.length
    ? allSources.filter((source) => sourceIds.includes(source.id))
    : allSources;

  if (selected.length === 0) {
    throw new ValidationError(
      "No sources found. Add sources before generating learning tools.",
    );
  }

  const eligibleSources = selected.filter((source) => {
    const content = source.content?.trim();
    return Boolean(content && content.length > 0) || source.status === "READY";
  });

  if (eligibleSources.length === 0) {
    throw new ValidationError(
      "Selected sources have no extracted content yet. Please wait for indexing to finish.",
    );
  }

  const withContent = eligibleSources.flatMap((source) => {
    const content = source.content?.trim();
    return content ? [{ title: source.title, content }] : [];
  });

  const text = withContent
    .map((source) => `# ${source.title}\n\n${source.content}`)
    .join("\n\n---\n\n")
    .slice(0, MAX_CONTEXT_CHARS);

  return {
    text,
    sourceIds: eligibleSources.map((source) => source.id),
  };
}

/**
 * Generates structured or markdown content for single-shot learning artifacts using the AI SDK.
 */
export async function generateArtifactContent(
  type: ArtifactRecord["type"],
  sourceText: string,
) {
  const system = [
    `You are Smartbook, an expert learning assistant generating a ${type.toLowerCase()} from workspace source materials.`,
    "Use ONLY the provided source content. Do not invent facts not supported by the sources.",
    "Be clear, educational, and well-structured.",
  ].join("\n");

  const model = openaiProvider(resolveModelName(CHAT_MODEL));

  switch (type) {
    case "SUMMARY": {
      const result = await generateText({
        model,
        system,
        prompt: `Write a comprehensive markdown summary of the following sources:\n\n${sourceText}`,
      });
      return { markdown: result.text };
    }
    case "TAKEAWAYS": {
      const result = await generateText({
        model,
        system,
        output: Output.object({ schema: takeawaysSchema }),
        prompt: `Extract the most important key takeaways as concise bullet points from:\n\n${sourceText}`,
      });
      return result.output;
    }
    case "FLASHCARDS": {
      const result = await generateText({
        model,
        system,
        output: Output.object({ schema: flashcardsSchema }),
        prompt: `Create study flashcards (front/back) covering the main concepts from:\n\n${sourceText}`,
      });
      return result.output;
    }
    case "QUIZ": {
      const result = await generateText({
        model,
        system,
        output: Output.object({ schema: quizSchema }),
        prompt: `Create a multiple-choice quiz with explanations based on the following source excerpts:\n\n${sourceText}`,
      });
      return result.output;
    }
    case "MINDMAP": {
      const result = await generateText({
        model,
        system,
        output: Output.object({ schema: mindmapSchema }),
        prompt: `Create a mind map as nodes and edges. Use a central topic node and branch out logically from:\n\n${sourceText}`,
      });
      return result.output;
    }
    case "REPORT": {
      const result = await generateText({
        model,
        system,
        output: Output.object({ schema: reportSchema }),
        prompt: `Write a structured long-form report with sections and a full markdown version from:\n\n${sourceText}`,
      });
      return result.output;
    }
    default:
      throw new ValidationError(`Unsupported artifact type: ${type}`);
  }
}
import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "./ai-config.js";

let client: OpenAI | null = null;

export function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is configured");
  }
  return key;
}

export function isOpenRouter(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

export function resolveModelName(model: string): string {
  if (isOpenRouter()) {
    return model.startsWith("openai/") ? model : `openai/${model}`;
  }
  return model.replace(/^openai\//, "");
}

export const openaiProvider = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined,
});

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const apiKey = getApiKey();

  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: isOpenRouter() ? "https://openrouter.ai/api/v1" : undefined,
    });
  }

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

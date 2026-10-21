import type { Request, Response } from "express";
import type { UIMessage } from "ai";
import {
  createConversationForWorkspace,
  deleteConversationForWorkspace,
  getConversationMessagesForWorkspace,
  listConversationsForWorkspace,
  streamWorkspaceChat,
  updateConversationForWorkspace,
} from "../services/chat.services.js";
import { ValidationError } from "../types/app-error.js";
import { getZodFieldErrors } from "../utils/zod-error.js";
import {
  chatBodySchema,
  conversationIdParamSchema,
  createConversationSchema,
  updateConversationSchema,
} from "../validators/chat.validator.js";
import { workspaceIdParamSchema } from "../validators/workspace.validator.js";

function parseWorkspaceId(params: Request["params"]) {
  const parsed = workspaceIdParamSchema.safeParse(params);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid workspace id",
      getZodFieldErrors(parsed.error),
    );
  }
  return parsed.data;
}

function parseConversationParams(params: Request["params"]) {
  const parsed = conversationIdParamSchema.safeParse(params);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid conversation id",
      getZodFieldErrors(parsed.error),
    );
  }
  return parsed.data;
}

function parseChatBody(body: unknown) {
  const parsed = chatBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid chat payload",
      getZodFieldErrors(parsed.error),
    );
  }
  return parsed.data;
}

function parseCreateConversationBody(body: unknown) {
  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid conversation payload",
      getZodFieldErrors(parsed.error),
    );
  }
  return parsed.data;
}

export async function streamChat(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const input = parseChatBody(req.body);

  await streamWorkspaceChat(res, workspaceId, req.session.user.id, {
    conversationId: input.conversationId,
    messages: input.messages as unknown as UIMessage[],
    model: input.model,
    webSearch: input.webSearch,
  });
}

export async function listConversations(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const conversations = await listConversationsForWorkspace(
    workspaceId,
    req.session.user.id,
  );
  res.json(conversations);
}

export async function createConversation(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const input = parseCreateConversationBody(req.body);
  const conversation = await createConversationForWorkspace(
    workspaceId,
    req.session.user.id,
    input.title,
  );
  res.status(201).json(conversation);
}

export async function getConversationMessages(req: Request, res: Response) {
  const { workspaceId, conversationId } = parseConversationParams(req.params);
  const messages = await getConversationMessagesForWorkspace(
    workspaceId,
    conversationId,
    req.session.user.id,
  );
  res.json(messages);
}

export async function deleteConversation(req: Request, res: Response) {
  const { workspaceId, conversationId } = parseConversationParams(req.params);
  await deleteConversationForWorkspace(
    workspaceId,
    conversationId,
    req.session.user.id,
  );
  res.status(204).send();
}

function parseUpdateConversationBody(body: unknown) {
  const parsed = updateConversationSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid conversation payload",
      getZodFieldErrors(parsed.error),
    );
  }
  return parsed.data;
}

export async function updateConversation(req: Request, res: Response) {
  const { workspaceId, conversationId } = parseConversationParams(req.params);
  const input = parseUpdateConversationBody(req.body);
  const updated = await updateConversationForWorkspace(
    workspaceId,
    conversationId,
    req.session.user.id,
    input.title,
  );
  res.json(updated);
}

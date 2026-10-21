import type {
  AppMemory,
  Conversation,
  CreateArtifactInput,
  CreateWorkspaceInput,
  LearningArtifact,
  Message,
  Source,
  UpdateWorkspaceInput,
  Workspace,
} from "./types.js";

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:8081";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.statusText}`;
    try {
      const data = await response.json();
      errorMessage = data.error || data.message || errorMessage;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

// Workspaces
export async function getWorkspaces(): Promise<Workspace[]> {
  return request<Workspace[]>("/api/workspaces");
}

export async function getWorkspace(id: string): Promise<Workspace> {
  return request<Workspace>(`/api/workspaces/${id}`);
}

export async function createWorkspace(
  data: CreateWorkspaceInput,
): Promise<Workspace> {
  return request<Workspace>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWorkspace(
  id: string,
  data: UpdateWorkspaceInput,
): Promise<Workspace> {
  return request<Workspace>(`/api/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  return request<void>(`/api/workspaces/${id}`, {
    method: "DELETE",
  });
}

// Sources
export async function getSources(
  workspaceId: string,
  filters?: { q?: string; type?: string; status?: string },
): Promise<Source[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return request<Source[]>(
    `/api/workspaces/${workspaceId}/sources${qs ? `?${qs}` : ""}`,
  );
}

export async function getSource(
  workspaceId: string,
  sourceId: string,
): Promise<Source> {
  return request<Source>(`/api/workspaces/${workspaceId}/sources/${sourceId}`);
}

export async function createTextSource(
  workspaceId: string,
  data: { type: "TEXT" | "MARKDOWN"; title: string; content: string },
): Promise<Source> {
  return request<Source>(`/api/workspaces/${workspaceId}/sources`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function uploadPdfSource(
  workspaceId: string,
  file: File,
  title?: string,
): Promise<Source> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);

  const url = `${BASE_URL}/api/workspaces/${workspaceId}/sources/upload`;
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Upload failed";
    try {
      const data = await response.json();
      errorMessage = data.error || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function importWebsiteSource(
  workspaceId: string,
  data: { url: string; title?: string },
): Promise<Source> {
  return request<Source>(
    `/api/workspaces/${workspaceId}/sources/import/website`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function importYoutubeSource(
  workspaceId: string,
  data: { url: string; title?: string },
): Promise<Source> {
  return request<Source>(
    `/api/workspaces/${workspaceId}/sources/import/youtube`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteSource(
  workspaceId: string,
  sourceId: string,
): Promise<void> {
  return request<void>(
    `/api/workspaces/${workspaceId}/sources/${sourceId}`,
    {
      method: "DELETE",
    },
  );
}

export async function bulkDeleteSources(
  workspaceId: string,
  sourceIds: string[],
): Promise<void> {
  return request<void>(
    `/api/workspaces/${workspaceId}/sources/bulk-delete`,
    {
      method: "POST",
      body: JSON.stringify({ sourceIds }),
    },
  );
}

// Conversations
export async function getConversations(
  workspaceId: string,
): Promise<Conversation[]> {
  return request<Conversation[]>(
    `/api/workspaces/${workspaceId}/conversations`,
  );
}

export async function createConversation(
  workspaceId: string,
  data?: { title?: string },
): Promise<Conversation> {
  return request<Conversation>(
    `/api/workspaces/${workspaceId}/conversations`,
    {
      method: "POST",
      body: JSON.stringify(data || {}),
    },
  );
}

export async function getConversationMessages(
  workspaceId: string,
  conversationId: string,
): Promise<Message[]> {
  return request<Message[]>(
    `/api/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
  );
}

export async function deleteConversation(
  workspaceId: string,
  conversationId: string,
): Promise<void> {
  return request<void>(
    `/api/workspaces/${workspaceId}/conversations/${conversationId}`,
    {
      method: "DELETE",
    },
  );
}

// Artifacts
export async function getArtifacts(
  workspaceId: string,
): Promise<LearningArtifact[]> {
  return request<LearningArtifact[]>(
    `/api/workspaces/${workspaceId}/artifacts`,
  );
}

export async function getArtifact(
  workspaceId: string,
  artifactId: string,
): Promise<LearningArtifact> {
  return request<LearningArtifact>(
    `/api/workspaces/${workspaceId}/artifacts/${artifactId}`,
  );
}

export async function createArtifact(
  workspaceId: string,
  data: CreateArtifactInput,
): Promise<LearningArtifact> {
  return request<LearningArtifact>(
    `/api/workspaces/${workspaceId}/artifacts`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateArtifact(
  workspaceId: string,
  artifactId: string,
  data: {
    title?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<LearningArtifact> {
  return request<LearningArtifact>(
    `/api/workspaces/${workspaceId}/artifacts/${artifactId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteArtifact(
  workspaceId: string,
  artifactId: string,
): Promise<void> {
  return request<void>(
    `/api/workspaces/${workspaceId}/artifacts/${artifactId}`,
    {
      method: "DELETE",
    },
  );
}

// Memories
export async function getMemories(): Promise<AppMemory[]> {
  return request<AppMemory[]>("/api/memory");
}

export async function createMemory(memory: string): Promise<AppMemory> {
  return request<AppMemory>("/api/memory", {
    method: "POST",
    body: JSON.stringify({ memory }),
  });
}

export async function updateMemory(
  memoryId: string,
  memory: string,
): Promise<AppMemory> {
  return request<AppMemory>(`/api/memory/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify({ memory }),
  });
}

export async function deleteMemory(memoryId: string): Promise<void> {
  return request<void>(`/api/memory/${memoryId}`, {
    method: "DELETE",
  });
}

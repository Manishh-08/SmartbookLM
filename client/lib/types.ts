export type Workspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  defaultModel: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkspaceInput = {
  title: string;
  description?: string;
  icon?: string;
  defaultModel?: string;
};

export type UpdateWorkspaceInput = Partial<CreateWorkspaceInput>;

export type SourceType = "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";
export type SourceStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type Source = {
  id: string;
  workspaceId: string;
  type: SourceType;
  title: string;
  content: string | null;
  url: string | null;
  status: SourceStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  workspaceId: string;
  title: string | null;
  summary: string | null;
  summaryMessageCount: number;
  summarizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Citation = {
  sourceId?: string;
  sourceTitle: string;
  sourceType: string;
  chunkId?: string;
  chunkIndex?: number;
  page?: number;
  excerpt: string;
  score?: number;
  url?: string;
};

export type MessageRole = "USER" | "ASSISTANT";

export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations?: Citation[] | null;
  createdAt: string;
};

export type ArtifactType =
  | "SUMMARY"
  | "TAKEAWAYS"
  | "FLASHCARDS"
  | "QUIZ"
  | "MINDMAP"
  | "REPORT";

export type ArtifactStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type SummaryContent = {
  markdown: string;
};

export type TakeawaysContent = {
  items: string[];
};

export type FlashcardsContent = {
  cards: Array<{ front: string; back: string }>;
};

export type QuizContent = {
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
};

export type QuizBestScore = {
  score: number;
  total: number;
  percent: number;
  completedAt: string;
  attemptsCount: number;
};

export type MindmapContent = {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ id: string; source: string; target: string }>;
};

export type ReportContent = {
  markdown: string;
  sections: Array<{ title: string; content: string }>;
};

export type ArtifactContent =
  | SummaryContent
  | TakeawaysContent
  | FlashcardsContent
  | QuizContent
  | MindmapContent
  | ReportContent;

export type LearningArtifact = {
  id: string;
  workspaceId: string;
  type: ArtifactType;
  title: string;
  content: ArtifactContent | null;
  sourceIds: string[];
  status: ArtifactStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateArtifactInput = {
  type: ArtifactType;
  title?: string;
  sourceIds?: string[];
};

export type AppMemory = {
  id: string;
  memory: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
  categories?: string[];
  source: "manual" | "learned";
};

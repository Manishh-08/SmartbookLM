import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "smartbooklm" });

export type SourceCreatedEvent = {
  name: "source/created";
  data: {
    sourceId: string;
    workspaceId: string;
  };
};

export type ArtifactGenerateEvent = {
  name: "artifact/generate";
  data: {
    artifactId: string;
    workspaceId: string;
  };
};

export type ArtifactCancelEvent = {
  name: "artifact/cancel";
  data: {
    artifactId: string;
    workspaceId: string;
  };
};

export type ConversationSummarizeEvent = {
  name: "conversation/summarize";
  data: {
    conversationId: string;
    userId: string;
  };
};

export type InngestEvents =
  | SourceCreatedEvent
  | ArtifactGenerateEvent
  | ArtifactCancelEvent
  | ConversationSummarizeEvent;


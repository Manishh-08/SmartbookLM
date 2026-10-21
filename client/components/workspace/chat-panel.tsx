"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Globe,
  Loader2,
  Trash2,
  MessageSquare,
  Plus,
  ChevronDown,
  PanelLeft,
  PanelRight,
  ArrowRight,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteConversation,
  getConversationMessages,
  getConversations,
  updateConversation,
} from "@/lib/api";
import type { Conversation } from "@/lib/types";

interface ChatPanelProps {
  workspaceId: string;
  defaultModel?: string;
  showSources?: boolean;
  onToggleSources?: () => void;
  showStudio?: boolean;
  onToggleStudio?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:8081";

export function ChatPanel({
  workspaceId,
  defaultModel = "gpt-4o-mini",
  showSources,
  onToggleSources,
  showStudio,
  onToggleStudio,
}: ChatPanelProps) {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const currentLoadingConvIdRef = useRef<string | null>(null);
  const initializedWorkspaceRef = useRef<string | null>(null);

  // Fetch past conversations
  const { data: conversations = [], isSuccess } = useQuery({
    queryKey: ["conversations", workspaceId],
    queryFn: () => getConversations(workspaceId),
  });

  const deleteConvMutation = useMutation({
    mutationFn: (convId: string) => deleteConversation(workspaceId, convId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });
      if (activeConversationId === deletedId) {
        try {
          localStorage.removeItem(`smartbook_active_conv_${workspaceId}`);
        } catch {}
        setActiveConversationId(undefined);
        setMessages([]);
      }
    },
  });

  const [renamingConv, setRenamingConv] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const renameConvMutation = useMutation({
    mutationFn: ({
      convId,
      title,
    }: {
      convId: string;
      title: string;
    }) => updateConversation(workspaceId, convId, { title }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Conversation[]>(
        ["conversations", workspaceId],
        (prev = []) => prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setRenamingConv(null);
      setNewTitle("");
    },
  });

  // Load message history when selecting an existing conversation
  const loadConversation = async (conv: Conversation) => {
    setActiveConversationId(conv.id);
    currentLoadingConvIdRef.current = conv.id;
    try {
      localStorage.setItem(`smartbook_active_conv_${workspaceId}`, conv.id);
    } catch {}

    setIsLoadingHistory(true);
    try {
      const history = await getConversationMessages(workspaceId, conv.id);
      if (currentLoadingConvIdRef.current === conv.id) {
        setMessages(
          history.map((m) => ({
            id: m.id,
            role: m.role.toLowerCase() as "user" | "assistant",
            content: m.content,
          })),
        );
      }
    } catch (e) {
      console.error("Failed to load conversation history:", e);
    } finally {
      if (currentLoadingConvIdRef.current === conv.id) {
        setIsLoadingHistory(false);
      }
    }
  };

  const handleStartNewChat = () => {
    initializedWorkspaceRef.current = workspaceId;
    currentLoadingConvIdRef.current = null;
    try {
      localStorage.removeItem(`smartbook_active_conv_${workspaceId}`);
    } catch {}
    setActiveConversationId(undefined);
    setMessages([]);
  };

  // Reset active state when workspace changes
  useEffect(() => {
    initializedWorkspaceRef.current = null;
    setActiveConversationId(undefined);
    setMessages([]);
  }, [workspaceId]);

  // Auto-load latest or previously active conversation on initial load
  useEffect(() => {
    if (initializedWorkspaceRef.current === workspaceId) return;
    if (!isSuccess || !conversations) return;

    initializedWorkspaceRef.current = workspaceId;

    if (conversations.length > 0) {
      let targetConv: Conversation | undefined;
      try {
        const savedId = localStorage.getItem(
          `smartbook_active_conv_${workspaceId}`,
        );
        if (savedId) {
          targetConv = conversations.find((c) => c.id === savedId);
        }
      } catch {}

      const convToLoad = targetConv || conversations[0];
      loadConversation(convToLoad);
    }
  }, [conversations, isSuccess, workspaceId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const activeConvTitle = activeConv
    ? activeConv.title || "Untitled Chat"
    : activeConversationId
      ? "Untitled Chat"
      : "New Chat";

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    const newHistory = [...messages, userMessage];
    setMessages([...newHistory, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${SERVER_URL}/api/workspaces/${workspaceId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            conversationId: activeConversationId,
            messages: newHistory.map((m) => ({
              role: m.role,
              parts: [{ type: "text", text: m.content }],
            })),
            model: selectedModel,
            webSearch: webSearchEnabled,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Chat error (${response.status})`);
      }

      const headerConvId = response.headers.get("X-Conversation-Id");
      if (headerConvId && headerConvId !== activeConversationId) {
        setActiveConversationId(headerConvId);
        try {
          localStorage.setItem(
            `smartbook_active_conv_${workspaceId}`,
            headerConvId,
          );
        } catch {}
        queryClient.invalidateQueries({
          queryKey: ["conversations", workspaceId],
        });
      }

      if (!response.body) {
        throw new Error("No response stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === "text-delta") {
              const delta = parsed.delta ?? parsed.text ?? "";
              assistantText += delta;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    content: assistantText,
                  };
                }
                return next;
              });
            }
          } catch {
            // ignore chunk parse errors
          }
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });
    } catch (error) {
      console.error("Chat streaming failed:", error);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          next[next.length - 1] = {
            ...last,
            content:
              "Sorry, an error occurred while streaming the response. Please make sure your sources are ready and try again.",
          };
        }
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="flex flex-col h-full bg-background relative min-w-0 min-h-0 overflow-hidden">
      {/* Chat Header */}
      <div className="h-14 px-3 sm:px-4 border-b flex items-center justify-between gap-2 bg-card/40 shrink-0 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {onToggleSources && (
            <Button
              variant={!showSources ? "outline" : "ghost"}
              size={!showSources ? "sm" : "icon"}
              className={`h-8 text-xs font-semibold hidden lg:inline-flex shrink-0 rounded-lg transition ${
                !showSources
                  ? "gap-1.5 px-2.5 bg-primary/10 border-primary/25 text-primary hover:bg-primary/20 hover:text-primary shadow-2xs"
                  : "w-8 text-muted-foreground hover:text-foreground"
              }`}
              onClick={onToggleSources}
              title={showSources ? "Collapse Sources sidebar" : "Show Sources sidebar"}
            >
              <PanelLeft className="h-4 w-4" />
              {!showSources && <span>Sources</span>}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 gap-1.5 text-xs sm:text-sm max-w-[170px] sm:max-w-[220px] md:max-w-[280px] truncate font-medium border rounded-lg px-2.5 inline-flex items-center justify-between bg-background cursor-pointer hover:bg-muted/40 transition outline-none shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{activeConvTitle}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-1.5">
              <DropdownMenuItem
                onClick={handleStartNewChat}
                className={`cursor-pointer gap-2.5 font-medium text-sm py-2 rounded-lg ${
                  !activeConversationId
                    ? "bg-muted font-semibold text-foreground"
                    : ""
                }`}
              >
                <Plus className="h-4 w-4 text-primary" />
                <span className="flex-1">New Chat</span>
                {!activeConversationId && (
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    Active
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {conversations.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No previous conversations
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <DropdownMenuItem
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={`flex items-center justify-between group cursor-pointer text-sm py-2 rounded-lg ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <MessageSquare
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isActive ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span className="truncate">
                          {conv.title || "Untitled Chat"}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setRenamingConv(conv);
                            setNewTitle(conv.title || "");
                          }}
                          title="Rename chat"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            deleteConvMutation.mutate(conv.id);
                          }}
                          title="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
            onClick={handleStartNewChat}
            title="Start new chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls: Model & Web Search & Toggle Studio */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
          <div className="flex items-center gap-1.5 border rounded-lg px-2 h-8 bg-background text-xs font-medium shadow-2xs">
            <Globe
              className={`h-3.5 w-3.5 ${
                webSearchEnabled ? "text-blue-500" : "text-muted-foreground"
              }`}
            />
            <span className="hidden sm:inline">Web</span>
            <Switch
              checked={webSearchEnabled}
              onCheckedChange={setWebSearchEnabled}
              className="scale-75"
              aria-label="Toggle web search"
            />
          </div>

          <Select
            value={selectedModel}
            onValueChange={(val) => {
              if (val) setSelectedModel(val);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[115px] sm:w-[130px] bg-background rounded-lg shadow-2xs">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="gpt-4o-mini" className="text-xs">GPT-4o Mini</SelectItem>
              <SelectItem value="gpt-4o" className="text-xs">GPT-4o</SelectItem>
            </SelectContent>
          </Select>

          <Link
            href={`/workspace/${workspaceId}/studio`}
            className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 text-xs font-semibold transition shadow-2xs shrink-0"
            title="Open AI Studio"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Studio</span>
            <ArrowRight className="h-3 w-3 opacity-70" />
          </Link>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 sm:p-8 max-w-lg mx-auto gap-4">
            <div className="p-4 rounded-3xl bg-primary/10 text-primary shadow-xs">
              <Sparkles className="h-10 w-10" />
            </div>
            <h3 className="font-bold text-foreground text-lg sm:text-xl">
              Chat with your Workspace Sources
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask questions across your uploaded PDFs, scraped web pages, YouTube
              transcripts, and notes. SmartBookLM provides concise,
              citation-backed answers.
            </p>
            <div className="grid grid-cols-1 gap-2.5 w-full pt-3 text-left">
              {[
                "What are the main concepts covered in my sources?",
                "Give me a study guide breakdown of the key topics",
                "Explain the most complex topic in simple terms with an analogy",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  className="text-sm p-3.5 rounded-xl border bg-card/70 hover:bg-card hover:border-primary/50 transition text-left text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer font-medium"
                  onClick={() => handleSendMessage(suggestion)}
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, idx) => {
            const isUser = message.role === "user";
            const isLastMessage = idx === messages.length - 1;
            const isThinking = !isUser && isLoading && isLastMessage && !message.content;

            return (
              <div
                key={message.id}
                className={`flex gap-3 text-base ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="h-5 w-5" />
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 sm:px-5 py-3 max-w-[90%] sm:max-w-[85%] leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-xs font-normal"
                      : "bg-muted/40 border rounded-tl-xs text-foreground max-w-none shadow-2xs"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-[15px] sm:text-base">{message.content}</p>
                  ) : isThinking ? (
                    <div className="flex items-center gap-1.5 py-1.5 px-1 min-h-[24px]">
                      <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.32s]" />
                      <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.16s]" />
                      <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" />
                    </div>
                  ) : (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="h-8 w-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading &&
          (messages.length === 0 ||
            messages[messages.length - 1].role === "user") && (
            <div className="flex gap-3 text-base justify-start">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Bot className="h-5 w-5" />
              </div>
              <div className="rounded-2xl px-4 sm:px-5 py-3 bg-muted/40 border rounded-tl-xs text-foreground shadow-2xs">
                <div className="flex items-center gap-1.5 py-1.5 px-1 min-h-[24px]">
                  <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.32s]" />
                  <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.16s]" />
                  <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" />
                </div>
              </div>
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 sm:p-4 border-t bg-card/40 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2.5">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              messages.length === 0
                ? "Ask a question about your sources... (Shift+Enter for newline)"
                : "Ask SmartbookLM"
            }
            className="min-h-[48px] max-h-[160px] resize-none pr-14 text-base sm:text-sm rounded-xl bg-background shadow-xs py-3"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  handleSubmit(e);
                }
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 rounded-xl shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Answers are synthesized strictly from workspace sources with citation
          support.
        </p>
      </div>

      {/* Rename Chat Modal */}
      <Dialog
        open={!!renamingConv}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingConv(null);
            setNewTitle("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Rename Chat</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = newTitle.trim();
              if (!renamingConv || !trimmed) return;
              renameConvMutation.mutate({
                convId: renamingConv.id,
                title: trimmed,
              });
            }}
            className="space-y-4 pt-2"
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new chat title..."
              autoFocus
              maxLength={120}
              className="text-sm rounded-lg"
            />
            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRenamingConv(null);
                  setNewTitle("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newTitle.trim() || renameConvMutation.isPending}
              >
                {renameConvMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

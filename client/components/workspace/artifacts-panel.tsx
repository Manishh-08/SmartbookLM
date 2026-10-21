"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  Lightbulb,
  Layers,
  HelpCircle,
  Network,
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Copy,
  Check,
  PanelRight,
  Award,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MindmapFlowViewer } from "./mindmap-flow";
import {
  createArtifact,
  deleteArtifact,
  getArtifacts,
  updateArtifact,
} from "@/lib/api";
import type {
  ArtifactType,
  FlashcardsContent,
  LearningArtifact,
  MindmapContent,
  QuizContent,
  QuizBestScore,
  ReportContent,
  SummaryContent,
  TakeawaysContent,
} from "@/lib/types";

interface ArtifactsPanelProps {
  workspaceId: string;
  selectedSourceIds: string[];
}

export const STUDIO_TOOLS: Array<{
  type: ArtifactType;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    type: "SUMMARY",
    title: "Summary",
    desc: "Executive overview of your sources",
    icon: FileText,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    type: "TAKEAWAYS",
    title: "Key Takeaways",
    desc: "High-impact takeaways & bullet insights",
    icon: Lightbulb,
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    type: "FLASHCARDS",
    title: "Study Flashcards",
    desc: "Interactive question & concept flip cards",
    icon: Layers,
    color: "text-purple-500 bg-purple-500/10",
  },
  {
    type: "QUIZ",
    title: "Practice Quiz",
    desc: "Multiple choice test with explanations",
    icon: HelpCircle,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    type: "MINDMAP",
    title: "Mind Map",
    desc: "Structured visual concept network",
    icon: Network,
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    type: "REPORT",
    title: "Deep-Dive Report",
    desc: "Structured long-form research report",
    icon: BookOpen,
    color: "text-rose-500 bg-rose-500/10",
  },
];

export function ArtifactsPanel({
  workspaceId,
  selectedSourceIds,
}: ArtifactsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  );

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ["artifacts", workspaceId],
    queryFn: () => getArtifacts(workspaceId),
    refetchInterval: (query) => {
      const data = query.state.data as LearningArtifact[] | undefined;
      const isProcessing = data?.some(
        (a) => a.status === "PROCESSING" || a.status === "PENDING",
      );
      return isProcessing ? 1500 : false;
    },
  });

  const selectedArtifact =
    artifacts.find((a) => a.id === selectedArtifactId) || null;

  const createMutation = useMutation({
    mutationFn: (type: ArtifactType) =>
      createArtifact(workspaceId, {
        type,
        sourceIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
      }),
    onMutate: async (type: ArtifactType) => {
      await queryClient.cancelQueries({ queryKey: ["artifacts", workspaceId] });

      const previousArtifacts =
        queryClient.getQueryData<LearningArtifact[]>([
          "artifacts",
          workspaceId,
        ]) || [];

      const tool = STUDIO_TOOLS.find((t) => t.type === type);
      const tempId = `optimistic-${Date.now()}`;
      const optimisticArtifact: LearningArtifact = {
        id: tempId,
        workspaceId,
        type,
        title: `${tool?.title || type} · ${new Date().toLocaleDateString(
          undefined,
          {
            month: "short",
            day: "numeric",
          },
        )}`,
        content: null,
        status: "PROCESSING",
        sourceIds: selectedSourceIds,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<LearningArtifact[]>(
        ["artifacts", workspaceId],
        [optimisticArtifact, ...previousArtifacts],
      );

      return { previousArtifacts, tempId };
    },
    onSuccess: (newArtifact, _type, context) => {
      queryClient.setQueryData<LearningArtifact[]>(
        ["artifacts", workspaceId],
        (old = []) =>
          old.map((item) =>
            item.id === context?.tempId ? newArtifact : item,
          ),
      );
      if (selectedArtifactId === context?.tempId) {
        setSelectedArtifactId(newArtifact.id);
      }
      queryClient.invalidateQueries({ queryKey: ["artifacts", workspaceId] });
    },
    onError: (err: Error, _type, context) => {
      if (context?.tempId) {
        queryClient.setQueryData<LearningArtifact[]>(
          ["artifacts", workspaceId],
          (old = []) =>
            old.map((item) =>
              item.id === context.tempId
                ? {
                    ...item,
                    status: "FAILED",
                    metadata: { processingError: err.message },
                  }
                : item,
            ),
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (id.startsWith("optimistic-")) {
        return Promise.resolve();
      }
      return deleteArtifact(workspaceId, id);
    },
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: ["artifacts", workspaceId] });
      const previousArtifacts =
        queryClient.getQueryData<LearningArtifact[]>([
          "artifacts",
          workspaceId,
        ]) || [];
      queryClient.setQueryData<LearningArtifact[]>(
        ["artifacts", workspaceId],
        previousArtifacts.filter((a) => a.id !== deletedId),
      );
      if (selectedArtifactId === deletedId) {
        setSelectedArtifactId(null);
      }
      return { previousArtifacts };
    },
    onError: (_err, _deletedId, context) => {
      if (context?.previousArtifacts) {
        queryClient.setQueryData(
          ["artifacts", workspaceId],
          context.previousArtifacts,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["artifacts", workspaceId] });
    },
  });

  return (
    <div className="flex flex-col h-full bg-card/20 overflow-hidden min-w-0">
      <div className="h-14 px-3.5 sm:px-4 border-b flex items-center justify-between gap-2 bg-card/40 shrink-0 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="font-bold text-sm sm:text-base">Studio</h2>
        </div>
        {selectedSourceIds.length > 0 && (
          <Badge variant="outline" className="text-xs h-5 px-2 font-medium shrink-0 whitespace-nowrap">
            Targeting {selectedSourceIds.length} source(s)
          </Badge>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-5 overscroll-contain">
        {/* Quick Generate Tools */}
          <div>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              Generate Study Tools
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {STUDIO_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isGenerating =
                  createMutation.isPending &&
                  createMutation.variables === tool.type;

                return (
                  <button
                    key={tool.type}
                    disabled={createMutation.isPending}
                    onClick={() => createMutation.mutate(tool.type)}
                    className="flex flex-col items-start p-3 sm:p-3.5 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/40 transition text-left group disabled:opacity-50 min-h-[96px] cursor-pointer shadow-2xs"
                  >
                    <div
                      className={`p-2 rounded-lg mb-2 transition ${tool.color}`}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                      ) : (
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition leading-tight">
                      {tool.title}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-snug">
                      {tool.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generated Artifacts List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Generated Library
              </p>
              <Badge variant="secondary" className="text-xs h-5 px-2 font-medium">
                {artifacts.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground gap-2.5">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading studio tools...
              </div>
            ) : artifacts.length === 0 ? (
              <div className="text-center p-6 sm:p-8 border rounded-2xl bg-card/40 text-muted-foreground">
                <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="font-semibold text-sm text-foreground">No tools generated yet</p>
                <p className="text-xs mt-1 leading-relaxed">
                  Pick a study tool above to synthesize your workspace sources.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {artifacts.map((artifact) => {
                  const toolConfig = STUDIO_TOOLS.find(
                    (t) => t.type === artifact.type,
                  );
                  const Icon = toolConfig?.icon || FileText;
                  const isReady = artifact.status === "READY";
                  const isProcessing =
                    artifact.status === "PROCESSING" ||
                    artifact.status === "PENDING";

                  return (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border bg-card hover:bg-muted/40 transition cursor-pointer group min-h-[52px] shadow-2xs"
                      onClick={() => setSelectedArtifactId(artifact.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            toolConfig?.color || "bg-muted"
                          }`}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {artifact.title}
                          </p>
                          <span className="text-xs text-muted-foreground mt-0.5 block">
                            {isProcessing
                              ? artifact.type === "QUIZ" &&
                                (artifact.content as QuizContent)?.questions?.length
                                ? `Generating... (${(artifact.content as QuizContent).questions.length} questions ready)`
                                : artifact.type === "REPORT" &&
                                  (artifact.content as ReportContent)?.sections?.length
                                ? `Generating... (${
                                    artifact.metadata &&
                                    typeof artifact.metadata === "object" &&
                                    "progress" in artifact.metadata
                                      ? artifact.metadata.progress
                                      : 30
                                  }% ready)`
                                : "Synthesizing..."
                              : isReady
                              ? artifact.type === "QUIZ"
                                ? (() => {
                                    const best = (artifact.metadata as any)?.bestScore as QuizBestScore | undefined;
                                    const qCount = (artifact.content as QuizContent)?.questions?.length || 0;
                                    return best
                                      ? `Best: ${best.percent}% (${best.score}/${best.total}) · Retake (${qCount} Qs)`
                                      : `Ready · Take Quiz (${qCount} Qs)`;
                                  })()
                                : artifact.type === "FLASHCARDS"
                                ? "Ready · Study Cards"
                                : "Ready to view"
                              : "Generation failed"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground opacity-80 sm:opacity-0 group-hover:opacity-100 hover:text-destructive transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(artifact.id);
                          }}
                          title="Delete tool"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {/* Artifact Viewer Modal */}
      {selectedArtifact && (
        <ArtifactViewerModal
          artifact={selectedArtifact}
          open={!!selectedArtifact}
          onOpenChange={(open) => !open && setSelectedArtifactId(null)}
        />
      )}
    </div>
  );
}

// ---------------- Interactive Artifact Viewer ---------------- //

export function ArtifactViewerModal({
  artifact,
  open,
  onOpenChange,
}: {
  artifact: LearningArtifact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const isPending =
    artifact.status === "PENDING" || artifact.status === "PROCESSING";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasContent = Boolean(
    artifact.content &&
      ((artifact.type === "QUIZ" &&
        ((artifact.content as QuizContent).questions?.length ?? 0) > 0) ||
        (artifact.type === "REPORT" &&
          ((artifact.content as ReportContent).sections?.length ?? 0) > 0) ||
        (artifact.type === "FLASHCARDS" &&
          ((artifact.content as FlashcardsContent).cards?.length ?? 0) > 0) ||
        (artifact.type === "SUMMARY" &&
          Boolean((artifact.content as SummaryContent).markdown)) ||
        (artifact.type === "TAKEAWAYS" &&
          ((artifact.content as TakeawaysContent).items?.length ?? 0) > 0) ||
        (artifact.type === "MINDMAP" &&
          ((artifact.content as MindmapContent).nodes?.length ?? 0) > 0)),
  );

  const progress =
    artifact.metadata &&
    typeof artifact.metadata === "object" &&
    "progress" in artifact.metadata
      ? Number(artifact.metadata.progress)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`w-[95vw] ${
          artifact.type === "MINDMAP"
            ? "sm:max-w-[1180px] h-[92vh] max-h-[92vh]"
            : "sm:max-w-[780px] max-h-[88vh]"
        } flex flex-col p-4 sm:p-6`}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Badge variant="secondary" className="text-xs sm:text-sm font-medium px-2.5 py-0.5">
                {artifact.type}
              </Badge>
              <DialogTitle className="text-lg sm:text-xl font-bold">
                {artifact.title}
              </DialogTitle>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Synthesized from workspace sources
            </p>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          {/* Progressive Background Generation Banner */}
          {isPending && hasContent && (
            <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm shadow-2xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                <span>
                  {artifact.type === "QUIZ"
                    ? `Generating additional questions across source chunks... (${
                        (artifact.content as QuizContent).questions.length
                      } questions ready${progress ? ` · ${progress}% processed` : ""})`
                    : `Processing remaining source chapters... (${progress || 40}% processed)`}
                </span>
              </div>
              {progress !== null && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:w-28 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">
                    {progress}%
                  </span>
                </div>
              )}
            </div>
          )}

          {isPending && !hasContent ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3.5 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
              <p className="font-bold text-base sm:text-lg">Analyzing source material...</p>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Processing source chunks systematically. Initial results will appear as soon as the first chunk is analyzed.
              </p>
            </div>
          ) : artifact.status === "FAILED" && !hasContent ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-destructive gap-2.5">
              <XCircle className="h-9 w-9" />
              <p className="font-bold text-base sm:text-lg">Generation Failed</p>
              <p className="text-sm text-muted-foreground">
                Please make sure your sources have processed content and try
                again.
              </p>
            </div>
          ) : !artifact.content ? (
            <p className="text-center text-muted-foreground text-sm py-12">
              No content found
            </p>
          ) : (
            <ArtifactContentRenderer
              type={artifact.type}
              content={artifact.content}
              onCopy={handleCopy}
              copied={copied}
              artifactId={artifact.id}
              workspaceId={artifact.workspaceId}
              metadata={artifact.metadata}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArtifactContentRenderer({
  type,
  content,
  onCopy,
  copied,
  artifactId,
  workspaceId,
  metadata,
}: {
  type: ArtifactType;
  content: any;
  onCopy: (text: string) => void;
  copied: boolean;
  artifactId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown> | null;
}) {
  switch (type) {
    case "FLASHCARDS": {
      const flashcards = (content as FlashcardsContent).cards || [];
      return <FlashcardPlayer cards={flashcards} />;
    }
    case "QUIZ": {
      const questions = (content as QuizContent).questions || [];
      const bestScore =
        metadata &&
        typeof metadata === "object" &&
        "bestScore" in metadata &&
        metadata.bestScore
          ? (metadata.bestScore as QuizBestScore)
          : null;
      return (
        <QuizPlayer
          questions={questions}
          artifactId={artifactId}
          workspaceId={workspaceId}
          initialBestScore={bestScore}
        />
      );
    }
    case "TAKEAWAYS": {
      const items = (content as TakeawaysContent).items || [];
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-8 gap-2 font-medium"
              onClick={() => onCopy(items.map((it) => `• ${it}`).join("\n"))}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy All"}
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border bg-card/60 text-sm sm:text-base leading-relaxed"
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {index + 1}
                </div>
                <p className="text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "MINDMAP": {
      const mindmap = content as MindmapContent;
      return <MindmapFlowViewer nodes={mindmap.nodes} edges={mindmap.edges} />;
    }
    case "SUMMARY":
    case "REPORT": {
      const text =
        (content as SummaryContent).markdown ||
        (content as ReportContent).markdown ||
        JSON.stringify(content, null, 2);
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-8 gap-2 font-medium"
              onClick={() => onCopy(text)}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="prose dark:prose-invert prose-base sm:prose-lg max-w-none p-5 sm:p-6 rounded-2xl border bg-card leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        </div>
      );
    }
    default:
      return (
        <pre className="text-sm p-4 bg-muted rounded-xl overflow-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
  }
}

// ---------------- Interactive Flashcard Player ---------------- //

function FlashcardPlayer({
  cards,
}: {
  cards: Array<{ front: string; back: string }>;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">No flashcards available.</p>;
  }

  const current = cards[index];

  const handleNext = () => {
    setFlipped(false);
    setIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setFlipped(false);
    setIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="flex items-center justify-between w-full text-sm text-muted-foreground px-2">
        <span className="font-medium">Tap card to flip</span>
        <span className="font-bold text-foreground">
          Card {index + 1} of {cards.length}
        </span>
      </div>

      {/* Flip Card */}
      <div
        className="w-full h-72 sm:h-80 rounded-3xl border-2 border-primary/20 bg-card p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer select-none transition hover:border-primary/50 hover:shadow-lg relative overflow-hidden"
        onClick={() => setFlipped(!flipped)}
      >
        <Badge
          variant="outline"
          className="absolute top-4 left-4 text-xs font-semibold uppercase tracking-wider px-2.5 py-1"
        >
          {flipped ? "Answer" : "Question"}
        </Badge>

        <RotateCw className="absolute top-4 right-4 h-5 w-5 text-muted-foreground" />

        <p className="text-lg sm:text-2xl font-bold text-foreground px-4 leading-relaxed">
          {flipped ? current.back : current.front}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          className="gap-2 h-10 px-4 text-sm font-semibold rounded-xl"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setFlipped(!flipped)}
          className="gap-2 h-10 px-4 text-sm font-semibold rounded-xl"
        >
          <RotateCw className="h-4 w-4" />
          Flip
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleNext}
          className="gap-2 h-10 px-4 text-sm font-semibold rounded-xl"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------- Interactive Quiz Player ---------------- //

// ---------------- Interactive Quiz Player ---------------- //

function QuizPlayer({
  questions,
  artifactId,
  workspaceId,
  initialBestScore,
}: {
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  artifactId?: string;
  workspaceId?: string;
  initialBestScore?: QuizBestScore | null;
}) {
  const queryClient = useQueryClient();
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [isScored, setIsScored] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  // Load best score from initialBestScore or localStorage
  const [bestScore, setBestScore] = useState<QuizBestScore | null>(() => {
    if (initialBestScore) return initialBestScore;
    if (typeof window !== "undefined" && artifactId) {
      try {
        const stored = localStorage.getItem(`quiz_best_${artifactId}`);
        if (stored) return JSON.parse(stored) as QuizBestScore;
      } catch {
        // ignore
      }
    }
    return null;
  });

  // Keep synced if initialBestScore updates from queries
  useEffect(() => {
    if (initialBestScore) {
      setBestScore((prev) => {
        if (!prev) return initialBestScore;
        if (initialBestScore.percent > prev.percent) return initialBestScore;
        if (
          initialBestScore.percent === prev.percent &&
          initialBestScore.score >= prev.score
        ) {
          return initialBestScore;
        }
        return prev;
      });
    }
  }, [initialBestScore]);

  if (questions.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No questions available.
      </p>
    );
  }

  const handleSelect = (qKey: string, optIdx: number) => {
    if (submitted[qKey]) return;
    setSelectedAnswers((prev) => ({ ...prev, [qKey]: optIdx }));
  };

  const handleCheck = (qKey: string) => {
    setSubmitted((prev) => ({ ...prev, [qKey]: true }));
  };

  const totalQuestions = questions.length;
  const answeredCount = questions.filter(
    (q) => selectedAnswers[q.question] !== undefined,
  ).length;
  const correctCount = questions.filter(
    (q) => submitted[q.question] && selectedAnswers[q.question] === q.correctIndex,
  ).length;
  const incorrectCount = questions.filter(
    (q) =>
      submitted[q.question] &&
      selectedAnswers[q.question] !== undefined &&
      selectedAnswers[q.question] !== q.correctIndex,
  ).length;
  const unansweredCount = totalQuestions - (correctCount + incorrectCount);
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const handleCheckScore = () => {
    const allSubmitted: Record<string, boolean> = {};
    questions.forEach((q) => {
      allSubmitted[q.question] = true;
    });
    setSubmitted(allSubmitted);
    setIsScored(true);

    const currentCorrect = questions.filter(
      (q) => selectedAnswers[q.question] === q.correctIndex,
    ).length;
    const currentPercent =
      totalQuestions > 0
        ? Math.round((currentCorrect / totalQuestions) * 100)
        : 0;
    const currentAttempts = (bestScore?.attemptsCount ?? 0) + 1;

    let hasBeatenRecord = false;
    if (!bestScore) {
      hasBeatenRecord = true;
    } else if (currentPercent > bestScore.percent) {
      hasBeatenRecord = true;
    } else if (
      currentPercent === bestScore.percent &&
      currentCorrect > bestScore.score
    ) {
      hasBeatenRecord = true;
    }

    setIsNewBest(hasBeatenRecord);

    const updatedBest: QuizBestScore = hasBeatenRecord
      ? {
          score: currentCorrect,
          total: totalQuestions,
          percent: currentPercent,
          completedAt: new Date().toISOString(),
          attemptsCount: currentAttempts,
        }
      : {
          ...bestScore!,
          attemptsCount: currentAttempts,
        };

    setBestScore(updatedBest);

    // Save to localStorage
    if (typeof window !== "undefined" && artifactId) {
      try {
        localStorage.setItem(
          `quiz_best_${artifactId}`,
          JSON.stringify(updatedBest),
        );
      } catch {
        // ignore
      }
    }

    // Persist to database if workspaceId and artifactId are available
    if (workspaceId && artifactId) {
      updateArtifact(workspaceId, artifactId, {
        metadata: { bestScore: updatedBest },
      })
        .then(() => {
          queryClient.invalidateQueries({
            queryKey: ["artifacts", workspaceId],
          });
        })
        .catch((err) => {
          console.warn("Failed to persist quiz best score to server:", err);
        });
    }
  };

  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setSubmitted({});
    setIsScored(false);
    setIsNewBest(false);
  };

  const getFeedback = (pct: number) => {
    if (pct >= 90) {
      return {
        grade: "Mastery",
        message:
          "Outstanding work! You have thoroughly mastered this source material.",
        badgeClass:
          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      };
    }
    if (pct >= 70) {
      return {
        grade: "Proficient",
        message: "Great job! You have a solid grasp of key concepts.",
        badgeClass:
          "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      };
    }
    if (pct >= 50) {
      return {
        grade: "Developing",
        message:
          "Good effort! Review the explanations below to reinforce your understanding.",
        badgeClass:
          "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      };
    }
    return {
      grade: "Needs Review",
      message:
        "Keep practicing! Review the explanations and retake the quiz to improve your score.",
      badgeClass:
        "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    };
  };

  const feedback = getFeedback(scorePercent);

  return (
    <div className="space-y-6">
      {/* Top Header / Score Banner */}
      {isScored ? (
        <div className="p-5 sm:p-6 rounded-2xl border bg-card/80 backdrop-blur-xs space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                {isNewBest ? (
                  <Trophy className="h-7 w-7 text-amber-500" />
                ) : scorePercent >= 70 ? (
                  <Trophy className="h-7 w-7 text-amber-500" />
                ) : (
                  <Award className="h-7 w-7 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-2xl text-foreground">
                    Score: {correctCount} / {totalQuestions} ({scorePercent}%)
                  </h3>
                  <Badge
                    className={`text-xs font-semibold px-2.5 py-0.5 ${feedback.badgeClass}`}
                  >
                    {feedback.grade}
                  </Badge>
                  {isNewBest && bestScore && bestScore.attemptsCount > 1 ? (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold gap-1 px-2.5 py-0.5">
                      <Sparkles className="h-3 w-3" />
                      New Best Score!
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {isNewBest && bestScore && bestScore.attemptsCount > 1
                    ? `You set a new personal record on Attempt #${bestScore.attemptsCount}!`
                    : feedback.message}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRetakeQuiz}
              className="gap-2 h-9 px-4 text-xs sm:text-sm font-semibold rounded-xl w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Quiz
            </Button>
          </div>

          {/* Breakdown stats & Best Score Tile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/50 text-center">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Correct
              </p>
              <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {correctCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive font-medium">Incorrect</p>
              <p className="text-lg sm:text-xl font-bold text-destructive">
                {incorrectCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/60 border">
              <p className="text-xs text-muted-foreground font-medium">
                Skipped
              </p>
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {unansweredCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                <Trophy className="h-3 w-3" />
                <span>Best Score</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
                {bestScore ? `${bestScore.percent}%` : `${scorePercent}%`}
              </p>
            </div>
          </div>

          {/* Reattempt comparison when not beating previous record */}
          {!isNewBest && bestScore && bestScore.attemptsCount > 1 && (
            <div className="p-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                Personal Best remains at{" "}
                <strong>
                  {bestScore.score}/{bestScore.total} ({bestScore.percent}%)
                </strong>
                . Retake anytime to beat your record!
              </span>
              <span className="font-semibold text-foreground">
                Attempt #{bestScore.attemptsCount}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Progress & Action Bar before scoring */
        <div className="p-4 rounded-2xl border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-28 sm:w-36 bg-muted rounded-full h-2 overflow-hidden border border-border/40">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${(answeredCount / totalQuestions) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground shrink-0">
                {answeredCount} of {totalQuestions} answered
              </span>
            </div>

            {bestScore && (
              <Badge
                variant="outline"
                className="text-xs font-semibold px-2.5 py-0.5 text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5 flex items-center gap-1.5"
              >
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Best: {bestScore.score}/{bestScore.total} ({bestScore.percent}%)
                </span>
                {bestScore.attemptsCount > 0 && (
                  <span className="text-[10px] text-muted-foreground font-normal border-l pl-1.5 ml-0.5">
                    Attempt #{bestScore.attemptsCount + 1}
                  </span>
                )}
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleCheckScore}
            disabled={answeredCount === 0}
            className="gap-2 h-9 px-5 text-xs sm:text-sm font-semibold rounded-xl w-full sm:w-auto"
          >
            <Award className="h-4 w-4" />
            Check Score
          </Button>
        </div>
      )}

      {/* Questions List */}
      {questions.map((q, qIdx) => {
        const qKey = q.question;
        const isChecked = Boolean(submitted[qKey]);
        const chosen = selectedAnswers[qKey];
        const isCorrectChoice = chosen === q.correctIndex;
        const isUnanswered = chosen === undefined;

        return (
          <div
            key={qKey || qIdx}
            className="p-4 sm:p-5 rounded-2xl border bg-card space-y-4 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <span className="h-6 w-6 rounded-lg bg-muted text-foreground text-xs sm:text-sm flex items-center justify-center shrink-0 font-bold mt-0.5">
                  {qIdx + 1}
                </span>
                <p className="font-bold text-base sm:text-lg text-foreground leading-snug">
                  {q.question}
                </p>
              </div>

              {isChecked && (
                <div className="shrink-0">
                  {isCorrectChoice ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                      ✓ Correct
                    </Badge>
                  ) : isUnanswered ? (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground text-xs font-medium"
                    >
                      ⚠️ Skipped
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs font-semibold">
                      ✗ Incorrect
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1 pl-0 sm:pl-9">
              {q.options.map((opt, optIdx) => {
                const isSelected = chosen === optIdx;
                const isOptionCorrect = q.correctIndex === optIdx;

                let stateClass = "border-muted hover:border-primary/40 bg-card";
                if (isChecked) {
                  if (isOptionCorrect) {
                    stateClass =
                      "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-semibold";
                  } else if (isSelected) {
                    stateClass =
                      "border-destructive bg-destructive/10 text-destructive font-medium";
                  } else {
                    stateClass = "border-muted/50 bg-card/40 opacity-70";
                  }
                } else if (isSelected) {
                  stateClass = "border-primary bg-primary/5 font-semibold";
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelect(qKey, optIdx)}
                    disabled={isChecked}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-sm sm:text-base transition flex items-center justify-between min-h-[50px] gap-3 cursor-pointer ${stateClass}`}
                  >
                    <span>{opt}</span>
                    {isChecked && isOptionCorrect && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                    {isChecked && isSelected && !isOptionCorrect && (
                      <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pl-0 sm:pl-9 pt-1 flex items-center justify-between">
              {!isChecked ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs font-medium rounded-lg"
                  disabled={chosen === undefined}
                  onClick={() => handleCheck(qKey)}
                >
                  Check Answer
                </Button>
              ) : (
                <div className="p-4 rounded-xl bg-muted/40 border text-sm sm:text-base text-muted-foreground w-full leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span>Explanation:</span>
                  </div>
                  <p>{q.explanation}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom Quiz Action Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        {isScored ? (
          <>
            <div className="text-sm flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                Score: {correctCount} / {totalQuestions} ({scorePercent}%)
              </span>
              {bestScore && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  • <Trophy className="h-3 w-3 text-amber-500" /> Best:{" "}
                  {bestScore.percent}% ({bestScore.score}/{bestScore.total})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetakeQuiz}
              className="gap-2 h-9 px-5 text-xs sm:text-sm font-semibold rounded-xl w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Quiz
            </Button>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground text-center sm:text-left flex items-center gap-2 flex-wrap">
              {answeredCount === totalQuestions ? (
                <span className="text-foreground font-semibold">
                  All {totalQuestions} questions answered! Ready to evaluate
                  your score.
                </span>
              ) : (
                <span>
                  Answered <strong>{answeredCount}</strong> of{" "}
                  <strong>{totalQuestions}</strong> questions.
                </span>
              )}
              {bestScore && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  • <Trophy className="h-3 w-3 text-amber-500" /> Best:{" "}
                  {bestScore.percent}%
                </span>
              )}
            </div>
            <Button
              onClick={handleCheckScore}
              disabled={answeredCount === 0}
              className="gap-2 h-9 px-6 text-xs sm:text-sm font-semibold rounded-xl w-full sm:w-auto"
            >
              <Award className="h-4 w-4" />
              Check Score
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- Mind Map Visualizer ---------------- //

export { MindmapFlowViewer, MindmapFlowViewer as MindmapViewer };


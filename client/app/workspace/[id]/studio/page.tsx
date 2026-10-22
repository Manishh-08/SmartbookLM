"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import {
  ArtifactViewerModal,
  STUDIO_TOOLS,
} from "@/components/workspace/artifacts-panel";
import {
  createArtifact,
  deleteArtifact,
  getArtifacts,
  getSources,
  getWorkspace,
} from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import type {
  ArtifactType,
  LearningArtifact,
  QuizContent,
  QuizBestScore,
  ReportContent,
  FlashcardsContent,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Trash2,
  Layers,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Filter,
  HelpCircle,
  Network,
  Lightbulb,
  BookOpen,
  Trophy,
} from "lucide-react";

export default function WorkspaceStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  );
  const [filterType, setFilterType] = useState<"ALL" | ArtifactType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Workspace details
  const {
    data: workspace,
    isLoading: isLoadingWorkspace,
    isError: isWorkspaceError,
  } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspace(workspaceId),
    enabled: !!session?.user,
    retry: false,
  });

  // Redirect to landing page if user is not logged in or not authorized for this workspace
  useEffect(() => {
    if (!isSessionPending) {
      if (!session?.user || isWorkspaceError) {
        router.replace("/");
      }
    }
  }, [isSessionPending, session, isWorkspaceError, router]);

  // Sources for targeted generation
  const { data: sources = [], isLoading: isLoadingSources } = useQuery({
    queryKey: ["sources", workspaceId],
    queryFn: () => getSources(workspaceId),
    enabled: !!session?.user && !isWorkspaceError,
  });

  // Generated Artifacts with 1.5s active polling while processing
  const { data: artifacts = [], isLoading: isLoadingArtifacts } = useQuery({
    queryKey: ["artifacts", workspaceId],
    queryFn: () => getArtifacts(workspaceId),
    enabled: !!session?.user && !isWorkspaceError,
    refetchInterval: (query) => {
      const data = query.state.data as LearningArtifact[] | undefined;
      const isProcessing = data?.some(
        (a) => a.status === "PROCESSING" || a.status === "PENDING",
      );
      return isProcessing ? 1500 : false;
    },
  });

  // Resolve selected artifact live from cache so status and content auto-update
  const selectedArtifact =
    artifacts.find((a) => a.id === selectedArtifactId) || null;

  // Instant optimistic creation mutation - appears in 0ms!
  const createMutation = useMutation({
    mutationFn: (type: ArtifactType) =>
      createArtifact(workspaceId, {
        type,
        sourceIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
      }),
    onMutate: async (type: ArtifactType) => {
      // Cancel queries so they don't overwrite optimistic update
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
        sourceIds:
          selectedSourceIds.length > 0
            ? selectedSourceIds
            : sources.map((s) => s.id),
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Immediately inject optimistic processing card into the Generated Library
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

  // Delete mutation
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

  // Source selection helpers
  const isAllSources = selectedSourceIds.length === 0;

  const handleToggleSource = (sourceId: string) => {
    setSelectedSourceIds((prev) => {
      if (prev.includes(sourceId)) {
        return prev.filter((id) => id !== sourceId);
      }
      return [...prev, sourceId];
    });
  };

  const handleSelectAllSources = () => {
    setSelectedSourceIds([]);
  };

  // Filter artifacts
  const filteredArtifacts = artifacts.filter((artifact) => {
    const matchesType =
      filterType === "ALL" || artifact.type === filterType;
    const matchesSearch =
      !searchQuery ||
      artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (isSessionPending || !session?.user || isLoadingWorkspace || isWorkspaceError) {
    return (
      <div className="fixed inset-0 flex flex-col h-dvh max-h-dvh bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium">
            {!isSessionPending && (!session?.user || isWorkspaceError)
              ? "Redirecting to landing page..."
              : "Loading Study Studio..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col h-dvh max-h-dvh overflow-hidden bg-background">
      <Navbar
        workspaceTitle={workspace?.title}
        workspaceId={workspaceId}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
          {/* Top Navigation & Header */}
          <div className="space-y-4">
            <Link
              href={`/workspace/${workspaceId}`}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition group"
            >
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              <span>Back to Chat & Sources</span>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Study Studio
                  </h1>
                  <Badge variant="secondary" className="font-semibold text-xs h-6 px-2.5">
                    AI Learning Suite
                  </Badge>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                  Synthesize your sources into interactive flashcards, practice quizzes, mind maps, summaries, and deep research reports.
                </p>
              </div>

              <Link
                href={`/workspace/${workspaceId}`}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground transition shrink-0 self-start sm:self-auto border shadow-2xs"
              >
                <span>Open Chat</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Source Target Selector Bar */}
          <div className="p-4 sm:p-5 rounded-2xl border bg-card/60 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                  Target Sources for Generation
                </span>
                <Badge variant="outline" className="text-xs font-semibold">
                  {isAllSources
                    ? `All ${sources.length} sources`
                    : `${selectedSourceIds.length} of ${sources.length} selected`}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={isAllSources ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs font-semibold rounded-lg px-2.5"
                  onClick={handleSelectAllSources}
                >
                  All Sources
                </Button>
                {selectedSourceIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                    onClick={() => setSelectedSourceIds([])}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {sources.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                No sources added to this workspace yet. Upload documents in Chat view to generate study tools.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
                {sources.map((s) => {
                  const isSelected = selectedSourceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleToggleSource(s.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                          : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate max-w-[180px] sm:max-w-[260px]">
                        {s.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 1: Study Tools Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  Generate Study Tools
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Select a format to synthesize your knowledge
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {STUDIO_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isGenerating =
                  createMutation.isPending &&
                  createMutation.variables === tool.type;

                return (
                  <button
                    key={tool.type}
                    disabled={createMutation.isPending || sources.length === 0}
                    onClick={() => createMutation.mutate(tool.type)}
                    className="flex flex-col justify-between p-5 rounded-2xl border bg-card hover:bg-muted/40 hover:border-primary/40 hover:shadow-md transition text-left group disabled:opacity-50 min-h-[160px] cursor-pointer shadow-2xs relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`p-2.5 rounded-xl transition ${tool.color}`}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold text-muted-foreground group-hover:border-primary/40 transition"
                        >
                          {tool.type}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                        {tool.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-border/50 text-xs font-semibold text-primary">
                      <span>{isGenerating ? "Synthesizing..." : "Generate now"}</span>
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Generated Library */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  Generated Library
                </h2>
                <Badge variant="secondary" className="font-semibold text-xs h-6 px-2.5">
                  {artifacts.length}
                </Badge>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(
                [
                  "ALL",
                  "SUMMARY",
                  "TAKEAWAYS",
                  "FLASHCARDS",
                  "QUIZ",
                  "MINDMAP",
                  "REPORT",
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 cursor-pointer ${
                    filterType === type
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === "ALL" ? "All Formats" : type}
                </button>
              ))}
            </div>

            {/* Artifacts Grid */}
            {isLoadingArtifacts ? (
              <div className="flex flex-col items-center justify-center p-12 text-sm text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="font-medium">Loading your generated tools...</p>
              </div>
            ) : filteredArtifacts.length === 0 ? (
              <div className="text-center p-8 sm:p-12 border rounded-2xl bg-card/40 text-muted-foreground space-y-3">
                <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <div>
                  <p className="font-bold text-base text-foreground">
                    {artifacts.length === 0
                      ? "No study tools generated yet"
                      : "No tools match your filter"}
                  </p>
                  <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto text-muted-foreground">
                    {artifacts.length === 0
                      ? "Pick one of the study tools above to create interactive flashcards, quizzes, or research reports."
                      : "Try changing your search query or format filter above."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArtifacts.map((artifact) => {
                  const toolConfig = STUDIO_TOOLS.find(
                    (t) => t.type === artifact.type,
                  );
                  const Icon = toolConfig?.icon || FileText;
                  const isReady = artifact.status === "READY";
                  const isProcessing =
                    artifact.status === "PROCESSING" ||
                    artifact.status === "PENDING";
                  const isFailed = artifact.status === "FAILED";

                  return (
                    <div
                      key={artifact.id}
                      onClick={() => setSelectedArtifactId(artifact.id)}
                      className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl border bg-card transition cursor-pointer group shadow-2xs min-h-[140px] ${
                        isProcessing
                          ? "border-primary/40 bg-primary/[0.02]"
                          : isFailed
                          ? "border-destructive/30 hover:border-destructive/50"
                          : "hover:bg-muted/30 hover:border-primary/40 hover:shadow-md"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              toolConfig?.color || "bg-muted"
                            }`}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isProcessing && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-primary border-primary/30 gap-1 bg-primary/5 animate-pulse"
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processing
                              </Badge>
                            )}
                            {isReady && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-emerald-600 border-emerald-500/30 gap-1 font-semibold bg-emerald-500/5"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Ready
                              </Badge>
                            )}
                            {artifact.type === "QUIZ" &&
                              artifact.metadata &&
                              typeof artifact.metadata === "object" &&
                              "bestScore" in artifact.metadata &&
                              Boolean((artifact.metadata as any).bestScore) && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold bg-amber-500/5"
                                >
                                  <Trophy className="h-3 w-3" />
                                  Best: {((artifact.metadata as any).bestScore as QuizBestScore).percent}%
                                </Badge>
                              )}
                            {isFailed && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] gap-1"
                              >
                                <XCircle className="h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </div>
                        </div>

                        <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition line-clamp-2">
                          {artifact.title}
                        </h4>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(artifact.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 flex items-center justify-between border-t border-border/50 text-xs font-semibold">
                        {isProcessing ? (
                          (() => {
                            const hasIncrementalQuestions =
                              artifact.type === "QUIZ" &&
                              Boolean(
                                (artifact.content as QuizContent)?.questions
                                  ?.length,
                              );
                            const hasIncrementalReport =
                              artifact.type === "REPORT" &&
                              Boolean(
                                (artifact.content as ReportContent)?.sections
                                  ?.length,
                              );

                            if (hasIncrementalQuestions) {
                              const count = (
                                artifact.content as QuizContent
                              ).questions.length;
                              return (
                                <span className="text-primary group-hover:underline inline-flex items-center gap-1.5 font-bold">
                                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                  Take Quiz ({count} ready)
                                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                                </span>
                              );
                            }

                            if (hasIncrementalReport) {
                              const progress =
                                artifact.metadata &&
                                typeof artifact.metadata === "object" &&
                                "progress" in artifact.metadata
                                  ? Number(artifact.metadata.progress)
                                  : 35;
                              return (
                                <span className="text-primary group-hover:underline inline-flex items-center gap-1.5 font-bold">
                                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                  Read Report ({progress}%)
                                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                                </span>
                              );
                            }

                            return (
                              <span className="text-primary inline-flex items-center gap-1.5 font-semibold animate-pulse">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Synthesizing...
                              </span>
                            );
                          })()
                        ) : isReady ? (
                          <span className="text-primary group-hover:underline inline-flex items-center gap-1.5 font-bold">
                            {artifact.type === "QUIZ"
                              ? (artifact.metadata as any)?.bestScore
                                ? `Retake Quiz (Best: ${((artifact.metadata as any).bestScore as QuizBestScore).percent}%)`
                                : "Take Quiz"
                              : artifact.type === "FLASHCARDS"
                              ? "Study Cards"
                              : artifact.type === "MINDMAP"
                              ? "Explore Map"
                              : artifact.type === "SUMMARY"
                              ? "Read Summary"
                              : artifact.type === "TAKEAWAYS"
                              ? "View Insights"
                              : "Read Report"}
                            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                          </span>
                        ) : (
                          <span className="text-destructive inline-flex items-center gap-1 text-[11px] font-medium truncate max-w-[190px]">
                            <XCircle className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {artifact.metadata &&
                              typeof artifact.metadata === "object" &&
                              "processingError" in artifact.metadata
                                ? String(artifact.metadata.processingError)
                                : "Generation failed"}
                            </span>
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition opacity-80 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(artifact.id);
                          }}
                          title="Delete tool"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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

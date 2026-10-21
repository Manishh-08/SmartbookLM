"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  LogIn,
  Search,
  FileText,
  Brain,
  Layers,
  HelpCircle,
  Globe,
  Video,
  Loader2,
  MoreVertical,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateWorkspaceModal } from "@/components/modals/create-workspace-modal";
import { EditWorkspaceModal } from "@/components/modals/edit-workspace-modal";
import { useSession, signIn } from "@/lib/auth-client";
import { deleteWorkspace, getWorkspaces } from "@/lib/api";
import type { Workspace } from "@/lib/types";

export default function HomePage() {
  const { data: session, isPending: isSessionPending } = useSession();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  const { data: workspaces = [], isLoading: isWorkspacesLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaces,
    enabled: !!session?.user,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: window.location.href,
    });
  };

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1">
        {isSessionPending ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Connecting to session...</p>
          </div>
        ) : !session?.user ? (
          /* Landing Page for Unauthenticated Users */
          <div className="flex flex-col items-center justify-center px-4 py-16 sm:py-24 text-center max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border bg-muted/40 text-xs sm:text-sm font-semibold text-foreground shadow-2xs">
              <Sparkles className="h-4 w-4 text-primary" />
              Grounded RAG • Adaptive Memory • Interactive Studio
            </div>

            <div className="space-y-4 max-w-3xl">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
                Your Personalized AI Knowledge Workspace
              </h1>
              <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Upload PDFs, extract YouTube transcripts, scrape web articles, and
                chat with citation-backed precision. Generate study flashcards,
                quizzes, mind maps, and summaries in seconds.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <Button
                size="lg"
                className="gap-3 px-8 h-14 text-base font-bold rounded-2xl shadow-md cursor-pointer"
                onClick={handleGoogleSignIn}
              >
                <LogIn className="h-5 w-5" />
                Sign in with Google to Start
              </Button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4.5 w-full pt-12 text-left">
              {[
                {
                  icon: FileText,
                  title: "Multi-Modal Sources",
                  desc: "PDF documents, live websites, YouTube transcripts, and Markdown notes.",
                },
                {
                  icon: Sparkles,
                  title: "Citation-Backed RAG",
                  desc: "Ask anything with exact page and excerpt citations, preventing hallucinations.",
                },
                {
                  icon: Layers,
                  title: "Interactive Studio",
                  desc: "One-click interactive flashcard flip decks, quizzes, mind maps & summaries.",
                },
                {
                  icon: Brain,
                  title: "Adaptive Mem0 Memory",
                  desc: "The assistant continuously remembers your goals, habits, and background.",
                },
              ].map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={i}
                    className="p-5 sm:p-6 rounded-2xl border bg-card/60 space-y-3 hover:border-primary/40 transition shadow-2xs"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Dashboard for Authenticated Users */
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Workspaces
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Select a notebook or create a new workspace to start research.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workspaces..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 text-sm bg-card rounded-xl shadow-2xs"
                  />
                </div>
                <Button
                  className="gap-2 text-sm h-11 px-4 font-semibold shrink-0 rounded-xl shadow-2xs"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">New Workspace</span>
                  <span className="xs:hidden">New</span>
                </Button>
              </div>
            </div>

            {isWorkspacesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm">Loading workspaces...</p>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 sm:p-16 border-2 border-dashed rounded-3xl text-center space-y-4 bg-card/40">
                <div className="p-4 rounded-3xl bg-primary/10 text-primary">
                  <BookOpen className="h-10 w-10" />
                </div>
                <h3 className="font-bold text-lg sm:text-xl">No workspaces created yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Create your first workspace to start organizing your sources,
                  chatting, and generating study tools.
                </p>
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="gap-2 text-sm h-11 px-5 rounded-xl font-semibold mt-2"
                >
                  <Plus className="h-4 w-4" />
                  Create First Workspace
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Create Card Shortcut */}
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed hover:border-primary/50 hover:bg-primary/5 transition text-center gap-3 group h-[200px] cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="font-bold text-base text-foreground block">
                      Create New Workspace
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground mt-0.5 block">
                      Add new study material
                    </span>
                  </div>
                </button>

                {/* Workspace Cards */}
                {filteredWorkspaces.map((ws) => (
                  <Card
                    key={ws.id}
                    className="relative group hover:border-primary/50 transition cursor-pointer flex flex-col justify-between h-[200px] overflow-hidden rounded-2xl shadow-2xs hover:shadow-md"
                  >
                    <Link
                      href={`/workspace/${ws.id}`}
                      className="absolute inset-0 z-10"
                    />
                    <CardHeader className="p-5 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-3xl shrink-0">
                            {ws.icon || "📚"}
                          </span>
                          <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition">
                            {ws.title}
                          </CardTitle>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted opacity-80 sm:opacity-0 group-hover:opacity-100 transition z-20 shrink-0 outline-none cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-1">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/workspace/${ws.id}`;
                              }}
                              className="cursor-pointer gap-2.5 text-xs py-2"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open Workspace
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingWorkspace(ws);
                              }}
                              className="cursor-pointer gap-2.5 text-xs py-2"
                            >
                              <Pencil className="h-3.5 w-3.5 text-primary" />
                              Edit & Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `Delete workspace "${ws.title}"? This cannot be undone.`,
                                  )
                                ) {
                                  deleteMutation.mutate(ws.id);
                                }
                              }}
                              className="cursor-pointer gap-2.5 text-xs py-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Workspace
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <CardDescription className="text-sm line-clamp-2 mt-2 leading-relaxed">
                        {ws.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className="text-xs h-5 px-2 font-medium"
                      >
                        {ws.defaultModel}
                      </Badge>
                      <span className="text-xs">
                        {new Date(ws.updatedAt).toLocaleDateString()}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <CreateWorkspaceModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <EditWorkspaceModal
        workspace={editingWorkspace}
        open={!!editingWorkspace}
        onOpenChange={(open) => !open && setEditingWorkspace(null)}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Sparkles,
  Brain,
  LogOut,
  LogIn,
  Plus,
  MessageSquare,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  FolderKanban,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, signIn, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { MemoryModal } from "@/components/modals/memory-modal";
import { CreateWorkspaceModal } from "@/components/modals/create-workspace-modal";
import { EditWorkspaceModal } from "@/components/modals/edit-workspace-modal";
import { getWorkspaces, deleteWorkspace } from "@/lib/api";

interface NavbarProps {
  workspaceTitle?: string;
  workspaceId?: string;
}

export function Navbar({ workspaceTitle, workspaceId }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isStudio = pathname?.includes(`/workspace/${workspaceId}/studio`);
  const { data: session, isPending } = useSession();
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch workspaces for switcher
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaces,
    enabled: !!session?.user,
  });

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setDeleteConfirmOpen(false);
      router.push("/");
    },
  });

  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: window.location.href,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xs">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-semibold tracking-tight transition hover:opacity-85"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text">
                SmartBook<span className="text-primary">LM</span>
              </span>
            </Link>

            {workspaceId ? (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/30 hidden sm:inline">/</span>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-muted/40 hover:bg-muted text-xs sm:text-sm font-semibold text-foreground transition max-w-[150px] sm:max-w-[220px] shadow-2xs group cursor-pointer outline-none">
                    <span className="text-sm shrink-0">{currentWorkspace?.icon || "📚"}</span>
                    <span className="truncate">{currentWorkspace?.title || workspaceTitle || "Workspace"}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72 sm:w-80 p-1.5" align="start">
                    {/* Workspace Header */}
                    <div className="px-2.5 py-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Current Workspace
                      </p>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <span className="text-2xl shrink-0">{currentWorkspace?.icon || "📚"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">
                            {currentWorkspace?.title || workspaceTitle}
                          </p>
                          {currentWorkspace?.description ? (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {currentWorkspace.description}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/70 italic mt-0.5">
                              No description
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenuSeparator className="my-1" />

                    {/* Quick Actions */}
                    <DropdownMenuItem
                      onClick={() => setEditWorkspaceOpen(true)}
                      className="gap-2.5 py-2 cursor-pointer text-xs sm:text-sm rounded-lg"
                    >
                      <Pencil className="h-4 w-4 text-primary" />
                      <span>Edit & Rename Workspace</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="gap-2.5 py-2 cursor-pointer text-xs sm:text-sm text-destructive focus:text-destructive rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Workspace</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1" />

                    {/* Switch Workspace */}
                    <div className="px-2.5 py-1.5 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Switch Workspace
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                        {workspaces.length} total
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5 px-0.5">
                      {workspaces.map((ws) => {
                        const isCurrent = ws.id === workspaceId;
                        return (
                          <DropdownMenuItem
                            key={ws.id}
                            onClick={() => {
                              if (!isCurrent) {
                                router.push(`/workspace/${ws.id}`);
                              }
                            }}
                            className={`flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg cursor-pointer text-xs sm:text-sm ${
                              isCurrent
                                ? "bg-primary/10 text-primary font-semibold"
                                : "hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-base shrink-0">{ws.icon || "📚"}</span>
                              <span className="truncate">{ws.title}</span>
                            </div>
                            {isCurrent && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </div>

                    <DropdownMenuSeparator className="my-1" />

                    {/* New Workspace & Dashboard */}
                    <DropdownMenuItem
                      onClick={() => setCreateWorkspaceOpen(true)}
                      className="gap-2.5 py-2 cursor-pointer text-xs sm:text-sm rounded-lg"
                    >
                      <Plus className="h-4 w-4 text-primary" />
                      <span>Create New Workspace</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => router.push("/")}
                      className="gap-2.5 py-2 cursor-pointer text-xs sm:text-sm text-muted-foreground hover:text-foreground rounded-lg"
                    >
                      <FolderKanban className="h-4 w-4" />
                      <span>All Workspaces (Dashboard)</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : workspaceTitle ? (
              <div className="hidden sm:flex items-center gap-2 text-sm md:text-base text-muted-foreground font-medium">
                <span className="opacity-40">/</span>
                <span className="text-foreground max-w-[140px] md:max-w-[240px] truncate">
                  {workspaceTitle}
                </span>
              </div>
            ) : null}
          </div>

          {/* Workspace Tabs: Chat & Studio */}
          {workspaceId && (
            <nav className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border shadow-2xs">
              <Link
                href={`/workspace/${workspaceId}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  !isStudio
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span>Chat</span>
              </Link>
              <Link
                href={`/workspace/${workspaceId}/studio`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  isStudio
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Studio</span>
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 hidden md:flex text-sm h-9 px-3 font-medium"
                  onClick={() => setCreateWorkspaceOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  New Workspace
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-sm h-9 px-3 text-muted-foreground hover:text-foreground font-medium"
                  onClick={() => setMemoryOpen(true)}
                  title="View AI Learned Memories"
                >
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Memory</span>
                </Button>
              </>
            )}

            <ModeToggle />

            {isPending ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-9 w-9 rounded-full p-0 inline-flex items-center justify-center cursor-pointer outline-none ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Avatar className="h-9 w-9 border">
                    <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                    <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 p-1.5" align="end">
                  <DropdownMenuLabel className="font-normal px-2 py-1.5">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none truncate">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setMemoryOpen(true)}
                    className="cursor-pointer gap-2.5 text-sm py-2"
                  >
                    <Brain className="h-4 w-4 text-primary" />
                    AI Memory Knowledge
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setCreateWorkspaceOpen(true)}
                    className="cursor-pointer gap-2.5 text-sm py-2 md:hidden"
                  >
                    <Plus className="h-4 w-4" />
                    New Workspace
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive gap-2.5 text-sm py-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="gap-2 h-9 text-sm font-medium px-4 rounded-xl"
                onClick={handleGoogleSignIn}
              >
                <LogIn className="h-4 w-4" />
                Sign in with Google
              </Button>
            )}
          </div>
        </div>
      </header>

      {user && (
        <>
          <MemoryModal open={memoryOpen} onOpenChange={setMemoryOpen} />
          <CreateWorkspaceModal
            open={createWorkspaceOpen}
            onOpenChange={setCreateWorkspaceOpen}
          />
          <EditWorkspaceModal
            workspace={
              currentWorkspace ||
              (workspaceId
                ? {
                    id: workspaceId,
                    title: workspaceTitle || "Workspace",
                  }
                : null)
            }
            open={editWorkspaceOpen}
            onOpenChange={setEditWorkspaceOpen}
          />
          {deleteConfirmOpen && (
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogContent className="w-[95vw] sm:max-w-[440px] p-5 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Delete Workspace
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground pt-1.5 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{currentWorkspace?.title || workspaceTitle}&quot;</span>? This will permanently remove all sources, chat history, and generated study tools.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => workspaceId && deleteMutation.mutate(workspaceId)}
                    className="text-sm font-semibold gap-2"
                  >
                    {deleteMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Delete Permanently
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </>
  );
}

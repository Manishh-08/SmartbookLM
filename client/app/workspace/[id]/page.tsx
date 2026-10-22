"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { SourcesPanel } from "@/components/workspace/sources-panel";
import { ChatPanel } from "@/components/workspace/chat-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWorkspace } from "@/lib/api";
import { FileText, MessageSquare, Sparkles, Loader2 } from "lucide-react";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState<"sources" | "chat">("chat");
  const [showSources, setShowSources] = useState(true);

  // Clear any old pixel-based layout measurements from localStorage
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("react-resizable-panels")) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }, []);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });

  const handleToggleSource = (sourceId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId],
    );
  };

  const handleSelectAll = (allIds: string[]) => {
    setSelectedSourceIds(allIds);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col h-dvh max-h-dvh bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading workspace...</p>
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

      {/* Desktop 2-Panel Resizable View (Sources + Chat) */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <ResizablePanelGroup
          id="smartbook-workspace-v8"
          orientation="horizontal"
          className="h-full w-full"
        >
          {/* Left Panel: Sources */}
          {showSources && (
            <>
              <ResizablePanel
                id="panel-sources"
                defaultSize="24%"
                minSize="21%"
                maxSize="38%"
              >
                <SourcesPanel
                  workspaceId={workspaceId}
                  selectedSourceIds={selectedSourceIds}
                  onToggleSource={handleToggleSource}
                  onSelectAll={handleSelectAll}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Right Panel: Chat */}
          <ResizablePanel
            id="panel-chat"
            defaultSize={showSources ? "76%" : "100%"}
            minSize="50%"
          >
            <ChatPanel
              workspaceId={workspaceId}
              defaultModel={workspace?.defaultModel}
              showSources={showSources}
              onToggleSources={() => setShowSources((prev) => !prev)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile & Tablet Responsive View (<1024px) */}
      <div className="flex flex-col flex-1 min-h-0 lg:hidden">
        <Tabs
          value={mobileTab}
          onValueChange={(v) =>
            setMobileTab(v as "sources" | "chat")
          }
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 min-h-0">
            <TabsContent value="sources" className="h-full m-0 p-0">
              <SourcesPanel
                workspaceId={workspaceId}
                selectedSourceIds={selectedSourceIds}
                onToggleSource={handleToggleSource}
                onSelectAll={handleSelectAll}
              />
            </TabsContent>
            <TabsContent value="chat" className="h-full m-0 p-0">
              <ChatPanel
                workspaceId={workspaceId}
                defaultModel={workspace?.defaultModel}
              />
            </TabsContent>
          </div>

          <TabsList className="grid grid-cols-3 w-full rounded-none border-t h-13 sm:h-14 bg-card/95 backdrop-blur-md px-2 py-1 gap-1.5 shadow-lg shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <TabsTrigger value="sources" className="gap-2 text-xs sm:text-sm font-semibold rounded-lg h-10 sm:h-11">
              <FileText className="h-4 w-4 shrink-0" />
              <span>Sources</span>
              {selectedSourceIds.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-primary/10 text-primary font-bold">
                  {selectedSourceIds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2 text-xs sm:text-sm font-semibold rounded-lg h-10 sm:h-11">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Chat</span>
            </TabsTrigger>
            <Link
              href={`/workspace/${workspaceId}/studio`}
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold rounded-lg h-10 sm:h-11 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span>Studio</span>
            </Link>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

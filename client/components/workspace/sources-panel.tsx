"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Globe,
  Video,
  AlignLeft,
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AddSourceModal } from "@/components/modals/add-source-modal";
import { deleteSource, getSources } from "@/lib/api";
import type { Source, SourceType } from "@/lib/types";

interface SourcesPanelProps {
  workspaceId: string;
  selectedSourceIds: string[];
  onToggleSource: (sourceId: string) => void;
  onSelectAll: (allIds: string[]) => void;
}

export function SourcesPanel({
  workspaceId,
  selectedSourceIds,
  onToggleSource,
  onSelectAll,
}: SourcesPanelProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["sources", workspaceId],
    queryFn: () => getSources(workspaceId),
    refetchInterval: (query) => {
      const data = query.state.data as Source[] | undefined;
      const isProcessing = data?.some(
        (s) => s.status === "PROCESSING" || s.status === "PENDING",
      );
      return isProcessing ? 3000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sourceId: string) => deleteSource(workspaceId, sourceId),
    onMutate: async (deletedSourceId: string) => {
      await queryClient.cancelQueries({ queryKey: ["sources", workspaceId] });
      const previousSources = queryClient.getQueryData<Source[]>(["sources", workspaceId]);
      if (previousSources) {
        queryClient.setQueryData<Source[]>(
          ["sources", workspaceId],
          previousSources.filter((s) => s.id !== deletedSourceId),
        );
      }
      return { previousSources };
    },
    onError: (_err, _deletedSourceId, context) => {
      if (context?.previousSources) {
        queryClient.setQueryData(["sources", workspaceId], context.previousSources);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", workspaceId] });
    },
  });

  const filteredSources = sources.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case "PDF":
        return <FileText className="h-4 w-4 text-rose-500" />;
      case "WEBSITE":
        return <Globe className="h-4 w-4 text-blue-500" />;
      case "YOUTUBE":
        return <Video className="h-4 w-4 text-red-500" />;
      case "TEXT":
      case "MARKDOWN":
        return <AlignLeft className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getStatusBadge = (status: Source["status"]) => {
    switch (status) {
      case "READY":
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        );
      case "PROCESSING":
      case "PENDING":
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            Indexing
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1 text-[11px] text-destructive font-medium">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
    }
  };

  const allSelected =
    sources.length > 0 && selectedSourceIds.length === sources.length;

  return (
    <div className="flex flex-col h-full bg-card/20 overflow-hidden min-w-0">
      <div className="h-14 px-3.5 sm:px-4 border-b flex items-center justify-between gap-2 bg-card/40 shrink-0 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="font-bold text-sm sm:text-base">Sources</h2>
          <Badge variant="secondary" className="text-xs h-5 px-2 font-medium">
            {sources.length}
          </Badge>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs sm:text-sm gap-1.5 px-3 font-medium rounded-lg shrink-0 whitespace-nowrap"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Add Source</span>
        </Button>
      </div>

      <div className="p-2.5 border-b shrink-0 bg-background/30">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm bg-background rounded-lg shadow-2xs"
          />
        </div>
      </div>

      {sources.length > 0 && (
        <div className="px-3.5 py-2 border-b flex items-center justify-between text-xs sm:text-sm text-muted-foreground bg-muted/20 shrink-0">
          <label className="flex items-center gap-2.5 cursor-pointer select-none font-medium">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) =>
                onSelectAll(checked ? sources.map((s) => s.id) : [])
              }
              className="h-4 w-4"
            />
            <span>Select all for studio</span>
          </label>
          <span className="text-xs font-semibold text-foreground">
            {selectedSourceIds.length} selected
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 overscroll-contain">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2.5 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading sources...
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2.5 h-60">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">
              {searchQuery ? "No matching sources" : "No sources added yet"}
            </p>
            <p className="text-xs max-w-[240px] leading-relaxed">
              {searchQuery
                ? "Try a different search term"
                : "Add PDFs, websites, YouTube videos or notes to start learning."}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs sm:text-sm h-8 gap-1.5 px-3"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Source
              </Button>
            )}
          </div>
        ) : (
          filteredSources.map((source) => {
            const isSelected = selectedSourceIds.includes(source.id);
            return (
              <div
                key={source.id}
                className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border transition text-sm group ${
                  isSelected
                    ? "border-primary/50 bg-primary/10 shadow-2xs"
                    : "border-transparent hover:border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSource(source.id)}
                    className="h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <div className="shrink-0 p-1 rounded-md bg-background border shadow-2xs">
                    {getSourceIcon(source.type)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-xs sm:text-sm truncate">
                      {source.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(source.status)}
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center"
                          title="Open original URL"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground opacity-80 sm:opacity-0 group-hover:opacity-100 transition hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => deleteMutation.mutate(source.id)}
                  disabled={deleteMutation.isPending}
                  title="Delete source"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <AddSourceModal
        workspaceId={workspaceId}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
      />
    </div>
  );
}

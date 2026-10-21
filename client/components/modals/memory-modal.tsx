"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Plus, Trash2, Sparkles, User, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createMemory, deleteMemory, getMemories } from "@/lib/api";

interface MemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemoryModal({ open, onOpenChange }: MemoryModalProps) {
  const [newMemoryText, setNewMemoryText] = useState("");
  const queryClient = useQueryClient();

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["memories"],
    queryFn: getMemories,
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: (text: string) => createMemory(text),
    onSuccess: () => {
      setNewMemoryText("");
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    addMutation.mutate(newMemoryText.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-145 max-h-[85vh] flex flex-col p-5 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold">AI Memory Knowledge</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-0.5">
                Facts and learning habits automatically remembered across your
                chats via Mem0.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleAdd} className="flex gap-2.5 pt-3">
          <Input
            placeholder="E.g., I am a visual learner and prefer concrete analogies..."
            value={newMemoryText}
            onChange={(e) => setNewMemoryText(e.target.value)}
            disabled={addMutation.isPending}
            className="h-10 text-base sm:text-sm"
          />
          <Button
            type="submit"
            disabled={!newMemoryText.trim() || addMutation.isPending}
            size="sm"
            className="h-10 px-4 text-sm font-semibold rounded-xl shrink-0 gap-2 cursor-pointer"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Fact
          </Button>
        </form>

        <div className="flex-1 min-h-0 pt-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading memories...</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3 border rounded-2xl bg-muted/20 p-6">
              <Sparkles className="h-9 w-9 text-primary/60" />
              <p className="font-bold text-base text-foreground">No memories saved yet</p>
              <p className="text-xs sm:text-sm max-w-xs leading-relaxed">
                As you chat with your documents, SmartBookLM will automatically
                extract facts about your goals and style.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-90 pr-3">
              <div className="space-y-3">
                {memories.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3.5 rounded-xl border bg-card/60 hover:bg-card transition text-sm sm:text-base group shadow-2xs"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {item.source === "learned" ? (
                        <div
                          className="mt-0.5 p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0"
                          title="Learned from chat"
                        >
                          <Sparkles className="h-4 w-4" />
                        </div>
                      ) : (
                        <div
                          className="mt-0.5 p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0"
                          title="Added by user"
                        >
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <p className="text-foreground leading-relaxed wrap-break-word text-sm sm:text-base">
                          {item.memory}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs px-2 py-0.5 h-5 font-medium"
                          >
                            {item.source === "learned" ? "Inferred" : "Manual"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-80 sm:opacity-0 group-hover:opacity-100 transition hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete memory"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

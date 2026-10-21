"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceIconPicker } from "./workspace-icon-picker";
import { updateWorkspace } from "@/lib/api";
import type { Workspace } from "@/lib/types";

interface EditWorkspaceModalProps {
  workspace?: {
    id: string;
    title: string;
    description?: string | null;
    icon?: string | null;
    defaultModel?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: Workspace) => void;
}

export function EditWorkspaceModal({
  workspace,
  open,
  onOpenChange,
  onSuccess,
}: EditWorkspaceModalProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(workspace?.title || "");
  const [description, setDescription] = useState(workspace?.description || "");
  const [icon, setIcon] = useState(workspace?.icon || "📚");
  const [defaultModel, setDefaultModel] = useState(workspace?.defaultModel || "gpt-4o-mini");

  // Keep form in sync when workspace prop changes
  useEffect(() => {
    if (workspace) {
      setTitle(workspace.title || "");
      setDescription(workspace.description || "");
      setIcon(workspace.icon || "📚");
      setDefaultModel(workspace.defaultModel || "gpt-4o-mini");
    }
  }, [workspace]);

  const mutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      icon?: string;
      defaultModel?: string;
    }) => {
      if (!workspace) throw new Error("No workspace provided");
      return updateWorkspace(workspace.id, data);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      if (workspace?.id) {
        queryClient.invalidateQueries({ queryKey: ["workspace", workspace.id] });
      }
      onSuccess?.(updated);
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !workspace) return;

    mutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || "📚",
      defaultModel,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-125 p-5 sm:p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold">
                  Edit Workspace
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-0.5">
                  Update your workspace name, icon, and default model.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-[76px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-icon" className="text-xs sm:text-sm font-semibold">
                  Icon
                </Label>
                <WorkspaceIconPicker
                  id="edit-icon"
                  value={icon}
                  onChange={setIcon}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-xs sm:text-sm font-semibold">
                  Workspace Name *
                </Label>
                <Input
                  id="edit-title"
                  placeholder="e.g. Physics 101, Machine Learning..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-xs sm:text-sm font-semibold">
                Description (Optional)
              </Label>
              <Textarea
                id="edit-desc"
                placeholder="What is this workspace about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-model" className="text-xs sm:text-sm font-semibold">
                Default LLM Model
              </Label>
              <Select value={defaultModel} onValueChange={(v) => v && setDefaultModel(v)}>
                <SelectTrigger id="edit-model" className="h-10 text-sm">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">
                    GPT-4o Mini (Fast & Cost-Efficient)
                  </SelectItem>
                  <SelectItem value="gpt-4o">
                    GPT-4o (High Reasoning & Depth)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-sm h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !title.trim()}
              className="gap-2 text-sm h-10 px-5 font-semibold"
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

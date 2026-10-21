"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Loader2 } from "lucide-react";
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
import { createWorkspace } from "@/lib/api";

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceModal({
  open,
  onOpenChange,
}: CreateWorkspaceModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [defaultModel, setDefaultModel] = useState("gpt-4o-mini");

  const mutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      router.push(`/workspace/${newWorkspace.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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
                <FolderPlus className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold">Create New Workspace</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-0.5">
                  A workspace houses your sources, chats, and generated study
                  tools.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-[76px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="icon" className="text-xs sm:text-sm font-semibold">Icon</Label>
                <WorkspaceIconPicker
                  id="icon"
                  value={icon}
                  onChange={setIcon}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs sm:text-sm font-semibold">Workspace Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Biology 101, Machine Learning..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 text-base sm:text-sm"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs sm:text-sm font-semibold">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What will you be studying or researching here?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none text-base sm:text-sm rounded-xl p-3"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-xs sm:text-sm font-semibold">Default AI Model</Label>
              <Select
                value={defaultModel}
                onValueChange={(val) => {
                  if (val) setDefaultModel(val);
                }}
              >
                <SelectTrigger id="model" className="w-full h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini" className="text-xs sm:text-sm">
                    GPT-4o Mini (Fast & Efficient)
                  </SelectItem>
                  <SelectItem value="gpt-4o" className="text-xs sm:text-sm">
                    GPT-4o (High Intelligence & Reasoning)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              className="h-10 text-sm font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || mutation.isPending}
              className="gap-2 h-10 text-sm font-semibold rounded-xl"
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

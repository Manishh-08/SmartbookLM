"use client";

import { useState } from "react";
import { ChevronDown, Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const DEFAULT_WORKSPACE_ICONS = [
  { emoji: "📚", label: "Books / General Study" },
  { emoji: "🎓", label: "Academics & College" },
  { emoji: "💻", label: "Tech & Computer Science" },
  { emoji: "🔬", label: "Science & Research" },
  { emoji: "📐", label: "Mathematics & Physics" },
  { emoji: "🧪", label: "Chemistry & Biology" },
  { emoji: "🧠", label: "AI & Psychology" },
  { emoji: "💡", label: "Ideas & Philosophy" },
  { emoji: "💼", label: "Business & Management" },
  { emoji: "📊", label: "Data & Statistics" },
  { emoji: "⚖️", label: "Law & Policy" },
  { emoji: "🩺", label: "Medicine & Health" },
  { emoji: "🌍", label: "Geography & Earth" },
  { emoji: "🏛️", label: "History & Politics" },
  { emoji: "🎨", label: "Art & Design" },
  { emoji: "🎵", label: "Music & Audio" },
  { emoji: "📝", label: "Notes & Writing" },
  { emoji: "🎯", label: "Exam & Goals" },
  { emoji: "🚀", label: "Projects & Startups" },
  { emoji: "🪐", label: "Space & Astronomy" },
  { emoji: "⚡", label: "Engineering" },
  { emoji: "🤖", label: "Robotics" },
  { emoji: "🌿", label: "Nature & Ecology" },
  { emoji: "📖", label: "Literature" },
];

interface WorkspaceIconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  id?: string;
}

export function WorkspaceIconPicker({
  value,
  onChange,
  id,
}: WorkspaceIconPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        className="w-full h-10 px-2 flex items-center justify-between gap-1 rounded-xl border bg-card hover:bg-muted/50 transition cursor-pointer text-xl shadow-2xs focus:ring-2 focus:ring-primary/30 outline-none"
        title="Choose workspace icon"
      >
        <span className="truncate">{value || "📚"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-72 p-3 space-y-3 z-50 bg-popover/95 backdrop-blur-md rounded-2xl border shadow-xl"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Smile className="h-3.5 w-3.5 text-primary" />
              Default Icons
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Click to select
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {DEFAULT_WORKSPACE_ICONS.map((item) => {
              const isSelected = value === item.emoji;
              return (
                <button
                  key={item.emoji}
                  type="button"
                  onClick={() => handleSelect(item.emoji)}
                  title={item.label}
                  className={`h-9 w-9 rounded-lg flex items-center justify-center text-lg transition cursor-pointer border ${
                    isSelected
                      ? "border-primary bg-primary/15 scale-110 shadow-xs"
                      : "border-transparent hover:bg-muted hover:border-border"
                  }`}
                >
                  {item.emoji}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">
            Or custom emoji
          </Label>
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. 🚀"
              maxLength={4}
              className="h-8 text-center text-base rounded-lg"
            />
            <span className="text-xs text-muted-foreground shrink-0">
              Type or paste
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

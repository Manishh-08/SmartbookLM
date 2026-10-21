"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Globe,
  Video,
  AlignLeft,
  Upload,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTextSource,
  importWebsiteSource,
  importYoutubeSource,
  uploadPdfSource,
} from "@/lib/api";

interface AddSourceModalProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSourceModal({
  workspaceId,
  open,
  onOpenChange,
}: AddSourceModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pdf");

  // PDF Form state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");

  // Website Form state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteTitle, setWebsiteTitle] = useState("");

  // YouTube Form state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");

  // Text/Markdown Form state
  const [textType, setTextType] = useState<"TEXT" | "MARKDOWN">("TEXT");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    setErrorMessage(null);
    if (!isOpen) {
      setPdfFile(null);
      setPdfTitle("");
      setWebsiteUrl("");
      setWebsiteTitle("");
      setYoutubeUrl("");
      setYoutubeTitle("");
      setTextTitle("");
      setTextContent("");
    }
    onOpenChange(isOpen);
  };

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["sources", workspaceId] });
    handleOpenChange(false);
  };

  const pdfMutation = useMutation({
    mutationFn: () => {
      if (!pdfFile) throw new Error("Please select a PDF file");
      return uploadPdfSource(workspaceId, pdfFile, pdfTitle || undefined);
    },
    onMutate: () => setErrorMessage(null),
    onSuccess,
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const websiteMutation = useMutation({
    mutationFn: () => {
      if (!websiteUrl) throw new Error("Please enter a website URL");
      return importWebsiteSource(workspaceId, {
        url: websiteUrl,
        title: websiteTitle || undefined,
      });
    },
    onMutate: () => setErrorMessage(null),
    onSuccess,
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const youtubeMutation = useMutation({
    mutationFn: () => {
      if (!youtubeUrl) throw new Error("Please enter a YouTube URL");
      return importYoutubeSource(workspaceId, {
        url: youtubeUrl,
        title: youtubeTitle || undefined,
      });
    },
    onMutate: () => setErrorMessage(null),
    onSuccess,
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const textMutation = useMutation({
    mutationFn: () => {
      if (!textTitle.trim()) throw new Error("Title is required");
      if (!textContent.trim()) throw new Error("Content is required");
      return createTextSource(workspaceId, {
        type: textType,
        title: textTitle.trim(),
        content: textContent.trim(),
      });
    },
    onMutate: () => setErrorMessage(null),
    onSuccess,
    onError: (err: Error) => setErrorMessage(err.message),
  });

  const isPending =
    pdfMutation.isPending ||
    websiteMutation.isPending ||
    youtubeMutation.isPending ||
    textMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-140 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold">Add Knowledge Source</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Upload files or link content. SmartBookLM indexes and embeds your
            sources for citation-backed learning.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 text-xs sm:text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-medium flex items-center justify-between gap-2">
            <span className="flex-1">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-md hover:bg-destructive/15 text-destructive/80 hover:text-destructive transition cursor-pointer"
              title="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setErrorMessage(null);
            setActiveTab(tab);
          }}
          className="pt-2"
        >
          <TabsList className="grid grid-cols-4 w-full h-11 p-1 bg-muted/60">
            <TabsTrigger value="pdf" className="gap-1.5 text-xs sm:text-sm font-semibold">
              <FileText className="h-4 w-4" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="website" className="gap-1.5 text-xs sm:text-sm font-semibold">
              <Globe className="h-4 w-4" />
              Website
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-1.5 text-xs sm:text-sm font-semibold">
              <Video className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5 text-xs sm:text-sm font-semibold">
              <AlignLeft className="h-4 w-4" />
              Paste
            </TabsTrigger>
          </TabsList>

          {/* PDF Tab */}
          <TabsContent value="pdf" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="pdf-title" className="text-xs sm:text-sm font-semibold">Custom Title (Optional)</Label>
              <Input
                id="pdf-title"
                placeholder="e.g., Chapter 4: Photosynthesis"
                value={pdfTitle}
                onChange={(e) => {
                  setErrorMessage(null);
                  setPdfTitle(e.target.value);
                }}
                className="h-10 text-base sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-semibold">PDF File (Max 10MB)</Label>
              <div className="border-2 border-dashed rounded-2xl p-6 text-center hover:border-primary/50 transition cursor-pointer flex flex-col items-center justify-center gap-2 bg-muted/20">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  id="pdf-upload"
                  onChange={(e) => {
                    setErrorMessage(null);
                    if (e.target.files?.[0]) {
                      setPdfFile(e.target.files[0]);
                      if (!pdfTitle) {
                        setPdfTitle(
                          e.target.files[0].name.replace(/\.pdf$/i, ""),
                        );
                      }
                    }
                  }}
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center gap-2 w-full"
                >
                  <Upload className="h-9 w-9 text-muted-foreground" />
                  {pdfFile ? (
                    <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-primary">
                      <CheckCircle className="h-5 w-5" />
                      {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)}{" "}
                      MB)
                    </div>
                  ) : (
                    <>
                      <p className="text-sm sm:text-base font-semibold">Click to select PDF</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Supports articles, slides, research papers
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold rounded-xl gap-2 mt-2"
              disabled={!pdfFile || isPending}
              onClick={() => {
                setErrorMessage(null);
                pdfMutation.mutate();
              }}
            >
              {pdfMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Upload & Index PDF
            </Button>
          </TabsContent>

          {/* Website Tab */}
          <TabsContent value="website" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="web-url" className="text-xs sm:text-sm font-semibold">Website URL *</Label>
              <Input
                id="web-url"
                type="url"
                placeholder="https://en.wikipedia.org/wiki/Quantum_computing"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="h-10 text-base sm:text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="web-title" className="text-xs sm:text-sm font-semibold">Custom Title (Optional)</Label>
              <Input
                id="web-title"
                placeholder="Defaults to page title"
                value={websiteTitle}
                onChange={(e) => setWebsiteTitle(e.target.value)}
                className="h-10 text-base sm:text-sm"
              />
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold rounded-xl gap-2 mt-2"
              disabled={!websiteUrl.trim() || isPending}
              onClick={() => {
                setErrorMessage(null);
                websiteMutation.mutate();
              }}
            >
              {websiteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Scrape & Import Website
            </Button>
          </TabsContent>

          {/* YouTube Tab */}
          <TabsContent value="youtube" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="yt-url" className="text-xs sm:text-sm font-semibold">YouTube Video URL *</Label>
              <Input
                id="yt-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => {
                  setErrorMessage(null);
                  setYoutubeUrl(e.target.value);
                }}
                className="h-10 text-base sm:text-sm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                The video must have closed captions / transcripts enabled.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yt-title" className="text-xs sm:text-sm font-semibold">Custom Title (Optional)</Label>
              <Input
                id="yt-title"
                placeholder="e.g., Stanford Lecture 1"
                value={youtubeTitle}
                onChange={(e) => {
                  setErrorMessage(null);
                  setYoutubeTitle(e.target.value);
                }}
                className="h-10 text-base sm:text-sm"
              />
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold rounded-xl gap-2 mt-2"
              disabled={!youtubeUrl.trim() || isPending}
              onClick={() => {
                setErrorMessage(null);
                youtubeMutation.mutate();
              }}
            >
              {youtubeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Fetch Transcript & Index
            </Button>
          </TabsContent>

          {/* Text/Markdown Tab */}
          <TabsContent value="text" className="space-y-4 pt-3">
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="textType"
                  checked={textType === "TEXT"}
                  onChange={() => {
                    setErrorMessage(null);
                    setTextType("TEXT");
                  }}
                  className="text-primary h-4 w-4"
                />
                Plain Text
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="textType"
                  checked={textType === "MARKDOWN"}
                  onChange={() => {
                    setErrorMessage(null);
                    setTextType("MARKDOWN");
                  }}
                  className="text-primary h-4 w-4"
                />
                Markdown
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paste-title" className="text-xs sm:text-sm font-semibold">Document Title *</Label>
              <Input
                id="paste-title"
                placeholder="e.g., Meeting Notes, Summary..."
                value={textTitle}
                onChange={(e) => {
                  setErrorMessage(null);
                  setTextTitle(e.target.value);
                }}
                className="h-10 text-base sm:text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paste-content" className="text-xs sm:text-sm font-semibold">Content *</Label>
              <Textarea
                id="paste-content"
                placeholder="Paste your text or markdown content here..."
                value={textContent}
                onChange={(e) => {
                  setErrorMessage(null);
                  setTextContent(e.target.value);
                }}
                rows={6}
                className="text-base sm:text-sm rounded-xl p-3"
                required
              />
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold rounded-xl gap-2 mt-2"
              disabled={!textTitle.trim() || !textContent.trim() || isPending}
              onClick={() => {
                setErrorMessage(null);
                textMutation.mutate();
              }}
            >
              {textMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save & Index Content
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

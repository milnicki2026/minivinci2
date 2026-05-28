import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DrawingCanvas } from "./DrawingCanvas";
import {
  BookOpen, Palette, ChevronLeft, ChevronRight, Plus,
  Eye, Printer, LayoutGrid, X, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateStamp } from "@/lib/stabilityAI";
import { getStampSubjects } from "@/lib/claudeAI";
import { toast } from "sonner";
import type { Stamp } from "./AnimalPicker";

// ── Data model ────────────────────────────────────────────────────
interface StoryPage {
  id: string;
  type: "write" | "draw";
  text: string;
  drawing?: string;
}

interface StorySetup {
  characters: string[];
  setting: string;
  genre: string;
}

// ── Component ─────────────────────────────────────────────────────
export const StoryEditor = ({
  initialStory,
  storySetup,
}: {
  initialStory?: string;
  storySetup?: StorySetup;
}) => {
  const [pages, setPages] = useState<StoryPage[]>([
    { id: "1", type: "write", text: initialStory || "" },
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [storyTitle] = useState("My Amazing Story");
  const [isPreview, setIsPreview] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [stampsLoading, setStampsLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showViewAllAddMenu, setShowViewAllAddMenu] = useState(false);

  useEffect(() => {
    if (!storySetup) return;
    setStampsLoading(true);
    getStampSubjects(storySetup.characters, storySetup.setting, storySetup.genre)
      .then((subjects) =>
        Promise.allSettled(subjects.map((s) => generateStamp(s).then((img) => ({ name: s, image: img }))))
      )
      .then((results) => {
        const successful = results
          .filter((r): r is PromiseFulfilledResult<Stamp> => r.status === "fulfilled" && !!r.value.image)
          .map((r) => r.value);
        setStamps(successful);
        setStampsLoading(false);
      })
      .catch(() => setStampsLoading(false));
  }, []);

  const currentPage = pages[currentPageIndex];

  const updatePageText = (text: string) => {
    setPages((prev) => {
      const next = [...prev];
      next[currentPageIndex] = { ...next[currentPageIndex], text };
      return next;
    });
  };

  const addPage = (type: "write" | "draw") => {
    const newPage: StoryPage = {
      id: Date.now().toString(),
      type,
      text: "",
      drawing: undefined,
    };
    setPages((prev) => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
    setShowAddMenu(false);
  };

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) setCurrentPageIndex((i) => i + 1);
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) setCurrentPageIndex((i) => i - 1);
  };

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newPages = [...pages];
    const [dragged] = newPages.splice(dragIndex, 1);
    newPages.splice(toIndex, 0, dragged);
    setPages(newPages);
    if (currentPageIndex === dragIndex) {
      setCurrentPageIndex(toIndex);
    } else if (dragIndex < currentPageIndex && toIndex >= currentPageIndex) {
      setCurrentPageIndex((i) => i - 1);
    } else if (dragIndex > currentPageIndex && toIndex <= currentPageIndex) {
      setCurrentPageIndex((i) => i + 1);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = pages
      .map(
        (page, i) => `
      <div class="page" style="page-break-after:always;padding:40px;font-family:sans-serif;">
        <div style="color:#888;font-size:14px;margin-bottom:16px;">Page ${i + 1} · ${page.type === "write" ? "Story" : "Illustration"}</div>
        ${page.type === "write" && page.text ? `<p style="font-size:18px;line-height:1.8;white-space:pre-wrap;">${page.text}</p>` : ""}
        ${page.type === "draw" && page.drawing ? `<img src="${page.drawing}" style="width:100%;border-radius:12px;" />` : ""}
      </div>`
      )
      .join("");
    printWindow.document.write(
      `<html><head><title>${storyTitle}</title>
       <style>@media print{.page:last-child{page-break-after:avoid;}}</style>
       </head><body style="margin:0;">${html}</body></html>`
    );
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  // ── View All ───────────────────────────────────────────────────
  if (viewAll) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">All Pages</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Drag to reorder · click to edit</p>
            </div>
            <Button onClick={() => setViewAll(false)} variant="outline" className="rounded-full px-5">
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>

          {/* Thumbnail grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-5">
            {pages.map((page, index) => {
              const isWrite = page.type === "write";
              const isDragging = dragIndex === index;
              const isOver = dragOverIndex === index && dragIndex !== index;
              return (
                <div
                  key={page.id}
                  className={cn(
                    "flex flex-col gap-1.5 transition-all select-none",
                    isDragging ? "opacity-30 scale-95" : "",
                    isOver ? "scale-[1.05]" : ""
                  )}
                >
                  {/* Drop-target highlight — shown above card when dragging over */}
                  {isOver && (
                    <div className="h-1 rounded-full bg-primary mx-1 -mb-1" />
                  )}

                  {/* Card — drag handle strip on top, thumbnail below */}
                  <div
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 shadow-sm transition-all",
                      index === currentPageIndex
                        ? isWrite ? "border-teal shadow-teal/30" : "border-pink shadow-pink/30"
                        : isOver ? "border-primary" : "border-border"
                    )}
                  >
                    {/* ── Drag handle strip ── always visible, drag only from here */}
                    <div
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragIndex(index); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverIndex(index); }}
                      onDrop={(e) => { e.stopPropagation(); handleDrop(index); }}
                      onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 cursor-grab active:cursor-grabbing",
                        isWrite ? "bg-teal/15" : "bg-pink/15"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <GripVertical className={cn("h-3.5 w-3.5", isWrite ? "text-teal" : "text-pink")} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide", isWrite ? "text-teal" : "text-pink")}>
                          {isWrite ? "Write" : "Draw"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">{index + 1}</span>
                    </div>

                    {/* ── Thumbnail ── click to navigate */}
                    <button
                      draggable={false}
                      onClick={() => { setCurrentPageIndex(index); setViewAll(false); }}
                      className="relative w-full aspect-[3/4] block focus:outline-none group overflow-hidden bg-white"
                    >
                      {isWrite ? (
                        <div className="absolute inset-0 p-3 flex flex-col overflow-hidden">
                          {page.text ? (
                            <p className="text-[7px] leading-[1.6] text-foreground/80 break-words whitespace-pre-wrap">
                              {page.text}
                            </p>
                          ) : (
                            <div className="flex flex-col gap-[6px] pt-1">
                              {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="h-[3px] rounded-full bg-muted-foreground/12" />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          {page.drawing ? (
                            <img
                              draggable={false}
                              src={page.drawing}
                              alt={`Page ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Palette className="h-8 w-8 text-muted-foreground/25" />
                          )}
                        </div>
                      )}

                      {/* Current badge */}
                      {index === currentPageIndex && (
                        <div className={cn(
                          "absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 text-white",
                          isWrite ? "bg-teal" : "bg-pink"
                        )}>
                          Current
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add page cell */}
            <div className="flex flex-col gap-1.5">
              {showViewAllAddMenu ? (
                <div className="flex flex-col gap-2 aspect-[3/4]">
                  <button
                    onClick={() => { addPage("write"); setViewAll(false); setShowViewAllAddMenu(false); }}
                    className="flex-1 rounded-xl border-2 border-dashed border-teal/50 hover:border-teal bg-teal/5 hover:bg-teal/10 transition-all flex flex-col items-center justify-center gap-1 text-teal focus:outline-none"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="text-[11px] font-semibold">Write</span>
                  </button>
                  <button
                    onClick={() => { addPage("draw"); setViewAll(false); setShowViewAllAddMenu(false); }}
                    className="flex-1 rounded-xl border-2 border-dashed border-pink/50 hover:border-pink bg-pink/5 hover:bg-pink/10 transition-all flex flex-col items-center justify-center gap-1 text-pink focus:outline-none"
                  >
                    <Palette className="h-5 w-5" />
                    <span className="text-[11px] font-semibold">Draw</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowViewAllAddMenu(true)}
                  className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary focus:outline-none"
                >
                  <Plus className="h-7 w-7" />
                  <span className="text-[11px] font-semibold">Add Page</span>
                </button>
              )}
              <div className="h-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────
  const isWrite = currentPage.type === "write";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal/10 via-yellow/10 to-pink/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {!isPreview ? (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              {/* Page type badge */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm shadow-sm",
                isWrite ? "bg-teal text-white" : "bg-pink text-white"
              )}>
                {isWrite ? <BookOpen className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
                {isWrite ? "Write Page" : "Draw Page"}
              </div>

              <div className="flex gap-2">
                <Button onClick={handlePrint} className="bg-orange hover:bg-orange/90 text-white rounded-full px-6">
                  <Printer className="mr-2 h-5 w-5" />
                  Print
                </Button>
                <Button
                  onClick={() => setIsPreview(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
                >
                  <Eye className="mr-2 h-5 w-5" />
                  Preview
                </Button>
              </div>
            </div>

            {/* Editor area */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-6">
              <div className="text-sm font-semibold text-muted-foreground mb-4">
                Page {currentPageIndex + 1} of {pages.length}
              </div>
              {isWrite ? (
                <Textarea
                  value={currentPage.text}
                  onChange={(e) => updatePageText(e.target.value)}
                  placeholder="Once upon a time..."
                  className="min-h-[400px] text-lg border-2 border-border rounded-2xl resize-none focus-visible:ring-2 focus-visible:ring-teal"
                />
              ) : (
                <DrawingCanvas
                  pageId={currentPage.id}
                  initialImage={currentPage.drawing}
                  stamps={stamps}
                  stampsLoading={stampsLoading}
                  storyText={currentPage.text}
                  onDrawingChange={(dataUrl) =>
                    setPages((prev) => {
                      const next = [...prev];
                      next[currentPageIndex] = { ...next[currentPageIndex], drawing: dataUrl };
                      return next;
                    })
                  }
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={goToPreviousPage}
                disabled={currentPageIndex === 0}
                className="bg-orange hover:bg-orange/90 text-white rounded-full px-6 disabled:opacity-50"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Previous
              </Button>

              <div className="flex gap-2 items-center">
                {/* Page dots */}
                {pages.map((p, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPageIndex(index)}
                    className={cn(
                      "h-3 rounded-full transition-all",
                      index === currentPageIndex
                        ? p.type === "write" ? "bg-teal w-8" : "bg-pink w-8"
                        : "bg-neutral w-3 hover:bg-primary/50"
                    )}
                  />
                ))}

                {/* Add page — split into two small buttons */}
                <div className="relative">
                  <button
                    onClick={() => setShowAddMenu((v) => !v)}
                    className="w-8 h-8 rounded-full bg-lime hover:bg-lime/90 flex items-center justify-center text-foreground shadow-sm"
                    title="Add page"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {showAddMenu && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-border p-2 flex flex-col gap-1 min-w-[160px] z-30">
                      <button
                        onClick={() => addPage("write")}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-teal/10 text-teal"
                      >
                        <BookOpen className="h-4 w-4" />
                        Write Page
                      </button>
                      <button
                        onClick={() => addPage("draw")}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-pink/10 text-pink"
                      >
                        <Palette className="h-4 w-4" />
                        Draw Page
                      </button>
                    </div>
                  )}
                </div>

                {/* View all */}
                <button
                  onClick={() => setViewAll(true)}
                  className="w-8 h-8 rounded-full border-2 border-border bg-white hover:border-primary flex items-center justify-center"
                  title="View all pages"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              <Button
                onClick={goToNextPage}
                disabled={currentPageIndex === pages.length - 1}
                className="bg-orange hover:bg-orange/90 text-white rounded-full px-6 disabled:opacity-50"
              >
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </>
        ) : (
          /* Preview */
          <div className="space-y-6">
            <div className="flex justify-end mb-2">
              <Button onClick={() => setIsPreview(false)} variant="outline" className="rounded-full px-5">
                <X className="mr-2 h-4 w-4" /> Close Preview
              </Button>
            </div>
            {pages.map((page, index) => (
              <div key={page.id} className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className={cn("px-8 py-3 text-xs font-bold uppercase tracking-wide", page.type === "write" ? "bg-teal/10 text-teal" : "bg-pink/10 text-pink")}>
                  {page.type === "write" ? "Story" : "Illustration"} · Page {index + 1}
                </div>
                <div className="p-8">
                  {page.type === "write" && page.text && (
                    <p className="text-lg leading-relaxed whitespace-pre-wrap">{page.text}</p>
                  )}
                  {page.type === "draw" && page.drawing && (
                    <img src={page.drawing} alt={`Page ${index + 1}`} className="w-full rounded-2xl" />
                  )}
                  {(page.type === "write" && !page.text) && (
                    <p className="italic text-muted-foreground">No text on this page yet.</p>
                  )}
                  {(page.type === "draw" && !page.drawing) && (
                    <p className="italic text-muted-foreground">No illustration on this page yet.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

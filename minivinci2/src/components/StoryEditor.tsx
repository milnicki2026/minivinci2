import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DrawingCanvas } from "./DrawingCanvas";
import {
  BookOpen, Palette, ChevronLeft, ChevronRight, ChevronDown, Plus,
  Eye, Printer, LayoutGrid, X, GripVertical, Star, BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateStamp } from "@/lib/stabilityAI";
import { getStampSubjects } from "@/lib/claudeAI";
import { toast } from "sonner";
import type { Stamp } from "./AnimalPicker";

// ── Data model ────────────────────────────────────────────────────
type PageType =
  | "write"
  | "draw"
  | "cover"
  | "inside-cover"
  | "inside-back-cover"
  | "back-cover";

interface StoryPage {
  id: string;
  type: PageType;
  text: string;
  drawing?: string;
}

// Metadata for every page type — colours, labels, icons
const PAGE_META: Record<
  PageType,
  {
    label: string;
    short: string;
    handleBg: string;
    textColor: string;
    activeBorder: string;
    activeShadow: string;
    dotColor: string;
    thumbBg: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  write: {
    label: "Write Page",    short: "Write",
    handleBg: "bg-teal/15", textColor: "text-teal",
    activeBorder: "border-teal", activeShadow: "shadow-teal/20",
    dotColor: "bg-teal",    thumbBg: "bg-white",
    Icon: BookOpen,
  },
  draw: {
    label: "Draw Page",     short: "Draw",
    handleBg: "bg-pink/15", textColor: "text-pink",
    activeBorder: "border-pink", activeShadow: "shadow-pink/20",
    dotColor: "bg-pink",    thumbBg: "bg-muted",
    Icon: Palette,
  },
  cover: {
    label: "Cover",         short: "Cover",
    handleBg: "bg-yellow/30", textColor: "text-orange",
    activeBorder: "border-yellow", activeShadow: "shadow-yellow/20",
    dotColor: "bg-yellow",    thumbBg: "bg-yellow/10",
    Icon: Star,
  },
  "inside-cover": {
    label: "Inside Cover",  short: "Inside Cvr",
    handleBg: "bg-yellow/30", textColor: "text-orange",
    activeBorder: "border-yellow", activeShadow: "shadow-yellow/20",
    dotColor: "bg-yellow",    thumbBg: "bg-yellow/10",
    Icon: BookMarked,
  },
  "inside-back-cover": {
    label: "Inside Back Cover", short: "Inside Back",
    handleBg: "bg-orange/80", textColor: "text-white",
    activeBorder: "border-orange", activeShadow: "shadow-orange/20",
    dotColor: "bg-orange",    thumbBg: "bg-orange/10",
    Icon: BookMarked,
  },
  "back-cover": {
    label: "Back Cover",    short: "Back Cvr",
    handleBg: "bg-orange",  textColor: "text-white",
    activeBorder: "border-orange", activeShadow: "shadow-orange/20",
    dotColor: "bg-orange",    thumbBg: "bg-orange/10",
    Icon: Star,
  },
};

// All non-write types use the drawing canvas
const isCanvasType = (t: PageType) => t !== "write";

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
  const [showStructureSection, setShowStructureSection] = useState(false);

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

  const addPage = (type: PageType) => {
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

  // Reset add-menu state whenever the All Pages overlay closes
  useEffect(() => {
    if (!viewAll) {
      setShowViewAllAddMenu(false);
      setShowStructureSection(false);
    }
  }, [viewAll]);

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
    // Typed slots
    type SpreadSlot =
      | { kind: "page"; page: StoryPage; index: number }
      | { kind: "add" }
      | { kind: "empty" };

    // Page 0 is always the solo cover; remaining pages pair up
    type Spread =
      | { kind: "solo"; slot: SpreadSlot }
      | { kind: "pair"; left: SpreadSlot; right: SpreadSlot };

    const spreads: Spread[] = [];

    if (pages.length > 0) {
      spreads.push({ kind: "solo", slot: { kind: "page", page: pages[0], index: 0 } });
    }

    const rest: SpreadSlot[] = [
      ...pages.slice(1).map((page, i) => ({ kind: "page" as const, page, index: i + 1 })),
      { kind: "add" as const },
    ];
    if (rest.length % 2 !== 0) rest.push({ kind: "empty" as const });
    for (let i = 0; i < rest.length; i += 2) {
      spreads.push({ kind: "pair", left: rest[i], right: rest[i + 1] });
    }

    const renderSlot = (slot: SpreadSlot, side: "left" | "right" | "solo") => {
      // Empty padding slot
      if (slot.kind === "empty") return <div className="flex-1" />;

      // Add page slot
      if (slot.kind === "add") {
        return (
          <div className="flex-1 flex flex-col">
            <div
              className={cn(
                "rounded-xl overflow-hidden border-2 border-dashed border-border flex flex-col",
                side === "left" ? "rounded-r-sm" : side === "right" ? "rounded-l-sm" : ""
              )}
            >
              {/* Invisible spacer — matches drag handle strip height exactly */}
              <div className="flex items-center px-2 py-1.5 pointer-events-none select-none opacity-0" aria-hidden>
                <GripVertical className="h-3.5 w-3.5" />
              </div>

              {/* Content — same aspect ratio as page thumbnails */}
              {showViewAllAddMenu ? (
                <div className="w-full aspect-[3/4] flex flex-col gap-1 p-1.5 overflow-y-auto">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1 pt-0.5">Story</p>
                  {(["write", "draw"] as PageType[]).map((t) => {
                    const m = PAGE_META[t];
                    return (
                      <button key={t}
                        onClick={() => { addPage(t); setViewAll(false); setShowViewAllAddMenu(false); }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-neutral/30 bg-white text-foreground hover:bg-muted/40 transition-all focus:outline-none text-left"
                      >
                        <m.Icon className={cn("h-3.5 w-3.5 flex-shrink-0", m.textColor)} />
                        <span className="text-[10px] font-semibold leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                  <div className="h-px bg-border mx-1 my-0.5" />
                  {/* Book Cover — collapsible drawer */}
                  <button
                    onClick={() => setShowStructureSection(v => !v)}
                    className="flex items-center justify-between px-1.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors focus:outline-none"
                  >
                    Book Cover
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showStructureSection ? "rotate-0" : "-rotate-90")} />
                  </button>
                  {showStructureSection && (
                    <div className="flex flex-col gap-1">
                      {(["cover", "inside-cover", "inside-back-cover", "back-cover"] as PageType[]).map((t) => {
                        const m = PAGE_META[t];
                        return (
                          <button key={t}
                            onClick={() => { addPage(t); setViewAll(false); setShowViewAllAddMenu(false); }}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-neutral/30 bg-white text-foreground hover:bg-muted/40 transition-all focus:outline-none text-left"
                          >
                            <m.Icon className="h-3.5 w-3.5 flex-shrink-0 text-orange" />
                            <span className="text-[10px] font-semibold leading-tight">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setShowViewAllAddMenu(true); setShowStructureSection(false); }}
                  className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all focus:outline-none"
                >
                  <Plus className="h-7 w-7" />
                  <span className="text-[11px] font-semibold">Add Page</span>
                </button>
              )}
            </div>
          </div>
        );
      }

      // Real page card
      const { page, index } = slot;
      const meta = PAGE_META[page.type];
      const isDragging = dragIndex === index;
      const isOver = dragOverIndex === index && dragIndex !== index;
      const isCurrent = index === currentPageIndex;

      return (
        <div
          className={cn(
            "flex-1 flex flex-col transition-all select-none",
            isDragging ? "opacity-40 scale-[0.97]" : "",
          )}
        >
          {/* Entire card is the drop target */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverIndex(null);
            }}
            onDrop={(e) => { e.preventDefault(); handleDrop(index); }}
            className={cn(
              "relative rounded-xl overflow-hidden border-2 shadow-sm transition-all",
              side === "left" ? "rounded-r-sm" : side === "right" ? "rounded-l-sm" : "",
              isOver
                ? "border-primary ring-4 ring-primary/25 shadow-primary/20 shadow-lg scale-[1.03]"
                : isCurrent
                  ? `${meta.activeBorder} ${meta.activeShadow}`
                  : "border-border"
            )}
          >
            {/* Drag handle strip */}
            <div
              draggable
              onDragStart={(e) => { e.stopPropagation(); setDragIndex(index); }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={cn(
                "flex items-center justify-between px-2 py-1.5 cursor-grab active:cursor-grabbing",
                meta.handleBg
              )}
            >
              <div className="flex items-center gap-1.5">
                <GripVertical className={cn("h-3.5 w-3.5", meta.textColor)} />
                <span className={cn("text-[10px] font-bold uppercase tracking-wide", meta.textColor)}>
                  {meta.short}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{index + 1}</span>
            </div>

            {/* Thumbnail */}
            <button
              draggable={false}
              onClick={() => { setCurrentPageIndex(index); setViewAll(false); }}
              className={cn("relative w-full aspect-[3/4] block focus:outline-none group overflow-hidden", meta.thumbBg)}
            >
              {page.type === "write" ? (
                /* Write page — text preview or ruled lines */
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
                /* Canvas-based page — drawing or placeholder */
                <div className="absolute inset-0 flex items-center justify-center">
                  {page.drawing ? (
                    <img
                      draggable={false}
                      src={page.drawing}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Unique placeholder per structural type */
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <meta.Icon className={cn("h-8 w-8", meta.textColor)} />
                      <span className={cn("text-[9px] font-bold uppercase tracking-widest", meta.textColor)}>
                        {meta.short}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {isCurrent && !isOver && (
                <div className={cn(
                  "absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 text-white",
                  meta.dotColor
                )}>
                  Current
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </button>

            {/* Drop overlay */}
            {isOver && (
              <div className="absolute inset-0 bg-primary/8 pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-bold text-primary bg-white/90 rounded-full px-3 py-1 shadow-sm">
                  Move here
                </span>
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 md:p-10">
          {/* Header */}
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

          {/* Spreads — cover solo, rest in pairs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {spreads.map((spread, si) => {
              if (spread.kind === "solo") {
                return (
                  <div key="cover" className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Cover · p. 1
                      </span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                    <div className="flex">
                      <div className="w-1/2 shadow-md">{renderSlot(spread.slot, "solo")}</div>
                    </div>
                  </div>
                );
              }

              const { left: leftSlot, right: rightSlot } = spread;
              const hasAdd = leftSlot.kind === "add" || rightSlot.kind === "add";
              const pairIndex = si - 1;
              const leftNum = si * 2;
              const rightNum = si * 2 + 1;
              return (
                <div key={si} className="flex flex-col gap-2">
                  {/* Spread label */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {hasAdd ? "New spread" : `Spread ${pairIndex + 1} · pp. ${leftNum}–${rightNum}`}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>

                  {/* Two pages side by side with spine */}
                  <div className="flex items-stretch gap-0 rounded-xl overflow-hidden shadow-md">
                    <div className="flex-1 flex">{renderSlot(leftSlot, "left")}</div>

                    {/* Spine */}
                    <div className="w-3 flex-shrink-0 bg-gradient-to-r from-black/8 via-black/4 to-black/8 relative">
                      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-black/10" />
                    </div>

                    <div className="flex-1 flex">{renderSlot(rightSlot, "right")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────
  const isWrite = currentPage.type === "write";
  const pageMeta = PAGE_META[currentPage.type];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal/10 via-yellow/10 to-pink/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {!isPreview ? (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              {/* Page type badge */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm shadow-sm text-white",
                pageMeta.dotColor
              )}>
                <pageMeta.Icon className="h-4 w-4" />
                {pageMeta.label}
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
                        ? `${PAGE_META[p.type].dotColor} w-8`
                        : "bg-neutral w-3 hover:bg-primary/50"
                    )}
                  />
                ))}

                {/* Add page — split into two small buttons */}
                <div className="relative">
                  <button
                    onClick={() => { setShowAddMenu((v) => !v); setShowStructureSection(false); }}
                    className="w-8 h-8 rounded-full bg-lime hover:bg-lime/90 flex items-center justify-center text-foreground shadow-sm"
                    title="Add page"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {showAddMenu && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-border p-2 flex flex-col gap-0.5 min-w-[190px] z-30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 pt-1 pb-0.5">Story pages</p>
                      {(["write", "draw"] as PageType[]).map((t) => {
                        const m = PAGE_META[t];
                        return (
                          <button key={t} onClick={() => addPage(t)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-neutral/30 bg-white text-foreground hover:bg-muted/40 transition-colors">
                            <m.Icon className={cn("h-4 w-4", m.textColor)} />{m.label}
                          </button>
                        );
                      })}
                      <div className="h-px bg-border mx-2 my-1" />
                      {/* Book Cover — collapsible drawer */}
                      <button
                        onClick={() => setShowStructureSection(v => !v)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        Book Cover
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showStructureSection ? "rotate-0" : "-rotate-90")} />
                      </button>
                      {showStructureSection && (
                        <div className="flex flex-col gap-0.5">
                          {(["cover", "inside-cover", "inside-back-cover", "back-cover"] as PageType[]).map((t) => {
                            const m = PAGE_META[t];
                            return (
                              <button key={t} onClick={() => addPage(t)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-neutral/30 bg-white text-foreground hover:bg-muted/40 transition-colors">
                                <m.Icon className="h-4 w-4 text-orange" />{m.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
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

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { saveProfile } from "@/pages/Profiles";
import { getActiveProfileId } from "@/pages/UserProfile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DrawingCanvas } from "./DrawingCanvas";
import {
  BookOpen, Palette, ChevronLeft, ChevronRight, ChevronDown, Plus,
  Eye, Printer, Save, LayoutGrid, X, GripVertical, Star, BookMarked, Type, Layers, Upload, Trash2, UserRound,
  AlignLeft, AlignCenter, AlignRight,
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

interface TextBox {
  id: string;
  x: number; // px from canvas container left
  y: number; // px from canvas container top
  text: string;
  font?: string; // Google Font family name
}

type CoverBackground =
  | { kind: "solid";      color: string; opacity?: number }
  | { kind: "gradient";   css: string   }
  | { kind: "watercolor"; color: string }
  | { kind: "image";      url: string   };

interface StoryPage {
  id: string;
  type: PageType;
  text: string;
  drawing?: string;
  textBoxes?: TextBox[];
  background?: CoverBackground;
  textAlign?: "left" | "center" | "right";
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

// Curated free Google Fonts for the cover text tool
const COVER_FONTS: { name: string; label: string }[] = [
  { name: "Pacifico",          label: "Pacifico"   },
  { name: "Fredoka One",       label: "Fredoka"    },
  { name: "Bubblegum Sans",    label: "Bubblegum"  },
  { name: "Bangers",           label: "Bangers"    },
  { name: "Permanent Marker",  label: "Marker"     },
  { name: "Caveat",            label: "Caveat"     },
  { name: "Luckiest Guy",      label: "Luckiest"   },
  { name: "Lilita One",        label: "Lilita"     },
];

const BG_PALETTE = [
  "#C4694F", "#D4944A", "#D4B050", "#7BAD72", "#5790BC", "#8B6BAD",
  "#C47A8A", "#8B3A5A", "#7A9050", "#5A9090", "#4A5E8A", "#AA8870",
];

const GRADIENT_PRESETS: { label: string; css: string }[] = [
  { label: "Sunset",       css: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)" },
  { label: "Ocean",        css: "linear-gradient(180deg, #38bdf8, #0284c7, #1e3a5f)" },
  { label: "Aurora",       css: "linear-gradient(135deg, #34d399, #06b6d4, #818cf8)" },
  { label: "Golden",       css: "linear-gradient(135deg, #fcd34d, #f97316, #dc2626)" },
  { label: "Cotton Candy", css: "linear-gradient(135deg, #f9a8d4, #c4b5fd, #93c5fd)" },
  { label: "Mint",         css: "linear-gradient(135deg, #bbf7d0, #2dd4bf, #0369a1)" },
  { label: "Rose Gold",    css: "linear-gradient(135deg, #fda4af, #f9a8d4, #fde68a)" },
  { label: "Storm",        css: "linear-gradient(180deg, #94a3b8, #334155, #0f172a)" },
  { label: "Forest",       css: "linear-gradient(180deg, #86efac, #16a34a, #14532d)" },
  { label: "Bubblegum",    css: "linear-gradient(135deg, #fda4af, #f43f5e, #be185d)" },
  { label: "Sky",          css: "linear-gradient(180deg, #e0f2fe, #38bdf8, #0369a1)" },
  { label: "Twilight",     css: "linear-gradient(180deg, #c4b5fd, #7c3aed, #1e1b4b)" },
];

const getCoverBgStyle = (bg: CoverBackground | undefined): string | undefined => {
  if (!bg) return undefined;
  if (bg.kind === "solid") {
    const op = bg.opacity ?? 100;
    if (op < 100) {
      const r = parseInt(bg.color.slice(1, 3), 16);
      const g = parseInt(bg.color.slice(3, 5), 16);
      const b = parseInt(bg.color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${(op / 100).toFixed(2)})`;
    }
    return bg.color;
  }
  if (bg.kind === "gradient") return bg.css;
  if (bg.kind === "watercolor") {
    return [
      // ── FOUNDATION: full-width top wash (forces top to near-white) ─
      `linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.58) 18%, rgba(255,255,255,0.20) 40%, transparent 58%)`,

      // ── DIRECTIONAL BRUSHSTROKES (organic variation) ──────────────
      `linear-gradient(135deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.25) 30%, transparent 50%)`,
      `linear-gradient(225deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.15) 28%, transparent 46%)`,

      // ── RADIAL CLOUD BLOOMS ───────────────────────────────────────
      // Main top-center bloom (sits ON the canvas at y=0%)
      `radial-gradient(ellipse 82% 58% at 48% 0%, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.60) 32%, rgba(255,255,255,0.18) 58%, transparent 72%)`,
      // Upper-left cloud
      `radial-gradient(ellipse 58% 50% at -5% 6%, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.45) 38%, transparent 64%)`,
      // Right-side secondary bloom
      `radial-gradient(ellipse 50% 40% at 108% 20%, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0.35) 44%, transparent 68%)`,
      // Bright water-droplet spot
      `radial-gradient(ellipse 16% 11% at 62% 2%, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.60) 42%, transparent 76%)`,
      // Upper-left secondary detail
      `radial-gradient(ellipse 26% 16% at 22% 20%, rgba(255,255,255,0.72) 0%, transparent 68%)`,
      // Mid-body irregular patch
      `radial-gradient(ellipse 28% 18% at 70% 36%, rgba(255,255,255,0.44) 0%, transparent 70%)`,
      // Lower ghost highlight
      `radial-gradient(ellipse 22% 16% at 35% 58%, rgba(255,255,255,0.32) 0%, transparent 65%)`,

      // ── TIDE-MARK RINGS (dried paint boundary lines) ──────────────
      `radial-gradient(ellipse 76% 46% at 48% 2%, transparent 60%, rgba(0,0,0,0.12) 68%, transparent 82%)`,
      `radial-gradient(ellipse 52% 46% at -4% 8%, transparent 58%, rgba(0,0,0,0.09) 67%, transparent 80%)`,

      // ── DARK ZONES (concentrated pigment at edges/bottom) ─────────
      // Bottom-left corner — deepest shadow
      `radial-gradient(ellipse 65% 52% at -15% 118%, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.20) 42%, transparent 70%)`,
      // Bottom edge band
      `radial-gradient(ellipse 125% 28% at 50% 122%, rgba(0,0,0,0.36) 0%, transparent 60%)`,
      // Bottom-right pooling
      `radial-gradient(ellipse 50% 44% at 118% 110%, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.10) 50%, transparent 74%)`,
      // Right-edge mid
      `radial-gradient(ellipse 20% 42% at 104% 54%, rgba(0,0,0,0.18) 0%, transparent 62%)`,
      // Left-edge
      `radial-gradient(ellipse 16% 46% at 0% 66%, rgba(0,0,0,0.15) 0%, transparent 64%)`,

      bg.color,
    ].join(", ");
  }
  if (bg.kind === "image") return `url(${bg.url}) center/cover no-repeat`;
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
  savedProfile,
}: {
  initialStory?: string;
  storySetup?: StorySetup;
  savedProfile?: { pages: unknown[]; storyTitle: string };
}) => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<StoryPage[]>(() => {
    const raw: StoryPage[] = savedProfile
      ? (savedProfile.pages as StoryPage[])
      : [{ id: "1", type: "cover", text: "" }, { id: "2", type: "write", text: initialStory || "" }];

    // 1. Exactly one cover at position 0
    const covers    = raw.filter((p) => p.type === "cover");
    const nonCovers = raw.filter((p) => p.type !== "cover");
    const cover     = covers[0] ?? { id: `cover_${Date.now()}`, type: "cover" as const, text: "" };

    // 2. Inside-cover (if present) always at position 1 (left of spread 1)
    const icIdx      = nonCovers.findIndex((p) => p.type === "inside-cover");
    const ordered    = icIdx > 0
      ? [nonCovers[icIdx], ...nonCovers.filter((_, i) => i !== icIdx)]
      : nonCovers;

    return [cover, ...ordered];
  });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [storyTitle, setStoryTitle] = useState(savedProfile?.storyTitle ?? "");
  const [isPreview, setIsPreview] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [stampsLoading, setStampsLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showViewAllAddMenu, setShowViewAllAddMenu] = useState(false);
  const [showStructureSection, setShowStructureSection] = useState(false);
  const [textToolActive, setTextToolActive] = useState(false);
  const [newTextBoxId, setNewTextBoxId] = useState<string | null>(null);
  const [showBgMenu, setShowBgMenu] = useState(false);
  const [bgMenuTab, setBgMenuTab] = useState<"solid" | "gradient" | "watercolor" | "image">("solid");
  const canvasContainerRef = useRef<HTMLDivElement>(null);

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

  const updateBackground = (bg: CoverBackground | undefined) => {
    setPages((prev) => {
      const next = [...prev];
      next[currentPageIndex] = { ...next[currentPageIndex], background: bg };
      return next;
    });
  };

  const hasCover          = pages.some((p) => p.type === "cover");
  const hasInsideCover    = pages.some((p) => p.type === "inside-cover");
  const hasInsideBack     = pages.some((p) => p.type === "inside-back-cover");
  const hasBackCover      = pages.some((p) => p.type === "back-cover");
  const structuralExists  = (t: PageType) =>
    (t === "cover" && hasCover) ||
    (t === "inside-cover" && hasInsideCover) ||
    (t === "inside-back-cover" && hasInsideBack) ||
    (t === "back-cover" && hasBackCover);

  const addPage = (type: PageType) => {
    // Each structural cover type can only appear once
    if (structuralExists(type)) return;
    const newPage: StoryPage = {
      id: Date.now().toString(),
      type,
      text: "",
      drawing: undefined,
    };
    if (type === "inside-cover") {
      // Always slot at index 1 — left of spread 1
      setPages((prev) => { const next = [...prev]; next.splice(1, 0, newPage); return next; });
      setCurrentPageIndex(1);
    } else {
      setPages((prev) => [...prev, newPage]);
      setCurrentPageIndex(pages.length);
    }
    setShowAddMenu(false);
  };

  // Reset add-menu state whenever the All Pages overlay closes
  useEffect(() => {
    if (!viewAll) {
      setShowViewAllAddMenu(false);
      setShowStructureSection(false);
    }
  }, [viewAll]);

  // Reset text tool and background menu when navigating pages
  useEffect(() => {
    setTextToolActive(false);
    setShowBgMenu(false);
  }, [currentPageIndex]);

  // Inject Google Fonts for the cover text tool (runs once)
  useEffect(() => {
    const id = "cover-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Pacifico&family=Fredoka+One&family=Bubblegum+Sans&family=Bangers&family=Permanent+Marker&family=Caveat:wght@400;700&family=Luckiest+Guy&family=Lilita+One&display=swap";
    document.head.appendChild(link);
  }, []);

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
    // Cover is always first — block drag/drop at position 0
    if (dragIndex === 0 || toIndex === 0) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    // Inside-cover is always at index 1 (left of spread 1) — block moving it or into its slot
    const insideCoverIdx = pages.findIndex((p) => p.type === "inside-cover");
    if (insideCoverIdx !== -1 && (dragIndex === insideCoverIdx || toIndex === insideCoverIdx)) {
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

  const handleSave = () => {
    const id = `profile_${Date.now()}`;
    saveProfile({
      id,
      name: storyTitle || "Untitled Story",
      savedAt: new Date().toISOString(),
      profileId: getActiveProfileId() ?? undefined,
      storyData: {
        pages,
        storyTitle,
      },
    });
    navigate("/profiles");
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
                      {(["cover", "inside-cover", "inside-back-cover", "back-cover"] as PageType[])
                        .filter((t) => !structuralExists(t))
                        .map((t) => {
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
  const isWrite = currentPage.type === "write" || currentPage.type === "inside-cover";
  const pageMeta = PAGE_META[currentPage.type];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal/10 via-yellow/10 to-pink/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {!isPreview ? (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-end mb-6">
              <div className="flex gap-2">
                <div className="relative group">
                  <Button
                    onClick={handleSave}
                    variant="outline"
                    className="w-10 h-10 rounded-full p-0 border-indigo-400 text-indigo-500 hover:bg-indigo-500 hover:text-white"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-foreground/90 text-background rounded-md px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Save
                  </span>
                </div>
                <div className="relative group">
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="w-10 h-10 rounded-full p-0 border-orange text-orange hover:bg-orange hover:text-white"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-foreground/90 text-background rounded-md px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Print
                  </span>
                </div>
                <div className="relative group">
                  <Button
                    onClick={() => setIsPreview(true)}
                    variant="outline"
                    className="w-10 h-10 rounded-full p-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-foreground/90 text-background rounded-md px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Preview
                  </span>
                </div>
              </div>
            </div>

            {/* Editor area */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground shrink-0">
                  <pageMeta.Icon className={cn("h-8 w-8", pageMeta.textColor)} strokeWidth={1.5} />
                  <span className={pageMeta.textColor}>{pageMeta.label}</span>
                  <span>·</span>
                  <span>Page {currentPageIndex + 1} of {pages.length}</span>
                </div>
                <input
                  type="text"
                  placeholder="Story title..."
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-0 border-b border-dashed border-border/50 focus:border-primary focus:outline-none placeholder:text-muted-foreground/40 text-foreground py-0.5 transition-colors text-right"
                />
              </div>
              {isWrite ? (
                <div className="flex flex-col gap-2">
                  {/* Alignment toolbar — only for inside cover */}
                  {currentPage.type === "inside-cover" && (
                    <div className="flex items-center gap-1">
                      {([
                        { align: "left",   Icon: AlignLeft   },
                        { align: "center", Icon: AlignCenter },
                        { align: "right",  Icon: AlignRight  },
                      ] as const).map(({ align, Icon }) => (
                        <button
                          key={align}
                          onClick={() =>
                            setPages((prev) =>
                              prev.map((p, i) =>
                                i === currentPageIndex ? { ...p, textAlign: align } : p
                              )
                            )
                          }
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            (currentPage.textAlign ?? "left") === align
                              ? "bg-teal/10 text-teal"
                              : "text-muted-foreground hover:text-teal"
                          )}
                          title={`Align ${align}`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  )}
                  <Textarea
                    value={currentPage.text}
                    onChange={(e) => updatePageText(e.target.value)}
                    placeholder="Once upon a time..."
                    style={{ textAlign: currentPage.type === "inside-cover" ? (currentPage.textAlign ?? "left") : undefined }}
                    className="min-h-[400px] text-lg border-2 border-border rounded-2xl resize-none focus-visible:ring-2 focus-visible:ring-teal"
                  />
                </div>
              ) : (
                <>
                  {/* Cover page toolbar */}
                  {currentPage.type === "cover" && (
                    <div className="flex items-center gap-2 mb-4">
                      {/* Add Text toggle */}
                      <button
                        onClick={() => { setTextToolActive((v) => !v); setShowBgMenu(false); }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors",
                          textToolActive
                            ? "bg-yellow/20 border-yellow text-orange"
                            : "border-border bg-white text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <Type className="h-4 w-4" />
                        {textToolActive ? "Click canvas to place…" : "Add Text"}
                      </button>

                      {/* Add Background */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setTextToolActive(false);
                            if (!showBgMenu) setBgMenuTab(currentPage.background?.kind ?? "solid" as "solid" | "gradient" | "watercolor" | "image");
                            setShowBgMenu((v) => !v);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors",
                            showBgMenu || currentPage.background
                              ? "bg-yellow/20 border-yellow text-orange"
                              : "border-border bg-white text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          <Layers className="h-4 w-4" />
                          Add Background
                        </button>

                        {showBgMenu && (
                          <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-border p-3 z-40 w-64">
                            {/* Tab row */}
                            <div className="flex gap-1 mb-3">
                              {(["solid", "gradient", "watercolor", "image"] as const).map((tab) => (
                                <button
                                  key={tab}
                                  onClick={() => setBgMenuTab(tab)}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors",
                                    bgMenuTab === tab
                                      ? "bg-yellow/30 text-orange border border-yellow/60"
                                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                                  )}
                                >
                                  {tab === "solid" ? "Solid" : tab === "gradient" ? "Gradient" : tab === "watercolor" ? "Watercolour" : "Image"}
                                </button>
                              ))}
                            </div>

                            {/* Solid */}
                            {bgMenuTab === "solid" && (
                              <>
                                <div className="grid grid-cols-6 gap-1.5 px-3">
                                  {BG_PALETTE.map((c) => (
                                    <button
                                      key={c}
                                      style={{ background: c }}
                                      onClick={() => updateBackground({
                                        kind: "solid",
                                        color: c,
                                        opacity: currentPage.background?.kind === "solid"
                                          ? currentPage.background.opacity
                                          : 100,
                                      })}
                                      className={cn(
                                        "w-8 h-8 rounded-full transition-transform hover:scale-110",
                                        currentPage.background?.kind === "solid" && currentPage.background.color === c
                                          ? "scale-110 ring-2 ring-offset-1 ring-foreground/50"
                                          : ""
                                      )}
                                    />
                                  ))}
                                </div>
                                {currentPage.background?.kind === "solid" && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground font-semibold w-10 shrink-0">Opacity</span>
                                    <input
                                      type="range"
                                      min={10}
                                      max={100}
                                      step={5}
                                      value={currentPage.background.opacity ?? 100}
                                      onChange={(e) => {
                                        if (currentPage.background?.kind === "solid") {
                                          updateBackground({ ...currentPage.background, opacity: Number(e.target.value) });
                                        }
                                      }}
                                      className="flex-1 h-1.5 accent-neutral cursor-pointer"
                                    />
                                    <span className="text-[10px] text-muted-foreground font-semibold w-7 text-right shrink-0">
                                      {currentPage.background.opacity ?? 100}%
                                    </span>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Gradient */}
                            {bgMenuTab === "gradient" && (
                              <div className="grid grid-cols-6 gap-1.5 px-3">
                                {GRADIENT_PRESETS.map((g) => (
                                  <button
                                    key={g.css}
                                    title={g.label}
                                    style={{ background: g.css }}
                                    onClick={() => updateBackground({ kind: "gradient", css: g.css })}
                                    className={cn(
                                      "w-8 h-8 rounded-full transition-transform hover:scale-110",
                                      currentPage.background?.kind === "gradient" && currentPage.background.css === g.css
                                        ? "scale-110 ring-2 ring-offset-1 ring-foreground/50"
                                        : ""
                                    )}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Watercolour */}
                            {bgMenuTab === "watercolor" && (
                              <>
                                {currentPage.background?.kind === "watercolor" && (
                                  <div
                                    className="w-full h-10 rounded-lg mb-2.5"
                                    style={{ background: getCoverBgStyle(currentPage.background) }}
                                  />
                                )}
                                <div className="grid grid-cols-6 gap-1.5 px-3">
                                  {BG_PALETTE.map((c) => (
                                    <button
                                      key={c}
                                      style={{ background: getCoverBgStyle({ kind: "watercolor", color: c }) }}
                                      onClick={() => updateBackground({ kind: "watercolor", color: c })}
                                      className={cn(
                                        "w-8 h-8 rounded-full transition-transform hover:scale-110",
                                        currentPage.background?.kind === "watercolor" && currentPage.background.color === c
                                          ? "scale-110 ring-2 ring-offset-1 ring-foreground/50"
                                          : ""
                                      )}
                                    />
                                  ))}
                                </div>
                              </>
                            )}

                            {/* Image upload */}
                            {bgMenuTab === "image" && (
                              <div className="flex flex-col gap-2">
                                <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-muted/20 transition-colors">
                                  <Upload className="h-6 w-6 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground font-medium text-center">Click to upload image</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        const url = ev.target?.result as string;
                                        updateBackground({ kind: "image", url });
                                        setShowBgMenu(false);
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                  />
                                </label>
                                {currentPage.background?.kind === "image" && (
                                  <div
                                    className="w-full h-16 rounded-xl bg-cover bg-center border border-border"
                                    style={{ backgroundImage: `url(${currentPage.background.url})` }}
                                  />
                                )}
                              </div>
                            )}

                            {/* Remove */}
                            {currentPage.background && (
                              <button
                                onClick={() => { updateBackground(undefined); setShowBgMenu(false); }}
                                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove background
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Canvas + optional text overlay */}
                  <div className="relative" ref={canvasContainerRef}>
                    <DrawingCanvas
                      pageId={currentPage.id}
                      initialImage={currentPage.drawing}
                      stamps={stamps}
                      stampsLoading={stampsLoading}
                      storyText={currentPage.text}
                      backgroundStyle={getCoverBgStyle(currentPage.background)}
                      onDrawingChange={(dataUrl) =>
                        setPages((prev) => {
                          const next = [...prev];
                          next[currentPageIndex] = { ...next[currentPageIndex], drawing: dataUrl };
                          return next;
                        })
                      }
                    />

                    {currentPage.type === "cover" && (
                      <div
                        className={cn(
                          "absolute inset-0 overflow-hidden",
                          textToolActive ? "cursor-crosshair" : "pointer-events-none"
                        )}
                        onClick={(e) => {
                          if (!textToolActive) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const id = Date.now().toString();
                          setPages((prev) => {
                            const next = [...prev];
                            const page = next[currentPageIndex];
                            next[currentPageIndex] = {
                              ...page,
                              textBoxes: [
                                ...(page.textBoxes ?? []),
                                { id, x: e.clientX - rect.left, y: e.clientY - rect.top, text: "" },
                              ],
                            };
                            return next;
                          });
                          setNewTextBoxId(id);
                          setTextToolActive(false);
                        }}
                      >
                        {(currentPage.textBoxes ?? []).map((tb) => (
                          <div
                            key={tb.id}
                            style={{ position: "absolute", left: tb.x, top: tb.y, pointerEvents: "auto" }}
                            className="group cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => {
                              // If clicking directly on the input, don't prevent default so the
                              // browser sets the cursor position naturally. For all other areas,
                              // prevent default to avoid text-selection side-effects.
                              const isInput = (e.target as HTMLElement).tagName === "INPUT";
                              if (!isInput) e.preventDefault();
                              e.stopPropagation();

                              const startX = e.clientX;
                              const startY = e.clientY;
                              const origX = tb.x;
                              const origY = tb.y;
                              const id = tb.id;
                              let hasDragged = false;

                              // Use offsetWidth/offsetHeight (CSS layout px) — these are unaffected
                              // by viewport scroll, ancestor transforms, or absolutely-positioned
                              // overflow children (e.g. the font picker above the box).
                              const containerEl = canvasContainerRef.current;
                              const boxEl = e.currentTarget as HTMLElement;
                              const containerW = containerEl?.offsetWidth  ?? Infinity;
                              const containerH = containerEl?.offsetHeight ?? Infinity;
                              const boxW = boxEl.offsetWidth;
                              const boxH = boxEl.offsetHeight;
                              const maxX = Math.max(0, containerW - boxW);
                              const maxY = Math.max(0, containerH - boxH);

                              const onMove = (ev: MouseEvent) => {
                                const dx = ev.clientX - startX;
                                const dy = ev.clientY - startY;
                                // Only commit to drag once the pointer has moved past the threshold
                                if (!hasDragged && Math.hypot(dx, dy) < 5) return;
                                if (!hasDragged) {
                                  hasDragged = true;
                                  document.body.style.userSelect = "none";
                                }
                                const clampedX = Math.max(0, Math.min(origX + dx, maxX));
                                const clampedY = Math.max(0, Math.min(origY + dy, maxY));
                                setPages((prev) => {
                                  const next = [...prev];
                                  const page = next[currentPageIndex];
                                  next[currentPageIndex] = {
                                    ...page,
                                    textBoxes: (page.textBoxes ?? []).map((t) =>
                                      t.id === id ? { ...t, x: clampedX, y: clampedY } : t
                                    ),
                                  };
                                  return next;
                                });
                              };

                              const onUp = () => {
                                document.body.style.userSelect = "";
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                              };

                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
                            }}
                          >
                            {/* Font picker — floats below the box on hover */}
                            <div className="absolute top-full left-0 mt-1.5 hidden group-hover:flex flex-wrap gap-1 bg-white/95 backdrop-blur-sm rounded-xl px-2 py-1.5 shadow-lg border border-border z-20 max-w-xs">
                              {COVER_FONTS.map((f) => (
                                <button
                                  key={f.name}
                                  style={{ fontFamily: `"${f.name}", sans-serif` }}
                                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPages((prev) => {
                                      const next = [...prev];
                                      const page = next[currentPageIndex];
                                      next[currentPageIndex] = {
                                        ...page,
                                        textBoxes: (page.textBoxes ?? []).map((t) =>
                                          t.id === tb.id ? { ...t, font: f.name } : t
                                        ),
                                      };
                                      return next;
                                    });
                                  }}
                                  className={cn(
                                    "px-2 py-0.5 rounded-lg text-sm transition-colors whitespace-nowrap",
                                    tb.font === f.name
                                      ? "bg-yellow/40 text-foreground ring-1 ring-yellow"
                                      : "text-foreground hover:bg-muted/60"
                                  )}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>

                            <div className="border-2 border-dashed border-yellow/60 hover:border-yellow rounded-lg p-1.5 relative">
                              <input
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus={tb.id === newTextBoxId}
                                value={tb.text}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPages((prev) => {
                                    const next = [...prev];
                                    const page = next[currentPageIndex];
                                    next[currentPageIndex] = {
                                      ...page,
                                      textBoxes: (page.textBoxes ?? []).map((t) =>
                                        t.id === tb.id ? { ...t, text: val } : t
                                      ),
                                    };
                                    return next;
                                  });
                                }}
                                onFocus={() => setNewTextBoxId(null)}
                                placeholder="Type here…"
                                className="bg-transparent border-none outline-none text-white text-xl cursor-text min-w-[80px] [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]"
                                style={{
                                  width: Math.max(80, tb.text.length * 14 + 40) + "px",
                                  fontFamily: tb.font ? `"${tb.font}", sans-serif` : undefined,
                                }}
                              />
                              {/* Delete button */}
                              <button
                                className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-neutral/80 text-white text-[10px] font-bold hidden group-hover:flex items-center justify-center z-10 hover:bg-neutral leading-none"
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPages((prev) => {
                                    const next = [...prev];
                                    const page = next[currentPageIndex];
                                    next[currentPageIndex] = {
                                      ...page,
                                      textBoxes: (page.textBoxes ?? []).filter((t) => t.id !== tb.id),
                                    };
                                    return next;
                                  });
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
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
                <div className="relative group">
                  <button
                    onClick={() => { setShowAddMenu((v) => !v); setShowStructureSection(false); }}
                    className="w-8 h-8 rounded-full bg-lime hover:bg-lime/90 flex items-center justify-center text-foreground shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-foreground/90 text-background rounded-md px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Add page
                  </span>
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
                          {(["cover", "inside-cover", "inside-back-cover", "back-cover"] as PageType[])
                            .filter((t) => !structuralExists(t))
                            .map((t) => {
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
                <div className="relative group">
                  <button
                    onClick={() => setViewAll(true)}
                    className="w-8 h-8 rounded-full border-2 border-lime bg-white hover:bg-lime flex items-center justify-center transition-colors"
                  >
                    <LayoutGrid className="h-4 w-4 text-lime group-hover:text-foreground transition-colors" />
                  </button>
                  <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-foreground/90 text-background rounded-md px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    View all pages
                  </span>
                </div>
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

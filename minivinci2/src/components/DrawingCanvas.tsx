import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Trash2, Brush, Droplet, SprayCan, Highlighter, Pencil, Undo2, Redo2, Camera, ImagePlus, Sparkles, Loader2, MousePointer, Circle, Square, Triangle, Star, Heart, Diamond, Hexagon, Pentagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorWheel } from "./ColorWheel";
import { AnimalPicker } from "./AnimalPicker";
import type { Stamp } from "./AnimalPicker";
import { PhotoPlacer } from "./PhotoPlacer";
import { CameraCapture } from "./CameraCapture";
import { generateImage } from "@/lib/stabilityAI";
import { toast } from "sonner";

const COLORS = [
  { name: "Teal", value: "#66CC99" },
  { name: "Cyan", value: "#66CCCC" },
  { name: "Sky Blue", value: "#66BBFF" },
  { name: "Blue", value: "#6699FF" },
  { name: "Indigo", value: "#6666CC" },
  { name: "Purple", value: "#9966CC" },
  { name: "Violet", value: "#CC66CC" },
  { name: "Magenta", value: "#FF66CC" },
  { name: "Pink", value: "#FF6699" },
  { name: "Rose", value: "#FF3366" },
  { name: "Red", value: "#FF3333" },
  { name: "Orange Red", value: "#FF6633" },
  { name: "Orange", value: "#FF9933" },
  { name: "Yellow Orange", value: "#FFBB33" },
  { name: "Yellow", value: "#FFCC33" },
  { name: "Yellow Green", value: "#CCCC66" },
  { name: "Lime", value: "#99CC66" },
  { name: "Green", value: "#66CC66" },
];

const BRUSH_SIZES = [2, 5, 10, 20];

const BRUSH_TYPES = [
  { name: "Regular", value: "regular", icon: Brush },
  { name: "Watercolor", value: "watercolor", icon: Droplet },
  { name: "Spray Paint", value: "spray", icon: SprayCan },
  { name: "Marker", value: "marker", icon: Highlighter },
  { name: "Pencil", value: "pencil", icon: Pencil },
] as const;

type BrushType = typeof BRUSH_TYPES[number]["value"];

const SHAPES = [
  { name: "circle",   label: "Circle",   Icon: Circle   },
  { name: "square",   label: "Square",   Icon: Square   },
  { name: "triangle", label: "Triangle", Icon: Triangle },
  { name: "star",     label: "Star",     Icon: Star     },
  { name: "heart",    label: "Heart",    Icon: Heart    },
  { name: "diamond",  label: "Diamond",  Icon: Diamond  },
  { name: "hexagon",  label: "Hexagon",  Icon: Hexagon  },
  { name: "pentagon", label: "Pentagon", Icon: Pentagon },
] as const;
type ShapeName = typeof SHAPES[number]["name"];

interface DrawingCanvasProps {
  pageId: string;
  initialImage?: string;
  stamps?: Stamp[];
  stampsLoading?: boolean;
  storyText?: string;
  onDrawingChange?: (dataUrl: string) => void;
  backgroundStyle?: string; // overrides the default paper-texture CSS background
}

export const DrawingCanvas = ({ pageId, initialImage, stamps = [], stampsLoading = false, storyText = "", onDrawingChange, backgroundStyle }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [brushType, setBrushType] = useState<BrushType>("regular");
  const [selectedAnimal, setSelectedAnimal] = useState<{name: string, image: string} | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedShape, setSelectedShape] = useState<ShapeName | null>(null);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [floatingSelection, setFloatingSelection] = useState<{ x: number; y: number; w: number; h: number; dataUrl: string } | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const drawingSelRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const isDrawingSelRef = useRef(false);
  const selDragRef = useRef<{ startMouseX: number; startMouseY: number; startSelX: number; startSelY: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = 700;
    // Canvas starts transparent; CSS background provides the white appearance
    saveToHistory();
  }, [pageId]);

  // Draw AI-generated image onto canvas as base layer
  useEffect(() => {
    if (!initialImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL();
      setHistory([dataUrl]);
      setHistoryStep(0);
    };
    img.src = initialImage;
  }, [initialImage]);

  // Window-level listeners for dragging a floating selection
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const d = selDragRef.current;
      if (!d) return;
      const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
      const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
      setFloatingSelection(prev =>
        prev ? { ...prev, x: d.startSelX + cx - d.startMouseX, y: d.startSelY + cy - d.startMouseY } : null
      );
    };
    const onUp = () => { selDragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    onDrawingChange?.(dataUrl);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectMode) {
      if (!floatingSelection) {
        const r = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        drawingSelRef.current = { startX: x, startY: y, endX: x, endY: y };
        setSelectionRect({ ...drawingSelRef.current });
        isDrawingSelRef.current = true;
      }
      return;
    }
    if (selectedAnimal) {
      stampAnimal(e);
    } else if (selectedShape) {
      stampShape(e);
    } else {
      setIsDrawing(true);
      draw(e);
    }
  };

  const stampAnimal = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedAnimal) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const img = new Image();
    img.onload = () => {
      const size = brushSize * 15;

      const tmp = document.createElement("canvas");
      tmp.width = size;
      tmp.height = size;
      const tmpCtx = tmp.getContext("2d");
      if (!tmpCtx) return;

      tmpCtx.drawImage(img, 0, 0, size, size);

      // Remove white/near-white background pixels
      const imageData = tmpCtx.getImageData(0, 0, size, size);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (r >= 230 && g >= 230 && b >= 230) {
          // Fade alpha proportionally so edges blend softly
          const whiteness = (r + g + b) / 3;
          d[i + 3] = Math.round(255 * Math.max(0, (230 - whiteness + 25) / 25));
        }
      }
      tmpCtx.putImageData(imageData, 0, 0);

      ctx.drawImage(tmp, x - size / 2, y - size / 2);
      saveToHistory();
    };
    img.onerror = () => {
      setSelectedAnimal(null);
    };
    img.src = selectedAnimal.image;
  };

  const stampShape = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedShape) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = brushSize * 8;

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();

    switch (selectedShape) {
      case "circle":
        ctx.arc(x, y, r, 0, Math.PI * 2);
        break;
      case "square":
        ctx.rect(x - r, y - r, r * 2, r * 2);
        break;
      case "triangle":
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r * Math.cos(Math.PI / 6), y + r / 2);
        ctx.lineTo(x - r * Math.cos(Math.PI / 6), y + r / 2);
        ctx.closePath();
        break;
      case "star": {
        const inner = r * 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const rad = i % 2 === 0 ? r : inner;
          if (i === 0) ctx.moveTo(x + rad * Math.cos(angle), y + rad * Math.sin(angle));
          else ctx.lineTo(x + rad * Math.cos(angle), y + rad * Math.sin(angle));
        }
        ctx.closePath();
        break;
      }
      case "heart":
        ctx.moveTo(x, y + r * 0.6);
        ctx.bezierCurveTo(x, y + r * 0.1, x - r, y - r * 0.2, x - r, y - r * 0.45);
        ctx.bezierCurveTo(x - r, y - r, x - r * 0.1, y - r, x, y - r * 0.4);
        ctx.bezierCurveTo(x + r * 0.1, y - r, x + r, y - r, x + r, y - r * 0.45);
        ctx.bezierCurveTo(x + r, y - r * 0.2, x, y + r * 0.1, x, y + r * 0.6);
        ctx.closePath();
        break;
      case "diamond":
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r * 0.6, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r * 0.6, y);
        ctx.closePath();
        break;
      case "hexagon":
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
          else ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
        }
        ctx.closePath();
        break;
      case "pentagon":
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
          else ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
        }
        ctx.closePath();
        break;
    }

    ctx.fill();
    ctx.restore();
    saveToHistory();
  };

  const stopDrawing = () => {
    if (selectMode) {
      if (isDrawingSelRef.current && drawingSelRef.current) {
        isDrawingSelRef.current = false;
        const { startX, startY, endX, endY } = drawingSelRef.current;
        drawingSelRef.current = null;
        captureSelection(startX, startY, endX, endY);
      }
      return;
    }
    if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
  };

  const captureSelection = (startX: number, startY: number, endX: number, endY: number) => {
    const x = Math.round(Math.min(startX, endX));
    const y = Math.round(Math.min(startY, endY));
    const w = Math.round(Math.abs(endX - startX));
    const h = Math.round(Math.abs(endY - startY));
    if (w < 5 || h < 5) { setSelectionRect(null); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    tmp.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    ctx.clearRect(x, y, w, h);
    setSelectionRect(null);
    setFloatingSelection({ x, y, w, h, dataUrl: tmp.toDataURL() });
  };

  const commitFloatingSelection = () => {
    if (!floatingSelection) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    const snap = floatingSelection;
    img.onload = () => {
      ctx.drawImage(img, snap.x, snap.y, snap.w, snap.h);
      saveToHistory();
    };
    img.src = snap.dataUrl;
    setFloatingSelection(null);
  };

  const drawWatercolor = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const layers = 3;
    const baseSize = brushSize;
    
    for (let i = 0; i < layers; i++) {
      const offset = (Math.random() - 0.5) * baseSize * 0.3;
      const offsetX = x + offset;
      const offsetY = y + offset;
      
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = baseSize * (1 + i * 0.3);
      ctx.strokeStyle = isEraser ? "#fdfcf8" : color;
      
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }
    
    ctx.globalAlpha = 1;
  };

  const drawSpray = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const density = brushSize * 2;
    const radius = brushSize * 3;
    
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const offsetX = x + Math.cos(angle) * distance;
      const offsetY = y + Math.sin(angle) * distance;
      
      ctx.fillStyle = isEraser ? "#fdfcf8" : color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(offsetX, offsetY, 1, 1);
    }
    
    ctx.globalAlpha = 1;
  };

  const drawMarker = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.lineWidth = brushSize * 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isEraser ? "#fdfcf8" : color;
    ctx.globalAlpha = 0.7;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    ctx.globalAlpha = 1;
  };

  const drawPencil = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const grain = 3;
    
    for (let i = 0; i < grain; i++) {
      const offsetX = x + (Math.random() - 0.5) * brushSize * 0.5;
      const offsetY = y + (Math.random() - 0.5) * brushSize * 0.5;
      
      ctx.lineWidth = Math.max(1, brushSize * 0.4);
      ctx.lineCap = "round";
      ctx.strokeStyle = isEraser ? "#fdfcf8" : color;
      ctx.globalAlpha = 0.4;
      
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }
    
    ctx.globalAlpha = 1;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectMode) {
      if (isDrawingSelRef.current && drawingSelRef.current) {
        const r = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        drawingSelRef.current = { ...drawingSelRef.current, endX: x, endY: y };
        setSelectionRect({ ...drawingSelRef.current });
      }
      return;
    }
    if (!isDrawing && e.type !== "mousedown") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!isEraser) {
      switch (brushType) {
        case "watercolor":
          drawWatercolor(ctx, x, y);
          break;
        case "spray":
          drawSpray(ctx, x, y);
          break;
        case "marker":
          drawMarker(ctx, x, y);
          break;
        case "pencil":
          drawPencil(ctx, x, y);
          break;
        default:
          ctx.lineWidth = brushSize;
          ctx.lineCap = "round";
          ctx.strokeStyle = color;
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y);
      }
    } else {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.restore();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const undo = () => {
    if (historyStep <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newStep = historyStep - 1;
    setHistoryStep(newStep);

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[newStep];
  };

  const redo = () => {
    if (historyStep >= history.length - 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newStep = historyStep + 1;
    setHistoryStep(newStep);

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[newStep];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePhotoCommit = (
    img: HTMLImageElement,
    src: { x: number; y: number; w: number; h: number },
    dst: { x: number; y: number; w: number; h: number }
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, src.x, src.y, src.w, src.h, dst.x, dst.y, dst.w, dst.h);
    saveToHistory();
    setPhotoDataUrl(null);
  };

  const handleGenerateImage = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const prompt = storyText.trim() || "a cheerful colorful children's book scene";
      const dataUrl = await generateImage(prompt);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        // Black bars (letterbox / pillarbox) — never stretch
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = canvas.width / canvas.height;
        let dw, dh, dx, dy;
        if (imgAspect > canvasAspect) {
          dw = canvas.width; dh = canvas.width / imgAspect;
          dx = 0; dy = (canvas.height - dh) / 2;
        } else {
          dh = canvas.height; dw = canvas.height * imgAspect;
          dx = (canvas.width - dw) / 2; dy = 0;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        saveToHistory();
      };
      img.src = dataUrl;
    } catch {
      toast.error("Could not generate illustration. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex gap-6 items-start">
      {/* Left side - Canvas and tools */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="text-sm text-muted-foreground text-center">
          <Brush className="inline-block mr-2 h-4 w-4" />
          Click and drag to draw on your page!
        </div>

        {/* Canvas */}
        <div className="border-4 border-dashed border-primary/30 rounded-2xl p-2 bg-muted/30 flex-1">
          {/* relative wrapper so PhotoPlacer can overlay the canvas exactly */}
          <div className="relative rounded-xl overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseMove={draw}
              onMouseLeave={stopDrawing}
              className={cn(
                "w-full block rounded-xl shadow-inner",
                selectedAnimal ? "cursor-pointer" : selectMode ? "cursor-crosshair" : "cursor-crosshair"
              )}
              style={{
                touchAction: "none",
                background: backgroundStyle ?? `
                  linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent),
                  linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent),
                  linear-gradient(90deg, transparent, rgba(230, 230, 220, 0.3) 50%, transparent),
                  linear-gradient(0deg, transparent, rgba(240, 240, 235, 0.2) 50%, transparent),
                  #fdfcf8
                `,
                backgroundSize: backgroundStyle ? "cover" : "50px 50px, 50px 50px, 100% 100%, 100% 100%",
              }}
            />
            {/* Selection: drawing rect */}
            {selectMode && selectionRect && (() => {
              const x = Math.min(selectionRect.startX, selectionRect.endX);
              const y = Math.min(selectionRect.startY, selectionRect.endY);
              const w = Math.abs(selectionRect.endX - selectionRect.startX);
              const h = Math.abs(selectionRect.endY - selectionRect.startY);
              return (
                <div
                  className="absolute pointer-events-none border-2 border-dashed border-primary"
                  style={{ left: x, top: y, width: w, height: h, background: "rgba(99,102,241,0.06)" }}
                />
              );
            })()}

            {/* Selection: floating element — commit on backdrop click, drag to move */}
            {selectMode && floatingSelection && (
              <>
                <div className="absolute inset-0 z-10" style={{ cursor: "default" }} onClick={commitFloatingSelection} />
                <div
                  className="absolute z-20 select-none"
                  style={{ left: floatingSelection.x, top: floatingSelection.y, width: floatingSelection.w, height: floatingSelection.h, cursor: "grab", touchAction: "none" }}
                  onMouseDown={(e) => { e.stopPropagation(); selDragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startSelX: floatingSelection.x, startSelY: floatingSelection.y }; }}
                  onTouchStart={(e) => { e.stopPropagation(); selDragRef.current = { startMouseX: e.touches[0].clientX, startMouseY: e.touches[0].clientY, startSelX: floatingSelection.x, startSelY: floatingSelection.y }; }}
                >
                  <img src={floatingSelection.dataUrl} style={{ width: "100%", height: "100%", display: "block" }} draggable={false} />
                  <div className="absolute inset-0 border-2 border-dashed border-primary pointer-events-none" />
                </div>
              </>
            )}

            {photoDataUrl && canvasRef.current && (
              <PhotoPlacer
                image={photoDataUrl}
                canvasWidth={canvasRef.current.width}
                canvasHeight={canvasRef.current.height}
                onCommit={handlePhotoCommit}
                onCancel={() => setPhotoDataUrl(null)}
              />
            )}
          </div>
        </div>

        {/* Hidden file input for gallery uploads */}
        <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        {/* Camera capture modal */}
        {showCamera && (
          <CameraCapture
            onCapture={(dataUrl) => { setPhotoDataUrl(dataUrl); setShowCamera(false); }}
            onCancel={() => setShowCamera(false)}
          />
        )}
      </div>

      {/* Right side - Brush, Size, and Color Wheel */}
      <div className="flex flex-col gap-6">
        {/* Brush Types */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-center">Brush</span>
          <div className="flex gap-2 flex-wrap justify-center">
            {BRUSH_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                   onClick={() => {
                     setBrushType(type.value);
                     setIsEraser(false);
                     setSelectedAnimal(null);
                     if (selectMode) { commitFloatingSelection(); setSelectMode(false); }
                   }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 border-2",
                    brushType === type.value
                      ? "border-teal bg-teal/10 text-teal shadow-lg"
                      : "border-border bg-background text-foreground"
                  )}
                  title={type.name}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Brush Sizes */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-center">Size: {brushSize}px</span>
          <div className="flex gap-2 justify-center flex-wrap">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110",
                  brushSize === size
                    ? "border-primary bg-primary/10"
                    : "border-border"
                )}
              >
                <div
                  className="rounded-full bg-foreground"
                  style={{
                    width: Math.min(size * 2, 20),
                    height: Math.min(size * 2, 20),
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Select / Eraser / Undo / Redo */}
        <div className="flex gap-2 justify-center flex-wrap">
          <Button
            onClick={() => {
              const next = !selectMode;
              if (!next) commitFloatingSelection();
              setSelectMode(next);
              if (next) { setIsEraser(false); setSelectedAnimal(null); }
            }}
            variant={selectMode ? "default" : "outline"}
            className="rounded-full"
          >
            <MousePointer className="mr-2 h-5 w-5" />
            Select
          </Button>
          <Button
            onClick={() => {
              if (selectMode) { commitFloatingSelection(); setSelectMode(false); }
              setIsEraser(!isEraser);
              setSelectedAnimal(null);
            }}
            variant={isEraser ? "default" : "outline"}
            className="rounded-full"
          >
            <Eraser className="mr-2 h-5 w-5" />
            Eraser
          </Button>
          <Button
            onClick={undo}
            disabled={historyStep <= 0}
            variant="outline"
            size="icon"
            className="rounded-full"
            title="Undo"
          >
            <Undo2 className="h-5 w-5" />
          </Button>
          <Button
            onClick={redo}
            disabled={historyStep >= history.length - 1}
            variant="outline"
            size="icon"
            className="rounded-full"
            title="Redo"
          >
            <Redo2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Photo upload / camera */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-center">Photo</span>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-border bg-background hover:border-primary hover:bg-primary/10 transition-all hover:scale-110"
              title="Upload photo"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowCamera(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-border bg-background hover:border-primary hover:bg-primary/10 transition-all hover:scale-110"
              title="Take photo"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stamp Picker */}
        <AnimalPicker
          selectedAnimal={selectedAnimal?.name || null}
          onSelectAnimal={(animal) => {
            setSelectedAnimal(animal);
            if (animal) {
              setIsEraser(false);
              if (selectMode) { commitFloatingSelection(); setSelectMode(false); }
            }
          }}
          stamps={stamps}
          loading={stampsLoading}
        />

        {/* Shape Selector */}
        <div className="flex flex-col gap-2">
          <div className="relative flex justify-center">
            <button
              title={selectedShape ? SHAPES.find(s => s.name === selectedShape)?.label : "Shapes"}
              onClick={() => setShowShapePicker(v => !v)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110",
                selectedShape
                  ? "border-primary bg-primary/10 text-primary scale-110"
                  : "border-border bg-background hover:border-primary hover:bg-primary/10"
              )}
            >
              {(() => { const S = selectedShape ? SHAPES.find(s => s.name === selectedShape) : SHAPES[0]; return S ? <S.Icon className="h-4 w-4" /> : null; })()}
            </button>
            {showShapePicker && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-border p-2 z-50">
                <div className="grid grid-cols-4 gap-1.5">
                  {SHAPES.map((shape) => (
                    <button
                      key={shape.name}
                      title={shape.label}
                      onClick={() => {
                        const next = selectedShape === shape.name ? null : shape.name;
                        setSelectedShape(next);
                        setShowShapePicker(false);
                        if (next) { setSelectedAnimal(null); setIsEraser(false); if (selectMode) { commitFloatingSelection(); setSelectMode(false); } }
                      }}
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110",
                        selectedShape === shape.name
                          ? "border-primary bg-primary/10 text-primary scale-110"
                          : "border-border bg-background hover:border-primary hover:bg-primary/10"
                      )}
                    >
                      <shape.Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Color Wheel */}
        <ColorWheel
          colors={COLORS}
          selectedColor={color}
          onColorSelect={(newColor) => {
            setColor(newColor);
            setIsEraser(false);
          }}
        />

        {/* Clear Button */}
        <div className="flex justify-center">
          <Button
            onClick={clearCanvas}
            variant="outline"
            className="rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="mr-2 h-5 w-5" />
            Clear
          </Button>
        </div>

        {/* AI illustration — small button, 1/4 the footprint of Clear */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerateImage}
            disabled={isGenerating}
            title="Generate illustration from story"
            className="w-8 h-8 rounded-full flex items-center justify-center border border-border/60 bg-background text-muted-foreground hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50 transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

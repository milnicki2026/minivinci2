import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Trash2, Brush, Droplet, SprayCan, Highlighter, Pencil, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorWheel } from "./ColorWheel";
import { AnimalPicker } from "./AnimalPicker";

const COLORS = [
  { name: "Red", value: "#FF3333" },
  { name: "Orange Red", value: "#FF6633" },
  { name: "Orange", value: "#FF9933" },
  { name: "Yellow Orange", value: "#FFBB33" },
  { name: "Yellow", value: "#FFCC33" },
  { name: "Yellow Green", value: "#CCCC66" },
  { name: "Lime", value: "#99CC66" },
  { name: "Green", value: "#66CC66" },
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

interface DrawingCanvasProps {
  pageId: string;
  initialImage?: string;
}

export const DrawingCanvas = ({ pageId, initialImage }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [brushType, setBrushType] = useState<BrushType>("regular");
  const [selectedAnimal, setSelectedAnimal] = useState<{name: string, image: string} | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = 700;

    ctx.fillStyle = "#fdfcf8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
      ctx.fillStyle = "#fdfcf8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL();
      setHistory([dataUrl]);
      setHistoryStep(0);
    };
    img.src = initialImage;
  }, [initialImage]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedAnimal) {
      stampAnimal(e);
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

    // Create an image element from the animal SVG
    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      const size = brushSize * 15;
      tempCanvas.width = size;
      tempCanvas.height = size;

      // Draw the SVG image
      tempCtx.drawImage(img, 0, 0, size, size);

      // Apply color tint to the black silhouette
      const imageData = tempCtx.getImageData(0, 0, size, size);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        
        if (alpha > 0) {
          // Replace black with selected color
          data[i] = parseInt(color.slice(1, 3), 16);
          data[i + 1] = parseInt(color.slice(3, 5), 16);
          data[i + 2] = parseInt(color.slice(5, 7), 16);
        }
      }

      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, x - size / 2, y - size / 2);
      saveToHistory();
    };
    img.src = selectedAnimal.image;
  };

  const stopDrawing = () => {
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
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#fdfcf8";
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#fdfcf8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onMouseLeave={stopDrawing}
            className={cn(
              "w-full rounded-xl shadow-inner",
              selectedAnimal ? "cursor-pointer" : "cursor-crosshair"
            )}
            style={{ 
              touchAction: "none",
              background: `
                linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent, rgba(230, 230, 220, 0.3) 50%, transparent),
                linear-gradient(0deg, transparent, rgba(240, 240, 235, 0.2) 50%, transparent),
                #fdfcf8
              `,
              backgroundSize: '50px 50px, 50px 50px, 100% 100%, 100% 100%'
            }}
          />
        </div>
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

        {/* Eraser and Undo/Redo */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => {
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

        {/* Animal Picker */}
        <AnimalPicker
          selectedAnimal={selectedAnimal?.name || null}
          onSelectAnimal={(animal) => {
            setSelectedAnimal(animal);
            if (animal) {
              setIsEraser(false);
            }
          }}
        />

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
      </div>
    </div>
  );
};

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Crop } from "lucide-react";

interface Rect { x: number; y: number; w: number; h: number; }

type DragMode = "photo-move" | "photo-resize" | "crop-handle";
type Handle = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r" | "move";

interface DragState {
  mode: DragMode;
  handle: Handle;
  startX: number; startY: number;
  startPhoto: Rect;
  startCrop: Rect;
}

interface PhotoPlacerProps {
  image: string;          // data URL
  canvasWidth: number;
  canvasHeight: number;
  onCommit: (img: HTMLImageElement, src: Rect, dst: Rect) => void;
  onCancel: () => void;
}

const H = 12;         // handle size px
const HR = H / 2;    // half handle
const MIN = 40;      // min resize px

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export const PhotoPlacer = ({ image, canvasWidth, canvasHeight, onCommit, onCancel }: PhotoPlacerProps) => {
  const imgEl = useRef<HTMLImageElement | null>(null);
  const aspectRef = useRef(1);
  const dragRef = useRef<DragState | null>(null);

  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [cropping, setCropping] = useState(false);

  // Load image and place it centered at 75% of canvas
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgEl.current = img;
      aspectRef.current = img.naturalWidth / img.naturalHeight;
      let w = canvasWidth * 0.75;
      let h = w / aspectRef.current;
      if (h > canvasHeight * 0.75) { h = canvasHeight * 0.75; w = h * aspectRef.current; }
      const r: Rect = {
        x: Math.round((canvasWidth - w) / 2),
        y: Math.round((canvasHeight - h) / 2),
        w: Math.round(w), h: Math.round(h),
      };
      setPhoto(r);
      setReady(true);
    };
    img.src = image;
  }, []);

  // Register global move/up listeners once
  useEffect(() => {
    const getXY = (e: MouseEvent | TouchEvent) =>
      "touches" in e ? [e.touches[0].clientX, e.touches[0].clientY] : [(e as MouseEvent).clientX, (e as MouseEvent).clientY];

    const onMove = (e: MouseEvent | TouchEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const [cx, cy] = getXY(e);
      const dx = cx - d.startX;
      const dy = cy - d.startY;
      const sp = d.startPhoto;
      const sc = d.startCrop;

      if (d.mode === "photo-move") {
        setPhoto({ ...sp, x: sp.x + dx, y: sp.y + dy });
        return;
      }

      if (d.mode === "photo-resize") {
        const c = d.handle;
        let { x, y } = sp;
        let w = c === "tl" || c === "bl" ? Math.max(MIN, sp.w - dx) : Math.max(MIN, sp.w + dx);
        if (c === "tl" || c === "bl") x = sp.x + sp.w - w;
        const h = w / aspectRef.current;
        if (c === "tl" || c === "tr") y = sp.y + sp.h - h;
        setPhoto({ x, y, w, h });
        return;
      }

      if (d.mode === "crop-handle") {
        const { x: px, y: py, w: pw, h: ph } = sp; // photo bounds at drag start
        const { x: cx2, y: cy2, w: cw, h: ch } = sc;
        const c = d.handle;

        if (c === "move") {
          setCrop({ x: clamp(cx2 + dx, px, px + pw - cw), y: clamp(cy2 + dy, py, py + ph - ch), w: cw, h: ch });
        } else if (c === "br") {
          setCrop({ x: cx2, y: cy2, w: clamp(cw + dx, MIN, px + pw - cx2), h: clamp(ch + dy, MIN, py + ph - cy2) });
        } else if (c === "bl") {
          const rx = cx2 + cw; const nx = clamp(cx2 + dx, px, rx - MIN);
          setCrop({ x: nx, y: cy2, w: rx - nx, h: clamp(ch + dy, MIN, py + ph - cy2) });
        } else if (c === "tr") {
          const by = cy2 + ch; const ny = clamp(cy2 + dy, py, by - MIN);
          setCrop({ x: cx2, y: ny, w: clamp(cw + dx, MIN, px + pw - cx2), h: by - ny });
        } else if (c === "tl") {
          const rx = cx2 + cw; const by = cy2 + ch;
          const nx = clamp(cx2 + dx, px, rx - MIN); const ny = clamp(cy2 + dy, py, by - MIN);
          setCrop({ x: nx, y: ny, w: rx - nx, h: by - ny });
        } else if (c === "t") {
          const by = cy2 + ch; const ny = clamp(cy2 + dy, py, by - MIN);
          setCrop({ ...sc, y: ny, h: by - ny });
        } else if (c === "b") {
          setCrop({ ...sc, h: clamp(ch + dy, MIN, py + ph - cy2) });
        } else if (c === "l") {
          const rx = cx2 + cw; const nx = clamp(cx2 + dx, px, rx - MIN);
          setCrop({ ...sc, x: nx, w: rx - nx });
        } else if (c === "r") {
          setCrop({ ...sc, w: clamp(cw + dx, MIN, px + pw - cx2) });
        }
      }
    };

    const onUp = () => { dragRef.current = null; };

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

  const beginDrag = (
    e: React.MouseEvent | React.TouchEvent,
    mode: DragMode,
    handle: Handle = "move"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = { mode, handle, startX: cx, startY: cy, startPhoto: { ...photo }, startCrop: { ...crop } };
  };

  const startCrop = () => { setCrop({ ...photo }); setCropping(true); };
  const applyCrop  = () => { setPhoto({ ...crop }); setCropping(false); };

  const handlePlace = () => {
    const img = imgEl.current;
    if (!img) return;
    const dst = cropping ? crop : photo;
    const sx = img.naturalWidth / photo.w;
    const sy = img.naturalHeight / photo.h;
    const src: Rect = { x: (dst.x - photo.x) * sx, y: (dst.y - photo.y) * sy, w: dst.w * sx, h: dst.h * sy };
    onCommit(img, src, dst);
  };

  if (!ready) return null;

  // ── helpers for render ──────────────────────────────────────────────────

  const photoHandleStyle = (c: "tl" | "tr" | "bl" | "br"): React.CSSProperties => ({
    position: "absolute", width: H, height: H, background: "white",
    border: "2px solid #2dd4bf", borderRadius: 3, touchAction: "none",
    cursor: `${c}-resize`,
    top:    c.startsWith("t") ? -HR : undefined,
    bottom: c.startsWith("b") ? -HR : undefined,
    left:   c.endsWith("l")   ? -HR : undefined,
    right:  c.endsWith("r")   ? -HR : undefined,
  });

  const cropCornerStyle = (c: "tl" | "tr" | "bl" | "br"): React.CSSProperties => ({
    position: "absolute", width: H, height: H, background: "white",
    border: "2px solid rgba(0,0,0,0.4)", borderRadius: 3, touchAction: "none",
    cursor: `${c}-resize`,
    top:    c.startsWith("t") ? -HR : undefined,
    bottom: c.startsWith("b") ? -HR : undefined,
    left:   c.endsWith("l")   ? -HR : undefined,
    right:  c.endsWith("r")   ? -HR : undefined,
  });

  const cropEdgeStyle = (s: "t" | "b" | "l" | "r"): React.CSSProperties => ({
    position: "absolute", width: H, height: H, background: "white",
    border: "2px solid rgba(0,0,0,0.4)", borderRadius: 3, touchAction: "none",
    cursor: s === "t" || s === "b" ? "ns-resize" : "ew-resize",
    ...(s === "t" && { top: -HR, left: "50%", marginLeft: -HR }),
    ...(s === "b" && { bottom: -HR, left: "50%", marginLeft: -HR }),
    ...(s === "l" && { left: -HR, top: "50%", marginTop: -HR }),
    ...(s === "r" && { right: -HR, top: "50%", marginTop: -HR }),
  });

  return (
    <div
      className="absolute inset-0 z-20 select-none overflow-hidden rounded-xl"
      style={{ touchAction: "none" }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop — click outside the photo to dismiss */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* ── Photo: draggable + resizable ── */}
      {!cropping && (
        <div
          className="absolute"
          style={{ left: photo.x, top: photo.y, width: photo.w, height: photo.h, cursor: "move", touchAction: "none" }}
          onMouseDown={(e) => beginDrag(e, "photo-move")}
          onTouchStart={(e) => beginDrag(e, "photo-move")}
        >
          <img src={image} style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }} draggable={false} />
          <div className="absolute inset-0 border-2 border-white/80 pointer-events-none rounded-sm" />
          {(["tl", "tr", "bl", "br"] as const).map((c) => (
            <div key={c} style={photoHandleStyle(c)}
              onMouseDown={(e) => { e.stopPropagation(); beginDrag(e, "photo-resize", c); }}
              onTouchStart={(e) => { e.stopPropagation(); beginDrag(e, "photo-resize", c); }}
            />
          ))}
        </div>
      )}

      {/* ── Crop mode ── */}
      {cropping && (
        <>
          {/* Full photo — dimmed */}
          <div className="absolute overflow-hidden" style={{ left: photo.x, top: photo.y, width: photo.w, height: photo.h }}>
            <img src={image} style={{ width: "100%", height: "100%", display: "block", opacity: 0.35 }} draggable={false} />
          </div>

          {/* Bright crop region — clips to crop rect, positions image so only the crop area shows */}
          <div className="absolute overflow-hidden pointer-events-none" style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}>
            <img src={image} style={{
              position: "absolute", width: photo.w, height: photo.h,
              left: photo.x - crop.x, top: photo.y - crop.y, display: "block",
            }} draggable={false} />
          </div>

          {/* Crop rect — draggable + handles */}
          <div
            className="absolute border-2 border-white"
            style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h, cursor: "move", touchAction: "none" }}
            onMouseDown={(e) => beginDrag(e, "crop-handle", "move")}
            onTouchStart={(e) => beginDrag(e, "crop-handle", "move")}
          >
            {/* Rule-of-thirds grid */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: [
                "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px)",
                "linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
              ].join(","),
              backgroundSize: "33.33% 33.33%",
            }} />
            {/* Corner handles */}
            {(["tl", "tr", "bl", "br"] as const).map((c) => (
              <div key={c} style={cropCornerStyle(c)}
                onMouseDown={(e) => { e.stopPropagation(); beginDrag(e, "crop-handle", c); }}
                onTouchStart={(e) => { e.stopPropagation(); beginDrag(e, "crop-handle", c); }}
              />
            ))}
            {/* Edge handles */}
            {(["t", "b", "l", "r"] as const).map((s) => (
              <div key={s} style={cropEdgeStyle(s)}
                onMouseDown={(e) => { e.stopPropagation(); beginDrag(e, "crop-handle", s); }}
                onTouchStart={(e) => { e.stopPropagation(); beginDrag(e, "crop-handle", s); }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Action buttons ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30" onMouseDown={(e) => e.stopPropagation()}>
        {!cropping ? (
          <>
            <Button onClick={startCrop} size="sm" variant="outline" className="bg-white/90 hover:bg-white rounded-full shadow-lg">
              <Crop className="mr-1.5 h-4 w-4" /> Crop
            </Button>
            <Button onClick={handlePlace} size="sm" className="bg-teal text-white hover:bg-teal/90 rounded-full shadow-lg">
              <Check className="mr-1.5 h-4 w-4" /> Place on Canvas
            </Button>
            <Button onClick={onCancel} size="sm" variant="outline" className="bg-white/90 hover:bg-white rounded-full shadow-lg">
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={applyCrop} size="sm" className="bg-teal text-white hover:bg-teal/90 rounded-full shadow-lg">
              <Check className="mr-1.5 h-4 w-4" /> Apply Crop
            </Button>
            <Button onClick={() => setCropping(false)} size="sm" variant="outline" className="bg-white/90 hover:bg-white rounded-full shadow-lg">
              <X className="mr-1.5 h-4 w-4" /> Cancel Crop
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

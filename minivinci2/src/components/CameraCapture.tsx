import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export const CameraCapture = ({ onCapture, onCancel }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startStream = async (facing: "environment" | "user") => {
    // Stop any existing stream first
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setReady(false);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access and try again.");
      } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFound")) {
        setError("No camera found on this device.");
      } else {
        setError("Could not open camera. " + msg);
      }
    }
  };

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support camera access.");
      return;
    }
    startStream(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startStream(next);
  };

  const handleSnap = () => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror front-facing camera so selfies aren't flipped
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(canvas.toDataURL("image/jpeg", 0.92));
  };

  const handleCancel = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video feed */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white text-center px-8 space-y-4">
            <p className="text-lg">{error}</p>
            <Button onClick={handleCancel} variant="outline" className="rounded-full border-white text-white hover:bg-white/20">
              Close
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
              style={facingMode === "user" ? { transform: "scaleX(-1)" } : {}}
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      {!error && (
        <div className="bg-black py-6 flex items-center justify-center gap-8">
          {/* Flip camera */}
          <button
            onClick={flipCamera}
            className="w-12 h-12 rounded-full border-2 border-white/50 flex items-center justify-center text-white hover:border-white transition-all"
            title="Flip camera"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          {/* Shutter button */}
          <button
            onClick={handleSnap}
            disabled={!ready}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-2xl"
            title="Take photo"
          >
            <Camera className="h-8 w-8 text-black" />
          </button>

          {/* Cancel */}
          <button
            onClick={handleCancel}
            className="w-12 h-12 rounded-full border-2 border-white/50 flex items-center justify-center text-white hover:border-white transition-all"
            title="Cancel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

"use client";

import { useState, useRef, useCallback } from "react";
import { Scan, Camera, CameraOff } from "lucide-react";

export default function BarcodeScanner({ onDetect }: { onDetect: (code: string) => void }) {
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
      scan();
    } catch {
      setActive(false);
    }
  }, []);

  const scan = useCallback(async () => {
    if (!("BarcodeDetector" in window)) { stop(); return; }
    const detector = new (window as any).BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });

    const attempt = async () => {
      if (!active) return;
      try {
        const barcodes = await detector.detect(videoRef.current!);
        for (const b of barcodes) {
          if (b.rawValue) {
            onDetect(b.rawValue);
            stop();
            return;
          }
        }
      } catch { /* continue */ }
      if (active) requestAnimationFrame(attempt);
    };
    attempt();
  }, [active, onDetect, stop]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={start}
        className="p-2 rounded-xl border border-surface text-muted hover:text-default hover:bg-surface transition-all cursor-pointer"
        title="Scan barcode with camera"
      >
        <Camera className="size-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="relative max-w-md w-full rounded-2xl overflow-hidden border border-surface bg-black">
        <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-32 border-2 border-violet-400 rounded-xl opacity-60" />
        </div>
        <div className="flex items-center justify-center p-4 bg-zinc-900">
          <button
            type="button"
            onClick={stop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-500 transition-all cursor-pointer"
          >
            <CameraOff className="size-4" />
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}

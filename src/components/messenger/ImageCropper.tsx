import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { type CropArea, cropToSquareFile } from "@/lib/crop-image";

export function ImageCropper({
  file,
  busy = false,
  onCancel,
  onDone,
}: {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onDone: (cropped: File) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<CropArea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onCropComplete = useCallback((_: CropArea, pixels: CropArea) => {
    setArea(pixels);
  }, []);

  const apply = async () => {
    if (!area) return;
    setWorking(true);
    setError(null);
    try {
      onDone(await cropToSquareFile(file, area, rotation));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not crop that image.");
    } finally {
      setWorking(false);
    }
  };

  const pending = busy || working;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-background/90 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Crop photo"
    >
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Crop &amp; resize</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel crop"
            className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative mt-3 aspect-square w-full overflow-hidden rounded-2xl bg-secondary">
          {src ? (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="rect"
              showGrid
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <ZoomOut className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-10 w-full accent-primary"
          />
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Rotate 90 degrees"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
          >
            <RotateCw className="size-4" />
          </button>
        </div>

        <p className="mt-1 text-[11px] text-muted-foreground/80">
          Drag to reposition. Photos are saved as a square, up to 1024×1024.
        </p>

        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-secondary px-4 py-2.5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={!area || pending}
            className="flex-1 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

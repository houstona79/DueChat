import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, X } from "lucide-react";
import { ImageCropper } from "./ImageCropper";
import {
  MAX_PROFILE_PHOTOS,
  type ProfilePhoto,
  deleteProfilePhoto,
  fetchProfilePhotos,
  signedPhotoUrl,
  uploadProfilePhoto,
} from "@/lib/photos";
import { cn } from "@/lib/utils";

function PhotoThumb({
  photo,
  onOpen,
  className,
}: {
  photo: ProfilePhoto;
  onOpen: (url: string) => void;
  className?: string;
}) {
  const { data: url } = useQuery({
    queryKey: ["photo-url", photo.path],
    queryFn: () => signedPhotoUrl(photo.path),
    staleTime: 50 * 60_000,
  });

  return (
    <button
      type="button"
      onClick={() => url && onOpen(url)}
      className={cn(
        "relative aspect-square overflow-hidden rounded-2xl bg-secondary",
        className,
      )}
      aria-label={photo.caption ?? "Open photo"}
    >
      {url ? (
        <img
          src={url}
          alt={photo.caption ?? "Profile photo"}
          loading="lazy"
          className="size-full object-cover"
        />
      ) : null}
    </button>
  );
}

export function ProfilePhotos({
  userId,
  editable = false,
  title = "Photos",
}: {
  userId: string;
  editable?: boolean;
  title?: string;
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const { data: photos = [] } = useQuery({
    queryKey: ["profile-photos", userId],
    queryFn: () => fetchProfilePhotos(userId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["profile-photos", userId] });

  const upload = useMutation({
    mutationFn: (file: File) => uploadProfilePhoto(userId, file),
    onSuccess: () => {
      setPendingFile(null);
      return invalidate();
    },
    onError: (e: Error) => {
      setPendingFile(null);
      setError(e.message || "Upload failed.");
    },
  });

  const remove = useMutation({
    mutationFn: (photo: ProfilePhoto) => deleteProfilePhoto(photo),
    onSuccess: invalidate,
  });

  if (!editable && photos.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground">{title}</h3>
        {editable ? (
          <span className="text-[11px] text-muted-foreground">
            {photos.length}/{MAX_PROFILE_PHOTOS}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative">
            <PhotoThumb photo={photo} onOpen={setLightbox} className="w-full" />
            {editable ? (
              <button
                type="button"
                onClick={() => remove.mutate(photo)}
                aria-label="Delete photo"
                className="absolute right-1 top-1 grid size-8 place-items-center rounded-xl bg-background/80 text-muted-foreground backdrop-blur hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}

        {editable && photos.length < MAX_PROFILE_PHOTOS ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="grid aspect-square place-items-center rounded-2xl border border-dashed border-border text-muted-foreground hover:bg-secondary disabled:opacity-60"
          >
            <span className="flex flex-col items-center gap-1 text-[11px]">
              <ImagePlus className="size-5" />
              {upload.isPending ? "Uploading…" : "Add photo"}
            </span>
          </button>
        ) : null}
      </div>

      {editable ? (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          aria-label="Upload a photo"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            if (!file.type.startsWith("image/")) {
              setError("Please pick an image file.");
              return;
            }
            setPendingFile(file);
          }}
        />
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {pendingFile ? (
        <ImageCropper
          file={pendingFile}
          busy={upload.isPending}
          onCancel={() => setPendingFile(null)}
          onDone={(cropped) => upload.mutate(cropped)}
        />
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-background/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Profile photo"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            autoFocus
            onClick={() => setLightbox(null)}
            aria-label="Close photo"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-xl bg-card text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

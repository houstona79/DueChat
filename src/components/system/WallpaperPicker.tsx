import { WALLPAPERS, useWallpaper } from "@/hooks/use-wallpaper";
import { cn } from "@/lib/utils";

/** Chat wallpaper + background color chooser for the messenger sidebar. */
export function WallpaperPicker({ className }: { className?: string }) {
  const { wallpaper, setWallpaper } = useWallpaper();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-medium text-muted-foreground">Background</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {WALLPAPERS.map((w) => (
          <button
            key={w.id}
            type="button"
            aria-pressed={wallpaper === w.id}
            aria-label={w.label}
            title={w.label}
            onClick={() => setWallpaper(w.id)}
            className={cn(
              "size-6 overflow-hidden rounded-full border-2 bg-secondary bg-cover bg-center transition-transform hover:scale-110",
              wallpaper === w.id ? "border-foreground scale-110" : "border-transparent",
            )}
            style={w.src ? { backgroundImage: w.src } : undefined}
          >
            {w.src ? null : <span className="text-[9px] font-bold text-muted-foreground">/</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

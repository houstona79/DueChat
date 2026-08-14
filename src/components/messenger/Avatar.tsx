import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { initials, signedAvatarUrl } from "@/lib/chat";

const ACCENTS: Record<string, string> = {
  "accent-1": "bg-accent-1/20 text-accent-1",
  "accent-2": "bg-accent-2/20 text-accent-2",
  "accent-3": "bg-accent-3/20 text-accent-3",
  "accent-4": "bg-accent-4/20 text-accent-4",
};

export function Avatar({
  name,
  accent,
  online,
  avatarPath,
  size = "md",
  className,
}: {
  name: string;
  accent: string;
  online?: boolean;
  avatarPath?: string | null;
  size?: "md" | "sm" | "lg";
  className?: string;
}) {
  const { data: url } = useQuery({
    queryKey: ["avatar-url", avatarPath],
    queryFn: () => signedAvatarUrl(avatarPath!),
    enabled: Boolean(avatarPath),
    staleTime: 50 * 60_000,
  });

  const dims =
    size === "lg" ? "size-16 text-lg" : size === "md" ? "size-11 text-sm" : "size-9 text-xs";

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {url ? (
        <img
          src={url}
          alt={`${name} avatar`}
          className={cn("rounded-2xl object-cover", dims)}
          loading="lazy"
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-2xl font-display font-semibold",
            dims,
            ACCENTS[accent] ?? ACCENTS["accent-1"],
          )}
        >
          {initials(name)}
        </span>
      )}
      {online ? (
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-online" />
      ) : null}
    </span>
  );
}

import { useQuery } from "@tanstack/react-query";
import { signedCoverUrl } from "@/lib/blogs";
import { cn } from "@/lib/utils";

/** Cover images live in private storage, so they're signed on demand. */
export function BlogCover({
  path,
  title,
  className,
}: {
  path: string | null;
  title: string;
  className?: string;
}) {
  const { data: url } = useQuery({
    queryKey: ["blog-cover", path],
    queryFn: () => signedCoverUrl(path!),
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
  });
  if (!path || !url) return null;
  return (
    <img
      src={url}
      alt={`Cover image for ${title}`}
      loading="lazy"
      className={cn("w-full rounded-2xl border border-border object-cover", className)}
    />
  );
}
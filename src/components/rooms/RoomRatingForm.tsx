import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { StarPicker } from "./StarRating";
import { useAuth } from "@/hooks/use-auth";
import { clearRoomRating, fetchMyRoomRating, rateRoom } from "@/lib/room-profiles";

export function RoomRatingForm({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  const { data: mine } = useQuery({
    queryKey: ["my-room-rating", roomId, user?.id],
    queryFn: () => fetchMyRoomRating(roomId, user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (mine) {
      setStars(mine.stars);
      setComment(mine.comment ?? "");
    }
  }, [mine]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["my-room-rating", roomId] });
    void router.invalidate();
  };

  const save = useMutation({
    mutationFn: () => rateRoom(roomId, user!.id, stars, comment),
    onSuccess: () => {
      toast.success("Thanks for rating this room.");
      refresh();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn’t save your rating."),
  });

  const remove = useMutation({
    mutationFn: () => clearRoomRating(roomId, user!.id),
    onSuccess: () => {
      setStars(0);
      setComment("");
      toast.success("Rating removed.");
      refresh();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn’t remove your rating."),
  });

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link to="/auth" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        to rate this room.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <StarPicker value={stars} onPick={setStars} disabled={save.isPending} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 300))}
        rows={3}
        placeholder="Say what makes this room good (optional)"
        className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={stars < 1 || save.isPending}
          onClick={() => save.mutate()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {mine ? "Update rating" : "Post rating"}
        </button>
        {mine ? (
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

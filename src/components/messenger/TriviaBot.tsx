import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  answerTriviaRound,
  fetchTriviaRounds,
  setRoomTrivia,
  startTriviaRound,
} from "@/lib/trivia";
import type { Profile } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function TriviaBot({
  roomId,
  roomName,
  meId,
  enabled,
  canManage,
  joined,
  profiles,
}: {
  roomId: string;
  roomName: string;
  meId: string;
  enabled: boolean;
  canManage: boolean;
  joined: boolean;
  profiles: Profile[];
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ["trivia-rounds", roomId],
    queryFn: () => fetchTriviaRounds(roomId),
    enabled: enabled && joined,
  });

  useEffect(() => {
    if (!enabled || !joined) return;
    const channel = supabase
      .channel(`trivia:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trivia_rounds", filter: `room_id=eq.${roomId}` },
        () => void queryClient.invalidateQueries({ queryKey: ["trivia-rounds", roomId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, enabled, joined, queryClient]);

  const current = rounds[0] ?? null;
  useEffect(() => setPicked(null), [current?.id]);

  const nameOf = (userId: string | null) =>
    (userId && profiles.find((p) => p.id === userId)?.display_name) || "Someone";

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["trivia-rounds", roomId] });

  const toggle = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await setRoomTrivia(roomId, next);
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
    } catch {
      setError("Could not change the trivia bot setting.");
    }
    setBusy(false);
  };

  const askNew = async () => {
    setBusy(true);
    setError(null);
    try {
      await startTriviaRound(
        roomId,
        meId,
        rounds.map((r) => r.question),
      );
      await refresh();
    } catch {
      setError("Could not start a new question.");
    }
    setBusy(false);
  };

  const answer = async (choice: string) => {
    if (!current || current.winner_id) return;
    setPicked(choice);
    try {
      await answerTriviaRound(current, meId, choice);
      await refresh();
    } catch {
      setError("Could not send your answer.");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Bot className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Trivia bot</p>
          <p className="text-xs text-muted-foreground">
            {enabled ? `Answering questions in ${roomName}.` : "Turned off for this room."}
          </p>
        </div>
        {canManage ? (
          <button
            onClick={() => void toggle(!enabled)}
            disabled={busy}
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Disable trivia bot" : "Enable trivia bot"}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60",
              enabled ? "bg-primary" : "bg-secondary",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-background transition-transform",
                enabled ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {!enabled ? (
        <p className="text-xs text-muted-foreground">
          {canManage
            ? "Turn the bot on to let everyone in this room play trivia."
            : "Only the room owner and room admins can turn the trivia bot on."}
        </p>
      ) : !joined ? (
        <p className="text-xs text-muted-foreground">Join the room to play trivia.</p>
      ) : (
        <div className="space-y-3">
          {isLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading trivia…
            </p>
          ) : null}

          {current ? (
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-sm font-medium">{current.question}</p>
              <div className="mt-3 grid gap-2">
                {current.choices.map((choice) => {
                  const solved = Boolean(current.winner_id);
                  const isAnswer = choice === current.answer;
                  const wrongPick = picked === choice && !isAnswer;
                  return (
                    <button
                      key={choice}
                      onClick={() => void answer(choice)}
                      disabled={solved || wrongPick}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm",
                        solved && isAnswer
                          ? "border-primary bg-primary/10 text-primary"
                          : wrongPick
                            ? "border-destructive/60 bg-destructive/10 text-destructive"
                            : "border-border hover:bg-secondary",
                      )}
                    >
                      <span>{choice}</span>
                      {solved && isAnswer ? <Check className="size-4" /> : null}
                      {wrongPick ? <X className="size-4" /> : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {current.winner_id
                  ? `${current.winner_id === meId ? "You" : nameOf(current.winner_id)} got it right!`
                  : "First correct answer wins the round."}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No question yet — start the first round.
            </p>
          )}

          <button
            onClick={() => void askNew()}
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            {current ? "Next question" : "Ask a question"}
          </button>

          {rounds.length > 1 ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent rounds
              </h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {rounds.slice(1).map((r) => (
                  <li key={r.id} className="truncate">
                    {r.answer} — {r.winner_id ? nameOf(r.winner_id) : "unanswered"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

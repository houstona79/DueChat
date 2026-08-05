import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { ThreadList } from "@/components/messenger/ThreadList";
import { useThreads } from "@/hooks/use-threads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Halo Messenger — Fast, private chat" },
      {
        name: "description",
        content:
          "A calm dark-mode messenger for your conversations. Threads and messages stay saved in your browser.",
      },
      { property: "og:title", content: "Halo Messenger — Fast, private chat" },
      {
        property: "og:description",
        content:
          "A calm dark-mode messenger for your conversations. Threads and messages stay saved in your browser.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const threads = useThreads();

  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden md:grid-cols-[340px_1fr]">
      <div className="min-h-0 border-r border-border">
        <ThreadList threads={threads} />
      </div>
      <div className="hidden min-h-0 place-items-center bg-background px-6 text-center md:grid">
        <div className="max-w-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <MessagesSquare className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Pick up a conversation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a chat on the left to read the thread and reply. Everything stays on this device.
          </p>
        </div>
      </div>
    </main>
  );
}

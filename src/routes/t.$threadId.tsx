import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChatPane } from "@/components/messenger/ChatPane";
import { ThreadList } from "@/components/messenger/ThreadList";
import { useThreads } from "@/hooks/use-threads";

export const Route = createFileRoute("/t/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — Halo Messenger" },
      {
        name: "description",
        content: "Read and reply in a Halo Messenger conversation, saved right in your browser.",
      },
      { property: "og:title", content: "Conversation — Halo Messenger" },
      {
        property: "og:description",
        content: "Read and reply in a Halo Messenger conversation, saved right in your browser.",
      },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = useParams({ from: "/t/$threadId" });
  const threads = useThreads();
  const thread = threads.find((t) => t.id === threadId);

  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden md:grid-cols-[340px_1fr]">
      <div className="hidden min-h-0 border-r border-border md:block">
        <ThreadList threads={threads} activeId={threadId} />
      </div>
      <div className="min-h-0">
        {thread ? (
          <ChatPane key={thread.id} thread={thread} />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            {threads.length === 0 ? "Loading conversation…" : "This conversation no longer exists."}
          </div>
        )}
      </div>
    </main>
  );
}
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { DESKTOP_VERSION, DESKTOP_RELEASE_NOTES } from "@/lib/desktop-version";
import { playSound } from "@/lib/sounds";

const KEY = "duechat.seen-version";

/**
 * Site-wide "DueChat was updated" message. Every member sees it once per
 * release: we compare the shipped version with the last one this browser
 * acknowledged, so no admin action is needed when an update goes out.
 */
export function SystemUpdateNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(KEY);
    } catch {
      return;
    }
    if (seen === DESKTOP_VERSION) return;
    // First ever visit: remember the version quietly instead of announcing it.
    if (!seen) {
      try {
        window.localStorage.setItem(KEY, DESKTOP_VERSION);
      } catch {
        /* storage may be blocked */
      }
      return;
    }
    setShow(true);
    playSound("alert");
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, DESKTOP_VERSION);
    } catch {
      /* storage may be blocked */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="System update message"
      className="fixed inset-x-0 top-0 z-[91] flex items-start gap-2 bg-accent-2 px-3 py-2 text-sm text-background shadow-lg"
    >
      <Sparkles className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 break-words">
        <span className="font-semibold">DueChat updated to {DESKTOP_VERSION}:</span>{" "}
        {DESKTOP_RELEASE_NOTES}
      </p>
      <button
        aria-label="Dismiss update message"
        onClick={dismiss}
        className="grid size-7 shrink-0 place-items-center rounded-lg hover:bg-background/20"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
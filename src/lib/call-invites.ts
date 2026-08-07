/**
 * Tiny global store for pending call joins.
 *
 * When someone accepts an incoming direct call we navigate to that room and
 * the chat pane picks the pending entry up and opens the call overlay.
 */
export type PendingCall = { roomId: string; mode: "voice" | "video" } | null;

let pending: PendingCall = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribePendingCall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingCall() {
  return pending;
}

export function setPendingCall(next: PendingCall) {
  pending = next;
  emit();
}

export function takePendingCall(roomId: string): "voice" | "video" | null {
  if (!pending || pending.roomId !== roomId) return null;
  const mode = pending.mode;
  pending = null;
  emit();
  return mode;
}

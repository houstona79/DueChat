# Room members + private messages

## What you get
1. **See who's in a room** — a Members panel in each chat room listing everyone who joined, with avatar, display name, handle, status and a live green dot for online.
2. **Message anyone privately** — tap a member (or someone from "Online now") to open a 1:1 private conversation. DMs appear in the sidebar under a "Direct messages" section, separate from rooms, and show the other person's name and avatar instead of a room name.

Private chats reuse the same realtime messaging, so DMs arrive instantly just like room messages.

## Flow
```text
Room header -> "Members (5)" button -> panel
  each member row -> [Message] -> opens/creates 1:1 chat -> /chat/<id>

Sidebar
  Direct messages   (1:1 chats you're part of)
  Rooms             (group rooms)
  Online now        -> tap a person -> starts a DM
```

## Technical notes
- Database migration on `rooms`: add `is_direct boolean not null default false` and `direct_key text unique` (sorted pair of user ids) so opening a DM twice reuses the same conversation. Keep messages/room_members as-is — DMs are two-member private rooms.
- Update the rooms read policy so direct rooms are only visible to their members; group rooms stay discoverable by all signed-in users.
- `src/lib/chat.ts`: add `openDirectRoom(meId, otherId)` (lookup by `direct_key`, else create room + both memberships) and helpers to resolve a DM's counterpart profile.
- New `src/components/messenger/MemberList.tsx`: roster panel driven by existing `memberships` + `profiles` data (no new fetching), with per-member "Message" action.
- `ChatPane.tsx`: members button in the header toggling the panel; for direct rooms show the counterpart's name/avatar/status instead of room name + member count, and hide the Join gate (you're always a member of your own DMs).
- `Sidebar.tsx`: split the list into Direct messages and Rooms; search covers both.
- Presence/online dots and call buttons work unchanged in DMs.

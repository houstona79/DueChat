import attachAsset from "@/assets/icons/attach.png.asset.json";
import botAsset from "@/assets/icons/bot.png.asset.json";
import emojiAsset from "@/assets/icons/emoji.png.asset.json";
import feedAsset from "@/assets/icons/feed.png.asset.json";
import gamesAsset from "@/assets/icons/games.png.asset.json";
import gifAsset from "@/assets/icons/gif.png.asset.json";
import handAsset from "@/assets/icons/hand.png.asset.json";
import inviteAsset from "@/assets/icons/invite.png.asset.json";
import lockAsset from "@/assets/icons/lock.png.asset.json";
import membersAsset from "@/assets/icons/members.png.asset.json";
import micAsset from "@/assets/icons/mic.png.asset.json";
import phoneAsset from "@/assets/icons/phone.png.asset.json";
import radioAsset from "@/assets/icons/radio.png.asset.json";
import searchAsset from "@/assets/icons/search.png.asset.json";
import sendAsset from "@/assets/icons/send.png.asset.json";
import stickerAsset from "@/assets/icons/sticker.png.asset.json";
import videoAsset from "@/assets/icons/video.png.asset.json";

import { cn } from "@/lib/utils";

/** Glossy image icons used across the messenger chrome. */
export const APP_ICONS = {
  attach: { src: attachAsset.url, label: "Attach" },
  bot: { src: botAsset.url, label: "Trivia bot" },
  emoji: { src: emojiAsset.url, label: "Emoji" },
  feed: { src: feedAsset.url, label: "Room feed" },
  games: { src: gamesAsset.url, label: "Games" },
  gif: { src: gifAsset.url, label: "GIF" },
  hand: { src: handAsset.url, label: "Raise hand" },
  invite: { src: inviteAsset.url, label: "Invite people" },
  lock: { src: lockAsset.url, label: "Locked" },
  members: { src: membersAsset.url, label: "Members" },
  mic: { src: micAsset.url, label: "Microphone" },
  phone: { src: phoneAsset.url, label: "Voice call" },
  radio: { src: radioAsset.url, label: "Radio" },
  search: { src: searchAsset.url, label: "Search" },
  send: { src: sendAsset.url, label: "Send" },
  sticker: { src: stickerAsset.url, label: "Stickers" },
  video: { src: videoAsset.url, label: "Video call" },
} as const;

export type AppIconName = keyof typeof APP_ICONS;

export function AppIcon({
  name,
  className,
  title,
}: {
  name: AppIconName;
  className?: string;
  title?: string;
}) {
  const icon = APP_ICONS[name];
  return (
    <img
      src={icon.src}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      title={title}
      loading="lazy"
      width={128}
      height={128}
      draggable={false}
      className={cn("size-4 shrink-0 select-none object-contain", className)}
    />
  );
}
import { AppIcon } from "./AppIcons";

type IconProps = { className?: string; title?: string };

/**
 * Messenger chrome icons, now rendered as glossy 3D image icons. The component
 * names are kept so existing call sites keep working.
 */

export function YahooSendIcon({ className, title }: IconProps) {
  return <AppIcon name="send" className={className} title={title} />;
}

export function YahooAttachIcon({ className, title }: IconProps) {
  return <AppIcon name="attach" className={className} title={title} />;
}

export function YahooSearchIcon({ className, title }: IconProps) {
  return <AppIcon name="search" className={className} title={title} />;
}

export function YahooStickerIcon({ className, title }: IconProps) {
  return <AppIcon name="sticker" className={className} title={title} />;
}

export function YahooGifIcon({ className, title }: IconProps) {
  return <AppIcon name="gif" className={className} title={title} />;
}

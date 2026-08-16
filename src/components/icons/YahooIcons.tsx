type IconProps = { className?: string; title?: string };

/**
 * Yahoo!-style chrome icons: glossy purple bodies with gold hairline accents,
 * matching the messenger skin's title-bar chrome. Colors are self-contained so
 * the icons read the same on light and dark conversation surfaces.
 */

export function YahooSendIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="yh-send-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6e3ff" />
          <stop offset="45%" stopColor="#b16ae0" />
          <stop offset="100%" stopColor="#5b1d8f" />
        </linearGradient>
      </defs>
      <path
        d="M2.6 11.4 20.4 3.2c.9-.4 1.8.5 1.4 1.4l-8.2 17.8c-.4.9-1.7.8-2-.2l-1.9-6.3-6.3-1.9c-1-.3-1.1-1.6-.8-2.6Z"
        fill="url(#yh-send-body)"
        stroke="#f0c419"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path d="M21.2 4 10.6 15" stroke="#ffe9a8" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function YahooAttachIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="yh-clip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c78bea" />
          <stop offset="55%" stopColor="#7a2fae" />
          <stop offset="100%" stopColor="#4a1478" />
        </linearGradient>
      </defs>
      <path
        d="M15.8 6.6 8.2 14.2a2.6 2.6 0 0 0 3.7 3.7l7.3-7.3a4.6 4.6 0 0 0-6.5-6.5L5 12a6.6 6.6 0 0 0 9.3 9.3l5-5"
        fill="none"
        stroke="url(#yh-clip)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M15.8 6.6 8.2 14.2a2.6 2.6 0 0 0 3.7 3.7l7.3-7.3a4.6 4.6 0 0 0-6.5-6.5L5 12a6.6 6.6 0 0 0 9.3 9.3l5-5"
        fill="none"
        stroke="#f0c419"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

export function YahooSearchIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="yh-lens" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#c9a4e6" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx="10.5" cy="10.5" r="6.4" fill="url(#yh-lens)" stroke="#6c229f" strokeWidth="2" />
      <circle cx="10.5" cy="10.5" r="7.8" fill="none" stroke="#f0c419" strokeWidth="0.8" opacity="0.9" />
      <path d="M15.4 15.4 21 21" stroke="#6c229f" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M15.4 15.4 21 21" stroke="#f0c419" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

export function YahooStickerIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="yh-sticker" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="100%" stopColor="#f0c419" />
        </linearGradient>
      </defs>
      <path
        d="M4 4.8A1.8 1.8 0 0 1 5.8 3h8.9L21 9.3v8.9A1.8 1.8 0 0 1 19.2 20H5.8A1.8 1.8 0 0 1 4 18.2Z"
        fill="url(#yh-sticker)"
        stroke="#6c229f"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14.7 3v6.3H21" fill="none" stroke="#6c229f" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function YahooGifIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="yh-gif" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2c2f6" />
          <stop offset="100%" stopColor="#7a2fae" />
        </linearGradient>
      </defs>
      <rect x="2.6" y="4.6" width="18.8" height="14.8" rx="2" fill="url(#yh-gif)" stroke="#f0c419" strokeWidth="0.9" />
      <path d="M9.6 9.4v5.2l4.6-2.6Z" fill="#fff8dd" stroke="#4a1478" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}
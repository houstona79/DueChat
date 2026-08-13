export {};

declare global {
  interface Window {
    duechatDesktop?: {
      openRoomWindow: (url: string, kind?: "room" | "im") => Promise<boolean>;
    };
  }
}
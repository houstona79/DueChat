export {};

declare global {
  interface Window {
    duechatDesktop?: {
      openRoomWindow: (url: string) => Promise<boolean>;
    };
  }
}
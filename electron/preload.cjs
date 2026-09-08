const { contextBridge, ipcRenderer } = require("electron");

// Let the hosted interface add desktop-only window chrome without affecting
// the browser or phone layouts.
window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.setAttribute("data-desktop-shell", "true");
});

contextBridge.exposeInMainWorld("duechatDesktop", {
  openRoomWindow: (url, kind) => ipcRenderer.invoke("duechat:open-room-window", url, kind),
});
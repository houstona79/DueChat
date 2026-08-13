const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("duechatDesktop", {
  openRoomWindow: (url, kind) => ipcRenderer.invoke("duechat:open-room-window", url, kind),
});
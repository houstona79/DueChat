const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("duechatDesktop", {
  openRoomWindow: (url) => ipcRenderer.invoke("duechat:open-room-window", url),
});
const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const APP_URL = "https://app.duechat.com";
const DEV_URL = "http://localhost:8080";

const loadUrl = () => {
  if (process.env.NODE_ENV === "development" && process.env.DUECHAT_DEV_URL) {
    return process.env.DUECHAT_DEV_URL;
  }
  return APP_URL;
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 375,
    minHeight: 600,
    title: "DueChat",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const localIndex = path.join(__dirname, "..", "dist", "client", "index.html");
  if (fs.existsSync(localIndex)) {
    mainWindow.loadFile(localIndex);
  } else {
    mainWindow.loadURL(loadUrl());
  }

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

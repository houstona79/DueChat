const { app, BrowserWindow, session, systemPreferences, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const APP_URL = "https://app.duechat.com";
const DEV_URL = "http://localhost:8080";

/** Ask macOS for mic/camera access up front so the OS prompt appears once. */
const requestMediaAccess = async () => {
  if (process.platform !== "darwin") return;
  for (const type of ["microphone", "camera"]) {
    try {
      if (systemPreferences.getMediaAccessStatus(type) !== "granted") {
        await systemPreferences.askForMediaAccess(type);
      }
    } catch {
      /* older macOS versions may not expose this */
    }
  }
};

/** Allow the app's own pages to use mic, camera and screen share. */
const allowMediaPermissions = () => {
  const allowed = new Set(["media", "audioCapture", "videoCapture", "display-capture", "clipboard-read", "notifications"]);
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowed.has(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
  if (ses.setDisplayMediaRequestHandler) {
    ses.setDisplayMediaRequestHandler((_req, callback) => callback({ video: undefined, audio: "loopback" }), {
      useSystemPicker: true,
    });
  }
};

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

  // External links open in the user's browser instead of hijacking the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(async () => {
  allowMediaPermissions();
  await requestMediaAccess();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const { app, BrowserWindow, session, systemPreferences, shell } = require("electron");

const APP_URL = "https://app.duechat.com";
const DEV_URL = "http://localhost:8080";

/** Any DueChat host (app/preview/published) plus localhost during development. */
const isTrustedOrigin = (rawUrl) => {
  if (!rawUrl) return false;
  try {
    const { hostname, protocol } = new URL(rawUrl);
    if (protocol === "http:" && (hostname === "localhost" || hostname === "127.0.0.1")) return true;
    if (protocol !== "https:") return false;
    return (
      hostname === "duechat.com" ||
      hostname.endsWith(".duechat.com") ||
      hostname.endsWith(".lovable.app")
    );
  } catch {
    return false;
  }
};

/**
 * Chromium switches that must be set before the app is ready.
 * WebRtcHideLocalIpsWithMdns must be OFF: Electron builds resolve mDNS (.local)
 * ICE candidates unreliably, which makes peer connections stall forever and the
 * call never actually joins even though the mic/camera work.
 */
app.commandLine.appendSwitch(
  "enable-features",
  "WebRTCPipeWireCapturer,WebRtcHideLocalIpsWithMdns:false",
);
app.commandLine.appendSwitch("disable-features", [
  "WebRtcHideLocalIpsWithMdns",
  // Windows: the Media Foundation D3D11 capture path returns all-black frames
  // on many webcams inside Chromium/Electron. The legacy capture path works.
  ...(process.platform === "win32"
    ? ["MediaFoundationD3D11VideoCapture", "MediaFoundationCameraUsageMonitoring"]
    : []),
  // Some Linux distros ship PulseAudio/ALSA combos Chromium rejects unless the
  // audio service runs in-process.
  ...(process.platform === "linux" ? ["AudioServiceOutOfProcess"] : []),
].join(","));
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");
// Black/frozen local preview: GPU-backed video frames are unreliable on Windows
// and Linux drivers, so copy camera frames through shared memory instead.
if (process.platform === "win32") {
  app.commandLine.appendSwitch("disable-gpu-memory-buffer-video-frames");
  app.commandLine.appendSwitch("disable-gpu-compositing");
} else if (process.platform === "linux") {
  app.commandLine.appendSwitch("disable-gpu-memory-buffer-video-frames");
}
// Keep WebRTC alive when the window is in the background or minimized.
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

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
  const ses = session.defaultSession;

  // Electron has changed permission labels across releases, so trust the origin
  // rather than the label. Both handlers are needed: Chromium can run the check
  // without ever opening the request handler.
  ses.setPermissionRequestHandler((webContents, _permission, callback, details) => {
    const url = details?.requestingUrl || details?.securityOrigin || webContents?.getURL();
    callback(isTrustedOrigin(url));
  });
  ses.setPermissionCheckHandler((webContents, _permission, requestingOrigin, details) => {
    const url =
      requestingOrigin ||
      details?.requestingUrl ||
      details?.embeddingOrigin ||
      details?.securityOrigin ||
      webContents?.getURL();
    return isTrustedOrigin(url);
  });
  ses.setDevicePermissionHandler((details) => isTrustedOrigin(details?.origin));
  if (ses.setDisplayMediaRequestHandler) {
    ses.setDisplayMediaRequestHandler(
      (request, callback) => {
        if (!isTrustedOrigin(request.frame?.url)) return callback({});
        callback({ video: undefined, audio: "loopback" });
      },
      { useSystemPicker: true },
    );
  }
};

/**
 * Always load the hosted app: server-backed features (GIFs, stickers,
 * translation) need the live backend, which a local file:// build has no
 * access to.
 */
const loadUrl = () => {
  if (process.env.NODE_ENV === "development") {
    return process.env.DUECHAT_DEV_URL || DEV_URL;
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
    icon: require("path").join(__dirname, "icons", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  mainWindow.loadURL(loadUrl());

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

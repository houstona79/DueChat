const { app, BrowserWindow, Menu, session, systemPreferences, shell, clipboard, dialog, ipcMain } = require("electron");
const path = require("path");

const APP_URL = "https://app.duechat.com";
const DEV_URL = "http://localhost:8080";
const ROOM_WINDOW_WIDTH = 520;
const ROOM_WINDOW_HEIGHT = 780;
// Direct messages get a narrower classic-IM sized window.
const IM_WINDOW_WIDTH = 400;
const IM_WINDOW_HEIGHT = 620;
const windowSize = (kind) =>
  kind === "im"
    ? { width: IM_WINDOW_WIDTH, height: IM_WINDOW_HEIGHT }
    : { width: ROOM_WINDOW_WIDTH, height: ROOM_WINDOW_HEIGHT };
const roomWindows = new Map();

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
  // Run audio capture in-process. This avoids the silent input stream seen on
  // some Windows/Linux audio drivers in Electron's sandboxed audio service.
  "AudioServiceOutOfProcess",
  // Windows: the Media Foundation D3D11 capture path returns all-black frames
  // on many webcams inside Chromium/Electron. The legacy capture path works.
  ...(process.platform === "win32"
    ? ["MediaFoundationD3D11VideoCapture", "MediaFoundationCameraUsageMonitoring"]
    : []),
].join(","));
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");
// Black/frozen local preview: GPU-backed video frames are unreliable on Windows
// and Linux drivers, so copy camera frames through shared memory instead.
if (process.platform === "win32") {
  app.commandLine.appendSwitch("disable-gpu-memory-buffer-video-frames");
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

/**
 * Without an application menu Chromium never registers the standard editing
 * accelerators, so Cmd/Ctrl+V does nothing in the desktop build and users
 * cannot paste video links into rooms. Registering roles restores them.
 */
const buildAppMenu = () => {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    { role: "fileMenu" },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "selectAll" },
      ],
    },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "Check for Updates…", click: () => void checkForUpdates({ silent: false }) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

/** Right-click cut/copy/paste, since many users paste links that way. */
const attachContextMenu = (webContents) => {
  webContents.on("context-menu", (_event, params) => {
    const items = [];
    if (params.isEditable) {
      items.push(
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut", enabled: params.editFlags?.canCut },
        { role: "copy", enabled: params.editFlags?.canCopy },
        {
          label: "Paste",
          enabled: params.editFlags?.canPaste !== false,
          click: () => webContents.paste(),
        },
        { role: "selectAll" },
      );
    } else if (params.selectionText) {
      items.push({
        label: "Copy",
        click: () => clipboard.writeText(params.selectionText),
      });
    }
    if (items.length) Menu.buildFromTemplate(items).popup();
  });
};


/* ------------------------------------------------------------------ *
 * Auto update check
 *
 * The desktop shell loads the hosted app, so web changes arrive
 * instantly. Only the shell itself (Electron/Chromium switches, menus,
 * permissions) ships in the binary, so we poll a small JSON manifest and
 * prompt the user to download a fresh build when the version is newer.
 * ------------------------------------------------------------------ */
const UPDATE_MANIFEST_URL = `${APP_URL}/api/public/desktop-version`;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let updatePromptOpen = false;
let promptedVersion = null;

/** Compare dotted numeric versions. Returns true when `a` is newer than `b`. */
const isNewerVersion = (a, b) => {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0;
  }
  return false;
};

const checkForUpdates = async ({ silent = true } = {}) => {
  if (updatePromptOpen) return;
  let manifest;
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch {
    if (!silent) {
      await dialog.showMessageBox({
        type: "warning",
        message: "Could not check for updates",
        detail: "DueChat could not reach the update server. Please try again later.",
        buttons: ["OK"],
      });
    }
    return;
  }

  const current = app.getVersion();
  const latest = manifest?.version;
  if (!latest || !isNewerVersion(latest, current)) {
    if (!silent) {
      await dialog.showMessageBox({
        type: "info",
        message: "DueChat is up to date",
        detail: `You are running version ${current}.`,
        buttons: ["OK"],
      });
    }
    return;
  }
  if (silent && promptedVersion === latest) return;
  promptedVersion = latest;

  const downloadUrl =
    manifest?.platforms?.[process.platform] || manifest?.downloadsUrl || `${APP_URL}/downloads`;

  updatePromptOpen = true;
  try {
    const { response } = await dialog.showMessageBox({
      type: "info",
      message: `DueChat ${latest} is available`,
      detail: `${manifest?.notes || "A new version of the desktop app is ready."}\n\nYou are on ${current}. Download the update and replace the current app.`,
      buttons: ["Download update", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) await shell.openExternal(downloadUrl);
  } finally {
    updatePromptOpen = false;
  }
};

/**
 * Open trusted room links ourselves instead of relying on Chromium's implicit
 * window.open handling. This is consistent across macOS, Windows and Linux and
 * keeps the default session, including the member's signed-in state.
 */
const createRoomWindow = (url, parentWindow, kind = "room") => {
  if (!isTrustedOrigin(url)) return null;
  const parsedUrl = new URL(url);
  if (!parsedUrl.pathname.startsWith("/chat/")) return null;
  parsedUrl.searchParams.set("popout", "1");
  const safeUrl = parsedUrl.toString();
  const roomKey = parsedUrl.pathname;
  const existingWindow = roomWindows.get(roomKey);
  if (existingWindow && !existingWindow.isDestroyed()) {
    if (existingWindow.isMinimized()) existingWindow.restore();
    existingWindow.show();
    existingWindow.focus();
    return existingWindow;
  }

  const { width, height } = windowSize(kind);
  const roomWindow = new BrowserWindow({
    width,
    height,
    minWidth: width,
    minHeight: height,
    maxWidth: width,
    maxHeight: height,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: kind === "im" ? "DueChat IM" : "DueChat Room",
    icon: path.join(__dirname, "icons", "icon.png"),
    // Show immediately: waiting for ready-to-show meant a slow or failed load
    // left an invisible window cached in roomWindows, so later clicks did
    // nothing at all.
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false,
      autoplayPolicy: "no-user-gesture-required",
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  roomWindows.set(roomKey, roomWindow);
  roomWindow.on("closed", () => roomWindows.delete(roomKey));
  attachContextMenu(roomWindow.webContents);
  roomWindow.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
    if (isTrustedOrigin(nextUrl)) createRoomWindow(nextUrl, roomWindow, kind);
    else void shell.openExternal(nextUrl);
    return { action: "deny" };
  });
  roomWindow.webContents.on("did-fail-load", (_e, code, desc, failedUrl, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    console.error("[DueChat] room window failed to load", code, desc, failedUrl);
    if (!roomWindow.isDestroyed()) roomWindow.destroy();
    roomWindows.delete(roomKey);
  });
  roomWindow.once("ready-to-show", () => {
    if (!roomWindow.isDestroyed()) roomWindow.show();
  });
  roomWindow.loadURL(safeUrl).catch((error) => {
    console.error("[DueChat] room window loadURL error", error);
    if (!roomWindow.isDestroyed()) roomWindow.destroy();
    roomWindows.delete(roomKey);
  });
  roomWindow.focus();
  return roomWindow;
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 375,
    minHeight: 600,
    title: "DueChat",
    icon: path.join(__dirname, "icons", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false,
      autoplayPolicy: "no-user-gesture-required",
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.loadURL(loadUrl());
  attachContextMenu(mainWindow.webContents);

  // Room pop-outs (window.open on our own origin) must open as a real desktop
  // window. Only genuinely external links go to the user's browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedOrigin(url) && new URL(url).pathname.startsWith("/chat/")) {
      createRoomWindow(url, mainWindow);
      return { action: "deny" };
    }
    void shell.openExternal(url);
    return { action: "deny" };
  });

  // Give child windows the same right-click editing menu as the main window.
  mainWindow.webContents.on("did-create-window", (childWindow) => {
    attachContextMenu(childWindow.webContents);
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(async () => {
  ipcMain.handle("duechat:open-room-window", (event, rawUrl, kind) => {
    if (typeof rawUrl !== "string" || !isTrustedOrigin(rawUrl)) return false;
    if (!new URL(rawUrl).pathname.startsWith("/chat/")) return false;
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    const senderUrl = event.sender.getURL();
    if (!senderWindow || !isTrustedOrigin(senderUrl)) return false;
    createRoomWindow(rawUrl, senderWindow, kind === "im" ? "im" : "room");
    return true;
  });
  allowMediaPermissions();
  buildAppMenu();
  await requestMediaAccess();
  createWindow();

  // Check shortly after launch, then periodically while the app stays open.
  setTimeout(() => void checkForUpdates(), 8000);
  setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

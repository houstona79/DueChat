import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ArrowLeft, Info } from "lucide-react";
import duechatLogo from "@/assets/duechat-logo.png.asset.json";
import macAsset from "@/assets/DueChat-mac.zip.asset.json";
import windowsAsset from "@/assets/DueChat-windows.zip.asset.json";
import linuxAsset from "@/assets/DueChat-linux.tar.gz.asset.json";
import appleIcon from "@/assets/apple-icon.png.asset.json";
import windowsIcon from "@/assets/windows-icon.png.asset.json";
import linuxIcon from "@/assets/linux-icon.png.asset.json";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Download DueChat — Mac, Windows & Linux" },
      {
        name: "description",
        content:
          "Download the DueChat desktop app for macOS, Windows or Linux. Chat rooms, voice and video calls, and real-time presence in one app.",
      },
      { property: "og:title", content: "Download DueChat — Mac, Windows & Linux" },
      {
        property: "og:description",
        content:
          "Download the DueChat desktop app for macOS, Windows or Linux. Chat rooms, voice and video calls, and real-time presence in one app.",
      },
    ],
  }),
  component: Downloads,
});

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 MB";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

const downloads = [
  {
    id: "mac",
    name: "macOS",
    image: appleIcon.url,
    imageAlt: "Apple logo",
    file: "DueChat-mac.zip",
    size: formatBytes(macAsset.size),
    href: macAsset.url,
    note: "Intel & Apple Silicon",
  },
  {
    id: "windows",
    name: "Windows",
    image: windowsIcon.url,
    imageAlt: "Windows logo",
    file: "DueChat-windows.zip",
    size: formatBytes(windowsAsset.size),
    href: windowsAsset.url,
    note: "Windows 10/11",
  },
  {
    id: "linux",
    name: "Linux",
    image: linuxIcon.url,
    imageAlt: "Linux penguin logo",
    file: "DueChat-linux.tar.gz",
    size: formatBytes(linuxAsset.size),
    href: linuxAsset.url,
    note: "Extract and run DueChat",
  },
];

function Downloads() {
  return (
    <main id="main-content" className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to home
        </Link>

        <div className="mt-8 text-center">
          <img
            src={duechatLogo.url}
            alt="DueChat"
            className="mx-auto h-12 w-auto object-contain sm:h-14"
          />
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Download DueChat
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Get the desktop app for your platform. One download, all your rooms, calls and
            buddies.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {downloads.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-12 place-items-center rounded-xl bg-primary/10 p-2">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    width={48}
                    height={48}
                  />
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  {item.size}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{item.name}</h2>
              <p className="text-sm text-muted-foreground">{item.note}</p>
              <p className="mt-1 text-xs font-mono text-muted-foreground/70">{item.file}</p>
              <a
                href={item.href}
                download={item.file}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Download className="size-4" aria-hidden />
                Download for {item.name}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Desktop app notes</p>
            <p className="mt-1">
              The desktop app wraps the live web app at app.duechat.com, so an internet
              connection is required. Most features work the same as in your browser; Google
              OAuth may need a browser sign-in first. Extract the archive and run the DueChat
              executable inside.
            </p>
            <p className="mt-2 font-medium text-foreground">macOS “cannot be opened” warning</p>
            <p className="mt-1">
              Because the app is not code-signed with an Apple Developer ID, macOS may show
              “DueChat cannot be opened because the developer cannot be verified.” To run it,
              right-click the DueChat app and choose <strong>Open</strong>, then click{" "}
              <strong>Open</strong> again in the dialog. Alternatively, go to{" "}
              <strong>System Settings → Privacy & Security</strong>, scroll down, and click{" "}
              <strong>Open Anyway</strong> next to the DueChat block notice.
            </p>
            <p className="mt-2 font-medium text-foreground">Microphone and camera on macOS</p>
            <p className="mt-1">
              The first time you join a voice room or turn your cam on, macOS asks for
              microphone and camera access — choose <strong>Allow</strong>. If you dismissed it
              earlier, open <strong>System Settings → Privacy &amp; Security → Microphone</strong>{" "}
              (and <strong>Camera</strong>) and switch <strong>DueChat</strong> on, then relaunch
              the app. Moving DueChat to your <strong>Applications</strong> folder before first
              launch keeps those permissions stable.
            </p>
            <p className="mt-2 font-medium text-foreground">
              Microphone and camera on Windows &amp; Linux
            </p>
            <p className="mt-1">
              On <strong>Windows 10/11</strong>, open{" "}
              <strong>Settings → Privacy &amp; security → Microphone</strong> (and{" "}
              <strong>Camera</strong>) and make sure{" "}
              <strong>Let desktop apps access your microphone/camera</strong> is on, then relaunch
              DueChat. On <strong>Linux</strong>, your user must be in the{" "}
              <code>video</code> and <code>audio</code> groups and no other app may be holding the
              device. If a call still shows no devices, close other video apps and restart DueChat.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

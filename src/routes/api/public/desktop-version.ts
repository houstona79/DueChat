import { createFileRoute } from "@tanstack/react-router";
import macAsset from "@/assets/DueChat-mac.zip.asset.json";
import windowsAsset from "@/assets/DueChat-windows.zip.asset.json";
import linuxAsset from "@/assets/DueChat-linux.tar.gz.asset.json";
import { DESKTOP_VERSION, DESKTOP_RELEASE_NOTES } from "@/lib/desktop-version";

/**
 * Public, read-only update manifest polled by the desktop (Electron) app.
 * Contains no user data, so it is safe to serve unauthenticated.
 */
export const Route = createFileRoute("/api/public/desktop-version")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const abs = (u: string) => (u.startsWith("http") ? u : `${origin}${u}`);
        return new Response(
          JSON.stringify({
            version: DESKTOP_VERSION,
            notes: DESKTOP_RELEASE_NOTES,
            downloadsUrl: `${origin}/downloads`,
            platforms: {
              darwin: abs(macAsset.url),
              win32: abs(windowsAsset.url),
              linux: abs(linuxAsset.url),
            },
          }),
          {
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=300",
              "access-control-allow-origin": "*",
            },
          },
        );
      },
    },
  },
});

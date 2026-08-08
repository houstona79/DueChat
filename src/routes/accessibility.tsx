import { createFileRoute } from "@tanstack/react-router";
import duechatLogo from "@/assets/duechat-logo.png.asset.json";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility Statement — DueChat" },
      {
        name: "description",
        content:
          "DueChat's accessibility statement and commitment to an inclusive, WCAG-compliant experience.",
      },
      { property: "og:title", content: "Accessibility Statement — DueChat" },
      {
        property: "og:description",
        content:
          "DueChat's accessibility statement and commitment to an inclusive, WCAG-compliant experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <main id="main-content" className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <a href="https://www.duechat.com" aria-label="Go to DueChat" className="inline-block">
          <img
            src={duechatLogo.url}
            alt="DueChat"
            className="mx-auto mb-8 h-14 w-auto object-contain"
          />
        </a>
        <h1 className="font-display text-2xl font-semibold">Accessibility Statement</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            DueChat is committed to making chat, voice, and video communication accessible to
            everyone, including people who use screen readers, keyboard navigation, voice control,
            or other assistive technologies. We aim to meet or exceed the Web Content Accessibility
            Guidelines (WCAG) 2.1 Level AA.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            What we do for accessibility
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Keyboard navigation: all core actions can be reached and used with a keyboard alone.
            </li>
            <li>
              Focus management: visible focus indicators and logical focus order help you know where
              you are on the page.
            </li>
            <li>
              Screen-reader support: landmark regions, labels, and live regions describe the chat
              timeline and notifications.
            </li>
            <li>
              Color contrast: text and interactive elements meet AA contrast ratios in both light and
              dark themes.
            </li>
            <li>
              Reduced motion: we respect the system “prefers reduced motion” setting to limit
              animations.
            </li>
            <li>
              Responsive design: the interface adapts to phones, tablets, and desktops so you can
              use the device that works best for you.
            </li>
          </ul>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            Known limitations
          </h2>
          <p>
            Some content shared by users — such as uploaded images, videos, GIFs, or third-party
            embeds — may not include captions or descriptions by default. We encourage the
            community to add alt text and transcripts when possible. If you encounter an
            accessibility barrier, please let us know.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">Feedback</h2>
          <p>
            We welcome feedback on accessibility. If you have trouble using any part of DueChat, or
            believe we can improve, please contact us through the platform's support channel or by
            reaching out to a moderator or admin.
          </p>
        </section>

        <div className="mt-8">
          <Link
            to="/auth"
            className="inline-flex w-full items-center justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Varity AI",
  description: "Professional AI workspace with account auth and persistent chats.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fallbackStyles = `
    :root {
      color-scheme: dark;
      --bg: #090d1a;
      --panel: #10182f;
      --panel-2: #141f3d;
      --text: #edf2ff;
      --muted: #9aa7c8;
      --accent: #5878ff;
      --border: #253052;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(1200px 700px at 3% 0%, #1a2650 0%, var(--bg) 46%);
      color: var(--text);
    }
    a { color: inherit; text-decoration: none; }
    .auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; }
    .auth-card {
      width: min(460px, 100%);
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01));
      border-radius: 20px;
      padding: 2rem;
    }
    .auth-form { display: grid; gap: .95rem; }
    .auth-form label { display: grid; gap: .45rem; color: var(--muted); }
    .auth-form input, .composer textarea, .search-input {
      width: 100%;
      background: #0d1530;
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text);
      padding: .75rem;
      font: inherit;
    }
    .auth-submit, .composer button, .new-chat-btn {
      border: 1px solid transparent;
      border-radius: 11px;
      background: var(--accent);
      color: #fff;
      padding: .75rem 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .dashboard-wrap {
      height: 100dvh;
      display: grid;
      grid-template-columns: 310px 1fr;
      overflow: hidden;
    }
    .sidebar {
      border-right: 1px solid var(--border);
      background: rgba(12,18,37,.92);
      padding: 1.3rem 1rem 1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 0;
      overflow: hidden;
    }
    .chat-main {
      height: 100dvh;
      min-height: 0;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr auto auto;
      gap: .85rem;
      padding: 1rem;
    }
    .messages-panel {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--panel);
      padding: 1rem;
      overflow-y: auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: .7rem;
    }
    .msg {
      max-width: 85%;
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: .75rem .9rem;
      line-height: 1.45;
      background: var(--panel-2);
    }
    .msg.user { margin-left: auto; background: #243769; }
    .muted { color: var(--muted); }
  `;

  const assetRecoveryScript = `
    (function () {
      var key = "varity-asset-recovery-count";
      function shouldRecover() {
        try {
          var count = Number(sessionStorage.getItem(key) || "0");
          if (count >= 2) return false;
          sessionStorage.setItem(key, String(count + 1));
          return true;
        } catch (_) {
          return true;
        }
      }

      function handleAssetFailure(url) {
        if (!url) return;
        var isNextAsset = url.indexOf("/_next/static/css/") >= 0 || url.indexOf("/_next/static/chunks/") >= 0;
        if (!isNextAsset) return;
        if (!shouldRecover()) return;
        window.location.reload();
      }

      window.addEventListener("error", function (event) {
        var target = event && event.target;
        if (!target) return;
        if (target.tagName === "LINK" || target.tagName === "SCRIPT") {
          handleAssetFailure(target.href || target.src || "");
        }
      }, true);

      window.addEventListener("unhandledrejection", function (event) {
        var reason = event && event.reason;
        var message = reason && (reason.message || String(reason));
        if (typeof message === "string" && message.indexOf("ChunkLoadError") >= 0 && shouldRecover()) {
          window.location.reload();
        }
      });
    })();
  `;

  return (
    <html lang="en">
      <body>
        <style id="fallback-inline-styles">{fallbackStyles}</style>
        <Script id="asset-recovery" strategy="beforeInteractive">
          {assetRecoveryScript}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

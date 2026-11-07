import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Inglesando — a personal English coach built from your own mistakes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // Committed font file: never fetched over the network.
  const inter = await readFile(join(process.cwd(), "src/app/fonts/Inter-Light.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf9f6",
          color: "#000000",
          padding: "80px 96px",
          fontFamily: "Inter",
          fontWeight: 300,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 32, fontSize: 120, letterSpacing: "-0.03em", lineHeight: 1 }}
        >
          <svg width="144" height="144" viewBox="0 0 32 32">
            <rect x="12" y="2" width="8" height="8" fill="#0007cb" />
            <rect x="12" y="12.5" width="8" height="12.5" fill="#111111" />
            <rect x="3" y="26.5" width="26" height="4" fill="#0007cb" />
          </svg>
          <span>Inglesando</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 48, lineHeight: 1.3 }}>
            <span>She&nbsp;</span>
            <span
              style={{
                borderBottom: "4px solid #0007cb",
                paddingBottom: 2,
              }}
            >
              don&apos;t
            </span>
            <span>&nbsp;like coffee.</span>
          </div>
          <div style={{ fontSize: 28, color: "#767676" }}>
            A personal English coach built from your own mistakes.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter", data: inter, weight: 300, style: "normal" }] },
  );
}

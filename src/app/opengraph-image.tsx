import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Grifando — a personal English coach built from your own mistakes";
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
            <g transform="translate(3.25 1)">
              <circle cx="14" cy="10.5" r="6.5" fill="none" stroke="#111111" strokeWidth="4" />
              <path d="M20.5 4v14" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
              <path
                d="M20.5 18c0 5-2.6 8-5.8 8-3.6 0-4.3-3.6-7.6-3.6-2 0-3.2 1.1-4.1 2.5"
                fill="none"
                stroke="#0007cb"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
          <span>Grifando</span>
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

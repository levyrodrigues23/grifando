import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { connection } from "next/server";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSiteUrl } from "@/lib/siteUrl";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Editorial counterpoint: the learner's own prose and page standfirsts.
const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
});

const DESCRIPTION = "Personal writing coach for English, built from your own mistakes.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "Inglesando", template: "%s · Inglesando" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Inglesando",
    title: "Inglesando",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Inglesando", description: DESCRIPTION },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The CSP nonce is per request, so no page may be prerendered at build time:
  // a static page would ship scripts without the nonce and the CSP would block them.
  await connection();
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}

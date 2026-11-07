import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import { connection } from "next/server";
import "./globals.css";

import { SiteHeader } from "@/components/layout/SiteHeader";

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

export const metadata: Metadata = {
  title: "Inglesando",
  description: "Personal writing coach for English, built from your own mistakes.",
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
        <footer className="mx-auto w-full max-w-[1200px] px-6 pt-24 pb-10 md:px-12">
          <p className="label-mono text-smoke">
            Inglesando · scores are AI-generated heuristics, not a proficiency test ·{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-iron">
              Privacy
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}

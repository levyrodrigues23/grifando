import type { Metadata } from "next";

import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { AIKeyForm } from "@/components/settings/AIKeyForm";

export const metadata: Metadata = {
  title: "Your AI key",
  description: "Use your own AI key for feedback. A free Gemini key takes about two minutes.",
};

const AI_STUDIO_URL = "https://aistudio.google.com/apikey";
const ANTHROPIC_CONSOLE_URL = "https://console.anthropic.com/settings/keys";

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-iron">
      {children}
    </a>
  );
}

export default function SettingsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Your AI key"
        description="Feedback comes from an AI model you choose, using your own key. A free Gemini key takes about two minutes to get."
      />

      <div className="grid gap-x-16 gap-y-12 pb-24 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-10">
          <AIKeyForm />

          <section aria-labelledby="key-storage-title" className="space-y-3">
            <h2 id="key-storage-title" className="text-heading-sm">
              Where your key lives
            </h2>
            <p className="text-iron">
              Your key stays only in this browser. It is sent with each AI request, passed straight
              to your provider, and never stored or logged on our side. Remove it here at any time.
            </p>
          </section>

          <section aria-labelledby="free-tier-title" className="space-y-3">
            <h2 id="free-tier-title" className="text-heading-sm">
              Before you use a free key
            </h2>
            <p className="text-iron">
              On Gemini&rsquo;s free tier Google may use what you send to improve its products — use
              a paid key or Anthropic for anything sensitive.
            </p>
            <p lang="pt-BR" className="text-iron">
              No plano gratuito do Gemini, o Google pode usar o que você envia para melhorar os
              produtos dele — use uma chave paga ou a Anthropic para qualquer coisa sensível.
            </p>
          </section>
        </div>

        <aside className="space-y-10 rounded-card bg-linen px-6 py-8 md:px-8">
          <section aria-labelledby="gemini-guide-title" className="space-y-4">
            <h2 id="gemini-guide-title" className="text-heading-sm">
              Get a free Gemini key
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-iron">
              <li>
                Open <ExternalLink href={AI_STUDIO_URL}>Google AI Studio</ExternalLink> and sign in
                with your Google account.
              </li>
              <li>Click &ldquo;Create API key&rdquo;.</li>
              <li>Copy the key, paste it here, choose Gemini and press Save &amp; test.</li>
            </ol>
          </section>

          <section lang="pt-BR" aria-labelledby="gemini-guide-pt-title" className="space-y-4">
            <h2 id="gemini-guide-pt-title" className="text-heading-sm">
              Como pegar uma chave grátis do Gemini
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-iron">
              <li>
                Abra o <ExternalLink href={AI_STUDIO_URL}>Google AI Studio</ExternalLink> e entre com
                sua conta Google.
              </li>
              <li>Clique em &ldquo;Create API key&rdquo;.</li>
              <li>Copie a chave, cole aqui, escolha Gemini e clique em Save &amp; test.</li>
            </ol>
          </section>

          <p className="text-sm text-muted-foreground">
            Using Anthropic? Create a key in the{" "}
            <ExternalLink href={ANTHROPIC_CONSOLE_URL}>Anthropic Console</ExternalLink>.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}

import type { Metadata } from "next";

import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { DeleteMyDataButton } from "@/components/privacy/DeleteMyDataButton";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Inglesando stores, how long, and how to delete it.",
};

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-heading-sm">
        {title}
      </h2>
      <div className="space-y-3 text-iron">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageHeader
        title="Privacy"
        description="No account, no email. Here is what Inglesando keeps, what it sends out, and how to wipe it."
      />

      <div className="space-y-16 pb-24">
        <div className="max-w-[720px] space-y-10">
          <Block id="stored-en" title="What we store">
            <p>
              The texts you write, their analyses, your mistakes, exercises and attempts, your
              interview practice answers, and your vocabulary. They are kept under a random id held in a cookie in your browser. We do
              not ask for or store your name, email or any login.
            </p>
          </Block>
          <Block id="sent-en" title="What we send to an AI provider">
            <p>
              To analyse your writing and make exercises, your text is sent to the AI provider you
              chose (Gemini or Anthropic), using your own key.
            </p>
            <p>
              On Gemini&rsquo;s free tier, Google may use what you send to improve its products. Use
              a paid key or Anthropic for anything sensitive.
            </p>
          </Block>
          <Block id="never-en" title="What we never store">
            <p>
              Your AI key. It stays in this browser, travels with each request to your provider, and
              is not saved or logged on our side.
            </p>
          </Block>
          <Block id="analytics-en" title="Analytics">
            <p>Analytics are cookieless and aggregate (Vercel Web Analytics).</p>
          </Block>
          <Block id="retention-en" title="How long we keep it">
            <p>
              Data is deleted automatically after 90 days without activity. You can delete it right
              now:
            </p>
            <DeleteMyDataButton />
          </Block>
        </div>

        <div lang="pt-BR" className="max-w-[720px] space-y-10">
          <h2 className="text-heading">Privacidade</h2>
          <Block id="stored-pt" title="O que guardamos">
            <p>
              Os textos que você escreve, as análises, seus erros, exercícios e tentativas, suas
              respostas nas entrevistas de treino e seu vocabulário. Tudo fica ligado a um id aleatório guardado em um cookie no seu navegador.
              Não pedimos nem guardamos nome, e-mail ou login.
            </p>
          </Block>
          <Block id="sent-pt" title="O que enviamos a um provedor de IA">
            <p>
              Para analisar sua escrita e criar exercícios, seu texto é enviado ao provedor de IA que
              você escolheu (Gemini ou Anthropic), usando a sua própria chave.
            </p>
            <p>
              No plano gratuito do Gemini, o Google pode usar o que você envia para melhorar os
              produtos dele. Use uma chave paga ou a Anthropic para qualquer coisa sensível.
            </p>
          </Block>
          <Block id="never-pt" title="O que nunca guardamos">
            <p>
              Sua chave de IA. Ela fica só neste navegador, vai junto de cada pedido ao seu provedor
              e não é salva nem registrada do nosso lado.
            </p>
          </Block>
          <Block id="analytics-pt" title="Métricas de uso">
            <p>As métricas são sem cookies e agregadas (Vercel Web Analytics).</p>
          </Block>
          <Block id="retention-pt" title="Por quanto tempo guardamos">
            <p>
              Os dados são apagados automaticamente após 90 dias sem atividade. Para apagar agora,
              use o botão &ldquo;Delete my data&rdquo; acima.
            </p>
          </Block>
        </div>
      </div>
    </PageShell>
  );
}

## O que muda

<!-- Resumo curto do comportamento novo/corrigido e do porquê. -->

## Issues

<!-- Closes #N — uma linha por issue fechada; "Refs #N" para relacionadas. -->

Closes #

## Como testei

- [ ] `pnpm check` (typecheck + lint + testes) passa localmente
- [ ] Testei manualmente no navegador (descreva o fluxo abaixo, se aplicável)

## Checklist

- [ ] Segue a arquitetura do `CLAUDE.md` (rotas finas → serviços de domínio → repositórios)
- [ ] Respostas de IA validadas com Zod; método novo do `AIProvider` implementado em **anthropic e gemini**
- [ ] Migration criada com `pnpm db:migrate` (se o schema mudou)
- [ ] UI usa os tokens do `DESIGN.md` (sem cores stock do Tailwind); screenshots anexados se a UI mudou
- [ ] Nenhuma chave, segredo ou `.env` no diff; chaves de IA do usuário nunca são logadas nem persistidas
- [ ] Documentação atualizada (README / SPEC / CLAUDE.md), se aplicável

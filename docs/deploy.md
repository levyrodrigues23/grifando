# Guia de deploy (Vercel + Postgres)

Passo a passo para publicar o Inglesando na Vercel, sem precisar ser especialista. Plano gratuito basta.

> **Importante:** nenhuma chave de IA é configurada no servidor. Cada visitante cola a própria chave em `/settings`. Não crie `GEMINI_API_KEY` nem `ANTHROPIC_API_KEY` na Vercel.

## 1. Conta e importação do repositório

1. Entre em <https://vercel.com/signup> e escolha **Continue with GitHub**.
2. Em **Add New… › Project**, importe `levyrodrigues23/inglesando`. Framework: Next.js (detectado sozinho).
3. O Build Command já vem do `vercel.json` (`pnpm vercel-build`): não precisa mudar nada. Esse script confere os segredos obrigatórios, aplica as migrações do banco (só em produção) e depois roda `next build`.
4. Em **Settings › Git**, o branch de produção é `main`. Desative os deploys de preview (por exemplo, em **Ignored Build Step** use `exit 1` para branches diferentes de `main`, ou desligue previews para pull requests). Assim só `main` é publicado e o banco de produção não é tocado por outros branches.

## 2. Banco de dados Postgres

1. Na aba **Storage**, clique em **Create Database** e escolha **Neon** (Postgres, via Marketplace), plano **Free**.
2. Conecte o banco ao projeto em ambiente **Production** (os previews ficam desligados, então basta Production).
3. A integração cria variáveis automaticamente. As que importam:
   - `DATABASE_URL`: conexão com pool (é a que o app usa).
   - `DATABASE_URL_UNPOOLED`: conexão direta. O `scripts/vercel-build.mjs` usa essa para rodar as migrações, se existir.
4. O app lê `DATABASE_URL`, e o nome já é esse. Só se a Vercel pedir um **Custom Prefix** (porque já existe uma `DATABASE_URL` sua) é que o nome muda. Nesse caso crie manualmente `DATABASE_URL` com o valor da variável com prefixo.

O build de produção falha de propósito se `SESSION_SECRET`, `IP_HASH_SALT`, `CRON_SECRET` ou `DATABASE_URL` estiverem vazias (só os nomes faltantes aparecem no log).

Não precisa rodar migração à mão: o build de produção faz `prisma migrate deploy`.

## 3. Variáveis de ambiente

Em **Settings › Environment Variables**, adicione (ambiente Production) estas três. Gere cada valor, um por vez, com:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

| Variável | Para quê |
| --- | --- |
| `SESSION_SECRET` | assina o cookie de sessão anônima |
| `IP_HASH_SALT` | sal do hash de IP usado no limite de requisições |
| `CRON_SECRET` | protege `/api/cron/cleanup` (a Vercel envia como `Authorization: Bearer`) |

Use um valor **diferente** para cada uma e não os compartilhe nem os commite.

Opcional: `NEXT_PUBLIC_SITE_URL` (ex.: `https://meudominio.com`), só se usar domínio próprio. Sem ela, o app usa a URL de produção da Vercel.

Não defina `AI_PROVIDER`, `GEMINI_*` nem `ANTHROPIC_*`.

## 4. Analytics e deploy

1. Em **Analytics**, clique em **Enable**.
2. Clique em **Deploy** (ou faça um novo deploy de `main` se já tiver feito o primeiro). Confira no log do build que `prisma migrate deploy` rodou e passou.

## 5. Teste de fumaça (marque depois do deploy)

Na URL publicada:

- [ ] Visitante novo recebe o cookie de sessão (DevTools › Application › Cookies › `ig_session`).
- [ ] `/write` sem chave de IA mostra o aviso pedindo a chave.
- [ ] Em `/settings`, salvar uma chave e testar mostra "works".
- [ ] Escrever um texto leva à página corrigida (proofed).
- [ ] Os exercícios funcionam.
- [ ] "Delete my data" apaga tudo.
- [ ] Os headers de resposta incluem o `Content-Security-Policy` (DevTools › Network).
- [ ] `/robots.txt` e `/sitemap.xml` respondem 200.
- [ ] `/api/cron/cleanup` sem o segredo responde 401.

## 6. Tornar o repositório público

Só depois de **todos** os itens acima passarem: GitHub › **Settings › General › Danger Zone › Change visibility › Public**. Se algo falhar, corrija este guia ou o código antes de publicar.

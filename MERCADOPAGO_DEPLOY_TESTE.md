# Mercado Pago Deploy e Teste

## Passo 1. Publicar as Edge Functions

### Opcao A. Usando Supabase CLI

Se ainda nao tiver o CLI instalado:

```bash
npm install -g supabase
```

Login no Supabase:

```bash
supabase login
```

Linkar o projeto pelo project ref:

```bash
supabase link --project-ref zqbplfwzpypzorasgdxf
```

Definir secrets das funcoes:

```bash
supabase secrets set APP_SUPABASE_URL=https://zqbplfwzpypzorasgdxf.supabase.co
supabase secrets set APP_SUPABASE_ANON_KEY=COLE_SUA_ANON_KEY
supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY=COLE_SUA_SERVICE_ROLE_KEY
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=TEST-COLE_SEU_TOKEN
supabase secrets set PUBLIC_SITE_URL=http://127.0.0.1:5500
```

Publicar as functions:

```bash
supabase functions deploy create-mercadopago-preference
supabase functions deploy mercadopago-webhook
```

### Opcao B. Pelo painel do Supabase

1. Abra Edge Functions no painel
2. Crie ou publique as duas functions com o conteudo dos arquivos:
   - `supabase/functions/create-mercadopago-preference/index.ts`
   - `supabase/functions/mercadopago-webhook/index.ts`
3. Como os arquivos agora sao autonomos, nao e necessario criar `_shared/cors.ts` no painel
4. Cadastre os secrets:
   - `APP_SUPABASE_URL`
   - `APP_SUPABASE_ANON_KEY`
   - `APP_SUPABASE_SERVICE_ROLE_KEY`
   - `MERCADO_PAGO_ACCESS_TOKEN`
   - `PUBLIC_SITE_URL`
5. Em `mercadopago-webhook`, abra `Settings` e desative `Verify JWT with legacy secret` ou qualquer opcao equivalente de verificacao obrigatoria de JWT
6. Em `create-mercadopago-preference`, mantenha a verificacao de JWT ativa

## Passo 2. Pegar o token de teste do Mercado Pago

1. Entre em https://www.mercadopago.com.br/developers/panel
2. Abra Credenciais
3. Selecione o ambiente de teste
4. Copie o Access Token de teste, que normalmente comeca com `TEST-`
5. Use esse valor em `MERCADO_PAGO_ACCESS_TOKEN`

Observacao:

- `Public key` pode ser usada no frontend em alguns fluxos do Mercado Pago, mas neste projeto o checkout esta saindo pela Edge Function, entao o essencial agora e o `Access Token`
- `Service role key` do Supabase fica apenas nas Edge Functions

## Passo 3. Teste ponta a ponta

### Preparacao

1. Confirme que os SQLs `001`, `002`, `003` e `004` ja foram executados
2. Confirme que as Edge Functions foram publicadas
3. Confirme que `PUBLIC_SITE_URL` aponta para a URL do seu site atual

### Fluxo de teste

1. Faça login no site com um usuario de teste
2. Adicione um produto ao carrinho
3. Se quiser, aplique `PRIMEIRACOMPRA`
4. Clique em `Continuar compra`
5. O sistema deve:
   - criar ou atualizar um pedido em `orders`
   - criar os itens em `order_items`
   - redirecionar para o checkout do Mercado Pago
6. Conclua o pagamento em modo teste no Mercado Pago
7. Aguarde o webhook
8. Verifique no Supabase:
   - `orders.status` deve virar `approved` ou `paid`
   - `orders.payment_status` deve virar `paid`
   - `provider_payment_id` deve ser preenchido
   - `coupon_redemptions` deve receber o cupom, se houve desconto
9. Volte para `Minha Conta` e confira o pedido listado

### Se nao redirecionar para o checkout

Verifique:

- se a function `create-mercadopago-preference` foi publicada
- se `MERCADO_PAGO_ACCESS_TOKEN` esta correto
- se `SUPABASE_SERVICE_ROLE_KEY` foi configurada
- se o pedido existe em `orders`
- se os itens existem em `order_items`

### Se o pagamento nao atualizar sozinho

Verifique:

- se a function `mercadopago-webhook` foi publicada
- se a verificacao de JWT do webhook foi desativada nas settings da function
- se a URL de webhook esta cadastrada no Mercado Pago
- se o webhook esta recebendo eventos `payment`
- se a function `finalize_order_payment` existe no schema `public`

## URL de webhook

Use no Mercado Pago:

```text
https://zqbplfwzpypzorasgdxf.supabase.co/functions/v1/mercadopago-webhook
```

## Checklist rapido

- SQL 001 executado
- SQL 002 executado
- SQL 003 executado
- SQL 004 executado
- Access Token de teste configurado
- Service Role configurada
- Functions publicadas
- Webhook configurado
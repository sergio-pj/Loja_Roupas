# Mercado Pago Setup

## O que esta incluido

- Edge Function para criar preferencia de pagamento no Mercado Pago
- Edge Function para receber webhook do Mercado Pago
- Carrinho redirecionando para o checkout retornado pela funcao
- Cada function agora e autonoma, sem depender de arquivo compartilhado, para facilitar deploy direto pelo painel do Supabase

## Variaveis necessarias

Configure estas variaveis no Supabase Edge Functions:

- `APP_SUPABASE_URL`
- `APP_SUPABASE_ANON_KEY`
- `APP_SUPABASE_SERVICE_ROLE_KEY`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `PUBLIC_SITE_URL`

## Funcoes criadas

- `create-mercadopago-preference`
- `mercadopago-webhook`

## Fluxo

1. O carrinho cria/atualiza o pedido em `orders`
2. O frontend chama `create-mercadopago-preference`
3. A funcao consulta `orders` e `order_items`, monta a preferencia e retorna a URL de checkout
4. O cliente paga no Mercado Pago
5. O Mercado Pago chama `mercadopago-webhook`
6. O webhook consulta o pagamento no Mercado Pago e chama `finalize_order_payment`

## Deploy com Supabase CLI

```bash
supabase functions deploy create-mercadopago-preference
supabase functions deploy mercadopago-webhook
```

## URL de webhook

Depois do deploy, configure no painel do Mercado Pago a URL:

```text
https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook
```

## Observacoes

- Use token `TEST-...` no ambiente de testes do Mercado Pago
- Nunca coloque `service_role` ou `access_token` no frontend
- A funcao `finalize_order_payment` deve continuar sendo acionada apenas pelo backend/webhook
- Em `mercadopago-webhook`, desative a verificacao obrigatoria de JWT nas settings da function para o Mercado Pago conseguir chamar a URL

## Guia operacional

Para o passo a passo completo de deploy, token e teste ponta a ponta, veja:

- `MERCADOPAGO_DEPLOY_TESTE.md`
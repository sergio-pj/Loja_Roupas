# Ton Setup (Link de Pagamento PIX)

## O que foi integrado no projeto

- Checkout do carrinho agora usa a Edge Function `create-ton-checkout`
- A function valida usuario e pedido e marca `orders` como `awaiting_payment`
- O cliente e redirecionado para o link de pagamento Ton configurado

## Variaveis necessarias (Supabase Edge Functions)

- `APP_SUPABASE_URL`
- `APP_SUPABASE_ANON_KEY`
- `APP_SUPABASE_SERVICE_ROLE_KEY`
- `TON_PAYMENT_LINK`

Exemplo de valor para `TON_PAYMENT_LINK`:

```text
https://payment-link-v3.ton.com.br/pl_E0wydvoeWzxYpo9iKlI8J6DnO9ZgQNG8
```

## Deploy da function

```bash
supabase functions deploy create-ton-checkout
```

## SQL necessario

Execute no SQL Editor do Supabase:

1. `supabase/004_payment_workflow.sql`
2. `supabase/007_ton_manual_confirmation.sql`

## Confirmacao manual do pagamento

Como o link Ton nao envia webhook nessa integracao atual, a aprovacao do pedido fica manual.

Depois de confirmar que o PIX caiu, execute:

```sql
select public.confirm_ton_payment(
  'UUID_DO_PEDIDO',
  'ID_COMPROVANTE_OPCIONAL',
  'Pagamento confirmado na conta Ton.'
);
```

Isso altera o pedido para:

- `status = 'approved'`
- `payment_status = 'paid'`
- `payment_provider = 'ton'`

## Dados que voce precisa pedir para a conta Ton recebedora

- Link de pagamento oficial Ton (o link `pl_...` que vai receber os PIX)
- Nome do titular da conta recebedora (para conferencia interna)
- CPF ou CNPJ do recebedor (para auditoria e suporte)
- Se o link e fixo ou se ele vai trocar periodicamente
- Confirmacao de quem vai notificar pagamento recebido (nome + WhatsApp)
- SLA de confirmacao manual (ex.: confirmar em ate 5, 15 ou 30 minutos)
- Regra de estorno/cancelamento (quem aprova e em quanto tempo)

## Recomendacao operacional

- Crie uma rotina diaria para revisar pedidos com `status = 'awaiting_payment'`
- Confirmou recebimento no Ton: rode `confirm_ton_payment`
- Se nao houve pagamento: mantenha pendente ou cancele o pedido manualmente

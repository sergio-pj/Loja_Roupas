# Deploy Checklist

## Pode ir para GitHub/Vercel

- HTML, CSS e JavaScript do projeto
- Arquivos SQL de estrutura, como `supabase/001_profiles.sql` e `supabase/002_addresses.sql`
- Chave publica do Supabase usada no frontend (`anon` ou `publishable`)

## Nao deve ir para GitHub

- `service_role key` do Supabase
- `.env` com segredos
- backups de clientes, planilhas, CSVs, dumps de banco
- qualquer exportacao com dados reais de usuarios

## Antes do deploy

1. Execute no Supabase os arquivos SQL em ordem:
   - `supabase/001_profiles.sql`
   - `supabase/002_addresses.sql`
   - `supabase/003_orders_coupons.sql`
   - `supabase/004_payment_workflow.sql`
2. Verifique se RLS esta ativa nas tabelas `profiles` e `addresses`
3. Confirme que nenhuma chave administrativa foi colocada no frontend
4. Confirme que dados de cliente nao existem em arquivos locais do projeto
5. Configure as variaveis das Edge Functions para Supabase e Mercado Pago
6. Publique as funcoes `create-mercadopago-preference` e `mercadopago-webhook`

## Arquitetura correta

- GitHub guarda o codigo
- Vercel publica o frontend
- Supabase armazena autenticacao e dados dos clientes

## Observacao

Mesmo em deploy publico, os dados continuam no Supabase. A seguranca depende de RLS, policies corretas e de nao expor chaves administrativas.
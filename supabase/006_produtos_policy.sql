-- 006_produtos_policy.sql
-- Políticas RLS recomendadas para a tabela `produtos`.
-- Execute este script no SQL Editor do Supabase (ou via psql) para permitir
-- que usuários autenticados insiram produtos (evita o erro "new row violates row-level security policy").

-- Habilita RLS (se ainda não estiver habilitado)
ALTER TABLE IF EXISTS public.produtos ENABLE ROW LEVEL SECURITY;

-- Policy: permite INSERTs por usuários autenticados
DROP POLICY IF EXISTS allow_insert_authenticated ON public.produtos;
CREATE POLICY allow_insert_authenticated
  ON public.produtos
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- (Opcional) Policy: permitir SELECT público para listar produtos
DROP POLICY IF EXISTS allow_select_public ON public.produtos;
CREATE POLICY allow_select_public
  ON public.produtos
  FOR SELECT
  USING (true);

-- Observações:
-- 1) Após executar, verifique em Authentication -> Users se o usuário "aranha.admin@gmail.com"
--    existe. Se não existir, crie-o (Auth -> Users -> New user) usando a senha aranha123.
-- 2) Faça login usando a conta criada (no seu site) — isso gerará uma sessão Supabase
--    que satisfaz auth.role() = 'authenticated' e permitirá INSERTs.
-- 3) Se preferir, crie uma policy mais restrita (por exemplo apenas para um role/manutenção específica).

-- 008_produtos_admin_policy.sql
-- Restringe gerenciamento de produtos ao email admin e mantém leitura pública.

ALTER TABLE IF EXISTS public.produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_select_public ON public.produtos;
DROP POLICY IF EXISTS select_authenticated ON public.produtos;
CREATE POLICY allow_select_public
  ON public.produtos
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS allow_insert_authenticated ON public.produtos;
DROP POLICY IF EXISTS allow_insert_admin_email ON public.produtos;
CREATE POLICY allow_insert_admin_email
  ON public.produtos
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND lower(coalesce(auth.jwt()->>'email', '')) = 'aranha.admin@gmail.com'
  );

DROP POLICY IF EXISTS allow_update_admin_email ON public.produtos;
CREATE POLICY allow_update_admin_email
  ON public.produtos
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND lower(coalesce(auth.jwt()->>'email', '')) = 'aranha.admin@gmail.com'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND lower(coalesce(auth.jwt()->>'email', '')) = 'aranha.admin@gmail.com'
  );

DROP POLICY IF EXISTS allow_delete_admin_email ON public.produtos;
CREATE POLICY allow_delete_admin_email
  ON public.produtos
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND lower(coalesce(auth.jwt()->>'email', '')) = 'aranha.admin@gmail.com'
  );

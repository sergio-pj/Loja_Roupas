Supabase: criar tabela e bucket necessários para o painel admin

Passos rápidos para testar o painel administrativo:

1) Criar tabela `produtos`
- Abra o Supabase Studio -> SQL Editor
- Cole o conteúdo de `supabase/005_create_produtos.sql` e execute

2) Criar bucket de Storage
- Vá em Storage -> Buckets -> New bucket
- Nome: `public`
- Marque como público (opcional) para `getPublicUrl` funcionar sem regras extras

3) (Opcional) Criar usuário admin no Auth
- Auth -> Users -> New user
- Email: `aranha.admin@gmail.com` (ou seu e-mail de teste)
- Password: `aranha123`

4) Teste
- No navegador, abra o site local (`pages/login/index.html`) ou deployed
- Faça login com as credenciais do admin (se criou o usuário no Auth),
  ou use o login local já implementado (aranha.admin@gmail.com / aranha123)
- Vá em Minha Conta -> Gerenciar site -> tente adicionar um produto

Se houver erros, copie a mensagem exibida na tela ou no console do navegador e me envie.

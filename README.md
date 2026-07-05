<div align="center">
# 🕷️ Aranha Store
**E-commerce de moda premium — elegância sutil, qualidade excepcional.**
[![License](https://img.shields.io/badge/license-Propriet%C3%A1ria-red.svg)](./LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
</div>
---
## 📖 Sobre o Projeto
A **Aranha Store** é uma loja virtual completa para uma marca brasileira de camisetas premium. O projeto foi desenvolvido do zero com HTML, CSS e JavaScript puro — sem frameworks — e utiliza **Supabase** como back-end (banco de dados, autenticação e funções serverless) e **Ton** como provedor de pagamento via link PIX.
> _"Descubra a elegância sutil da Aranha. Qualidade excepcional, design atemporal."_
---
## ✨ Funcionalidades
| Área | Funcionalidades |
|------|----------------|
| 🛍️ **Catálogo** | Listagem de produtos com filtros por categoria (Camisetas / Oversized) e cor (Clara / Escura) |
| 👕 **Produto** | Página de detalhe com galeria de imagens em carrossel, seleção de tamanho e adição ao carrinho |
| 🛒 **Carrinho** | Gerenciamento de itens via localStorage, atualização de quantidade, remoção e aplicação de cupom |
| 🎟️ **Cupons** | Sistema de desconto (ex.: `PRIMEIRACOMPRA`) validado no back-end |
| 💳 **Checkout** | Integração com Ton — link de pagamento PIX retornado por Edge Function |
| 🔔 **Operação** | Confirmação de pagamento feita no Supabase após validação do recebimento |
| 👤 **Autenticação** | Cadastro e login com Supabase Auth; sessão persistida no localStorage |
| 📦 **Minha Conta** | Histórico de pedidos, dados do perfil e endereços de entrega |
| 📱 **Responsivo** | Layout adaptável para mobile, tablet e desktop com menu hamburger |
| ⭐ **Avaliações** | Carrossel de depoimentos de clientes na home com autoplay |
---
## 🏗️ Arquitetura
```
┌──────────────────┐     deploy     ┌─────────────────┐
│  GitHub           │ ────────────→ │  Vercel          │
│  (repositório)    │               │  (frontend)      │
└──────────────────┘               └────────┬────────┘
                                            │ HTTPS
                                   ┌────────▼────────┐
                                   │  Supabase        │
                                   │  ├─ PostgreSQL   │
                                   │  ├─ Auth         │
                                   │  └─ Edge Funcs   │
                                   └────────┬────────┘
                                            │ API
                                   ┌────────▼────────┐
                                   │  Ton             │
                                   │  (PIX por link)  │
                                   └─────────────────┘
```
---
## 🗂️ Estrutura do Projeto
```
Loja_Roupas/
│
├── index.html                    # Página inicial (home)
├── script.js                     # JS principal (carrosséis, menu, auth)
├── style.css                     # Estilos globais
│
├── pages/
│   ├── catalogo/                 # Listagem e filtro de produtos
│   ├── produto/                  # Detalhe do produto
│   ├── carrinho/                 # Carrinho de compras + checkout
│   ├── login/                    # Login e cadastro
│   ├── minha-conta/              # Área do cliente
│   ├── quemsomos/                # Sobre a marca
│   └── contato/                  # Contato e suporte
│
├── json/
│   ├── storefront.js             # Gerenciamento de carrinho e autenticação (IIFE global)
│   ├── supabase.js               # Inicialização do cliente Supabase
│   └── package.json              # Dependências (supabase-js)
│
├── assets/                       # Imagens, logotipos e mockups
│
├── supabase/
│   ├── 001_profiles.sql          # Tabela de perfis de usuário
│   ├── 002_addresses.sql         # Endereços de entrega
│   ├── 003_orders_coupons.sql    # Pedidos e cupons de desconto
│   ├── 004_payment_workflow.sql  # Campos e função de pagamento
│   └── functions/
│       └── create-ton-checkout/            # Retorna link de pagamento Ton
│
├── .env.example                  # Modelo das variáveis de ambiente
├── DEPLOY_CHECKLIST.md           # Checklist de segurança para deploy
├── TON_SETUP.md                  # Guia de configuração da Ton e confirmação manual
├── MERCADOPAGO_SETUP.md          # Guia legado da integração anterior
├── MERCADOPAGO_DEPLOY_TESTE.md   # Guia legado de deploy e testes anteriores
└── LICENSE                       # Licença do projeto
```
---
## 🚀 Como Rodar Localmente
### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (para deploy das Edge Functions)
- Conta no [Supabase](https://supabase.com) com projeto criado
- Conta Ton com Link de Pagamento PIX ativo
- Extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) no VS Code (recomendado)
### Passo a passo
#### 1. Clone o repositório
```bash
git clone https://github.com/sergio-pj/Loja_Roupas.git
cd Loja_Roupas
```
#### 2. Instale as dependências
```bash
cd json
npm install
```
#### 3. Configure as variáveis de ambiente
Copie o arquivo de exemplo e preencha com os seus valores:
```bash
cp .env.example .env
```
| Variável | Onde encontrar |
|----------|---------------|
| `APP_SUPABASE_URL` | Painel do Supabase → Settings → API |
| `APP_SUPABASE_ANON_KEY` | Painel do Supabase → Settings → API |
| `APP_SUPABASE_SERVICE_ROLE_KEY` | Painel do Supabase → Settings → API (⚠️ use apenas em Edge Functions) |
| `TON_PAYMENT_LINK` | Link de pagamento da Ton no formato `https://payment-link-v3.ton.com.br/pl_...` |
| `PUBLIC_SITE_URL` | `http://127.0.0.1:5500` para desenvolvimento local |
> ⚠️ **Nunca commite o arquivo `.env`!** Ele já está no `.gitignore`.
#### 4. Execute os scripts SQL no Supabase
No painel do Supabase → SQL Editor, execute **na ordem**:
```
1. supabase/001_profiles.sql
2. supabase/002_addresses.sql
3. supabase/003_orders_coupons.sql
4. supabase/004_payment_workflow.sql
5. supabase/007_ton_manual_confirmation.sql
```
#### 5. Atualize o cliente Supabase
Edite `json/supabase.js` com a URL e a chave anon do seu projeto:
```js
const supabase = createClient(
  'https://SEU-PROJETO.supabase.co',
  'SUA-CHAVE-ANON'
);
```
#### 6. Abra o projeto
Utilize a extensão **Live Server** no VS Code para abrir o `index.html` em `http://127.0.0.1:5500`.
---
## 💳 Configuração do Pagamento (Ton)
Consulte o guia específico para configurar a Ton:
- [`TON_SETUP.md`](./TON_SETUP.md) — Setup da Edge Function, SQL e operação de confirmação
### Fluxo de pagamento resumido
```
Carrinho → Edge Function (create-ton-checkout) → Checkout Ton (link PIX)
    ↓
Pagamento recebido na conta Ton
    ↓
Confirmação manual no Supabase (confirm_ton_payment) → Atualiza pedido no banco
```
---
## 🌐 Deploy em Produção
Consulte o [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) para o checklist completo de segurança.
### Resumo rápido
| Etapa | Serviço | Ação |
|-------|---------|------|
| Frontend | **Vercel** | Conecte o repositório GitHub → deploy automático |
| Banco de dados | **Supabase** | Execute os scripts SQL de estrutura e pagamento e habilite RLS |
| Edge Functions | **Supabase CLI** | `supabase functions deploy` |
| Segredos | **Supabase Vault** | Configure as variáveis de ambiente nas Edge Functions |
| Pagamento | **Ton** | Configure o secret `TON_PAYMENT_LINK` e publique `create-ton-checkout` |
---
## 🛡️ Segurança
- **Row Level Security (RLS)** habilitada em todas as tabelas — cada usuário acessa apenas seus próprios dados.
- **Service Role Key** usada exclusivamente nas Edge Functions, nunca no front-end.
- **Tokens de acesso** armazenados apenas em variáveis de ambiente do servidor, nunca no código-fonte.
- **`.env`** incluído no `.gitignore` para evitar exposição acidental de segredos.
---
## 🧰 Tecnologias Utilizadas
| Tecnologia | Uso |
|-----------|-----|
| **HTML5 / CSS3 / JS** | Interface completa sem frameworks |
| **Supabase** | Banco de dados, autenticação e Edge Functions |
| **Ton** | Pagamento via link PIX |
| **Font Awesome 6** | Ícones (CDN) |
| **Vercel** | Hospedagem do frontend |
| **Deno** | Runtime das Edge Functions no Supabase |
---
## 📦 Produtos Disponíveis
| Produto | Categoria | Cor | Preço |
|---------|-----------|-----|-------|
| Camiseta All Black | Camisetas | Escura | R$ 79,90 |
| Oversized Smoke | Oversized | Clara | R$ 79,90 |
| Camiseta Off White | Camisetas | Clara | R$ 79,90 |
Tamanhos disponíveis: **P, M, G, GG**
---
## 📄 Licença
Este projeto está protegido por licença proprietária.  
**É proibido copiar, redistribuir ou usar o código sem autorização prévia do autor.**
Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
---
## 👤 Autor
Desenvolvido por **Sergio PJ**  
📧 Entre em contato pelo GitHub: [@sergio-pj](https://github.com/sergio-pj)
---
<div align="center">
  <sub>Feito com ❤️ e muito ☕ · Aranha Store © 2025</sub>
</div>

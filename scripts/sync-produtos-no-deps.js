#!/usr/bin/env node
/**
 * scripts/sync-produtos-no-deps.js
 * Versão sem dependências: usa fetch nativo para consultar a REST API do Supabase
 * e mescla os itens em `pages/catalogo/catalogo.json`.
 *
 * Uso:
 *  set SUPABASE_URL=https://xxx.supabase.co
 *  set SUPABASE_KEY=eyJ...
 *  node scripts/sync-produtos-no-deps.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_KEY no ambiente.');
  process.exit(1);
}

async function fetchProdutos() {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/produtos?select=*&order=id.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erro fetching produtos: ${res.status} ${body}`);
  }
  return await res.json();
}

function loadLocalCatalog() {
  const p = path.resolve(__dirname, '..', 'pages', 'catalogo', 'catalogo.json');
  if (!fs.existsSync(p)) return [];
  const txt = fs.readFileSync(p, 'utf8');
  try { return JSON.parse(txt); } catch (e) { return [] }
}

function saveLocalCatalog(arr) {
  const p = path.resolve(__dirname, '..', 'pages', 'catalogo', 'catalogo.json');
  fs.writeFileSync(p, JSON.stringify(arr, null, 2), 'utf8');
}

function mergeCatalog(local, remote) {
  const existingIds = new Set(local.map(i => i.id).filter(Boolean));
  const existingNames = new Set(local.map(i => (i.nome || '').toLowerCase()));
  const toAdd = [];
  for (const r of remote) {
    if (r.id && existingIds.has(r.id)) continue;
    if (r.nome && existingNames.has((r.nome||'').toLowerCase())) continue;
    const item = {
      id: r.id || null,
      nome: r.nome || '',
      preco: typeof r.preco === 'number' ? r.preco : (r.preco ? Number(r.preco) : null),
      categoria: r.categoria || '',
      cor: r.cor || '',
      imagem: (Array.isArray(r.galeria) && r.galeria[0]) || r.imagem || '',
      galeria: Array.isArray(r.galeria) ? r.galeria : (r.imagem ? [r.imagem] : []),
      subtitulo: r.subtitulo || '',
      descricao: r.descricao || '',
      destaque: r.destaque || '',
      composicao: r.composicao || '',
      cuidados: Array.isArray(r.cuidados) ? r.cuidados : [],
      tamanhos: Array.isArray(r.tamanhos) ? r.tamanhos : []
    };
    toAdd.push(item);
  }
  return local.concat(toAdd);
}

(async function main(){
  try {
    console.log('Buscando produtos via REST...');
    const produtos = await fetchProdutos();
    console.log(`Encontrados ${produtos.length} produtos.`);
    const local = loadLocalCatalog();
    console.log(`Catalogo local: ${local.length} itens.`);
    const merged = mergeCatalog(local, produtos);
    if (merged.length === local.length) {
      console.log('Nenhuma alteração necessária.');
      return;
    }
    saveLocalCatalog(merged);
    console.log('catalogo.json atualizado. Commitando...');
    execSync('git add pages/catalogo/catalogo.json', { cwd: path.resolve(__dirname,'..'), stdio: 'inherit' });
    execSync('git commit -m "chore(sync-no-deps): append produtos from supabase (no deps)"', { cwd: path.resolve(__dirname,'..'), stdio: 'inherit' });
    execSync('git push origin main', { cwd: path.resolve(__dirname,'..'), stdio: 'inherit' });
    console.log('Commit e push concluídos.');
  } catch (err) {
    console.error('Erro:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

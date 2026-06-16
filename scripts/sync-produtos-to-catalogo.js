#!/usr/bin/env node
/**
 * scripts/sync-produtos-to-catalogo.js
 *
 * Busca produtos na tabela `produtos` do Supabase e mescla (append)
 * apenas os novos itens em `pages/catalogo/catalogo.json`.
 *
 * Uso:
 *  SUPABASE_URL=... SUPABASE_KEY=... node scripts/sync-produtos-to-catalogo.js
 *
 * Observações:
 * - Requer Node.js e internet.
 * - A chave pode ser a anon key (somente leitura) ou service_role se quiser também
 *   ler itens privados.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Erro: defina SUPABASE_URL e SUPABASE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchProdutos() {
  const { data, error } = await supabase.from('produtos').select('*').order('id', { ascending: true });
  if (error) throw error;
  return data || [];
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
  // We'll append remote items that do not match by `id` or `nome`.
  const existingIds = new Set(local.map(i => i.id).filter(Boolean));
  const existingNames = new Set(local.map(i => (i.nome || '').toLowerCase()));
  const toAdd = [];
  for (const r of remote) {
    if (r.id && existingIds.has(r.id)) continue;
    if (r.nome && existingNames.has((r.nome||'').toLowerCase())) continue;
    // normalize: keep only fields we want in catalog
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

async function main(){
  try {
    console.log('Buscando produtos do Supabase...')
    const produtos = await fetchProdutos();
    console.log(`Encontrados ${produtos.length} produtos no DB.`);
    const local = loadLocalCatalog();
    console.log(`Catalogo local possui ${local.length} itens.`);
    const merged = mergeCatalog(local, produtos);
    if (merged.length === local.length) {
      console.log('Nenhuma alteração necessária no catalogo.json');
      return;
    }
    saveLocalCatalog(merged);
    console.log('catalogo.json atualizado com novos itens. Fazendo commit...');
    execSync('git add pages/catalogo/catalogo.json', { cwd: path.resolve(__dirname,'..'), stdio: 'inherit' });
    execSync('git commit -m "chore(sync): append produtos from supabase to catalogo.json"', { cwd: path.resolve(__dirname,'..'), stdio: 'inherit' });
    execSync('git push origin main', { cwd: path.resolve(__dirname,'..'), stdio: 'inherit' });
    console.log('Commit e push concluídos. Pronto.');
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(1);
  }
}

main();

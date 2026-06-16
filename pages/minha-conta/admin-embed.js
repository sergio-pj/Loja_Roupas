import { supabase } from '../../json/supabase-browser.js'

export async function initAdminPanel(container) {
  if (!container) return;

  // inject CSS for the embedded admin panel (once)
  if (!document.getElementById('admin-embed-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './admin-embed.css';
    link.id = 'admin-embed-css';
    document.head.appendChild(link);
  }

  // create panel markup
  const panel = document.createElement('div');
  panel.id = 'account-admin-panel';
  panel.innerHTML = `
    <div class="section-head"><p class="auth-kicker">Admin</p><h2>Gerenciar produtos</h2></div>
    <div class="admin-wrap card">
      <form id="admin-product-form" class="auth-form">
        <input id="admin-prod-id" type="hidden">
        <label><span>Nome</span><input id="admin-nome" required></label>
        <label><span>Preço</span><input id="admin-preco" type="number" step="0.01"></label>
        <label><span>Descrição</span><textarea id="admin-descricao"></textarea></label>
        <label><span>Imagem</span><input id="admin-imagem" type="file" accept="image/*"></label>
        <div style="margin-top:8px"><button id="admin-save" type="submit">Salvar</button> <button id="admin-cancel" type="button">Cancelar</button></div>
      </form>
      <h3>Produtos</h3>
      <div id="admin-products" class="admin-products muted">Carregando...</div>
    </div>
  `;

  container.appendChild(panel);

  const form = panel.querySelector('#admin-product-form');
  const productsEl = panel.querySelector('#admin-products');

  async function loadProducts() {
    productsEl.textContent = 'Carregando...';
    const { data, error } = await supabase.from('produtos').select('*').order('id', { ascending: true });
    if (error) { productsEl.textContent = 'Erro: ' + error.message; return }
    if (!data || !data.length) { productsEl.textContent = 'Nenhum produto cadastrado'; return }

    productsEl.innerHTML = '';
    data.forEach(p => {
      const d = document.createElement('div'); d.className = 'card';
      d.style.marginBottom = '8px';
      d.innerHTML = `<strong>${p.nome}</strong><div class="muted">${p.descricao||''}</div><div class="muted">${p.preco?('R$ '+Number(p.preco).toFixed(2)):'--'}</div>`;
      const edit = document.createElement('button'); edit.textContent='Editar'; edit.style.marginRight='8px';
      edit.addEventListener('click',()=>{
        panel.querySelector('#admin-prod-id').value = p.id;
        panel.querySelector('#admin-nome').value = p.nome||'';
        panel.querySelector('#admin-preco').value = p.preco||'';
        panel.querySelector('#admin-descricao').value = p.descricao||'';
        window.scrollTo({top: panel.offsetTop, behavior:'smooth'});
      });
      const del = document.createElement('button'); del.textContent='Excluir'; del.style.background='#c0392b';
      del.addEventListener('click', async ()=>{
        if(!confirm('Excluir produto?')) return;
        const { error } = await supabase.from('produtos').delete().eq('id', p.id);
        if (error) return alert('Erro ao excluir: '+error.message);
        await loadProducts();
      });
      d.appendChild(edit); d.appendChild(del);
      productsEl.appendChild(d);
    });
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = panel.querySelector('#admin-prod-id').value;
    const nome = panel.querySelector('#admin-nome').value.trim();
    const preco = Number(panel.querySelector('#admin-preco').value||0);
    const descricao = panel.querySelector('#admin-descricao').value.trim();
    const file = panel.querySelector('#admin-imagem').files[0];

    let imagemUrl = null;
    if (file) {
      const filePath = `produtos/${Date.now()}_${file.name}`;
      const STORAGE_BUCKET = 'getPublicUrl';
      try {
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
        imagemUrl = data.publicUrl;
      } catch (uploadErr) {
        console.error('storage upload failed, falling back to dataURL', uploadErr);
        imagemUrl = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = () => res('');
          r.readAsDataURL(file);
        });
      }
    }

    if (id) {
      const updates = { nome, preco, descricao };
      if (imagemUrl) updates.imagem = imagemUrl;
      const { error } = await supabase.from('produtos').update(updates).eq('id', id);
      if (error) return alert('Erro ao atualizar: '+error.message);
    } else {
      const payload = { nome, preco, descricao };
      if (imagemUrl) payload.imagem = imagemUrl;
      const { error } = await supabase.from('produtos').insert([payload]);
      if (error) return alert('Erro ao inserir: '+error.message);
    }

    form.reset();
    await loadProducts();
    alert('Salvo com sucesso');
  });

  panel.querySelector('#admin-cancel').addEventListener('click', ()=>{ form.reset(); panel.querySelector('#admin-prod-id').value=''; });

  await loadProducts();
}

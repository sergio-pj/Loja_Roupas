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
        <label><span>Imagem</span><input id="admin-imagem" type="file" accept="image/*" multiple></label>
        <div id="admin-preview-gallery" class="preview-gallery"></div>
        <div style="margin-top:8px"><button id="admin-save" type="submit">Salvar</button> <button id="admin-cancel" type="button">Cancelar</button></div>
      </form>
      <h3>Produtos</h3>
      <div id="admin-products" class="admin-products muted">Carregando...</div>
    </div>
  `;

  container.appendChild(panel);

  const form = panel.querySelector('#admin-product-form');
  const productsEl = panel.querySelector('#admin-products');
  const fileInput = panel.querySelector('#admin-imagem');
  const previewContainer = panel.querySelector('#admin-preview-gallery');

  let panelGallery = [];
  let panelNewFiles = [];

  function renderPanelPreview(){
    if(!previewContainer) return;
    previewContainer.innerHTML = '';
    panelGallery.forEach((url, idx)=>{
      const d = document.createElement('div'); d.className='thumb existing';
      const img = document.createElement('img'); img.src = url; img.width=80;
      const btn = document.createElement('button'); btn.textContent='Remover'; btn.addEventListener('click', ()=>{ panelGallery.splice(idx,1); renderPanelPreview(); });
      d.appendChild(img); d.appendChild(btn); previewContainer.appendChild(d);
    });
    panelNewFiles.forEach((f, idx)=>{
      const d = document.createElement('div'); d.className='thumb new';
      const img = document.createElement('img'); img.width=80; const reader = new FileReader(); reader.onload=()=>{ img.src = reader.result }; reader.readAsDataURL(f);
      const btn = document.createElement('button'); btn.textContent='Remover'; btn.addEventListener('click', ()=>{ panelNewFiles.splice(idx,1); renderPanelPreview(); fileInput.value=''; });
      d.appendChild(img); d.appendChild(btn); previewContainer.appendChild(d);
    });
  }

  fileInput.addEventListener('change', ()=>{
    const files = Array.from(fileInput.files || []);
    panelNewFiles = panelNewFiles.concat(files);
    renderPanelPreview();
  });

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
        // populate existing gallery
        panelGallery = Array.isArray(p.galeria) && p.galeria.length ? p.galeria.slice() : (p.imagem ? [p.imagem] : []);
        panelNewFiles = [];
        renderPanelPreview();
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
    // start with existing gallery (user may have removed some)
    let galeria = panelGallery.slice();
    // upload any new files selected via file input
    if (panelNewFiles.length) {
      const STORAGE_BUCKET = 'getPublicUrl';
      for (const f of panelNewFiles) {
        const filePath = `produtos/${Date.now()}_${f.name}`;
        try {
          const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, f);
          if (upErr) throw upErr;
          const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
          if (data && data.publicUrl) galeria.push(data.publicUrl);
        } catch (uploadErr) {
          console.error('storage upload failed for', f.name, uploadErr);
          const dataUrl = await new Promise((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => res('');
            r.readAsDataURL(f);
          });
          if (dataUrl) galeria.push(dataUrl);
        }
      }
    }

    if (id) {
      const updates = { nome, preco, descricao };
      if (galeria && galeria.length) updates.galeria = galeria;
      else if (galeria && galeria.length === 1) updates.imagem = galeria[0];
      const { error } = await supabase.from('produtos').update(updates).eq('id', id);
      if (error) return alert('Erro ao atualizar: '+error.message);
    } else {
      const payload = { nome, preco, descricao };
      if (galeria && galeria.length) payload.galeria = galeria;
      else if (galeria && galeria.length === 1) payload.imagem = galeria[0];
      const { error } = await supabase.from('produtos').insert([payload]);
      if (error) return alert('Erro ao inserir: '+error.message);
    }

    // reset UI state
    panelGallery = [];
    panelNewFiles = [];
    renderPanelPreview();
    form.reset();
    await loadProducts();
    alert('Salvo com sucesso');
  });

  panel.querySelector('#admin-cancel').addEventListener('click', ()=>{ form.reset(); panel.querySelector('#admin-prod-id').value=''; });

  await loadProducts();
}

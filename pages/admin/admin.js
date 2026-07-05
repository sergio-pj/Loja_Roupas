import { supabase } from '../../json/supabase-browser.js'

// Unico email autorizado para acessar o admin
const ADMIN_EMAIL = 'aranha.admin@gmail.com'

function isAdminEmail(email){
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
}
// bucket de storage usado no projeto (ajuste se seu bucket tiver outro nome)
const STORAGE_BUCKET = 'getPublicUrl'

const els = {
  email: document.getElementById('email'),
  btnSignin: document.getElementById('btn-signin'),
  btnSignout: document.getElementById('btn-signout'),
  userInfo: document.getElementById('user-info'),
  editor: document.getElementById('editor'),
  form: document.getElementById('product-form'),
  products: document.getElementById('products'),
  btnCancel: document.getElementById('btn-cancel'),
  fileInput: document.getElementById('imagem'),
  previewGallery: document.getElementById('preview-gallery')
}

let currentGallery = [] // URLs (existing + uploaded)
let newFiles = [] // File objects selected but not yet uploaded

async function init(){
  els.btnSignin.addEventListener('click', signIn)
  els.btnSignout.addEventListener('click', signOut)
  els.form.addEventListener('submit', onSave)
  els.fileInput.addEventListener('change', onFilesSelected)
  els.btnCancel.addEventListener('click', resetForm)

  const { data: { session } } = await supabase.auth.getSession()
  // permitir sessão local via storefront (admin local)
  const local = window.storefront && window.storefront.getAuth ? window.storefront.getAuth() : null
  if (!session && local && isAdminEmail(local.email)) {
    handleSession({ user: { email: local.email } })
  } else {
    handleSession(session)
  }
  supabase.auth.onAuthStateChange((event, session) => handleSession(session))

  await loadProducts()
}

function handleSession(session){
  if(session?.user){
    // se estiver logado, garantir que seja o email do admin
    if(!isAdminEmail(session.user.email)){
      supabase.auth.signOut()
      alert('Email não autorizado para acessar o painel de administração.')
      return
    }

    els.btnSignin.hidden = true
    els.btnSignout.hidden = false
    els.userInfo.hidden = false
    els.userInfo.textContent = `Logado: ${session.user.email}`
    els.editor.hidden = false
  } else {
    els.btnSignin.hidden = false
    els.btnSignout.hidden = true
    els.userInfo.hidden = true
    els.editor.hidden = true
  }
}

async function signIn(){
  const email = els.email.value.trim()
  if(!email) return alert('Informe um email válido')
  // impedir envios para emails não autorizados (padrão simples)
  if(!isAdminEmail(email)){
    return alert(`Acesso restrito: use o email ${ADMIN_EMAIL}.`)
  }

  const { error } = await supabase.auth.signInWithOtp({ email })
  if(error) return alert('Erro ao enviar link: ' + error.message)
  alert('Link enviado para o email. Verifique a caixa de entrada.')
}

async function signOut(){
  await supabase.auth.signOut(); window.location.reload();
}

async function loadProducts(){
  els.products.innerHTML = '<div class="muted">Carregando...</div>'
  const { data, error } = await supabase.from('produtos').select('*').order('id', {ascending:true})
  if(error){ els.products.innerHTML = `<div class="muted">Erro: ${error.message}</div>`; return }

  if(!data || !data.length){ els.products.innerHTML = '<div class="muted">Nenhum produto cadastrado</div>'; return }

  els.products.innerHTML = ''
  data.forEach(p => {
    const div = document.createElement('div'); div.className='card'
    const img = document.createElement('img'); img.src = p.imagem || '/assets/modelofrente_begesnome.png'
    const h = document.createElement('div'); h.innerHTML = `<strong>${p.nome}</strong>`
    const d = document.createElement('div'); d.className='muted'; d.textContent = p.descricao || ''
    const a = document.createElement('div'); a.className='actions'
    const edit = document.createElement('button'); edit.textContent='Editar'; edit.addEventListener('click', ()=> fillForm(p))
    const del = document.createElement('button'); del.textContent='Excluir'; del.style.background='#c0392b'
    del.addEventListener('click', ()=> delProduct(p.id))
    a.appendChild(edit); a.appendChild(del)
    div.appendChild(img); div.appendChild(h); div.appendChild(d); div.appendChild(a)
    els.products.appendChild(div)
  })
}

function fillForm(p){
  els.form.reset()
  document.getElementById('prod-id').value = p.id
  document.getElementById('nome').value = p.nome || ''
  document.getElementById('preco').value = p.preco || ''
  document.getElementById('descricao').value = p.descricao || ''
  els.editor.hidden = false
  window.scrollTo(0,0)
  // populate gallery preview
  currentGallery = Array.isArray(p.galeria) && p.galeria.length ? p.galeria.slice() : (p.imagem ? [p.imagem] : [])
  newFiles = []
  renderPreviewGallery()
}

function resetForm(){ els.form.reset(); document.getElementById('prod-id').value=''; els.editor.hidden = false }

function onFilesSelected(e){
  const files = Array.from(e.target.files || [])
  // append to newFiles
  newFiles = newFiles.concat(files)
  renderPreviewGallery()
}

function renderPreviewGallery(){
  const container = els.previewGallery
  if(!container) return
  container.innerHTML = ''
  // existing URLs
  currentGallery.forEach((url, idx) => {
    const div = document.createElement('div'); div.className='thumb existing'
    const img = document.createElement('img'); img.src = url; img.alt = 'imagem'; img.width = 80
    const btn = document.createElement('button'); btn.textContent = 'Remover'; btn.addEventListener('click', ()=>{
      currentGallery.splice(idx,1); renderPreviewGallery()
    })
    div.appendChild(img); div.appendChild(btn); container.appendChild(div)
  })
  // newFiles previews
  newFiles.forEach((file, idx) => {
    const div = document.createElement('div'); div.className='thumb new'
    const img = document.createElement('img'); img.alt = file.name; img.width = 80
    const btn = document.createElement('button'); btn.textContent = 'Remover'; btn.addEventListener('click', ()=>{
      newFiles.splice(idx,1); renderPreviewGallery(); els.fileInput.value = ''
    })
    const reader = new FileReader(); reader.onload = ()=>{ img.src = reader.result }
    reader.readAsDataURL(file)
    div.appendChild(img); div.appendChild(btn); container.appendChild(div)
  })
}

async function onSave(e){
  e.preventDefault()
  const id = document.getElementById('prod-id').value
  const nome = document.getElementById('nome').value.trim()
  const preco = Number(document.getElementById('preco').value || 0)
  const descricao = document.getElementById('descricao').value.trim()
  const files = Array.from(document.getElementById('imagem').files || [])

    // handle multiple files: upload newFiles and collect URLs (or dataURL fallback)
    let galeria = currentGallery.slice()
    for (const file of newFiles) {
      const filePath = `produtos/${Date.now()}_${file.name}`
      try {
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file)
        if (upErr) throw upErr
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)
        if (data && data.publicUrl) galeria.push(data.publicUrl)
      } catch (uploadErr) {
        console.error('storage upload failed for', file.name, uploadErr)
        const dataUrl = await new Promise((res) => {
          const r = new FileReader()
          r.onload = () => res(r.result)
          r.onerror = () => res('')
          r.readAsDataURL(file)
        })
        if (dataUrl) galeria.push(dataUrl)
      }
    }

    if(id){
      const updates = { nome, preco, descricao }
      if(galeria && galeria.length) updates.galeria = galeria
      else if (galeria && galeria.length === 1) updates.imagem = galeria[0]
      const { error } = await supabase.from('produtos').update(updates).eq('id', id)
    if(error) return alert('Erro ao atualizar: '+error.message)
  } else {
      const payload = { nome, preco, descricao }
      if(galeria && galeria.length) payload.galeria = galeria
      else if (galeria && galeria.length === 1) payload.imagem = galeria[0]
      const { error } = await supabase.from('produtos').insert([payload])
    if(error) return alert('Erro ao inserir: '+error.message)
  }
    // reset state and UI
    currentGallery = []
    newFiles = []
    resetForm(); await loadProducts(); alert('Salvo com sucesso')
}

async function delProduct(id){
  if(!confirm('Excluir produto?')) return
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if(error) return alert('Erro ao excluir: '+error.message)
  await loadProducts();
}

init()

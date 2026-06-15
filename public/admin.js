/* ── CONFIG & STATE ──────────────────────────────── */
const API = window.location.origin + '/api';
let token       = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

/* ── EMOJIS / CATEGORIES ─────────────────────────── */
const CAT_MAP = {
  'Telefon':    { icon: '📱', emoji: '📱' },
  'Bilgisayar': { icon: '💻', emoji: '💻' },
  'Oyun':       { icon: '🎮', emoji: '🎮' },
  'Ses':        { icon: '🎧', emoji: '🎧' },
  'Fotoğraf':   { icon: '📷', emoji: '📷' },
  'TV':         { icon: '📺', emoji: '📺' },
  'Saat':       { icon: '⌚', emoji: '⌚' },
  'Aksesuar':   { icon: '🔌', emoji: '🔌' },
};
const CAT_KEYS = Object.keys(CAT_MAP);
const EMOJIS   = CAT_KEYS.map(k => CAT_MAP[k].emoji);

document.addEventListener('DOMContentLoaded', () => {
  if (!token || currentUser?.role !== 'ADMIN') {
    window.location.href = '/index.html';
    return;
  }
  document.getElementById('admin-name-nav').textContent = currentUser.name || currentUser.email;
  document.getElementById('admin-av').textContent = (currentUser.name || currentUser.email)[0].toUpperCase();
  loadAdminData();
});

/* ── CUSTOM CONFIRM ────────────────────────────────── */
function customConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = message;
    overlay.classList.add('open');
    overlay.style.display = 'flex';

    const btnYes = document.getElementById('confirm-yes');
    const btnNo = document.getElementById('confirm-no');

    const cleanUp = () => {
      overlay.classList.remove('open');
      setTimeout(() => { overlay.style.display = 'none'; }, 200);
      btnYes.removeEventListener('click', onYes);
      btnNo.removeEventListener('click', onNo);
    };

    const onYes = () => { cleanUp(); resolve(true); };
    const onNo = () => { cleanUp(); resolve(false); };

    btnYes.addEventListener('click', onYes);
    btnNo.addEventListener('click', onNo);
  });
}

async function adminLogout() {
  const confirmed = await customConfirm('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?');
  if (!confirmed) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}

/* ════════════════════════════════════════════════════
   ADMIN DATA & UI
════════════════════════════════════════════════════ */
async function loadAdminData() { await Promise.all([loadAdminProducts(), loadAdminUsers()]); }

async function loadAdminProducts() {
  const res  = await fetch(`${API}/products`);
  const data = await res.json();
  const prods = data.data || [];
  
  const grid = document.getElementById('admin-products-grid');
  if(!prods.length) {
    grid.innerHTML = '<div class="empty-state"><div>📦</div><p>Ürün bulunamadı.</p></div>';
    return;
  }
  
  grid.innerHTML = prods.map((p, i) => {
    const cat      = p.category || CAT_KEYS[i % CAT_KEYS.length];
    const emoji    = CAT_MAP[cat]?.emoji || EMOJIS[i % EMOJIS.length];
    const price    = Number(p.price);
    const taxRate  = p.taxRate || 0;
    const imgHtml  = p.imageUrl
      ? `<img src="${esc(p.imageUrl)}" loading="lazy" onerror="this.style.display='none'" />`
      : `<div style="font-size:64px">${emoji}</div>`;

    return `<div class="product-card" style="position:relative;">
      <div class="card-img">${imgHtml}<div class="cat-tag">${esc(cat)}</div></div>
      <div class="card-body">
        <div class="card-name">${esc(p.name)}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <div class="card-price"><small>₺</small>${price.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})} <br><small style="font-size:10px;color:var(--dim);font-weight:normal;">(%${taxRate} KDV Dahil)</small></div>
          <div class="card-stock">Stok: ${p.stock}</div>
        </div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="btn-primary btn-full" style="margin-top:0;" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Düzenle</button>
          <button class="btn-outline btn-full" style="margin-top:0; color:var(--red); border-color:var(--red);" onclick='deleteProduct(${p.id})'>Sil</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function loadAdminUsers() {
  const res  = await fetch(`${API}/admin/users`, { headers: authH() });
  const data = await res.json();
  document.getElementById('admin-users-body').innerHTML = (data.data||[]).map(u => `
    <tr>
      <td style="color:var(--muted)">#${u.id}</td>
      <td>${esc(u.name)}</td>
      <td>${esc(u.email)}</td>
      <td><span class="role-pill role-${u.role}">${u.role}</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
      <td>
        ${u.id !== currentUser.id ? `<button class="btn-outline-sm" style="color:var(--red); border-color:var(--red); padding:4px 8px;" onclick='deleteUser(${u.id})'>Sil</button>` : ''}
      </td>
    </tr>`).join('');
}

function switchAdminTab(e, tabId) {
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.remove('hidden');
  e.target.classList.add('active');

  if(tabId === 'tab-products') {
    document.getElementById('admin-add-prod-btn').classList.remove('hidden');
    document.getElementById('admin-add-admin-btn').classList.add('hidden');
  } else {
    document.getElementById('admin-add-prod-btn').classList.add('hidden');
    document.getElementById('admin-add-admin-btn').classList.remove('hidden');
  }
}

/* ════════════════════════════════════════════════════
   PRODUCT CRUD
════════════════════════════════════════════════════ */
function openProductModal(product = null) {
  const isEdit = !!product;
  document.getElementById('prod-modal-title').textContent = isEdit ? 'Ürünü Düzenle' : 'Ürün Ekle';
  document.getElementById('product-id').value    = isEdit ? product.id : '';
  document.getElementById('prod-name').value     = isEdit ? product.name : '';
  document.getElementById('prod-desc').value     = isEdit ? product.description : '';
  document.getElementById('prod-price').value    = isEdit ? product.price : '';
  document.getElementById('prod-stock').value    = isEdit ? product.stock : '';
  document.getElementById('prod-tax').value      = isEdit ? (product.taxRate || 18) : 18;
  document.getElementById('prod-image').value    = isEdit ? (product.imageUrl||'') : '';
  if (isEdit && product.category) document.getElementById('prod-category').value = product.category;
  
  document.getElementById('prod-error').classList.add('hidden');
  const o = document.getElementById('prod-overlay');
  o.classList.add('open'); o.style.display = 'flex';
}
function closeProductModal() {
  const o = document.getElementById('prod-overlay');
  o.classList.remove('open');
}

async function handleProductSave(e) {
  e.preventDefault();
  const id  = document.getElementById('product-id').value;
  const btn = document.getElementById('product-submit');
  setLoading(btn, 'Kaydediliyor...');
  const body = {
    name: v('prod-name'), description: v('prod-desc'),
    price: parseFloat(v('prod-price')), stock: parseInt(v('prod-stock')),
    category: v('prod-category'), taxRate: parseInt(v('prod-tax'))
  };
  const img = v('prod-image');
  if (img) body.imageUrl = img;
  try {
    const res  = await fetch(id ? `${API}/admin/products/${id}` : `${API}/admin/products`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    closeProductModal();
    toast(id ? 'Ürün güncellendi ✅' : 'Ürün eklendi ✅', 'success');
    loadAdminProducts();
  } catch (err) {
    const el = document.getElementById('prod-error');
    el.textContent = err.message; el.classList.remove('hidden');
  } finally { resetBtn(btn, 'Kaydet'); }
}

async function deleteProduct(id) {
  const confirmed = await customConfirm('Ürünü Sil', 'Bu ürünü silmek istediğinize emin misiniz?');
  if (!confirmed) return;
  try {
    await fetch(`${API}/admin/products/${id}`, { method: 'DELETE', headers: authH() });
    toast('Ürün silindi.', 'info'); 
    loadAdminProducts();
  } catch { toast('Silinemedi.', 'error'); }
}

async function deleteUser(id) {
  const confirmed = await customConfirm('Kullanıcıyı Sil', 'Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?');
  if (!confirmed) return;
  try {
    const res = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: authH() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    toast('Kullanıcı başarıyla silindi.', 'success'); 
    loadAdminUsers();
  } catch (err) { toast(err.message || 'Silinemedi.', 'error'); }
}

/* ════════════════════════════════════════════════════
   CREATE ADMIN
════════════════════════════════════════════════════ */
function openAdminCreateModal() {
  document.getElementById('admin-create-overlay').classList.add('open');
  document.getElementById('admin-create-overlay').style.display = 'flex';
}
function closeAdminCreateModal() {
  document.getElementById('admin-create-overlay').classList.remove('open');
}

async function handleCreateAdmin(e) {
  e.preventDefault();
  const btn = document.getElementById('admin-create-submit');
  setLoading(btn, 'Oluşturuluyor...');
  try {
    const res = await fetch(`${API}/admin/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify({
        name: v('new-admin-name'),
        email: v('new-admin-email'),
        password: v('new-admin-password')
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    closeAdminCreateModal();
    toast('Yeni admin oluşturuldu ✅', 'success');
    loadAdminUsers();
  } catch (err) {
    const el = document.getElementById('admin-create-error');
    el.textContent = err.message; el.classList.remove('hidden');
  } finally { resetBtn(btn, 'Oluştur'); }
}

/* ── HELPERS ───────────────────────────────────────── */
function authH() { return { 'Authorization': `Bearer ${token}` }; }
function v(id)   { return document.getElementById(id)?.value || ''; }
function esc(s)  { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function setLoading(btn, txt) { if(btn){btn.disabled=true;btn.textContent=txt;} }
function resetBtn(btn, txt)   { if(btn){btn.disabled=false;btn.textContent=txt;} }
const ICONS = { success:'✅', error:'❌', info:'ℹ️' };
function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${ICONS[type]}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3200);
}


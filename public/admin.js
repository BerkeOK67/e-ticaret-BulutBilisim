/* ── CONFIG & STATE ──────────────────────────────── */
const API = window.location.origin + '/api';
let token       = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

let adminCategories = [];   // ['Telefon', 'Bilgisayar', ...]
let allAdminProducts = [];  // all products
let activeCat = 'all';      // selected category filter

/* ── CATEGORY EMOJI MAP ──────────────────────────── */
const CAT_EMOJI = {
  'Telefon': '📱', 'Bilgisayar': '💻', 'Oyun': '🎮',
  'Ses': '🎧', 'Fotoğraf': '📷', 'TV': '📺',
  'Saat': '⌚', 'Aksesuar': '🔌',
};
const FALLBACK_EMOJIS = ['📦','🎁','🖥️','🖱️','⌨️','📡','🔋','💾'];
function catEmoji(name) { return CAT_EMOJI[name] || '🏷️'; }

/* ── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  if (!token || !currentUser) { window.location.replace('/'); return; }
  if (currentUser.role !== 'ADMIN') { window.location.replace('/shop'); return; }

  const initial = (currentUser.name || currentUser.email)[0].toUpperCase();
  document.getElementById('admin-name-nav').textContent = currentUser.name || currentUser.email;
  document.getElementById('admin-av').textContent = initial;

  await Promise.all([loadAdminCategories(), loadAdminProducts()]);
  loadAdminUsers(); // fire-and-forget (users tab may not be visible)
});

/* ── MAIN VIEW SWITCH ────────────────────────────── */
function switchMainView(view) {
  document.getElementById('view-products').classList.toggle('hidden', view !== 'products');
  document.getElementById('view-users').classList.toggle('hidden', view !== 'users');

  document.querySelectorAll('.admin-nav-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.getElementById(`nav-tab-${view}`);
  if (activeTab) activeTab.classList.add('active');

  if (view === 'users') loadAdminUsers();
}

/* ── CUSTOM CONFIRM ──────────────────────────────── */
function customConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent   = message;
    overlay.classList.add('open'); overlay.style.display = 'flex';

    const btnYes = document.getElementById('confirm-yes');
    const btnNo  = document.getElementById('confirm-no');
    const cleanUp = () => {
      overlay.classList.remove('open');
      setTimeout(() => { overlay.style.display = 'none'; }, 200);
      btnYes.removeEventListener('click', onYes);
      btnNo.removeEventListener('click', onNo);
    };
    const onYes = () => { cleanUp(); resolve(true); };
    const onNo  = () => { cleanUp(); resolve(false); };
    btnYes.addEventListener('click', onYes);
    btnNo.addEventListener('click', onNo);
  });
}

async function adminLogout() {
  const ok = await customConfirm('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?');
  if (!ok) return;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  window.location.replace('/');
}

/* ════════════════════════════════════════════════════
   CATEGORIES
════════════════════════════════════════════════════ */
async function loadAdminCategories() {
  try {
    const res  = await fetch(`${API}/admin/categories`, { headers: authH() });
    const data = await res.json();
    adminCategories = data.data || [];
  } catch {
    adminCategories = [];
  }
  renderCategorySidebar();
  populateCategorySelects();
}

function renderCategorySidebar() {
  const nav = document.getElementById('admin-cat-nav');
  if (!nav) return;

  /* "Tüm Ürünler" satırı */
  let html = `
    <div class="admin-cat-row ${activeCat === 'all' ? 'active' : ''}">
      <button class="admin-cat-btn" onclick="selectAdminCat('all', this.parentElement)">
        <span class="cat-emoji">🏠</span>
        <span class="cat-label">Tüm Ürünler</span>
        <span class="cat-count-badge" id="ccount-all"></span>
      </button>
    </div>`;

  adminCategories.forEach(cat => {
    const safeCat = esc(cat);
    const catJson = JSON.stringify(cat);
    html += `
      <div class="admin-cat-row ${activeCat === cat ? 'active' : ''}" id="catrow-${safeCat}">
        <button class="admin-cat-btn" onclick="selectAdminCat(${catJson}, this.parentElement)">
          <span class="cat-emoji">${catEmoji(cat)}</span>
          <span class="cat-label">${safeCat}</span>
          <span class="cat-count-badge" id="ccount-${safeCat}"></span>
        </button>
        <div class="cat-action-btns">
          <button class="cat-icon-btn edit" title="Yeniden Adlandır"
                  onclick="openCategoryRenameModal(${catJson})">✏️</button>
          <button class="cat-icon-btn del" title="Sil"
                  onclick="openCategoryDeleteModal(${catJson})">🗑️</button>
        </div>
      </div>`;
  });

  nav.innerHTML = html;
  updateCategoryCounts();
}

function updateCategoryCounts() {
  const counts = { all: allAdminProducts.length };
  allAdminProducts.forEach(p => {
    if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
  });
  const allEl = document.getElementById('ccount-all');
  if (allEl) allEl.textContent = `(${counts.all})`;
  adminCategories.forEach(cat => {
    const el = document.getElementById(`ccount-${esc(cat)}`);
    if (el) el.textContent = `(${counts[cat] || 0})`;
  });
}

function selectAdminCat(cat, el) {
  activeCat = cat;
  document.querySelectorAll('.admin-cat-item').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('admin-prod-title').textContent = cat === 'all' ? 'Tüm Ürünler' : cat;
  renderAdminProducts(getFilteredProducts());
}

function populateCategorySelects() {
  const sel = document.getElementById('prod-category');
  if (sel) {
    const current = sel.value;
    sel.innerHTML = '<option value="">— Seçin —</option>' +
      adminCategories.map(c => `<option value="${esc(c)}" ${c === current ? 'selected' : ''}>${esc(c)}</option>`).join('');
    if (current && adminCategories.includes(current)) sel.value = current;
  }
}

/* ── Category Add ── */
function openCategoryModal() {
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-error').classList.add('hidden');
  const o = document.getElementById('cat-overlay');
  o.classList.add('open'); o.style.display = 'flex';
  setTimeout(() => document.getElementById('cat-name').focus(), 100);
}
function closeCategoryModal() { document.getElementById('cat-overlay').classList.remove('open'); }

async function handleCategoryAdd(e) {
  e.preventDefault();
  const btn   = document.getElementById('cat-submit');
  const errEl = document.getElementById('cat-error');
  const name  = document.getElementById('cat-name').value.trim();
  setLoading(btn, 'Ekleniyor...');
  errEl.classList.add('hidden');
  try {
    const res  = await fetch(`${API}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!adminCategories.includes(name)) adminCategories.push(name);
    renderCategorySidebar();
    populateCategorySelects();
    closeCategoryModal();
    toast(`"${name}" kategorisi eklendi ✅`, 'success');
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally { resetBtn(btn, 'Ekle'); }
}

/* ── Category Rename ── */
function openCategoryRenameModal(name) {
  document.getElementById('cat-old-name').value  = name;
  document.getElementById('cat-new-name').value  = name;
  document.getElementById('cat-rename-error').classList.add('hidden');
  const o = document.getElementById('cat-rename-overlay');
  o.classList.add('open'); o.style.display = 'flex';
  setTimeout(() => document.getElementById('cat-new-name').focus(), 100);
}
function closeCategoryRenameModal() { document.getElementById('cat-rename-overlay').classList.remove('open'); }

async function handleCategoryRename(e) {
  e.preventDefault();
  const btn     = document.getElementById('cat-rename-submit');
  const errEl   = document.getElementById('cat-rename-error');
  const oldName = document.getElementById('cat-old-name').value;
  const newName = document.getElementById('cat-new-name').value.trim();
  setLoading(btn, 'Kaydediliyor...');
  errEl.classList.add('hidden');
  try {
    const res  = await fetch(`${API}/admin/categories/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify({ oldName, newName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (activeCat === oldName) activeCat = newName;
    closeCategoryRenameModal();
    toast(`"${oldName}" → "${newName}" ✅`, 'success');
    await Promise.all([loadAdminCategories(), loadAdminProducts()]);
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally { resetBtn(btn, 'Kaydet'); }
}

/* ── Category Delete ── */
function openCategoryDeleteModal(name) {
  document.getElementById('cat-delete-name').value = name;
  document.getElementById('cat-delete-title').textContent = `"${name}" Kategorisini Sil`;
  const sel = document.getElementById('cat-delete-reassign');
  sel.innerHTML = '<option value="">— Kategorisiz bırak —</option>' +
    adminCategories.filter(c => c !== name).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const o = document.getElementById('cat-delete-overlay');
  o.classList.add('open'); o.style.display = 'flex';
}
function closeCategoryDeleteModal() { document.getElementById('cat-delete-overlay').classList.remove('open'); }

async function confirmCategoryDelete() {
  const btn        = document.getElementById('cat-delete-confirm');
  const name       = document.getElementById('cat-delete-name').value;
  const reassignTo = document.getElementById('cat-delete-reassign').value;
  setLoading(btn, 'Siliniyor...');
  try {
    const res  = await fetch(`${API}/admin/categories`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify({ name, reassignTo: reassignTo || null })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (activeCat === name) activeCat = 'all';
    closeCategoryDeleteModal();
    toast(`"${name}" kategorisi silindi.`, 'info');
    await Promise.all([loadAdminCategories(), loadAdminProducts()]);
  } catch (err) {
    toast(err.message || 'Silinemedi.', 'error');
  } finally { resetBtn(btn, 'Sil'); }
}

/* ════════════════════════════════════════════════════
   PRODUCTS
════════════════════════════════════════════════════ */
async function loadAdminProducts() {
  try {
    const res  = await fetch(`${API}/products`);
    const data = await res.json();
    allAdminProducts = data.data || [];
    updateCategoryCounts();
    renderAdminProducts(getFilteredProducts());
  } catch { toast('Ürünler yüklenemedi.', 'error'); }
}

function getFilteredProducts() {
  const q = (document.getElementById('admin-search')?.value || '').toLowerCase();
  return allAdminProducts.filter(p => {
    const matchCat = activeCat === 'all' || p.category === activeCat;
    const matchQ   = !q || p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

function filterAdminProducts() { renderAdminProducts(getFilteredProducts()); }

function renderAdminProducts(products) {
  const grid  = document.getElementById('admin-products-grid');
  const count = document.getElementById('admin-prod-count');
  if (count) count.textContent = `${products.length} ürün`;
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div>📦</div><p>Bu kategoride ürün bulunamadı.</p></div>`;
    return;
  }

  const emojis = ['📱','💻','🎮','🎧','📷','📺','⌚','🔌'];
  grid.innerHTML = products.map((p, i) => {
    const cat     = p.category || '';
    const emoji   = catEmoji(cat) !== '🏷️' ? catEmoji(cat) : emojis[i % emojis.length];
    const price   = Number(p.price);
    const taxRate = p.taxRate || 18;
    const stockCls = p.stock === 0 ? 'stock-out' : p.stock < 5 ? 'stock-low' : '';
    const stockTxt = p.stock === 0 ? 'Tükendi' : p.stock < 5 ? `Son ${p.stock}!` : `${p.stock} stok`;

    const imgHtml = p.imageUrl
      ? `<img src="${esc(p.imageUrl)}" loading="lazy" onerror="this.style.display='none'" />`
      : `<div style="font-size:56px">${emoji}</div>`;

    return `<div class="product-card" style="position:relative;">
      <div class="card-img">${imgHtml}<div class="cat-tag">${esc(cat || 'Genel')}</div></div>
      <div class="card-body">
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-desc">${esc(p.description)}</div>
        <div class="card-footer">
          <div>
            <div class="card-price"><small>₺</small>${price.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}<br>
              <small style="font-size:10px;color:var(--dim);font-weight:normal;">%${taxRate} KDV</small>
            </div>
            <div class="card-stock ${stockCls}">${stockTxt}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="add-btn" onclick='openProductModal(${JSON.stringify(p).replace(/'/g,"&apos;")})'>✏️ Düzenle</button>
            <button class="add-btn" style="background:#fee2e2;color:var(--red);" onclick='deleteProduct(${p.id})'>🗑️ Sil</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── Product Modal ── */
function openProductModal(product = null) {
  const isEdit = !!product;
  document.getElementById('prod-modal-title').textContent = isEdit ? 'Ürünü Düzenle' : 'Ürün Ekle';
  document.getElementById('product-id').value  = isEdit ? product.id : '';
  document.getElementById('prod-name').value   = isEdit ? product.name : '';
  document.getElementById('prod-desc').value   = isEdit ? product.description : '';
  document.getElementById('prod-price').value  = isEdit ? product.price : '';
  document.getElementById('prod-stock').value  = isEdit ? product.stock : '';
  document.getElementById('prod-tax').value    = isEdit ? (product.taxRate || 18) : 18;
  document.getElementById('prod-image').value  = isEdit ? (product.imageUrl || '') : '';
  populateCategorySelects();
  if (isEdit && product.category) {
    setTimeout(() => { document.getElementById('prod-category').value = product.category; }, 0);
  }
  document.getElementById('prod-error').classList.add('hidden');
  const o = document.getElementById('prod-overlay');
  o.classList.add('open'); o.style.display = 'flex';
}
function closeProductModal() { document.getElementById('prod-overlay').classList.remove('open'); }

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
    if (!res.ok) throw new Error(data.message || JSON.stringify(data.errors));
    closeProductModal();
    toast(id ? 'Ürün güncellendi ✅' : 'Ürün eklendi ✅', 'success');
    await loadAdminProducts();
  } catch (err) {
    const el = document.getElementById('prod-error');
    el.textContent = err.message; el.classList.remove('hidden');
  } finally { resetBtn(btn, 'Kaydet'); }
}

async function deleteProduct(id) {
  const ok = await customConfirm('Ürünü Sil', 'Bu ürünü kalıcı olarak silmek istediğinize emin misiniz?');
  if (!ok) return;
  try {
    const res  = await fetch(`${API}/admin/products/${id}`, { method: 'DELETE', headers: authH() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    toast('Ürün silindi.', 'info');
    await loadAdminProducts();
  } catch (err) { toast(err.message || 'Silinemedi.', 'error'); }
}

/* ════════════════════════════════════════════════════
   USERS
════════════════════════════════════════════════════ */
async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">Yükleniyor...</td></tr>';
  try {
    const res  = await fetch(`${API}/admin/users`, { headers: authH() });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const users = data.data || [];

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">Kullanıcı bulunamadı.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="color:var(--muted);font-size:13px;">#${u.id}</td>
        <td style="font-weight:600;">${esc(u.name || '—')}</td>
        <td>${esc(u.email)}</td>
        <td><span class="role-pill role-${u.role}">${u.role}</span></td>
        <td style="font-weight:600;color:var(--green);">₺${Number(u.walletBalance || 0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        <td style="color:var(--muted);font-size:13px;">${new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
        <td>
          ${u.id !== currentUser?.id
            ? `<button class="tbl-btn tbl-del" onclick='deleteUser(${u.id})'>🗑️ Sil</button>`
            : '<span style="color:var(--dim);font-size:12px;">Sen</span>'}
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--red);padding:32px;">Hata: ${esc(err.message)}</td></tr>`;
    toast(`Kullanıcılar yüklenemedi: ${err.message}`, 'error');
  }
}

async function deleteUser(id) {
  const ok = await customConfirm('Kullanıcıyı Sil', 'Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?');
  if (!ok) return;
  try {
    const res  = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: authH() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    toast('Kullanıcı başarıyla silindi.', 'success');
    loadAdminUsers();
  } catch (err) { toast(err.message || 'Silinemedi.', 'error'); }
}

/* ── Create Admin ── */
function openAdminCreateModal() {
  const o = document.getElementById('admin-create-overlay');
  o.classList.add('open'); o.style.display = 'flex';
}
function closeAdminCreateModal() { document.getElementById('admin-create-overlay').classList.remove('open'); }

async function handleCreateAdmin(e) {
  e.preventDefault();
  const btn = document.getElementById('admin-create-submit');
  setLoading(btn, 'Oluşturuluyor...');
  try {
    const res  = await fetch(`${API}/admin/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify({ name: v('new-admin-name'), email: v('new-admin-email'), password: v('new-admin-password') })
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

/* ── HELPERS ──────────────────────────────────────── */
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

/* ── shop.js — sadece shop.html (giriş yapmış kullanıcı) için ─── */
const API = window.location.origin + '/api';

/* ── STATE ───────────────────────────────────────── */
let token       = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let allProducts = [];
let categories  = [];
let cartItems   = [];
let activeCat   = 'all';

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

/* ── GUARD — token yoksa login sayfasına git ─────── */
(function() {
  if (!token || !currentUser) {
    window.location.replace('/');
    return;
  }
  /* Admin ise admin paneline yönlendir */
  if (currentUser.role === 'ADMIN') {
    window.location.replace('/admin');
  }
})();

/* ── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initUserUI();
  loadProducts();
  loadCart();

  // ?page=orders query param ile siparişler sayfasına otomatik git
  const params = new URLSearchParams(window.location.search);
  if (params.get('page') === 'orders') {
    // Ürünler yüklenince siparişler sayfasını göster
    setTimeout(() => showPage('orders'), 100);
  }
});

/* ── USER UI ──────────────────────────────────────── */
function initUserUI() {
  if (!currentUser) return;
  const initial = (currentUser.name || currentUser.email)[0].toUpperCase();

  const userAvNav  = document.getElementById('user-av');
  const userNameNav = document.getElementById('user-name-nav');
  const swName     = document.getElementById('sw-name');
  const swAvatar   = document.getElementById('sw-avatar');
  const wBal       = document.getElementById('wallet-balance');

  if (userAvNav)   userAvNav.textContent  = initial;
  if (userNameNav) userNameNav.textContent = currentUser.name?.split(' ')[0] || currentUser.email;
  if (swName)      swName.textContent     = currentUser.name || currentUser.email;
  if (swAvatar)    swAvatar.textContent   = initial;
  if (wBal)        wBal.textContent = '₺' + Number(currentUser.walletBalance || 0)
    .toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function refreshUserUI(user) {
  currentUser = user;
  localStorage.setItem('user', JSON.stringify(user));
  initUserUI();
}

/* ── LOGOUT ──────────────────────────────────────── */
async function logout() {
  const confirmed = await customConfirm('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?');
  if (!confirmed) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('/');
}

/* ── WALLET ──────────────────────────────────────── */
function openWalletModal() {
  document.getElementById('wallet-amount').value = '';
  const o = document.getElementById('wallet-overlay');
  o.classList.add('open'); o.style.display = 'flex';
}
function closeWalletModal() {
  document.getElementById('wallet-overlay').classList.remove('open');
}
async function handleAddBalance(e) {
  e.preventDefault();
  const btn = document.getElementById('wallet-submit');
  setLoading(btn, 'Yükleniyor...');
  const amount = parseFloat(v('wallet-amount'));
  try {
    const res = await fetch(`${API}/user/wallet/add`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    refreshUserUI(data.data);
    closeWalletModal();
    toast(`Cüzdanınıza ₺${amount.toLocaleString('tr-TR')} yüklendi! 💸`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    resetBtn(btn, 'Yükle');
  }
}

/* ════════════════════════════════════════════════════
   PRODUCTS & CATEGORIES
════════════════════════════════════════════════════ */
async function loadProducts() {
  try {
    const [pRes, cRes] = await Promise.all([
      fetch(`${API}/products`, { headers: authH() }),
      fetch(`${API}/products/categories`)
    ]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    allProducts = pData.data || [];
    categories  = cData.data || [];
    
    renderCategories();
    renderProducts(getFiltered());
  } catch { toast('Ürünler yüklenemedi.', 'error'); }
}

function renderCategories() {
  const nav = document.getElementById('shop-cat-nav');
  if (!nav) return;
  
  let html = `<div class="cat-label">Kategoriler</div>
    <button class="cat-item ${activeCat === 'all' ? 'active' : ''}" onclick="filterByCategory('all', this)">
      <span class="cat-icon">🏠</span> Tüm Ürünler
      <span class="cat-count" id="ccount-all" style="margin-left:auto;font-size:12px;color:var(--dim)"></span>
    </button>`;
  
  categories.forEach((cat, i) => {
    const safeCat = esc(cat);
    const catJson = JSON.stringify(cat);
    const emoji = CAT_MAP[cat]?.emoji || EMOJIS[i % EMOJIS.length] || '🏷️';
    html += `
    <button class="cat-item ${activeCat === cat ? 'active' : ''}" onclick='filterByCategory(${catJson}, this)'>
      <span class="cat-icon">${emoji}</span> ${safeCat}
      <span class="cat-count" id="ccount-${safeCat}" style="margin-left:auto;font-size:12px;color:var(--dim)"></span>
    </button>`;
  });
  
  nav.innerHTML = html;
  updateCategoryCounts();
}

function updateCategoryCounts() {
  const counts = { all: allProducts.length };
  allProducts.forEach(p => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
  
  const allEl = document.getElementById('ccount-all');
  if (allEl) allEl.textContent = `(${counts.all})`;
  
  categories.forEach(cat => {
    const el = document.getElementById(`ccount-${esc(cat)}`);
    if (el) el.textContent = `(${counts[cat] || 0})`;
  });
}

function getFiltered() {
  const q = (document.getElementById('search-input')?.value || document.getElementById('nav-search-input')?.value || '').toLowerCase();
  return allProducts.filter(p => {
    const matchCat = activeCat === 'all' || p.category === activeCat;
    const matchQ   = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  document.getElementById('product-count').textContent = `${products.length} ürün`;
  if (!products.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div>🔍</div><p>Bu kategoride ürün bulunamadı.</p>
    </div>`;
    return;
  }
  grid.innerHTML = products.map((p, i) => buildCard(p, i)).join('');
}

function buildCard(p, i) {
  const cat      = p.category || CAT_KEYS[i % CAT_KEYS.length];
  const emoji    = CAT_MAP[cat]?.emoji || EMOJIS[i % EMOJIS.length];
  const out      = p.stock === 0;
  const low      = p.stock > 0 && p.stock < 5;
  const stockTxt = out ? 'Tükendi' : low ? `Son ${p.stock}!` : `${p.stock} stok`;
  const stockCls = out ? 'stock-out' : low ? 'stock-low' : '';
  const price    = Number(p.price);
  const imgHtml  = p.imageUrl
    ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.fb-emoji').style.display='flex'" /><div class="fb-emoji" style="display:none;font-size:64px;width:100%;height:100%;align-items:center;justify-content:center">${emoji}</div>`
    : emoji;

  const addBtnHtml = out
    ? `<button class="add-btn" disabled>Tükendi</button>`
    : `<button class="add-btn" id="add-${p.id}" data-id="${p.id}">+ Sepet</button>`;

  return `<div class="product-card">
    <div class="card-img">
      ${p.imageUrl ? imgHtml : `<div style="font-size:64px">${emoji}</div>`}
      <div class="cat-tag">${esc(cat)}</div>
    </div>
    <div class="card-body">
      <div class="card-name">${esc(p.name)}</div>
      <div class="card-desc">${esc(p.description)}</div>
      <div class="card-footer">
        <div>
          <div class="card-price"><small>₺</small>${price.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div class="card-stock ${stockCls}">${stockTxt}</div>
        </div>
        ${addBtnHtml}
      </div>
    </div>
  </div>`;
}

function filterProducts() { renderProducts(getFiltered()); }
function searchFromNav() {
  const si = document.getElementById('search-input');
  if (si) si.value = document.getElementById('nav-search-input').value;
  renderProducts(getFiltered());
}
function filterByCategory(cat, el) {
  activeCat = cat;
  document.querySelectorAll('.cat-item').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('shop-cat-title').textContent = cat === 'all' ? 'Tüm Ürünler' : cat;
  renderProducts(getFiltered());
}

/* Event delegation for add-to-cart buttons */
document.addEventListener('click', e => {
  const btn = e.target.closest('.add-btn[data-id]');
  if (!btn) return;
  const id      = parseInt(btn.dataset.id);
  const product = allProducts.find(p => p.id === id);
  if (product) addToCart(product.id, product.name, Number(product.price), btn);
});

/* ════════════════════════════════════════════════════
   CART
════════════════════════════════════════════════════ */
async function loadCart() {
  if (!token) return;
  try {
    const res  = await fetch(`${API}/cart`, { headers: authH() });
    const data = await res.json();
    cartItems  = data.data || [];
    updateCartUI();
  } catch {}
}

async function addToCart(productId, name, price, btn) {
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    const res = await fetch(`${API}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authH() },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
    await loadCart();
    toast(`${name} sepete eklendi 🛒`, 'success');
  } catch (err) {
    toast(err.message || 'Hata!', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText || '+ Sepet'; }
  }
}

async function removeFromCart(productId) {
  try {
    await fetch(`${API}/cart/${productId}`, { method: 'DELETE', headers: authH() });
    cartItems = cartItems.filter(i => i.productId !== productId);
    updateCartUI();
    toast('Ürün sepetten çıkarıldı.', 'info');
  } catch { toast('Hata!', 'error'); }
}

function updateCartUI() {
  const count       = cartItems.reduce((s, i) => s + i.quantity, 0);
  const badge       = document.getElementById('cart-count');
  const itemCountEl = document.getElementById('cart-item-count');
  const itemsEl     = document.getElementById('cart-items');
  const footer      = document.getElementById('cart-footer');
  if (badge)       badge.textContent = count;
  if (itemCountEl) itemCountEl.textContent = count > 0 ? `${count} ürün` : '';

  if (!cartItems.length) {
    if (itemsEl) itemsEl.innerHTML = `<div class="empty-state"><div>🛒</div><p>Sepetiniz boş</p></div>`;
    if (footer)  footer.classList.add('hidden');
    return;
  }
  let total = 0;
  if (itemsEl) {
    itemsEl.innerHTML = cartItems.map((item, i) => {
      const sub = Number(item.product?.price || 0) * item.quantity;
      total += sub;
      return `<div class="cart-item">
        <div class="item-emoji">${EMOJIS[i % EMOJIS.length]}</div>
        <div class="item-info">
          <div class="item-name">${esc(item.product?.name || 'Ürün')}</div>
          <div class="item-price-line">₺${sub.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div class="item-qty">${item.quantity} adet × ₺${Number(item.product?.price||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <button class="item-remove" onclick="removeFromCart(${item.productId})" title="Çıkar">✕</button>
      </div>`;
    }).join('');
  }
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = '₺' + total.toLocaleString('tr-TR', {minimumFractionDigits:2,maximumFractionDigits:2});
  if (footer) footer.classList.remove('hidden');
}

function toggleCart() {
  document.getElementById('cart-drawer').classList.toggle('open');
  document.getElementById('cart-overlay').classList.toggle('open');
}

/* ── INVOICE ──────────────────────────────────────── */
function openInvoiceModal() {
  if (!cartItems.length) return;
  const overlay        = document.getElementById('invoice-overlay');
  const itemsContainer = document.getElementById('invoice-items');
  let totalTax = 0, totalPreTax = 0;

  itemsContainer.innerHTML = cartItems.map(item => {
    const price   = Number(item.product?.price || 0);
    const qty     = item.quantity;
    const taxRate = item.product?.taxRate || 18;
    const preTax  = price / (1 + (taxRate / 100));
    const tax     = price - preTax;
    totalPreTax  += preTax * qty;
    totalTax     += tax * qty;
    return `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
      <div>${esc(item.product?.name)} × ${qty} <span style="color:var(--dim)">(${taxRate}% KDV)</span></div>
      <div>₺${(price * qty).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
    </div>`;
  }).join('');

  const cartTotal   = totalPreTax + totalTax;
  const shippingFee = cartTotal <= 300 ? 49.99 : 0;
  const grandTotal  = cartTotal + shippingFee;

  document.getElementById('inv-pretax').textContent   = `₺${totalPreTax.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  document.getElementById('inv-tax').textContent      = `₺${totalTax.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  document.getElementById('inv-shipping').textContent = `₺${shippingFee.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  document.getElementById('inv-total').textContent    = `₺${grandTotal.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  document.getElementById('inv-error').classList.add('hidden');
  overlay.classList.add('open');
  overlay.style.display = 'flex';
}
function closeInvoiceModal() {
  const overlay = document.getElementById('invoice-overlay');
  overlay.classList.remove('open');
  setTimeout(() => { overlay.style.display = 'none'; }, 200);
}
async function confirmInvoiceOrder() {
  const btn = document.getElementById('confirm-order-btn');
  setLoading(btn, 'İşleniyor...');
  document.getElementById('inv-error').classList.add('hidden');
  try {
    const res  = await fetch(`${API}/orders`, { method: 'POST', headers: authH() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    cartItems = []; updateCartUI(); closeInvoiceModal();
    // Kapat sepeti
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('open');
    /* Cüzdan bakiyesini güncelle */
    const profRes = await fetch(`${API}/auth/profile`, { headers: authH() });
    if (profRes.ok) { const pd = await profRes.json(); refreshUserUI(pd.user); }
    /* Başarı ekranını göster */
    showOrderSuccess(data.data?.id);
  } catch (err) {
    const errEl = document.getElementById('inv-error');
    errEl.textContent = err.message || 'Sipariş oluşturulamadı.';
    errEl.classList.remove('hidden');
  } finally { resetBtn(btn, 'Siparişi Onayla'); }
}

function showOrderSuccess(orderId) {
  // Remove any existing success screen
  const old = document.getElementById('order-success-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'order-success-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);';

  overlay.innerHTML = `
    <div style="background:var(--white);border-radius:24px;padding:48px 40px;max-width:480px;width:100%;text-align:center;box-shadow:var(--shadow-lg);animation:popIn .35s ease;">
      <div style="font-size:72px;margin-bottom:20px;animation:badgePop .4s ease;">🎉</div>
      <h2 style="font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:12px;color:var(--text);">Siparişiniz Onaylandı!</h2>
      <p style="color:var(--muted);font-size:15px;margin-bottom:8px;">
        ${orderId ? `Sipariş <strong style="color:var(--primary)">#${orderId}</strong> başarıyla oluşturuldu.` : 'Siparişiniz başarıyla oluşturuldu.'}
      </p>
      <p style="color:var(--muted);font-size:14px;margin-bottom:32px;">Teşekkürler! Siparişiniz en kısa sürede kargoya verilecektir.</p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button onclick="closeOrderSuccess('shop')" class="btn-primary btn-lg" style="width:100%;background:linear-gradient(135deg,var(--primary),var(--accent));border:none;">
          🛍️ Alışverişe Devam Et
        </button>
        <button onclick="closeOrderSuccess('orders')" class="btn-outline btn-lg" style="width:100%;">
          📦 Siparişlerimi Gör
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function closeOrderSuccess(dest) {
  const overlay = document.getElementById('order-success-overlay');
  if (overlay) overlay.remove();
  // Her iki seçenek de sayfayı yeniler — stoklar güncel gelir
  window.location.href = dest === 'orders' ? '/shop?page=orders' : '/shop';
}

/* ════════════════════════════════════════════════════
   ORDERS
════════════════════════════════════════════════════ */
async function loadOrders() {
  const c = document.getElementById('orders-container');
  c.innerHTML = '<div class="empty-state"><div>⏳</div><p>Yükleniyor...</p></div>';
  try {
    const res  = await fetch(`${API}/orders`, { headers: authH() });
    const data = await res.json();
    renderOrders(data.data || []);
  } catch { toast('Siparişler yüklenemedi.', 'error'); }
}

function renderOrders(orders) {
  const c = document.getElementById('orders-container');
  if (!orders.length) {
    c.innerHTML = `<div class="empty-state"><div>📦</div><p>Henüz sipariş yok.</p><button class="btn-primary" onclick="showPage('shop')">Alışverişe Başla</button></div>`;
    return;
  }
  c.innerHTML = orders.map(o => {
    let totalTax = 0, totalPreTax = 0;
    (o.items||[]).forEach(item => {
      const price   = Number(item.price);
      const qty     = item.quantity;
      const taxRate = item.product?.taxRate || 18;
      const preTax  = price / (1 + (taxRate / 100));
      totalPreTax  += preTax * qty;
      totalTax     += (price - preTax) * qty;
    });
    return `<div class="order-card">
      <div class="order-top">
        <div>
          <div class="order-id">Sipariş #${o.id}</div>
          <div class="order-date">${new Date(o.orderDate).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div class="order-amount">₺${Number(o.totalPrice).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
      <div class="order-lines">
        ${(o.items||[]).map(item => `
          <div class="order-line">
            <span class="oname">${esc(item.product?.name||'Ürün')} × ${item.quantity} <small style="color:var(--dim);font-size:11px;">(${item.product?.taxRate||18}% KDV)</small></span>
            <span class="oprice">₺${(Number(item.price)*item.quantity).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          </div>`).join('')}
      </div>
      <div style="border-top:1px dashed var(--border);margin-top:12px;padding-top:12px;font-size:13px;color:var(--text-2);display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
        <div>KDV Hariç Tutar: <strong>₺${totalPreTax.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
        <div>KDV Tutarı: <strong>₺${totalTax.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
        ${Number(o.shippingFee) > 0 ? `<div>Kargo Ücreti: <strong>₺${Number(o.shippingFee).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>` : ''}
        <div style="font-size:15px;color:var(--text);margin-top:4px;">KDV Dahil Toplam: <strong>₺${Number(o.totalPrice).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
      </div>
    </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════
   PAGE NAVIGATION
════════════════════════════════════════════════════ */
function showPage(page) {
  ['shop-page','orders-page'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.classList.remove('page'); }
  });

  if (page === 'shop' || page === 'home') {
    const sp = document.getElementById('shop-page');
    if (sp) { sp.classList.remove('hidden'); sp.classList.add('page'); }
    renderProducts(getFiltered());
  } else if (page === 'orders') {
    const op = document.getElementById('orders-page');
    if (op) { op.classList.remove('hidden'); op.classList.add('page'); }
    loadOrders();
  } else if (page === 'admin') {
    window.location.href = '/admin';
  }
  window.scrollTo(0, 0);
}

/* ── CUSTOM CONFIRM ──────────────────────────────── */
function customConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent   = message;
    overlay.classList.add('open');
    overlay.style.display = 'flex';

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

/* ── HELPERS ─────────────────────────────────────── */
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

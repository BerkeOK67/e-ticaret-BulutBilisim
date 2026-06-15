/* ── CONFIG ──────────────────────────────────────── */
const API = window.location.origin + '/api';

/* ── STATE ───────────────────────────────────────── */
let token       = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let allProducts = [];
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

/* ── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadProducts();
  if (token) loadCart();
});

/* ════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════ */
function updateAuthUI() {
  const guestBtns = document.getElementById('guest-btns');
  const userBtns  = document.getElementById('user-btns');
  const userAvNav = document.getElementById('user-av');
  const userNameNav = document.getElementById('user-name-nav');
  const swName    = document.getElementById('sw-name');
  const swAvatar  = document.getElementById('sw-avatar');
  document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

  if (token && currentUser) {
    guestBtns.classList.add('hidden');
    userBtns.classList.remove('hidden');
    const initial = (currentUser.name || currentUser.email)[0].toUpperCase();
    if (userAvNav) userAvNav.textContent = initial;
    if (userNameNav) userNameNav.textContent = currentUser.name?.split(' ')[0] || currentUser.email;
    if (swName) swName.textContent = currentUser.name || currentUser.email;
    if (swAvatar) swAvatar.textContent = initial;
    
    // Set wallet balance
    const wBal = document.getElementById('wallet-balance');
    if (wBal) {
      wBal.textContent = '₺' + Number(currentUser.walletBalance || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
    }

    if (currentUser.role === 'ADMIN') {
      window.location.href = '/admin.html';
      return;
    } else {
      // Show shop instead of landing
      showPage('shop');
    }
  } else {
    guestBtns.classList.remove('hidden');
    userBtns.classList.add('hidden');
    showPage('home');
  }
}

/* AUTH MODAL */
function openAuthModal(tab = 'login') {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.add('open');
  overlay.style.display = 'flex';
  switchAuthTab(tab);
  document.getElementById('auth-error').classList.add('hidden');
}
function closeAuthModal() {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.remove('open');
}
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('register-form').classList.toggle('hidden', isLogin);
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('auth-error').classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-submit');
  const errEl = document.getElementById('auth-error');
  setLoading(btn, 'Giriş yapılıyor...');
  errEl.classList.add('hidden');
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: v('login-email'), password: v('login-password') })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Giriş başarısız');
    saveAuth(data.token, data.user);
    closeAuthModal();
    toast(`Hoş geldin, ${data.user.name?.split(' ')[0] || data.user.email}! 👋`, 'success');
    await loadCart();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally { resetBtn(btn, 'Giriş Yap'); }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-submit');
  const errEl = document.getElementById('auth-error');
  setLoading(btn, 'Oluşturuluyor...');
  errEl.classList.add('hidden');
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: v('reg-name'), email: v('reg-email'), password: v('reg-password') })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Kayıt başarısız');
    saveAuth(data.token, data.user);
    closeAuthModal();
    toast('Hesabın oluşturuldu! 🎉', 'success');
    await loadCart();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally { resetBtn(btn, 'Hesap Oluştur'); }
}

function saveAuth(t, user) {
  token = t; currentUser = user;
  localStorage.setItem('token', t);
  localStorage.setItem('user', JSON.stringify(user));
  updateAuthUI();
}

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

async function logout() {
  const confirmed = await customConfirm('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?');
  if (!confirmed) return;
  
  token = null; currentUser = null; cartItems = [];
  localStorage.removeItem('token'); localStorage.removeItem('user');
  updateAuthUI(); updateCartUI();
  toast('Çıkış yapıldı.', 'info');
}

/* ── WALLET ────────────────────────────────────────── */
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
    saveAuth(token, data.data); // update current user object
    closeWalletModal();
    toast(`Cüzdanınıza ₺${amount.toLocaleString('tr-TR')} yüklendi! 💸`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    resetBtn(btn, 'Yükle');
  }
}

/* ════════════════════════════════════════════════════
   PRODUCTS
════════════════════════════════════════════════════ */
async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    const data = await res.json();
    allProducts = data.data || [];
    renderProducts(getFiltered());
    renderPreview();
    updateCategoryCounts();
  } catch { toast('Ürünler yüklenemedi.', 'error'); }
}

function updateCategoryCounts() {
  const counts = { all: allProducts.length };
  allProducts.forEach(p => {
    const c = p.category;
    if (c) counts[c] = (counts[c] || 0) + 1;
  });
  document.querySelectorAll('.cat-item').forEach(el => {
    const c = el.dataset.cat;
    const count = counts[c] || 0;
    let countEl = el.querySelector('.cat-count');
    if (!countEl) {
      countEl = document.createElement('span');
      countEl.className = 'cat-count';
      countEl.style.marginLeft = 'auto';
      countEl.style.fontSize = '12px';
      countEl.style.color = 'var(--dim)';
      el.appendChild(countEl);
    }
    countEl.textContent = `(${count})`;
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

function renderPreview() {
  const grid = document.getElementById('preview-grid');
  if (!grid) return;
  const sample = allProducts.slice(0, 4);
  grid.innerHTML = sample.map((p, i) => buildCard(p, i, true)).join('');
}

function buildCard(p, i, preview = false) {
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

  const addBtnHtml = preview
    ? `<button class="add-btn" onclick="openAuthModal('login')">Giriş Yap</button>`
    : out
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
          <div class="card-price"><small>₺</small>${price.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          <div class="card-stock ${stockCls}">${stockTxt}</div>
        </div>
        ${addBtnHtml}
      </div>
    </div>
  </div>`;
}

function filterProducts() {
  renderProducts(getFiltered());
}
function searchFromNav() {
  document.getElementById('search-input') && (document.getElementById('search-input').value = document.getElementById('nav-search-input').value);
  renderProducts(getFiltered());
}

function filterByCategory(cat, el) {
  activeCat = cat;
  document.querySelectorAll('.cat-item').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('shop-cat-title').textContent =
    cat === 'all' ? 'Tüm Ürünler' : cat;
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
  if (!token) { openAuthModal('login'); toast('Sepete eklemek için giriş yap.', 'info'); return; }
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
  const count     = cartItems.reduce((s, i) => s + i.quantity, 0);
  const badge     = document.getElementById('cart-count');
  const itemCountEl = document.getElementById('cart-item-count');
  const itemsEl   = document.getElementById('cart-items');
  const footer    = document.getElementById('cart-footer');
  if (badge) badge.textContent = count;
  if (itemCountEl) itemCountEl.textContent = count > 0 ? `${count} ürün` : '';

  if (!cartItems.length) {
    if (itemsEl) itemsEl.innerHTML = `<div class="empty-state"><div>🛒</div><p>Sepetiniz boş</p></div>`;
    if (footer) footer.classList.add('hidden');
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
          <div class="item-price-line">₺${sub.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          <div class="item-qty">${item.quantity} adet × ₺${Number(item.product?.price||0).toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>
        <button class="item-remove" onclick="removeFromCart(${item.productId})" title="Çıkar">✕</button>
      </div>`;
    }).join('');
  }
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = '₺' + total.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
  if (footer) footer.classList.remove('hidden');
}

function toggleCart() {
  document.getElementById('cart-drawer').classList.toggle('open');
  document.getElementById('cart-overlay').classList.toggle('open');
}

function openInvoiceModal() {
  if (!cartItems.length) return;
  const overlay = document.getElementById('invoice-overlay');
  const itemsContainer = document.getElementById('invoice-items');
  let totalTax = 0;
  let totalPreTax = 0;
  
  itemsContainer.innerHTML = cartItems.map(item => {
    const price = Number(item.product?.price || 0);
    const qty = item.quantity;
    const taxRate = item.product?.taxRate || 18;
    const preTax = price / (1 + (taxRate / 100));
    const tax = price - preTax;
    totalPreTax += preTax * qty;
    totalTax += tax * qty;
    
    return `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
      <div>${esc(item.product?.name)} × ${qty} <span style="color:var(--dim)">(%${taxRate} KDV)</span></div>
      <div>₺${(price * qty).toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
    </div>`;
  }).join('');

  const cartTotal = totalPreTax + totalTax;
  const shippingFee = cartTotal <= 300 ? 49.99 : 0;
  const grandTotal = cartTotal + shippingFee;

  document.getElementById('inv-pretax').textContent = `₺${totalPreTax.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
  document.getElementById('inv-tax').textContent = `₺${totalTax.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
  document.getElementById('inv-shipping').textContent = `₺${shippingFee.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
  document.getElementById('inv-total').textContent = `₺${grandTotal.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}`;

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
    cartItems = []; updateCartUI(); toggleCart(); closeInvoiceModal();
    
    // Sipariş başarılı olunca cüzdan bakiyesini localde de güncelleyelim
    const profRes = await fetch(`${API}/auth/profile`, { headers: authH() });
    if(profRes.ok) {
      const profData = await profRes.json();
      saveAuth(token, profData.user);
    }

    toast('🎉 Siparişiniz oluşturuldu!', 'success');
    showPage('orders');
  } catch (err) {
    const errEl = document.getElementById('inv-error');
    errEl.textContent = err.message || 'Sipariş oluşturulamadı.';
    errEl.classList.remove('hidden');
  } finally { resetBtn(btn, 'Siparişi Onayla'); }
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
    // Calculate total tax
    let totalTax = 0;
    let totalPreTax = 0;
    (o.items||[]).forEach(item => {
      const price = Number(item.price);
      const qty = item.quantity;
      const taxRate = item.product?.taxRate || 18; // Default 18% if not found
      const preTax = price / (1 + (taxRate / 100));
      const tax = price - preTax;
      totalPreTax += preTax * qty;
      totalTax += tax * qty;
    });

    return `
    <div class="order-card">
      <div class="order-top">
        <div>
          <div class="order-id">Sipariş #${o.id}</div>
          <div class="order-date">${new Date(o.orderDate).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div class="order-amount">₺${Number(o.totalPrice).toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
      </div>
      <div class="order-lines">
        ${(o.items||[]).map(item => `
          <div class="order-line">
            <span class="oname">${esc(item.product?.name||'Ürün')} × ${item.quantity} <small style="color:var(--dim); font-size:11px;">(%${item.product?.taxRate||18} KDV)</small></span>
            <span class="oprice">₺${(Number(item.price)*item.quantity).toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
          </div>`).join('')}
      </div>
      <div style="border-top: 1px dashed var(--border); margin-top: 12px; padding-top: 12px; font-size: 13px; color: var(--text-2); display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
        <div>KDV Hariç Tutar: <strong>₺${totalPreTax.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>
        <div>KDV Tutarı: <strong>₺${totalTax.toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>
        ${Number(o.shippingFee) > 0 ? `<div>Kargo Ücreti: <strong>₺${Number(o.shippingFee).toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>` : ''}
        <div style="font-size: 15px; color: var(--text); margin-top: 4px;">KDV Dahil Toplam: <strong>₺${Number(o.totalPrice).toLocaleString('tr-TR',{minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>
      </div>
    </div>`;
  }).join('');
}



/* ════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════ */
function showPage(page) {
  ['landing-page','shop-page','orders-page','admin-page'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.classList.remove('page'); }
  });

  if (page === 'home' || page === 'landing') {
    const lp = document.getElementById('landing-page');
    if (lp) { lp.classList.remove('hidden'); lp.classList.add('page'); }
  } else if (page === 'shop') {
    const sp = document.getElementById('shop-page');
    if (sp) { sp.classList.remove('hidden'); sp.classList.add('page'); }
    renderProducts(getFiltered());
  } else if (page === 'orders') {
    if (!token) { openAuthModal('login'); return; }
    const op = document.getElementById('orders-page');
    if (op) { op.classList.remove('hidden'); op.classList.add('page'); }
    loadOrders();
  } else if (page === 'admin') {
    window.location.href = '/admin.html';
  }
  window.scrollTo(0, 0);
}

/* ════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════ */
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


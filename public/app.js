/* ── CONFIG ─────────────────────────────────────────── */
const API = 'http://localhost:3000/api';

/* ── STATE ──────────────────────────────────────────── */
let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let allProducts = [];
let cartItems = [];

/* ── INIT ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadProducts();
  if (token) loadCart();
});

/* ════════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════════ */
function updateAuthUI() {
  const authSec = document.getElementById('auth-section');
  const userSec = document.getElementById('user-section');
  const userName = document.getElementById('user-name');
  const adminLinks = document.querySelectorAll('.admin-only');

  if (token && currentUser) {
    authSec.classList.add('hidden');
    userSec.classList.remove('hidden');
    userName.textContent = currentUser.name || currentUser.email;
    if (currentUser.role === 'ADMIN') {
      adminLinks.forEach(el => el.classList.remove('hidden'));
    }
  } else {
    authSec.classList.remove('hidden');
    userSec.classList.add('hidden');
    adminLinks.forEach(el => el.classList.add('hidden'));
  }
}

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal-overlay').classList.add('open');
  switchAuthTab(tab);
  document.getElementById('auth-error').classList.add('hidden');
}
function closeAuthModal() {
  document.getElementById('auth-modal-overlay').classList.remove('open');
}
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('register-form').classList.toggle('hidden', isLogin);
  document.getElementById('login-tab').classList.toggle('active', isLogin);
  document.getElementById('register-tab').classList.toggle('active', !isLogin);
  document.getElementById('auth-error').classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-submit');
  const errEl = document.getElementById('auth-error');
  btn.disabled = true; btn.textContent = 'Giriş yapılıyor...';
  errEl.classList.add('hidden');

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Giriş başarısız');
    saveAuth(data.data.token, data.data.user);
    closeAuthModal();
    toast('Hoş geldiniz, ' + (data.data.user.name || data.data.user.email) + '! 👋', 'success');
    loadCart();
    if (data.data.user.role === 'ADMIN' && document.getElementById('admin-page').classList.contains('active')) {
      loadAdminData();
    }
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Giriş Yap';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-submit');
  const errEl = document.getElementById('auth-error');
  btn.disabled = true; btn.textContent = 'Kayıt olunuyor...';
  errEl.classList.add('hidden');

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Kayıt başarısız');
    saveAuth(data.data.token, data.data.user);
    closeAuthModal();
    toast('Hesabınız oluşturuldu! 🎉', 'success');
    loadCart();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Kayıt Ol';
  }
}

function saveAuth(t, user) {
  token = t; currentUser = user;
  localStorage.setItem('token', t);
  localStorage.setItem('user', JSON.stringify(user));
  updateAuthUI();
}

function logout() {
  token = null; currentUser = null; cartItems = [];
  localStorage.removeItem('token'); localStorage.removeItem('user');
  updateAuthUI();
  updateCartUI();
  showPage('products');
  toast('Çıkış yapıldı.', 'info');
}

/* ════════════════════════════════════════════════════════
   PRODUCTS
════════════════════════════════════════════════════════ */
async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    const data = await res.json();
    allProducts = data.data || [];
    renderProducts(allProducts);
  } catch {
    toast('Ürünler yüklenemedi.', 'error');
  }
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  if (!products.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>Ürün bulunamadı.</p></div>`;
    return;
  }
  const EMOJIS = ['📱','💻','🎮','⌚','🎧','📷','🖥️','⌨️'];
  grid.innerHTML = products.map((p, i) => {
    const inStock = p.stock > 0;
    const stockClass = p.stock === 0 ? 'stock-out' : p.stock < 5 ? 'stock-low' : '';
    const stockText = p.stock === 0 ? 'Stok yok' : p.stock < 5 ? `Son ${p.stock} adet!` : `${p.stock} adet`;
    const imgContent = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.name}" onerror="this.parentElement.innerHTML='${EMOJIS[i % EMOJIS.length]}'" />`
      : EMOJIS[i % EMOJIS.length];

    return `
    <div class="product-card" id="product-card-${p.id}">
      <div class="product-img">${imgContent}</div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description}</div>
        <div class="product-footer">
          <div>
            <div class="product-price">₺${Number(p.price).toLocaleString('tr-TR', {minimumFractionDigits:2})}</div>
            <div class="product-stock ${stockClass}">${stockText}</div>
          </div>
          <button class="add-to-cart-btn" id="add-btn-${p.id}"
            onclick="addToCart(${p.id}, '${p.name}', ${p.price})"
            ${inStock ? '' : 'disabled'}>
            ${inStock ? '🛒 Ekle' : 'Tükendi'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterProducts() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderProducts(allProducts.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
}

/* ════════════════════════════════════════════════════════
   CART
════════════════════════════════════════════════════════ */
async function loadCart() {
  if (!token) return;
  try {
    const res = await fetch(`${API}/cart`, { headers: authHeaders() });
    const data = await res.json();
    cartItems = data.data || [];
    updateCartUI();
  } catch {}
}

async function addToCart(productId, name, price) {
  if (!token) { openAuthModal('login'); toast('Sepete eklemek için giriş yapın.', 'info'); return; }
  const btn = document.getElementById(`add-btn-${productId}`);
  btn.disabled = true; btn.textContent = '⏳';
  try {
    const res = await fetch(`${API}/cart`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
    await loadCart();
    toast(`${name} sepete eklendi! 🛒`, 'success');
  } catch (err) {
    toast(err.message || 'Hata oluştu.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = '🛒 Ekle';
  }
}

async function removeFromCart(productId) {
  try {
    await fetch(`${API}/cart/${productId}`, { method: 'DELETE', headers: authHeaders() });
    cartItems = cartItems.filter(i => i.productId !== productId);
    updateCartUI();
    toast('Ürün sepetten çıkarıldı.', 'info');
  } catch {
    toast('Hata oluştu.', 'error');
  }
}

function updateCartUI() {
  const count = cartItems.reduce((s, i) => s + i.quantity, 0);
  document.getElementById('cart-count').textContent = count;

  const itemsEl = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');
  const EMOJIS = ['📱','💻','🎮','⌚','🎧','📷','🖥️','⌨️'];

  if (!cartItems.length) {
    itemsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><p>Sepetiniz boş</p></div>`;
    footerEl.style.display = 'none';
    return;
  }

  let total = 0;
  itemsEl.innerHTML = cartItems.map((item, i) => {
    const subtotal = Number(item.product?.price || 0) * item.quantity;
    total += subtotal;
    return `
    <div class="cart-item">
      <div class="cart-item-emoji">${EMOJIS[i % EMOJIS.length]}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product?.name || 'Ürün'}</div>
        <div class="cart-item-price">₺${subtotal.toLocaleString('tr-TR', {minimumFractionDigits:2})}</div>
        <div class="cart-item-qty">${item.quantity} adet × ₺${Number(item.product?.price || 0).toLocaleString('tr-TR', {minimumFractionDigits:2})}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.productId})" title="Çıkar">✕</button>
    </div>`;
  }).join('');

  document.getElementById('cart-total').textContent = `₺${total.toLocaleString('tr-TR', {minimumFractionDigits:2})}`;
  footerEl.style.display = 'block';
}

function toggleCart() {
  const sidebar = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('cart-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

async function createOrder() {
  if (!cartItems.length) return;
  const btn = document.getElementById('checkout-btn');
  btn.disabled = true; btn.textContent = '⏳ İşleniyor...';
  try {
    const res = await fetch(`${API}/orders`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    cartItems = [];
    updateCartUI();
    toggleCart();
    toast('🎉 Siparişiniz oluşturuldu!', 'success');
    showPage('orders');
  } catch (err) {
    toast(err.message || 'Sipariş oluşturulamadı.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Sipariş Ver';
  }
}

/* ════════════════════════════════════════════════════════
   ORDERS
════════════════════════════════════════════════════════ */
async function loadOrders() {
  if (!token) { openAuthModal('login'); return; }
  try {
    const res = await fetch(`${API}/orders`, { headers: authHeaders() });
    const data = await res.json();
    renderOrders(data.data || []);
  } catch {
    toast('Siparişler yüklenemedi.', 'error');
  }
}

function renderOrders(orders) {
  const container = document.getElementById('orders-container');
  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state" id="orders-empty">
        <div class="empty-icon">📦</div>
        <h3>Henüz sipariş yok</h3>
        <p>Ürünleri sepete ekleyip sipariş oluşturabilirsiniz.</p>
        <button class="btn btn-primary" onclick="showPage('products')">Alışverişe Git</button>
      </div>`;
    return;
  }
  container.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">Sipariş #${o.id}</div>
          <div class="order-date">${new Date(o.orderDate).toLocaleDateString('tr-TR', {day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div class="order-total">₺${Number(o.totalPrice).toLocaleString('tr-TR', {minimumFractionDigits:2})}</div>
      </div>
      <div class="order-items-list">
        ${(o.items || []).map(item => `
          <div class="order-item-row">
            <span class="name">${item.product?.name || 'Ürün'} × ${item.quantity}</span>
            <span class="price">₺${(Number(item.price) * item.quantity).toLocaleString('tr-TR', {minimumFractionDigits:2})}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════
   ADMIN
════════════════════════════════════════════════════════ */
async function loadAdminData() {
  await Promise.all([loadAdminProducts(), loadAdminUsers()]);
}

async function loadAdminProducts() {
  const res = await fetch(`${API}/products`);
  const data = await res.json();
  const tbody = document.getElementById('admin-products-body');
  tbody.innerHTML = (data.data || []).map(p => `
    <tr>
      <td>#${p.id}</td>
      <td><strong>${p.name}</strong></td>
      <td>₺${Number(p.price).toLocaleString('tr-TR', {minimumFractionDigits:2})}</td>
      <td>${p.stock}</td>
      <td class="actions">
        <button class="btn btn-sm btn-outline" onclick="openProductModal(${JSON.stringify(p).replace(/"/g,'&quot;')})">Düzenle</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Sil</button>
      </td>
    </tr>`).join('');
}

async function loadAdminUsers() {
  const res = await fetch(`${API}/admin/users`, { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById('admin-users-body');
  tbody.innerHTML = (data.data || []).map(u => `
    <tr>
      <td>#${u.id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="role-badge role-${u.role.toLowerCase()}">${u.role}</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
    </tr>`).join('');
}

function openProductModal(product = null) {
  const isEdit = !!product;
  document.getElementById('product-modal-title').textContent = isEdit ? 'Ürünü Düzenle' : 'Ürün Ekle';
  document.getElementById('product-id').value = isEdit ? product.id : '';
  document.getElementById('prod-name').value = isEdit ? product.name : '';
  document.getElementById('prod-desc').value = isEdit ? product.description : '';
  document.getElementById('prod-price').value = isEdit ? product.price : '';
  document.getElementById('prod-stock').value = isEdit ? product.stock : '';
  document.getElementById('prod-image').value = isEdit ? (product.imageUrl || '') : '';
  document.getElementById('prod-error').classList.add('hidden');
  document.getElementById('product-modal-overlay').classList.add('open');
}
function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('open');
}

async function handleProductSave(e) {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const isEdit = !!id;
  const btn = document.getElementById('product-submit');
  btn.disabled = true; btn.textContent = 'Kaydediliyor...';

  const body = {
    name: document.getElementById('prod-name').value,
    description: document.getElementById('prod-desc').value,
    price: parseFloat(document.getElementById('prod-price').value),
    stock: parseInt(document.getElementById('prod-stock').value),
  };
  const imgUrl = document.getElementById('prod-image').value;
  if (imgUrl) body.imageUrl = imgUrl;

  try {
    const url = isEdit ? `${API}/admin/products/${id}` : `${API}/admin/products`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    closeProductModal();
    toast(isEdit ? 'Ürün güncellendi ✅' : 'Ürün eklendi ✅', 'success');
    loadAdminProducts();
    loadProducts();
  } catch (err) {
    const errEl = document.getElementById('prod-error');
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Kaydet';
  }
}

async function deleteProduct(id) {
  if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
  try {
    await fetch(`${API}/admin/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    toast('Ürün silindi.', 'info');
    loadAdminProducts();
    loadProducts();
  } catch {
    toast('Ürün silinemedi.', 'error');
  }
}

function switchAdminTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.remove('hidden');
  event.target.classList.add('active');
}

/* ════════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════════ */
function showPage(page) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

  const heroSection = document.getElementById('hero-section');

  if (page === 'products') {
    document.getElementById('products-page').classList.remove('hidden');
    document.getElementById('products-page').classList.add('active');
    document.getElementById('nav-products').classList.add('active');
    heroSection.style.display = 'flex';
  } else if (page === 'orders') {
    if (!token) { openAuthModal('login'); return; }
    document.getElementById('orders-page').classList.remove('hidden');
    document.getElementById('orders-page').classList.add('active');
    document.getElementById('nav-orders').classList.add('active');
    heroSection.style.display = 'none';
    loadOrders();
  } else if (page === 'admin') {
    if (!token || currentUser?.role !== 'ADMIN') { toast('Yetkisiz erişim.', 'error'); return; }
    document.getElementById('admin-page').classList.remove('hidden');
    document.getElementById('admin-page').classList.add('active');
    document.getElementById('nav-admin').classList.add('active');
    heroSection.style.display = 'none';
    loadAdminData();
  }
}

/* ════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════ */
function authHeaders() {
  return { 'Authorization': `Bearer ${token}` };
}

function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

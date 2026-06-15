/* ── landing.js — sadece index.html (misafir) için ─── */
const API = window.location.origin + '/api';

/* Token varsa direkt shop'a yönlendir */
(function() {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.replace('/shop');
  }
})();

/* ── STATE ─────────────────────────────────────────── */
let allProducts = [];

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

/* ── INIT ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadPreviewProducts();
});

/* ── PREVIEW PRODUCTS ────────────────────────────────── */
async function loadPreviewProducts() {
  try {
    const res  = await fetch(`${API}/products`);
    const data = await res.json();
    allProducts = data.data || [];
    renderPreview();
  } catch { /* sessizce geç */ }
}

function renderPreview() {
  const grid = document.getElementById('preview-grid');
  if (!grid) return;
  const sample = allProducts.slice(0, 4);
  grid.innerHTML = sample.map((p, i) => buildPreviewCard(p, i)).join('');
}

function buildPreviewCard(p, i) {
  const cat   = p.category || CAT_KEYS[i % CAT_KEYS.length];
  const emoji = CAT_MAP[cat]?.emoji || EMOJIS[i % EMOJIS.length];
  const price = Number(p.price);
  const out   = p.stock === 0;
  const low   = p.stock > 0 && p.stock < 5;
  const stockTxt = out ? 'Tükendi' : low ? `Son ${p.stock}!` : `${p.stock} stok`;
  const stockCls = out ? 'stock-out' : low ? 'stock-low' : '';

  return `<div class="product-card">
    <div class="card-img">
      ${p.imageUrl
        ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'" />`
        : `<div style="font-size:64px">${emoji}</div>`
      }
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
        <button class="add-btn" onclick="openAuthModal('login')">Giriş Yap</button>
      </div>
    </div>
  </div>`;
}

function searchFromNav() {
  /* landing'de arama kutusuna yazıldığında login modal'ını aç */
  const q = document.getElementById('nav-search-input')?.value || '';
  if (q.length > 0) openAuthModal('login');
}

/* ── AUTH MODAL ──────────────────────────────────────── */
function openAuthModal(tab = 'login') {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.add('open');
  overlay.style.display = 'flex';
  switchAuthTab(tab);
  document.getElementById('auth-error').classList.add('hidden');
}
function closeAuthModal() {
  document.getElementById('auth-overlay').classList.remove('open');
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
  const btn   = document.getElementById('login-submit');
  const errEl = document.getElementById('auth-error');
  setLoading(btn, 'Giriş yapılıyor...');
  errEl.classList.add('hidden');
  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: v('login-email'), password: v('login-password') })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Giriş başarısız');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    /* Admin ise /admin, normal kullanıcı ise /shop */
    window.location.href = data.user.role === 'ADMIN' ? '/admin' : '/shop';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    resetBtn(btn, 'Giriş Yap');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn   = document.getElementById('register-submit');
  const errEl = document.getElementById('auth-error');
  setLoading(btn, 'Oluşturuluyor...');
  errEl.classList.add('hidden');
  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: v('reg-name'), email: v('reg-email'), password: v('reg-password') })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Kayıt başarısız');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/shop';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    resetBtn(btn, 'Hesap Oluştur');
  }
}

/* ── HELPERS ─────────────────────────────────────────── */
function v(id)  { return document.getElementById(id)?.value || ''; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
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

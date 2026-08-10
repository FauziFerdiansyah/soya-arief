/**
 * Gerbang login untuk /webadmin/.
 *
 * Password tidak disimpan di kode, hanya SHA-256 hash-nya
 * (VITE_ADMIN_PASSWORD_HASH). Input user di-hash lalu dibandingkan.
 *
 * Sesi disimpan di localStorage sehingga berlaku untuk semua tab, dan
 * disinkronkan lewat event `storage`: login atau logout di satu tab
 * langsung berlaku di tab lain.
 *
 * Tampilan memakai variabel CSS dan komponen Bootstrap yang sama dengan
 * panel admin (assets/css/style.css), jadi kalau palet admin diubah,
 * halaman login ikut menyesuaikan.
 *
 * BATASAN PENTING: pemeriksaan ini berjalan di browser, jadi sifatnya
 * hanya penghalang UI. Perlindungan data yang sebenarnya ada di
 * firestore.rules.
 */
const SESSION_KEY = 'webadmin:session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 jam
const EXPECTED_HASH = (import.meta.env.VITE_ADMIN_PASSWORD_HASH ?? '').toLowerCase();

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Baca sesi yang masih berlaku, atau null kalau tidak ada / kedaluwarsa. */
function readSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);

    if (typeof session?.expiresAt !== 'number' || Date.now() >= session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ loggedInAt: Date.now(), expiresAt: Date.now() + SESSION_MAX_AGE_MS })
  );
}

/** Keluar dari sesi admin. Tab lain ikut terkunci lewat event `storage`. */
export function logoutAdmin() {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

function injectStyles() {
  if (document.getElementById('admin-gate-styles')) return;

  const style = document.createElement('style');
  style.id = 'admin-gate-styles';
  style.textContent = `
    body.admin-gate-locked { overflow: hidden; }
    body.admin-gate-locked > #wrapper { display: none !important; }

    .agate {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      overflow: hidden;
      background-color: var(--secondary-color, #f3f9fd);
      font-family: Inter, Helvetica, sans-serif;
      color: var(--black, #071437);
    }

    /* Aksen lembut, warna diambil dari palet admin */
    .agate__glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(70px);
      pointer-events: none;
    }
    .agate__glow--1 {
      width: 26rem; height: 26rem;
      top: -9rem; left: -7rem;
      background: var(--primary-color-light, #b3dcff);
      opacity: 0.55;
    }
    .agate__glow--2 {
      width: 22rem; height: 22rem;
      bottom: -8rem; right: -6rem;
      background: var(--tertiary-color, #80cbc4);
      opacity: 0.28;
    }

    .agate__card {
      position: relative;
      width: 100%;
      max-width: 25rem;
      padding: 2.25rem 2rem 1.75rem;
      border: 1px solid var(--gray, #f7f8fb);
      border-radius: 15px;
      background-color: var(--white, #fff);
      box-shadow: 0 0.75rem 2.5rem rgba(7, 20, 55, 0.1);
      animation: agate-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes agate-rise {
      from { opacity: 0; transform: translateY(0.75rem); }
      to   { opacity: 1; transform: none; }
    }
    .agate__card.is-shaking { animation: agate-shake 0.36s ease; }
    @keyframes agate-shake {
      20%, 80% { transform: translateX(3px); }
      40%, 60% { transform: translateX(-5px); }
      50%      { transform: translateX(5px); }
    }

    .agate__badge {
      width: 3.5rem;
      height: 3.5rem;
      margin: 0 auto 1.125rem;
      display: grid;
      place-items: center;
      border-radius: 15px;
      background-color: rgba(0, 123, 255, 0.1);
      color: var(--primary-color, #007bff);
      font-size: 1.65rem;
      line-height: 1;
    }

    .agate__title {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
      text-align: center;
      color: var(--black, #071437);
    }
    .agate__subtitle {
      margin: 0.375rem 0 1.75rem;
      font-size: 0.875rem;
      text-align: center;
      color: var(--black3, #84878f);
    }

    .agate__label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--link-color, #252f4a);
    }

    /* Input memakai .form-control dari style.css, hanya beri ruang tombol mata */
    .agate__field { position: relative; }
    .agate__field .form-control { padding-right: 3rem; }
    .agate__toggle {
      position: absolute;
      top: 50%;
      right: 0.5rem;
      transform: translateY(-50%);
      width: 2.25rem;
      height: 2.25rem;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--black3, #84878f);
      font-size: 1.15rem;
      cursor: pointer;
      transition: color 0.15s ease, background-color 0.15s ease;
    }
    .agate__toggle:hover {
      color: var(--primary-color, #007bff);
      background-color: var(--gray, #f7f8fb);
    }
    .agate__toggle:focus-visible,
    .agate__submit:focus-visible {
      outline: 2px solid var(--primary-color, #007bff);
      outline-offset: 2px;
    }
    .agate__field .form-control[aria-invalid="true"] {
      border-color: #f1aeb5;
    }

    .agate__note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.875rem 0 0;
      padding: 0.55rem 0.75rem;
      border-radius: 10px;
      font-size: 0.8125rem;
      line-height: 1.35;
    }
    .agate__note[hidden] { display: none; }
    .agate__note i { font-size: 1rem; flex-shrink: 0; }
    .agate__note--error {
      background-color: #fdeced;
      border: 1px solid #f8d7da;
      color: #b02a37;
    }
    .agate__note--warn {
      background-color: #fff8e6;
      border: 1px solid #ffe69c;
      color: #8a6100;
    }

    .agate__submit {
      width: 100%;
      margin-top: 1.25rem;
      padding: 0.7rem 1rem;
      border: 1px solid var(--primary-color, #007bff);
      border-radius: 10px;
      background-color: var(--primary-color, #007bff);
      color: var(--white, #fff);
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.2s ease;
    }
    .agate__submit:hover:not([disabled]) {
      background-color: var(--primary-color-active, #056ee9);
      border-color: var(--primary-color-active, #056ee9);
      box-shadow: 0 0.35rem 0.9rem rgba(0, 123, 255, 0.25);
    }
    .agate__submit[disabled] { cursor: progress; opacity: 0.75; }
    .agate__spinner {
      display: inline-block;
      width: 0.875rem;
      height: 0.875rem;
      margin-right: 0.45rem;
      vertical-align: -0.1rem;
      border: 2px solid rgba(255, 255, 255, 0.45);
      border-top-color: #fff;
      border-radius: 50%;
      animation: agate-spin 0.7s linear infinite;
    }
    @keyframes agate-spin { to { transform: rotate(360deg); } }

    .agate__divider {
      margin: 1.5rem 0 0;
      border-top: 1px solid var(--gray, #f7f8fb);
    }
    .agate__footer {
      margin: 0.875rem 0 0;
      font-size: 0.75rem;
      text-align: center;
      color: var(--black3, #84878f);
    }
    .agate__brand {
      display: block;
      margin-top: 0.25rem;
      font-weight: 500;
      color: var(--link-color, #252f4a);
    }

    @media (max-width: 26rem) {
      .agate__card { padding: 2rem 1.375rem 1.5rem; }
      .agate__title { font-size: 1.15rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .agate__card,
      .agate__card.is-shaking,
      .agate__spinner { animation: none !important; }
      .agate__submit, .agate__toggle { transition: none; }
    }
  `;
  document.head.appendChild(style);
}

function buildOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'agate';
  overlay.id = 'admin-gate';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'admin-gate-title');

  overlay.innerHTML = `
    <div class="agate__glow agate__glow--1" aria-hidden="true"></div>
    <div class="agate__glow agate__glow--2" aria-hidden="true"></div>

    <div class="agate__card" id="admin-gate-card">
      <div class="agate__badge" aria-hidden="true">
        <i class="ri-shield-keyhole-line"></i>
      </div>

      <h1 class="agate__title" id="admin-gate-title">Admin Panel</h1>
      <p class="agate__subtitle">Masuk untuk mengelola data undangan</p>

      <form id="admin-gate-form" novalidate>
        <label class="agate__label" for="admin-gate-password">Password</label>

        <div class="agate__field">
          <input
            class="form-control"
            id="admin-gate-password"
            name="password"
            type="password"
            placeholder="Masukkan password"
            autocomplete="current-password"
            aria-describedby="admin-gate-error admin-gate-caps"
            required
          />
          <button
            class="agate__toggle"
            id="admin-gate-toggle"
            type="button"
            aria-label="Tampilkan password"
            aria-pressed="false"
          >
            <i class="ri-eye-line" aria-hidden="true"></i>
          </button>
        </div>

        <p class="agate__note agate__note--warn" id="admin-gate-caps" aria-live="polite" hidden>
          <i class="ri-information-line" aria-hidden="true"></i>
          <span>Caps Lock sedang aktif</span>
        </p>

        <p class="agate__note agate__note--error" id="admin-gate-error" role="alert" aria-live="polite" hidden>
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          <span id="admin-gate-error-text"></span>
        </p>

        <button class="agate__submit" id="admin-gate-submit" type="submit">
          <i class="ri-login-circle-line" aria-hidden="true"></i> Masuk
        </button>
      </form>

      <div class="agate__divider"></div>
      <p class="agate__footer">
        Sesi berlaku di semua tab &middot; berakhir otomatis setelah 8 jam
        <span class="agate__brand">Arief &amp; Soya</span>
      </p>
    </div>
  `;

  return overlay;
}

function wireToggle(input, toggle) {
  toggle.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    toggle.setAttribute('aria-pressed', String(!showing));
    toggle.setAttribute('aria-label', showing ? 'Tampilkan password' : 'Sembunyikan password');
    toggle.innerHTML = showing
      ? '<i class="ri-eye-line" aria-hidden="true"></i>'
      : '<i class="ri-eye-off-line" aria-hidden="true"></i>';
    input.focus();
  });
}

/** Ingatkan kalau Caps Lock aktif, penyebab umum password ditolak. */
function wireCapsLockHint(input, hint) {
  const update = (event) => {
    if (typeof event.getModifierState !== 'function') return;
    hint.hidden = !event.getModifierState('CapsLock');
  };

  input.addEventListener('keyup', update);
  input.addEventListener('keydown', update);
  input.addEventListener('blur', () => {
    hint.hidden = true;
  });
}

function lock() {
  if (document.getElementById('admin-gate')) return;

  injectStyles();
  document.body.classList.add('admin-gate-locked');

  const overlay = buildOverlay();
  document.body.appendChild(overlay);

  const card = overlay.querySelector('#admin-gate-card');
  const form = overlay.querySelector('#admin-gate-form');
  const input = overlay.querySelector('#admin-gate-password');
  const toggle = overlay.querySelector('#admin-gate-toggle');
  const error = overlay.querySelector('#admin-gate-error');
  const errorText = overlay.querySelector('#admin-gate-error-text');
  const caps = overlay.querySelector('#admin-gate-caps');
  const submit = overlay.querySelector('#admin-gate-submit');

  wireToggle(input, toggle);
  wireCapsLockHint(input, caps);
  input.focus();

  const showError = (message) => {
    errorText.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');

    card.classList.remove('is-shaking');
    void card.offsetWidth; // paksa reflow supaya animasi bisa diulang
    card.classList.add('is-shaking');
  };

  const clearError = () => {
    error.hidden = true;
    errorText.textContent = '';
    input.removeAttribute('aria-invalid');
  };

  input.addEventListener('input', clearError);
  card.addEventListener('animationend', () => card.classList.remove('is-shaking'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    if (!EXPECTED_HASH) {
      showError('Password belum dikonfigurasi. Hubungi pengelola situs.');
      return;
    }

    if (!input.value) {
      showError('Password belum diisi.');
      input.focus();
      return;
    }

    submit.disabled = true;
    submit.innerHTML = '<span class="agate__spinner" aria-hidden="true"></span>Memeriksa...';

    try {
      const hash = await sha256Hex(input.value);

      if (hash === EXPECTED_HASH) {
        writeSession();
        document.body.classList.remove('admin-gate-locked');
        overlay.remove();
        window.dispatchEvent(new CustomEvent('admin:unlocked'));
        return;
      }

      showError('Password salah. Coba lagi.');
      input.value = '';
      input.focus();
    } catch (err) {
      console.error('Gagal memeriksa password:', err);
      showError('Terjadi kesalahan saat memeriksa password.');
    } finally {
      submit.disabled = false;
      submit.innerHTML = '<i class="ri-login-circle-line" aria-hidden="true"></i> Masuk';
    }
  });
}

function wireLogoutButtons() {
  document.querySelectorAll('[data-admin-logout]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      logoutAdmin();
    });
  });
}

/**
 * Sinkronisasi antar tab. Event `storage` hanya terpicu di tab lain,
 * bukan tab yang melakukan perubahan.
 */
function wireCrossTabSync() {
  window.addEventListener('storage', (event) => {
    if (event.key !== SESSION_KEY && event.key !== null) return;

    const unlocked = !document.getElementById('admin-gate');
    const hasSession = readSession() !== null;

    if (unlocked && !hasSession) {
      window.location.reload();
      return;
    }

    if (!unlocked && hasSession) {
      window.location.reload();
    }
  });
}

/** Kunci ulang otomatis begitu masa sesi habis. */
function scheduleExpiry() {
  const session = readSession();
  if (!session) return;

  window.setTimeout(() => {
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }, session.expiresAt - Date.now());
}

function start() {
  if (!EXPECTED_HASH) {
    console.error(
      'VITE_ADMIN_PASSWORD_HASH belum diset. Login diblokir. ' +
        'Buat hash dengan: npm run hash:password "password-anda"'
    );
  }

  wireLogoutButtons();
  wireCrossTabSync();

  if (readSession()) {
    scheduleExpiry();
  } else {
    lock();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

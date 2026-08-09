/**
 * Gerbang login sederhana untuk /webadmin/.
 *
 * Password tidak disimpan di kode. Yang disimpan hanya SHA-256 hash
 * (VITE_ADMIN_PASSWORD_HASH). Input user di-hash lalu dibandingkan.
 *
 * BATASAN PENTING: pemeriksaan ini berjalan di browser, jadi sifatnya
 * hanya penghalang UI. Perlindungan data yang sebenarnya ada di
 * firestore.rules. Jangan taruh data sensitif dengan asumsi halaman
 * ini tidak bisa dilewati.
 */
const SESSION_KEY = 'webadmin:authenticated';
const EXPECTED_HASH = (import.meta.env.VITE_ADMIN_PASSWORD_HASH ?? '').toLowerCase();

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'admin-gate';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'admin-gate-title');
  overlay.innerHTML = `
    <form id="admin-gate-form" novalidate>
      <h1 id="admin-gate-title">Admin Panel</h1>
      <label for="admin-gate-password">Password</label>
      <input
        id="admin-gate-password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
        aria-describedby="admin-gate-error"
      />
      <button type="submit">Masuk</button>
      <p id="admin-gate-error" role="alert" aria-live="polite"></p>
    </form>
  `;
  return overlay;
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #admin-gate {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1f2933;
      padding: 1rem;
    }
    #admin-gate form {
      background: #fff;
      border-radius: 8px;
      padding: 2rem;
      width: 100%;
      max-width: 22rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }
    #admin-gate h1 { font-size: 1.25rem; margin: 0 0 1.25rem; text-align: center; }
    #admin-gate label { display: block; font-size: 0.875rem; margin-bottom: 0.375rem; }
    #admin-gate input {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid #b7c0c9;
      border-radius: 4px;
      font-size: 1rem;
    }
    #admin-gate input:focus-visible { outline: 3px solid #2f6fed; outline-offset: 1px; }
    #admin-gate button {
      width: 100%;
      margin-top: 1rem;
      padding: 0.625rem 0.75rem;
      border: 0;
      border-radius: 4px;
      background: #2f6fed;
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
    }
    #admin-gate button:focus-visible { outline: 3px solid #12304f; outline-offset: 2px; }
    #admin-gate button[disabled] { opacity: 0.6; cursor: progress; }
    #admin-gate p {
      min-height: 1.25rem;
      margin: 0.75rem 0 0;
      color: #b3261e;
      font-size: 0.875rem;
      text-align: center;
    }
    body.admin-gate-locked > #wrapper { display: none !important; }
  `;
  document.head.appendChild(style);
}

function unlock(overlay) {
  document.body.classList.remove('admin-gate-locked');
  overlay.remove();
  window.dispatchEvent(new CustomEvent('admin:unlocked'));
}

function start() {
  if (!EXPECTED_HASH) {
    console.error(
      'VITE_ADMIN_PASSWORD_HASH belum diset. Login diblokir. ' +
        'Buat hash dengan: npm run hash:password "password-anda"'
    );
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    return;
  }

  injectStyles();
  document.body.classList.add('admin-gate-locked');

  const overlay = buildOverlay();
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#admin-gate-form');
  const input = overlay.querySelector('#admin-gate-password');
  const error = overlay.querySelector('#admin-gate-error');
  const button = overlay.querySelector('button');

  input.focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';

    if (!EXPECTED_HASH) {
      error.textContent = 'Konfigurasi password belum diset.';
      return;
    }

    button.disabled = true;

    try {
      const hash = await sha256Hex(input.value);

      if (hash === EXPECTED_HASH) {
        sessionStorage.setItem(SESSION_KEY, '1');
        unlock(overlay);
        return;
      }

      error.textContent = 'Password salah.';
      input.value = '';
      input.focus();
    } catch (err) {
      console.error('Gagal memeriksa password:', err);
      error.textContent = 'Terjadi kesalahan. Coba lagi.';
    } finally {
      button.disabled = false;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

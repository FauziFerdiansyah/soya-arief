/**
 * Editor foto untuk panel admin.
 *
 * Menyediakan pratinjau berukuran sama dengan kotak aslinya di undangan,
 * lengkap dengan geser posisi, zoom, dan rotasi. Komponen ini murni UI:
 * unggah, simpan, dan hapus diserahkan ke callback pemanggilnya.
 */
import { DEFAULT_TRANSFORM, sanitizeTransform, applyMediaTransform, cloudinaryUrl } from './site-media.js';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const OUTPUT_MAX_EDGE = 1600;
const OUTPUT_QUALITY = 0.8;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Perkecil dan ubah gambar menjadi WebP di browser supaya undangan tetap
 * ringan tanpa perlu proses di server.
 */
export async function compressImage(file, maxEdge = OUTPUT_MAX_EDGE) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Format foto harus JPG, PNG, atau WebP.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran foto maksimal 10 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/webp', OUTPUT_QUALITY);
  });

  if (!blob) throw new Error('Foto tidak dapat diproses di browser ini.');
  return blob;
}

function buildButton(className, icon, label, title = label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.title = title;
  button.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${label}</span>`;
  return button;
}

export function createMediaEditor({ slot, item = null, onUpload, onSave, onRemove, compact = false, previewTransform = null }) {
  let current = item ? { ...item } : null;
  let transform = sanitizeTransform(current ?? DEFAULT_TRANSFORM);

  const root = document.createElement('div');
  root.className = `media-editor${compact ? ' media-editor--compact' : ''}`;

  const frame = document.createElement('div');
  frame.className = 'media-editor__frame';
  frame.style.aspectRatio = slot.aspect;
  frame.style.borderRadius = slot.radius;

  const image = document.createElement('img');
  image.className = 'media-editor__image';
  image.alt = '';
  image.draggable = false;

  const empty = document.createElement('span');
  empty.className = 'media-editor__empty';
  empty.textContent = 'Belum ada foto';

  // Indikator area pangkas: sudut kotak seperti pemotong foto profil.
  // Bentuknya selalu kotak walau hasil akhirnya membulat di undangan.
  const guide = document.createElement('span');
  guide.className = 'media-editor__guide';
  guide.setAttribute('aria-hidden', 'true');
  guide.innerHTML = '<i></i><i></i><i></i><i></i>';

  frame.append(image, empty, guide);

  const controls = document.createElement('div');
  controls.className = 'media-editor__controls';

  const zoomWrap = document.createElement('label');
  zoomWrap.className = 'media-editor__zoom';
  zoomWrap.innerHTML = '<span><i class="ri-zoom-in-line" aria-hidden="true"></i> Zoom</span>';

  const zoom = document.createElement('input');
  zoom.type = 'range';
  zoom.className = 'form-range';
  zoom.min = '1';
  zoom.max = '4';
  zoom.step = '0.01';
  zoomWrap.appendChild(zoom);

  const buttons = document.createElement('div');
  buttons.className = 'media-editor__buttons';

  const file = document.createElement('input');
  file.type = 'file';
  file.accept = ALLOWED_TYPES.join(',');
  file.hidden = true;

  const pick = buildButton('btn btn-sm btn-outline-primary', 'ri-upload-2-line', 'Unggah Foto');
  const rotateLeft = buildButton('btn btn-sm btn-outline-secondary', 'ri-anticlockwise-2-line', 'Putar Kiri', 'Putar ke kiri');
  const rotateRight = buildButton('btn btn-sm btn-outline-secondary', 'ri-clockwise-2-line', 'Putar Kanan', 'Putar ke kanan');
  const reset = buildButton('btn btn-sm btn-outline-secondary', 'ri-refresh-line', 'Reset', 'Kembalikan komposisi');
  const save = buildButton('btn btn-sm btn-primary', 'ri-save-3-line', 'Simpan');
  const remove = buildButton('btn btn-sm btn-outline-danger', 'ri-delete-bin-6-line', 'Hapus');

  buttons.append(pick, rotateLeft, rotateRight, reset, save, remove);

  const status = document.createElement('p');
  status.className = 'media-editor__status';

  controls.append(zoomWrap, buttons, status);
  root.append(frame, controls, file);

  function setStatus(message, state = 'idle') {
    status.textContent = message;
    root.dataset.state = state;
  }

  function setBusy(busy) {
    [pick, rotateLeft, rotateRight, reset, save, remove, zoom].forEach((el) => {
      el.disabled = busy;
    });
    if (!busy) syncAvailability();
  }

  function syncAvailability() {
    const hasImage = Boolean(current?.url);
    [rotateLeft, rotateRight, reset, save, remove, zoom].forEach((el) => {
      el.disabled = !hasImage;
    });
    empty.hidden = hasImage;
    image.hidden = !hasImage;
    guide.hidden = !hasImage;
    frame.classList.toggle('is-empty', !hasImage);
    pick.querySelector('span').textContent = hasImage ? 'Ganti Foto' : 'Unggah Foto';
  }

  function render() {
    if (current?.url) {
      const preview = previewTransform ? cloudinaryUrl(current.url, previewTransform) : current.url;
      if (image.src !== preview) image.src = preview;
      applyMediaTransform(image, transform);
    }
    zoom.value = String(transform.zoom);
    syncAvailability();
  }

  function setItem(next) {
    current = next ? { ...next } : null;
    transform = sanitizeTransform(current ?? DEFAULT_TRANSFORM);
    render();
  }

  // ---- Geser posisi dengan pointer ----
  let dragging = null;

  frame.addEventListener('pointerdown', (event) => {
    if (!current?.url || zoom.disabled) return;
    // Cegah drag-ghost gambar & seleksi teks yang membuat geser terasa berat.
    event.preventDefault();
    dragging = {
      x: event.clientX,
      y: event.clientY,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
      width: frame.getBoundingClientRect().width,
      height: frame.getBoundingClientRect().height,
    };
    frame.setPointerCapture(event.pointerId);
    frame.classList.add('is-dragging');
  });

  frame.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    event.preventDefault();

    // Saat di-zoom, samakan jarak geser kursor dengan jarak geser foto (1:1).
    // Tanpa zoom, pakai skala sederhana untuk menggeser sisa potongan cover.
    const zoomSlack = transform.zoom - 1;
    const gain = zoomSlack > 0.05 ? 100 / zoomSlack : 100;

    const stepX = ((event.clientX - dragging.x) / Math.max(dragging.width, 1)) * gain;
    const stepY = ((event.clientY - dragging.y) / Math.max(dragging.height, 1)) * gain;

    transform = sanitizeTransform({
      ...transform,
      offsetX: dragging.offsetX - stepX,
      offsetY: dragging.offsetY - stepY,
    });

    applyMediaTransform(image, transform);
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = null;
    frame.releasePointerCapture?.(event.pointerId);
    frame.classList.remove('is-dragging');
    setStatus('Komposisi berubah. Tekan Simpan untuk menerapkannya.', 'dirty');
  };

  frame.addEventListener('pointerup', endDrag);
  frame.addEventListener('pointercancel', endDrag);

  zoom.addEventListener('input', () => {
    transform = sanitizeTransform({ ...transform, zoom: zoom.value });
    applyMediaTransform(image, transform);
    setStatus('Komposisi berubah. Tekan Simpan untuk menerapkannya.', 'dirty');
  });

  const rotate = (degrees) => {
    transform = sanitizeTransform({ ...transform, rotation: (transform.rotation + degrees + 360) % 360 });
    applyMediaTransform(image, transform);
    setStatus('Komposisi berubah. Tekan Simpan untuk menerapkannya.', 'dirty');
  };

  rotateLeft.addEventListener('click', () => rotate(-90));
  rotateRight.addEventListener('click', () => rotate(90));

  reset.addEventListener('click', () => {
    transform = { ...DEFAULT_TRANSFORM };
    render();
    setStatus('Komposisi dikembalikan. Tekan Simpan untuk menerapkannya.', 'dirty');
  });

  pick.addEventListener('click', () => file.click());

  file.addEventListener('change', async () => {
    const selected = file.files?.[0];
    file.value = '';
    if (!selected) return;

    setBusy(true);
    setStatus('Mengunggah foto…', 'busy');

    try {
      const uploaded = await onUpload(selected, transform);
      setItem(uploaded);
      setStatus('Foto tersimpan.', 'saved');
    } catch (error) {
      console.error('Gagal mengunggah foto:', error);
      setStatus(error?.message || 'Foto gagal diunggah.', 'error');
    } finally {
      setBusy(false);
    }
  });

  save.addEventListener('click', async () => {
    setBusy(true);
    setStatus('Menyimpan komposisi…', 'busy');

    try {
      await onSave(transform);
      setStatus('Komposisi tersimpan.', 'saved');
    } catch (error) {
      console.error('Gagal menyimpan komposisi foto:', error);
      setStatus(error?.message || 'Komposisi gagal disimpan.', 'error');
    } finally {
      setBusy(false);
    }
  });

  remove.addEventListener('click', async () => {
    setBusy(true);
    setStatus('Menghapus foto…', 'busy');

    try {
      await onRemove();
      setItem(null);
      setStatus('Foto dihapus, undangan memakai foto bawaan.', 'saved');
    } catch (error) {
      console.error('Gagal menghapus foto:', error);
      setStatus(error?.message || 'Foto gagal dihapus.', 'error');
    } finally {
      setBusy(false);
    }
  });

  setItem(current);
  setStatus(
    current?.url
      ? 'Tarik foto untuk menggeser. Perbesar zoom bila ingin ruang geser lebih luas.'
      : 'Unggah foto untuk mengganti bawaan.'
  );

  return { element: root, setItem, getTransform: () => ({ ...transform }) };
}

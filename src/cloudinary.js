/**
 * Unggah foto ke Cloudinary langsung dari browser panel admin.
 *
 * Memakai unsigned upload preset, jadi tidak ada API Secret di sisi klien.
 * Nilai konfigurasi di bawah bersifat publik dan ikut ter-bundle:
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET
 *
 * Catatan: menghapus berkas permanen membutuhkan API Secret, sehingga tidak
 * dilakukan dari browser. Tombol hapus pada panel admin melepas foto dari
 * undangan; berkasnya tetap ada di Cloudinary dan bisa dibersihkan manual.
 */

export const CLOUDINARY_CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim();
export const CLOUDINARY_UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '').trim();

export function isCloudinaryConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

/**
 * @param {Blob} blob   Gambar yang sudah dikompres di browser.
 * @param {string} folder Folder tujuan di Cloudinary.
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadToCloudinary(blob, folder) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary belum dikonfigurasi. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const form = new FormData();
  form.append('file', blob);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) form.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`,
    { method: 'POST', body: form }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const reason = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Cloudinary menolak unggahan: ${reason}`);
  }

  if (!payload?.secure_url) {
    throw new Error('Cloudinary tidak mengembalikan URL gambar.');
  }

  return { url: String(payload.secure_url), publicId: String(payload.public_id ?? '') };
}

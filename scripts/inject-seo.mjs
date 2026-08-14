/**
 * Suntikkan SEO & og:image ke dist/index.html saat build.
 *
 * Crawler WhatsApp dan Facebook tidak menjalankan JavaScript, sehingga meta
 * tag harus sudah benar di HTML yang dikirim server. Script ini membaca
 * settings/siteContent dan settings/siteMedia lewat Firestore REST, lalu
 * menulis ulang meta tag terkait.
 *
 * Konsekuensinya: setelah mengubah SEO atau foto di panel admin, situs perlu
 * dideploy ulang agar pratinjau tautan mengikuti data terbaru.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';

const DIST_FILE = 'dist/index.html';
const OG_SIZE = 600;

/**
 * Node tidak memuat .env.local seperti Vite, jadi file env dibaca manual
 * agar build lokal ikut menyuntikkan meta. Di GitHub Actions nilainya sudah
 * tersedia lewat process.env sehingga pembacaan file ini terlewat.
 */
function loadEnvFiles(files = ['.env.local', '.env']) {
  const values = {};

  files.forEach((file) => {
    if (!existsSync(file)) return;

    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
      if (/^\s*#/.test(line) || !line.includes('=')) return;
      const at = line.indexOf('=');
      const key = line.slice(0, at).trim();
      const value = line.slice(at + 1).trim();
      if (key && !(key in values)) values[key] = value;
    });
  });

  return values;
}

const fileEnv = loadEnvFiles();
const env = (key) => (process.env[key] ?? fileEnv[key] ?? '').trim();

const PROJECT_ID = env('VITE_FIREBASE_PROJECT_ID');
const API_KEY = env('VITE_FIREBASE_API_KEY');
const PUBLIC_URL = env('VITE_PUBLIC_URL');

function decodeValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields);
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decodeValue);
  return undefined;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)])
  );
}

async function readDoc(docId) {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}`
    + `/databases/(default)/documents/settings/${docId}?key=${encodeURIComponent(API_KEY)}`;

  const response = await fetch(endpoint);
  if (!response.ok) return null;

  const payload = await response.json();
  return decodeFields(payload?.fields);
}

/** Susun URL Cloudinary persegi untuk og:image dari foto hero. */
function buildOgImage(media) {
  const hero = media?.slots?.hero;
  if (!hero?.url || typeof hero.url !== 'string') return '';

  const marker = '/image/upload/';
  const at = hero.url.indexOf(marker);
  if (at < 0) return '';

  const zoom = Number(hero.zoom) > 1 ? Number(hero.zoom) : 1;
  const steps = [];

  if (Number(hero.rotation)) steps.push(`a_${Number(hero.rotation)}`);
  steps.push('c_fill,g_center,ar_1:1,w_1600');

  if (zoom > 1.001) {
    const window = Number((1 / zoom).toFixed(4));
    const offsetX = Number.isFinite(Number(hero.offsetX)) ? Number(hero.offsetX) : 50;
    const offsetY = Number.isFinite(Number(hero.offsetY)) ? Number(hero.offsetY) : 50;
    const x = Number(((offsetX / 100) * (1 - window)).toFixed(4));
    const y = Number(((offsetY / 100) * (1 - window)).toFixed(4));
    steps.push(`c_crop,w_${window},h_${window},x_${x},y_${y}`);
  }

  steps.push(`f_auto,q_auto,w_${OG_SIZE}`);

  return hero.url.slice(0, at + marker.length) + steps.join('/') + '/' + hero.url.slice(at + marker.length);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Ganti isi atribut content pada satu meta tag, bila tag-nya memang ada. */
function replaceMeta(html, attribute, name, value) {
  if (!value) return html;

  const pattern = new RegExp(
    `(<meta\\s+[^>]*${attribute}=["']${name}["'][^>]*content=["'])[^"']*(["'])`,
    'i'
  );

  return html.replace(pattern, `$1${escapeAttribute(value)}$2`);
}

async function main() {
  if (!PROJECT_ID || !API_KEY) {
    console.log('inject-seo: konfigurasi Firebase tidak ada, meta bawaan dipakai.');
    return;
  }

  let html;
  try {
    html = await readFile(DIST_FILE, 'utf8');
  } catch {
    console.log('inject-seo: dist/index.html belum ada, dilewati.');
    return;
  }

  const [content, media] = await Promise.all([
    readDoc('siteContent').catch(() => null),
    readDoc('siteMedia').catch(() => null),
  ]);

  const values = content?.content ?? {};
  const title = typeof values.seoTitle === 'string' ? values.seoTitle.trim() : '';
  const description = typeof values.seoDescription === 'string' ? values.seoDescription.trim() : '';
  const imageAlt = typeof values.seoImageAlt === 'string' ? values.seoImageAlt.trim() : '';
  const ogImage = buildOgImage(media);

  const applied = [];

  if (title) {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(title)}</title>`);
    html = replaceMeta(html, 'property', 'og:title', title);
    html = replaceMeta(html, 'property', 'og:site_name', title);
    html = replaceMeta(html, 'name', 'twitter:title', title);
    applied.push('title');
  }

  if (description) {
    html = replaceMeta(html, 'name', 'description', description);
    html = replaceMeta(html, 'property', 'og:description', description);
    html = replaceMeta(html, 'name', 'twitter:description', description);
    applied.push('description');
  }

  if (imageAlt) {
    html = replaceMeta(html, 'property', 'og:image:alt', imageAlt);
    html = replaceMeta(html, 'name', 'twitter:image:alt', imageAlt);
    applied.push('image-alt');
  }

  if (ogImage) {
    html = replaceMeta(html, 'property', 'og:image', ogImage);
    html = replaceMeta(html, 'property', 'og:image:secure_url', ogImage);
    html = replaceMeta(html, 'property', 'og:image:type', 'image/webp');
    html = replaceMeta(html, 'property', 'og:image:width', String(OG_SIZE));
    html = replaceMeta(html, 'property', 'og:image:height', String(OG_SIZE));
    html = replaceMeta(html, 'name', 'twitter:image', ogImage);
    applied.push('og:image');
  }

  if (PUBLIC_URL) html = replaceMeta(html, 'property', 'og:url', PUBLIC_URL);

  await writeFile(DIST_FILE, html, 'utf8');
  console.log(
    applied.length
      ? `inject-seo: meta diperbarui dari Firestore (${applied.join(', ')}).`
      : 'inject-seo: belum ada data SEO tersimpan, meta bawaan dipakai.'
  );
}

main().catch((error) => {
  // Kegagalan SEO tidak boleh menggagalkan deployment.
  console.warn('inject-seo: dilewati karena galat:', error?.message || error);
});

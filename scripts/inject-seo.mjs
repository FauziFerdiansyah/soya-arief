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
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const DIST_FILE = 'dist/index.html';
const ICS_FILE = 'dist/assets/calendar/soya-arief-wedding.ics';
const OG_SIZE = 600;
const TIME_ZONE = 'Asia/Jakarta';
const UTC_OFFSET = '+07:00';

// Nilai bawaan harus sama dengan fallback pada src/site-content.js.
const EVENT_DEFAULTS = {
  eventDate: '2026-09-05',
  eventStartTime: '08:00',
  eventEndTime: '14:00',
  eventCalendarTitle: 'The Wedding of Arief & Soya',
  eventCalendarDescription: 'Kami mengundang Anda untuk hadir di hari bahagia Arief dan Soya.',
  eventCalendarLocation: 'Aula Kampus Widuri, Jl. Palmerah Barat No. 353, RT. 3/RW. 5, Grogol Utara, Kebayoran Lama, Jakarta Selatan, DKI Jakarta 11480',
  eventReminder: 'P1D',
};

const REMINDER_TOKENS = ['PT1H', 'PT3H', 'P1D', 'P2D', 'P1W'];

const EVENT_PATTERNS = {
  eventDate: /^\d{4}-\d{2}-\d{2}$/,
  eventStartTime: /^([01]\d|2[0-3]):[0-5]\d$/,
  eventEndTime: /^([01]\d|2[0-3]):[0-5]\d$/,
};

function eventValue(values, key) {
  const raw = typeof values[key] === 'string' ? values[key].trim() : '';
  if (!raw) return EVENT_DEFAULTS[key];
  if (EVENT_PATTERNS[key] && !EVENT_PATTERNS[key].test(raw)) return EVENT_DEFAULTS[key];
  return raw;
}

function buildEventTimes(values) {
  const date = eventValue(values, 'eventDate');
  const start = eventValue(values, 'eventStartTime');
  const end = eventValue(values, 'eventEndTime');
  const compactDate = date.replaceAll('-', '');

  return {
    compactDate,
    startIso: `${date}T${start}:00${UTC_OFFSET}`,
    compactStart: `${compactDate}T${start.replace(':', '')}00`,
    compactEnd: `${compactDate}T${end.replace(':', '')}00`,
  };
}

function buildGoogleCalendarUrl(values) {
  const times = buildEventTimes(values);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventValue(values, 'eventCalendarTitle'),
    dates: `${times.compactStart}/${times.compactEnd}`,
    ctz: TIME_ZONE,
    location: eventValue(values, 'eventCalendarLocation'),
    details: eventValue(values, 'eventCalendarDescription'),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * ICS dihasilkan sebagai berkas nyata, bukan blob di browser, karena Safari
 * iOS tidak dapat diandalkan membuka blob: atau data: sebagai kalender.
 */
/** VALARM: pengingat sebelum acara, mis. -P1D berarti 1 hari sebelumnya. */
function buildAlarmLines(values, title) {
  const reminder = eventValue(values, 'eventReminder');
  if (!REMINDER_TOKENS.includes(reminder)) return [];

  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(title)}`,
    `TRIGGER;RELATED=START:-${reminder}`,
    'END:VALARM',
  ];
}

function buildIcsContent(values) {
  const times = buildEventTimes(values);
  const title = eventValue(values, 'eventCalendarTitle');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arief & Soya//Wedding Invitation//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${times.compactDate}@soyaarief.site`,
    `DTSTAMP:${times.compactStart}Z`,
    `DTSTART;TZID=${TIME_ZONE}:${times.compactStart}`,
    `DTEND;TZID=${TIME_ZONE}:${times.compactEnd}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(eventValue(values, 'eventCalendarDescription'))}`,
    `LOCATION:${escapeIcsText(eventValue(values, 'eventCalendarLocation'))}`,
    'STATUS:CONFIRMED',
    ...buildAlarmLines(values, title),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

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

/**
 * Susun URL Cloudinary dengan komposisi tersimpan. Rumusnya sengaja disamakan
 * dengan mediaDeliveryUrl() di src/site-media.js agar hasilnya identik.
 */
function buildDeliveryUrl(item, { ratio, width, sourceMax }) {
  if (!item?.url || typeof item.url !== 'string') return '';

  const marker = '/image/upload/';
  const at = item.url.indexOf(marker);
  if (at < 0) return '';

  const zoom = Number(item.zoom) > 1 ? Number(item.zoom) : 1;
  const steps = [];

  if (Number(item.rotation)) steps.push(`a_${Number(item.rotation)}`);

  if (zoom > 1.001) {
    // Dua tahap: samakan rasio, lalu potong jendela zoom.
    const region = Number((1 / zoom).toFixed(4));
    const offsetX = Number.isFinite(Number(item.offsetX)) ? Number(item.offsetX) : 50;
    const offsetY = Number.isFinite(Number(item.offsetY)) ? Number(item.offsetY) : 50;
    const x = Number(((offsetX / 100) * (1 - region)).toFixed(4));
    const y = Number(((offsetY / 100) * (1 - region)).toFixed(4));

    steps.push(`c_fill,g_center,ar_${ratio},w_${sourceMax}`);
    steps.push(`c_crop,w_${region},h_${region},x_${x},y_${y}`);
    steps.push(`f_auto,q_auto,w_${width},c_limit`);
  } else {
    // Satu tahap saja supaya berkasnya cepat dihasilkan Cloudinary.
    steps.push(`c_fill,g_center,ar_${ratio},w_${width}`);
    steps.push('f_auto,q_auto');
  }

  return item.url.slice(0, at + marker.length) + steps.join('/') + '/' + item.url.slice(at + marker.length);
}

const SLOT_DELIVERY = {
  hero: { ratio: '265:350', width: 1100, sourceMax: 2400 },
  groom: { ratio: '1:1', width: 900, sourceMax: 2000 },
  bride: { ratio: '1:1', width: 900, sourceMax: 2000 },
};

const GALLERY_DELIVERY = { ratio: '1:1', width: 560, sourceMax: 1800 };
const GALLERY_FULL = { ratio: '1:1', width: 1800, sourceMax: 1800 };

// Toggle tampil/sembunyi yang juga diterapkan saat build supaya tidak ada
// kedipan konten yang sebenarnya disembunyikan admin.
const VISIBILITY_KEYS = ['giftShowPhone', 'giftShowConfirm'];

function injectVisibility(html, values) {
  let result = html;
  let count = 0;

  VISIBILITY_KEYS.forEach((key) => {
    const value = typeof values[key] === 'string' ? values[key].trim() : '';
    if (value !== 'hide') return;

    const pattern = new RegExp(`<([a-zA-Z]+)([^>]*data-content-toggle=["']${key}["'][^>]*)>`);
    result = result.replace(pattern, (tag, tagName, attributes) => {
      if (/\shidden(\s|=|$)/i.test(attributes)) return tag;
      count += 1;
      return `<${tagName}${attributes} hidden>`;
    });
  });

  return { html: result, count };
}

/** Tulis src foto slot langsung ke HTML dan lepas kelas placeholder. */
function injectSlotImages(html, media) {
  let result = html;
  let count = 0;

  Object.entries(SLOT_DELIVERY).forEach(([key, options]) => {
    const url = buildDeliveryUrl(media?.slots?.[key], options);
    if (!url) return;

    const pattern = new RegExp(`<img[^>]*data-media=["']${key}["'][^>]*>`, 'i');
    result = result.replace(pattern, (tag) => {
      count += 1;
      // Pola harus menghormati jenis kutip pembuka: src bawaan berupa data
      // URI yang memuat kutip tunggal di dalamnya.
      return tag
        .replace(/src=(["'])(?:(?!\1)[\s\S])*\1/i, `src="${escapeAttribute(url)}"`)
        .replace(/\s*media-skeleton/g, '');
    });
  });

  return { html: result, count };
}

/**
 * Tulis item galeri ke HTML awal. Tanpa ini galeri baru terbentuk setelah
 * permintaan Firestore selesai, sehingga gambarnya terasa lama muncul.
 */
function injectGallery(html, media) {
  const gallery = Array.isArray(media?.gallery) ? media.gallery.slice(0, 12) : [];
  if (!gallery.length) return { html, count: 0 };

  const items = gallery.map((item, index) => {
    const thumb = buildDeliveryUrl(item, GALLERY_DELIVERY);
    const full = buildDeliveryUrl(item, GALLERY_FULL);
    if (!thumb || !full) return '';

    // Tanpa atribut AOS per foto: animasi masuk ditangani wrapper .photo-body
    // dan fade-in CSS, sehingga foto tidak pernah tertahan opacity 0.
    return `<span class="gallery-item">`
      + `<a href="${escapeAttribute(full)}">`
      + `<img src="${escapeAttribute(thumb)}" class="img-photo lazy-loaded"`
      + ` data-lazy="${escapeAttribute(thumb)}" alt="Galeri foto ${index + 1}"`
      + ` width="560" height="560" loading="eager" decoding="async"`
      + `${index < 4 ? ' fetchpriority="high"' : ''}></a></span>`;
  }).filter(Boolean);

  if (!items.length) return { html, count: 0 };

  const pattern = /(<div id="lightgallery"[^>]*>)([\s\S]*?)(<\/div>)/i;
  if (!pattern.test(html)) return { html, count: 0 };

  return {
    html: html.replace(pattern, (_all, open, _inner, close) => `${open}${items.join('')}${close}`),
    count: items.length,
  };
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
  const ogImage = buildDeliveryUrl(media?.slots?.hero, {
    ratio: '1:1',
    width: OG_SIZE,
    sourceMax: 2400,
  });

  const applied = [];

  // Foto ditulis ke HTML awal supaya tampil tanpa menunggu Firestore.
  const slots = injectSlotImages(html, media);
  html = slots.html;
  if (slots.count) applied.push(`${slots.count} foto slot`);

  const gallery = injectGallery(html, media);
  html = gallery.html;
  if (gallery.count) applied.push(`${gallery.count} foto galeri`);

  const visibility = injectVisibility(html, values);
  html = visibility.html;
  if (visibility.count) applied.push(`${visibility.count} elemen disembunyikan`);

  // Data acara: hitung mundur, tautan Google Calendar, dan berkas ICS.
  const times = buildEventTimes(values);
  html = html.replace(
    /(<div class="countdown"[^>]*data-target-date=")[^"]*(")/i,
    `$1${escapeAttribute(times.startIso)}$2`
  );
  html = html.replace(
    /(<a[^>]*id="addToCalendar"[^>]*)/i,
    (tag) => tag.replace(/href="[^"]*"/i, `href="${escapeAttribute(buildGoogleCalendarUrl(values))}"`)
  );

  await mkdir(dirname(ICS_FILE), { recursive: true });
  await writeFile(ICS_FILE, buildIcsContent(values), 'utf8');
  applied.push('kalender & ICS');

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

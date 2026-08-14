/**
 * Terapkan judul, deskripsi, dan gambar pratinjau tautan.
 *
 * PENTING: crawler WhatsApp dan Facebook TIDAK menjalankan JavaScript,
 * sehingga perubahan di sini hanya terlihat oleh pengunjung dan crawler
 * yang mengeksekusi JS (mis. Googlebot). Agar pratinjau tautan benar-benar
 * mengikuti data admin, meta tag disuntikkan saat build oleh
 * scripts/inject-seo.mjs, lalu situs dideploy ulang.
 */
import { sanitizeContent } from './site-content.js';
import { sanitizeMedia, mediaDeliveryUrl } from './site-media.js';

const OG_IMAGE_SIZE = 600;

function setMeta(selector, value) {
  if (!value) return;
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute('content', value);
}

/** Gambar pratinjau diambil dari foto hero yang diunggah admin. */
export function resolveOgImage(media) {
  const hero = sanitizeMedia(media).slots.hero;
  if (!hero?.url) return '';

  return mediaDeliveryUrl(hero.url, {
    transform: hero,
    aspect: '1 / 1',
    width: OG_IMAGE_SIZE,
  });
}

export function applySiteSeo(rawContent, rawMedia) {
  const content = sanitizeContent(rawContent);

  if (content.seoTitle) {
    document.title = content.seoTitle;
    setMeta('meta[property="og:title"]', content.seoTitle);
    setMeta('meta[property="og:site_name"]', content.seoTitle);
    setMeta('meta[name="twitter:title"]', content.seoTitle);
  }

  if (content.seoDescription) {
    setMeta('meta[name="description"]', content.seoDescription);
    setMeta('meta[property="og:description"]', content.seoDescription);
    setMeta('meta[name="twitter:description"]', content.seoDescription);
  }

  if (content.seoImageAlt) {
    setMeta('meta[property="og:image:alt"]', content.seoImageAlt);
    setMeta('meta[name="twitter:image:alt"]', content.seoImageAlt);
  }

  const ogImage = resolveOgImage(rawMedia);
  if (ogImage) {
    setMeta('meta[property="og:image"]', ogImage);
    setMeta('meta[property="og:image:secure_url"]', ogImage);
    setMeta('meta[property="og:image:type"]', 'image/webp');
    setMeta('meta[property="og:image:width"]', String(OG_IMAGE_SIZE));
    setMeta('meta[property="og:image:height"]', String(OG_IMAGE_SIZE));
    setMeta('meta[name="twitter:image"]', ogImage);
  }
}

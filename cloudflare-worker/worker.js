const FILE_NAME = 'soya-arief-wedding.ics';
const DEFAULT_PROJECT_ID = 'wedding-arief-soya';
const UTC_OFFSET = '+07:00';
const DEFAULT_CACHE_SECONDS = 60;
const UTF8_ENCODER = new TextEncoder();

const DEFAULTS = Object.freeze({
  eventDate: '2026-09-05',
  eventStartTime: '08:00',
  eventEndTime: '14:00',
  eventCalendarTitle: 'The Wedding of Arief & Soya',
  eventCalendarDescription: 'Kami mengundang Anda untuk hadir di hari bahagia Arief dan Soya.',
  eventCalendarLocation: 'Aula Kampus Widuri, Jl. Palmerah Barat No. 353, RT. 3/RW. 5, Grogol Utara, Kebayoran Lama, Jakarta Selatan, DKI Jakarta 11480',
});

function textValue(content, key) {
  const value = content?.[key];
  if (typeof value !== 'string') return DEFAULTS[key];
  const trimmed = value.trim().slice(0, 3000);
  return trimmed || DEFAULTS[key];
}

function dateValue(content) {
  const value = textValue(content, 'eventDate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return DEFAULTS.eventDate;

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : DEFAULTS.eventDate;
}

function timeValue(content, key) {
  const value = textValue(content, key);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : DEFAULTS[key];
}

function utcCalendarStamp(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lipat content line maksimal 75 octet sesuai RFC 5545. */
function foldIcsLine(line) {
  const parts = [];
  let part = '';
  let limit = 75;

  for (const character of line) {
    if (part && UTF8_ENCODER.encode(part + character).byteLength > limit) {
      parts.push(part);
      part = character;
      limit = 74;
    } else {
      part += character;
    }
  }

  if (part || !parts.length) parts.push(part);
  return parts.map((value, index) => `${index ? ' ' : ''}${value}`).join('\r\n');
}

function buildIcs(content) {
  const date = dateValue(content);
  const start = new Date(`${date}T${timeValue(content, 'eventStartTime')}:00${UTC_OFFSET}`);
  let end = new Date(`${date}T${timeValue(content, 'eventEndTime')}:00${UTC_OFFSET}`);
  if (end <= start) end = new Date(start.valueOf() + (6 * 60 * 60 * 1000));

  const title = textValue(content, 'eventCalendarTitle');
  const stamp = utcCalendarStamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arief & Soya//Wedding Invitation//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${date.replaceAll('-', '')}@soyaarief.site`,
    `DTSTAMP:${stamp}`,
    `LAST-MODIFIED:${stamp}`,
    `DTSTART:${utcCalendarStamp(start)}`,
    `DTEND:${utcCalendarStamp(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(textValue(content, 'eventCalendarDescription'))}`,
    `LOCATION:${escapeIcsText(textValue(content, 'eventCalendarLocation'))}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(title)}`,
    'TRIGGER;RELATED=START:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

function decodeContent(document) {
  const fields = document?.fields?.content?.mapValue?.fields ?? {};
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, value]) => typeof value?.stringValue === 'string')
      .map(([key, value]) => [key, value.stringValue])
  );
}
async function readFirestoreContent(projectId) {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents/settings/siteContent';
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Firestore merespons ${response.status}`);
  }

  return decodeContent(await response.json());
}

function responseHeaders(cacheSeconds, source) {
  return {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="${FILE_NAME}"`,
    'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    'X-Content-Type-Options': 'nosniff',
    'X-Calendar-Source': source,
  };
}

function normalizedCacheKey(request) {
  const url = new URL(request.url);
  return new Request(`${url.origin}/${FILE_NAME}`, { method: 'GET' });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (!['/', `/${FILE_NAME}`].includes(url.pathname)) {
      return new Response('Not Found', { status: 404 });
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    const cacheSeconds = Math.min(
      300,
      Math.max(0, Number.parseInt(env.CACHE_SECONDS || DEFAULT_CACHE_SECONDS, 10) || DEFAULT_CACHE_SECONDS)
    );
    const cache = globalThis.caches?.default;
    const cacheKey = normalizedCacheKey(request);

    if (request.method === 'GET' && cache && cacheSeconds > 0) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }

    let content = {};
    let source = 'firestore';
    try {
      content = await readFirestoreContent(env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID);
    } catch (error) {
      source = 'fallback';
      console.error('Gagal membaca Firestore; memakai data bawaan.', error);
    }

    const headers = responseHeaders(cacheSeconds, source);
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers });
    }

    const response = new Response(buildIcs(content), { status: 200, headers });
    if (cache && cacheSeconds > 0) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
};

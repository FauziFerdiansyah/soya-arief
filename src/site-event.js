/**
 * Data acara sebagai sumber tunggal.
 *
 * Tanggal dan jam yang diisi admin dipakai bersama oleh:
 *  - hitung mundur (data-target-date)
 *  - tautan Google Calendar
 *  - berkas ICS untuk pengguna Apple (dihasilkan saat build oleh
 *    scripts/inject-seo.mjs memakai rumus yang sama seperti di sini)
 *
 * Tujuannya menghilangkan kemungkinan tanggal di undangan berbeda dengan
 * tanggal di hitung mundur maupun di kalender.
 */
import { sanitizeContent, CONTENT_FIELDS } from './site-content.js';

const TIME_ZONE = 'Asia/Jakarta';
const UTC_OFFSET = '+07:00';

const FALLBACKS = new Map(CONTENT_FIELDS.map((field) => [field.key, field.fallback ?? '']));

function readValue(content, key) {
  const value = content[key];
  return typeof value === 'string' && value ? value : (FALLBACKS.get(key) || '');
}

/** Bentuk waktu yang dibutuhkan hitung mundur maupun kalender. */
export function buildEventTimes(content) {
  const date = readValue(content, 'eventDate');
  const start = readValue(content, 'eventStartTime');
  const end = readValue(content, 'eventEndTime');

  const compactDate = date.replaceAll('-', '');
  const compactStart = `${compactDate}T${start.replace(':', '')}00`;
  const compactEnd = `${compactDate}T${end.replace(':', '')}00`;

  return {
    date,
    start,
    end,
    compactDate,
    startIso: `${date}T${start}:00${UTC_OFFSET}`,
    endIso: `${date}T${end}:00${UTC_OFFSET}`,
    compactStart,
    compactEnd,
  };
}

export function buildGoogleCalendarUrl(content) {
  const times = buildEventTimes(content);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: readValue(content, 'eventCalendarTitle'),
    dates: `${times.compactStart}/${times.compactEnd}`,
    ctz: TIME_ZONE,
    location: readValue(content, 'eventCalendarLocation'),
    details: readValue(content, 'eventCalendarDescription'),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Karakter khusus pada nilai ICS harus di-escape sesuai RFC 5545. */
export function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const REMINDER_TOKENS = ['PT1H', 'PT3H', 'P1D', 'P2D', 'P1W'];

/**
 * Blok VALARM membuat kalender menampilkan pengingat sebelum acara.
 * TRIGGER negatif berarti "sebelum waktu mulai", mis. -P1D = 1 hari sebelum.
 */
function buildAlarmLines(content, title) {
  const reminder = readValue(content, 'eventReminder');
  if (!REMINDER_TOKENS.includes(reminder)) return [];

  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(title)}`,
    `TRIGGER;RELATED=START:-${reminder}`,
    'END:VALARM',
  ];
}

export function buildIcsContent(content) {
  const times = buildEventTimes(content);
  const stamp = `${times.compactStart}Z`;
  const title = readValue(content, 'eventCalendarTitle');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arief & Soya//Wedding Invitation//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${times.compactDate}@soyaarief.site`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TIME_ZONE}:${times.compactStart}`,
    `DTEND;TZID=${TIME_ZONE}:${times.compactEnd}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(readValue(content, 'eventCalendarDescription'))}`,
    `LOCATION:${escapeIcsText(readValue(content, 'eventCalendarLocation'))}`,
    'STATUS:CONFIRMED',
    ...buildAlarmLines(content, title),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/**
 * Terapkan data acara ke halaman undangan.
 *
 * Berkas ICS tidak dibuat di sini karena Safari iOS tidak dapat diandalkan
 * membuka blob: maupun data: sebagai kalender. Berkas itu dihasilkan saat
 * build sehingga tetap berupa berkas nyata dengan tipe konten yang benar.
 */
export function applySiteEvent(rawContent) {
  const content = sanitizeContent(rawContent);
  const times = buildEventTimes(content);

  const countdown = document.querySelector('.countdown[data-target-date]');
  if (countdown) countdown.dataset.targetDate = times.startIso;

  const calendarLink = document.getElementById('addToCalendar');
  if (calendarLink) calendarLink.href = buildGoogleCalendarUrl(content);

  // custom.js memakai event ini untuk menghitung ulang hitung mundur dan
  // menyesuaikan tautan kalender pada perangkat Apple.
  window.dispatchEvent(new CustomEvent('siteevent:applied', {
    detail: { startIso: times.startIso, endIso: times.endIso },
  }));
}

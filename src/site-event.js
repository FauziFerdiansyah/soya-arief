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
const ICS_FILE_NAME = 'soya-arief-wedding.ics';
const STATIC_ICS_URL = `assets/calendar/${ICS_FILE_NAME}`;
const DEFAULT_CALENDAR_WORKER_URL = 'https://soya-arief-calendar.fetruzie2.workers.dev/soya-arief-wedding.ics';
const UTF8_ENCODER = new TextEncoder();

function configuredWorkerUrl() {
  const value = import.meta.env.VITE_CALENDAR_WORKER_URL?.trim()
    || DEFAULT_CALENDAR_WORKER_URL;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

const CALENDAR_WORKER_URL = configuredWorkerUrl();

const FALLBACKS = new Map(CONTENT_FIELDS.map((field) => [field.key, field.fallback ?? '']));
let activeIcsObjectUrl = '';

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

function utcCalendarStamp(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Lipat content line pada 75 octet sesuai RFC 5545, termasuk teks UTF-8. */
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

/** Pengingat ICS ditetapkan satu hari sebelum acara. */
function buildAlarmLines(title) {
  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(title)}`,
    'TRIGGER;RELATED=START:-P1D',
    'END:VALARM',
  ];
}

export function buildIcsContent(content) {
  const times = buildEventTimes(content);
  const start = new Date(times.startIso);
  let end = new Date(times.endIso);
  if (end <= start) end = new Date(start.valueOf() + (6 * 60 * 60 * 1000));

  const stamp = utcCalendarStamp(new Date());
  const title = readValue(content, 'eventCalendarTitle');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arief & Soya//Wedding Invitation//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${times.compactDate}@soyaarief.site`,
    `DTSTAMP:${stamp}`,
    `LAST-MODIFIED:${stamp}`,
    `DTSTART:${utcCalendarStamp(start)}`,
    `DTEND:${utcCalendarStamp(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(readValue(content, 'eventCalendarDescription'))}`,
    `LOCATION:${escapeIcsText(readValue(content, 'eventCalendarLocation'))}`,
    'STATUS:CONFIRMED',
    ...buildAlarmLines(title),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

/** Gunakan Worker bila dikonfigurasi; selain itu buat ICS lokal tanpa backend. */
function buildAppleCalendarUrl(content) {
  if (CALENDAR_WORKER_URL) return CALENDAR_WORKER_URL;
  if (!window.URL?.createObjectURL || typeof Blob !== 'function') return STATIC_ICS_URL;

  const ics = buildIcsContent(content);
  const options = { type: 'text/calendar;charset=utf-8' };
  const file = typeof File === 'function'
    ? new File([ics], ICS_FILE_NAME, options)
    : new Blob([ics], options);

  if (activeIcsObjectUrl) URL.revokeObjectURL(activeIcsObjectUrl);
  activeIcsObjectUrl = URL.createObjectURL(file);
  return activeIcsObjectUrl;
}

/** Terapkan satu sumber data acara ke countdown dan kedua jenis kalender. */
export function applySiteEvent(rawContent) {
  const content = sanitizeContent(rawContent);
  const times = buildEventTimes(content);

  const countdown = document.querySelector('.countdown[data-target-date]');
  if (countdown) countdown.dataset.targetDate = times.startIso;

  const calendarLink = document.getElementById('addToCalendar');
  if (calendarLink) {
    calendarLink.dataset.googleCalendar = buildGoogleCalendarUrl(content);
    calendarLink.dataset.appleCalendar = buildAppleCalendarUrl(content);
    calendarLink.dataset.appleCalendarFilename = ICS_FILE_NAME;
  }

  // custom.js menghitung ulang countdown sekaligus memilih link sesuai OS.
  window.dispatchEvent(new CustomEvent('siteevent:applied', {
    detail: { startIso: times.startIso, endIso: times.endIso },
  }));
}

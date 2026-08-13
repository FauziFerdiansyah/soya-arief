/**
 * Skema konten undangan yang dapat diedit dari panel admin.
 *
 * Satu sumber kebenaran untuk dua konsumen:
 *  - halaman publik (menerapkan teks tersimpan ke DOM)
 *  - webadmin (membangun form editor per section)
 *
 * Markup di index.html memakai atribut:
 *  - data-content="key"     -> teks / placeholder
 *  - data-content-url="key" -> atribut href
 *
 * Nilai `fallback` adalah teks bawaan yang sama dengan index.html. Nilai ini
 * hanya dipakai admin sebagai contoh dan acuan "Kembalikan ke default";
 * halaman publik tetap memakai teks markup bila field belum pernah disimpan.
 */

export const CONTENT_COLLECTION = 'settings';
export const CONTENT_DOC_ID = 'siteContent';
export const CONTENT_MAX_LENGTH = 3000;

const SECTIONS_OPENING = [
  {
    id: 'welcome',
    label: 'Halaman Pembuka',
    icon: 'ri-mail-open-line',
    description: 'Layar sambutan sebelum undangan dibuka.',
    fields: [
      { key: 'welcomeOverline', label: 'Teks atas', type: 'text', fallback: 'THE WEDDING OF' },
      { key: 'welcomeCouple', label: 'Nama pasangan', type: 'text', fallback: 'Arief & Soya' },
      { key: 'welcomeGreetingTitle', label: 'Sapaan baris 1', type: 'text', fallback: 'Kepada Yth.' },
      { key: 'welcomeGreetingSubtitle', label: 'Sapaan baris 2', type: 'text', fallback: 'Bapak/Ibu/Saudara/i' },
      { key: 'welcomeButton', label: 'Tombol buka undangan', type: 'text', target: 'label', fallback: 'Buka Undangan' },
    ],
  },
  {
    id: 'sidebar',
    label: 'Panel Samping',
    icon: 'ri-layout-left-line',
    description: 'Panel kiri yang tetap terlihat di layar besar.',
    fields: [
      { key: 'sidebarCouple', label: 'Nama pasangan', type: 'text', fallback: 'Arief & Soya' },
      { key: 'sidebarDate', label: 'Tanggal acara', type: 'text', fallback: 'Sabtu, 5 September 2026' },
      { key: 'sidebarGreetingTitle', label: 'Sapaan baris 1', type: 'text', fallback: 'Kepada Yth.' },
      { key: 'sidebarGreetingSubtitle', label: 'Sapaan baris 2', type: 'text', fallback: 'Bapak/Ibu/Saudara/i' },
    ],
  },
  {
    id: 'hero',
    label: 'Cover Utama',
    icon: 'ri-image-line',
    description: 'Bagian pembuka isi undangan.',
    fields: [
      { key: 'heroOverline', label: 'Teks atas', type: 'text', fallback: 'Wedding Invitation' },
      { key: 'heroCouple', label: 'Nama pasangan', type: 'text', fallback: 'Arief & Soya' },
      { key: 'heroHashtag', label: 'Hashtag', type: 'text', fallback: '#AriefSoya' },
    ],
  },
  {
    id: 'quote',
    label: 'Kutipan',
    icon: 'ri-double-quotes-l',
    description: 'Ayat atau kutipan pembuka.',
    fields: [
      { key: 'quoteTitle', label: 'Judul', type: 'text', fallback: 'We Found Love' },
      {
        key: 'quoteText',
        label: 'Isi kutipan',
        type: 'textarea',
        rows: 6,
        fallback: '“Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang. Sesungguhnya pada yang demikian itu benar-benar terdapat tanda-tanda (kebesaran Allah) bagi kaum yang berpikir.”',
      },
      { key: 'quoteSource', label: 'Sumber kutipan', type: 'text', fallback: '(QS. Ar-Rum: 21)' },
    ],
  },
  {
    id: 'couple',
    label: 'Mempelai',
    icon: 'ri-heart-2-line',
    description: 'Profil kedua mempelai dan orang tua.',
    fields: [
      { key: 'coupleTitle', label: 'Judul section', type: 'text', fallback: 'We Are Getting Married!' },
      {
        key: 'coupleDescription',
        label: 'Deskripsi',
        type: 'textarea',
        rows: 3,
        fallback: 'Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Ya Allah semoga ridho-Mu tercurah mengiringi pernikahan kami:',
      },
      { key: 'groomNickname', label: 'Mempelai pria — nama panggilan', type: 'text', fallback: 'Arief' },
      { key: 'groomFullname', label: 'Mempelai pria — nama lengkap', type: 'text', fallback: 'Arief Fadillah' },
      { key: 'groomParents', label: 'Mempelai pria — orang tua', type: 'textarea', rows: 2, fallback: 'Putra pertama dari Bapak Zefriadi & Ibu Barkiah' },
      { key: 'groomInstagramLabel', label: 'Mempelai pria — teks Instagram', type: 'text', target: 'label', fallback: '@arief_fd_' },
      { key: 'groomInstagramUrl', label: 'Mempelai pria — link Instagram', type: 'url', target: 'href', fallback: 'https://www.instagram.com/arief_fd_/' },
      { key: 'brideNickname', label: 'Mempelai wanita — nama panggilan', type: 'text', fallback: 'Soya' },
      { key: 'brideFullname', label: 'Mempelai wanita — nama lengkap', type: 'text', fallback: 'Soya Amanda' },
      { key: 'brideParents', label: 'Mempelai wanita — orang tua', type: 'textarea', rows: 2, fallback: 'Putri ketiga dari Bapak Budhi Kristianto & Ibu Cut Dewi Astuti Hasan' },
      { key: 'brideInstagramLabel', label: 'Mempelai wanita — teks Instagram', type: 'text', target: 'label', fallback: '@soyaamndaa' },
      { key: 'brideInstagramUrl', label: 'Mempelai wanita — link Instagram', type: 'url', target: 'href', fallback: 'https://www.instagram.com/soyaamndaa/' },
    ],
  },
  {
    id: 'saveDate',
    label: 'Save The Date',
    icon: 'ri-calendar-event-line',
    description: 'Judul, label hitung mundur, dan tombol kalender.',
    fields: [
      { key: 'saveDateTitle', label: 'Judul', type: 'text', fallback: 'Save The Date' },
      { key: 'saveDateLabelDay', label: 'Label hari', type: 'text', fallback: 'Hari' },
      { key: 'saveDateLabelHour', label: 'Label jam', type: 'text', fallback: 'Jam' },
      { key: 'saveDateLabelMinute', label: 'Label menit', type: 'text', fallback: 'Menit' },
      { key: 'saveDateLabelSecond', label: 'Label detik', type: 'text', fallback: 'Detik' },
      { key: 'saveDateButton', label: 'Tombol kalender', type: 'text', target: 'label', fallback: 'Tambahkan ke Kalender' },
    ],
  },
];

const SECTIONS_DETAIL = [
  {
    id: 'agenda',
    label: 'Acara',
    icon: 'ri-time-line',
    description: 'Hari, jam, lokasi, dan link maps setiap acara.',
    fields: [
      { key: 'agendaTitle', label: 'Judul section', type: 'text', fallback: 'Wedding Day' },
      {
        key: 'agendaDescription',
        label: 'Deskripsi',
        type: 'textarea',
        rows: 3,
        fallback: 'Dengan memohon rahmat dan ridho Allah SWT, kami akan menyelenggarakan pernikahan yang Insya Allah dilaksanakan pada:',
      },
      { key: 'agendaEventDay', label: 'Nama hari', type: 'text', fallback: 'Sabtu' },
      { key: 'agendaEventDate', label: 'Tanggal', type: 'text', fallback: '5 September 2026' },
      { key: 'agendaEvent1Title', label: 'Acara 1 — nama', type: 'text', fallback: 'Akad Nikah' },
      { key: 'agendaEvent1Time', label: 'Acara 1 — waktu', type: 'text', fallback: '08.00 WIB s.d. selesai' },
      { key: 'agendaEvent1Venue', label: 'Acara 1 — nama tempat', type: 'text', fallback: 'Aula Kampus Widuri' },
      { key: 'agendaEvent1Address', label: 'Acara 1 — alamat', type: 'textarea', rows: 2, fallback: 'Jl. Palmerah Barat No. 353, RT. 3/RW. 5, Grogol Utara' },
      { key: 'agendaEvent1City', label: 'Acara 1 — kota', type: 'text', fallback: 'Kebayoran Lama, Jakarta Selatan, DKI Jakarta 11480' },
      { key: 'agendaEvent1MapsUrl', label: 'Acara 1 — link Google Maps', type: 'url', target: 'href', fallback: 'https://www.google.com/maps/search/?api=1&query=Aula+Kampus+Widuri+Jl+Palmerah+Barat+No+353+Jakarta+Selatan' },
      { key: 'agendaEvent2Title', label: 'Acara 2 — nama', type: 'text', fallback: 'Resepsi' },
      { key: 'agendaEvent2Time', label: 'Acara 2 — waktu', type: 'text', fallback: '11.00 - 14.00 WIB' },
      { key: 'agendaEvent2Venue', label: 'Acara 2 — nama tempat', type: 'text', fallback: 'Aula Kampus Widuri' },
      { key: 'agendaEvent2Address', label: 'Acara 2 — alamat', type: 'textarea', rows: 2, fallback: 'Jl. Palmerah Barat No. 353, RT. 3/RW. 5, Grogol Utara' },
      { key: 'agendaEvent2City', label: 'Acara 2 — kota', type: 'text', fallback: 'Kebayoran Lama, Jakarta Selatan, DKI Jakarta 11480' },
      { key: 'agendaEvent2MapsUrl', label: 'Acara 2 — link Google Maps', type: 'url', target: 'href', fallback: 'https://www.google.com/maps/search/?api=1&query=Aula+Kampus+Widuri+Jl+Palmerah+Barat+No+353+Jakarta+Selatan' },
      { key: 'agendaMapsLabel', label: 'Teks tombol maps', type: 'text', target: 'label', fallback: 'Buka di Maps' },
    ],
  },
  {
    id: 'inviter',
    label: 'Turut Mengundang',
    icon: 'ri-team-line',
    description: 'Section merah di atas RSVP. Hanya tampil untuk tamu yang opsinya diaktifkan.',
    fields: [
      { key: 'inviterTitle', label: 'Judul section', type: 'text', fallback: 'Turut Mengundang' },
      { key: 'inviterDescription', label: 'Deskripsi (opsional)', type: 'text', fallback: '' },
      {
        key: 'inviterColumns',
        label: 'Jumlah kolom daftar',
        type: 'select',
        target: 'attr',
        attrName: 'data-columns',
        options: [
          { value: '1', label: '1 kolom' },
          { value: '2', label: '2 kolom' },
        ],
        hint: 'Maksimal 2 kolom. Pada layar kecil selalu turun menjadi 1 kolom.',
        fallback: '1',
      },
      {
        key: 'inviterList',
        label: 'Daftar nama',
        type: 'textarea',
        rows: 8,
        render: 'list',
        editor: 'sortable-list',
        hint: 'Satu nama per baris, urutannya bisa digeser. Teks ditampilkan apa adanya, termasuk tanda "-" bila Anda menuliskannya.',
        fallback: '',
      },
    ],
  },
  {
    id: 'rsvp',
    label: 'RSVP',
    icon: 'ri-pass-valid-line',
    description: 'Teks formulir konfirmasi kehadiran.',
    fields: [
      { key: 'rsvpTitle', label: 'Judul section', type: 'text', fallback: 'RSVP' },
      { key: 'rsvpInfoText', label: 'Kalimat ajakan', type: 'text', fallback: 'Mohon konfirmasi kehadiran Anda sebelum,' },
      { key: 'rsvpInfoDate', label: 'Batas konfirmasi', type: 'text', fallback: 'Sabtu, 5 September 2026' },
      { key: 'rsvpStatusTitle', label: 'Judul status kehadiran', type: 'text', fallback: 'Status Kehadiran' },
      { key: 'rsvpChangeButton', label: 'Tombol ubah kehadiran', type: 'text', target: 'label', fallback: 'Ubah Kehadiran' },
      { key: 'rsvpNamePlaceholder', label: 'Placeholder nama', type: 'text', target: 'placeholder', fallback: 'Nama Anda' },
      { key: 'rsvpAttendQuestion', label: 'Pertanyaan kehadiran', type: 'text', fallback: 'Apakah Anda akan hadir?' },
      { key: 'rsvpAttendYes', label: 'Pilihan hadir', type: 'text', target: 'label', fallback: 'Akan Hadir' },
      { key: 'rsvpAttendNo', label: 'Pilihan tidak hadir', type: 'text', target: 'label', fallback: 'Tidak Hadir' },
      { key: 'rsvpAmountCaption', label: 'Label jumlah orang', type: 'text', fallback: 'Jumlah Orang Yang Akan Datang' },
      { key: 'rsvpSubmit', label: 'Tombol kirim', type: 'text', target: 'label', fallback: 'Kirim Konfirmasi' },
    ],
  },
  {
    id: 'photo',
    label: 'Galeri Foto',
    icon: 'ri-gallery-line',
    description: 'Judul galeri foto.',
    fields: [
      { key: 'photoTitle', label: 'Judul section', type: 'text', fallback: 'Photo Gallery' },
    ],
  },
  {
    id: 'gift',
    label: 'Wedding Gift',
    icon: 'ri-gift-line',
    description: 'Rekening, alamat kado, dan teks tombolnya.',
    fields: [
      { key: 'giftTitle', label: 'Judul section', type: 'text', fallback: 'Wedding Gift' },
      {
        key: 'giftDescription',
        label: 'Deskripsi',
        type: 'textarea',
        rows: 3,
        fallback: 'Terima kasih telah menambah semangat kegembiraan pernikahan kami dengan kehadiran dan hadiah indah Anda',
      },
      { key: 'giftTransferButton', label: 'Tombol transfer', type: 'text', target: 'label', fallback: 'Transfer' },
      { key: 'giftGiftButton', label: 'Tombol kirim kado', type: 'text', target: 'label', fallback: 'Kirim Kado' },
      { key: 'giftTransferDesc', label: 'Deskripsi transfer', type: 'text', fallback: 'Silakan transfer hadiah melalui nomor rekening berikut:' },
      { key: 'giftBank1Name', label: 'Rekening 1 — bank', type: 'text', fallback: 'BANK BCA' },
      { key: 'giftBank1Number', label: 'Rekening 1 — nomor', type: 'text', fallback: '5500546176' },
      { key: 'giftBank1Holder', label: 'Rekening 1 — nama pemilik', type: 'text', fallback: 'Soya Amanda' },
      { key: 'giftBank2Name', label: 'Rekening 2 — bank', type: 'text', fallback: 'BANK BCA' },
      { key: 'giftBank2Number', label: 'Rekening 2 — nomor', type: 'text', fallback: '7655312871' },
      { key: 'giftBank2Holder', label: 'Rekening 2 — nama pemilik', type: 'text', fallback: 'Arief Fadillah' },
      { key: 'giftCopyAccount', label: 'Tombol salin rekening', type: 'text', target: 'label', fallback: 'Salin Rekening' },
      { key: 'giftSendTitle', label: 'Judul kirim kado', type: 'text', fallback: 'Kirim Kado' },
      { key: 'giftSendDesc', label: 'Deskripsi kirim kado', type: 'text', fallback: 'Anda dapat mengirim kado ke:' },
      { key: 'giftSendName', label: 'Nama penerima kado', type: 'text', fallback: 'Soya Amanda' },
      {
        key: 'giftSendAddress',
        label: 'Alamat penerima kado',
        type: 'textarea',
        rows: 3,
        fallback: 'Perumahan Bumi Sawangan Indah 2, Jalan Masjid III Blok D3 No. 110, Sawangan, Kota Depok, Jawa Barat 16518, Indonesia',
      },
      { key: 'giftCopyAddress', label: 'Tombol salin alamat', type: 'text', target: 'label', fallback: 'Salin Alamat' },
    ],
  },
  {
    id: 'wish',
    label: 'Ucapan & Doa',
    icon: 'ri-chat-smile-2-line',
    description: 'Judul, formulir ucapan, dan popup sticker.',
    fields: [
      { key: 'wishTitle', label: 'Judul section', type: 'text', fallback: 'Best Wishes' },
      {
        key: 'wishDescription',
        label: 'Deskripsi',
        type: 'textarea',
        rows: 3,
        fallback: 'Silakan kirimkan ucapan dan doa terbaikmu di sini, sebagai tanda kasih di hari bahagia kami:',
      },
      { key: 'wishNamePlaceholder', label: 'Placeholder nama', type: 'text', target: 'placeholder', fallback: 'Isikan Nama Anda' },
      { key: 'wishMessagePlaceholder', label: 'Placeholder ucapan', type: 'text', target: 'placeholder', fallback: 'Berikan Ucapan Terbaik' },
      { key: 'wishStickerButton', label: 'Tombol sticker', type: 'text', target: 'label', fallback: 'Sticker' },
      { key: 'wishSubmit', label: 'Tombol kirim ucapan', type: 'text', target: 'label', fallback: 'Kirim Ucapan' },
      { key: 'wishPopupTitle', label: 'Judul popup semua ucapan', type: 'text', fallback: 'Semua Ucapan & Doa' },
      { key: 'stickerPopupTitle', label: 'Judul popup sticker', type: 'text', fallback: 'Daftar Sticker' },
      { key: 'stickerChooseButton', label: 'Tombol pilih sticker', type: 'text', target: 'label', fallback: 'Pilih Sticker' },
    ],
  },
  {
    id: 'note',
    label: 'Ucapan Akhir',
    icon: 'ri-sticky-note-line',
    description: 'Penutup sebelum footer.',
    fields: [
      { key: 'noteTitle', label: 'Judul section', type: 'text', fallback: 'Ucapan Akhir' },
      {
        key: 'noteDescription',
        label: 'Isi penutup',
        type: 'textarea',
        rows: 5,
        hint: 'Baris baru pada teks ini akan tampil sebagai baris baru di undangan.',
        fallback: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\n\nAtas kehadiran dan doa restunya, kami mengucapkan terima kasih.',
      },
    ],
  },
  {
    id: 'footnote',
    label: 'Penutup & Footer',
    icon: 'ri-layout-bottom-line',
    description: 'Bagian paling bawah undangan.',
    fields: [
      { key: 'footnoteOverline', label: 'Teks atas', type: 'text', fallback: 'Wedding Invitation' },
      { key: 'footnoteCouple', label: 'Nama pasangan', type: 'text', fallback: 'Arief & Soya' },
      { key: 'footnoteHashtag', label: 'Hashtag', type: 'text', fallback: '#AriefSoya' },
      { key: 'footnoteDate', label: 'Tanggal singkat', type: 'text', fallback: '05.09.2026' },
      { key: 'footerCouple', label: 'Teks footer', type: 'text', fallback: 'Arief & Soya' },
    ],
  },
];

export const CONTENT_SECTIONS = [...SECTIONS_OPENING, ...SECTIONS_DETAIL];

export const CONTENT_FIELDS = CONTENT_SECTIONS.flatMap((section) => section.fields);

const FIELD_BY_KEY = new Map(CONTENT_FIELDS.map((field) => [field.key, field]));

// Satu elemen bisa memegang beberapa key sekaligus, jadi tiap jenis target
// memakai atribut penanda yang berbeda.
const ATTRIBUTE_BY_TARGET = {
  href: 'data-content-url',
  attr: 'data-content-attr',
};

/** URL hanya diterima untuk skema yang aman dipakai di atribut href. */
export function isSafeUrl(value) {
  try {
    const url = new URL(String(value), window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Bersihkan payload Firestore: hanya key yang dikenal, hanya string,
 * dipangkas, dan dibatasi panjangnya.
 */
export function sanitizeContent(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object') return clean;

  Object.entries(raw).forEach(([key, value]) => {
    const field = FIELD_BY_KEY.get(key);
    if (!field || typeof value !== 'string') return;

    const trimmed = value.trim().slice(0, CONTENT_MAX_LENGTH);
    if (!trimmed) return;
    if (field.target === 'href' && !isSafeUrl(trimmed)) return;
    if (field.options && !field.options.some((option) => option.value === trimmed)) return;

    clean[key] = trimmed;
  });

  return clean;
}

/** Tulis teks multi-baris tanpa innerHTML supaya bebas dari injeksi HTML. */
function setMultilineText(element, value) {
  const lines = String(value).split(/\r?\n/);
  const fragment = document.createDocumentFragment();

  lines.forEach((line, index) => {
    if (index > 0) fragment.appendChild(document.createElement('br'));
    fragment.appendChild(document.createTextNode(line));
  });

  element.replaceChildren(fragment);
}

/** Ubah teks multi-baris menjadi daftar item, teks ditulis apa adanya. */
function setListItems(element, value) {
  const items = String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fragment = document.createDocumentFragment();
  items.forEach((text, index) => {
    const item = document.createElement('span');
    item.className = 'content-list-item';
    item.setAttribute('data-aos', 'zoom-in-up');
    item.setAttribute('data-aos-duration', '300');
    item.setAttribute('data-aos-delay', String((index + 1) * 70));
    item.textContent = text;
    fragment.appendChild(item);
  });

  element.replaceChildren(fragment);
}

/** Ganti teks tombol/tautan tanpa menghapus ikonnya. */
function setLabelText(element, value) {
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .forEach((node) => node.remove());
  element.appendChild(document.createTextNode(String(value)));
}

function applyToElement(element, field, value) {
  switch (field.target) {
    case 'placeholder':
      element.setAttribute('placeholder', value);
      break;
    case 'href':
      element.setAttribute('href', value);
      break;
    case 'attr':
      if (field.attrName) element.setAttribute(field.attrName, value);
      break;
    case 'label':
      setLabelText(element, value);
      break;
    default:
      if (field.render === 'list') {
        setListItems(element, value);
      } else {
        setMultilineText(element, value);
      }
  }
}

/**
 * Terapkan konten tersimpan ke DOM undangan.
 * Field yang belum pernah disimpan dibiarkan memakai teks bawaan markup.
 */
export function applySiteContent(values, root = document) {
  const clean = sanitizeContent(values);
  let applied = 0;

  Object.entries(clean).forEach(([key, value]) => {
    const field = FIELD_BY_KEY.get(key);
    const attribute = ATTRIBUTE_BY_TARGET[field.target] ?? 'data-content';

    root.querySelectorAll(`[${attribute}="${key}"]`).forEach((element) => {
      applyToElement(element, field, value);
      applied += 1;
    });
  });

  return applied;
}

import './admin-gate.js';
import {
    CONTENT_SECTIONS,
    CONTENT_FIELDS,
    CONTENT_COLLECTION,
    CONTENT_DOC_ID,
    CONTENT_MAX_LENGTH,
    sanitizeContent,
    isSafeUrl,
} from './site-content.js';
import {
    MEDIA_COLLECTION,
    MEDIA_DOC_ID,
    MEDIA_GALLERY_MAX,
    MEDIA_SLOTS,
    GALLERY_SLOT,
    DEFAULT_TRANSFORM,
    DELIVERY,
    sanitizeMedia,
    sanitizeTransform,
    applyMediaTransform,
    cloudinaryUrl,
} from './site-media.js';
import { createMediaEditor, compressImage } from './media-editor.js';
import { uploadToCloudinary, isCloudinaryConfigured } from './cloudinary.js';

// Never initialize the panel or read Firestore before the Firebase-authenticated
// admin gate resolves. Login can happen later without reloading this module.
await window.adminReady;

const {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    getDoc,
    setDoc
} = window.firestore;

$(document).ready(function () {

    // ==============================
    // ==============================
    // URL DOMAIN CONFIG
    // ==============================
    // Basis link undangan yang dicopy/dikirim dari panel admin.
    // Prioritas:
    //   1. VITE_PUBLIC_URL  -> diset di .env.local & GitHub Variables
    //   2. origin + BASE_URL -> base path build saat ini (mis. /soya-arief/)
    //
    // Memakai BASE_URL penting karena situs tidak berada di root domain,
    // jadi window.location.origin saja akan menghasilkan link yang salah.
    const url_domain = (() => {
        const configured = (import.meta.env.VITE_PUBLIC_URL ?? "").trim();
        const base = configured || window.location.origin + import.meta.env.BASE_URL;
        return base.endsWith("/") ? base : base + "/";
    })();

    console.log("🌐 URL Domain:", url_domain);

    // ==============================
    // RINGKASAN FILTER CEPAT
    // ==============================
    // Menampilkan filter aktif di tombol dropdown supaya isinya tetap
    // terlihat walau menu tertutup. Hanya urusan tampilan; logika filter
    // tetap ditangani handler change pada masing-masing checkbox.
    const QUICK_FILTER_IDS = [
        "filterVipTable",
        "filterVipSouvenir",
        "filterOpened",
        "filterRsvp",
        "filterBelumDikirim",
    ];

    function updateQuickFilterSummary() {
        const checked = QUICK_FILTER_IDS
            .map((id) => document.getElementById(id))
            .filter((el) => el && el.checked);

        const $label = $("#filterQuickLabel");
        const $count = $("#filterQuickCount");

        if (checked.length === 0) {
            $label.text("Semua tamu");
            $count.attr("hidden", "hidden");
            return;
        }

        const firstLabel = $(`label[for="${checked[0].id}"]`).text().trim();

        $label.text(checked.length === 1 ? firstLabel : `${checked.length} filter aktif`);
        $count.text(checked.length).removeAttr("hidden");
    }

    QUICK_FILTER_IDS.forEach((id) => {
        $(document).on("change", `#${id}`, updateQuickFilterSummary);
    });

    // Reset filter juga harus menyegarkan ringkasan.
    $(document).on("click", "#resetFilters", function () {
        window.setTimeout(updateQuickFilterSummary, 0);
    });

    updateQuickFilterSummary();

    // ==============================
    // MENU AKSI BARIS (custom, bukan dropdown Bootstrap)
    // ==============================
    // Saat dibuka, menu dipindah ke <body> dan diposisikan fixed terhadap
    // tombolnya. Dengan begitu menu tidak pernah terpotong oleh
    // .table-responsive yang punya overflow, dan tabel tidak perlu discroll.
    const ROW_MENU_GAP = 6;
    const ROW_MENU_EDGE = 8;
    let openRowMenu = null;

    function closeRowMenu() {
        if (!openRowMenu) return;

        const { menu, toggle, home } = openRowMenu;

        menu.classList.remove("is-open");
        menu.hidden = true;
        menu.removeAttribute("style");
        if (home) home.appendChild(menu); // kembalikan ke barisnya
        toggle.setAttribute("aria-expanded", "false");

        openRowMenu = null;
    }

    function openRowMenuFor(toggle) {
        const home = toggle.closest(".row-actions__wrap");
        const menu = home ? home.querySelector(".row-actions__menu") : null;
        if (!menu) return;

        closeRowMenu();

        // Ukur dulu dalam keadaan tak terlihat supaya tidak berkedip.
        document.body.appendChild(menu);
        menu.hidden = false;
        menu.style.position = "fixed";
        menu.style.visibility = "hidden";
        menu.classList.add("is-open");

        const rect = toggle.getBoundingClientRect();
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        // Rata kanan tombol, lalu jaga supaya tidak keluar viewport.
        let left = rect.right - menuWidth;
        left = Math.min(left, window.innerWidth - menuWidth - ROW_MENU_EDGE);
        left = Math.max(ROW_MENU_EDGE, left);

        // Buka ke bawah; kalau mentok, balik ke atas tombol.
        let top = rect.bottom + ROW_MENU_GAP;
        if (top + menuHeight > window.innerHeight - ROW_MENU_EDGE) {
            top = rect.top - menuHeight - ROW_MENU_GAP;
        }
        top = Math.max(ROW_MENU_EDGE, top);

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.visibility = "";

        toggle.setAttribute("aria-expanded", "true");
        openRowMenu = { menu, toggle, home };
    }

    $(document).on("click", ".row-actions__toggle", function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (openRowMenu && openRowMenu.toggle === this) {
            closeRowMenu();
            return;
        }

        openRowMenuFor(this);
    });

    // Tutup setelah item dipilih. Handler aksi tetap jalan karena node
    // tombolnya tidak dihapus, hanya dipindah kembali ke barisnya.
    $(document).on("click", ".row-actions__menu .dropdown-item", function () {
        closeRowMenu();
    });

    $(document).on("click", function (e) {
        if (!openRowMenu) return;
        if (e.target.closest(".row-actions__menu")) return;
        if (e.target.closest(".row-actions__toggle")) return;
        closeRowMenu();
    });

    $(document).on("keydown", function (e) {
        if (e.key === "Escape") closeRowMenu();
    });

    window.addEventListener("scroll", closeRowMenu, true);
    window.addEventListener("resize", closeRowMenu);

    // ==============================
    // DETAIL SEBAGAI POPUP DI MODE KARTU
    // ==============================
    // Di bawah 768px tabel berubah jadi kartu, sehingga baris detail yang
    // memanjang tidak lagi cocok. Handler ini menyalin isi .detail-content
    // ke dalam modal. Di layar lebar, perilaku expand inline dibiarkan apa
    // adanya (handler bawaan yang jalan).
    const CARD_MODE_MAX_WIDTH = 768;

    function isCardMode() {
        return window.matchMedia(`(max-width: ${CARD_MODE_MAX_WIDTH}px)`).matches;
    }

    $(document).on(
        "click",
        ".toggleDetail, .toggleRsvpDetail, .toggleCommentDetail",
        function (e) {
            if (!isCardMode()) return; // desktop: biarkan expand inline

            const $row = $(this).closest("tr");
            const $content = $row.next("tr.detail-row").find(".detail-content").first();
            if (!$content.length) return;

            // Cegah handler expand bawaan supaya tidak dobel.
            e.preventDefault();
            e.stopImmediatePropagation();

            const title = $row.find("td.card-cell--title, td.guest-card__name").first().text().trim();

            $("#rowDetailModalTitle").text(title || "Detail");
            $("#rowDetailModalBody").empty().append($content.clone());

            bootstrap.Modal.getOrCreateInstance(
                document.getElementById("rowDetailModal")
            ).show();
        }
    );

    // ==============================
    // MENU TOGGLE
    // ==============================
    $("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled");

        const menuIcon = $(this).find('i');
        if ($("#wrapper").hasClass("toggled")) {
            menuIcon.removeClass("ri-menu-fold-fill").addClass("ri-menu-unfold-fill");
        } else {
            menuIcon.removeClass("ri-menu-unfold-fill").addClass("ri-menu-fold-fill");
        }
    });

    // ==============================
    // SIDEBAR MENU NAVIGATION
    // ==============================
    $(".list-group-item[data-menu]").on("click", function(e) {
        e.preventDefault();
        
        const menu = $(this).data("menu");
        
        // Update active state
        $(".list-group-item").removeClass("active");
        $(this).addClass("active");
        
        // Hide all sections
        $("#guestsSection, #rsvpSection, #commentsSection, #contentSection, #gallerySection").hide();
        
        // Show selected section
        if (menu === "guests") {
            $("#guestsSection").show();
            loadGuestList();
        } else if (menu === "rsvp") {
            $("#rsvpSection").show();
            loadRsvpList();
        } else if (menu === "comments") {
            $("#commentsSection").show();
            loadCommentList();
        } else if (menu === "content") {
            $("#contentSection").show();
            loadSiteContentEditor();
        } else if (menu === "gallery") {
            $("#gallerySection").show();
            loadGalleryEditor();
        }
        
        console.log(`📍 Navigated to: ${menu}`);
    });


    // ==============================
    // EDITOR (still fine)
    // ==============================
    tinymce.init({
        selector: '#descInput',
        toolbar: 'bold italic underline | bullist numlist | h1 h2 h3 | hr | alignleft aligncenter alignright alignjustify ',
        menubar: false,
        license_key: 'gpl',
        statusbar: false,
        branding: false,
        height: 200,
        toolbar_mode: 'sliding',
    });

    // ==============================
    // INVITATION TEMPLATE EDITOR
    // ==============================
    tinymce.init({
        selector: '#invitationTemplate',
        toolbar: 'bold italic underline | bullist numlist | alignleft aligncenter alignright',
        menubar: false,
        license_key: 'gpl',
        statusbar: false,
        branding: false,
        height: 400,
        toolbar_mode: 'sliding',
        content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; }',
        setup: function(editor) {
            editor.on('init', function() {
                loadInvitationTemplate();
            });
        }
    });


    // ==============================
    // ✅ ADMIN ADD GUEST
    // ==============================

    let allGuests = [];      // Semua data dari Firestore
    let filteredGuests = []; // Data setelah filter search
    let currentPage = 1;
    let perPage = 10;        // ✅ Changed to let untuk bisa diubah
    
    // ✅ Sort state
    let sortColumn = "createdAt"; // Default sort by created date
    let sortDirection = "desc";   // desc = newest first

    // Label lagu yang dipakai di detail tamu. Nilai tersimpan di Firestore
    // hanya 'default' atau 'minang'.
    const MUSIC_LABELS = {
        default: "Mahalini - Bermuara",
        minang: "Urang Minang",
    };

    // ==============================
    // ✅ SESI ADMIN UNTUK OPERASI TULIS
    // ==============================
    // window.auth.currentUser bisa sesaat kosong ketika SDK sedang memulihkan
    // sesi atau menyegarkan token. Menunggu event auth lebih dapat diandalkan
    // daripada membaca currentUser satu kali.
    function waitForAdminUser(timeoutMs = 5000) {
        const current = window.auth?.currentUser;
        if (current) return Promise.resolve(current);

        return new Promise((resolve) => {
            let settled = false;

            const finish = (user) => {
                if (settled) return;
                settled = true;
                unsubscribe?.();
                resolve(user);
            };

            const unsubscribe = window.firebaseAuth.onAuthStateChanged(
                window.auth,
                (user) => { if (user) finish(user); },
                () => finish(null)
            );

            window.setTimeout(() => finish(window.auth?.currentUser ?? null), timeoutMs);
        });
    }

    async function requireAdminUser() {
        const user = await waitForAdminUser();
        if (user) return user;

        const error = new Error('Sesi admin tidak ditemukan');
        error.code = 'unauthenticated';
        throw error;
    }

    /**
     * Jalankan operasi tulis admin dengan token yang baru disegarkan. Kalau
     * Firestore tetap menolak karena token kedaluwarsa, dicoba sekali lagi
     * setelah token dipaksa diperbarui.
     */
    async function runAdminWrite(write) {
        const user = await requireAdminUser();

        try {
            await user.getIdToken(true);
            return await write();
        } catch (err) {
            if (!String(err?.code || '').includes('unauthenticated')) throw err;

            const retryUser = await requireAdminUser();
            await retryUser.getIdToken(true);
            return await write();
        }
    }

    // ==============================
    // ✅ NORMALIZE PHONE NUMBER
    // ==============================
    function normalizePhoneNumber(phone) {
        if (!phone) return "";

        // 1. Hapus semua karakter non-digit
        let normalized = phone.replace(/\D/g, '');

        // 2. Jika diawali 62, ubah jadi 0
        if (normalized.startsWith('62')) {
            normalized = '0' + normalized.substring(2);
        }

        // 3. Jika tidak diawali 0, tambahkan 0 di depan
        if (!normalized.startsWith('0')) {
            normalized = '0' + normalized;
        }

        console.log(`📱 Phone normalized: "${phone}" → "${normalized}"`);
        return normalized;
    }

    // ==============================
    // ✅ PHONE NUMBER PREVIEW (REAL-TIME)
    // ==============================
    let phonePreviewTimeout;
    
    $('[name="guestPhone"]').on("input", function() {
        const $input = $(this);
        const rawValue = $input.val();
        
        // Clear previous timeout
        clearTimeout(phonePreviewTimeout);
        
        // Show preview after user stops typing (500ms)
        phonePreviewTimeout = setTimeout(() => {
            if (rawValue.trim()) {
                const normalized = normalizePhoneNumber(rawValue);
                
                // Show preview di bawah input (jika berbeda)
                if (rawValue !== normalized) {
                    let $preview = $input.next('.phone-preview');
                    if (!$preview.length) {
                        $input.after('<small class="phone-preview text-muted d-block mt-1"></small>');
                        $preview = $input.next('.phone-preview');
                    }
                    $preview.html(`<i class="ri-information-line"></i> Akan disimpan sebagai: <strong>${normalized}</strong>`);
                } else {
                    $input.next('.phone-preview').remove();
                }
            } else {
                $input.next('.phone-preview').remove();
            }
        }, 500);
    });

    // Same untuk edit modal
    $('[name="editGuestPhone"]').on("input", function() {
        const $input = $(this);
        const rawValue = $input.val();
        
        clearTimeout(phonePreviewTimeout);
        
        phonePreviewTimeout = setTimeout(() => {
            if (rawValue.trim()) {
                const normalized = normalizePhoneNumber(rawValue);
                
                if (rawValue !== normalized) {
                    let $preview = $input.next('.phone-preview');
                    if (!$preview.length) {
                        $input.after('<small class="phone-preview text-muted d-block mt-1"></small>');
                        $preview = $input.next('.phone-preview');
                    }
                    $preview.html(`<i class="ri-information-line"></i> Akan disimpan sebagai: <strong>${normalized}</strong>`);
                } else {
                    $input.next('.phone-preview').remove();
                }
            } else {
                $input.next('.phone-preview').remove();
            }
        }, 500);
    });

    // ==============================
    // ✅ AUTO-CHANGE maxGuests SAAT ADA "&"
    // ==============================
    $('[name="guestName"]').on("input", function() {
        const name = $(this).val();
        const maxGuestsInput = $('[name="guestCount"]');
        const currentMax = Number(maxGuestsInput.val());

        // Jika ada "&" dan maxGuests masih 1, ubah jadi 2
        if (name.includes("&") && currentMax === 1) {
            maxGuestsInput.val(2);
            console.log('✅ Auto-changed maxGuests to 2 (detected "&")');
        }
    });

    // Same untuk edit modal
    $('[name="editGuestName"]').on("input", function() {
        const name = $(this).val();
        const maxGuestsInput = $('[name="editGuestCount"]');
        const currentMax = Number(maxGuestsInput.val());

        // Jika ada "&" dan maxGuests masih 1, ubah jadi 2
        if (name.includes("&") && currentMax === 1) {
            maxGuestsInput.val(2);
            console.log('✅ Auto-changed maxGuests to 2 (detected "&")');
        }
    });

    $("#qrForm").on("submit", async function (e) {
        e.preventDefault();

        // ✅ Ambil lewat name bukan placeholder/id
        const guestName  = $('[name="guestName"]').val().trim();
        const maxGuests  = Number($('[name="guestCount"]').val());
        const phoneRaw   = $('[name="guestPhone"]').val().trim();
        const instagramRaw = $('[name="guestInstagram"]').val().trim();

        const source     = $('[name="guestSource"]').val();
        const sourceNote = $('[name="guestSourceNote"]').val().trim();
        
        // ✅ Get VIP status dari 2 checkbox terpisah
        const isTableVip     = $('[name="guestTableVip"]').is(':checked');
        const isSouvenirVip  = $('[name="guestSouvenirVip"]').is(':checked');

        // ✅ Opsi khusus per tamu: section Turut Mengundang & pilihan lagu
        const showInviters   = $('[name="guestShowInviters"]').is(':checked');
        const musicTrack     = $('[name="guestMusicTrack"]').val() === "minang" ? "minang" : "default";

        // ✅ Validasi
        if (!guestName)  return alert("Nama tamu wajib diisi");
        if (!maxGuests || maxGuests < 1) return alert("Jumlah minimal 1");
        
        // ✅ Phone & Instagram keduanya opsional (boleh kosong keduanya)

        // ✅ Normalize phone number (jika diisi)
        const phone = phoneRaw ? normalizePhoneNumber(phoneRaw) : "";
        
        // ✅ Clean instagram username (remove @ if user input it)
        const instagram = instagramRaw ? instagramRaw.replace(/^@/, '') : "";

        const payload = {
            name: guestName,
            phone: phone,
            instagram: instagram,
            maxGuests: maxGuests,

            source: source || "",
            sourceName: sourceNote || "",
            
            // ✅ 2 field VIP terpisah (boolean)
            isTableVip: isTableVip,
            isSouvenirVip: isSouvenirVip,

            // ✅ Opsi tampilan & audio khusus tamu ini
            showInviters: showInviters,
            musicTrack: musicTrack,

            opened: false,
            openCount: 0,
            rsvpStatus: "",
            rsvpCount: 0,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        try {
            await addDoc(collection(window.db, "guest"), payload);
            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Tamu berhasil dibuat!",
                timer: 1500,
                showConfirmButton: false
            });       

            // ✅ Reset form properly
            $('[name="guestName"]').val("");
            $('[name="guestCount"]').val(1);
            $('[name="guestPhone"]').val("");
            $('[name="guestInstagram"]').val("");
            $('[name="guestSource"]').val("");
            $('[name="guestSourceNote"]').val("");
            
            // ✅ Reset 2 VIP checkboxes
            $('[name="guestTableVip"]').prop("checked", false);
            $('[name="guestSouvenirVip"]').prop("checked", false);

            // ✅ Reset opsi Turut Mengundang & lagu
            $('[name="guestShowInviters"]').prop("checked", false);
            $('[name="guestMusicTrack"]').val("default");

        } catch (err) {
            console.error(err);
            alert("❌ Gagal membuat tamu");
        }
    });

    // Ambil halaman
    function getPagedData() {
        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        return filteredGuests.slice(start, end);
    }

    // Render pagination Bootstrap
    function renderPagination() {
        const totalPages = Math.ceil(filteredGuests.length / perPage);
        const pag = $("#paginationGuest");
        pag.empty();

        if (totalPages <= 1) return;

        // Helper
        const li = (disabled, active, page, label) => `
            <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
                <a class="page-link" href="javascript:;" data-page="${page}">${label}</a>
            </li>`;

        // << First Page
        pag.append(li(currentPage === 1, false, 1, "&laquo;"));

        // Dynamic page numbers
        const maxButtons = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxButtons - 1);

        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        if (start > 1) {
            pag.append(li(false, false, 1, "1"));
            pag.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
        }

        for (let i = start; i <= end; i++) {
            pag.append(li(false, currentPage === i, i, i));
        }

        if (end < totalPages) {
            pag.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
            pag.append(li(false, false, totalPages, totalPages));
        }

        // >> Last Page
        pag.append(li(currentPage === totalPages, false, totalPages, "&raquo;"));
    }

    // Helper: Format timestamp
    function formatDate(timestamp) {
        if (!timestamp) return "-";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return "-";
        }
    }

    // ✅ Sort function
    function sortGuests(column) {
        // Toggle direction if same column, otherwise default to asc
        if (sortColumn === column) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortColumn = column;
            sortDirection = "asc";
        }

        // Sort filteredGuests
        filteredGuests.sort((a, b) => {
            let aVal = a.data[column];
            let bVal = b.data[column];

            // Handle different data types
            if (column === "name" || column === "source") {
                // String comparison
                aVal = (aVal || "").toLowerCase();
                bVal = (bVal || "").toLowerCase();
            } else if (column === "maxGuests") {
                // Number comparison
                aVal = aVal || 0;
                bVal = bVal || 0;
            } else if (column === "opened") {
                // Boolean comparison
                aVal = aVal ? 1 : 0;
                bVal = bVal ? 1 : 0;
            }

            // Compare
            if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
            if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });

        // Update UI
        updateSortIcons();
        currentPage = 1;
        renderGuestTable(getPagedData());
        renderPagination();

        console.log(`📊 Sorted by ${column} (${sortDirection})`);
    }

    // ✅ Update sort icons in table header
    function updateSortIcons() {
        // Reset all icons
        $(".sortable .sort-icon").removeClass("ri-arrow-up-line ri-arrow-down-line").addClass("ri-arrow-up-down-line");
        
        // Update active column icon
        const activeIcon = $(`.sortable[data-sort="${sortColumn}"] .sort-icon`);
        activeIcon.removeClass("ri-arrow-up-down-line");
        
        if (sortDirection === "asc") {
            activeIcon.addClass("ri-arrow-up-line");
        } else {
            activeIcon.addClass("ri-arrow-down-line");
        }
    }

    // Render tabel
    function renderGuestTable(list) {
        const tbody = $("#guestTableBody");
        tbody.empty();

        // Update total data count
        $("#totalDataGuest").text(filteredGuests.length);

        if (!list.length) {
            tbody.html(`<tr><td colspan="8" class="text-center text-muted">Tidak ada data.</td></tr>`);
            return;
        }

        list.forEach(doc => {
            const d = doc.data;
            
            // Main row
            tbody.append(`
                <tr class="guest-row" data-id="${doc.id}">
                    <td class="text-center guest-card__toggle">
                        <button class="btn btn-sm btn-outline-secondary toggleDetail" data-id="${doc.id}" title="Lihat Detail">
                            <i class="ri-arrow-down-s-line"></i>
                            <span class="btn-label">Detail</span>
                        </button>
                    </td>
                    <td data-label="Nama Tamu" class="guest-card__name">
                        ${d.name || "-"}
                        ${d.isTableVip ? '<i class="ri-vip-fill text-primary ms-1" data-bs-toggle="tooltip" title="VIP Table"></i>' : ''}
                        ${d.isSouvenirVip ? '<i class="ri-vip-diamond-fill text-info ms-1" data-bs-toggle="tooltip" title="VIP Souvenir"></i>' : ''}
                    </td>
                    <td data-label="Jumlah">${d.maxGuests || 0} Tamu</td>
                    <td data-label="No HP">${d.phone || "-"}</td>
                    <td data-label="Dari">${d.source || "-"}</td>
                    <td data-label="Status">
                        <div class="status-cell">
                            <span class="status-chip status-chip--seen${d.opened ? " is-on" : ""}">
                                <i class="${d.opened ? "ri-check-line" : "ri-eye-off-line"}"></i>
                                Dilihat
                            </span>
                            <span class="status-chip status-chip--sent${d.sendCount && d.sendCount > 0 ? " is-on" : ""}">
                                <i class="${d.sendCount && d.sendCount > 0 ? "ri-check-double-line" : "ri-mail-line"}"></i>
                                Terkirim
                            </span>
                        </div>
                    </td>
                    <td class="text-center guest-card__wa" data-label="WhatsApp">
                        ${d.phone ? `
                            <button class="btn btn-sm btn-success sendWhatsAppDirect" 
                                    data-id="${doc.id}"
                                    data-name="${d.name || ''}"
                                    data-phone="${d.phone || ''}"
                                    title="Kirim WhatsApp">
                                <i class="ri-whatsapp-line"></i>
                                <span class="btn-label">Kirim</span>
                            </button>
                        ` : '<span class="text-muted">-</span>'}
                    </td>
                    <td class="text-center guest-card__actions">
                        <div class="row-actions">
                            <div class="row-actions__wrap">
                                <button class="btn btn-sm btn-outline-secondary row-actions__toggle"
                                        type="button"
                                        aria-expanded="false"
                                        aria-haspopup="true"
                                        aria-label="Aksi lain untuk ${d.name || 'tamu ini'}"
                                        title="Aksi lain">
                                    <i class="ri-more-2-fill"></i>
                                </button>

                                <ul class="row-actions__menu" hidden>
                                    ${d.instagram ? `
                                        <li>
                                            <button class="dropdown-item sendInstagramDM" type="button"
                                                    data-id="${doc.id}"
                                                    data-name="${d.name || ''}"
                                                    data-instagram="${d.instagram || ''}">
                                                <i class="ri-instagram-line"></i> Buka Instagram
                                            </button>
                                        </li>
                                    ` : ''}
                                    <li>
                                        <button class="dropdown-item copyMessage" type="button"
                                                data-id="${doc.id}"
                                                data-name="${d.name || ''}">
                                            <i class="ri-file-copy-2-line"></i> Copy Pesan
                                        </button>
                                    </li>
                                    <li>
                                        <button class="dropdown-item copyLink" type="button" data-id="${doc.id}">
                                            <i class="ri-link"></i> Copy Link
                                        </button>
                                    </li>
                                    <li>
                                        <button class="dropdown-item editGuest" type="button"
                                                data-id="${doc.id}"
                                                data-name="${d.name || ''}"
                                                data-maxguests="${d.maxGuests || 1}"
                                                data-phone="${d.phone || ''}"
                                                data-instagram="${d.instagram || ''}"
                                                data-source="${d.source || ''}"
                                                data-sourcename="${d.sourceName || ''}"
                                                data-istablevip="${d.isTableVip || false}"
                                                data-issouvenivip="${d.isSouvenirVip || false}"
                                                data-showinviters="${d.showInviters || false}"
                                                data-musictrack="${d.musicTrack || 'default'}">
                                            <i class="ri-edit-line"></i> Edit Tamu
                                        </button>
                                    </li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li>
                                        <button class="dropdown-item dropdown-item--danger deleteGuest" type="button" data-id="${doc.id}">
                                            <i class="ri-delete-bin-6-line"></i> Hapus Tamu
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            
                        </div>
                    </td>
                </tr>
            `);

            // Detail row (hidden by default)
            tbody.append(`
                <tr class="detail-row" id="detail-${doc.id}" style="display: none;">
                    <td colspan="8" class="p-0">
                        <div class="detail-content bg-light p-3">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="mb-3"><i class="ri-information-line"></i> Informasi Dasar</h6>
                                    <table class="table table-sm table-borderless">
                                        <tr>
                                            <td width="40%"><strong>ID Guest:</strong></td>
                                            <td><code>${doc.id}</code></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Nama:</strong></td>
                                            <td>${d.name || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>No. HP:</strong></td>
                                            <td>${d.phone || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Instagram:</strong></td>
                                            <td>${d.instagram ? `@${d.instagram}` : "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Max Tamu:</strong></td>
                                            <td>${d.maxGuests || 0} orang</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Sumber:</strong></td>
                                            <td>${d.source || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Nama Sumber:</strong></td>
                                            <td>${d.sourceName || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Status VIP:</strong></td>
                                            <td>
                                                <div class="d-flex flex-column gap-1">
                                                    ${d.isTableVip 
                                                        ? '<span class="badge bg-warning text-dark"><i class="ri-restaurant-line"></i> VIP Table</span>' 
                                                        : '<span class="badge bg-secondary"><i class="ri-restaurant-line"></i> Regular Table</span>'}
                                                    ${d.isSouvenirVip 
                                                        ? '<span class="badge bg-warning text-dark"><i class="ri-gift-line"></i> VIP Souvenir</span>' 
                                                        : '<span class="badge bg-secondary"><i class="ri-gift-line"></i> Regular Souvenir</span>'}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Turut Mengundang:</strong></td>
                                            <td>
                                                ${d.showInviters
                                                    ? '<span class="badge bg-success"><i class="ri-eye-line"></i> Aktif</span>'
                                                    : '<span class="badge bg-secondary"><i class="ri-eye-off-line"></i> Tidak Aktif</span>'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Lagu Undangan:</strong></td>
                                            <td>
                                                <span class="badge bg-info"><i class="ri-music-2-line"></i> ${MUSIC_LABELS[d.musicTrack] || MUSIC_LABELS.default}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="mb-3"><i class="ri-calendar-check-line"></i> Status & Aktivitas</h6>
                                    <table class="table table-sm table-borderless">
                                        <tr>
                                            <td width="40%"><strong>Status Buka:</strong></td>
                                            <td>
                                                ${d.opened 
                                                    ? '<span class="badge bg-success">Sudah Dibuka</span>' 
                                                    : '<span class="badge bg-secondary">Belum Dibuka</span>'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Jumlah Buka:</strong></td>
                                            <td>${d.openCount || 0}x</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Pertama Dibuka:</strong></td>
                                            <td>${formatDate(d.openedAt)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Terakhir Dibuka:</strong></td>
                                            <td>${formatDate(d.lastOpenedAt)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Device Type:</strong></td>
                                            <td>${d.deviceType || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Status RSVP:</strong></td>
                                            <td>
                                                ${d.rsvpStatus === "yes" 
                                                    ? '<span class="badge bg-success">Hadir</span>' 
                                                    : d.rsvpStatus === "no" 
                                                    ? '<span class="badge bg-danger">Tidak Hadir</span>' 
                                                    : '<span class="badge bg-secondary">Belum Konfirmasi</span>'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Jumlah RSVP:</strong></td>
                                            <td>${d.rsvpCount || 0} orang</td>
                                        </tr>
                                    </table>

                                    <h6 class="mb-3 mt-3"><i class="ri-whatsapp-line"></i> Tracking WhatsApp</h6>
                                    <table class="table table-sm table-borderless">
                                        <tr>
                                            <td width="40%"><strong>Terakhir Dikirim:</strong></td>
                                            <td>${formatDate(d.lastSent)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Jumlah Kirim:</strong></td>
                                            <td>
                                                ${d.sendCount || 0}x
                                                ${d.sendCount > 0 
                                                    ? '<span class="badge bg-info ms-1">Sudah Dikirim</span>' 
                                                    : '<span class="badge bg-secondary ms-1">Belum Dikirim</span>'}
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-12">
                                    <h6 class="mb-2"><i class="ri-time-line"></i> Timestamp</h6>
                                    <table class="table table-sm table-borderless">
                                        <tr>
                                            <td width="20%"><strong>Dibuat:</strong></td>
                                            <td>${formatDate(d.createdAt)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Diupdate:</strong></td>
                                            <td>${formatDate(d.updatedAt)}</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `);
        });

        // ✅ Initialize Bootstrap tooltips for VIP icons
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }



    // Load from Firestore
    async function loadGuestList(keepFilters = false) {
        const tbody = $("#guestTableBody");
        tbody.html(`<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>`);

        try {
            const q = query(collection(window.db, "guest"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            allGuests = [];
            snap.forEach(doc => {
                allGuests.push({ id: doc.id, data: doc.data() });
            });

            // ✅ Jika keepFilters = true, re-apply filter yang ada
            if (keepFilters) {
                applyFilters();
            } else {
                filteredGuests = [...allGuests];
                currentPage = 1;
                renderGuestTable(getPagedData());
                renderPagination();
            }
        } catch (err) {
            console.error("❌ Error load guest list:", err);
            tbody.html(`<tr><td colspan="6" class="text-danger text-center">Gagal memuat data.</td></tr>`);
        }
    }


    // Handle click pagination
    $(document).on("click", "#paginationGuest .page-link", function () {
        const page = $(this).data("page");
        if (!page || page < 1) return;

        currentPage = page;

        renderGuestTable(getPagedData());
        renderPagination();
    });

    // ✅ Filter Function - Gabungan semua filter
    function applyFilters() {
        const keyword = $("#searchGuest").val().toLowerCase();
        const sourceFilter = $("#filterSource").val();
        const vipTableFilter = $("#filterVipTable").is(":checked");
        const vipSouvenirFilter = $("#filterVipSouvenir").is(":checked");
        const openedFilter = $("#filterOpened").is(":checked");
        const rsvpFilter = $("#filterRsvp").is(":checked");
        const belumDikirimFilter = $("#filterBelumDikirim").is(":checked");

        filteredGuests = allGuests.filter(d => {
            const data = d.data;
            
            // Filter by name
            if (keyword && !data.name.toLowerCase().includes(keyword)) {
                return false;
            }

            // Filter by source (undangan dari)
            if (sourceFilter && data.source !== sourceFilter) {
                return false;
            }

            // Filter VIP Table
            if (vipTableFilter && !data.isTableVip) {
                return false;
            }

            // Filter VIP Souvenir
            if (vipSouvenirFilter && !data.isSouvenirVip) {
                return false;
            }

            // Filter Opened (sudah dilihat)
            if (openedFilter && !data.opened) {
                return false;
            }

            // Filter RSVP (sudah konfirmasi hadir)
            if (rsvpFilter && data.rsvpStatus !== "yes") {
                return false;
            }

            // Filter Belum Dikirim (sendCount === 0 atau tidak ada)
            if (belumDikirimFilter && (data.sendCount && data.sendCount > 0)) {
                return false;
            }

            return true;
        });

        currentPage = 1;
        renderGuestTable(getPagedData());
        renderPagination();

        console.log(`🔍 Filter applied: ${filteredGuests.length} of ${allGuests.length} guests`);
    }

    // Search input
    $("#searchGuest").on("input", applyFilters);

    // Filter source dropdown
    $("#filterSource").on("change", applyFilters);

    // Filter checkboxes
    $("#filterVipTable, #filterVipSouvenir, #filterOpened, #filterRsvp, #filterBelumDikirim").on("change", applyFilters);

    // Reset filters
    $("#resetFilters").on("click", function () {
        $("#searchGuest").val("");
        $("#filterSource").val("");
        $("#filterVipTable, #filterVipSouvenir, #filterOpened, #filterRsvp, #filterBelumDikirim").prop("checked", false);
        
        applyFilters();
        
        console.log("🔄 Filters reset");
    });

    // ✅ Sort table columns
    $(document).on("click", ".sortable", function () {
        const column = $(this).data("sort");
        sortGuests(column);
    });
        



    // ✅ Panggil saat tab List Undangan dibuka
    $('button[data-bs-target="#listUndangan"]').on("click", function () {
        loadGuestList();
    });

    // ✅ Load pertama kali saat page open
    loadGuestList();

    // ✅ Per Page Selector
    $("#perPageSelect").on("change", function() {
        perPage = parseInt($(this).val());
        currentPage = 1; // Reset ke halaman 1
        renderGuestTable(getPagedData());
        renderPagination();
        
        console.log(`📄 Per page changed to: ${perPage}`);
    });

    // ==============================
    // ✅ EXPORT GUESTS TO EXCEL
    // ==============================
    
    $("#exportGuestsBtn").on("click", async function() {
        const $btn = $(this);
        const originalHtml = $btn.html();
        
        // Show loading
        $btn.prop("disabled", true).html('<i class="ri-loader-4-line"></i> Exporting...');

        try {
            // Get all guests
            const q = query(collection(window.db, "guest"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            if (snap.empty) {
                Swal.fire({
                    icon: "warning",
                    title: "Tidak Ada Data",
                    text: "Belum ada data tamu untuk di-export."
                });
                return;
            }

            // ✅ SHEET 1: Format Sederhana (untuk import)
            const simpleData = [];
            
            // ✅ SHEET 2: Data Lengkap (full details)
            const fullData = [];
            
            snap.forEach(doc => {
                const d = doc.data();
                
                // Sheet 1: Simple format
                simpleData.push({
                    "Nama Tamu": d.name || "",
                    "Jumlah Tamu": d.maxGuests || 0,
                    "Nomor Handphone": d.phone || "",
                    "Instagram": d.instagram || "",
                    "Tamu Undangan Dari": d.source || "",
                    "Keterangan Undangan Dari": d.sourceName || "",
                    "Table": d.isTableVip ? "VIP" : "Reguler",
                    "Souvenir": d.isSouvenirVip ? "VIP" : "Reguler"
                });

                // Sheet 2: Full details
                fullData.push({
                    "ID Guest": doc.id,
                    "Nama Tamu": d.name || "",
                    "Jumlah Tamu": d.maxGuests || 0,
                    "Nomor Handphone": d.phone || "",
                    "Instagram": d.instagram ? `@${d.instagram}` : "",
                    "Tamu Undangan Dari": d.source || "",
                    "Keterangan Undangan Dari": d.sourceName || "",
                    "Table": d.isTableVip ? "VIP" : "Reguler",
                    "Souvenir": d.isSouvenirVip ? "VIP" : "Reguler",
                    "Status Buka": d.opened ? "Sudah" : "Belum",
                    "Jumlah Buka": d.openCount || 0,
                    "Status RSVP": d.rsvpStatus === "yes" ? "Hadir" : d.rsvpStatus === "no" ? "Tidak Hadir" : "Belum Konfirmasi",
                    "Jumlah Hadir": d.rsvpCount || 0,
                    "Device Type": d.deviceType || "",
                    "Terakhir Dikirim WA": d.lastSent ? formatDate(d.lastSent) : "",
                    "Jumlah Kirim WA": d.sendCount || 0,
                    "Dibuat": formatDate(d.createdAt),
                    "Diupdate": formatDate(d.updatedAt)
                });
            });

            // Create workbook with 2 sheets
            const wb = XLSX.utils.book_new();

            // ✅ Sheet 1: Simple Format
            const ws1 = XLSX.utils.json_to_sheet(simpleData);
            
            // Auto-size columns for Sheet 1
            const colWidths1 = Object.keys(simpleData[0]).map(key => {
                const maxLength = Math.max(
                    key.length,
                    ...simpleData.map(row => String(row[key] || "").length)
                );
                return { wch: Math.min(maxLength + 2, 50) };
            });
            ws1['!cols'] = colWidths1;
            
            XLSX.utils.book_append_sheet(wb, ws1, "Import Format");

            // ✅ Sheet 2: Full Details
            const ws2 = XLSX.utils.json_to_sheet(fullData);
            
            // Auto-size columns for Sheet 2
            const colWidths2 = Object.keys(fullData[0]).map(key => {
                const maxLength = Math.max(
                    key.length,
                    ...fullData.map(row => String(row[key] || "").length)
                );
                return { wch: Math.min(maxLength + 2, 50) };
            });
            ws2['!cols'] = colWidths2;
            
            XLSX.utils.book_append_sheet(wb, ws2, "Full Details");

            // Generate filename with timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `Guest_List_${timestamp}.xlsx`;

            // Download
            XLSX.writeFile(wb, filename);

            Swal.fire({
                icon: "success",
                title: "Export Berhasil!",
                html: `<p>${simpleData.length} tamu berhasil di-export ke <strong>${filename}</strong></p>
                       <p class="text-muted mb-0"><small>📄 Sheet 1: Import Format (8 kolom)<br>📊 Sheet 2: Full Details (18 kolom)</small></p>`,
                timer: 3000,
                showConfirmButton: false
            });

            console.log(`✅ Exported ${simpleData.length} guests to ${filename} (2 sheets)`);

        } catch (err) {
            console.error("❌ Error exporting guests:", err);
            Swal.fire({
                icon: "error",
                title: "Export Gagal",
                text: "Terjadi kesalahan saat export data."
            });
        } finally {
            // Reset button
            $btn.prop("disabled", false).html(originalHtml);
        }
    });


    // ==============================
    // ✅ IMPORT GUESTS FUNCTIONALITY
    // ==============================
    
    let importData = [];

    // Open import modal
    $("#importGuestsBtn").on("click", function() {
        const modal = new bootstrap.Modal(document.getElementById("importGuestsModal"));
        modal.show();
    });

    // Download template CSV
    $("#downloadTemplate").on("click", function() {
        const template = [
            ["Nama Tamu", "Jumlah Tamu", "Nomor Handphone", "Instagram", "Tamu Undangan Dari", "Keterangan Undangan Dari", "Table", "Souvenir"],
            ["Nadia & Hadi", "2", "+62 895-4230-30255", "nadiahadi", "CPW", "Teman Kerja", "VIP", "Reguler"],
            ["Budi Santoso", "1", "081234567890", "", "Alfira", "Teman Sekolah", "Reguler", "VIP"],
            ["Ani Wijaya", "3", "", "aniwijaya", "Fauzi", "Keluarga", "VIP", "VIP"]
        ];

        const csv = template.map(row => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "template_import_tamu.csv";
        link.click();

        console.log("📥 Template CSV downloaded");
    });

    // Handle file upload
    $("#importFile").on("change", function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                if (jsonData.length < 2) {
                    Swal.fire({
                        icon: "error",
                        title: "File Kosong",
                        text: "File tidak memiliki data yang valid."
                    });
                    return;
                }

                // Parse data
                const headers = jsonData[0];
                const rows = jsonData.slice(1).filter(row => row.length > 0 && row[0]); // Filter empty rows

                importData = rows.map(row => {
                    // Helper function untuk clean cell value
                    const cleanCell = (cell) => {
                        if (cell === undefined || cell === null || cell === "") return "";
                        const str = String(cell).trim();
                        return str === "" ? "" : str;
                    };

                    return {
                        name: cleanCell(row[0]),
                        maxGuests: parseInt(row[1]) || 1,
                        phone: cleanCell(row[2]),
                        instagram: cleanCell(row[3]).replace(/^@/, ''),
                        source: cleanCell(row[4]),
                        sourceName: cleanCell(row[5]),
                        isTableVip: cleanCell(row[6]).toUpperCase() === "VIP",
                        isSouvenirVip: cleanCell(row[7]).toUpperCase() === "VIP"
                    };
                });

                // Show preview
                showImportPreview(headers, rows.slice(0, 5), rows.length);
                $("#processImport").prop("disabled", false);

                console.log(`📊 Parsed ${importData.length} rows from file`);

            } catch (error) {
                console.error("Error parsing file:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Gagal membaca file. Pastikan format file benar."
                });
            }
        };

        reader.readAsArrayBuffer(file);
    });

    // Show preview
    function showImportPreview(headers, rows, total) {
        const previewHead = $("#importPreviewHead");
        const previewBody = $("#importPreviewBody");

        // Build header
        let headerHtml = "<tr>";
        headers.forEach(h => {
            headerHtml += `<th>${h}</th>`;
        });
        headerHtml += "</tr>";
        previewHead.html(headerHtml);

        // Build body
        let bodyHtml = "";
        rows.forEach(row => {
            bodyHtml += "<tr>";
            // Pastikan row memiliki panjang yang sama dengan headers
            for (let i = 0; i < headers.length; i++) {
                const cell = row[i];
                // Handle undefined, null, empty string, atau whitespace
                const displayValue = (cell !== undefined && cell !== null && String(cell).trim() !== "") 
                    ? String(cell).trim() 
                    : "-";
                bodyHtml += `<td>${displayValue}</td>`;
            }
            bodyHtml += "</tr>";
        });
        previewBody.html(bodyHtml);

        $("#importTotalRows").text(total);
        $("#importPreview").show();
    }

    // Process import
    $("#processImport").on("click", async function() {
        if (importData.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "Tidak Ada Data",
                text: "Silakan upload file terlebih dahulu."
            });
            return;
        }

        // Confirm
        const result = await Swal.fire({
            icon: "question",
            title: "Konfirmasi Import",
            text: `Import ${importData.length} tamu ke database?`,
            showCancelButton: true,
            confirmButtonText: "Ya, Import",
            cancelButtonText: "Batal"
        });

        if (!result.isConfirmed) return;

        // Show loading
        Swal.fire({
            title: "Importing...",
            text: "Mohon tunggu, sedang mengimport data...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Process each row
        for (let i = 0; i < importData.length; i++) {
            const guest = importData[i];

            try {
                // Validate
                if (!guest.name) {
                    errors.push(`Baris ${i + 2}: Nama tamu kosong`);
                    errorCount++;
                    continue;
                }

                // ✅ Phone & Instagram keduanya opsional (boleh kosong keduanya)

                // Normalize phone
                if (guest.phone) {
                    guest.phone = normalizePhoneNumber(guest.phone);
                }

                // Prepare payload
                const payload = {
                    name: guest.name,
                    phone: guest.phone,
                    instagram: guest.instagram,
                    maxGuests: guest.maxGuests,
                    source: guest.source,
                    sourceName: guest.sourceName,
                    isTableVip: guest.isTableVip,
                    isSouvenirVip: guest.isSouvenirVip,
                    opened: false,
                    openCount: 0,
                    rsvpStatus: "",
                    rsvpCount: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                // Save to Firestore
                await addDoc(collection(window.db, "guest"), payload);
                successCount++;

            } catch (error) {
                console.error(`Error importing row ${i + 2}:`, error);
                errors.push(`Baris ${i + 2}: ${error.message}`);
                errorCount++;
            }
        }

        // Close loading
        Swal.close();

        // Show result
        let resultHtml = `<p><strong>Berhasil:</strong> ${successCount} tamu</p>`;
        if (errorCount > 0) {
            resultHtml += `<p><strong>Gagal:</strong> ${errorCount} tamu</p>`;
            if (errors.length > 0) {
                resultHtml += `<details><summary>Lihat Error</summary><ul>`;
                errors.slice(0, 10).forEach(err => {
                    resultHtml += `<li>${err}</li>`;
                });
                if (errors.length > 10) {
                    resultHtml += `<li>... dan ${errors.length - 10} error lainnya</li>`;
                }
                resultHtml += `</ul></details>`;
            }
        }

        Swal.fire({
            icon: successCount > 0 ? "success" : "error",
            title: "Import Selesai",
            html: resultHtml,
            confirmButtonText: "OK"
        });

        // Reset and reload
        $("#importFile").val("");
        $("#importPreview").hide();
        $("#processImport").prop("disabled", true);
        importData = [];

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById("importGuestsModal")).hide();

        // Reload guest list (reset filters karena ada data baru)
        loadGuestList(false);

        console.log(`✅ Import completed: ${successCount} success, ${errorCount} errors`);
    });


    // ==============================
    // ✅ TOGGLE DETAIL ROW
    // ==============================
    $(document).on("click", ".toggleDetail", function () {
        const id = $(this).data("id");
        const detailRow = $(`#detail-${id}`);
        const icon = $(this).find("i");

        if (detailRow.is(":visible")) {
            detailRow.slideUp(200);
            icon.removeClass("ri-arrow-up-s-line").addClass("ri-arrow-down-s-line");
        } else {
            detailRow.slideDown(200);
            icon.removeClass("ri-arrow-down-s-line").addClass("ri-arrow-up-s-line");
        }
    });


    // ==============================
    // ✅ COPY LINK GUEST
    // ==============================
    $(document).on("click", ".copyLink", function () {
        const id = $(this).data("id");
        const guestLink = `${url_domain}?g=${id}`;

        // Copy to clipboard
        navigator.clipboard.writeText(guestLink).then(() => {
            Swal.fire({
                icon: "success",
                title: "Link Tersalin!",
                text: guestLink,
                timer: 2000,
                showConfirmButton: false
            });
        }).catch(err => {
            console.error("Failed to copy:", err);
            Swal.fire({
                icon: "error",
                title: "Gagal",
                text: "Tidak dapat menyalin link."
            });
        });
    });

    $(document).on("click", ".deleteGuest", async function () {
        const id = $(this).data("id");

        Swal.fire({
            title: "Hapus Tamu?",
            text: "Data ini akan hilang permanen.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Hapus",
            cancelButtonText: "Batal"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await deleteDoc(doc(window.db, "guest", id));

                    Swal.fire({
                        icon: "success",
                        title: "Dihapus!",
                        text: "Tamu berhasil dihapus.",
                        timer: 1500,
                        showConfirmButton: false
                    });

                    loadGuestList(true); // ✅ Keep filters active
                } catch (err) {
                    console.error(err);
                    Swal.fire({
                        icon: "error",
                        title: "Gagal",
                        text: "Tidak dapat menghapus tamu."
                    });
                }
            }
        });
    });

    $(document).on("click", ".editGuest", function () {
        const $btn = $(this);
        const id = $btn.data("id");
        const name = $btn.data("name");
        const maxGuests = $btn.data("maxguests");
        const phone = $btn.data("phone");
        const instagram = $btn.data("instagram");
        const source = $btn.data("source");
        const sourceName = $btn.data("sourcename");
        
        // ✅ Get 2 VIP status terpisah
        const isTableVip = $btn.data("istablevip");
        const isSouvenirVip = $btn.data("issouvenivip");

        // Populate form
        $('input[name="editGuestId"]').val(id);
        $('input[name="editGuestName"]').val(name);
        $('input[name="editGuestCount"]').val(maxGuests);
        $('input[name="editGuestPhone"]').val(phone);
        $('input[name="editGuestInstagram"]').val(instagram);
        $('select[name="editGuestSource"]').val(source);
        $('input[name="editGuestSourceNote"]').val(sourceName);
        
        // ✅ Set 2 VIP checkboxes
        $('input[name="editGuestTableVip"]').prop("checked", isTableVip === true || isTableVip === "true");
        $('input[name="editGuestSouvenirVip"]').prop("checked", isSouvenirVip === true || isSouvenirVip === "true");

        // ✅ Set opsi Turut Mengundang & lagu
        const showInviters = $btn.data("showinviters");
        $('input[name="editGuestShowInviters"]').prop("checked", showInviters === true || showInviters === "true");
        $('select[name="editGuestMusicTrack"]').val($btn.data("musictrack") === "minang" ? "minang" : "default");

        console.log('📝 Edit guest data:', { id, name, maxGuests, phone, instagram, source, sourceName, isTableVip, isSouvenirVip });

        const modal = new bootstrap.Modal(document.getElementById("editGuestModal"));
        modal.show();
    });

    $("#saveEditGuest").on("click", async function () {
        const id = $('input[name="editGuestId"]').val();

        const phoneRaw = $('input[name="editGuestPhone"]').val().trim();
        const instagramRaw = $('input[name="editGuestInstagram"]').val().trim();

        const payload = {
            name: $('input[name="editGuestName"]').val().trim(),
            maxGuests: Number($('input[name="editGuestCount"]').val()),
            phone: phoneRaw ? normalizePhoneNumber(phoneRaw) : "",  // ✅ Normalize phone (optional)
            instagram: instagramRaw ? instagramRaw.replace(/^@/, '') : "",  // ✅ Clean instagram (optional)
            source: $('select[name="editGuestSource"]').val(),
            sourceName: $('input[name="editGuestSourceNote"]').val().trim(),
            
            // ✅ 2 field VIP terpisah (boolean)
            isTableVip: $('input[name="editGuestTableVip"]').is(':checked'),
            isSouvenirVip: $('input[name="editGuestSouvenirVip"]').is(':checked'),

            // ✅ Opsi tampilan & audio khusus tamu ini
            showInviters: $('input[name="editGuestShowInviters"]').is(':checked'),
            musicTrack: $('select[name="editGuestMusicTrack"]').val() === "minang" ? "minang" : "default",

            updatedAt: serverTimestamp()
        };

        if (!payload.name || !payload.maxGuests) {
            Swal.fire({
                icon: "warning",
                title: "Data belum lengkap",
                text: "Nama dan jumlah tamu wajib diisi."
            });
            return;
        }

        // ✅ Phone & Instagram keduanya opsional (boleh kosong keduanya)

        try {
            await updateDoc(doc(window.db, "guest", id), payload);

            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Perubahan tamu berhasil disimpan.",
                timer: 1500,
                showConfirmButton: false
            });

            const modalEl = document.getElementById("editGuestModal");
            bootstrap.Modal.getInstance(modalEl).hide();

            loadGuestList(true); // ✅ Keep filters active

        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Gagal",
                text: "Perubahan tidak dapat disimpan."
            });
        }
    });


    // ==============================
    // ✅ INVITATION TEMPLATE MANAGER
    // ==============================

    const TEMPLATE_DOC_ID = "lw0mWlwUYZW2iJ2hPaw1";
    const DEFAULT_TEMPLATE = `Kepada Yth. [Nama Tamu]

Assalamu'alaikum Warahmatullahi Wabarakatuh

Dengan memohon rahmat dan ridha Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:

💍 Alfira & Fauzi
📅 Minggu, 23 November 2025

Detail acara dan konfirmasi kehadiran dapat diakses melalui tautan berikut:
🔗 [Link Undangan]

Merupakan kebahagiaan dan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Wassalamu'alaikum Warahmatullahi Wabarakatuh

Kami yang berbahagia,
Alfira & Fauzi`;

    // Load template dari Firestore
    async function loadInvitationTemplate() {
        try {
            const docRef = doc(window.db, "chatInvitation", TEMPLATE_DOC_ID);
            const docSnap = await getDoc(docRef);

            let template = DEFAULT_TEMPLATE;

            if (docSnap.exists()) {
                template = docSnap.data().template || DEFAULT_TEMPLATE;
                console.log('✅ Template loaded from Firestore');
            } else {
                // Document belum ada, gunakan default template
                console.log('⚠️ Template document belum ada, menggunakan default template');
                console.log('💡 Silakan simpan template untuk membuat document di Firestore');
                template = DEFAULT_TEMPLATE;
            }

            // Set ke TinyMCE
            if (tinymce.get('invitationTemplate')) {
                tinymce.get('invitationTemplate').setContent(template.replace(/\n/g, '<br>'));
            }

        } catch (err) {
            console.error('❌ Error loading template:', err);
            // Fallback ke default template
            if (tinymce.get('invitationTemplate')) {
                tinymce.get('invitationTemplate').setContent(DEFAULT_TEMPLATE.replace(/\n/g, '<br>'));
            }
        }
    }

    // Save template ke Firestore
    $("#invitationForm").on("submit", async function(e) {
        e.preventDefault();

        const editor = tinymce.get('invitationTemplate');
        if (!editor) return;

        // Get content dan convert <br> ke \n
        let template = editor.getContent({ format: 'text' });

        try {
            const docRef = doc(window.db, "chatInvitation", TEMPLATE_DOC_ID);
            await setDoc(docRef, {
                template: template,
                updatedAt: serverTimestamp()
            });

            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Template berhasil disimpan!",
                timer: 1500,
                showConfirmButton: false
            });

            console.log('✅ Template saved');
        } catch (err) {
            console.error('❌ Error saving template:', err);
            Swal.fire({
                icon: "error",
                title: "Gagal",
                text: "Gagal menyimpan template."
            });
        }
    });

    // Reset template ke default
    $("#resetTemplate").on("click", function() {
        Swal.fire({
            title: "Reset Template?",
            text: "Template akan dikembalikan ke default.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Ya, Reset",
            cancelButtonText: "Batal"
        }).then((result) => {
            if (result.isConfirmed) {
                const editor = tinymce.get('invitationTemplate');
                if (editor) {
                    editor.setContent(DEFAULT_TEMPLATE.replace(/\n/g, '<br>'));
                }
            }
        });
    });

    // Load guest list untuk preview
    async function loadGuestListForInvitation() {
        try {
            const q = query(collection(window.db, "guest"), orderBy("name", "asc"));
            const snap = await getDocs(q);

            const select = $("#previewGuestSelect");
            select.empty();
            select.append('<option value="">-- Pilih Tamu --</option>');

            snap.forEach(doc => {
                const data = doc.data();
                select.append(`<option value="${doc.id}" data-name="${data.name}" data-phone="${data.phone}">${data.name}</option>`);
            });

            console.log('✅ Guest list loaded for invitation');
        } catch (err) {
            console.error('❌ Error loading guest list:', err);
        }
    }

    // Preview message saat pilih tamu
    $("#previewGuestSelect").on("change", async function() {
        const selectedOption = $(this).find("option:selected");
        const guestId = $(this).val();
        const guestName = selectedOption.data("name");
        const guestPhone = selectedOption.data("phone");

        if (!guestId) {
            $("#previewPhone").val("");
            $("#previewMessage").text("Pilih tamu untuk melihat preview pesan...");
            $("#sendWhatsApp").prop("disabled", true);
            return;
        }

        $("#previewPhone").val(guestPhone);

        // Load template
        try {
            const docRef = doc(window.db, "chatInvitation", TEMPLATE_DOC_ID);
            const docSnap = await getDoc(docRef);

            let template = DEFAULT_TEMPLATE;
            if (docSnap.exists()) {
                template = docSnap.data().template || DEFAULT_TEMPLATE;
            }

            // Replace placeholders
            const guestLink = `${url_domain}?g=${guestId}`;
            const message = template
                .replace(/\[Nama Tamu\]/g, guestName)
                .replace(/\[Link Undangan\]/g, guestLink);

            $("#previewMessage").text(message);
            $("#sendWhatsApp").prop("disabled", false);

        } catch (err) {
            console.error('❌ Error loading template for preview:', err);
        }
    });

    // Send via WhatsApp
    $("#sendWhatsApp").on("click", function() {
        const phone = $("#previewPhone").val();
        const message = $("#previewMessage").text();

        if (!phone || !message) {
            Swal.fire({
                icon: "warning",
                title: "Data Tidak Lengkap",
                text: "Pilih tamu terlebih dahulu."
            });
            return;
        }

        // Format phone number (remove leading 0, add 62)
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('62')) {
            formattedPhone = '62' + formattedPhone;
        }

        // Encode message untuk URL
        const encodedMessage = encodeURIComponent(message);

        // Open WhatsApp Web
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');

        console.log('✅ Opening WhatsApp for:', formattedPhone);
    });

    // Load guest list saat tab dibuka
    $('button[data-bs-target="#formInvitation"]').on("click", function() {
        loadGuestListForInvitation();
    });


    // ==============================
    // ✅ SEND WHATSAPP DIRECT FROM LIST
    // ==============================

    // Helper function untuk format phone number
    function formatPhoneNumber(phone) {
        let formatted = phone.replace(/\D/g, '');
        if (formatted.startsWith('0')) {
            formatted = '62' + formatted.substring(1);
        } else if (!formatted.startsWith('62')) {
            formatted = '62' + formatted;
        }
        return formatted;
    }

    // Helper function untuk update send tracking
    async function updateSendTracking(guestId) {
        try {
            const docRef = doc(window.db, "guest", guestId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                console.error('❌ Guest not found:', guestId);
                return false;
            }

            const currentData = docSnap.data();
            const currentSendCount = currentData.sendCount || 0;

            await updateDoc(docRef, {
                lastSent: serverTimestamp(),
                sendCount: currentSendCount + 1,
                updatedAt: serverTimestamp()
            });

            console.log('✅ Send tracking updated:', { guestId, sendCount: currentSendCount + 1 });
            return true;

        } catch (err) {
            console.error('❌ Error updating send tracking:', err);
            return false;
        }
    }

    // Handler untuk tombol WhatsApp di list
    $(document).on("click", ".sendWhatsAppDirect", async function() {
        const $btn = $(this);
        const guestId = $btn.data("id");
        const guestName = $btn.data("name");
        const guestPhone = $btn.data("phone");

        if (!guestPhone) {
            Swal.fire({
                icon: "warning",
                title: "Nomor Tidak Ada",
                text: "Tamu ini belum memiliki nomor WhatsApp."
            });
            return;
        }

        // Disable button sementara
        $btn.prop("disabled", true);

        try {
            // Load template
            const docRef = doc(window.db, "chatInvitation", TEMPLATE_DOC_ID);
            const docSnap = await getDoc(docRef);

            let template = DEFAULT_TEMPLATE;
            if (docSnap.exists()) {
                template = docSnap.data().template || DEFAULT_TEMPLATE;
            }

            // Replace placeholders
            const guestLink = `${url_domain}?g=${guestId}`;
            const message = template
                .replace(/\[Nama Tamu\]/g, guestName)
                .replace(/\[Link Undangan\]/g, guestLink);

            // Format phone number
            const formattedPhone = formatPhoneNumber(guestPhone);

            // Encode message
            const encodedMessage = encodeURIComponent(message);

            // Update tracking
            await updateSendTracking(guestId);

            // Open WhatsApp
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');

            // Show success message
            Swal.fire({
                icon: "success",
                title: "WhatsApp Dibuka",
                text: `Pesan untuk ${guestName} siap dikirim!`,
                timer: 2000,
                showConfirmButton: false
            });

            console.log('✅ WhatsApp opened for:', guestName, formattedPhone);

            // Reload list untuk update tracking info (keep filters)
            setTimeout(() => {
                loadGuestList(true); // ✅ Keep filters active
            }, 1000);

        } catch (err) {
            console.error('❌ Error sending WhatsApp:', err);
            Swal.fire({
                icon: "error",
                title: "Gagal",
                text: "Gagal membuka WhatsApp. Coba lagi."
            });
        } finally {
            // Re-enable button
            $btn.prop("disabled", false);
        }
    });

    // ✅ Handler untuk tombol Instagram di list
    $(document).on("click", ".sendInstagramDM", function() {
        const $btn = $(this);
        const instagram = $btn.data("instagram");
        const name = $btn.data("name");

        if (!instagram) {
            Swal.fire({
                icon: "warning",
                title: "Instagram tidak tersedia",
                text: "Tamu ini tidak memiliki username Instagram."
            });
            return;
        }

        // Open Instagram profile in new tab
        const instagramUrl = `https://www.instagram.com/${instagram}/`;
        window.open(instagramUrl, '_blank');

        console.log(`📸 Opened Instagram: @${instagram} (${name})`);

        // Optional: Show success message
        Swal.fire({
            icon: "success",
            title: "Instagram Dibuka",
            text: `Profil @${instagram} dibuka di tab baru`,
            timer: 1500,
            showConfirmButton: false
        });
    });

    // ✅ Handler untuk tombol Copy Message di list
    $(document).on("click", ".copyMessage", async function() {
        const $btn = $(this);
        const guestId = $btn.data("id");
        const guestName = $btn.data("name");

        try {
            // Load template dari Firestore
            const docRef = doc(window.db, "invitationTemplate", TEMPLATE_DOC_ID);
            const docSnap = await getDoc(docRef);

            let template = DEFAULT_TEMPLATE;
            if (docSnap.exists()) {
                template = docSnap.data().template || DEFAULT_TEMPLATE;
            }

            // Generate invitation link
            const invitationLink = `${url_domain}?&g=${guestId}`;

            // Replace placeholders
            let message = template
                .replace(/\[Nama Tamu\]/g, guestName)
                .replace(/\[Link Undangan\]/g, invitationLink);

            // Copy to clipboard
            await navigator.clipboard.writeText(message);

            // Show success
            Swal.fire({
                icon: "success",
                title: "Berhasil Disalin!",
                html: `Pesan untuk <strong>${guestName}</strong> berhasil disalin ke clipboard.`,
                timer: 2000,
                showConfirmButton: false
            });

            console.log(`📋 Message copied for: ${guestName}`);

        } catch (error) {
            console.error("Error copying message:", error);
            
            Swal.fire({
                icon: "error",
                title: "Gagal",
                text: "Gagal menyalin pesan. Coba lagi."
            });
        }
    });

    // Update sendWhatsApp dari preview untuk juga update tracking
    $("#sendWhatsApp").off("click").on("click", async function() {
        const phone = $("#previewPhone").val();
        const message = $("#previewMessage").text();
        const guestId = $("#previewGuestSelect").val();

        if (!phone || !message || !guestId) {
            Swal.fire({
                icon: "warning",
                title: "Data Tidak Lengkap",
                text: "Pilih tamu terlebih dahulu."
            });
            return;
        }

        // Format phone number
        const formattedPhone = formatPhoneNumber(phone);

        // Encode message
        const encodedMessage = encodeURIComponent(message);

        // Update tracking
        await updateSendTracking(guestId);

        // Open WhatsApp
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');

        Swal.fire({
            icon: "success",
            title: "WhatsApp Dibuka",
            text: "Pesan siap dikirim!",
            timer: 2000,
            showConfirmButton: false
        });

        console.log('✅ WhatsApp opened for:', formattedPhone);
    });


    // ==============================
    // ✅ RSVP MANAGEMENT
    // ==============================

    let allRsvps = [];
    let filteredRsvps = [];
    let currentRsvpPage = 1;
    let perPageRsvp = 10;
    let sortRsvpColumn = "createdAt";
    let sortRsvpDirection = "desc";

    async function loadRsvpList() {
        const tbody = $("#rsvpTableBody");
        tbody.html(`<tr><td colspan="7" class="text-center text-muted">Loading...</td></tr>`);

        try {
            // ✅ Query semua guest dari collection "guest"
            const q = query(collection(window.db, "guest"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            allRsvps = [];
            let totalHadir = 0;
            let totalTidakHadir = 0;
            let totalBelumKonfirmasi = 0;

            snap.forEach(doc => {
                const data = doc.data();
                allRsvps.push({ id: doc.id, data: data });

                // Count statistics
                if (data.rsvpStatus === "yes") {
                    totalHadir += data.rsvpCount || 0;
                } else if (data.rsvpStatus === "no") {
                    totalTidakHadir++;
                } else {
                    totalBelumKonfirmasi++;
                }
            });

            // Update statistics
            $("#totalGuests").text(allRsvps.length);
            $("#totalHadir").text(totalHadir);
            $("#totalTidakHadir").text(totalTidakHadir);
            $("#totalBelumKonfirmasi").text(totalBelumKonfirmasi);

            filteredRsvps = [...allRsvps];
            currentRsvpPage = 1;

            renderRsvpTable(getPagedRsvpData());
            renderRsvpPagination();

            console.log(`✅ Loaded ${allRsvps.length} guests | Hadir: ${totalHadir} | Tidak: ${totalTidakHadir} | Belum: ${totalBelumKonfirmasi}`);
        } catch (err) {
            console.error("❌ Error load RSVP list:", err);
            tbody.html(`<tr><td colspan="7" class="text-danger text-center">Gagal memuat data.</td></tr>`);
        }
    }

    function getPagedRsvpData() {
        const start = (currentRsvpPage - 1) * perPageRsvp;
        const end = start + perPageRsvp;
        return filteredRsvps.slice(start, end);
    }

    function renderRsvpTable(list) {
        const tbody = $("#rsvpTableBody");
        tbody.empty();

        // Update total data count
        $("#totalDataRsvp").text(filteredRsvps.length);

        if (!list.length) {
            tbody.html(`<tr><td colspan="7" class="text-center text-muted">Tidak ada data RSVP.</td></tr>`);
            return;
        }

        list.forEach(doc => {
            const d = doc.data;
            
            tbody.append(`
                <tr class="rsvp-row" data-id="${doc.id}">
                    <td class="text-center card-cell--detail">
                        <button class="btn btn-sm btn-outline-secondary toggleRsvpDetail" data-id="${doc.id}" title="Lihat Detail">
                            <i class="ri-arrow-down-s-line"></i>
                            <span class="btn-label">Detail</span>
                        </button>
                    </td>
                    <td data-label="Nama Tamu" class="card-cell--title">
                        ${d.name || "-"}
                        ${d.isTableVip ? '<i class="ri-vip-fill text-primary ms-1" data-bs-toggle="tooltip" title="VIP Table"></i>' : ''}
                        ${d.isSouvenirVip ? '<i class="ri-vip-diamond-fill text-info ms-1" data-bs-toggle="tooltip" title="VIP Souvenir"></i>' : ''}
                    </td>
                    <td data-label="Status RSVP">
                        ${d.rsvpStatus === "yes" 
                            ? '<span class="badge bg-success"><i class="ri-check-line"></i> Hadir</span>' 
                            : d.rsvpStatus === "no"
                            ? '<span class="badge bg-danger"><i class="ri-close-line"></i> Tidak Hadir</span>'
                            : '<span class="badge bg-secondary">Belum Konfirmasi</span>'}
                    </td>
                    <td data-label="Jumlah Hadir">${d.rsvpCount || 0} orang</td>
                    <td data-label="Max Tamu">${d.maxGuests || 0} orang</td>
                    <td data-label="No HP">${d.phone || "-"}</td>
                    <td data-label="Dari">${d.source || "-"}</td>
                </tr>
            `);

            // Detail row
            tbody.append(`
                <tr class="detail-row" id="rsvp-detail-${doc.id}" style="display: none;">
                    <td colspan="7" class="p-0">
                        <div class="detail-content bg-light p-3">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="mb-3"><i class="ri-information-line"></i> Informasi Tamu</h6>
                                    <table class="table table-sm table-borderless">
                                        <tr>
                                            <td width="40%"><strong>Guest ID:</strong></td>
                                            <td><code>${doc.id}</code></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Nama:</strong></td>
                                            <td>${d.name || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>No. HP:</strong></td>
                                            <td>${d.phone || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Instagram:</strong></td>
                                            <td>${d.instagram ? `@${d.instagram}` : "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Max Tamu:</strong></td>
                                            <td>${d.maxGuests || 0} orang</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Sumber:</strong></td>
                                            <td>${d.source || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Nama Sumber:</strong></td>
                                            <td>${d.sourceName || "-"}</td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="mb-3"><i class="ri-calendar-check-line"></i> Status RSVP</h6>
                                    <table class="table table-sm table-borderless">
                                        <tr>
                                            <td width="40%"><strong>Status RSVP:</strong></td>
                                            <td>
                                                ${d.rsvpStatus === "yes" 
                                                    ? '<span class="badge bg-success">Hadir</span>' 
                                                    : d.rsvpStatus === "no"
                                                    ? '<span class="badge bg-danger">Tidak Hadir</span>'
                                                    : '<span class="badge bg-secondary">Belum Konfirmasi</span>'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Jumlah Hadir:</strong></td>
                                            <td>${d.rsvpCount || 0} orang</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Device Type:</strong></td>
                                            <td>${d.deviceType || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Status Buka:</strong></td>
                                            <td>
                                                ${d.opened 
                                                    ? '<span class="badge bg-success">Sudah Dibuka</span>' 
                                                    : '<span class="badge bg-secondary">Belum Dibuka</span>'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Jumlah Buka:</strong></td>
                                            <td>${d.openCount || 0}x</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Status VIP:</strong></td>
                                            <td>
                                                <div class="d-flex flex-column gap-1">
                                                    ${d.isTableVip 
                                                        ? '<span class="badge bg-warning text-dark"><i class="ri-restaurant-line"></i> VIP Table</span>' 
                                                        : '<span class="badge bg-secondary"><i class="ri-restaurant-line"></i> Regular Table</span>'}
                                                    ${d.isSouvenirVip 
                                                        ? '<span class="badge bg-warning text-dark"><i class="ri-gift-line"></i> VIP Souvenir</span>' 
                                                        : '<span class="badge bg-secondary"><i class="ri-gift-line"></i> Regular Souvenir</span>'}
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `);
        });

        // Initialize tooltips
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    function renderRsvpPagination() {
        const totalPages = Math.ceil(filteredRsvps.length / perPageRsvp);
        const pag = $("#paginationRsvp");
        pag.empty();

        if (totalPages <= 1) return;

        const li = (disabled, active, page, label) => `
            <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
                <a class="page-link" href="javascript:;" data-page="${page}">${label}</a>
            </li>`;

        pag.append(li(currentRsvpPage === 1, false, 1, "&laquo;"));

        const maxButtons = 5;
        let start = Math.max(1, currentRsvpPage - 2);
        let end = Math.min(totalPages, start + maxButtons - 1);

        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        if (start > 1) {
            pag.append(li(false, false, 1, "1"));
            pag.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
        }

        for (let i = start; i <= end; i++) {
            pag.append(li(false, currentRsvpPage === i, i, i));
        }

        if (end < totalPages) {
            pag.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
            pag.append(li(false, false, totalPages, totalPages));
        }

        pag.append(li(currentRsvpPage === totalPages, false, totalPages, "&raquo;"));
    }

    function applyRsvpFilters() {
        const keyword = $("#searchRsvp").val().toLowerCase();
        const statusFilter = $("#filterRsvpStatus").val();

        filteredRsvps = allRsvps.filter(d => {
            const data = d.data;
            
            // Filter by name
            if (keyword && !data.name.toLowerCase().includes(keyword)) {
                return false;
            }

            // Filter by RSVP status
            if (statusFilter) {
                // Handle empty string for "Belum Konfirmasi"
                if (statusFilter === "pending") {
                    if (data.rsvpStatus && data.rsvpStatus !== "") {
                        return false;
                    }
                } else {
                    if (data.rsvpStatus !== statusFilter) {
                        return false;
                    }
                }
            }

            return true;
        });

        currentRsvpPage = 1;
        renderRsvpTable(getPagedRsvpData());
        renderRsvpPagination();

        console.log(`🔍 RSVP Filter applied: ${filteredRsvps.length} of ${allRsvps.length}`);
    }

    function sortRsvps(column) {
        if (sortRsvpColumn === column) {
            sortRsvpDirection = sortRsvpDirection === "asc" ? "desc" : "asc";
        } else {
            sortRsvpColumn = column;
            sortRsvpDirection = "asc";
        }

        filteredRsvps.sort((a, b) => {
            let aVal = a.data[column];
            let bVal = b.data[column];

            if (column === "name" || column === "rsvpStatus") {
                aVal = (aVal || "").toLowerCase();
                bVal = (bVal || "").toLowerCase();
            } else if (column === "rsvpCount" || column === "maxGuests") {
                aVal = aVal || 0;
                bVal = bVal || 0;
            }

            if (aVal < bVal) return sortRsvpDirection === "asc" ? -1 : 1;
            if (aVal > bVal) return sortRsvpDirection === "asc" ? 1 : -1;
            return 0;
        });

        updateRsvpSortIcons();
        currentRsvpPage = 1;
        renderRsvpTable(getPagedRsvpData());
        renderRsvpPagination();
    }

    function updateRsvpSortIcons() {
        $(".sortable-rsvp .sort-icon").removeClass("ri-arrow-up-line ri-arrow-down-line").addClass("ri-arrow-up-down-line");
        const activeIcon = $(`.sortable-rsvp[data-sort="${sortRsvpColumn}"] .sort-icon`);
        activeIcon.removeClass("ri-arrow-up-down-line");
        if (sortRsvpDirection === "asc") {
            activeIcon.addClass("ri-arrow-up-line");
        } else {
            activeIcon.addClass("ri-arrow-down-line");
        }
    }

    // Event handlers
    $("#searchRsvp").on("input", applyRsvpFilters);
    $("#filterRsvpStatus").on("change", applyRsvpFilters);
    $("#resetRsvpFilters").on("click", function() {
        $("#searchRsvp").val("");
        $("#filterRsvpStatus").val("");
        applyRsvpFilters();
    });

    $(document).on("click", ".sortable-rsvp", function() {
        const column = $(this).data("sort");
        sortRsvps(column);
    });

    $(document).on("click", "#paginationRsvp .page-link", function() {
        const page = $(this).data("page");
        if (!page || page < 1) return;
        currentRsvpPage = page;
        renderRsvpTable(getPagedRsvpData());
        renderRsvpPagination();
    });

    $("#perPageRsvp").on("change", function() {
        perPageRsvp = parseInt($(this).val());
        currentRsvpPage = 1;
        renderRsvpTable(getPagedRsvpData());
        renderRsvpPagination();
    });

    $(document).on("click", ".toggleRsvpDetail", function() {
        const id = $(this).data("id");
        const detailRow = $(`#rsvp-detail-${id}`);
        const icon = $(this).find("i");

        if (detailRow.is(":visible")) {
            detailRow.slideUp(200);
            icon.removeClass("ri-arrow-up-s-line").addClass("ri-arrow-down-s-line");
        } else {
            detailRow.slideDown(200);
            icon.removeClass("ri-arrow-down-s-line").addClass("ri-arrow-up-s-line");
        }
    });




    // ==============================
    // ✅ COMMENTS MANAGEMENT
    // ==============================

    let allComments = [];
    let filteredComments = [];
    let currentCommentPage = 1;
    let perPageComment = 10;
    let sortCommentColumn = "createdAt";
    let sortCommentDirection = "desc";

    const ADMIN_STICKERS = Array.from({ length: 18 }, (_, index) => `stc-a-${index + 1}.gif`);
    const isAllowedSticker = (value) => value === ''
        || ADMIN_STICKERS.includes(value)
        || /^stc-[1-5]\.png$/.test(String(value));
    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    function renderCommentSetting(enabled, state = 'ready') {
        const toggle = document.getElementById('allowPublicComments');
        if (!toggle) return;

        toggle.checked = enabled;
        toggle.dataset.savedValue = String(enabled);
        toggle.closest('.comment-setting')?.setAttribute('data-state', state);

        const status = state === 'saving' ? 'MENYIMPAN…' : enabled ? 'ON' : 'OFF';
        $('#allowPublicCommentsStatus').text(status);
        $('#commentPublicDescription').text(
            state === 'saving'
                ? 'Menyimpan pengaturan komentar ke Firestore…'
                : enabled
                    ? 'ON — tamu dan pengunjung non-guest dapat mengirim komentar.'
                    : 'OFF — hanya tamu dengan link undangan valid yang dapat mengirim komentar.'
        );
    }

    async function loadCommentSetting() {
        let enabled = false;
        try {
            const snap = await getDoc(doc(window.db, 'settings', 'comments'));
            enabled = snap.exists() && snap.data().allowPublicComments === true;
        } catch (err) {
            console.warn('Pengaturan komentar memakai default OFF:', err);
        }
        renderCommentSetting(enabled);
        return enabled;
    }

    $('#allowPublicComments').on('change', async function () {
        const enabled = this.checked;
        const previousEnabled = this.dataset.savedValue === 'true';
        this.disabled = true;
        renderCommentSetting(enabled, 'saving');

        try {
            await runAdminWrite(() => setDoc(doc(window.db, 'settings', 'comments'), {
                allowPublicComments: enabled,
                updatedAt: serverTimestamp(),
            }));

            renderCommentSetting(enabled);
            Swal.fire({
                icon: 'success',
                title: 'Pengaturan tersimpan',
                text: enabled
                    ? 'Komentar publik sekarang aktif.'
                    : 'Komentar kini hanya untuk tamu dengan link valid.',
                timer: 1700,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error('Gagal menyimpan pengaturan komentar:', err);
            renderCommentSetting(previousEnabled, 'error');

            const code = String(err?.code || '');
            let message = 'Pengaturan komentar tidak dapat disimpan. Coba lagi.';
            if (code.includes('permission-denied')) {
                message = 'Akses ditolak Firestore. Pastikan Anda login sebagai admin@soyaarief.site dan rules terbaru sudah dideploy.';
            } else if (code.includes('unauthenticated')) {
                message = 'Token sesi admin kedaluwarsa dan percobaan ulang gagal. Muat ulang halaman lalu coba lagi.';
            } else if (code.includes('unavailable') || code.includes('network')) {
                message = 'Koneksi ke Firebase sedang bermasalah. Periksa internet lalu coba lagi.';
            }

            Swal.fire({
                icon: 'error',
                title: 'Gagal menyimpan',
                text: message,
                confirmButtonText: 'Mengerti',
            });
        } finally {
            this.disabled = false;
        }
    });

    async function loadCommentList() {
        const tbody = $("#commentTableBody");
        tbody.html(`<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>`);

        try {
            await loadCommentSetting();
            const q = query(collection(window.db, "comments"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            allComments = [];
            snap.forEach(doc => {
                allComments.push({ id: doc.id, data: doc.data() });
            });

            filteredComments = [...allComments];
            currentCommentPage = 1;

            renderCommentTable(getPagedCommentData());
            renderCommentPagination();

            console.log(`✅ Loaded ${allComments.length} comments`);
        } catch (err) {
            console.error("❌ Error load comments:", err);
            tbody.html(`<tr><td colspan="6" class="text-danger text-center">Gagal memuat data.</td></tr>`);
        }
    }

    function getPagedCommentData() {
        const start = (currentCommentPage - 1) * perPageComment;
        const end = start + perPageComment;
        return filteredComments.slice(start, end);
    }

    function renderCommentTable(list) {
        const tbody = $("#commentTableBody");
        tbody.empty();
        $("#totalDataComment").text(filteredComments.length);

        if (!list.length) {
            tbody.html(`<tr><td colspan="6" class="text-center text-muted">Tidak ada komentar.</td></tr>`);
            return;
        }

        list.forEach(commentDoc => {
            const d = commentDoc.data;
            const safeId = escapeHtml(commentDoc.id);
            const safeName = escapeHtml(d.name || '-');
            const rawComment = String(d.comment || '');
            const safeComment = escapeHtml(rawComment || '-');
            const safePreview = escapeHtml(rawComment.length > 100 ? `${rawComment.slice(0, 100)}...` : rawComment || '-');
            const sticker = isAllowedSticker(d.sticker) && d.sticker ? d.sticker : '';
            const replySticker = isAllowedSticker(d.replySticker) && d.replySticker ? d.replySticker : '';

            tbody.append(`
                <tr class="comment-row" data-id="${safeId}">
                    <td class="text-center card-cell--detail">
                        <button class="btn btn-sm btn-outline-secondary toggleCommentDetail" data-id="${safeId}" title="Lihat Detail">
                            <i class="ri-arrow-down-s-line"></i><span class="btn-label">Detail</span>
                        </button>
                    </td>
                    <td data-label="Nama" class="card-cell--title">${safeName}</td>
                    <td data-label="Komentar">${safePreview}${d.replyText || replySticker ? '<span class="badge text-bg-info ms-2">Dibalas</span>' : ''}</td>
                    <td data-label="Sticker">${sticker ? `<img src="../assets/images/sticker/${sticker}" alt="sticker" width="30" height="30">` : '-'}</td>
                    <td data-label="Tanggal">${escapeHtml(formatDate(d.createdAt))}</td>
                    <td data-label="Aksi" class="comment-card__actions text-center">
                        <button type="button" class="btn btn-sm comment-action-btn comment-action-btn--reply replyComment" data-id="${safeId}" title="Balas komentar" aria-label="Balas komentar">
                            <i class="ri-chat-1-line" aria-hidden="true"></i>
                        </button>
                        <button type="button" class="btn btn-sm comment-action-btn comment-action-btn--delete deleteComment" data-id="${safeId}" title="Hapus komentar" aria-label="Hapus komentar">
                            <i class="ri-delete-bin-6-line" aria-hidden="true"></i>
                        </button>
                    </td>
                </tr>
                <tr class="detail-row" id="comment-detail-${safeId}" style="display: none;">
                    <td colspan="6" class="p-0">
                        <div class="detail-content bg-light p-3">
                            <h6 class="mb-3"><i class="ri-information-line"></i> Detail Comment</h6>
                            <table class="table table-sm table-borderless">
                                <tr><td width="30%"><strong>ID Comment:</strong></td><td><code>${safeId}</code></td></tr>
                                <tr><td><strong>Guest ID:</strong></td><td><code>${escapeHtml(d.guestId || '-')}</code></td></tr>
                                <tr><td><strong>Nama:</strong></td><td>${safeName}</td></tr>
                                <tr><td><strong>Komentar:</strong></td><td class="comment-preserve">${safeComment}</td></tr>
                                <tr><td><strong>Sticker:</strong></td><td>${sticker ? `<img src="../assets/images/sticker/${sticker}" alt="sticker" width="60" height="60">` : '-'}</td></tr>
                                <tr><td><strong>Balasan Admin:</strong></td><td class="comment-preserve">${escapeHtml(d.replyText || '-')}${replySticker ? `<br><img src="../assets/images/sticker/${replySticker}" alt="sticker balasan" width="60" height="60">` : ''}</td></tr>
                                <tr><td><strong>Tanggal:</strong></td><td>${escapeHtml(formatDate(d.createdAt))}</td></tr>
                            </table>
                        </div>
                    </td>
                </tr>
            `);
        });
    }

    function renderCommentPagination() {
        const totalPages = Math.ceil(filteredComments.length / perPageComment);
        const pag = $("#paginationComment");
        pag.empty();

        if (totalPages <= 1) return;

        const li = (disabled, active, page, label) => `
            <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
                <a class="page-link" href="javascript:;" data-page="${page}">${label}</a>
            </li>`;

        pag.append(li(currentCommentPage === 1, false, 1, "&laquo;"));

        const maxButtons = 5;
        let start = Math.max(1, currentCommentPage - 2);
        let end = Math.min(totalPages, start + maxButtons - 1);

        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        if (start > 1) {
            pag.append(li(false, false, 1, "1"));
            pag.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
        }

        for (let i = start; i <= end; i++) {
            pag.append(li(false, currentCommentPage === i, i, i));
        }

        if (end < totalPages) {
            pag.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
            pag.append(li(false, false, totalPages, totalPages));
        }

        pag.append(li(currentCommentPage === totalPages, false, totalPages, "&raquo;"));
    }

    function applyCommentFilters() {
        const keyword = $("#searchComment").val().toLowerCase();
        const stickerFilter = $("#filterCommentSticker").val();

        filteredComments = allComments.filter(d => {
            const data = d.data;
            
            if (keyword) {
                const nameMatch = (data.name || "").toLowerCase().includes(keyword);
                const commentMatch = (data.comment || "").toLowerCase().includes(keyword);
                if (!nameMatch && !commentMatch) {
                    return false;
                }
            }

            if (stickerFilter && data.sticker !== stickerFilter) {
                return false;
            }

            return true;
        });

        currentCommentPage = 1;
        renderCommentTable(getPagedCommentData());
        renderCommentPagination();

        console.log(`🔍 Comment Filter applied: ${filteredComments.length} of ${allComments.length}`);
    }

    function sortComments(column) {
        if (sortCommentColumn === column) {
            sortCommentDirection = sortCommentDirection === "asc" ? "desc" : "asc";
        } else {
            sortCommentColumn = column;
            sortCommentDirection = "asc";
        }

        filteredComments.sort((a, b) => {
            let aVal = a.data[column];
            let bVal = b.data[column];

            if (column === "name" || column === "sticker") {
                aVal = (aVal || "").toLowerCase();
                bVal = (bVal || "").toLowerCase();
            }

            if (aVal < bVal) return sortCommentDirection === "asc" ? -1 : 1;
            if (aVal > bVal) return sortCommentDirection === "asc" ? 1 : -1;
            return 0;
        });

        updateCommentSortIcons();
        currentCommentPage = 1;
        renderCommentTable(getPagedCommentData());
        renderCommentPagination();
    }

    function updateCommentSortIcons() {
        $(".sortable-comment .sort-icon").removeClass("ri-arrow-up-line ri-arrow-down-line").addClass("ri-arrow-up-down-line");
        const activeIcon = $(`.sortable-comment[data-sort="${sortCommentColumn}"] .sort-icon`);
        activeIcon.removeClass("ri-arrow-up-down-line");
        if (sortCommentDirection === "asc") {
            activeIcon.addClass("ri-arrow-up-line");
        } else {
            activeIcon.addClass("ri-arrow-down-line");
        }
    }

    // Event handlers
    $("#searchComment").on("input", applyCommentFilters);
    $("#filterCommentSticker").on("change", applyCommentFilters);
    $("#resetCommentFilters").on("click", function() {
        $("#searchComment").val("");
        $("#filterCommentSticker").val("");
        applyCommentFilters();
    });

    $(document).on("click", ".sortable-comment", function() {
        const column = $(this).data("sort");
        sortComments(column);
    });

    $(document).on("click", "#paginationComment .page-link", function() {
        const page = $(this).data("page");
        if (!page || page < 1) return;
        currentCommentPage = page;
        renderCommentTable(getPagedCommentData());
        renderCommentPagination();
    });

    $("#perPageComment").on("change", function() {
        perPageComment = parseInt($(this).val());
        currentCommentPage = 1;
        renderCommentTable(getPagedCommentData());
        renderCommentPagination();
    });

    $(document).on('click', '.replyComment', async function() {
        const id = String($(this).data('id'));
        const current = allComments.find((item) => item.id === id)?.data || {};
        const selectedSticker = ADMIN_STICKERS.includes(current.replySticker) ? current.replySticker : '';
        const commentPreview = String(current.comment || '').slice(0, 180);
        const stickerTiles = ADMIN_STICKERS.map((sticker, index) => `
            <button
                type="button"
                class="admin-reply-sticker${selectedSticker === sticker ? ' is-selected' : ''}"
                data-sticker="${sticker}"
                aria-label="Pilih sticker ${index + 1}"
                aria-pressed="${selectedSticker === sticker}"
            >
                <img src="../assets/images/sticker/${sticker}" alt="Sticker ${index + 1}" loading="lazy" decoding="async">
                <span>${index + 1}</span>
            </button>
        `).join('');

        const result = await Swal.fire({
            title: current.replyText || selectedSticker ? 'Edit Balasan' : 'Balas Komentar',
            html: `
                <div class="admin-reply-form">
                    <div class="admin-reply-context">
                        <span class="admin-reply-context__label"><i class="ri-chat-quote-line" aria-hidden="true"></i> Membalas komentar</span>
                        <strong>${escapeHtml(current.name || 'Tamu')}</strong>
                        <p>${escapeHtml(commentPreview || 'Tanpa isi komentar')}</p>
                    </div>

                    <label class="admin-reply-label" for="adminReplyText">
                        <span>Balasan admin</span>
                        <small id="adminReplyCount">0/2000</small>
                    </label>
                    <textarea id="adminReplyText" class="form-control admin-reply-textarea" maxlength="2000" rows="5" placeholder="Tulis balasan untuk tamu…"></textarea>

                    <fieldset class="admin-reply-stickers">
                        <legend><i class="ri-emotion-happy-line" aria-hidden="true"></i> Pilih sticker <small>(opsional)</small></legend>
                        <input id="adminReplySticker" type="hidden" value="${selectedSticker}">
                        <div class="admin-reply-sticker-grid" role="group" aria-label="Pilihan sticker balasan">
                            <button
                                type="button"
                                class="admin-reply-sticker admin-reply-sticker--none${selectedSticker ? '' : ' is-selected'}"
                                data-sticker=""
                                aria-label="Tanpa sticker"
                                aria-pressed="${!selectedSticker}"
                            >
                                <i class="ri-forbid-2-line" aria-hidden="true"></i>
                                <span>Tanpa</span>
                            </button>
                            ${stickerTiles}
                        </div>
                    </fieldset>
                </div>
            `,
            customClass: {
                popup: 'admin-reply-popup',
                htmlContainer: 'admin-reply-html',
                confirmButton: 'admin-reply-confirm',
                cancelButton: 'admin-reply-cancel',
            },
            showCancelButton: true,
            buttonsStyling: false,
            confirmButtonText: '<i class="ri-send-plane-2-line" aria-hidden="true"></i> Simpan balasan',
            cancelButtonText: 'Batal',
            focusConfirm: false,
            didOpen: () => {
                const root = Swal.getHtmlContainer();
                const textarea = root.querySelector('#adminReplyText');
                const stickerInput = root.querySelector('#adminReplySticker');
                const counter = root.querySelector('#adminReplyCount');
                textarea.value = String(current.replyText || '');

                const updateCounter = () => {
                    counter.textContent = `${textarea.value.length}/2000`;
                };
                const selectSticker = (button) => {
                    stickerInput.value = button.dataset.sticker || '';
                    root.querySelectorAll('.admin-reply-sticker').forEach((tile) => {
                        const active = tile === button;
                        tile.classList.toggle('is-selected', active);
                        tile.setAttribute('aria-pressed', String(active));
                    });
                };

                updateCounter();
                textarea.addEventListener('input', updateCounter);
                root.querySelector('.admin-reply-sticker-grid').addEventListener('click', (event) => {
                    const button = event.target.closest('.admin-reply-sticker');
                    if (button) selectSticker(button);
                });
                textarea.focus();
            },
            preConfirm: () => {
                const root = Swal.getHtmlContainer();
                const replyText = root.querySelector('#adminReplyText').value.trim();
                const replySticker = root.querySelector('#adminReplySticker').value;
                if (!replyText && !replySticker) {
                    Swal.showValidationMessage('Isi teks balasan atau pilih minimal satu sticker.');
                    return false;
                }
                return { replyText, replySticker };
            },
        });
        if (!result.isConfirmed) return;

        try {
            await updateDoc(doc(window.db, 'comments', id), {
                replyText: result.value.replyText,
                replySticker: result.value.replySticker,
                replyUpdatedAt: serverTimestamp(),
            });
            await loadCommentList();
            Swal.fire({
                icon: 'success',
                title: 'Balasan tersimpan',
                text: 'Balasan admin berhasil diperbarui.',
                timer: 1600,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error('Gagal menyimpan balasan:', err);
            Swal.fire('Gagal', 'Balasan tidak dapat disimpan.', 'error');
        }
    });

    $(document).on('click', '.deleteComment', async function() {
        const id = String($(this).data('id'));
        const result = await Swal.fire({
            title: 'Hapus komentar?',
            text: 'Komentar, balasan, dan reaksinya akan dihapus.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Hapus',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc3545',
        });
        if (!result.isConfirmed) return;

        try {
            const [commentReactions, replyReactions] = await Promise.all([
                getDocs(collection(window.db, 'comments', id, 'reactions')),
                getDocs(collection(window.db, 'comments', id, 'replyReactions')),
            ]);
            await Promise.all([
                ...commentReactions.docs.map((reaction) => deleteDoc(reaction.ref)),
                ...replyReactions.docs.map((reaction) => deleteDoc(reaction.ref)),
            ]);
            await deleteDoc(doc(window.db, 'comments', id));
            await loadCommentList();
            Swal.fire('Dihapus', 'Komentar berhasil dihapus.', 'success');
        } catch (err) {
            console.error('Gagal menghapus komentar:', err);
            Swal.fire('Gagal', 'Komentar tidak dapat dihapus.', 'error');
        }
    });

    $(document).on("click", ".toggleCommentDetail", function() {
        const id = $(this).data("id");
        const detailRow = $(`#comment-detail-${id}`);
        const icon = $(this).find("i");

        if (detailRow.is(":visible")) {
            detailRow.slideUp(200);
            icon.removeClass("ri-arrow-up-s-line").addClass("ri-arrow-down-s-line");
        } else {
            detailRow.slideDown(200);
            icon.removeClass("ri-arrow-down-s-line").addClass("ri-arrow-up-s-line");
        }
    });


    // ==============================
    // EDITOR KONTEN WEBSITE (per section)
    // ==============================
    // Menyimpan seluruh teks undangan ke settings/siteContent. Halaman publik
    // membaca dokumen itu dan menerapkannya ke elemen ber-atribut data-content.
    // Field kosong berarti "pakai teks bawaan index.html".
    const CONTENT_FIELD_BY_KEY = new Map(CONTENT_FIELDS.map((field) => [field.key, field]));
    let savedSiteContent = {};
    let siteContentLoaded = false;
    let siteContentLoading = false;

    function setContentStatus(message, state = 'ready') {
        $('#contentEditorStatus').text(message);
        document.getElementById('contentEditorToolbar')?.setAttribute('data-state', state);
    }

    /** Satu baris nama pada editor daftar: handle geser, input, dan tombol. */
    function buildListRow(text = '') {
        const row = document.createElement('div');
        row.className = 'content-list-row';
        row.draggable = true;

        const handle = document.createElement('span');
        handle.className = 'content-list-row__handle';
        handle.title = 'Tarik untuk memindahkan';
        handle.innerHTML = '<i class="ri-draggable" aria-hidden="true"></i>';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control content-list-row__input';
        input.maxLength = 200;
        input.placeholder = 'Contoh: - Hj. Wawan';
        input.value = text;

        const tools = document.createElement('div');
        tools.className = 'content-list-row__tools';
        tools.innerHTML = `
            <button type="button" class="btn btn-sm btn-outline-secondary" data-list-move="up" title="Naikkan" aria-label="Naikkan nama">
                <i class="ri-arrow-up-s-line" aria-hidden="true"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-list-move="down" title="Turunkan" aria-label="Turunkan nama">
                <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-list-remove title="Hapus" aria-label="Hapus nama">
                <i class="ri-close-line" aria-hidden="true"></i>
            </button>
        `;

        row.append(handle, input, tools);
        return row;
    }

    /** Salin urutan baris ke textarea tersembunyi yang dibaca saat menyimpan. */
    function syncListEditor(editor) {
        if (!editor) return;

        const store = editor.querySelector('.content-list-editor__value');
        const rows = [...editor.querySelectorAll('.content-list-row__input')];
        const names = rows.map((input) => input.value.trim()).filter(Boolean);

        if (store) store.value = names.join('\n');
        const counter = editor.querySelector('.content-list-editor__count');
        if (counter) counter.textContent = `${names.length} nama`;

        const empty = editor.querySelector('.content-list-editor__empty');
        if (empty) empty.hidden = rows.length > 0;
    }

    function buildListEditor(field) {
        const editor = document.createElement('div');
        editor.className = 'content-list-editor';

        const store = document.createElement('textarea');
        store.className = 'content-list-editor__value';
        store.dataset.contentKey = field.key;
        store.hidden = true;
        store.value = savedSiteContent[field.key] ?? '';
        editor.appendChild(store);

        const rows = document.createElement('div');
        rows.className = 'content-list-editor__rows';
        String(store.value)
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => rows.appendChild(buildListRow(line)));
        editor.appendChild(rows);

        const empty = document.createElement('p');
        empty.className = 'content-list-editor__empty';
        empty.textContent = 'Belum ada nama. Tambahkan minimal satu nama supaya section ini tampil.';
        editor.appendChild(empty);

        const footer = document.createElement('div');
        footer.className = 'content-list-editor__footer';
        footer.innerHTML = `
            <button type="button" class="btn btn-sm btn-outline-primary" data-list-add>
                <i class="ri-add-line" aria-hidden="true"></i> Tambah Nama
            </button>
            <span class="content-list-editor__count">0 nama</span>
        `;
        editor.appendChild(footer);

        syncListEditor(editor);
        return editor;
    }

    function buildContentField(field) {
        const wrapper = document.createElement('div');
        wrapper.className = 'content-field';
        if (field.type === 'textarea') wrapper.classList.add('content-field--wide');

        const inputId = `content-input-${field.key}`;

        const label = document.createElement('label');
        label.className = 'content-field__label';
        label.setAttribute('for', inputId);
        label.textContent = field.label;
        wrapper.appendChild(label);

        let control;

        if (field.type === 'toggle') {
            // Ditangani buildToggleGroup; label sudah menempel pada switch.
            label.remove();
            control = document.createElement('div');
        } else if (field.editor === 'sortable-list') {
            control = buildListEditor(field);
            label.removeAttribute('for');
        } else if (field.type === 'date' || field.type === 'time') {
            control = document.createElement('input');
            control.type = field.type;
            control.id = inputId;
            control.className = 'form-control content-field__input';
            control.dataset.contentKey = field.key;
            control.value = savedSiteContent[field.key] ?? field.fallback ?? '';
        } else if (field.type === 'select') {
            control = document.createElement('select');
            control.className = 'form-select content-field__input';
            (field.options || []).forEach((option) => {
                const item = document.createElement('option');
                item.value = option.value;
                item.textContent = option.label;
                control.appendChild(item);
            });
            control.id = inputId;
            control.dataset.contentKey = field.key;
            control.value = savedSiteContent[field.key] ?? field.fallback ?? '';
        } else {
            control = field.type === 'textarea'
                ? document.createElement('textarea')
                : document.createElement('input');

            if (field.type === 'textarea') {
                control.rows = field.rows || 3;
            } else {
                control.type = field.type === 'url' ? 'url' : 'text';
            }

            control.id = inputId;
            control.className = 'form-control content-field__input';
            control.dataset.contentKey = field.key;
            control.maxLength = CONTENT_MAX_LENGTH;
            control.placeholder = field.fallback ?? '';
            control.value = savedSiteContent[field.key] ?? '';
        }

        wrapper.appendChild(control);

        const hint = document.createElement('div');
        hint.className = 'form-text content-field__hint';
        hint.textContent = field.hint
            || (field.target === 'placeholder' ? 'Teks placeholder pada kolom formulir.' : '')
            || (field.target === 'href' ? 'Harus berupa URL lengkap, contoh https://…' : '')
            || 'Kosongkan untuk memakai teks bawaan.';
        wrapper.appendChild(hint);

        return wrapper;
    }

    /**
     * Kotak grup dengan satu switch di atas. Field yang dikendalikan hanya
     * tampil saat switch aktif, jadi form tidak penuh oleh isian yang
     * sedang tidak dipakai.
     */
    function buildToggleGroup(field, fieldByKey) {
        const wrapper = document.createElement('div');
        wrapper.className = 'content-field content-field--wide content-toggle-group';

        const head = document.createElement('div');
        head.className = 'content-toggle-group__head';

        const inputId = `content-input-${field.key}`;
        const switchWrap = document.createElement('div');
        switchWrap.className = 'form-check form-switch content-toggle-group__switch';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'form-check-input';
        input.setAttribute('role', 'switch');
        input.id = inputId;
        input.dataset.contentKey = field.key;
        input.checked = (savedSiteContent[field.key] ?? field.fallback ?? 'hide') === 'show';

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.setAttribute('for', inputId);
        label.textContent = field.label;

        switchWrap.append(input, label);
        head.appendChild(switchWrap);

        if (field.hint) {
            const hint = document.createElement('p');
            hint.className = 'content-toggle-group__hint';
            hint.textContent = field.hint;
            head.appendChild(hint);
        }

        wrapper.appendChild(head);

        const body = document.createElement('div');
        body.className = 'content-toggle-group__body';

        const grid = document.createElement('div');
        grid.className = 'content-section__grid';
        (field.controls || []).forEach((key) => {
            const child = fieldByKey.get(key);
            if (child) grid.appendChild(buildContentField(child));
        });

        body.appendChild(grid);
        wrapper.appendChild(body);

        const syncGroup = () => {
            body.hidden = !input.checked;
            wrapper.classList.toggle('is-off', !input.checked);
        };

        input.addEventListener('change', syncGroup);
        syncGroup();

        return wrapper;
    }

    function buildContentSection(section) {
        const details = document.createElement('details');
        details.className = 'content-section';
        details.dataset.sectionId = section.id;

        const summary = document.createElement('summary');
        summary.className = 'content-section__summary';

        const icon = document.createElement('i');
        icon.className = section.icon || 'ri-file-text-line';
        icon.setAttribute('aria-hidden', 'true');

        const heading = document.createElement('div');
        heading.className = 'content-section__heading';
        const title = document.createElement('strong');
        title.textContent = section.label;
        const description = document.createElement('span');
        description.textContent = section.description || '';
        heading.append(title, description);

        const badge = document.createElement('span');
        badge.className = 'content-section__badge';
        badge.textContent = `${section.fields.length} teks`;

        // Indikator buka/tutup; arah ikon diputar lewat CSS saat [open].
        const chevron = document.createElement('i');
        chevron.className = 'ri-arrow-down-s-line content-section__chevron';
        chevron.setAttribute('aria-hidden', 'true');

        summary.append(icon, heading, badge, chevron);
        details.appendChild(summary);

        const body = document.createElement('div');
        body.className = 'content-section__body';

        const grid = document.createElement('div');
        grid.className = 'content-section__grid';

        // Field yang dikendalikan sebuah toggle dipindah ke dalam kotak grup,
        // bukan ikut tampil di daftar utama.
        const fieldByKey = new Map(section.fields.map((field) => [field.key, field]));
        const controlledKeys = new Set(
            section.fields.flatMap((field) => field.controls || [])
        );

        section.fields.forEach((field) => {
            if (controlledKeys.has(field.key)) return;

            grid.appendChild(
                field.controls?.length
                    ? buildToggleGroup(field, fieldByKey)
                    : buildContentField(field)
            );
        });

        body.appendChild(grid);

        // Section tertentu punya foto; editor fotonya menyimpan sendiri
        // karena datanya terpisah dari teks.
        const mediaGroup = buildSectionMediaGroup(section.id);
        if (mediaGroup) body.appendChild(mediaGroup);

        const actions = document.createElement('div');
        actions.className = 'content-section__actions';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn btn-sm btn-outline-secondary content-section__reset';
        resetBtn.innerHTML = '<i class="ri-eraser-line"></i> Kembalikan ke Default';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-sm btn-primary content-section__save';
        saveBtn.innerHTML = '<i class="ri-save-3-line"></i> Simpan Section';

        actions.append(resetBtn, saveBtn);
        body.appendChild(actions);
        details.appendChild(body);

        return details;
    }

    function renderContentEditor() {
        const container = document.getElementById('contentEditorAccordion');
        if (!container) return;

        container.replaceChildren();
        CONTENT_SECTIONS.forEach((section) => {
            container.appendChild(buildContentSection(section));
        });
        syncListEditorColumns(container);
    }

    /** Gabungkan konten tersimpan dengan nilai input pada scope tertentu. */
    function mergeContentFrom(scope) {
        const next = { ...savedSiteContent };

        scope.querySelectorAll('[data-content-key]').forEach((control) => {
            const key = control.dataset.contentKey;
            const field = CONTENT_FIELD_BY_KEY.get(key);
            if (!field) return;

            // Toggle disimpan sebagai 'show' / 'hide', bukan nilai checkbox.
            if (control.type === 'checkbox') {
                next[key] = control.checked ? 'show' : 'hide';
                return;
            }

            const value = String(control.value ?? '').trim();
            if (!value) {
                delete next[key];
                return;
            }

            next[key] = value.slice(0, CONTENT_MAX_LENGTH);
        });

        return next;
    }

    /** Kembalikan pesan error pertama, atau null bila semua field valid. */
    function findContentError(scope) {
        let message = null;

        scope.querySelectorAll('[data-content-key]').forEach((control) => {
            if (message) return;

            if (control.type === 'checkbox') return;

            const field = CONTENT_FIELD_BY_KEY.get(control.dataset.contentKey);
            const value = String(control.value ?? '').trim();
            if (!field || !value) return;

            if (field.target === 'href' && !isSafeUrl(value)) {
                message = `"${field.label}" harus berupa URL yang valid (http/https).`;
            } else if (value.length > CONTENT_MAX_LENGTH) {
                message = `"${field.label}" melebihi ${CONTENT_MAX_LENGTH} karakter.`;
            }
        });

        return message;
    }

    function syncContentInputs() {
        document.querySelectorAll('#contentEditorAccordion [data-content-key]').forEach((control) => {
            const field = CONTENT_FIELD_BY_KEY.get(control.dataset.contentKey);
            const saved = savedSiteContent[control.dataset.contentKey];

            if (control.type === 'checkbox') {
                control.checked = (saved ?? field?.fallback ?? 'hide') === 'show';
                // Beri tahu grup agar isian ikut ditampilkan atau disembunyikan.
                control.dispatchEvent(new Event('change'));
                return;
            }

            control.value = saved ?? (field?.type === 'select' ? field.fallback ?? '' : '');
        });

        // Editor daftar dibangun ulang agar barisnya cocok dengan data tersimpan.
        document.querySelectorAll('#contentEditorAccordion .content-list-editor').forEach((editor) => {
            const store = editor.querySelector('.content-list-editor__value');
            const rows = editor.querySelector('.content-list-editor__rows');
            if (!store || !rows) return;

            rows.replaceChildren();
            String(store.value)
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
                .forEach((line) => rows.appendChild(buildListRow(line)));

            syncListEditor(editor);
        });

        syncListEditorColumns(document.getElementById('contentEditorAccordion'));
    }

    // ---- Editor daftar: tambah, hapus, geser, dan drag-and-drop ----
    let draggedListRow = null;

    $(document).on('input', '.content-list-row__input', function () {
        syncListEditor(this.closest('.content-list-editor'));
    });

    $(document).on('click', '[data-list-add]', function () {
        const editor = this.closest('.content-list-editor');
        const rows = editor?.querySelector('.content-list-editor__rows');
        if (!rows) return;

        const row = buildListRow('');
        rows.appendChild(row);
        row.querySelector('.content-list-row__input')?.focus();
        syncListEditor(editor);
    });

    $(document).on('click', '[data-list-remove]', function () {
        const row = this.closest('.content-list-row');
        const editor = this.closest('.content-list-editor');
        row?.remove();
        syncListEditor(editor);
    });

    $(document).on('click', '[data-list-move]', function () {
        const row = this.closest('.content-list-row');
        const editor = this.closest('.content-list-editor');
        if (!row) return;

        if (this.dataset.listMove === 'up') {
            row.previousElementSibling?.before(row);
        } else {
            row.nextElementSibling?.after(row);
        }

        syncListEditor(editor);
    });

    $(document).on('dragstart', '.content-list-row', function (e) {
        draggedListRow = this;
        this.classList.add('is-dragging');
        const transfer = e.originalEvent?.dataTransfer;
        if (transfer) {
            transfer.effectAllowed = 'move';
            transfer.setData('text/plain', '');
        }
    });

    $(document).on('dragend', '.content-list-row', function () {
        this.classList.remove('is-dragging');
        draggedListRow = null;
        syncListEditor(this.closest('.content-list-editor'));
    });

    $(document).on('dragover', '.content-list-editor__rows', function (e) {
        if (!draggedListRow || draggedListRow.parentElement !== this) return;
        e.preventDefault();

        const pointerX = e.originalEvent?.clientX ?? 0;
        const pointerY = e.originalEvent?.clientY ?? 0;

        // Perbandingan memakai dua sumbu supaya tetap akurat saat baris
        // tersusun dua kolom, bukan hanya menumpuk vertikal.
        const target = [...this.querySelectorAll('.content-list-row:not(.is-dragging)')]
            .find((row) => {
                const box = row.getBoundingClientRect();
                const beforeVertically = pointerY < box.top + box.height / 2;
                const beforeInSameRow = pointerY <= box.bottom && pointerX < box.left + box.width / 2;
                return beforeVertically || beforeInSameRow;
            }) || null;

        if (target !== draggedListRow) this.insertBefore(draggedListRow, target);
    });

    /** Susunan baris editor mengikuti pilihan jumlah kolom pada section. */
    function syncListEditorColumns(scope) {
        if (!scope) return;

        scope.querySelectorAll('.content-list-editor').forEach((editor) => {
            const section = editor.closest('.content-section') || scope;
            const select = section.querySelector('[data-content-key="inviterColumns"]');
            editor.dataset.columns = select?.value === '2' ? '2' : '1';
        });
    }

    $(document).on('change', '[data-content-key="inviterColumns"]', function () {
        syncListEditorColumns(this.closest('.content-section'));
    });

    $(document).on('drop', '.content-list-editor__rows', function (e) {
        e.preventDefault();
        syncListEditor(this.closest('.content-list-editor'));
    });

    function describeContentState() {
        const total = CONTENT_FIELDS.length;
        const custom = Object.keys(savedSiteContent).length;
        return custom
            ? `${custom} dari ${total} teks memakai versi kustom.`
            : `Semua ${total} teks masih memakai bawaan halaman undangan.`;
    }

    async function loadSiteContentEditor(force = false) {
        if (siteContentLoading) return;
        if (siteContentLoaded && !force) return;

        siteContentLoading = true;
        setContentStatus('Memuat konten…', 'loading');

        try {
            const snapshot = await getDoc(doc(window.db, CONTENT_COLLECTION, CONTENT_DOC_ID));
            savedSiteContent = snapshot.exists() ? sanitizeContent(snapshot.data()?.content) : {};
            siteContentLoaded = true;

            // Editor foto per section ikut dirender, jadi datanya harus siap.
            await loadSiteMediaDoc(force);

            renderContentEditor();
            setContentStatus(describeContentState());
        } catch (err) {
            console.error('Gagal memuat konten website:', err);
            renderContentEditor();
            setContentStatus('Konten tidak dapat dimuat. Coba Muat Ulang.', 'error');
        } finally {
            siteContentLoading = false;
        }
    }

    function describeContentError(err) {
        const code = String(err?.code || '');
        if (code.includes('permission-denied')) {
            return 'Akses ditolak Firestore. Pastikan Anda login sebagai admin@soyaarief.site dan rules terbaru sudah dideploy.';
        }
        if (code.includes('unauthenticated')) {
            return 'Token sesi admin kedaluwarsa dan percobaan ulang gagal. Muat ulang halaman lalu simpan lagi.';
        }
        if (code.includes('unavailable') || code.includes('network')) {
            return 'Koneksi ke Firebase sedang bermasalah. Periksa internet lalu coba lagi.';
        }
        return 'Konten tidak dapat disimpan. Coba lagi.';
    }

    async function saveSiteContent(nextContent, trigger, successText) {
        const originalLabel = trigger?.innerHTML;
        if (trigger) {
            trigger.disabled = true;
            trigger.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Menyimpan…';
        }
        setContentStatus('Menyimpan konten ke Firestore…', 'saving');

        try {
            const payload = sanitizeContent(nextContent);
            await runAdminWrite(() => setDoc(doc(window.db, CONTENT_COLLECTION, CONTENT_DOC_ID), {
                content: payload,
                updatedAt: serverTimestamp(),
            }));

            savedSiteContent = payload;
            syncContentInputs();
            setContentStatus(describeContentState());

            Swal.fire({
                icon: 'success',
                title: 'Konten tersimpan',
                text: successText,
                timer: 1700,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error('Gagal menyimpan konten website:', err);
            setContentStatus('Konten gagal disimpan.', 'error');
            Swal.fire({
                icon: 'error',
                title: 'Gagal menyimpan',
                text: describeContentError(err),
                confirmButtonText: 'Mengerti',
            });
        } finally {
            if (trigger) {
                trigger.disabled = false;
                trigger.innerHTML = originalLabel;
            }
        }
    }

    $(document).on('click', '.content-section__save', async function () {
        const section = this.closest('.content-section');
        if (!section) return;

        const error = findContentError(section);
        if (error) {
            Swal.fire({ icon: 'warning', title: 'Periksa isian', text: error });
            return;
        }

        const label = section.querySelector('.content-section__heading strong')?.textContent || 'Section';
        await saveSiteContent(mergeContentFrom(section), this, `Section ${label} berhasil diperbarui.`);
    });

    $(document).on('click', '#contentSaveAllBtn', async function () {
        const container = document.getElementById('contentEditorAccordion');
        if (!container) return;

        const error = findContentError(container);
        if (error) {
            Swal.fire({ icon: 'warning', title: 'Periksa isian', text: error });
            return;
        }

        await saveSiteContent(mergeContentFrom(container), this, 'Semua section berhasil diperbarui.');
    });

    $(document).on('click', '.content-section__reset', async function () {
        const section = this.closest('.content-section');
        if (!section) return;

        const label = section.querySelector('.content-section__heading strong')?.textContent || 'section ini';
        const confirmed = await Swal.fire({
            title: 'Kembalikan ke default?',
            text: `Semua teks pada ${label} akan mengikuti teks bawaan undangan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Kembalikan',
            cancelButtonText: 'Batal',
        });
        if (!confirmed.isConfirmed) return;

        section.querySelectorAll('[data-content-key]').forEach((control) => { control.value = ''; });
        await saveSiteContent(mergeContentFrom(section), this, `${label} kembali memakai teks bawaan.`);
    });

    $(document).on('click', '#contentReloadBtn', function () {
        loadSiteContentEditor(true);
    });

    // Tautan pratinjau mengikuti domain publik yang dipakai link tamu.
    $('#contentPreviewLink, #galleryPreviewLink').attr('href', url_domain);


    // ==============================
    // FOTO WEBSITE (slot + galeri)
    // ==============================
    // Berkas gambar disimpan di Firebase Storage, sedangkan komposisinya
    // (zoom, posisi, rotasi) dan urutan galeri disimpan di settings/siteMedia.
    let savedSiteMedia = { slots: {}, gallery: [] };
    let siteMediaLoaded = false;

    /**
     * Foto dikompres di browser menjadi WebP, lalu diunggah ke Cloudinary.
     * Ukuran maksimalnya mengikuti kotak tempat foto itu tampil.
     */
    async function uploadMediaFile(file, slot) {
        const blob = await compressImage(file, slot.maxEdge);
        return uploadToCloudinary(blob, slot.folder);
    }

    async function saveSiteMediaDoc() {
        const payload = sanitizeMedia(savedSiteMedia);

        await runAdminWrite(() => setDoc(doc(window.db, MEDIA_COLLECTION, MEDIA_DOC_ID), {
            slots: payload.slots,
            gallery: payload.gallery,
            updatedAt: serverTimestamp(),
        }));

        savedSiteMedia = payload;
    }

    async function loadSiteMediaDoc(force = false) {
        if (siteMediaLoaded && !force) return savedSiteMedia;

        try {
            const snapshot = await getDoc(doc(window.db, MEDIA_COLLECTION, MEDIA_DOC_ID));
            savedSiteMedia = snapshot.exists() ? sanitizeMedia(snapshot.data()) : { slots: {}, gallery: [] };
            siteMediaLoaded = true;
        } catch (err) {
            console.error('Gagal memuat foto website:', err);
            savedSiteMedia = { slots: {}, gallery: [] };
        }

        return savedSiteMedia;
    }

    let activeSlotModalEditor = null;

    /** Perbarui thumbnail kartu slot dari data tersimpan. */
    function refreshSlotPreview(card, slot) {
        const item = savedSiteMedia.slots[slot.key];
        const image = card.querySelector('.media-slot__thumb img');
        const empty = card.querySelector('.media-slot__thumb-empty');
        // Selektor harus khusus tombolnya. Sebelumnya [data-slot-edit] juga
        // cocok dengan thumbnail, sehingga labelnya tertulis ke dalam foto.
        const editBtn = card.querySelector('.media-slot__edit');

        if (item?.url) {
            image.src = cloudinaryUrl(item.url, DELIVERY.adminThumb);
            applyMediaTransform(image, item);
            image.hidden = false;
            empty.hidden = true;
            editBtn.innerHTML = '<i class="ri-crop-line"></i> Atur / Ganti Foto';
        } else {
            image.hidden = true;
            empty.hidden = false;
            editBtn.innerHTML = '<i class="ri-upload-2-line"></i> Unggah Foto';
        }
    }

    function openSlotModal(slot, card) {
        const modalEl = document.getElementById('mediaEditorModal');
        const body = document.getElementById('mediaEditorModalBody');
        const titleEl = document.getElementById('mediaEditorModalTitle');
        if (!modalEl || !body) return;

        titleEl.textContent = slot.label;
        body.replaceChildren();

        activeSlotModalEditor = createMediaEditor({
            slot,
            item: savedSiteMedia.slots[slot.key] ?? null,
            onUpload: async (file, transform) => {
                const uploaded = await uploadMediaFile(file, slot);
                const item = { ...uploaded, ...sanitizeTransform(transform ?? DEFAULT_TRANSFORM) };
                savedSiteMedia.slots[slot.key] = item;
                await saveSiteMediaDoc();
                refreshSlotPreview(card, slot);
                return savedSiteMedia.slots[slot.key];
            },
            onSave: async (transform) => {
                const item = savedSiteMedia.slots[slot.key];
                if (!item) throw new Error('Unggah foto terlebih dahulu.');
                savedSiteMedia.slots[slot.key] = { ...item, ...sanitizeTransform(transform) };
                await saveSiteMediaDoc();
                refreshSlotPreview(card, slot);
            },
            onRemove: async () => {
                delete savedSiteMedia.slots[slot.key];
                await saveSiteMediaDoc();
                refreshSlotPreview(card, slot);
            },
        });

        body.appendChild(activeSlotModalEditor.element);
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    function buildMediaSlotEditor(slot) {
        const card = document.createElement('div');
        card.className = 'media-slot';

        const heading = document.createElement('div');
        heading.className = 'media-slot__heading';
        const title = document.createElement('strong');
        title.textContent = slot.label;
        const hint = document.createElement('span');
        hint.textContent = slot.hint || '';
        heading.append(title, hint);

        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'media-slot__thumb';
        thumb.style.aspectRatio = slot.aspect;
        thumb.style.borderRadius = slot.radius;
        thumb.setAttribute('data-slot-edit', '');
        thumb.title = 'Atur foto';

        const image = document.createElement('img');
        image.alt = '';
        image.hidden = true;
        const empty = document.createElement('span');
        empty.className = 'media-slot__thumb-empty';
        empty.textContent = 'Belum ada';
        thumb.append(image, empty);

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-sm btn-outline-primary media-slot__edit';
        editBtn.setAttribute('data-slot-edit', '');

        // Thumbnail kecil di kiri, keterangan dan tombol di kanan, supaya
        // section teks tidak terdorong oleh kotak foto yang besar.
        const body = document.createElement('div');
        body.className = 'media-slot__body';
        body.append(heading, editBtn);

        card.append(thumb, body);

        [thumb, editBtn].forEach((el) => {
            el.addEventListener('click', () => openSlotModal(slot, card));
        });

        refreshSlotPreview(card, slot);
        return card;
    }

    function buildSectionMediaGroup(sectionId) {
        const slots = MEDIA_SLOTS.filter((slot) => slot.sectionId === sectionId);
        if (!slots.length) return null;

        const group = document.createElement('div');
        group.className = 'media-slot-group';

        const label = document.createElement('h3');
        label.className = 'media-slot-group__title';
        label.innerHTML = '<i class="ri-image-line" aria-hidden="true"></i> Foto section ini';
        group.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'media-slot-group__grid';
        slots.forEach((slot) => grid.appendChild(buildMediaSlotEditor(slot)));
        group.appendChild(grid);

        return group;
    }


    // ---- Galeri foto ----
    function setGalleryStatus(message, state = 'ready') {
        $('#galleryStatus').text(message);
        document.getElementById('galleryToolbar')?.setAttribute('data-state', state);
    }

    function describeGalleryState() {
        const total = savedSiteMedia.gallery.length;
        return total
            ? `${total} dari ${MEDIA_GALLERY_MAX} foto terpakai.`
            : `Belum ada foto kustom. Undangan memakai galeri bawaan.`;
    }

    function findGalleryIndex(publicId) {
        return savedSiteMedia.gallery.findIndex((item) => item.publicId === publicId);
    }

    function buildGalleryCard(item, index) {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.draggable = true;
        card.dataset.publicId = item.publicId;

        const head = document.createElement('div');
        head.className = 'media-card__head';
        head.innerHTML = `
            <span class="media-card__handle" title="Tarik untuk mengubah urutan">
                <i class="ri-draggable" aria-hidden="true"></i>
            </span>
            <strong>Foto ${index + 1}</strong>
        `;
        card.appendChild(head);

        const editor = createMediaEditor({
            slot: GALLERY_SLOT,
            item,
            compact: true,
            previewTransform: DELIVERY.adminThumb,
            onUpload: async (file, transform) => {
                const position = findGalleryIndex(card.dataset.publicId);
                if (position < 0) throw new Error('Foto ini sudah tidak ada di daftar.');

                const uploaded = await uploadMediaFile(file, GALLERY_SLOT);
                const next = { ...uploaded, ...sanitizeTransform(transform ?? DEFAULT_TRANSFORM) };

                savedSiteMedia.gallery[position] = next;
                await saveSiteMediaDoc();

                card.dataset.publicId = next.publicId;
                setGalleryStatus(describeGalleryState());
                return next;
            },
            onSave: async (transform) => {
                const position = findGalleryIndex(card.dataset.publicId);
                if (position < 0) throw new Error('Foto ini sudah tidak ada di daftar.');

                savedSiteMedia.gallery[position] = {
                    ...savedSiteMedia.gallery[position],
                    ...sanitizeTransform(transform),
                };
                await saveSiteMediaDoc();
            },
            onRemove: async () => {
                const position = findGalleryIndex(card.dataset.publicId);
                if (position < 0) throw new Error('Foto ini sudah tidak ada di daftar.');

                savedSiteMedia.gallery.splice(position, 1);
                await saveSiteMediaDoc();

                renderGalleryEditor();
                setGalleryStatus(describeGalleryState());
            },
        });

        card.appendChild(editor.element);
        return card;
    }

    function renderGalleryEditor() {
        const grid = document.getElementById('galleryGrid');
        if (!grid) return;

        grid.replaceChildren();

        if (!savedSiteMedia.gallery.length) {
            const empty = document.createElement('p');
            empty.className = 'media-grid__empty';
            empty.textContent = 'Belum ada foto. Tekan "Tambah Foto" untuk mengunggah.';
            grid.appendChild(empty);
        } else {
            savedSiteMedia.gallery.forEach((item, index) => {
                grid.appendChild(buildGalleryCard(item, index));
            });
        }

        const addButton = document.getElementById('galleryAddBtn');
        if (addButton) addButton.disabled = savedSiteMedia.gallery.length >= MEDIA_GALLERY_MAX;
    }

    async function loadGalleryEditor(force = false) {
        setGalleryStatus('Memuat galeri…', 'loading');
        await loadSiteMediaDoc(force);
        renderGalleryEditor();

        if (!isCloudinaryConfigured()) {
            setGalleryStatus(
                'Cloudinary belum dikonfigurasi. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET.',
                'error'
            );
            return;
        }

        setGalleryStatus(describeGalleryState());
    }

    $(document).on('click', '#galleryAddBtn', function () {
        document.getElementById('galleryFileInput')?.click();
    });

    $(document).on('change', '#galleryFileInput', async function () {
        const files = [...(this.files || [])];
        this.value = '';
        if (!files.length) return;

        const room = MEDIA_GALLERY_MAX - savedSiteMedia.gallery.length;
        if (room <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Galeri penuh',
                text: `Maksimal ${MEDIA_GALLERY_MAX} foto. Hapus salah satu foto lebih dulu.`,
            });
            return;
        }

        const queue = files.slice(0, room);
        setGalleryStatus(`Mengunggah ${queue.length} foto…`, 'busy');

        let failed = 0;
        for (const file of queue) {
            try {
                const uploaded = await uploadMediaFile(file, GALLERY_SLOT);
                savedSiteMedia.gallery.push({ ...uploaded, ...DEFAULT_TRANSFORM });
                await saveSiteMediaDoc();
            } catch (err) {
                failed += 1;
                console.error('Gagal mengunggah foto galeri:', err);
            }
        }

        renderGalleryEditor();
        setGalleryStatus(describeGalleryState(), failed ? 'error' : 'ready');

        if (failed) {
            Swal.fire({
                icon: 'error',
                title: 'Sebagian foto gagal',
                text: `${failed} foto tidak dapat diunggah. Periksa format, ukuran, dan koneksi.`,
            });
        } else if (files.length > room) {
            Swal.fire({
                icon: 'info',
                title: 'Sebagian foto dilewati',
                text: `Hanya ${room} foto yang bisa ditambahkan karena batasnya ${MEDIA_GALLERY_MAX}.`,
            });
        }
    });

    $(document).on('click', '#galleryReloadBtn', function () {
        loadGalleryEditor(true);
    });

    // ---- Urutan galeri lewat drag-and-drop ----
    let draggedMediaCard = null;

    $(document).on('dragstart', '.media-card', function (e) {
        draggedMediaCard = this;
        this.classList.add('is-dragging');
        const transfer = e.originalEvent?.dataTransfer;
        if (transfer) {
            transfer.effectAllowed = 'move';
            transfer.setData('text/plain', '');
        }
    });

    $(document).on('dragover', '#galleryGrid', function (e) {
        if (!draggedMediaCard || draggedMediaCard.parentElement !== this) return;
        e.preventDefault();

        const pointerX = e.originalEvent?.clientX ?? 0;
        const pointerY = e.originalEvent?.clientY ?? 0;

        const target = [...this.querySelectorAll('.media-card:not(.is-dragging)')]
            .find((card) => {
                const box = card.getBoundingClientRect();
                return pointerY < box.top + box.height / 2
                    || (pointerY <= box.bottom && pointerX < box.left + box.width / 2);
            }) || null;

        if (target !== draggedMediaCard) this.insertBefore(draggedMediaCard, target);
    });

    $(document).on('dragend', '.media-card', async function () {
        this.classList.remove('is-dragging');
        draggedMediaCard = null;

        const grid = document.getElementById('galleryGrid');
        if (!grid) return;

        const order = [...grid.querySelectorAll('.media-card')].map((card) => card.dataset.publicId);
        const reordered = order
            .map((publicId) => savedSiteMedia.gallery.find((item) => item.publicId === publicId))
            .filter(Boolean);

        if (reordered.length !== savedSiteMedia.gallery.length) return;

        const unchanged = reordered.every((item, index) => item === savedSiteMedia.gallery[index]);
        if (unchanged) return;

        savedSiteMedia.gallery = reordered;
        setGalleryStatus('Menyimpan urutan foto…', 'busy');

        try {
            await saveSiteMediaDoc();
            renderGalleryEditor();
            setGalleryStatus(describeGalleryState());
        } catch (err) {
            console.error('Gagal menyimpan urutan galeri:', err);
            setGalleryStatus('Urutan foto gagal disimpan.', 'error');
        }
    });

    $(document).on('drop', '#galleryGrid', function (e) {
        e.preventDefault();
    });

});

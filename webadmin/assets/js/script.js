import {
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
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

$(document).ready(function () {

    // ==============================
    // ==============================
    // URL DOMAIN CONFIG
    // ==============================
    // ✅ Auto-detect current domain atau gunakan default
    let url_domain = window.location.origin + "/";
    
    // Fallback ke production domain jika localhost
    if (url_domain.includes("localhost") || url_domain.includes("127.0.0.1")) {
        url_domain = "https://alfirafauzi.site/";
    }
    
    console.log("🌐 URL Domain:", url_domain);

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
        $("#guestsSection, #rsvpSection, #commentsSection").hide();
        
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

    const ADMIN_KEY = "F4uziGant3n9";

    let allGuests = [];      // Semua data dari Firestore
    let filteredGuests = []; // Data setelah filter search
    let currentPage = 1;
    let perPage = 10;        // ✅ Changed to let untuk bisa diubah
    
    // ✅ Sort state
    let sortColumn = "createdAt"; // Default sort by created date
    let sortDirection = "desc";   // desc = newest first

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

            opened: false,
            openCount: 0,
            rsvpStatus: "",
            rsvpCount: 0,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),

            // ✅ HARUS ADA supaya lolos rules
            adminKey: ADMIN_KEY
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
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-secondary toggleDetail" data-id="${doc.id}" title="Lihat Detail">
                            <i class="ri-arrow-down-s-line"></i>
                        </button>
                    </td>
                    <td>
                        ${d.name || "-"}
                        ${d.isTableVip ? '<i class="ri-vip-fill text-primary ms-1" data-bs-toggle="tooltip" title="VIP Table"></i>' : ''}
                        ${d.isSouvenirVip ? '<i class="ri-vip-diamond-fill text-info ms-1" data-bs-toggle="tooltip" title="VIP Souvenir"></i>' : ''}
                    </td>
                    <td>${d.maxGuests || 0} Tamu</td>
                    <td>${d.phone || "-"}</td>
                    <td>${d.source || "-"}</td>
                    <td>
                        ${d.opened 
                            ? '<span class="badge bg-success"><i class="ri-check-line"></i> Sudah</span>' 
                            : '<span class="badge bg-secondary"><i class="ri-close-line"></i> Belum</span>'}
                    </td>
                    <td>
                        ${d.sendCount && d.sendCount > 0
                            ? '<span class="badge bg-success"><i class="ri-check-double-line"></i> Terkirim</span>' 
                            : '<span class="badge bg-secondary"><i class="ri-close-line"></i> Belum</span>'}
                    </td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            ${d.phone ? `
                                <button class="btn btn-sm btn-success sendWhatsAppDirect" 
                                        data-id="${doc.id}"
                                        data-name="${d.name || ''}"
                                        data-phone="${d.phone || ''}"
                                        title="Kirim WhatsApp">
                                    <i class="ri-whatsapp-line"></i>
                                </button>
                            ` : ''}
                            ${d.instagram ? `
                                <button class="btn btn-sm btn-danger sendInstagramDM" 
                                        data-id="${doc.id}"
                                        data-name="${d.name || ''}"
                                        data-instagram="${d.instagram || ''}"
                                        title="Buka Instagram">
                                    <i class="ri-instagram-line"></i>
                                </button>
                            ` : ''}
                        </div>
                        <button class="btn btn-sm btn-warning copyMessage" 
                                data-id="${doc.id}"
                                data-name="${d.name || ''}"
                                title="Copy Pesan">
                            <i class="ri-file-copy-2-line"></i>
                        </button>
                        <button class="btn btn-sm btn-primary copyLink" data-id="${doc.id}" title="Copy Link">
                            <i class="ri-link"></i>
                        </button>
                        <button class="btn btn-sm btn-info editGuest" 
                                data-id="${doc.id}"
                                data-name="${d.name || ''}"
                                data-maxguests="${d.maxGuests || 1}"
                                data-phone="${d.phone || ''}"
                                data-instagram="${d.instagram || ''}"
                                data-source="${d.source || ''}"
                                data-sourcename="${d.sourceName || ''}"
                                data-istablevip="${d.isTableVip || false}"
                                data-issouvenivip="${d.isSouvenirVip || false}">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn btn-sm btn-danger deleteGuest" data-id="${doc.id}">
                            <i class="ri-delete-bin-line"></i>
                        </button>
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
                    updatedAt: serverTimestamp(),
                    adminKey: ADMIN_KEY
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
            
            updatedAt: serverTimestamp(),
            adminKey: ADMIN_KEY
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
                adminKey: ADMIN_KEY,  // ✅ Tambahkan adminKey untuk lolos rules
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
                updatedAt: serverTimestamp(),
                adminKey: ADMIN_KEY
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
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-secondary toggleRsvpDetail" data-id="${doc.id}" title="Lihat Detail">
                            <i class="ri-arrow-down-s-line"></i>
                        </button>
                    </td>
                    <td>
                        ${d.name || "-"}
                        ${d.isTableVip ? '<i class="ri-vip-fill text-primary ms-1" data-bs-toggle="tooltip" title="VIP Table"></i>' : ''}
                        ${d.isSouvenirVip ? '<i class="ri-vip-diamond-fill text-info ms-1" data-bs-toggle="tooltip" title="VIP Souvenir"></i>' : ''}
                    </td>
                    <td>
                        ${d.rsvpStatus === "yes" 
                            ? '<span class="badge bg-success"><i class="ri-check-line"></i> Hadir</span>' 
                            : d.rsvpStatus === "no"
                            ? '<span class="badge bg-danger"><i class="ri-close-line"></i> Tidak Hadir</span>'
                            : '<span class="badge bg-secondary">Belum Konfirmasi</span>'}
                    </td>
                    <td>${d.rsvpCount || 0} orang</td>
                    <td>${d.maxGuests || 0} orang</td>
                    <td>${d.phone || "-"}</td>
                    <td>${d.source || "-"}</td>
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

    async function loadCommentList() {
        const tbody = $("#commentTableBody");
        tbody.html(`<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>`);

        try {
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

        // Update total data count
        $("#totalDataComment").text(filteredComments.length);

        if (!list.length) {
            tbody.html(`<tr><td colspan="5" class="text-center text-muted">Tidak ada komentar.</td></tr>`);
            return;
        }

        list.forEach(doc => {
            const d = doc.data;
            const commentPreview = d.comment ? (d.comment.length > 100 ? d.comment.substring(0, 100) + "..." : d.comment) : "-";
            
            tbody.append(`
                <tr class="comment-row" data-id="${doc.id}">
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-secondary toggleCommentDetail" data-id="${doc.id}" title="Lihat Detail">
                            <i class="ri-arrow-down-s-line"></i>
                        </button>
                    </td>
                    <td>${d.name || "-"}</td>
                    <td>${commentPreview}</td>
                    <td>
                        ${d.sticker 
                            ? `<img src="../assets/images/sticker/${d.sticker}" alt="sticker" style="width: 30px; height: 30px;">` 
                            : '-'}
                    </td>
                    <td>${formatDate(d.createdAt)}</td>
                </tr>
            `);

            // Detail row
            tbody.append(`
                <tr class="detail-row" id="comment-detail-${doc.id}" style="display: none;">
                    <td colspan="5" class="p-0">
                        <div class="detail-content bg-light p-3">
                            <div class="row">
                                <div class="col-md-8">
                                    <h6 class="mb-3"><i class="ri-information-line"></i> Detail Comment</h6>
                                    <table class="table table-sm table-borderless">
                                        <tr>
                                            <td width="30%"><strong>ID Comment:</strong></td>
                                            <td><code>${doc.id}</code></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Guest ID:</strong></td>
                                            <td><code>${d.guestId || "-"}</code></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Nama:</strong></td>
                                            <td>${d.name || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Komentar:</strong></td>
                                            <td style="white-space: pre-wrap;">${d.comment || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Sticker:</strong></td>
                                            <td>
                                                ${d.sticker 
                                                    ? `<img src="../assets/images/sticker/${d.sticker}" alt="sticker" style="width: 60px; height: 60px;"><br><small>${d.sticker}</small>` 
                                                    : '-'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Tanggal:</strong></td>
                                            <td>${formatDate(d.createdAt)}</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
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




});

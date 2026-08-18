/**
 * PRELOADER MANAGER
 * Mengelola tampilan preloader dengan durasi minimal 2 detik dan maksimal 4 detik.
 * Animasi fade-up yang halus tanpa efek blink.
 */
const PreloaderManager = {
  init() {
    const preloader = document.getElementById('preloader');
    if (!preloader) {
      console.warn('⚠️ Preloader element tidak ditemukan');
      return;
    }

    const startTime = Date.now();
    const minDisplayTime = 2000; // 2 detik minimal
    const maxDisplayTime = 4000; // 4 detik maksimal

    // Timeout untuk maksimal 4 detik
    const maxTimeout = setTimeout(() => {
      this.hide(preloader);
    }, maxDisplayTime);

    window.addEventListener('load', () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      // Clear timeout maksimal jika load lebih cepat
      clearTimeout(maxTimeout);

      // Tunggu sisa waktu minimal atau langsung hide jika sudah lewat 2 detik
      setTimeout(() => {
        this.hide(preloader);
      }, remainingTime);
    });

    console.log('⏳ PreloaderManager initialized (2-4 detik)');
  },

  hide(preloader) {
    if (!preloader || preloader.classList.contains('hidden')) return;
    
    preloader.classList.add('hidden');
    
    // Dispatch only after the fade-out has completed, so desktop Hero AOS
    // starts when the preloader no longer covers it.
    preloader.addEventListener('transitionend', () => {
      document.dispatchEvent(new CustomEvent('preloaderHidden'));

      if (preloader.parentNode) {
        preloader.parentNode.removeChild(preloader);
      }
    }, { once: true });
  }
};

const HeroFooterAOSManager = {
  elements: [],
  activated: false,

  init() {
    this.elements = Array.from(document.querySelectorAll('.hero-footer [data-aos]'));
    if (!this.elements.length) return;

    // Keep footer text out of AOS' initial viewport pass while preloading.
    this.elements.forEach((element) => {
      element.dataset.deferredAos = element.getAttribute('data-aos');
      element.removeAttribute('data-aos');
      element.classList.remove('aos-init', 'aos-animate');
      element.classList.add('deferred-hero-footer');
    });

    const scroller = document.querySelector('.right-side.secondary-pane');
    const activate = () => this.activate();

    scroller?.addEventListener('scroll', activate, { passive: true, once: true });
    window.addEventListener('scroll', activate, { passive: true, once: true });
  },

  activate() {
    if (this.activated) return;
    this.activated = true;

    this.elements.forEach((element) => {
      element.setAttribute('data-aos', element.dataset.deferredAos);
      delete element.dataset.deferredAos;
      element.classList.remove('deferred-hero-footer', 'aos-animate');
    });

    requestAnimationFrame(() => {
      if (typeof AOS !== 'undefined') {
        AOS.refreshHard();
      }

      // The first scroll was already handled before these elements rejoined
      // AOS. Reset and explicitly enter the AOS state on the next frame.
      this.elements.forEach((element) => {
        element.classList.remove('aos-animate');
      });

      void document.body.offsetHeight;

      requestAnimationFrame(() => {
        this.elements.forEach((element) => {
          element.classList.add('aos-animate');
        });
      });
    });
  }
};

// Defer only Hero Footer text; the logo and prewedding photo may preload normally.
HeroFooterAOSManager.init();

// Inisialisasi Preloader segera
PreloaderManager.init();

// Desktop has no welcome cover. Replay Hero only once the preloader has
// completed its fade-out; mobile keeps the existing replay after Open Invitation.
document.addEventListener('preloaderHidden', () => {
  if (!window.matchMedia('(min-width: 961px)').matches) return;

  // Footer sebelumnya menunggu scroll pertama sehingga dapat tetap opacity: 0
  // setelah refresh. Aktifkan saat hero desktop benar-benar sudah terbuka.
  HeroFooterAOSManager.activate();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // refreshHard() lebih dulu, replay hero terakhir. refreshHard menyusun
      // ulang daftar elemen AOS dan dapat melepas aos-animate, jadi kalau
      // replay dijalankan sebelumnya hasilnya bisa langsung terhapus dan foto
      // hero tidak terlihat.
      if (typeof AOS !== 'undefined') {
        AOS.refreshHard();
      }

      requestAnimationFrame(() => {
        if (typeof replayHeroAOS === 'function') {
          replayHeroAOS();
        }
      });
    });
  });
});


/*
===========================================
CUSTOM.JS - PROJECT SPECIFIC FUNCTIONALITY
===========================================
File ini berisi:
1. Custom animations dan interactions
2. RSVP form handling
3. Smooth scrolling optimizations
4. Performance optimizations khusus proyek
===========================================
*/

/**
 * COUNTDOWN MANAGER
 * Mengelola countdown timer dengan efek fade yang smooth
 */
  const CountdownManager = {
    targetDate: null,
    eventDayStart: null,
    countdownInterval: null,
    elements: {
      days: null,
      hours: null,
      minutes: null,
      seconds: null
    },
    
    /**
   * Initialize countdown
   */
  init() {
    console.log('⏰ Initializing countdown manager...');
    
    // Get countdown container
    const countdownContainer = document.querySelector('.countdown');
    if (!countdownContainer) {
      console.warn('⚠️ Countdown container not found');
      return;
    }
    
    // Get target date from data attribute or use default
    const targetDateStr = countdownContainer.dataset.targetDate || '2026-09-05T08:00:00+07:00';
    this.targetDate = new Date(targetDateStr);
    
    // Validate target date
    if (isNaN(this.targetDate.getTime())) {
      console.error('❌ Invalid target date:', targetDateStr);
      return;
    }
    
    // Get countdown elements
    this.elements.days = document.querySelector('.count-day');
    this.elements.hours = document.querySelector('.count-hour');
    this.elements.minutes = document.querySelector('.count-minute');
    this.elements.seconds = document.querySelector('.count-second');
    
    // Check if elements exist
    if (!this.elements.days || !this.elements.hours || !this.elements.minutes || !this.elements.seconds) {
      console.warn('⚠️ Countdown elements not found');
      return;
    }
    
    this.eventDayStart = this.resolveEventDayStart(targetDateStr);

    // Start countdown
    this.startCountdown();
    
    console.log('✅ Countdown manager initialized for:', this.targetDate.toLocaleString('id-ID'));
  },
    
    /**
     * Start countdown timer
     */
    startCountdown() {
      // Hentikan timer lama lebih dulu. init() bisa dipanggil ulang saat data
      // acara dari panel admin tiba, dan tanpa ini akan ada dua interval
      // berjalan bersamaan.
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }

      // Update immediately
      this.updateCountdown();
      
      // Update every second
      this.countdownInterval = setInterval(() => {
        this.updateCountdown();
      }, 1000);
    },
    
    /**
     * Update countdown display
     */
    /**
     * Awal hari acara menurut waktu acara (WIB), bukan waktu perangkat tamu.
     * Dipakai untuk memutuskan kapan countdown berhenti ditampilkan.
     */
    resolveEventDayStart(targetDateStr) {
      const parsed = String(targetDateStr).match(/^(\d{4}-\d{2}-\d{2})T[\d:]+([+-]\d{2}:\d{2}|Z)$/);

      if (parsed) {
        const offset = parsed[2] === 'Z' ? '+00:00' : parsed[2];
        const dayStart = new Date(`${parsed[1]}T00:00:00${offset}`);
        if (!Number.isNaN(dayStart.getTime())) return dayStart;
      }

      // Cadangan: pakai tengah malam menurut zona waktu perangkat.
      const fallback = new Date(this.targetDate);
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    },

    /** "1 hari", "2 minggu", "3 bulan", "1 tahun". */
    formatElapsed(days) {
      if (days < 7) return `${days} hari`;
      if (days < 30) return `${Math.floor(days / 7)} minggu`;
      if (days < 365) return `${Math.floor(days / 30)} bulan`;
      return `${Math.floor(days / 365)} tahun`;
    },

    /**
     * Pada hari acara dan sesudahnya, angka countdown tidak lagi bermakna.
     * Countdown dan tombol kalender disembunyikan, diganti satu baris teks.
     */
    showEventStatus(text) {
      const countdown = document.querySelector('.countdown');
      const calendar = document.querySelector('.add-to-calendar-wrap');
      const status = document.querySelector('[data-countdown-status]');

      if (countdown) countdown.hidden = true;
      if (calendar) calendar.hidden = true;

      if (status) {
        status.hidden = false;
        if (status.textContent !== text) status.textContent = text;
      }
    },

    updateCountdown() {
      const now = new Date().getTime();
      const distance = this.targetDate.getTime() - now;

      // Sejak tengah malam hari acara, tampilkan status alih-alih angka.
      if (this.eventDayStart) {
        const dayStart = this.eventDayStart.getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        if (now >= dayEnd) {
          const elapsedDays = Math.floor((now - dayStart) / (24 * 60 * 60 * 1000));
          this.showEventStatus(`Acara ${this.formatElapsed(elapsedDays)} lalu`);
          return;
        }

        if (now >= dayStart) {
          this.showEventStatus('Acara Sedang Berlangsung');
          return;
        }
      }

      // Check if countdown is finished
      if (distance < 0) {
        this.handleCountdownFinished();
        return;
      }
      
      // Calculate time units
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      // Update display with fade effect
      this.updateWithFade(this.elements.days, days);
      this.updateWithFade(this.elements.hours, hours);
      this.updateWithFade(this.elements.minutes, minutes);
      this.updateWithFade(this.elements.seconds, seconds);
    },
    
    /**
     * Update element with fade effect
     */
    updateWithFade(element, newValue) {
      const currentValue = element.textContent;
      const newValueStr = newValue.toString().padStart(2, '0');
      
      // Only update if value changed
      if (currentValue !== newValueStr) {
        // Add fade out class
        element.style.opacity = '0.3';
        element.style.transform = 'scale(0.9)';
        
        // Update value after short delay
        setTimeout(() => {
          element.textContent = newValueStr;
          
          // Fade back in
          element.style.opacity = '1';
          element.style.transform = 'scale(1)';
        }, 150);
      }
    },
    
    /**
     * Handle countdown finished
     */
    handleCountdownFinished() {
      console.log('🎉 Countdown finished!');
      
      // Clear interval
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }
      
      // Set all to 00 with fade effect
      this.updateWithFade(this.elements.days, 0);
      this.updateWithFade(this.elements.hours, 0);
      this.updateWithFade(this.elements.minutes, 0);
      this.updateWithFade(this.elements.seconds, 0);
      
      // Add finished class for special styling
      const countdownContainer = document.querySelector('.countdown');
      if (countdownContainer) {
        countdownContainer.classList.add('countdown-finished');
      }
    },
    
    /**
     * Cleanup countdown
     */
    destroy() {
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }
    }
};

/* SMOOTH SCROLL MANAGER
 * Mengelola smooth scrolling dengan optimasi performa
 */
const SmoothScrollManager = {
  isScrolling: false,
  scrollTimeout: null,
  
  /**
   * Initialize smooth scroll optimizations
   */
  init() {
    console.log('📜 Initializing smooth scroll optimizations...');
    
    // Setup scroll event optimization
    this.setupScrollOptimization();
    
    // Setup smooth scroll untuk anchor links
    this.setupAnchorScrolling();
    
    // Setup scroll-based animations
    this.setupScrollAnimations();
    
    console.log('✅ Smooth scroll optimizations initialized');
  },
  
  /**
   * Setup scroll event optimization dengan throttling
   */
  setupScrollOptimization() {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.onScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Passive listener untuk performa
    window.addEventListener('scroll', handleScroll, { passive: true });
  },
  
  /**
   * Handle scroll events
   */
  onScroll() {
    // Mark scrolling state
    this.isScrolling = true;
    
    // Clear timeout
    clearTimeout(this.scrollTimeout);
    
    // Set timeout untuk end of scroll
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.onScrollEnd();
    }, 150);
    
    // Update scroll-based elements
    this.updateScrollElements();
  },
  
  /**
   * Handle scroll end
   */
  onScrollEnd() {
    console.log('📜 Scroll ended');
    
    // Refresh AOS jika tersedia
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  },
  
  /**
   * Update elements berdasarkan scroll position
   */
  updateScrollElements() {
    const scrollY = window.pageYOffset;
    const windowHeight = window.innerHeight;
    
    // Update parallax elements (jika ada)
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    parallaxElements.forEach(element => {
      const speed = parseFloat(element.dataset.parallax) || 0.5;
      const yPos = -(scrollY * speed);
      element.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });
    
    // Update scroll progress (jika ada)
    const progressElements = document.querySelectorAll('[data-scroll-progress]');
    progressElements.forEach(element => {
      const progress = Math.min(scrollY / (document.body.scrollHeight - windowHeight), 1);
      element.style.setProperty('--scroll-progress', progress);
    });
  },
  
  /**
   * Setup smooth scrolling untuk anchor links
   */
  setupAnchorScrolling() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      
      const targetId = link.getAttribute('href').substring(1);
      if (!targetId) return;
      
      const targetElement = document.getElementById(targetId);
      if (!targetElement) return;
      
      e.preventDefault();
      this.scrollToElement(targetElement);
    });
  },
  
  /**
   * Smooth scroll ke element tertentu
   */
  scrollToElement(element, offset = 0) {
    const targetPosition = element.offsetTop - offset;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  },
  
  /**
   * Setup scroll-based animations
   */
  setupScrollAnimations() {
    // Intersection Observer untuk scroll animations
    const observerOptions = {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: '0px 0px -10% 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const element = entry.target;
        const ratio = entry.intersectionRatio;
        
        // Update custom properties berdasarkan intersection ratio
        element.style.setProperty('--intersection-ratio', ratio);
        
        // Add/remove classes berdasarkan visibility
        if (ratio > 0.1) {
          element.classList.add('in-view');
        } else {
          element.classList.remove('in-view');
        }
      });
    }, observerOptions);
    
    // Observe elements dengan data-scroll-animate
    document.querySelectorAll('[data-scroll-animate]').forEach(element => {
      observer.observe(element);
    });
  }
};

/**
 * RSVP FORM MANAGER
 * Mengelola form RSVP dengan validasi dan animasi
 */
const RSVPFormManager = {
  form: null,
  isSubmitting: false,
  
  /**
   * Initialize RSVP form
   */
  init() {
    console.log('📝 Initializing RSVP form...');
    
    this.form = document.getElementById('rsvp-form');
    if (!this.form) {
      console.warn('⚠️ RSVP form not found');
      return;
    }
    
    // Setup form events
    this.setupFormEvents();
    
    // Setup form validation
    this.setupFormValidation();
    
    // Setup form animations
    this.setupFormAnimations();
    
    console.log('✅ RSVP form initialized');
  },
  
  /**
   * Setup form event listeners
   */
  setupFormEvents() {
    // Form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    // Real-time validation
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });
  },
  
  /**
   * Setup form validation
   */
  setupFormValidation() {
    // Custom validation messages
    this.validationMessages = {
      required: 'Field ini wajib diisi',
      email: 'Format email tidak valid',
      minLength: 'Minimal {min} karakter',
      maxLength: 'Maksimal {max} karakter'
    };
  },
  
  /**
   * Setup form animations
   */
  setupFormAnimations() {
    // Animate form fields on focus
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.parentElement.classList.add('focused');
      });
      
      input.addEventListener('blur', () => {
        if (!input.value) {
          input.parentElement.classList.remove('focused');
        }
      });
    });
  },
  
  /**
   * Handle form submission
   */
  async handleSubmit() {
    if (this.isSubmitting) return;
    
    console.log('📤 Submitting RSVP form...');
    
    // Validate form
    if (!this.validateForm()) {
      console.warn('⚠️ Form validation failed');
      return;
    }
    
    this.isSubmitting = true;
    this.showSubmittingState();
    
    try {
      // Simulate form submission (replace dengan actual API call)
      await this.simulateSubmission();
      
      // Show success message
      this.showSuccessMessage();
      
      console.log('✅ RSVP submitted successfully');
      
    } catch (error) {
      console.error('❌ RSVP submission failed:', error);
      this.showErrorMessage();
      
    } finally {
      this.isSubmitting = false;
      this.hideSubmittingState();
    }
  },
  
  /**
   * Validate entire form
   */
  validateForm() {
    const inputs = this.form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  },
  
  /**
   * Validate individual field
   */
  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;
    let isValid = true;
    let errorMessage = '';
    
    // Required validation
    if (field.hasAttribute('required') && !value) {
      isValid = false;
      errorMessage = this.validationMessages.required;
    }
    
    // Email validation
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = this.validationMessages.email;
      }
    }
    
    // Length validation
    if (field.hasAttribute('minlength') && value.length < parseInt(field.getAttribute('minlength'))) {
      isValid = false;
      errorMessage = this.validationMessages.minLength.replace('{min}', field.getAttribute('minlength'));
    }
    
    if (field.hasAttribute('maxlength') && value.length > parseInt(field.getAttribute('maxlength'))) {
      isValid = false;
      errorMessage = this.validationMessages.maxLength.replace('{max}', field.getAttribute('maxlength'));
    }
    
    // Show/hide error
    if (isValid) {
      this.clearFieldError(field);
    } else {
      this.showFieldError(field, errorMessage);
    }
    
    return isValid;
  },
  
  /**
   * Show field error
   */
  showFieldError(field, message) {
    field.classList.add('error');
    
    // Remove existing error message
    const existingError = field.parentElement.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // Add new error message
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    field.parentElement.appendChild(errorElement);
  },
  
  /**
   * Clear field error
   */
  clearFieldError(field) {
    field.classList.remove('error');
    
    const errorMessage = field.parentElement.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  },
  
  /**
   * Show submitting state
   */
  showSubmittingState() {
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Mengirim...';
      submitButton.classList.add('submitting');
    }
  },
  
  /**
   * Hide submitting state
   */
  hideSubmittingState() {
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Kirim RSVP';
      submitButton.classList.remove('submitting');
    }
  },
  
  /**
   * Show success message
   */
  showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-message';
    message.innerHTML = `
      <h4>✅ RSVP Berhasil Dikirim!</h4>
      <p>Terima kasih atas konfirmasi kehadiran Anda.</p>
    `;
    
    this.form.parentElement.insertBefore(message, this.form);
    this.form.style.display = 'none';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      message.remove();
      this.form.style.display = 'block';
      this.form.reset();
    }, 5000);
  },
  
  /**
   * Show error message
   */
  showErrorMessage() {
    const message = document.createElement('div');
    message.className = 'error-message-global';
    message.innerHTML = `
      <h4>❌ Terjadi Kesalahan</h4>
      <p>Mohon coba lagi dalam beberapa saat.</p>
    `;
    
    this.form.parentElement.insertBefore(message, this.form);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      message.remove();
    }, 3000);
  },
  
  /**
   * Simulate form submission
   */
  simulateSubmission() {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000); // Simulate 2 second delay
    });
  }
};

/**
 * PERFORMANCE OPTIMIZER
 * Optimasi performa khusus untuk proyek ini
 */
const PerformanceOptimizer = {
  /**
   * Initialize performance optimizations
   */
  init() {
    console.log('⚡ Initializing performance optimizations...');
    
    // Setup image lazy loading
    this.setupImageLazyLoading();
    
    // Setup resource hints
    this.setupResourceHints();
    
    // Setup critical resource prioritization
    this.setupResourcePrioritization();
    
    // Setup memory management
    this.setupMemoryManagement();
    
    console.log('✅ Performance optimizations initialized');
  },
  
  /**
   * Setup image lazy loading
   */
  setupImageLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.add('loaded');
              imageObserver.unobserve(img);
            }
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  },
  
  /**
   * Setup resource hints
   */
  setupResourceHints() {
    // Preconnect ke external domains
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://unpkg.com'
    ];
    
    preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });
  },
  
  /**
   * Setup resource prioritization
   */
  setupResourcePrioritization() {
    // Prioritize critical resources
    const criticalResources = document.querySelectorAll('link[rel="stylesheet"], script[src]');
    criticalResources.forEach(resource => {
      if (resource.href && resource.href.includes('main.css')) {
        resource.setAttribute('importance', 'high');
      }
    });
  },
  
  /**
   * Setup memory management
   */
  setupMemoryManagement() {
    // Clean up event listeners pada page unload
    window.addEventListener('beforeunload', () => {
      // Remove event listeners
      document.removeEventListener('scroll', this.handleScroll);
      document.removeEventListener('resize', this.handleResize);
      
      // Clear intervals/timeouts
      if (this.performanceInterval) {
        clearInterval(this.performanceInterval);
      }
    });
    
    // Monitor memory usage
    if (performance.memory) {
      this.performanceInterval = setInterval(() => {
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1048576;
        
        if (usedMB > 50) { // Alert jika memory usage > 50MB
          console.warn(`⚠️ High memory usage: ${usedMB.toFixed(2)}MB`);
        }
      }, 30000); // Check setiap 30 detik
    }
  }
};

/**
 * CALENDAR LINK MANAGER
 * Memilih kalender sesuai perangkat: Apple Calendar di iPhone/iPad dan Google Calendar di Android/desktop.
 */
const CalendarLinkManager = {
  init() {
    const calendarLink = document.getElementById('addToCalendar');
    if (!calendarLink) return;

    const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isAppleMobile) {
      // Jika tersedia, iOS menerima ICS HTTP dari Cloudflare Worker.
      // Generator lokal dan ICS statis tetap menjadi fallback gratis.
      calendarLink.href = calendarLink.dataset.appleCalendar;
      calendarLink.removeAttribute('target');
      calendarLink.removeAttribute('rel');
      if (calendarLink.href.startsWith('blob:')) {
        calendarLink.download = calendarLink.dataset.appleCalendarFilename || 'wedding.ics';
      } else {
        calendarLink.removeAttribute('download');
      }
      calendarLink.setAttribute('aria-label', 'Tambahkan acara ke Kalender Apple');
      return;
    }

    // Google Calendar tidak mengimpor VALARM dari URL template, tetapi ini
    // adalah alur paling andal di Android dan memakai preferensi notifikasi akun.
    calendarLink.href = calendarLink.dataset.googleCalendar;
    calendarLink.removeAttribute('download');
    calendarLink.target = '_blank';
    calendarLink.rel = 'nofollow noopener';
    calendarLink.setAttribute('aria-label', 'Tambahkan acara ke Google Calendar');
  }
};

/**
 * MAIN CUSTOM INITIALIZATION
 * Initialize semua custom functionality
 */
const CustomInitializer = {
  /**
   * Initialize semua custom features
   */
  async init() {
    console.log('🎨 Starting custom initialization...');
    
    try {
      // Initialize performance optimizations first
      PerformanceOptimizer.init();
      
      // Initialize core features
      SmoothScrollManager.init();
      CalendarLinkManager.init();
      // RSVPFormManager.init();
      CountdownManager.init();

      // Data acara dari panel admin datang secara asinkron. Saat tiba,
      // hitung mundur dan tautan kalender dihitung ulang agar tidak memakai
      // tanggal bawaan yang mungkin sudah berubah.
      window.addEventListener('siteevent:applied', () => {
        CountdownManager.init();
        CalendarLinkManager.init();
      });
      
      // Setup additional interactions
      this.setupAdditionalInteractions();
      
      console.log('🎉 Custom initialization completed!');
      
    } catch (error) {
      console.error('❌ Custom initialization failed:', error);
    }
  },
  
  /**
   * Setup additional interactions
   */
  setupAdditionalInteractions() {
    // Gift tab functionality
    this.setupGiftTabManager();

    // Gallery hover effects
    this.setupGalleryInteractions();
    
    // Scroll to top functionality
    this.setupScrollToTop();
  },

  /**
   * Setup gift tab and copy functionality
   */
  setupGiftTabManager() {
    console.log('🎁 Setting up gift tab manager...');
    
    const GiftTabManager = {
      init() {
        this.setupGiftTabs();
        this.setupCopyActions();
        this.setupGiftConfirm();
        this.createSnackbarContainer();
      },

      /**
       * Ubah nomor lokal menjadi format internasional WhatsApp.
       * 08996530109 -> 628996530109
       */
      normalizeWhatsAppNumber(raw) {
        let digits = String(raw || '').replace(/\D/g, '');
        if (!digits) return '';

        if (digits.startsWith('0')) {
          digits = `62${digits.slice(1)}`;
        } else if (!digits.startsWith('62')) {
          digits = `62${digits}`;
        }

        return digits;
      },

      /** Konfirmasi pengiriman hadiah lewat WhatsApp. */
      setupGiftConfirm() {
        const form = document.getElementById('giftConfirmForm');
        if (!form) return;

        form.addEventListener('submit', (event) => {
          event.preventDefault();

          const input = document.getElementById('giftConfirmName');
          const name = String(input?.value || '').trim();

          if (!name) {
            window.showSnackbar?.('Isi nama Anda terlebih dahulu');
            input?.focus();
            return;
          }

          const phoneSource = document.querySelector('[data-content="giftSendPhone"]');
          const phone = this.normalizeWhatsAppNumber(phoneSource?.textContent);

          if (!phone) {
            window.showSnackbar?.('Nomor WhatsApp tujuan belum tersedia');
            return;
          }

          const template = document.querySelector('[data-content="giftConfirmMessage"]')?.textContent?.trim()
            || 'Hai, saya [Nama]. Ingin mengonfirmasi pemberian hadiah. Mohon dibantu untuk dicek ya. Terima kasih.';

          const message = template.replaceAll('[Nama]', name);
          const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

          // Di ponsel, navigasi pada tab yang sama membuat aplikasi WhatsApp
          // terbuka langsung; tab baru sering ditahan browser atau berhenti
          // di halaman web WhatsApp.
          const isMobile = window.matchMedia('(max-width: 1024px)').matches
            || /android|iphone|ipad|ipod/i.test(navigator.userAgent);

          if (isMobile) {
            window.location.href = url;
            return;
          }

          const opened = window.open(url, '_blank', 'noopener');
          if (!opened) window.location.href = url;
        });
      },

      setupGiftTabs() {
        const giftActions = document.querySelectorAll('.gift-action');
        
        giftActions.forEach(action => {
          action.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleTabClick(action);
          });
        });
      },

      handleTabClick(clickedAction) {
        const dataType = clickedAction.getAttribute('data-type');
        const targetArea = document.querySelector(`.area-data-${dataType}`);
        const isCurrentlyActive = clickedAction.classList.contains('gift-action-active');

        // Remove active class from all gift actions
        document.querySelectorAll('.gift-action').forEach(action => {
          action.classList.remove('gift-action-active');
        });

        // Hide all areas
        document.querySelectorAll('.area-data-transfer, .area-data-gift').forEach(area => {
          area.style.display = 'none';
        });

        // Toggle behavior: if clicked action was already active, keep it hidden
        if (!isCurrentlyActive) {
          clickedAction.classList.add('gift-action-active');
          if (targetArea) {
            targetArea.style.display = 'block';
          }
        }
      },

      setupCopyActions() {
        const copyButtons = document.querySelectorAll('.copy-action');
        
        copyButtons.forEach(button => {
          button.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleCopyAction(button);
          });
        });
      },

      handleCopyAction(button) {
        const copyId = button.getAttribute('data-copy');
        const targetElement = document.querySelector(`[data-remote="${copyId}"]`);
        
        console.log(`🔄 Copy action triggered for: ${copyId}`);
        
        if (targetElement) {
          const textToCopy = targetElement.textContent.trim();
          console.log(`📋 Text to copy: "${textToCopy}"`);
          
          // Modern clipboard API with fallback
          if (navigator.clipboard && window.isSecureContext) {
            // Modern async clipboard API
            navigator.clipboard.writeText(textToCopy).then(() => {
              console.log('✅ Clipboard API success');
              window.showSnackbar('Berhasil di salin ke papan klip');
            }).catch((err) => {
              console.warn('⚠️ Clipboard API failed:', err);
              this.fallbackCopy(textToCopy);
            });
          } else {
            // Fallback for older browsers or non-secure contexts
            console.log('📋 Using fallback copy method');
            this.fallbackCopy(textToCopy);
          }
        } else {
          console.error(`❌ Target element not found for: ${copyId}`);
        }
      },
      
      fallbackCopy(text) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            console.log('✅ Fallback copy success');
            window.showSnackbar('Berhasil di salin ke papan klip');
          } else {
            console.error('❌ Fallback copy failed');
            window.showSnackbar('Gagal menyalin ke papan klip');
          }
        } catch (err) {
          console.error('❌ Fallback copy error:', err);
          window.showSnackbar('Gagal menyalin ke papan klip');
        }
      },

      createSnackbarContainer() {
        if (!document.querySelector('.snackbar-container')) {
          const container = document.createElement('div');
          container.className = 'snackbar-container';
          document.body.appendChild(container);
        }
      },

      showSnackbar(message) {
        const container = document.querySelector('.snackbar-container');
        if (!container) {
          console.error('Snackbar container not found');
          return;
        }
        
        const existingSnackbars = container.querySelectorAll('.snackbar');
        
        // Limit to maximum 2 snackbars
        if (existingSnackbars.length >= 2) {
          const oldestSnackbar = existingSnackbars[0];
          this.removeSnackbar(oldestSnackbar);
        }

        const snackbar = document.createElement('div');
        snackbar.className = 'snackbar';
        snackbar.textContent = message;
        
        // Add mobile detection for debugging
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        console.log(`📱 Showing snackbar on ${isMobile ? 'mobile' : 'desktop'}: "${message}"`);
        
        container.appendChild(snackbar);
        
        // Force reflow before adding show class
        snackbar.offsetHeight;
        
        // Trigger show animation
        requestAnimationFrame(() => {
          snackbar.classList.add('show');
          console.log('✅ Snackbar show class added');
        });
        
        // Auto hide after 3 seconds (longer for mobile)
        const hideDelay = isMobile ? 3000 : 2000;
        setTimeout(() => {
          this.removeSnackbar(snackbar);
        }, hideDelay);
      },

      removeSnackbar(snackbar) {
        snackbar.classList.add('fade-out');
        setTimeout(() => {
          if (snackbar.parentNode) {
            snackbar.parentNode.removeChild(snackbar);
          }
        }, 300);
      }
    };
    
    GiftTabManager.init();
    console.log('✅ Gift tab manager initialized successfully');

    // Buat fungsi global untuk showSnackbar agar bisa dipanggil dari mana saja
    window.showSnackbar = function(message) {
      // Pastikan container ada
      if (!document.querySelector('.snackbar-container')) {
        const container = document.createElement('div');
        container.className = 'snackbar-container';
        document.body.appendChild(container);
      }
      
      // Panggil fungsi showSnackbar dari GiftTabManager
      GiftTabManager.showSnackbar.call(GiftTabManager, message);
    };
    
    // Expose GiftTabManager untuk debugging
    window.GiftTabManager = GiftTabManager;
  },
  
  /**
   * Setup gallery interactions dengan lightGallery
   */
  setupGalleryInteractions() {
    console.log('🖼️ Setting up gallery interactions...');
    
    // Initialize lightGallery
    const galleryElement = document.getElementById('lightgallery');
    if (galleryElement) {
      // Galeri bisa diganti dari panel admin setelah init, jadi instance-nya
      // disimpan supaya daftar itemnya dapat dipindai ulang.
      window.addEventListener('sitemedia:applied', () => {
        window.lightGalleryInstance?.refresh?.();
      });

      window.lightGalleryInstance = lightGallery(galleryElement, {
        speed: 500,
        download: false,
        counter: false,
        share: false,
        zoom: false,
        rotate: false,
        flipHorizontal: false,
        flipVertical: false,
        actualSize: false,
        thumbnail: true,
        animateThumb: true,
        showThumbByDefault: false,
        toogleThumb: false,
        pullCaptionUp: false,
        enableDrag: true,
        enableSwipe: true,
        swipeThreshold: 50,
        closable: true,
        closeOnTap: true,
        showCloseIcon: true,
        appendSubHtmlTo: '.lg-sub-html',
        subHtmlSelectorRelative: false,
        preload: 2,
        showAfterLoad: true,
        selector: 'a',
        selectWithin: '',
        nextHtml: '',
        prevHtml: '',
        index: 0,
        iframeMaxWidth: '100%',
        iframeMaxHeight: '100%',
        videoMaxWidth: '855px',
        thumbWidth: 100,
        thumbHeight: '80px',
        thumbMargin: 5,
        appendThumbnailsTo: '.lg-sub-html',
        toggleThumb: false,
        enableThumbDrag: true,
        enableThumbSwipe: true,
        thumbSwipeThreshold: 50,
        loadYouTubeThumbnail: true,
        youTubeThumbSize: 1,
        loadVimeoThumbnail: true,
        vimeoThumbSize: 'thumbnail_small',
        loadDailymotionThumbnail: true,
        dailymotionThumbSize: 'medium',
        galleryId: 1,
        startClass: 'lg-start-zoom',
        backdropDuration: 300,
        hideBarsDelay: 0,
        useLeft: false,
        loop: true,
        escKey: true,
        keyPress: true,
        controls: true,
        slideEndAnimation: true,
        hideControlOnEnd: false,
        mousewheel: false,
        getCaptionFromTitleOrAlt: false,
        appendCounterTo: '.lg-toolbar',
        dynamic: false,
        dynamicEl: [],
        extraProps: [],
        exThumbImage: '',
        isMobile: undefined,
        mobileSettings: {
          controls: true,
          showCloseIcon: true,
          download: false,
          zoom: true,
          thumbnail: false
        }
      });
      
      console.log('✅ lightGallery initialized successfully');
    } else {
      console.warn('⚠️ Gallery element not found');
    }
  },
  
  /**
   * Setup card interactions
   */
  setupCardInteractions() {
    const cards = document.querySelectorAll('.event-card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px) translateZ(0)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) translateZ(0)';
      });
    });
  },
  
  /**
   * Setup scroll to top functionality
   */
  setupScrollToTop() {
    // Use existing footer element
    const scrollButton = document.getElementById('footer-to-top');
    
    // Add CSS for the scroll to top functionality directly in JavaScript
    const style = document.createElement('style');
    style.innerHTML = `
      #footer-to-top {
        cursor: pointer;
        transition: all 0.3s ease;
      }
      #footer-to-top:hover {
        transform: translateY(-5px);
      }
    `;
    document.head.appendChild(style);
    
    // Scroll to top function with smooth animation
    const scrollToTop = (event) => {
      event.preventDefault();
      
      // Get the right-side scrollable element
      const rightSide = document.querySelector('.right-side');
      
      if (rightSide) {
        // Try jQuery first (if available)
        if (typeof $ !== 'undefined' && $(rightSide).animate) {
          $(rightSide).animate({
            scrollTop: 0
          }, 800, 'swing');
        } else {
          // Fallback to vanilla JavaScript
          rightSide.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }
    };
    
    // Event listener for click
    if (scrollButton) {
      scrollButton.addEventListener('click', scrollToTop);
    }
  }
};

/**
 * INITIALIZATION ORCHESTRATOR
 * Menunggu main.js selesai kemudian initialize custom features
 */
(function() {
  'use strict';
  
  console.log('🎨 Custom.js loaded');

  // Add dynamic height function for welcome section
  function setWelcomeSectionHeight() {
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
      // Use 100dvh for modern browsers, fallback to 100vh
      // Always prefer 100dvh for better mobile support
      const dynamicHeight = '100dvh';
      welcomeSection.style.height = dynamicHeight;
      welcomeSection.style.minHeight = dynamicHeight;
      
      // Ensure the welcome section covers the entire viewport
      welcomeSection.style.width = '100%';
      welcomeSection.style.position = 'fixed';
      welcomeSection.style.top = '0';
      welcomeSection.style.left = '0';
      welcomeSection.style.overflow = 'hidden';
      
      console.log(`📱 Welcome section height set to: ${dynamicHeight}`);
    }
  }

  // Enhanced function to prevent scrolling when welcome section is active
  function preventScrollWhenWelcomeActive() {
    // Undangan sudah dibuka: jangan pernah memasang kunci lagi. Event load
    // menunggu seluruh gambar, jadi di ponsel ia bisa tiba setelah pengguna
    // menekan "Buka Undangan" dan mengunci halaman yang seharusnya bebas.
    if (window.__welcomeClosed) return;

    const welcomeSection = document.querySelector('.welcome-section');
    const rightSide = document.querySelector('.right-side');
    
    if (welcomeSection && getComputedStyle(welcomeSection).display !== 'none') {
      // Prevent scrolling on the main content
      if (rightSide) {
        rightSide.style.overflow = 'hidden';
      }
      
      // Prevent scrolling on the body
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    }
  }

  // Pemulihan scroll memakai restoreInvitationScroll() di lingkup atas berkas
  // ini, supaya hanya ada satu tempat yang melepas kunci.

  // Call the function on load and resize
  window.addEventListener('load', function() {
    setWelcomeSectionHeight();
    preventScrollWhenWelcomeActive();
  });
  
  window.addEventListener('resize', function() {
    setWelcomeSectionHeight();
  });
  
  // Also call it immediately in case the DOM is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setWelcomeSectionHeight();
      preventScrollWhenWelcomeActive();
    });
  } else {
    setWelcomeSectionHeight();
    preventScrollWhenWelcomeActive();
  }
  
  // Listen untuk main initialization complete event
  document.addEventListener('mainInitComplete', (event) => {
    console.log('📡 Main initialization complete, starting custom init...');
    console.log('📊 Loaded libraries:', event.detail.loadedLibraries);
    
    // Delay sedikit untuk memastikan DOM ready
    setTimeout(() => {
      CustomInitializer.init();
    }, 100);
  });
  
  // Fallback jika main init event tidak diterima
  const fallbackTimeout = setTimeout(() => {
    console.log('⏰ Fallback: Starting custom init without main init event');
    CustomInitializer.init();
  }, 3000);
  
  // Clear fallback jika main init event diterima
  document.addEventListener('mainInitComplete', () => {
    clearTimeout(fallbackTimeout);
  }, { once: true });
  
  // Export untuk debugging
  if (typeof window !== 'undefined') {
    window.CustomJS = {
      SmoothScrollManager,
      RSVPFormManager,
      PerformanceOptimizer,
      CustomInitializer
    };
    
    console.log('🔧 Custom.js objects available in window.CustomJS for debugging');
  }

  // Attach event handlers
  const $amountWrap = $(".rsvp-amount-wrap");
  const $peopleInput = $("#people");
  const $rsvpForm = $(".rsvp-form");
  const $rsvpDescription = $(".rsvp-description");

  // --- Default state ---
  // $("input[name='confirm'][value='yes']").prop("checked", true);
  // $(".rsvp-confirm-btn.going").addClass("active");
  // $peopleInput.val(1);
  // $amountWrap.addClass("open"); // <-- ini penting
  // $rsvpForm.hide(); // sembunyikan form saat awal

  // --- Toggle active button dan show/hide jumlah orang ---
  $("input[name='confirm']").on("change", function () {
    const val = $(this).val();

    $(".rsvp-confirm-btn").removeClass("active");
    $(this).next(".rsvp-confirm-btn").addClass("active");

    // hentikan animasi lama sebelum mulai yang baru
    if (val === "yes") {
      $amountWrap.addClass("open");
    } else {
      $amountWrap.removeClass("open");
    }
  });

  // --- Klik "Ubah Kehadiran" ---
  // $(".action-rsvp").on("click", function () {
  //   $rsvpDescription.hide();
  //   $rsvpForm.fadeIn(300);
  // });

  // --- Submit handler ---
  // $("#rsvp-form-data").on("submit", function (e) {
  //   e.preventDefault();
  //   window.showSnackbar('Terima kasih sudah konfirmasi!');
  //   $rsvpForm.fadeOut(300, function () {
  //     $rsvpDescription.fadeIn(300);
  //   });
  // });

  /**
 * BACKSOUND MANAGER — FINAL + STABLE VERSION
 * Autoplay setelah user pernah klik “Buka Undangan”
 */
const BACKSOUND_TRACKS = {
  default: "assets/music/backsound.mp3",
  minang: "assets/music/minang.mp3",
};

const BacksoundManager = {
  audio: null,
  unlocked: false,
  src: BACKSOUND_TRACKS.default,

  /**
   * Ganti lagu sesuai pilihan pada data tamu. Aman dipanggil sebelum atau
   * sesudah init(): kalau elemen audio belum siap, init() memakai src terbaru.
   */
  setTrack(track) {
    const url = BACKSOUND_TRACKS[track] || BACKSOUND_TRACKS.default;
    if (this.src === url) return;

    this.src = url;
    if (!this.audio) return;

    const wasPlaying = !this.audio.paused;
    this.audio.src = url;
    this.audio.load();
    if (wasPlaying) this.audio.play().catch(() => {});
  },

  init() {
    this.audio = document.getElementById("backsound");
    if (!this.audio) return;

    this.audio.src = this.src;
    this.audio.volume = 0.6;

    // toggle circle rotation on audio state changes
    const circle = document.getElementById("audioCircle");
    const iconEl = circle ? circle.querySelector("i") : null;
    this.audio.addEventListener("play", () => {
      if (circle) {
        circle.classList.add("playing");
        circle.style.animationPlayState = "running";
      }
      if (iconEl) {
        iconEl.classList.remove("icon-audio-off");
        iconEl.classList.add("icon-audio");
      }
    });

    this.audio.addEventListener("pause", () => {
      if (circle) {
        // pause animation without resetting rotation position
        circle.classList.add("playing");
        circle.style.animationPlayState = "paused";
      }
      if (iconEl) {
        iconEl.classList.remove("icon-audio");
        iconEl.classList.add("icon-audio-off");
      }
    });

    this.audio.addEventListener("ended", () => {
      if (circle) {
        circle.classList.add("playing");
        circle.style.animationPlayState = "paused";
      }
      if (iconEl) {
        iconEl.classList.remove("icon-audio");
        iconEl.classList.add("icon-audio-off");
      }
    });

    // set initial icon and rotation state
    if (iconEl) {
      if (this.audio.paused) {
        iconEl.classList.remove("icon-audio");
        iconEl.classList.add("icon-audio-off");
        if (circle) {
          circle.classList.add("playing");
          circle.style.animationPlayState = "paused";
        }
      } else {
        if (circle) {
          circle.classList.add("playing");
          circle.style.animationPlayState = "running";
        }
        iconEl.classList.remove("icon-audio-off");
        iconEl.classList.add("icon-audio");
      }
    }

    this.unlocked = localStorage.getItem("userAudioUnlocked") === "1";

    // if (this.unlocked) {
    //   // coba autoplay setelah load
    //   setTimeout(() => this.tryAuto(), 500);
    // }
  },

  // saat user klik BUKA UNDANGAN
  userGesture() {
    if (!this.audio) return;

    localStorage.setItem("userAudioUnlocked", "1");
    this.unlocked = true;

    this.audio.play().catch(err => {
      console.warn("✅ gesture play gagal (akan retry):", err);
      setTimeout(() => this.tryAuto(), 300);
    });
  },

  // autoplay setelah reload
  tryAuto() {
    if (!this.unlocked) return;

    this.audio.play()
      .then(() => console.log("✅ autoplay sukses"))
      .catch(err => {
        console.log("⛔ autoplay gagal", err);
        // console.warn("⛔ autoplay gagal, retry…", err);
        // setTimeout(() => this.tryAuto(), 1000);
      });
  }
};

// ====================================================
//  ANIMASI WELCOME DIPISAH → gesture tidak terganggu
// ====================================================

let welcomeExitStarted = false;

function runWelcomeExitAnimation() {
  // Tombol dapat ditekan dua kali, atau ditekan tepat saat auto-click jalan.
  // Tanpa penjaga ini dua rantai animasi berjalan tumpang tindih dan saling
  // menimpa gaya scroll, yang membuat halaman kadang tidak bisa digulir.
  if (welcomeExitStarted) return;
  welcomeExitStarted = true;

  // Menandai undangan sudah dibuka. Dibaca preventScrollWhenWelcomeActive()
  // supaya event load atau resize yang datang belakangan tidak memasang
  // kunci scroll lagi setelah undangan terbuka.
  window.__welcomeClosed = true;

  const $rightSide = $(".right-side");
  const $welcomeSection = $(".welcome-section");
  const $welcomeContent = $(".welcome-content");

  // Fade konten welcome
  $welcomeContent.css({
    transition: "opacity 0.6s ease, transform 0.6s ease",
    opacity: "0",
    transform: "translate3d(0, 30px, 0)",
  });

  // Setelah fade selesai
  setTimeout(() => {
    $welcomeSection.css({
      transition: "opacity 0.8s ease, transform 0.8s ease",
      opacity: "0",
      transform: "translate3d(0, -100%, 0)",
    });

    // Setelah welcome hilang dari layar
    setTimeout(() => {
      $welcomeSection.css({
        "visibility": "hidden",
        "display": "none",
        "position": "absolute",
        "pointer-events": "none"
      });

      restoreInvitationScroll();

      // Force reflow
      if ($rightSide[0]) void $rightSide[0].clientHeight;

      // Footer ditunda selama welcome masih menutupi hero. Aktifkan sekarang,
      // sebelum refreshHard(), supaya tidak tertinggal dengan opacity: 0.
      HeroFooterAOSManager.activate();

      // Reset AOS. Urutannya penting: refreshHard() menyusun ulang daftar
      // elemen AOS dan dapat MELEPAS aos-animate dari elemen yang dianggap
      // belum masuk layar. Karena itu replay hero harus menjadi langkah
      // terakhir, dijalankan pada frame berikutnya supaya perhitungan posisi
      // milik AOS sudah selesai. Tanpa ini foto hero bisa tertinggal tanpa
      // aos-animate, yang berarti tidak terlihat sama sekali.
      setTimeout(() => {
        if (typeof AOS !== "undefined") AOS.refreshHard();

        requestAnimationFrame(() => {
          if (typeof replayHeroAOS === "function") replayHeroAOS();
        });
      }, 10);
    }, 800);

  }, 600);
};

/**
 * Buka kunci scroll dan pastikan tetap terbuka.
 *
 * Rantai setTimeout di atas dapat tertunda jauh bila pengguna sempat pindah
 * aplikasi, karena timer di browser ponsel diperlambat saat halaman tidak
 * terlihat. Karena itu pemulihannya dibuat idempoten dan ditegaskan ulang
 * setiap halaman kembali terlihat, supaya tidak ada keadaan halaman terbuka
 * tetapi tidak bisa digulir.
 */
function restoreInvitationScroll() {
  const rightSide = document.querySelector(".right-side");

  if (rightSide) {
    rightSide.style.overflow = "auto";
    rightSide.style.overflowY = "auto";
    rightSide.style.overflowX = "hidden";
    rightSide.style.pointerEvents = "auto";
  }

  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("width");
  document.body.style.removeProperty("height");
  document.body.style.removeProperty("touch-action");
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && window.__welcomeClosed) restoreInvitationScroll();
});

/**
 * Handler tombol "Buka Undangan"
 * animasi welcome → sembunyi → aktifin scroll → reset AOS
 */

// ✅ AUTO-CLICK TIMEOUT 10 DETIK
let autoClickTriggered = false;
const autoClickTimeout = setTimeout(() => {
  if (!autoClickTriggered) {
    console.log("⏰ Auto-click triggered after 10 seconds");
    $("#startToExplore").trigger("click");
    autoClickTriggered = true;
  }
}, 10000);

$("#startToExplore").on("click", function (e) {
  e.preventDefault();

  // Clear auto-click timeout jika user sudah klik manual
  if (!autoClickTriggered) {
    clearTimeout(autoClickTimeout);
    autoClickTriggered = true;
    console.log("✅ Manual click detected, auto-click cancelled");
  }

  // ✅ 1. User gesture PLAY dulu (sebelum animasi apapun jalan)
  try {
    BacksoundManager.userGesture();
  } catch (err) {
    console.warn("gesture play failed:", err);
  }

  // ✅ 2. Delay sedikit biar browser finalize gesture.
  // Hanya satu rantai animasi. Sebelumnya rantai yang sama juga ditulis ulang
  // di sini, sehingga dua rantai berjalan bersamaan dan saling menimpa gaya
  // scroll pada milidetik yang berdekatan.
  setTimeout(() => {
    runWelcomeExitAnimation();
  }, 50);
});

/**
   * ================================
   * DEVICE + URL UTILITIES
   * ================================
   */

  function detectDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|iphone|android/.test(ua)) return "mobile";
    if (/ipad|tablet/.test(ua)) return "tablet";
    return "desktop";
  }

  function getGuestIdFromURL() {
    const p = new URLSearchParams(window.location.search);
    return p.get("g");
  }

  /**
   * ================================
   * LOAD GUEST + TRACKING
   * ================================
   */

  let _guestLoaded = false;
  window.validGuest = false;
  window.guestIdentityReady = Promise.resolve(false);

  // Jalur REST awal (site-media-early.js) membaca dokumen tamu tanpa menunggu
  // Firebase SDK, dan bisa selesai sebelum file ini dieksekusi. Hasilnya
  // dipakai sebagai nilai awal supaya section opsional tidak menunggu SDK.
  window.guestPreferences = {
    showInviters: window.__guestEarly?.showInviters === true,
    musicTrack: window.__guestEarly?.musicTrack === "minang" ? "minang" : "default",
  };

  /**
   * Section "Turut Mengundang" hanya tampil bila tamu ini diberi opsinya DAN
   * daftar namanya sudah diisi di panel admin. Dipanggil ulang saat konten
   * kustom selesai diterapkan karena urutan kedua sumber data tidak pasti.
   */
  let inviterObserver = null;

  function syncInviterSection() {
    const section = document.querySelector("[data-inviter-section]");
    if (!section) return;

    const list = section.querySelector(".inviter-list");
    const hasNames = Boolean(list && list.textContent.trim());
    const visible = window.guestPreferences.showInviters === true && hasNames;
    const wasVisible = !section.hidden;

    section.hidden = !visible;
    section.style.display = visible ? "" : "none";

    // Observer hanya berjalan selama section benar-benar tampil. Saat masih
    // display:none posisinya belum berarti, dan mengamatinya lebih awal
    // berisiko menyalakan animasi sebelum pengunjung menggulir ke sini.
    if (visible) {
      inviterObserver?.observe(section);
    } else {
      inviterObserver?.unobserve(section);
      section.classList.remove("is-inview");
    }

    // Tinggi halaman berubah begitu section ini muncul, jadi offset AOS milik
    // section ini beserta semua section di bawahnya perlu dihitung ulang.
    // Tanpa ini isi section tertahan pada opacity 0 karena posisinya masih
    // hasil pengukuran saat section masih display:none.
    if (visible !== wasVisible) {
      requestAnimationFrame(() => {
        if (typeof AOS !== "undefined") AOS.refreshHard();
      });
    }
  }

  function applyGuestPreferences(guest) {
    window.guestPreferences = {
      showInviters: guest?.showInviters === true,
      musicTrack: guest?.musicTrack === "minang" ? "minang" : "default",
    };

    BacksoundManager.setTrack(window.guestPreferences.musicTrack);
    syncInviterSection();
  }

  /**
   * Animasi masuk saat section tergulir ke layar, menggantikan AOS.
   *
   * AOS tidak dipakai di sini karena ia mengukur posisi elemen saat
   * inisialisasi, sementara section ini baru dibuka dan diisi setelahnya.
   * Kelas .is-reveal-ready baru dipasang setelah observer dipastikan tersedia,
   * sehingga kondisi tersembunyi di CSS tidak pernah berlaku tanpa ada yang
   * membatalkannya. Perilakunya mengikuti konfigurasi AOS situs ini
   * (mirror: true), yaitu animasi berulang setiap kali masuk layar.
   */
  function createInviterObserver() {
    const section = document.querySelector("[data-inviter-section]");
    if (!section || !("IntersectionObserver" in window)) return null;

    section.classList.add("is-reveal-ready");

    // Bagian bawah root dipangkas seperempat tinggi layar, jadi animasi baru
    // jalan setelah section cukup masuk ke layar, bukan saat ujungnya baru
    // menyentuh tepi bawah. Observasinya sendiri dinyalakan syncInviterSection.
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          section.classList.toggle("is-inview", entry.isIntersecting);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -25% 0px" }
    );
  }

  window.addEventListener("sitecontent:applied", syncInviterSection);

  // Preferensi tamu dari jalur REST awal. Hanya visibilitas section yang
  // diambil di sini; nama, RSVP, dan lagu tetap ditangani loadGuestInfo().
  window.addEventListener("guest:early", (event) => {
    window.guestPreferences.showInviters = event.detail?.showInviters === true;
    syncInviterSection();
  });

  // Kedua event di atas dapat terjadi sebelum file ini dieksekusi, jadi
  // kondisi yang sudah ada diperiksa sekali di sini.
  inviterObserver = createInviterObserver();
  syncInviterSection();

  async function linkGuestAccess(guestId) {
    try {
      await window.authReady;
      let user = window.auth.currentUser;

      // Never replace an active password-authenticated admin session in another tab.
      if (user && !user.isAnonymous) {
        throw new Error('Sesi Firebase aktif bukan sesi anonim');
      }
      if (!user) {
        user = (await window.firebaseAuth.signInAnonymously(window.auth)).user;
      }

      const accessRef = window.firestore.doc(window.db, 'guest', guestId, 'access', user.uid);
      const accessSnap = await window.firestore.getDoc(accessRef);
      if (!accessSnap.exists()) {
        await window.firestore.setDoc(accessRef, {
          uid: user.uid,
          guestId,
          deviceType: detectDeviceType(),
          createdAt: window.firestore.serverTimestamp(),
        });
      }

      window.validGuest = true;
      window.currentGuestUid = user.uid;
      document.documentElement.dataset.validGuest = 'true';
      return true;
    } catch (err) {
      window.validGuest = false;
      console.warn('Login anonim/link guest tidak tersedia:', err);
      window.showSnackbar?.('Identitas tamu belum aktif. Komentar tetap dapat dibaca.');
      return false;
    }
  }

  async function updateGuestTracking(guestId) {
    if (!window.validGuest) return;

    try {
      const ref = window.firestore.doc(window.db, 'guest', guestId);
      const snap = await window.firestore.getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const now = window.firestore.serverTimestamp();
      const updateData = {
        opened: true,
        lastOpenedAt: now,
        openCount: (data.openCount || 0) + 1,
        deviceType: detectDeviceType(),
        updatedAt: now,
      };
      if (!data.openedAt) updateData.openedAt = now;
      await window.firestore.updateDoc(ref, updateData);
    } catch (err) {
      console.warn('Guest tracking tidak dapat diperbarui:', err);
    }
  }

  async function loadGuestInfo() {
    if (_guestLoaded || !window.db || !window.firestore) return;
    _guestLoaded = true;

    const guestId = getGuestIdFromURL();
    if (!guestId) return;

    try {
      const ref = window.firestore.doc(window.db, 'guest', guestId);
      const snap = await window.firestore.getDoc(ref);
      if (!snap.exists()) return;

      const guest = snap.data();
      window.currentGuest = guest;
      window.currentGuestId = guestId;
      applyGuestPreferences(guest);
      $('#name, #nama').val(guest.name || '').prop('readonly', true);
      $('.guest-name').text(guest.name || '');

      window.guestIdentityReady = linkGuestAccess(guestId);
      if (await window.guestIdentityReady) {
        await updateGuestTracking(guestId);
      }
    } catch (err) {
      console.error('Gagal memuat data tamu:', err);
    }
  }


  /**
   * ================================
   * RSVP: SUBMIT
   * ================================
   */

  async function submitRSVP() {
    if (!window.currentGuestId || !window.db || !window.firestore) return false;
    if (!(await window.guestIdentityReady) || !window.validGuest) {
      window.showSnackbar('Identitas tamu belum aktif. Silakan coba lagi.');
      return false;
    }

    const guestId = window.currentGuestId;
    const name = window.currentGuest?.name || "";
    const status = $("input[name='confirm']:checked").val();
    let count = Number($("#people").val() || 1);

    if (status === "no") count = 0;

    const now = window.firestore.serverTimestamp();
    const device = detectDeviceType();

    try {
      // 1. Save to RSVP
      await window.firestore.addDoc(
        window.firestore.collection(window.db, "rsvp"),
        {
          guestId,
          ownerUid: window.auth.currentUser.uid,
          name,
          status,
          count,
          deviceType: device,
          createdAt: now,
        }
      );

      // 2. Update GUEST
      await window.firestore.updateDoc(
        window.firestore.doc(window.db, "guest", guestId),
        {
          rsvpStatus: status,
          rsvpCount: count,
          updatedAt: now,
        }
      );

      window.currentGuest.rsvpStatus = status;
      window.currentGuest.rsvpCount = count;

      // ✅ UPDATE UI LANGSUNG
      renderRSVPDescription(status, count);
      $(".rsvp-description").show();
      $(".rsvp-form").hide();
      // ✅ Tunda preload biar tidak niban UI
      // setTimeout(() => {
      //   preloadRSVP();
      // }, 1200);

      window.showSnackbar("Terima kasih sudah konfirmasi!");
      return true;
    } catch (err) {
      console.error("❌ RSVP error", err);
      window.showSnackbar("Gagal mengirim RSVP");
      return false;
    }
  }

  $("#rsvp-form-data").on("submit", async function (e) {
    e.preventDefault();
    const ok = await submitRSVP();
    if (!ok) return;

  $(".rsvp-form").fadeOut(300, function () {
    $(".rsvp-description").fadeIn(300);
  });
});

$(".action-rsvp").on("click", function () {
  $(".rsvp-description").hide();
  $(".rsvp-form").fadeIn(250);
});

/* ================================
  PRELOAD RSVP
================================ */

async function preloadRSVP() {
  const data = window.currentGuest;
  if (!data?.rsvpStatus || data.rsvpStatus === 'pending') return;

  if (data.rsvpStatus === 'yes') {
    $("input[value='yes']").prop('checked', true);
    $('.rsvp-confirm-btn.going').addClass('active');
    $('#people').val(data.rsvpCount || 1);
    $('.rsvp-amount-wrap').addClass('open');
  } else {
    $("input[value='no']").prop('checked', true);
    $('.rsvp-confirm-btn.not-going').addClass('active');
    $('.rsvp-amount-wrap').removeClass('open');
  }

  renderRSVPDescription(data.rsvpStatus, data.rsvpCount || 0);
  $('.rsvp-description').show();
  $('.rsvp-form').hide();
}

/* ================================
  RENDER STATUS UI
================================ */

function renderRSVPDescription(status, count) {
  const iconEl = document.querySelector(".rsvp-message-title i");
  const titleEl = document.querySelector(".rsvp-message-title");
  const descEl = document.querySelector(".rsvp-message-text");
  const statusEl = document.querySelector(".status-title-text");

  if (!iconEl || !titleEl || !descEl) {
    console.warn("⚠️ Elemen status UI belum ada di DOM");
    return;
  }

  if (status === "yes") {
    iconEl.className = "icon-present-rsvp";
    titleEl.childNodes[1].nodeValue = "Akan Hadir";
    statusEl.textContent = "Akan Hadir";
    descEl.textContent = `Anda hadir dengan ${count} orang. Sampai bertemu!`;
  } else {
    iconEl.className = "icon-unpresent-rsvp";
    titleEl.childNodes[1].nodeValue = "Tidak Hadir";
    statusEl.textContent = "Tidak Hadir";
    descEl.textContent = "Terima kasih sudah memberi kabar.";
  }
}


  /**
   * ================================
   * LIMIT PEOPLE BY maxGuests
   * ================================
   */

  $(".toggle-btn.plus").on("click", function () {
    let val = parseInt($("#people").val(), 10);
    const max = window.currentGuest?.maxGuests || 1;

    if (val < max) {
      $("#people").val(val + 1);
    } else {
      window.showSnackbar(`Maksimal ${max} orang`);
    }
  });

  $(".toggle-btn.minus").on("click", function () {
    let val = parseInt($("#people").val(), 10);
    if (val > 1) $("#people").val(val - 1);
  });

  /**
   * =======================================
   * SETUP UI DINAMIS SETELAH GUEST LOADED
   * =======================================
   */
  function applyDynamicRSVPUI() {
    if (!window.currentGuest) return;

    const guest = window.currentGuest;

    $("#name, #nama").val(guest.name || "").prop("readonly", true);

    const max = guest.maxGuests || 1;
    $("#people").attr("max", max);

    if (!guest.rsvpStatus || guest.rsvpStatus === "pending") {
      $("input[name='confirm'][value='yes']").prop("checked", true);
      $(".rsvp-confirm-btn.going").addClass("active");
      $("#people").val(1);
      $(".rsvp-amount-wrap").addClass("open");
      return;
    }
  }

  /**
   * =======================================
   * TOMBOL “UBAH KEHADIRAN”
   * =======================================
   */
  $(".action-rsvp").on("click", function () {
    $(".rsvp-description").hide();
    $(".rsvp-form").fadeIn(250);
  });

  /**
   * =======================================
   * OVERRIDE preloadRSVP → auto-render UI
   * =======================================
   */
  const _originalPreloadRSVP = preloadRSVP;
  preloadRSVP = async function () {
    await _originalPreloadRSVP();

    // ✅ Setelah data RSVP diload → render UI nya
    if (window.currentGuest && window.currentGuest.rsvpStatus) {
      renderRSVPDescription(
        window.currentGuest.rsvpStatus,
        window.currentGuest.rsvpCount
      );
    }
  };

  // Scroll lock helpers for modals
  function lockBodyScroll() {
    const rightSide = document.querySelector(".right-side");
    if (rightSide) {
      rightSide.style.overflow = "hidden";
      rightSide.style.overflowY = "hidden";
      rightSide.style.overscrollBehavior = "none";
    }
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  }

  function unlockBodyScroll() {
    const rightSide = document.querySelector(".right-side");
    if (rightSide) {
      rightSide.style.overflowY = "auto";
      rightSide.style.overflowX = "hidden";
      rightSide.style.overscrollBehavior = "";
      void rightSide.offsetHeight; // force reflow
    }
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  }


/* ==========================================================
   STICKER POPUP MANAGER — FIXED VERSION (NO ARIA WARNING)
   ========================================================== */

const StickerPopupManager = {
  popup: null,
  grid: null,
  chooseButton: null,
  selectedSticker: null,

  stickerList: [
    'assets/images/sticker/stc-a-1.gif',
    'assets/images/sticker/stc-a-2.gif',
    'assets/images/sticker/stc-a-3.gif',
    'assets/images/sticker/stc-a-4.gif',
    'assets/images/sticker/stc-a-5.gif',
    'assets/images/sticker/stc-a-6.gif',
    'assets/images/sticker/stc-a-7.gif',
    'assets/images/sticker/stc-a-8.gif',
    'assets/images/sticker/stc-a-9.gif',
    'assets/images/sticker/stc-a-10.gif',
    'assets/images/sticker/stc-a-11.gif',
    'assets/images/sticker/stc-a-12.gif',
    'assets/images/sticker/stc-a-13.gif',
    'assets/images/sticker/stc-a-14.gif',
    'assets/images/sticker/stc-a-15.gif',
    'assets/images/sticker/stc-a-16.gif',
    'assets/images/sticker/stc-a-17.gif',
    'assets/images/sticker/stc-a-18.gif',
  ],

  init() {
    this.popup = document.getElementById("stickerPopup");
    this.grid = document.getElementById("stickerGrid");
    this.chooseButton = document.getElementById("chooseStickers");

    if (!this.popup || !this.grid || !this.chooseButton) {
      console.warn("⚠️ StickerPopupManager: element popup tidak ditemukan");
      return;
    }

    // tombol buka popup
    $(document).on("click", ".btn-sticker", () => this.open());

    // tombol close
    $(".popup-close").on("click", () => this.close());

    // pilih sticker
    $(document).on("click", ".sticker-item", (e) => {
      const src = e.currentTarget.dataset.src;
      this.select(src, e.currentTarget);
    });

    // konfirmasi memilih
    $("#chooseStickers").on("click", () => this.apply());

    console.log("✅ StickerPopupManager Initialized");
  },

  /* ===== OPEN POPUP ===== */
  open() {
    this.renderGrid();

    this.popup.classList.add("open");
    this.popup.removeAttribute("inert");

    // Hilangkan fokus agar tidak ada warning
    document.activeElement?.blur();
    this.popup.setAttribute("tabindex", "-1");
    this.popup.focus();

    // Lock background scrolling while popup is open
    lockBodyScroll();
  },

  close() {
    document.activeElement?.blur();

    this.popup.classList.remove("open");
    this.popup.setAttribute("inert", "");

    this.selectedSticker = this.selectedSticker || null;

    // Restore background scrolling
    unlockBodyScroll();
  },

  /* ===== RENDER GRID ===== */
  renderGrid() {
    const randomList = [...this.stickerList]
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

    this.grid.innerHTML = randomList
      .map(src => `
        <div class="sticker-item ${this.selectedSticker === src ? 'selected' : ''}" data-src="${src}">
          <img src="${src}">
        </div>
      `)
      .join("");
  },

  /* ===== SELECT STICKER (single) ===== */
  select(src, element) {
    this.selectedSticker = src;

    // hapus highlight sebelumnya
    document.querySelectorAll(".sticker-item")
      .forEach(i => i.classList.remove("selected"));

    // highlight baru
    element.classList.add("selected");
  },

  /* ===== APPLY TO COMMENT FORM ===== */
  apply() {
    if (!this.selectedSticker) {
      window.showSnackbar("Pilih 1 sticker dulu");
      return;
    }

    const container = document.getElementById("selectedStickers");
    container.innerHTML = `
      <div class="selected-sticker-item" data-src="${this.selectedSticker}">
        <img src="${this.selectedSticker}">
        <button type="button" class="remove-sticker"><i class="icon-times"></i></button>
      </div>
    `;

    this.close();
  }, // ✅ JANGAN LUPA KOMA DI SINI!
};

$(document).on("click", ".remove-sticker", function (e) {
  e.preventDefault();
  e.stopPropagation();
  $(this).parent().remove();
});

/* ===== INIT ===== */
document.addEventListener("mainInitComplete", () => StickerPopupManager.init());
document.addEventListener("DOMContentLoaded", () => StickerPopupManager.init());


/* ======================================================
  COMMENT / WISH MANAGER — SIMPAN & RENDER
   ====================================================== */

  const WishManager = {
    async loadCommentSettings() {
      let allowed = false;
      try {
        const snap = await window.firestore.getDoc(
          window.firestore.doc(window.db, 'settings', 'comments')
        );
        allowed = snap.exists() && snap.data().allowPublicComments === true;
      } catch (err) {
        console.warn('Pengaturan komentar memakai default OFF:', err);
      }
      window.allowPublicComments = allowed;
      const canComment = allowed || window.validGuest;
      const form = document.getElementById('wish-form');
      form?.querySelectorAll('textarea, button[type="submit"], .btn-sticker')
        .forEach((control) => { control.disabled = !canComment; });
      if (!canComment && form) {
        form.dataset.commentNotice = 'Komentar hanya untuk tamu dengan link undangan valid.';
      } else if (form) {
        delete form.dataset.commentNotice;
      }
      return allowed;
    },

    async submitWish() {
      if (!window.db || !window.firestore) return;

      const name = $('#nama').val().trim();
      const comment = $('#pesan').val().trim();
      const stickerSrc = $('#selectedStickers .selected-sticker-item img').attr('src') || '';
      const stickerFile = stickerSrc.split('/').pop() || '';
      const stickerAllowed = !stickerFile || /^stc-a-([1-9]|1[0-8])\.gif$/.test(stickerFile);

      if (!window.allowPublicComments && !window.validGuest) {
        window.showSnackbar('Komentar hanya untuk tamu dengan link undangan valid');
        return;
      }
      if (!name || !comment) {
        window.showSnackbar('Nama & Ucapan wajib diisi');
        return;
      }
      if (name.length > 100 || comment.length > 2000 || !stickerAllowed) {
        window.showSnackbar('Ucapan atau sticker tidak valid');
        return;
      }

      if (window.currentGuestId) await window.guestIdentityReady;
      const user = window.auth?.currentUser;

      try {
        await window.firestore.addDoc(
          window.firestore.collection(window.db, 'comments'),
          {
            guestId: window.validGuest ? window.currentGuestId : '',
            authorUid: user?.uid || '',
            name,
            comment,
            sticker: stickerFile,
            createdAt: window.firestore.serverTimestamp(),
          }
        );

        window.showSnackbar('Ucapan berhasil dikirim!');
        $('#wish-form')[0].reset();
        if (window.currentGuest) $('#nama').val(window.currentGuest.name || '').prop('readonly', true);
        $('#selectedStickers').empty();
        await this.loadWishes();
      } catch (err) {
        console.error('Gagal kirim ucapan:', err);
        window.showSnackbar('Komentar belum diizinkan atau gagal dikirim');
      }
    },

    /* ============================
      LOAD WISHES (ORDER DESC)
      ============================ */
    async loadWishes() {
      if (!window.db || !window.firestore) return;
      try {
        const q = window.firestore.query(
          window.firestore.collection(window.db, 'comments'),
          window.firestore.orderBy('createdAt', 'desc')
        );
        const snap = await window.firestore.getDocs(q);
        const list = await Promise.all(snap.docs.map(async (commentDoc) => {
          const item = {
            id: commentDoc.id,
            ...commentDoc.data(),
            reactions: [],
            replyReactions: [],
          };
          try {
            const [commentReactions, replyReactions] = await Promise.all([
              window.firestore.getDocs(
                window.firestore.collection(window.db, 'comments', commentDoc.id, 'reactions')
              ),
              window.firestore.getDocs(
                window.firestore.collection(window.db, 'comments', commentDoc.id, 'replyReactions')
              ),
            ]);
            item.reactions = commentReactions.docs.map((reactionDoc) => reactionDoc.data());
            item.replyReactions = replyReactions.docs.map((reactionDoc) => reactionDoc.data());
          } catch (err) {
            console.warn('Reaksi tidak dapat dimuat:', err);
          }
          return item;
        }));
        this.render(list);
      } catch (err) {
        console.error('Komentar tidak dapat dimuat:', err);
      }
    },

    async toggleReaction(commentId, type, target = 'comment') {
      if (!(await window.guestIdentityReady) || !window.validGuest) {
        window.showSnackbar('Reaksi hanya untuk tamu dengan link undangan valid');
        return;
      }
      const uid = window.auth.currentUser.uid;
      const reactionCollection = target === 'reply' ? 'replyReactions' : 'reactions';
      const reactionRef = window.firestore.doc(
        window.db, 'comments', commentId, reactionCollection, `${uid}_${type}`
      );
      try {
        const existing = await window.firestore.getDoc(reactionRef);
        if (existing.exists()) {
          await window.firestore.deleteDoc(reactionRef);
        } else {
          await window.firestore.setDoc(reactionRef, {
            uid,
            guestId: window.currentGuestId,
            type,
            createdAt: window.firestore.serverTimestamp(),
          });
        }
        await this.loadWishes();
      } catch (err) {
        console.error('Gagal mengubah reaksi:', err);
        window.showSnackbar('Reaksi gagal diperbarui');
      }
    },

    /* ============================
      RENDER WISHES TO UI
      ============================ */
    render(list) {
      const container = document.querySelector('.wish-list');
      if (!container) return;
      container.replaceChildren();
      this.allWishes = list;

      if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-wish';
        empty.textContent = 'Belum ada ucapan.';
        container.appendChild(empty);
        return;
      }

      const header = document.createElement('div');
      header.className = 'wish-comment-counter-header';
      const count = document.createElement('h2');
      count.className = 'wish-comment-count';
      count.textContent = `(${list.length}) Ucapan & Doa`;
      const viewAll = document.createElement('button');
      viewAll.type = 'button';
      viewAll.className = 'wish-comment-action';
      viewAll.textContent = 'Lihat semua';
      viewAll.addEventListener('click', () => this.showWishPopup());
      header.append(count, viewAll);
      container.appendChild(header);
      list.forEach((item) => container.appendChild(this.createWishElement(item)));
    },

    validSticker(sticker) {
      return typeof sticker === 'string'
        && (/^stc-a-([1-9]|1[0-8])\.gif$/.test(sticker) || /^stc-[1-5]\.png$/.test(sticker));
    },

    createWishElement(item) {
      const element = document.createElement('article');
      element.className = 'wish-item';
      element.dataset.commentId = String(item.id || '');

      const header = document.createElement('div');
      header.className = 'wish-comment-header';
      const name = document.createElement('div');
      name.className = 'wish-comment-name';
      const icon = document.createElement('i');
      icon.className = 'icon-guest';
      name.append(icon, document.createTextNode(String(item.name || 'Tamu')));
      header.appendChild(name);

      const text = document.createElement('div');
      text.className = 'wish-comment-text';
      text.textContent = String(item.comment || '');
      element.append(header, text);

      if (this.validSticker(item.sticker)) {
        const sticker = document.createElement('div');
        sticker.className = 'wish-sticker';
        const image = document.createElement('img');
        image.src = `assets/images/sticker/${item.sticker}`;
        image.alt = 'Sticker komentar';
        sticker.appendChild(image);
        element.appendChild(sticker);
      }

      if (item.replyText || this.validSticker(item.replySticker)) {
        const reply = document.createElement('div');
        reply.className = 'wish-admin-reply';

        const replyHead = document.createElement('div');
        replyHead.className = 'wish-admin-reply__head';

        const avatar = document.createElement('span');
        avatar.className = 'wish-admin-reply__avatar';
        avatar.setAttribute('aria-hidden', 'true');
        const avatarIcon = document.createElement('i');
        avatarIcon.className = 'wish-admin-reply__avatar-icon';
        avatar.appendChild(avatarIcon);

        const identity = document.createElement('div');
        identity.className = 'wish-admin-reply__identity';
        const label = document.createElement('strong');
        label.textContent = 'Arief & Soya';
        
        identity.append(label);
        replyHead.append(avatar, identity);
        reply.appendChild(replyHead);

        if (item.replyText) {
          const replyText = document.createElement('p');
          replyText.textContent = String(item.replyText);
          reply.appendChild(replyText);
        }
        if (this.validSticker(item.replySticker)) {
          const image = document.createElement('img');
          image.src = `assets/images/sticker/${item.replySticker}`;
          image.alt = 'Sticker balasan admin';
          reply.appendChild(image);
        }
        reply.appendChild(this.createReactionBar(item, 'reply'));
        element.appendChild(reply);
      }

      element.appendChild(this.createReactionBar(item));
      const time = this.createTimeElement(item.createdAt);
      if (time) element.appendChild(time);
      return element;
    },

    createReactionBar(item, target = 'comment') {
      const types = [
        ['heart', '❤️'], ['like', '👍'], ['celebrate', '🎉'],
        ['pray', '🙏'], ['smile', '😄'],
      ];
      const bar = document.createElement('div');
      bar.className = `wish-reactions wish-reactions--${target}`;
      bar.setAttribute(
        'aria-label',
        target === 'reply' ? 'Reaksi untuk balasan admin' : 'Reaksi untuk komentar'
      );
      const uid = window.auth?.currentUser?.uid;
      const reactionList = target === 'reply' ? item.replyReactions : item.reactions;
      types.forEach(([type, emoji]) => {
        const matching = (reactionList || []).filter((reaction) => reaction.type === type);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wish-reaction';
        button.classList.toggle('is-active', matching.some((reaction) => reaction.uid === uid));
        button.setAttribute('aria-label', `Reaksi ${type}`);
        button.setAttribute('aria-pressed', String(matching.some((reaction) => reaction.uid === uid)));
        button.textContent = `${emoji}${matching.length ? ` ${matching.length}` : ''}`;
        button.addEventListener('click', () => this.toggleReaction(item.id, type, target));
        bar.appendChild(button);
      });
      return bar;
    },

    showWishPopup() {
      const popup = document.getElementById('wishPopup');
      const popupList = document.getElementById('wishPopupList');
      if (!popup || !popupList) return;
      popupList.replaceChildren();

      if (!this.allWishes?.length) {
        const empty = document.createElement('div');
        empty.className = 'wish-popup-empty';
        empty.textContent = 'Belum ada ucapan.';
        popupList.appendChild(empty);
      } else {
        this.allWishes.forEach((item) => popupList.appendChild(this.createWishElement(item)));
      }

      popup.classList.add('open');
      popup.removeAttribute('inert');
      document.activeElement?.blur();
      lockBodyScroll();
    },

    closeWishPopup() {
      const popup = document.getElementById("wishPopup");
      if (popup) {
        popup.classList.remove("open");
        popup.setAttribute("inert", "");
        // Restore scrolling when popup closes
        unlockBodyScroll();
      }
    },

    createTimeElement(ts) {
      if (!ts) return null;
      const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      if (Number.isNaN(date.getTime())) return null;
      const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
      let label = 'baru saja';
      if (seconds >= 31536000) label = `${Math.floor(seconds / 31536000)} tahun yang lalu`;
      else if (seconds >= 2592000) label = `${Math.floor(seconds / 2592000)} bulan yang lalu`;
      else if (seconds >= 604800) label = `${Math.floor(seconds / 604800)} minggu yang lalu`;
      else if (seconds >= 86400) label = `${Math.floor(seconds / 86400)} hari yang lalu`;
      else if (seconds >= 3600) label = `${Math.floor(seconds / 3600)} jam yang lalu`;
      else if (seconds >= 60) label = `${Math.floor(seconds / 60)} menit yang lalu`;

      const time = document.createElement('time');
      time.className = 'wish-comment-time';
      time.dateTime = date.toISOString();
      time.title = date.toLocaleString('id-ID');
      time.textContent = label;
      return time;
    }
  };
  

  $("#wish-form").on("submit", function (e) {
    e.preventDefault();
    WishManager.submitWish();
  });

  // Setup wish popup close button
  $(document).on("click", "#wishPopup .popup-close", function() {
    WishManager.closeWishPopup();
  });

  // Close popup when clicking outside
  $(document).on("click", function(e) {
    const popup = document.getElementById("wishPopup");
    if (popup && $(e.target).is("#wishPopup")) {
      WishManager.closeWishPopup();
    }
  });

/**
 * ================================
 * FIRE ON MAIN INIT COMPLETE
 * ================================
 */

  document.addEventListener("DOMContentLoaded", () => {
    BacksoundManager.init();

    const circle = document.getElementById("audioCircle");
    if (circle) {
      circle.addEventListener("click", (e) => {
        e.preventDefault();
        const audio = BacksoundManager.audio;
        const icon = circle.querySelector("i");
        if (!audio) return;

        if (audio.paused) {
          // play immediately on user gesture, keep rotation position
          BacksoundManager.userGesture();
          circle.classList.add("playing");
          circle.style.animationPlayState = "running";
          if (icon) {
            icon.classList.remove("icon-audio-off");
            icon.classList.add("icon-audio");
          }
        } else {
          // pause without resetting rotation
          try { audio.pause(); } catch (err) { console.warn("Pause failed:", err); }
          circle.classList.add("playing");
          circle.style.animationPlayState = "paused";
          if (icon) {
            icon.classList.remove("icon-audio");
            icon.classList.add("icon-audio-off");
          }
        }
      });
    }
  });

  document.addEventListener("mainInitComplete", async () => {
    if (!window.db || !window.firestore) {
      await new Promise((resolve) => window.addEventListener('firebase:ready', resolve, { once: true }));
    }

    await loadGuestInfo();
    await WishManager.loadCommentSettings();
    await WishManager.loadWishes();
    applyDynamicRSVPUI();

    if (window.currentGuest?.rsvpStatus && window.currentGuest.rsvpStatus !== 'pending') {
      $('.rsvp-description').show();
      $('.rsvp-form').hide();
    } else {
      $('.rsvp-description').hide();
      $('.rsvp-form').show();
    }
    await preloadRSVP();
  });

  /**
   * FIX: Audio Circle Visibility on Mobile Scroll
   * Memastikan audio circle tetap visible saat scroll di mobile
   */
  (function fixAudioCircleOnMobile() {
    const audioCircle = document.getElementById('audioCircle');
    if (!audioCircle) return;

    // Force reflow untuk memastikan fixed positioning bekerja
    function ensureAudioCircleVisible() {
      if (audioCircle) {
        // Force GPU acceleration
        audioCircle.style.transform = 'translate3d(0, 0, 0)';
        audioCircle.style.webkitTransform = 'translate3d(0, 0, 0)';
        
        // Ensure visibility
        audioCircle.style.visibility = 'visible';
        audioCircle.style.opacity = '0.8';
      }
    }

    // Run on load
    ensureAudioCircleVisible();

    // Run on scroll (throttled)
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(ensureAudioCircleVisible, 100);
    }, { passive: true });

    // Run on resize
    window.addEventListener('resize', ensureAudioCircleVisible, { passive: true });

    // Run on orientation change (mobile)
    window.addEventListener('orientationchange', function() {
      setTimeout(ensureAudioCircleVisible, 300);
    });

    console.log('✅ Audio circle mobile fix initialized');
  })();
  
})();



/* Footer heart: a lightweight Canvas cupid sequence.
   It is built only after the footer-heart click and uses no Font Awesome,
   external artwork, or demo controls. */
const CupidHeartAnimation = {
  overlay: null,
  canvas: null,
  context: null,
  frame: null,
  dismissTimer: null,
  soundTimers: [],
  audioContext: null,
  particles: [],
  startTime: 0,
  lastFrameTime: 0,
  duration: 4200,
  reducedMotion: false,

  init() {
    const trigger = document.querySelector('.sintia-foot-love');
    if (!trigger) return;

    trigger.addEventListener('click', () => this.play());
  },

  build() {
    const overlay = document.createElement('div');
    overlay.className = 'cupid-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<canvas class="cupid-canvas" aria-hidden="true"></canvas>';
    document.body.appendChild(overlay);

    this.canvas = overlay.querySelector('.cupid-canvas');
    this.context = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resizeCanvas(), { passive: true });
    this.resizeCanvas();
    return overlay;
  },

  resizeCanvas() {
    if (!this.canvas || !this.context) return;

    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  },

  getAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    try {
      this.audioContext ??= new AudioContext();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return this.audioContext;
    } catch {
      return null;
    }
  },

  playTone(frequency, duration, { endFrequency = frequency, type = 'sine', volume = 0.02, delay = 0 } = {}) {
    const context = this.audioContext;
    if (!context || context.state !== 'running') return;

    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(duration * 0.2, 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  },

  playBowPull() {
    this.playTone(120, 0.5, { endFrequency: 350, type: 'sine', volume: 0.025 });
  },

  playArrowLaunch() {
    this.playTone(800, 0.25, { endFrequency: 150, type: 'triangle', volume: 0.035 });
  },

  playHeartImpact() {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.playTone(frequency, 1.2, {
        endFrequency: frequency * 0.96,
        type: 'sine',
        volume: 0.022,
        delay: index * 0.06
      });
    });
  },

  clearSoundTimers() {
    this.soundTimers.forEach((timer) => clearTimeout(timer));
    this.soundTimers = [];
  },

  scheduleSound(callback, delay) {
    this.soundTimers.push(setTimeout(callback, delay));
  },

  clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  },

  lerp(start, end, amount) {
    return start + (end - start) * amount;
  },

  easeOutCubic(amount) {
    return 1 - Math.pow(1 - this.clamp(amount, 0, 1), 3);
  },

  drawHeart(context, x, y, size, pierced, pulse, shake = 0) {
    context.save();
    // Impact shake, as in the reference sequence.
    context.translate(x + (Math.random() - .5) * shake, y + (Math.random() - .5) * shake);
    context.scale(pulse, pulse);
    context.shadowColor = pierced ? 'rgba(205, 68, 81, .75)' : 'rgba(101, 11, 4, .45)';
    context.shadowBlur = pierced ? 34 : 20;

    const gradient = context.createRadialGradient(-size * .22, -size * .25, size * .08, 0, 0, size);
    if (pierced) {
      gradient.addColorStop(0, '#ffd0c6');
      gradient.addColorStop(.4, '#d9424f');
      gradient.addColorStop(1, '#5a0a05');
    } else {
      gradient.addColorStop(0, '#ffd9d2');
      gradient.addColorStop(.4, '#cb4b55');
      gradient.addColorStop(1, '#650b04');
    }
    context.fillStyle = gradient;
    context.beginPath();
    const scale = size / 15;
    context.moveTo(0, -5 * scale);
    context.bezierCurveTo(-10 * scale, -18 * scale, -20 * scale, -2 * scale, 0, 15 * scale);
    context.bezierCurveTo(20 * scale, -2 * scale, 10 * scale, -18 * scale, 0, -5 * scale);
    context.closePath();
    context.fill();

    // Surface highlight.
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255, 255, 255, .35)';
    context.beginPath();
    context.ellipse(-size * .3, -size * .3, size * .18, size * .09, -Math.PI / 4, 0, Math.PI * 2);
    context.fill();

    // The arrow embeds through the heart: shaft entering left, tip exiting right.
    if (pierced) {
      context.save();
      context.rotate(.12);

      context.save();
      context.translate(size * .35, 0);
      context.strokeStyle = '#d89c40';
      context.lineWidth = Math.max(3, size * .045);
      context.lineCap = 'round';
      context.shadowColor = 'rgba(255, 222, 143, .7)';
      context.shadowBlur = 6;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(size * .28, 0);
      context.stroke();
      context.fillStyle = '#c64049';
      context.beginPath();
      context.moveTo(size * .28, -size * .07);
      context.lineTo(size * .42, 0);
      context.lineTo(size * .28, size * .07);
      context.closePath();
      context.fill();
      context.restore();

      context.save();
      context.translate(-size * .8, 0);
      this.drawArrowGraphic(context, size * .8);
      context.restore();

      context.restore();
    }
    context.restore();
  },

  drawArrowGraphic(context, length = 80) {
    context.save();
    // Gold shaft.
    context.strokeStyle = '#d89c40';
    context.lineWidth = Math.max(2.5, length * .045);
    context.lineCap = 'round';
    context.shadowColor = '#ffde8f';
    context.shadowBlur = 6;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(length, 0);
    context.stroke();

    // Heart-shaped arrowhead.
    const head = Math.max(7, length * .14);
    context.fillStyle = '#c64049';
    context.shadowColor = 'rgba(198, 64, 73, .85)';
    context.shadowBlur = 10;
    context.beginPath();
    context.moveTo(length + head, 0);
    context.bezierCurveTo(length + head * 1.2, -head * .8, length + head * .2, -head, length - head * .2, -head * .3);
    context.bezierCurveTo(length - head * .6, -head, length - head * 1.2, -head * .4, length - head * .2, 0);
    context.bezierCurveTo(length - head * 1.2, head * .4, length - head * .6, head, length - head * .2, head * .3);
    context.bezierCurveTo(length + head * .2, head, length + head * 1.2, head * .8, length + head, 0);
    context.fill();

    // Fletching.
    const fletch = Math.max(7, length * .16);
    context.fillStyle = '#f4e1c3';
    context.shadowBlur = 0;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-fletch, -fletch * .66);
    context.lineTo(-fletch * .5, 0);
    context.lineTo(-fletch, fletch * .66);
    context.closePath();
    context.fill();
    context.restore();
  },

  drawArrow(context, x, y, angle, length = 80) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    this.drawArrowGraphic(context, length);
    context.restore();
  },

  drawWing(context, side, sweep) {
    context.save();
    context.scale(side, 1);
    context.rotate(-.3 + sweep * side);
    const gradient = context.createLinearGradient(0, -60, 80, 20);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(.7, '#f7e6cb');
    gradient.addColorStop(1, '#d8a65c');
    context.fillStyle = gradient;
    context.shadowColor = 'rgba(255, 255, 255, .55)';
    context.shadowBlur = 10;
    context.beginPath();
    context.moveTo(-10, -30);
    context.bezierCurveTo(-50, -80, -90, -40, -100, 10);
    context.bezierCurveTo(-80, 30, -50, 40, -10, -10);
    context.closePath();
    context.fill();

    // Feather strands.
    context.strokeStyle = 'rgba(216, 166, 92, .95)';
    context.lineWidth = 1.5;
    context.shadowBlur = 0;
    context.beginPath();
    context.moveTo(-70, -30);
    context.quadraticCurveTo(-50, 0, -20, -10);
    context.moveTo(-85, -10);
    context.quadraticCurveTo(-60, 15, -30, 0);
    context.stroke();
    context.restore();
  },

  drawAngel(context, x, y, scale, pull, time, targetX, targetY) {
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    const wingSweep = Math.sin(time * .008) * .18;
    this.drawWing(context, -1, wingSweep);

    // Halo.
    context.save();
    context.strokeStyle = '#ffde8f';
    context.lineWidth = 3.5;
    context.shadowColor = '#ffde8f';
    context.shadowBlur = 13;
    context.beginPath();
    context.ellipse(0, -70, 22, 7, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    // Dress and gold trim.
    context.fillStyle = '#fffdf8';
    context.strokeStyle = '#d8a65c';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(-15, -20);
    context.quadraticCurveTo(-28, 22, -34, 55);
    context.quadraticCurveTo(0, 64, 34, 55);
    context.quadraticCurveTo(28, 22, 15, -20);
    context.closePath();
    context.fill();
    context.stroke();
    context.strokeStyle = 'rgba(216, 166, 92, .85)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-21, 28);
    context.quadraticCurveTo(0, 35, 21, 28);
    context.stroke();

    // Full face from the supplied Canvas illustration: skin, curls, eyes, blush, and smile.
    context.fillStyle = '#fed7aa';
    context.beginPath();
    context.arc(0, -42, 20, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#d39438';
    for (let angle = -Math.PI; angle < .1; angle += .5) {
      context.beginPath();
      context.arc(Math.cos(angle) * 20, -42 + Math.sin(angle) * 20, 6, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = '#9a3412';
    context.beginPath();
    context.arc(-6, -44, 2.35, 0, Math.PI * 2);
    context.arc(8, -44, 2.35, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(230, 99, 117, .52)';
    context.beginPath();
    context.arc(-11, -37, 4, 0, Math.PI * 2);
    context.arc(13, -37, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#9a3412';
    context.lineWidth = 1.8;
    context.lineCap = 'round';
    context.beginPath();
    context.arc(1, -37, 5, .15 * Math.PI, .85 * Math.PI);
    context.stroke();

    this.drawWing(context, 1, wingSweep);
    const aim = Math.atan2(targetY - y, targetX - x) * .18;
    const pullDistance = pull * 25;
    context.save();
    context.rotate(aim);
    context.strokeStyle = '#d89c40';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.shadowColor = '#ffde8f';
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(34, 0, 44, -.45 * Math.PI, .45 * Math.PI);
    context.stroke();

    const topX = 34 + Math.cos(-.45 * Math.PI) * 44;
    const topY = Math.sin(-.45 * Math.PI) * 44;
    const bottomX = 34 + Math.cos(.45 * Math.PI) * 44;
    const bottomY = Math.sin(.45 * Math.PI) * 44;

    // Bow limb tips.
    context.fillStyle = '#c64049';
    context.beginPath();
    context.arc(topX, topY, 5, 0, Math.PI * 2);
    context.arc(bottomX, bottomY, 5, 0, Math.PI * 2);
    context.fill();

    // Bowstring.
    context.strokeStyle = 'rgba(255, 253, 248, .95)';
    context.lineWidth = 1.5;
    context.shadowBlur = 0;
    context.beginPath();
    context.moveTo(topX, topY);
    context.lineTo(34 - pullDistance, 0);
    context.lineTo(bottomX, bottomY);
    context.stroke();

    if (pull < .99) this.drawArrow(context, 34 - pullDistance, 0, 0, 62);

    // Hands: one on the grip, one on the string.
    context.fillStyle = '#fed7aa';
    context.beginPath();
    context.arc(34, 5, 6, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(34 - pullDistance, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.restore();
  },

  createImpactBurst(x, y, scale = 1) {
    const colors = ['#c64049', '#ffde8f', '#f2a3b3', '#ffffff'];
    for (let index = 0; index < 40; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 8 + 2) * 60 * scale;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (Math.random() * 5 + 2) * scale,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: Math.random() * 1.2 + .6,
        type: 'spark'
      });
    }

    // Floating mini hearts.
    for (let index = 0; index < 12; index += 1) {
      this.particles.push({
        x: x + (Math.random() - .5) * 30 * scale,
        y: y + (Math.random() - .5) * 30 * scale,
        vx: (Math.random() - .5) * 3 * 60 * scale,
        vy: (-Math.random() * 4 - 2) * 60 * scale,
        size: (Math.random() * 12 + 10) * scale,
        color: '#c64049',
        life: 1,
        decay: .5,
        type: 'heart'
      });
    }
  },

  // Glowing trail behind the arrow in flight.
  createArrowTrail(x, y, scale = 1) {
    this.particles.push({
      x,
      y: y + (Math.random() - .5) * 6 * scale,
      vx: -Math.random() * 2 * 60 * scale,
      vy: (Math.random() - .5) * 1.5 * 60 * scale,
      size: (Math.random() * 4 + 1) * scale,
      color: '#ffde8f',
      life: .9,
      decay: 1.8,
      type: 'spark'
    });
  },

  drawParticles(context, delta) {
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.life -= particle.decay * delta;
      if (particle.life <= 0) return false;

      context.save();
      context.globalAlpha = Math.max(0, particle.life);
      if (particle.type === 'heart') {
        context.translate(particle.x, particle.y);
        context.fillStyle = particle.color;
        context.shadowColor = '#e8657a';
        context.shadowBlur = 10;
        context.beginPath();
        const scale = particle.size / 10;
        context.moveTo(0, -3 * scale);
        context.bezierCurveTo(-5 * scale, -10 * scale, -12 * scale, -1 * scale, 0, 8 * scale);
        context.bezierCurveTo(12 * scale, -1 * scale, 5 * scale, -10 * scale, 0, -3 * scale);
        context.fill();
      } else {
        context.fillStyle = particle.color;
        context.shadowColor = particle.color;
        context.shadowBlur = 8;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      return true;
    });
  },

  render(currentTime) {
    if (!this.context || !this.canvas || !this.overlay.classList.contains('is-playing')) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const elapsed = currentTime - this.startTime;
    const delta = Math.min((currentTime - this.lastFrameTime) / 1000, .05);
    this.lastFrameTime = currentTime;
    const context = this.context;
    const unit = Math.min(width / 900, height / 520);
    const sceneScale = unit * 1.34;
    const targetX = width * .74;
    const targetY = height * .51;
    const entered = this.easeOutCubic(elapsed / 1250);
    const angelX = this.lerp(-170 * sceneScale, width * .25, entered);
    const angelY = height * .57 + Math.sin(elapsed * .006) * 10 * sceneScale;
    const pull = this.clamp((elapsed - 1400) / 720, 0, 1);
    const launchProgress = this.clamp((elapsed - 2250) / 610, 0, 1);
    const pierced = elapsed >= 2860;
    const fade = elapsed > this.duration - 350 ? this.clamp((this.duration - elapsed) / 350, 0, 1) : 1;

    context.clearRect(0, 0, width, height);
    context.save();
    context.globalAlpha = fade;
    const background = context.createRadialGradient(width * .5, height * .45, 0, width * .5, height * .45, Math.max(width, height) * .68);
    background.addColorStop(0, 'rgba(255, 244, 214, .98)');
    background.addColorStop(1, 'rgba(255, 255, 255, .98)');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const heartbeat = 1 + Math.sin(elapsed * (pierced ? .012 : .006)) * (pierced ? .08 : .05);
    const impactScale = pierced ? 1 + Math.max(0, .35 - (elapsed - 2860) / 620) : 1;
    const shake = pierced ? Math.max(0, 18 * sceneScale * (1 - (elapsed - 2860) / 620)) : 0;
    this.drawHeart(context, targetX, targetY, 110 * sceneScale, pierced, heartbeat * impactScale, shake);
    this.drawAngel(context, angelX, angelY, sceneScale, pull, elapsed, targetX, targetY);

    if (launchProgress > 0 && launchProgress < 1) {
      const startX = angelX + 52 * sceneScale;
      const startY = angelY;
      const arrowX = this.lerp(startX, targetX - 50 * sceneScale, launchProgress);
      const arrowY = this.lerp(startY, targetY, launchProgress);
      this.createArrowTrail(arrowX, arrowY, sceneScale);
      this.drawArrow(context, arrowX, arrowY, Math.atan2(targetY - startY, targetX - startX), 78 * sceneScale);
    }

    if (pierced && !this.hasImpacted) {
      this.hasImpacted = true;
      this.createImpactBurst(targetX, targetY, sceneScale);
    }
    this.drawParticles(context, delta);
    context.restore();

    if (elapsed < this.duration) {
      this.frame = requestAnimationFrame((time) => this.render(time));
    }
  },

  stop() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.dismissTimer);
    this.clearSoundTimers();
    this.overlay?.classList.remove('is-playing');
  },

  play() {
    if (!this.overlay) this.overlay = this.build();
    if (this.overlay.classList.contains('is-playing')) return;

    this.getAudioContext();
    this.clearSoundTimers();
    this.resizeCanvas();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.startTime = performance.now() - (this.reducedMotion ? 2860 : 0);
    this.lastFrameTime = this.startTime;
    this.particles = [];
    this.hasImpacted = false;
    this.overlay.classList.add('is-playing');

    if (this.reducedMotion) {
      this.scheduleSound(() => this.playHeartImpact(), 0);
    } else {
      this.scheduleSound(() => this.playBowPull(), 1400);
      this.scheduleSound(() => this.playArrowLaunch(), 2250);
      this.scheduleSound(() => this.playHeartImpact(), 2860);
    }

    const playDuration = this.reducedMotion ? 900 : this.duration;
    this.frame = requestAnimationFrame((time) => this.render(time));
    this.dismissTimer = setTimeout(() => this.stop(), playDuration);
  }
};

CupidHeartAnimation.init();


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

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (typeof replayHeroAOS === 'function') {
        replayHeroAOS();
      }

      if (typeof AOS !== 'undefined') {
        AOS.refreshHard();
      }
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
    
    // Start countdown
    this.startCountdown();
    
    console.log('✅ Countdown manager initialized for:', this.targetDate.toLocaleString('id-ID'));
  },
    
    /**
     * Start countdown timer
     */
    startCountdown() {
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
    updateCountdown() {
      const now = new Date().getTime();
      const distance = this.targetDate.getTime() - now;
      
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
      // RSVPFormManager.init();
      CountdownManager.init();
      
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
        this.createSnackbarContainer();
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
      lightGallery(galleryElement, {
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

  // Function to restore scrolling when welcome section is hidden
  function restoreScroll() {
    const rightSide = document.querySelector('.right-side');
    
    // Restore scrolling on the main content
    if (rightSide) {
      rightSide.style.overflowY = 'auto';
    }
    
    // Restore scrolling on the body
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
  }

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
const BacksoundManager = {
  audio: null,
  unlocked: false,
  src: "assets/music/backsound.mp3",

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

function runWelcomeExitAnimation() {
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

      $rightSide[0].style.overflowY = "auto";

      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("position");
      document.body.style.removeProperty("height");
      document.body.style.removeProperty("touch-action");

      // Force reflow
      void $rightSide[0].clientHeight;

      // Reset AOS
      setTimeout(() => {
        if (typeof AOS !== "undefined") AOS.refreshHard();
      }, 10);
    }, 800);

  }, 600);
};

/**
 * Handler tombol "Buka Undangan"
 * animasi welcome → sembunyi → aktifin scroll → reset AOS
 */

// ✅ AUTO-CLICK TIMEOUT 10 DETIK
let autoClickTriggered = false;
const autoClickTimeout = setTimeout(() => {
  if (!autoClickTriggered) {
    console.log("⏰ Auto-click triggered after 6 seconds");
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

  // ✅ 2. Delay sedikit biar browser finalize gesture
  setTimeout(() => {
    runWelcomeExitAnimation();
  }, 50);

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

    // Setelah welcome keluar layar - CRITICAL TIMING
    setTimeout(() => {
      // 1. Remove dari DOM completely
      $welcomeSection.css({
        "visibility": "hidden",
        "display": "none",
        "position": "absolute",
        "pointer-events": "none"
      });
      
      // 2. Restore scroll IMMEDIATELY dengan force
      $rightSide[0].style.overflow = 'auto';
      $rightSide[0].style.overflowY = 'auto';
      $rightSide[0].style.overflowX = 'hidden';
      
      // 3. Clear body styles that block scroll
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('touch-action');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('height');
      
      // 4. Force browser reflow - CRITICAL!
      void $rightSide[0].scrollTop;
      void $rightSide[0].clientHeight;
      
      // 5. Trigger pointer events immediately
      $rightSide[0].style.pointerEvents = 'auto';
      
      // 6. AOS refresh dengan minimal delay
      setTimeout(() => {
        replayHeroAOS();
        if (typeof AOS !== "undefined") {
          AOS.refreshHard();
        }
      }, 10);

    }, 800);
  }, 600);
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

  async function updateGuestTracking(guestId) {
    if (!guestId || !window.db || !window.firestore) return;

    try {
      const ref = window.firestore.doc(window.db, "guest", guestId);
      const snap = await window.firestore.getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      const now = window.firestore.serverTimestamp();
      const device = detectDeviceType();

      const updateData = {
        lastOpenedAt: now,
        openCount: (data.openCount || 0) + 1,
        deviceType: device,
        updatedAt: now,
      };

      if (!data.opened) {
        updateData.opened = true;
        updateData.openedAt = now;
      }

      await window.firestore.updateDoc(ref, updateData);

      console.log("✅ guest tracking updated", updateData);
    } catch (err) {
      console.error("❌ tracking update failed:", err);
    }
  }

  async function loadGuestInfo() {
    console.log("🔥 loadGuestInfo() DIPANGGIL");

    if (_guestLoaded) {
      console.log("⛔ loadGuestInfo() ABAI — sudah pernah jalan");
      return;
    }
    _guestLoaded = true;

    const guestId = getGuestIdFromURL();
    console.log("🔍 guestId dari URL:", guestId);

    if (!guestId) {
      console.warn("❌ Tidak ada g= di URL");
      return;
    }

    if (!window.db || !window.firestore) {
      console.warn("⏳ Firebase belum siap → retry...");
      setTimeout(loadGuestInfo, 300);
      return;
    }

    console.log("✅ Firebase siap, ambil data...");

    const ref = window.firestore.doc(window.db, "guest", guestId);
    const snap = await window.firestore.getDoc(ref);

    console.log("📥 FIREBASE SNAP:", snap.exists(), snap.data());

    if (!snap.exists()) {
      console.warn("❌ Guest tidak ditemukan di Firestore!");
      return;
    }

    const guest = snap.data();
    window.currentGuest = guest;
    window.currentGuestId = guestId;

    console.log("✅ Guest ditemukan:", guest);

    // ✅ SEHARUSNYA MUNCUL DI INPUT
    $("#name").val(guest.name).prop("readonly", false);
    $(".guest-name").text(guest.name);
    console.log("✏️ Isi input name:", $("#name").val());

    $(".guest-name").text(guest.name);

    // Tracking
    updateGuestTracking(guestId);
  }


  /**
   * ================================
   * RSVP: SUBMIT
   * ================================
   */

  async function submitRSVP() {
    if (!window.currentGuestId || !window.db || !window.firestore) return;

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
  const guestId = window.currentGuestId;
  if (!guestId) return;

  const q = window.firestore.query(
    window.firestore.collection(window.db, "rsvp"),
    window.firestore.where("guestId", "==", guestId),
    window.firestore.orderBy("createdAt", "desc"),
    window.firestore.limit(1)
  );

  const snap = await window.firestore.getDocs(q);
  if (snap.empty) return;

  const data = snap.docs[0].data();

  if (data.status === "yes") {
    $("input[value='yes']").prop("checked", true);
    $(".rsvp-confirm-btn.going").addClass("active");
    $("#people").val(data.count);
    $(".rsvp-amount-wrap").addClass("open");
  } else {
    $("input[value='no']").prop("checked", true);
    $(".rsvp-confirm-btn.not-going").addClass("active");
    $(".rsvp-amount-wrap").removeClass("open");
  }

  renderRSVPDescription(
    window.currentGuest?.rsvpStatus || data.status,
    window.currentGuest?.rsvpCount || data.count
  );

  $(".rsvp-description").show();
  $(".rsvp-form").hide();

  console.log("✅ RSVP data loaded:", data);
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

    $("#name").val(guest.name || "").prop("readonly", false);

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
    'assets/images/sticker/stc-1.png',
    'assets/images/sticker/stc-2.png',
    'assets/images/sticker/stc-3.png',
    'assets/images/sticker/stc-4.png',
    'assets/images/sticker/stc-5.png',

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
    async submitWish() {
      if (!window.db || !window.firestore) {
        console.warn("⏳ Firebase belum siap");
        return;
      }

      const name = $("#nama").val().trim();
      const comment = $("#pesan").val().trim();

      const stickerDOM = $("#selectedStickers .selected-sticker-item img");
      const sticker = stickerDOM.length ? stickerDOM.attr("src") : ""; 
      // Kita simpan nama file aja
      const stickerFile = sticker ? sticker.split("/").pop() : "";

      if (!name || !comment) {
        window.showSnackbar("Nama & Ucapan wajib diisi");
        return;
      }

      const now = window.firestore.serverTimestamp();

      try {
        await window.firestore.addDoc(
          window.firestore.collection(window.db, "comments"),
          {
            name,
            comment,
            sticker: stickerFile,
            createdAt: now,
            guestId: window.currentGuestId || "",
          }
        );

        window.showSnackbar("Ucapan berhasil dikirim!");

        $("#wish-form")[0].reset();
        $("#selectedStickers").html("");

        // Reload list
        this.loadWishes();

      } catch (err) {
        console.error("❌ Gagal kirim ucapan:", err);
        window.showSnackbar("Gagal mengirim ucapan");
      }
    },

    /* ============================
      LOAD WISHES (ORDER DESC)
      ============================ */
    async loadWishes() {
      if (!window.db || !window.firestore) return;

      const q = window.firestore.query(
        window.firestore.collection(window.db, "comments"),
        window.firestore.orderBy("createdAt", "desc")
      );

      const snap = await window.firestore.getDocs(q);
      this.render(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },

    /* ============================
      RENDER WISHES TO UI
      ============================ */
    render(list) {
      const container = document.querySelector(".wish-list");
      container.innerHTML = "";

      if (!list.length) {
        container.innerHTML = `<p class="empty-wish">Belum ada ucapan.</p>`;
        return;
      }

      container.innerHTML = `<div class="wish-comment-counter-header"><h2 class="wish-comment-count">(${list.length}) Ucapan & Doa</h2><div class="wish-comment-action"><i class="icon-see-wish"></i>Lihat semua</div></div>`;

      list.forEach(item => {
        const stickerHTML = item.sticker
          ? `<div class="wish-sticker"><img src="assets/images/sticker/${item.sticker}"></div>`
          : "";

        container.innerHTML += `
          <div class="wish-item">
            <div class="wish-comment-header">
              <div class="wish-comment-name">
              <i class="icon-guest"></i>
              ${item.name}</div>
            </div>

            <div class="wish-comment-text">${item.comment}</div>

            ${stickerHTML}
            ${this.formatTime(item.createdAt)}
          </div>
        `;
      });

      // Store list untuk popup
      this.allWishes = list;
      
      // Setup event listener untuk "Lihat semua"
      const viewAllButton = container.querySelector(".wish-comment-action");
      if (viewAllButton) {
        viewAllButton.addEventListener("click", () => this.showWishPopup());
      }
    },

    showWishPopup() {
      const popup = document.getElementById("wishPopup");
      const popupList = document.getElementById("wishPopupList");
      
      if (!popup || !popupList) {
        console.warn("⚠️ Wish popup elements not found");
        return;
      }

      // Clear previous content
      popupList.innerHTML = "";

      // Check if there are wishes
      if (!this.allWishes || this.allWishes.length === 0) {
        popupList.innerHTML = `<div class="wish-popup-empty">Belum ada ucapan.</div>`;
        popup.classList.add("open");
        popup.removeAttribute("inert");
        document.activeElement?.blur();
        // Lock scrolling when popup opens
        lockBodyScroll();
        return;
      }

      // Render all wishes in popup
      this.allWishes.forEach(item => {
        const stickerHTML = item.sticker
          ? `<div class="wish-sticker"><img src="assets/images/sticker/${item.sticker}"></div>`
          : "";

        const wishElement = document.createElement("div");
        wishElement.className = "wish-item";
        wishElement.innerHTML = `
          <div class="wish-comment-header">
            <div class="wish-comment-name">
              <i class="icon-guest"></i>
              ${item.name}
            </div>
          </div>
          <div class="wish-comment-text">${item.comment}</div>
          ${stickerHTML}
          ${this.formatTime(item.createdAt)}
        `;
        
        popupList.appendChild(wishElement);
      });

      // Show popup
      popup.classList.add("open");
      popup.removeAttribute("inert");
      document.activeElement?.blur();
      // Lock scrolling when popup opens
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

    formatTime(ts) {
      if (!ts) return "";
      const date = ts.toDate();
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      let relativeTime = "";

      if (diffSecs < 60) {
        relativeTime = diffSecs === 0 ? "baru saja" : `${diffSecs} detik yang lalu`;
      } else if (diffMins < 60) {
        relativeTime = diffMins === 1 ? "1 menit yang lalu" : `${diffMins} menit yang lalu`;
      } else if (diffHours < 24) {
        relativeTime = diffHours === 1 ? "1 jam yang lalu" : `${diffHours} jam yang lalu`;
      } else if (diffDays < 7) {
        relativeTime = diffDays === 1 ? "1 hari yang lalu" : `${diffDays} hari yang lalu`;
      } else if (diffWeeks < 4) {
        relativeTime = diffWeeks === 1 ? "1 minggu yang lalu" : `${diffWeeks} minggu yang lalu`;
      } else if (diffMonths < 12) {
        relativeTime = diffMonths === 1 ? "1 bulan yang lalu" : `${diffMonths} bulan yang lalu`;
      } else {
        relativeTime = diffYears === 1 ? "1 tahun yang lalu" : `${diffYears} tahun yang lalu`;
      }

      const fullDate = date.toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      return `<span class="wish-comment-time" title="${fullDate}">${relativeTime}</span>`;
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

  document.addEventListener("mainInitComplete", () => {
    setTimeout(() => WishManager.loadWishes(), 500);
    loadGuestInfo().then(() => {

      applyDynamicRSVPUI();

      if (window.currentGuest?.rsvpStatus && window.currentGuest.rsvpStatus !== "pending") {
        $(".rsvp-description").show();
        $(".rsvp-form").hide();
      } else {
        $(".rsvp-description").hide();
        $(".rsvp-form").show();
      }

      preloadRSVP();

    });
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



/* Footer heart: a cupid celebration built from Fluent Emoji artwork (MIT).
   The overlay and its images are created on first click, so the invitation's
   initial load stays untouched. See assets/images/cupid/ATTRIBUTION.md. */
const CupidHeartAnimation = {
  overlay: null,
  dismissTimer: null,
  duration: 4200,

  init() {
    const trigger = document.querySelector('.sintia-foot-love');
    if (!trigger) return;

    trigger.addEventListener('click', () => this.play());
  },

  build() {
    const overlay = document.createElement('div');
    overlay.className = 'cupid-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="cupid-stage">
        <div class="cupid-actor">
          <img class="cupid-angel-art" src="assets/images/cupid/baby-angel.svg" alt="" decoding="async">
          <svg class="cupid-bow" viewBox="0 0 60 120" aria-hidden="true">
            <path class="cupid-bow-limb" d="M14 8c26 22 26 82 0 104"/>
            <path class="cupid-bow-cord" d="M14 8L40 60L14 112"/>
          </svg>
        </div>
        <svg class="cupid-dart" viewBox="0 0 140 30" aria-hidden="true">
          <path class="cupid-dart-shaft" d="M14 15H120"/>
          <path class="cupid-dart-head" d="M138 15l-20-9v18Z"/>
          <path class="cupid-dart-fletch" d="M14 15L0 4v22Z"/>
        </svg>
        <div class="cupid-target">
          <img class="cupid-heart-art whole" src="assets/images/cupid/red-heart.svg" alt="" decoding="async">
          <img class="cupid-heart-art pierced" src="assets/images/cupid/heart-with-arrow.svg" alt="" decoding="async">
        </div>
        <div class="cupid-sparkles" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    return overlay;
  },

  play() {
    if (!this.overlay) {
      this.overlay = this.build();
    }

    if (this.overlay.classList.contains('is-playing')) return;

    // Restart cleanly when replayed.
    this.overlay.classList.remove('is-playing');
    void this.overlay.offsetWidth;
    this.overlay.classList.add('is-playing');

    clearTimeout(this.dismissTimer);
    this.dismissTimer = setTimeout(() => {
      this.overlay.classList.remove('is-playing');
    }, this.duration);
  }
};

CupidHeartAnimation.init();

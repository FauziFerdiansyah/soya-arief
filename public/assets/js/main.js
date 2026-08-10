/*
===========================================
MAIN.JS - LIBRARY INITIALIZATION & SETUP
===========================================
File ini berisi:
1. Inisialisasi semua library (AOS, jQuery)
2. Setup dasar untuk performa optimal
3. Error handling dan fallbacks
4. Performance monitoring
===========================================
*/

/**
 * PERFORMANCE MONITORING
 * Mengukur waktu loading dan performa website
 */
const PerformanceMonitor = {
  startTime: performance.now(),
  
  /**
   * Log performance metrics
   * @param {string} label - Label untuk metric
   * @param {number} startTime - Waktu mulai
   */
  logMetric(label, startTime = this.startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`⚡ ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  },
  
  /**
   * Monitor memory usage (jika tersedia)
   */
  logMemoryUsage() {
    if (performance.memory) {
      const memory = performance.memory;
      console.log('📊 Memory Usage:', {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      });
    }
  }
};

/**
 * LIBRARY LOADER
 * Mengelola loading dan inisialisasi library dengan error handling
 */
const LibraryLoader = {
  loadedLibraries: new Set(),
  
  /**
   * Check apakah library sudah loaded
   * @param {string} libraryName - Nama library
   * @param {*} globalObject - Object global yang harus ada
   * @returns {boolean}
   */
  isLibraryLoaded(libraryName, globalObject) {
    const isLoaded = typeof globalObject !== 'undefined';
    if (isLoaded) {
      this.loadedLibraries.add(libraryName);
      console.log(`✅ ${libraryName} loaded successfully`);
    } else {
      console.warn(`⚠️ ${libraryName} not found`);
    }
    return isLoaded;
  },
  
  /**
   * Wait for library to load dengan timeout
   * @param {string} libraryName - Nama library
   * @param {Function} checkFunction - Function untuk check library
   * @param {number} timeout - Timeout dalam ms
   * @returns {Promise}
   */
  waitForLibrary(libraryName, checkFunction, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        if (checkFunction()) {
          clearInterval(checkInterval);
          this.loadedLibraries.add(libraryName);
          console.log(`✅ ${libraryName} loaded after ${Date.now() - startTime}ms`);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          console.error(`❌ ${libraryName} failed to load within ${timeout}ms`);
          reject(new Error(`${libraryName} load timeout`));
        }
      }, 100);
    });
  }
};

/**
 * AOS CONFIGURATION & INITIALIZATION
 * Setup AOS dengan konfigurasi optimal untuk performa
 */
const AOSManager = {
  // Default configuration untuk AOS
  defaultConfig: {
    // Animation settings
    duration: 800,           // Durasi animasi yang optimal
    easing: 'ease-out-cubic', // Easing yang smooth
    delay: 0,                // No delay by default
    
    // Trigger settings
    offset: 120,             // Trigger 120px sebelum element terlihat
    anchorPlacement: 'top-bottom', // Anchor placement yang optimal
    
    // Behavior settings - PENTING untuk mobile refresh
    once: false,             // Animasi berulang - WAJIB false untuk refresh
    mirror: true,            // Animate saat scroll up/down - WAJIB true untuk refresh
    
    // Performance settings
    disable: false,          // Jangan disable di mobile untuk testing
    
    // Mobile specific settings
    startEvent: 'DOMContentLoaded', // Event trigger
    initClassName: 'aos-init',      // Class setelah init
    animatedClassName: 'aos-animate', // Class saat animasi
    useClassNames: false,           // Gunakan data-aos
    disableMutationObserver: false, // Biarkan auto-detect DOM changes
    
    throttleDelay: 99,       // Throttle scroll events
    debounceDelay: 50        // Debounce resize events
  },
  
  /**
   * Initialize AOS dengan error handling
   */
  async init() {
    try {
      // Wait for AOS library
      await LibraryLoader.waitForLibrary('AOS', () => typeof AOS !== 'undefined');
      
      const initStart = performance.now();
      
      // Initialize AOS dengan konfigurasi optimal
      AOS.init(this.defaultConfig);
      
      // Log performance
      PerformanceMonitor.logMetric('AOS Initialization', initStart);
      
      // Setup refresh pada resize dengan debounce
      this.setupResponsiveRefresh();
      
      // Setup intersection observer fallback
      this.setupIntersectionObserverFallback();
      
      console.log('🎨 AOS initialized with optimal settings');
      return true;
      
    } catch (error) {
      console.error('❌ AOS initialization failed:', error);
      // Fallback ke CSS animations
      this.enableCSSFallback();
      return false;
    }
  },
  
  /**
   * Setup responsive refresh dengan debounce
   */
  setupResponsiveRefresh() {
    let resizeTimeout;
    
    // Resize event
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (typeof AOS !== 'undefined') {
          AOS.refreshHard(); // Gunakan refreshHard untuk mobile
          console.log('🔄 AOS refreshHard on resize');
        }
      }, this.defaultConfig.debounceDelay);
    });
    
    // Page visibility change (mobile browser switch/minimize)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && typeof AOS !== 'undefined') {
        setTimeout(() => {
          AOS.refreshHard(); // refreshHard untuk reinit elements
          console.log('🔄 AOS refreshHard on visibility change');
        }, 200); // Delay lebih lama untuk mobile
      }
    });
    
    // Page focus (mobile app switch back)
    window.addEventListener('focus', () => {
      if (typeof AOS !== 'undefined') {
        setTimeout(() => {
          AOS.refreshHard(); // refreshHard untuk mobile
          console.log('🔄 AOS refreshHard on focus');
        }, 200);
      }
    });
    
    // Page load event (untuk refresh setelah load complete)
    window.addEventListener('load', () => {
      if (typeof AOS !== 'undefined') {
        setTimeout(() => {
          AOS.refreshHard();
          console.log('🔄 AOS refreshHard on page load');
        }, 300);
      }
    });
    
    // Scroll end detection untuk mobile
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (typeof AOS !== 'undefined') {
          AOS.refresh(); // refresh biasa untuk scroll
        }
      }, 150);
    });
  },
  
  /**
   * Setup intersection observer sebagai fallback
   */
  setupIntersectionObserverFallback() {
    // Jika AOS gagal, gunakan intersection observer sederhana
    if (!('IntersectionObserver' in window)) {
      console.warn('⚠️ IntersectionObserver not supported');
      return;
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-animate');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -10% 0px'
    });
    
    // Observe elements dengan data-aos
    document.querySelectorAll('[data-aos]').forEach(el => {
      observer.observe(el);
    });
  },
  
  /**
   * Enable CSS fallback animations
   */
  enableCSSFallback() {
    console.log('🎯 Enabling CSS animation fallback');
    
    // Add fallback class ke body
    document.body.classList.add('aos-fallback');
    
    // Trigger animations dengan intersection observer
    this.setupIntersectionObserverFallback();
  },
  
  /**
   * Refresh AOS dengan error handling
   */
  refresh() {
    try {
      if (typeof AOS !== 'undefined') {
        AOS.refresh();
        console.log('🔄 AOS refreshed manually');
      }
    } catch (error) {
      console.error('❌ AOS refresh failed:', error);
    }
  },
  
  /**
   * Refresh AOS manually - untuk debugging dan mobile
   */
  manualRefresh() {
    if (typeof AOS !== 'undefined') {
      AOS.refreshHard();
      console.log('🔄 Manual AOS refreshHard executed');
    }
  },
  
  /**
   * Reinitialize AOS completely - untuk mobile issues
   */
  reinit() {
    if (typeof AOS !== 'undefined') {
      // Destroy existing instance
      if (AOS.refresh) {
        console.log('🔄 Reinitializing AOS...');
        
        // Re-initialize dengan config yang sama
        AOS.init(this.defaultConfig);
        
        // Force refresh setelah reinit
        setTimeout(() => {
          AOS.refreshHard();
          console.log('✅ AOS reinitialized and refreshed');
        }, 100);
      }
    }
  }
};

/**
 * JQUERY INITIALIZATION
 * Setup jQuery dengan optimasi dan polyfills
 */
const jQueryManager = {
  /**
   * Initialize jQuery dengan feature detection
   */
  async init() {
    try {
      // Wait for jQuery
      await LibraryLoader.waitForLibrary('jQuery', () => typeof $ !== 'undefined');
      
      const initStart = performance.now();
      
      // Setup jQuery optimizations
      this.setupOptimizations();
      
      // Setup event delegation
      this.setupEventDelegation();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      PerformanceMonitor.logMetric('jQuery Setup', initStart);
      
      console.log('💎 jQuery initialized with optimizations');
      return true;
      
    } catch (error) {
      console.error('❌ jQuery initialization failed:', error);
      // Setup vanilla JS fallbacks
      this.setupVanillaFallbacks();
      return false;
    }
  },
  
  /**
   * Setup jQuery optimizations
   */
  setupOptimizations() {
    // Disable jQuery animations jika user prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $.fx.off = true;
      console.log('🎯 jQuery animations disabled (reduced motion)');
    }
    
    // Setup jQuery ready dengan performance monitoring
    $(document).ready(() => {
      PerformanceMonitor.logMetric('DOM Ready');
      console.log('📄 DOM ready via jQuery');
    });
  },
  
  /**
   * Setup event delegation untuk performa optimal
   */
  setupEventDelegation() {
    // Delegate common events ke document
    $(document)
      .on('click', '[data-action]', this.handleActionClick)
      .on('submit', 'form', this.handleFormSubmit)
      .on('input', 'input, textarea', this.handleInputChange);
  },
  
  /**
   * Handle action clicks dengan delegation
   */
  handleActionClick(event) {
    const $target = $(event.currentTarget);
    const action = $target.data('action');
    
    console.log(`🎯 Action clicked: ${action}`);
    
    // Prevent default untuk actions
    if (action) {
      event.preventDefault();
    }
  },
  
  /**
   * Handle form submissions
   */
  handleFormSubmit(event) {
    const $form = $(event.currentTarget);
    console.log('📝 Form submitted:', $form.attr('id') || 'unnamed');
  },
  
  /**
   * Handle input changes dengan debounce
   */
  handleInputChange: (() => {
    let timeout;
    return function(event) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const $input = $(event.currentTarget);
        console.log('✏️ Input changed:', $input.attr('name') || 'unnamed');
      }, 300);
    };
  })(),
  
  /**
   * Setup performance monitoring untuk jQuery
   */
  setupPerformanceMonitoring() {
    // Monitor jQuery selector performance
    const originalFind = $.fn.find;
    $.fn.find = function(selector) {
      const start = performance.now();
      const result = originalFind.call(this, selector);
      const duration = performance.now() - start;
      
      if (duration > 10) {
        console.warn(`⚠️ Slow jQuery selector: ${selector} (${duration.toFixed(2)}ms)`);
      }
      
      return result;
    };
  },
  
  /**
   * Setup vanilla JS fallbacks
   */
  setupVanillaFallbacks() {
    console.log('🎯 Setting up vanilla JS fallbacks');
    
    // Simple document ready fallback
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        PerformanceMonitor.logMetric('DOM Ready (vanilla)');
        console.log('📄 DOM ready via vanilla JS');
      });
    } else {
      console.log('📄 DOM already ready');
    }
  }
};

/**
 * MAIN INITIALIZATION FUNCTION
 * Orchestrate semua library initialization
 */
const MainInitializer = {
  /**
   * Initialize semua library dengan proper sequencing
   */
  async init() {
    console.log('🚀 Starting main initialization...');
    const totalStart = performance.now();
    
    try {
      // Initialize libraries secara parallel untuk performa optimal
      const initPromises = [
        jQueryManager.init(),
        AOSManager.init()
      ];
      
      // Wait for all libraries
      const results = await Promise.allSettled(initPromises);
      
      // Log results
      results.forEach((result, index) => {
        const libraryName = ['jQuery', 'AOS'][index];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${libraryName} initialized successfully`);
        } else {
          console.error(`❌ ${libraryName} initialization failed:`, result.reason);
        }
      });
      
      // Setup global error handling
      this.setupGlobalErrorHandling();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Log total initialization time
      PerformanceMonitor.logMetric('Total Initialization', totalStart);
      PerformanceMonitor.logMemoryUsage();
      
      console.log('🎉 Main initialization completed!');
      
      // Dispatch custom event untuk custom.js
      this.dispatchInitializationComplete();
      
    } catch (error) {
      console.error('❌ Main initialization failed:', error);
    }
  },
  
  /**
   * Setup global error handling
   */
  setupGlobalErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('🚨 Global error:', event.error);
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
    });
    
    console.log('🛡️ Global error handling setup');
  },
  
  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          console.log('📊 Page Load Metrics:', {
            'DOM Content Loaded': `${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`,
            'Load Complete': `${navigation.loadEventEnd - navigation.loadEventStart}ms`,
            'Total Load Time': `${navigation.loadEventEnd - navigation.navigationStart}ms`
          });
        }
        
        PerformanceMonitor.logMemoryUsage();
      }, 0);
    });
  },
  
  /**
   * Dispatch initialization complete event
   */
  dispatchInitializationComplete() {
    const event = new CustomEvent('mainInitComplete', {
      detail: {
        timestamp: Date.now(),
        loadedLibraries: Array.from(LibraryLoader.loadedLibraries)
      }
    });
    
    document.dispatchEvent(event);
    console.log('📡 Initialization complete event dispatched');
  }
};

/**
 * IMMEDIATE EXECUTION
 * Start initialization segera setelah script loaded
 */
(function() {
  'use strict';
  
  console.log('📚 Main.js loaded, starting initialization...');
  
  // Check browser compatibility
  const isModernBrowser = (
    'Promise' in window &&
    'fetch' in window &&
    'IntersectionObserver' in window &&
    'requestAnimationFrame' in window
  );
  
  if (!isModernBrowser) {
    console.warn('⚠️ Some modern features not supported, using fallbacks');
  }
  
  // Start initialization berdasarkan document state
  if (document.readyState === 'loading') {
    // DOM masih loading, tunggu DOMContentLoaded
    document.addEventListener('DOMContentLoaded', MainInitializer.init.bind(MainInitializer));
  } else {
    // DOM sudah ready, init langsung
    MainInitializer.init();
  }
})();

/**
 * EXPORT UNTUK DEBUGGING
 * Export objects untuk debugging di console
 */
if (typeof window !== 'undefined') {
  window.MainJS = {
    PerformanceMonitor,
    LibraryLoader,
    AOSManager,
    jQueryManager,
    MainInitializer
  };
  
  console.log('🔧 Main.js objects available in window.MainJS for debugging');
}

/**
 * Replay animasi AOS di hero-section TANPA blink.
 * Caranya: hapus class -> force reflow -> tambah lagi.
 */
function replayHeroAOS() {
  console.log("🎞️ Replaying hero-section AOS...");

  if (typeof AOS === "undefined") {
    console.error("❌ AOS belum siap");
    return;
  }

  const heroEls = Array.from(
    document.querySelectorAll(".hero-section[data-aos], .hero-section [data-aos]")
  ).filter((element) => !element.closest('.hero-footer'));
  if (!heroEls.length) return;

  heroEls.forEach((el) => {
    // Hapus class animasi
    el.classList.remove("aos-animate");
  });

  // Force browser reflow (trik CSS)
  void document.body.offsetHeight;

  // Tambah lagi class animasi biar replay
  heroEls.forEach((el) => {
    el.classList.add("aos-animate");
  });

  console.log("✅ Animasi hero-section diputar ulang");
}
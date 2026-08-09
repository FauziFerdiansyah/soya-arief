/**
 * LAZY LOAD MANAGER
 * Progressive image loading dengan blur-to-clear effect
 * - Ornament: blur placeholder yang gradually menjadi clear
 * - Photo: skeleton blur yang gradually menjadi clear
 */

const LazyLoadManager = {
  observer: null,
  images: [],
  
  /**
   * Initialize lazy loading
   */
  init() {
    console.log('🖼️ Initializing LazyLoad Manager...');
    
    // Check browser support
    if (!('IntersectionObserver' in window)) {
      console.warn('⚠️ IntersectionObserver not supported, loading all images immediately');
      this.loadAllImages();
      return;
    }
    
    // Setup observer
    this.setupObserver();
    
    // Find all lazy images
    this.findLazyImages();
    
    // Start observing
    this.observeImages();
    
    console.log(`✅ LazyLoad initialized with ${this.images.length} images`);
  },
  
  /**
   * Setup Intersection Observer
   */
  setupObserver() {
    const options = {
      root: null,
      rootMargin: '50px', // Load 50px before entering viewport
      threshold: 0.01
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, options);
  },
  
  /**
   * Find all images that need lazy loading
   */
  findLazyImages() {
    // Get all img tags except preloader and logo
    const allImages = document.querySelectorAll('img:not(#preloader img):not(.logo)');
    
    allImages.forEach(img => {
      // Skip if already has data-lazy
      if (img.hasAttribute('data-lazy')) {
        this.images.push(img);
        return;
      }
      
      // Determine image type
      const isOrnament = img.src.includes('/ornaments/') || 
                        img.alt.toLowerCase().includes('ornament');
      const isPhoto = img.src.includes('/prewed/') || 
                     img.classList.contains('wedding-image') ||
                     img.alt.toLowerCase().includes('bride') ||
                     img.alt.toLowerCase().includes('groom') ||
                     img.alt.toLowerCase().includes('soya') ||
                     img.alt.toLowerCase().includes('arief');
      
      // Store original src
      const originalSrc = img.src;
      
      // Add data attributes
      img.setAttribute('data-lazy', originalSrc);
      
      if (isOrnament) {
        img.classList.add('lazy-ornament');
        // Create tiny blur placeholder
        img.src = this.createBlurPlaceholder(img);
      } else if (isPhoto) {
        img.classList.add('lazy-photo');
        // Create skeleton placeholder
        img.src = this.createSkeletonPlaceholder(img);
      } else {
        // Default: treat as photo
        img.classList.add('lazy-photo');
        img.src = this.createSkeletonPlaceholder(img);
      }
      
      this.images.push(img);
    });
  },
  
  /**
   * Create blur placeholder for ornaments
   */
  createBlurPlaceholder(img) {
    // Create a tiny 1x1 transparent pixel as placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect fill="%23f0f0f0" width="1" height="1"/%3E%3C/svg%3E';
  },
  
  /**
   * Create skeleton placeholder for photos
   */
  createSkeletonPlaceholder(img) {
    // Create a gradient placeholder
    const width = img.width || 400;
    const height = img.height || 300;
    
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"%3E%3Cdefs%3E%3ClinearGradient id="g"%3E%3Cstop offset="0%25" stop-color="%23f0f0f0"/%3E%3Cstop offset="50%25" stop-color="%23e0e0e0"/%3E%3Cstop offset="100%25" stop-color="%23f0f0f0"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23g)" width="${width}" height="${height}"/%3E%3C/svg%3E`;
  },
  
  /**
   * Start observing images
   */
  observeImages() {
    this.images.forEach(img => {
      this.observer.observe(img);
    });
  },
  
  /**
   * Load individual image
   */
  loadImage(img) {
    const src = img.getAttribute('data-lazy');
    
    if (!src) {
      console.warn('⚠️ No data-lazy src found for image:', img);
      return;
    }
    
    console.log('📥 Loading image:', src);
    
    // Add loading class
    img.classList.add('lazy-loading');
    
    // Create new image to preload
    const tempImg = new Image();
    
    tempImg.onload = () => {
      // Image loaded successfully
      this.onImageLoaded(img, src);
    };
    
    tempImg.onerror = () => {
      // Image failed to load
      this.onImageError(img, src);
    };
    
    // Start loading
    tempImg.src = src;
  },
  
  /**
   * Handle successful image load
   */
  onImageLoaded(img, src) {
    console.log('✅ Image loaded:', src);
    
    // Update src
    img.src = src;
    
    // Remove loading class
    img.classList.remove('lazy-loading');
    
    // Add loaded class for transition
    img.classList.add('lazy-loaded');
    
    // Remove data-lazy attribute
    img.removeAttribute('data-lazy');
    
    // Trigger custom event
    img.dispatchEvent(new CustomEvent('lazyloaded', {
      detail: { src }
    }));
  },
  
  /**
   * Handle image load error
   */
  onImageError(img, src) {
    console.error('❌ Failed to load image:', src);
    
    // Remove loading class
    img.classList.remove('lazy-loading');
    
    // Add error class
    img.classList.add('lazy-error');
    
    // Keep placeholder
    // Optionally set a fallback image
    // img.src = 'path/to/fallback.jpg';
    
    // Trigger custom event
    img.dispatchEvent(new CustomEvent('lazyerror', {
      detail: { src }
    }));
  },
  
  /**
   * Load all images immediately (fallback for unsupported browsers)
   */
  loadAllImages() {
    const allImages = document.querySelectorAll('img[data-lazy]');
    
    allImages.forEach(img => {
      const src = img.getAttribute('data-lazy');
      if (src) {
        img.src = src;
        img.classList.add('lazy-loaded');
        img.removeAttribute('data-lazy');
      }
    });
    
    console.log('✅ All images loaded immediately');
  },
  
  /**
   * Manually trigger load for specific image
   */
  loadSpecificImage(img) {
    if (this.observer) {
      this.observer.unobserve(img);
    }
    this.loadImage(img);
  },
  
  /**
   * Destroy lazy load manager
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.images = [];
    
    console.log('🗑️ LazyLoad Manager destroyed');
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    LazyLoadManager.init();
  });
} else {
  // DOM already loaded
  LazyLoadManager.init();
}

// Expose to global scope for manual control
window.LazyLoadManager = LazyLoadManager;

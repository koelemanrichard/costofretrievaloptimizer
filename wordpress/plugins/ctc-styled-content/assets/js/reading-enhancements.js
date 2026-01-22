/**
 * CTC Styled Content - Reading Enhancements
 *
 * JavaScript enhancements for styled content:
 * - Reading progress bar
 * - FAQ accordion functionality
 * - Table of Contents toggle
 * - Smooth scrolling for ToC links
 *
 * @package ctc-styled-content
 * @version 1.0.0
 */

(function() {
  'use strict';

  // Configuration from WordPress
  var config = window.ctcStyledConfig || {
    enableProgressBar: true,
    enableTocScript: true
  };

  /**
   * Initialize when DOM is ready
   */
  function init() {
    if (config.enableProgressBar) {
      initProgressBar();
    }

    if (config.enableTocScript) {
      initFaqAccordion();
      initTocToggle();
      initSmoothScroll();
    }
  }

  /**
   * Reading Progress Bar
   */
  function initProgressBar() {
    var progressBar = document.querySelector('.ctc-progress-fill');
    if (!progressBar) return;

    var ticking = false;

    function updateProgress() {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var scrollPos = window.scrollY;
      var progress = docHeight > 0 ? (scrollPos / docHeight) * 100 : 0;
      progressBar.style.width = Math.min(progress, 100) + '%';
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });

    // Initial update
    updateProgress();
  }

  /**
   * FAQ Accordion
   */
  function initFaqAccordion() {
    var faqButtons = document.querySelectorAll('.ctc-faq--accordion .ctc-faq-question');

    faqButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', !expanded);

        // Optional: Close other FAQs when one is opened
        // Uncomment below if you want accordion behavior
        /*
        if (!expanded) {
          faqButtons.forEach(function(otherBtn) {
            if (otherBtn !== btn) {
              otherBtn.setAttribute('aria-expanded', 'false');
            }
          });
        }
        */
      });
    });
  }

  /**
   * Table of Contents Toggle
   */
  function initTocToggle() {
    var tocToggle = document.querySelector('.ctc-toc-toggle');
    if (!tocToggle) return;

    var tocList = document.querySelector('.ctc-toc-list');
    if (!tocList) return;

    tocToggle.addEventListener('click', function() {
      var isCollapsed = tocList.classList.toggle('ctc-toc-list--collapsed');
      tocToggle.setAttribute('aria-expanded', !isCollapsed);
      tocToggle.textContent = isCollapsed ? 'Show Contents' : 'Hide Contents';
    });
  }

  /**
   * Smooth Scrolling for ToC Links
   */
  function initSmoothScroll() {
    var tocLinks = document.querySelectorAll('.ctc-toc-link');

    tocLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        var href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;

        var target = document.getElementById(href.substring(1));
        if (!target) return;

        e.preventDefault();

        // Calculate offset (account for fixed headers)
        var offset = 80; // Adjust this value if you have a fixed header
        var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Update URL hash without jumping
        if (history.pushState) {
          history.pushState(null, null, href);
        }

        // Set focus to target for accessibility
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  /**
   * Highlight Active ToC Item
   */
  function initActiveHighlight() {
    var tocLinks = document.querySelectorAll('.ctc-toc-link');
    if (tocLinks.length === 0) return;

    var headings = [];
    tocLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        var heading = document.getElementById(href.substring(1));
        if (heading) {
          headings.push({ link: link, heading: heading });
        }
      }
    });

    if (headings.length === 0) return;

    var ticking = false;

    function updateActiveLink() {
      var scrollPos = window.scrollY + 100; // Offset for better UX
      var activeLink = null;

      // Find the last heading that is above the scroll position
      for (var i = headings.length - 1; i >= 0; i--) {
        var item = headings[i];
        if (item.heading.offsetTop <= scrollPos) {
          activeLink = item.link;
          break;
        }
      }

      // Update active states
      tocLinks.forEach(function(link) {
        if (link === activeLink) {
          link.classList.add('ctc-toc-link--active');
        } else {
          link.classList.remove('ctc-toc-link--active');
        }
      });

      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateActiveLink);
        ticking = true;
      }
    }, { passive: true });

    // Initial update
    updateActiveLink();
  }

  /**
   * Copy Code Block Feature
   */
  function initCodeCopy() {
    var codeBlocks = document.querySelectorAll('.ctc-code-block');

    codeBlocks.forEach(function(block) {
      // Create copy button
      var copyBtn = document.createElement('button');
      copyBtn.className = 'ctc-code-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('type', 'button');
      copyBtn.setAttribute('aria-label', 'Copy code to clipboard');

      // Position block relatively for absolute button
      block.style.position = 'relative';

      // Add button
      block.appendChild(copyBtn);

      // Copy handler
      copyBtn.addEventListener('click', function() {
        var code = block.querySelector('code');
        if (!code) return;

        var text = code.textContent || code.innerText;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() {
              copyBtn.textContent = 'Copy';
            }, 2000);
          });
        } else {
          // Fallback for older browsers
          var textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(function() {
              copyBtn.textContent = 'Copy';
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
          document.body.removeChild(textarea);
        }
      });
    });
  }

  /**
   * Image Lightbox (optional enhancement)
   */
  function initLightbox() {
    var images = document.querySelectorAll('.ctc-figure .ctc-image');
    if (images.length === 0) return;

    // Create lightbox container
    var lightbox = document.createElement('div');
    lightbox.className = 'ctc-lightbox';
    lightbox.innerHTML = '<div class="ctc-lightbox-backdrop"></div><img class="ctc-lightbox-image" src="" alt=""><button class="ctc-lightbox-close" type="button" aria-label="Close lightbox">&times;</button>';
    document.body.appendChild(lightbox);

    var lightboxImage = lightbox.querySelector('.ctc-lightbox-image');
    var closeBtn = lightbox.querySelector('.ctc-lightbox-close');
    var backdrop = lightbox.querySelector('.ctc-lightbox-backdrop');

    function openLightbox(src, alt) {
      lightboxImage.src = src;
      lightboxImage.alt = alt || '';
      lightbox.classList.add('ctc-lightbox--open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('ctc-lightbox--open');
      document.body.style.overflow = '';
    }

    images.forEach(function(img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function() {
        openLightbox(img.src, img.alt);
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    backdrop.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lightbox.classList.contains('ctc-lightbox--open')) {
        closeLightbox();
      }
    });
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also initialize optional features
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initActiveHighlight();
      initCodeCopy();
      // initLightbox(); // Uncomment to enable lightbox
    });
  } else {
    initActiveHighlight();
    initCodeCopy();
    // initLightbox(); // Uncomment to enable lightbox
  }

})();

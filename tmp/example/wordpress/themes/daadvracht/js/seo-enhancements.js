/**
 * SEO Content Enhancements
 *
 * - FAQ Accordion functionality
 * - Sticky ToC with scroll-spy
 * - Reading progress bar
 * - Smooth scroll to sections
 *
 * @package Daadvracht
 */

(function() {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', function() {
        initFAQAccordion();
        initTableOfContents();
        initReadingProgress();
        initScrollSpy();
        initSmoothScroll();
    });

    /**
     * Initialize FAQ Accordion
     */
    function initFAQAccordion() {
        const faqItems = document.querySelectorAll('.seo-faq__item');

        if (faqItems.length === 0) return;

        faqItems.forEach(function(item) {
            const question = item.querySelector('.seo-faq__question');
            const answer = item.querySelector('.seo-faq__answer');

            if (!question || !answer) return;

            question.addEventListener('click', function() {
                const isExpanded = this.getAttribute('aria-expanded') === 'true';

                // Close all other items
                faqItems.forEach(function(otherItem) {
                    if (otherItem !== item) {
                        const otherQuestion = otherItem.querySelector('.seo-faq__question');
                        const otherAnswer = otherItem.querySelector('.seo-faq__answer');
                        if (otherQuestion && otherAnswer) {
                            otherQuestion.setAttribute('aria-expanded', 'false');
                            otherAnswer.classList.remove('open');
                        }
                    }
                });

                // Toggle current item
                this.setAttribute('aria-expanded', !isExpanded);
                answer.classList.toggle('open', !isExpanded);
            });
        });

        // Open first FAQ item by default
        const firstQuestion = faqItems[0]?.querySelector('.seo-faq__question');
        const firstAnswer = faqItems[0]?.querySelector('.seo-faq__answer');
        if (firstQuestion && firstAnswer) {
            firstQuestion.setAttribute('aria-expanded', 'true');
            firstAnswer.classList.add('open');
        }
    }

    /**
     * Initialize Table of Contents
     */
    function initTableOfContents() {
        const tocList = document.getElementById('seo-toc-list');
        const articleContent = document.querySelector('.seo-article__content');

        if (!tocList || !articleContent) return;

        // Find all H2 headings in the article
        const headings = articleContent.querySelectorAll('h2, .seo-section__heading');

        if (headings.length === 0) {
            // Hide ToC if no headings
            const toc = document.getElementById('seo-toc');
            if (toc) toc.style.display = 'none';
            return;
        }

        // Generate ToC
        headings.forEach(function(heading, index) {
            // Ensure heading has an ID
            if (!heading.id) {
                heading.id = 'section-' + (index + 1);
            }

            // Create ToC item
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#' + heading.id;
            a.className = 'seo-toc__link';
            a.textContent = heading.textContent.replace(/\s+/g, ' ').trim();
            a.dataset.target = heading.id;

            li.appendChild(a);
            tocList.appendChild(li);
        });
    }

    /**
     * Initialize Reading Progress Bar
     */
    function initReadingProgress() {
        const progressBar = document.getElementById('seo-reading-progress');
        const article = document.querySelector('.seo-article');

        if (!progressBar || !article) return;

        function updateProgress() {
            const articleRect = article.getBoundingClientRect();
            const articleTop = articleRect.top + window.pageYOffset;
            const articleHeight = article.offsetHeight;
            const windowHeight = window.innerHeight;
            const scrollTop = window.pageYOffset;

            // Calculate progress
            const start = articleTop - windowHeight;
            const end = articleTop + articleHeight;
            const current = scrollTop;

            let progress = ((current - start) / (end - start)) * 100;
            progress = Math.min(100, Math.max(0, progress));

            progressBar.style.width = progress + '%';
        }

        // Update on scroll
        window.addEventListener('scroll', updateProgress, { passive: true });

        // Initial update
        updateProgress();
    }

    /**
     * Initialize Scroll Spy for ToC
     */
    function initScrollSpy() {
        const tocLinks = document.querySelectorAll('.seo-toc__link');
        const articleContent = document.querySelector('.seo-article__content');

        if (tocLinks.length === 0 || !articleContent) return;

        const headings = articleContent.querySelectorAll('h2, .seo-section__heading');

        function updateActiveLink() {
            const scrollPosition = window.pageYOffset + 150; // Offset for sticky header

            let activeIndex = 0;

            headings.forEach(function(heading, index) {
                if (heading.offsetTop <= scrollPosition) {
                    activeIndex = index;
                }
            });

            // Update active class
            tocLinks.forEach(function(link, index) {
                link.classList.remove('active');
                if (index === activeIndex) {
                    link.classList.add('active');
                }
            });
        }

        // Update on scroll
        window.addEventListener('scroll', updateActiveLink, { passive: true });

        // Initial update
        updateActiveLink();
    }

    /**
     * Initialize Smooth Scroll
     */
    function initSmoothScroll() {
        const tocLinks = document.querySelectorAll('.seo-toc__link');

        tocLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();

                const targetId = this.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);

                if (target) {
                    const offset = 100; // Account for sticky header
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Update URL hash without jumping
                    history.pushState(null, null, '#' + targetId);
                }
            });
        });

        // Handle initial hash on page load
        if (window.location.hash) {
            setTimeout(function() {
                const target = document.querySelector(window.location.hash);
                if (target) {
                    const offset = 100;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }

    /**
     * Utility: Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

})();

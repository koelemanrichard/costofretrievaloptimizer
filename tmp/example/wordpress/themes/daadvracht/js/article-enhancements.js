/**
 * Article Enhancements
 * - Auto-generates Table of Contents from H2 headings
 * - Wraps H2 sections in cards
 * - Adds reading progress bar
 * - Highlights active ToC item on scroll
 */

(function() {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', function() {
        const articleContent = document.querySelector('.article-content');
        if (!articleContent) return;

        // Initialize all enhancements
        initTableOfContents();
        wrapSectionsInCards();
        initReadingProgress();
        initScrollSpy();
    });

    /**
     * Generate Table of Contents from H2 headings
     */
    function initTableOfContents() {
        const tocContainer = document.querySelector('.article-toc-list');
        const articleContent = document.querySelector('.article-content');

        if (!tocContainer || !articleContent) return;

        const headings = articleContent.querySelectorAll('h2');

        if (headings.length === 0) {
            // Hide ToC if no headings
            const tocWrapper = document.querySelector('.article-toc');
            if (tocWrapper) tocWrapper.style.display = 'none';
            return;
        }

        headings.forEach((heading, index) => {
            // Create ID for heading if not exists
            if (!heading.id) {
                heading.id = 'section-' + (index + 1);
            }

            // Create ToC link
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#' + heading.id;
            a.textContent = heading.textContent;

            // Smooth scroll on click
            a.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.getElementById(heading.id);
                if (target) {
                    const offset = 120; // Account for sticky header
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });

            li.appendChild(a);
            tocContainer.appendChild(li);
        });
    }

    /**
     * Wrap content between H2 headings in section cards
     */
    function wrapSectionsInCards() {
        const articleContent = document.querySelector('.article-content');
        if (!articleContent || articleContent.dataset.sectionsWrapped) return;

        const headings = articleContent.querySelectorAll('h2');
        if (headings.length === 0) return;

        // Mark intro content (before first H2)
        const firstH2 = headings[0];
        let introElements = [];
        let currentElement = articleContent.firstElementChild;

        while (currentElement && currentElement !== firstH2) {
            if (currentElement.tagName !== 'H1') {
                introElements.push(currentElement);
            }
            currentElement = currentElement.nextElementSibling;
        }

        // Wrap intro if exists
        if (introElements.length > 0) {
            const introWrapper = document.createElement('div');
            introWrapper.className = 'article-intro';
            introElements[0].parentNode.insertBefore(introWrapper, introElements[0]);
            introElements.forEach(el => introWrapper.appendChild(el));
        }

        // Wrap each H2 section
        headings.forEach((heading, index) => {
            const section = document.createElement('div');
            section.className = 'article-section';
            section.id = 'card-' + (index + 1);

            // Insert section wrapper before the heading
            heading.parentNode.insertBefore(section, heading);

            // Move heading into section
            section.appendChild(heading);

            // Move all siblings until next H2 or end
            let nextElement = section.nextElementSibling;
            while (nextElement && nextElement.tagName !== 'H2' && !nextElement.classList.contains('article-section')) {
                const toMove = nextElement;
                nextElement = nextElement.nextElementSibling;
                section.appendChild(toMove);
            }
        });

        // Mark as processed
        articleContent.dataset.sectionsWrapped = 'true';
    }

    /**
     * Initialize reading progress bar
     */
    function initReadingProgress() {
        const articleContent = document.querySelector('.article-content');
        if (!articleContent) return;

        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'reading-progress';
        document.body.appendChild(progressBar);

        // Update on scroll
        window.addEventListener('scroll', function() {
            const articleRect = articleContent.getBoundingClientRect();
            const articleTop = articleRect.top + window.pageYOffset;
            const articleHeight = articleContent.offsetHeight;
            const windowHeight = window.innerHeight;
            const scrollTop = window.pageYOffset;

            // Calculate progress
            const start = articleTop - windowHeight;
            const end = articleTop + articleHeight;
            const current = scrollTop;

            let progress = ((current - start) / (end - start)) * 100;
            progress = Math.min(100, Math.max(0, progress));

            progressBar.style.width = progress + '%';
        });
    }

    /**
     * Highlight active ToC item based on scroll position
     */
    function initScrollSpy() {
        const tocLinks = document.querySelectorAll('.article-toc-list a');
        const articleContent = document.querySelector('.article-content');

        if (tocLinks.length === 0 || !articleContent) return;

        const headings = articleContent.querySelectorAll('h2');

        window.addEventListener('scroll', function() {
            const scrollPosition = window.pageYOffset + 150; // Offset for better UX

            let activeIndex = 0;

            headings.forEach((heading, index) => {
                if (heading.offsetTop <= scrollPosition) {
                    activeIndex = index;
                }
            });

            // Update active class
            tocLinks.forEach((link, index) => {
                link.classList.remove('active');
                if (index === activeIndex) {
                    link.classList.add('active');
                }
            });
        });

        // Trigger initial check
        window.dispatchEvent(new Event('scroll'));
    }

})();

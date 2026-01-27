/**
 * CutTheCrap Content Styler - Admin JavaScript
 */

(function($) {
    'use strict';

    // State
    let currentContent = '';
    let currentComponents = null;
    let currentPreview = '';
    let selectedImageId = 0;
    let isProcessing = false;

    // DOM Elements - initialized after DOM ready
    let elements = {};

    /**
     * Initialize
     */
    function init() {
        // Cache DOM elements after DOM is ready
        elements = {
            importArea: $('#ctcs-import-area'),
            previewArea: $('#ctcs-preview-area'),
            processingArea: $('#ctcs-processing'),
            successArea: $('#ctcs-success'),
            successTitle: $('#ctcs-success-title'),
            dropzone: $('#ctcs-dropzone'),
            fileInput: $('#ctcs-file-input'),
            pasteContent: $('#ctcs-paste-content'),
            contentFormat: $('#ctcs-content-format'),
            processPasteBtn: $('#ctcs-process-paste'),
            backBtn: $('#ctcs-back-to-import'),
            postTitle: $('#ctcs-post-title'),
            postSlug: $('#ctcs-post-slug'),
            postType: $('#ctcs-post-type'),
            postCategory: $('#ctcs-post-category'),
            categoryField: $('#ctcs-category-field'),
            pageTemplate: $('#ctcs-page-template'),
            templateField: $('#ctcs-template-field'),
            metaDescription: $('#ctcs-meta-description'),
            featuredImagePreview: $('#ctcs-featured-image-preview'),
            featuredImageId: $('#ctcs-featured-image-id'),
            selectImageBtn: $('#ctcs-select-image'),
            removeImageBtn: $('#ctcs-remove-image'),
            componentsList: $('#ctcs-components-list'),
            previewContent: $('#ctcs-preview-content'),
            saveDraftBtn: $('#ctcs-save-draft'),
            publishBtn: $('#ctcs-publish-post'),
            viewPostBtn: $('#ctcs-view-post'),
            editPostBtn: $('#ctcs-edit-post'),
            importAnotherBtn: $('#ctcs-import-another')
        };

        // Only bind events if the main container exists
        if (elements.importArea.length > 0) {
            bindEvents();
            // Initialize post type visibility
            handlePostTypeChange();
        }
    }

    /**
     * Bind events
     */
    function bindEvents() {
        // Drag and drop
        elements.dropzone
            .on('dragover dragenter', handleDragOver)
            .on('dragleave dragend', handleDragLeave)
            .on('drop', handleDrop);

        // Separate click handler - exclude clicks on the button/label to allow native behavior
        elements.dropzone.on('click', function(e) {
            var target = e.target;
            var fileInput = document.getElementById('ctcs-file-input');

            // If clicking on the button, label, or file input itself, let native behavior work
            if ($(target).hasClass('ctcs-dropzone__button') ||
                $(target).closest('.ctcs-dropzone__button').length > 0 ||
                target.id === 'ctcs-file-input') {
                // Don't prevent default - let the label trigger the input naturally
                return;
            }

            // For clicks on other parts of the dropzone, trigger file input
            e.preventDefault();
            if (fileInput) {
                fileInput.click();
            }
        });

        // File input - use native event listener
        var fileInput = document.getElementById('ctcs-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                if (this.files && this.files.length > 0) {
                    processFile(this.files[0]);
                }
            });
        }

        // Paste content
        elements.processPasteBtn.on('click', handlePasteContent);

        // Navigation
        elements.backBtn.on('click', function(e) {
            e.preventDefault();
            showImportArea();
        });
        elements.importAnotherBtn.on('click', function(e) {
            e.preventDefault();
            resetAndShowImport();
        });

        // Post settings - debounce the slug update
        var slugTimeout = null;
        elements.postTitle.on('input', function() {
            clearTimeout(slugTimeout);
            slugTimeout = setTimeout(updateSlug, 300);
        });

        // Post type change - show/hide category vs template
        elements.postType.on('change', handlePostTypeChange);

        // Featured image
        elements.selectImageBtn.on('click', function(e) {
            e.preventDefault();
            openMediaLibrary();
        });
        elements.removeImageBtn.on('click', function(e) {
            e.preventDefault();
            removeFeaturedImage();
        });

        // Actions
        elements.saveDraftBtn.on('click', function(e) {
            e.preventDefault();
            createPost('draft');
        });
        elements.publishBtn.on('click', function(e) {
            e.preventDefault();
            createPost('publish');
        });
    }

    /**
     * Handle drag over
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.addClass('dragover');
    }

    /**
     * Handle drag leave
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.removeClass('dragover');
    }

    /**
     * Handle file drop
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.removeClass('dragover');

        var files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    /**
     * Process uploaded file
     */
    function processFile(file) {
        if (isProcessing) return;

        var validExtensions = ['.html', '.htm', '.md', '.markdown'];
        var ext = '.' + file.name.split('.').pop().toLowerCase();

        if (validExtensions.indexOf(ext) === -1) {
            alert(ctcsAdmin.i18n.error + ': Invalid file type. Allowed: .html, .htm, .md, .markdown');
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var content = e.target.result;
            var format = (ext === '.md' || ext === '.markdown') ? 'markdown' : 'html';
            processContent(content, format);
        };
        reader.onerror = function() {
            alert(ctcsAdmin.i18n.error + ': Could not read file');
        };
        reader.readAsText(file);
    }

    /**
     * Handle paste content
     */
    function handlePasteContent(e) {
        if (e) e.preventDefault();
        if (isProcessing) return;

        var content = elements.pasteContent.val();
        if (content) {
            content = content.trim();
        }

        if (!content) {
            alert(ctcsAdmin.i18n.error + ': No content provided');
            return;
        }

        var format = elements.contentFormat.val() || 'html';
        processContent(content, format);
    }

    /**
     * Process content via AJAX
     */
    function processContent(content, format) {
        if (isProcessing) return;
        isProcessing = true;

        showProcessing();

        $.ajax({
            url: ctcsAdmin.ajaxUrl,
            type: 'POST',
            data: {
                action: 'ctcs_parse_content',
                nonce: ctcsAdmin.nonce,
                content: content,
                format: format
            },
            success: function(response) {
                isProcessing = false;

                if (response.success) {
                    currentContent = response.data.preview || '';
                    currentComponents = response.data.components || {};
                    currentPreview = response.data.preview || '';

                    // Populate form
                    elements.postTitle.val(response.data.title || '');
                    elements.postSlug.val(sanitizeTitle(response.data.title || ''));
                    elements.metaDescription.val(response.data.meta_description || '');

                    // Show components
                    renderComponents(response.data.components || {});

                    // Show preview
                    elements.previewContent.html(response.data.preview || '<p>Geen preview beschikbaar</p>');

                    // Log debug info to console for troubleshooting
                    if (response.data.debug) {
                        console.log('=== CTCS Debug Info ===');
                        console.log('Debug:', response.data.debug);
                        if (response.data.parsed && response.data.parsed.sections) {
                            console.log('Parsed sections count:', response.data.parsed.sections.length);
                            console.log('Section headings:', response.data.parsed.sections.map(function(s) { return s.heading; }));
                        }
                    }

                    showPreviewArea();
                } else {
                    alert(ctcsAdmin.i18n.error + ': ' + (response.data.message || 'Unknown error'));
                    showImportArea();
                }
            },
            error: function(xhr, status, error) {
                isProcessing = false;
                console.error('AJAX Error:', status, error);
                alert(ctcsAdmin.i18n.error + ': ' + error);
                showImportArea();
            }
        });
    }

    /**
     * Render detected components
     */
    function renderComponents(components) {
        var list = elements.componentsList;
        list.empty();

        // Key Takeaways
        list.append(createComponentTag('Key Takeaways', components.has_key_takeaways, 'list-view'));

        // FAQ
        list.append(createComponentTag('FAQ Sectie', components.has_faq, 'format-chat'));

        // Hero
        list.append(createComponentTag('Hero', components.has_hero, 'star-filled'));

        // Sections count
        var sectionCount = (components.sections && Array.isArray(components.sections)) ? components.sections.length : 0;
        list.append(createComponentTag(sectionCount + ' Secties', sectionCount > 0, 'editor-ul'));

        // ToC
        var tocCount = (components.toc_items && Array.isArray(components.toc_items)) ? components.toc_items.length : 0;
        list.append(createComponentTag('Inhoudsopgave', tocCount > 0, 'menu'));

        // CTAs
        var ctaCount = (components.cta_positions && Array.isArray(components.cta_positions)) ? components.cta_positions.length : 0;
        list.append(createComponentTag(ctaCount + ' CTA Blokken', ctaCount > 0, 'megaphone'));
    }

    /**
     * Create component tag element
     */
    function createComponentTag(label, isActive, icon) {
        var activeClass = isActive ? 'ctcs-component-tag--active' : '';
        var iconHtml = icon ? '<span class="dashicons dashicons-' + icon + '"></span>' : '';
        return $('<span class="ctcs-component-tag ' + activeClass + '">' + iconHtml + label + '</span>');
    }

    /**
     * Open media library
     */
    function openMediaLibrary() {
        if (typeof wp === 'undefined' || typeof wp.media === 'undefined') {
            alert('Media library not available');
            return;
        }

        var frame = wp.media({
            title: ctcsAdmin.i18n.selectImage || 'Select Image',
            button: { text: ctcsAdmin.i18n.useImage || 'Use Image' },
            multiple: false
        });

        frame.on('select', function() {
            var attachment = frame.state().get('selection').first().toJSON();
            selectedImageId = attachment.id;
            elements.featuredImageId.val(attachment.id);

            var thumbUrl = attachment.sizes && attachment.sizes.thumbnail
                ? attachment.sizes.thumbnail.url
                : attachment.url;
            elements.featuredImagePreview.html('<img src="' + thumbUrl + '" alt="">');
            elements.removeImageBtn.show();
        });

        frame.open();
    }

    /**
     * Remove featured image
     */
    function removeFeaturedImage() {
        selectedImageId = 0;
        elements.featuredImageId.val('');
        elements.featuredImagePreview.html('<span class="dashicons dashicons-format-image"></span>');
        elements.removeImageBtn.hide();
    }

    /**
     * Create post via AJAX
     */
    function createPost(status) {
        if (isProcessing) return;

        var title = elements.postTitle.val();
        if (title) {
            title = title.trim();
        }

        if (!title) {
            alert('Titel is verplicht');
            return;
        }

        isProcessing = true;
        showProcessing();
        elements.processingArea.find('.ctcs-processing__text').text(ctcsAdmin.i18n.creating || 'Creating post...');

        var postType = elements.postType.val() || 'post';

        $.ajax({
            url: ctcsAdmin.ajaxUrl,
            type: 'POST',
            data: {
                action: 'ctcs_create_post',
                nonce: ctcsAdmin.nonce,
                title: title,
                content: currentPreview,
                slug: elements.postSlug.val(),
                post_type: postType,
                category: elements.postCategory.val(),
                page_template: elements.pageTemplate.val(),
                status: status,
                meta_description: elements.metaDescription.val(),
                featured_image_id: elements.featuredImageId.val()
            },
            success: function(response) {
                isProcessing = false;

                if (response.success) {
                    // Update success links
                    elements.viewPostBtn.attr('href', response.data.view_url);
                    elements.editPostBtn.attr('href', response.data.edit_url);

                    // Update success message based on post type
                    var typeLabel = response.data.post_type_label || postType;
                    elements.successTitle.text(typeLabel + ' succesvol aangemaakt!');

                    showSuccessArea();
                } else {
                    alert(ctcsAdmin.i18n.error + ': ' + (response.data.message || 'Unknown error'));
                    showPreviewArea();
                }
            },
            error: function(xhr, status, error) {
                isProcessing = false;
                console.error('AJAX Error:', status, error);
                alert(ctcsAdmin.i18n.error + ': ' + error);
                showPreviewArea();
            }
        });
    }

    /**
     * Update slug based on title
     */
    function updateSlug() {
        var title = elements.postTitle.val() || '';
        elements.postSlug.val(sanitizeTitle(title));
    }

    /**
     * Handle post type change - show/hide relevant fields
     */
    function handlePostTypeChange() {
        var postType = elements.postType.val();

        // Show category for posts, template for pages
        if (postType === 'post') {
            elements.categoryField.show();
            elements.templateField.hide();
        } else if (postType === 'page') {
            elements.categoryField.hide();
            elements.templateField.show();
        } else {
            // For custom post types, show category if it supports it
            // For simplicity, hide both and just use defaults
            elements.categoryField.hide();
            elements.templateField.hide();
        }
    }

    /**
     * Sanitize title to slug
     */
    function sanitizeTitle(title) {
        if (!title) return '';
        return title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
    }

    /**
     * Show/hide areas
     */
    function showImportArea() {
        elements.importArea.show();
        elements.previewArea.hide();
        elements.processingArea.hide();
        elements.successArea.hide();
    }

    function showPreviewArea() {
        elements.importArea.hide();
        elements.previewArea.show();
        elements.processingArea.hide();
        elements.successArea.hide();
    }

    function showProcessing() {
        elements.importArea.hide();
        elements.previewArea.hide();
        elements.processingArea.show();
        elements.successArea.hide();
        elements.processingArea.find('.ctcs-processing__text').text(ctcsAdmin.i18n.processing || 'Processing...');
    }

    function showSuccessArea() {
        elements.importArea.hide();
        elements.previewArea.hide();
        elements.processingArea.hide();
        elements.successArea.show();
    }

    function resetAndShowImport() {
        // Reset form values
        elements.postTitle.val('');
        elements.postSlug.val('');
        elements.postType.val('page'); // Default to page
        elements.postCategory.val('0');
        elements.pageTemplate.val('template-seo-article.php'); // Default to SEO Article template
        elements.metaDescription.val('');
        elements.pasteContent.val('');

        // Reset visibility
        handlePostTypeChange();

        // Reset file input using native DOM
        var fileInput = document.getElementById('ctcs-file-input');
        if (fileInput) {
            fileInput.value = '';
        }

        removeFeaturedImage();
        elements.componentsList.empty();
        elements.previewContent.empty();

        // Reset state
        currentContent = '';
        currentComponents = null;
        currentPreview = '';

        showImportArea();
    }

    // Initialize on document ready
    $(document).ready(init);

})(jQuery);

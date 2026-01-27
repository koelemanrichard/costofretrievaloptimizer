/**
 * Daadvracht Theme Customizer Live Preview
 */
(function($) {
    'use strict';

    // Container Width
    wp.customize('daadvracht_container_width', function(value) {
        value.bind(function(newval) {
            $('.container, .site-header .container').css('max-width', newval + 'px');
        });
    });

    // Page Content Width
    wp.customize('daadvracht_page_content_width', function(value) {
        value.bind(function(newval) {
            $('.page-content .container').css('max-width', newval + 'px');
        });
    });

    // Full Width Pages
    wp.customize('daadvracht_fullwidth_pages', function(value) {
        value.bind(function(newval) {
            if (newval) {
                $('.page-content .container, .page-content .entry-content').css({
                    'max-width': '100%',
                    'width': '100%'
                });
            } else {
                var pageWidth = wp.customize('daadvracht_page_content_width').get();
                $('.page-content .container').css('max-width', pageWidth + 'px');
            }
        });
    });

})(jQuery);

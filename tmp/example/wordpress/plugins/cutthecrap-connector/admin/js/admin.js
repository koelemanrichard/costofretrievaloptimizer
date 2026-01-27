/**
 * CutTheCrap Connector Admin JavaScript
 */

(function($) {
    'use strict';

    $(document).ready(function() {
        // Copy Site ID to clipboard
        $('.cutthecrap-settings input[readonly]').on('click', function() {
            this.select();
            document.execCommand('copy');

            // Show copied feedback
            var $input = $(this);
            var originalBg = $input.css('background-color');
            $input.css('background-color', '#d4edda');

            setTimeout(function() {
                $input.css('background-color', originalBg);
            }, 500);
        });

        // Test webhook URL
        $('#cutthecrap-test-webhook').on('click', function(e) {
            e.preventDefault();

            var $button = $(this);
            var $status = $('#cutthecrap-webhook-status');
            var webhookUrl = $('input[name="cutthecrap_webhook_url"]').val();

            if (!webhookUrl) {
                $status.text(cutthecrapAdmin.i18n.testFailed + ' No URL provided.')
                       .removeClass('success').addClass('error');
                return;
            }

            $button.prop('disabled', true).text('Testing...');

            $.ajax({
                url: cutthecrapAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'cutthecrap_test_webhook',
                    nonce: cutthecrapAdmin.nonce,
                    webhook_url: webhookUrl
                },
                success: function(response) {
                    if (response.success) {
                        $status.text(cutthecrapAdmin.i18n.testSuccess)
                               .removeClass('error').addClass('success');
                    } else {
                        $status.text(cutthecrapAdmin.i18n.testFailed + ' ' + response.data)
                               .removeClass('success').addClass('error');
                    }
                },
                error: function() {
                    $status.text(cutthecrapAdmin.i18n.testFailed)
                           .removeClass('success').addClass('error');
                },
                complete: function() {
                    $button.prop('disabled', false).text('Test Webhook');
                }
            });
        });
    });

})(jQuery);

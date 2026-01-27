<?php
/**
 * MVGM VvE Beheer Redirect Rules - WordPress
 *
 * INSTRUCTIONS:
 * Option 1: Add to your theme's functions.php
 * Option 2: Create as a must-use plugin in /wp-content/mu-plugins/
 * Option 3: Use with Redirection plugin (import CSV version)
 *
 * This code hooks into WordPress early and handles redirects before
 * the main query runs.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * MVGM VvE Beheer Redirects
 * Implements phased migration from mvgm.com to mvgm-vvebeheer.nl
 */
add_action('template_redirect', 'mvgm_vve_beheer_redirects', 1);

function mvgm_vve_beheer_redirects() {
    $request_uri = $_SERVER['REQUEST_URI'];
    $request_uri_no_query = strtok($request_uri, '?');

    // Remove trailing slash for comparison, then we'll add it back
    $clean_uri = rtrim($request_uri_no_query, '/');

    // =================================================================
    // PHASE 1: Legal, Contact & News Pages (09-02-2026)
    // =================================================================

    $phase1_redirects = array(
        // Legal pages
        '/nl/privacybeleid' => 'https://mvgm-vvebeheer.nl/privacybeleid/',
        '/nl/disclaimer' => 'https://mvgm-vvebeheer.nl/disclaimer/',
        '/nl/cookiebeleid' => 'https://mvgm-vvebeheer.nl/cookiebeleid/',

        // Contact & Service
        '/nl/contact' => 'https://mvgm-vvebeheer.nl/over-ons/contact/',
        '/nl/storing-melden' => 'https://mvgm-vvebeheer.nl/storing-melden/',

        // News articles
        '/nl/mvgm-vve-biedt-trainees-een-veelzijdige-kick-start-van-hun-carriere-in-het-vastgoed' => 'https://mvgm-vvebeheer.nl/nieuws/kickstart-carriere-in-vastgoed/',
        '/nl/mvgm-neemt-het-vve-beheer-van-ruijters-vastgoed-over' => 'https://mvgm-vvebeheer.nl/nieuws/mvgm-neemt-het-vve-beheer-van-ruijters-vastgoed-over/',
        '/nl/mvgm-vve-op-de-vve-beurs-haaglanden' => 'https://mvgm-vvebeheer.nl/nieuws/mvgm-vve-op-de-vve-beurs-haaglanden/',
        '/nl/mvgm-neemt-vve-beheer-van-marsaki-over' => 'https://mvgm-vvebeheer.nl/nieuws/mvgm-neemt-vve-beheer-van-marsaki-over/',
        '/nl/mvgm-vve-in-middelburg-nu-ook-lokaal-aanwezig-middelburg' => 'https://mvgm-vvebeheer.nl/nieuws/mvgm-vve-in-middelburg-nu-ook-lokaal-aanwezig-middelburg/',
        '/nl/wel-of-geen-inboedelverzekering' => 'https://mvgm-vvebeheer.nl/nieuws/wel-of-geen-inboedelverzekering/',
        '/nl/mvgm-vve-lanceert-nieuwe-beheerpakketten-en-biedt-hiermee-altijd-een-pakket-aan-die-het-beste-bij-de-wensen-van-een-vve-past' => 'https://mvgm-vvebeheer.nl/nieuws/mvgm-vve-lanceert-nieuwe-beheerpakketten-en-biedt-hiermee-altijd-een-pakket-aan-die-het-beste-bij-de-wensen-van-een-vve-past/',
        '/nl/mvgm-vve-behaalt-opnieuw-het-prestigieuze-skg-ikob-certificaat' => 'https://mvgm-vvebeheer.nl/nieuws/mvgm-vve-behaalt-opnieuw-het-prestigieuze-skg-ikob-certificaat/',
        '/nl/mvgm-kondigt-samenwerking-vvemanager-aan' => 'https://mvgm-vvebeheer.nl/nieuws/mvgm-kondigt-samenwerking-vvemanager-aan/',
        '/nl/efficienter-overzichtelijker-vve-beheer-overstap-naar-softwarepakket-twinq' => 'https://mvgm-vvebeheer.nl/nieuws/overstap-naar-softwarepakket-twinq/',
        '/nl/40-procent-energiebesparing-voor-vve' => 'https://mvgm-vvebeheer.nl/nieuws/40-procent-energiebesparing-voor-vve/',
        '/nl/passend-vve-beheer' => 'https://mvgm-vvebeheer.nl/nieuws/passend-vve-beheer/',
        '/nl/wet-verbetering-functioneren-vve-voor-kleine-vves-wat-te-doen' => 'https://mvgm-vvebeheer.nl/nieuws/wet-verbetering-functioneren-vve-voor-kleine-vves/',
    );

    // =================================================================
    // PHASE 2: Core Product & Conversion Pages (16-02-2026)
    // =================================================================

    $phase2_redirects = array(
        // Main VvE homepage
        '/nl/vastgoeddiensten/vve-beheer' => 'https://mvgm-vvebeheer.nl/',

        // Package pages
        '/nl/vastgoeddiensten/vve-beheer/vve-beheer-premium' => 'https://mvgm-vvebeheer.nl/pakket/premium/',
        '/nl/vastgoeddiensten/vve-beheer/vve-beheer-plus' => 'https://mvgm-vvebeheer.nl/pakket/plus/',
        '/nl/vastgoeddiensten/vve-beheer/vve-beheer-start' => 'https://mvgm-vvebeheer.nl/pakket/start/',
        '/nl/vastgoeddiensten/vve-beheer/vve-beheer-excellent' => 'https://mvgm-vvebeheer.nl/pakket/excellent/',
        '/nl/vastgoeddiensten/vve-beheer/vve-beheer-selectief' => 'https://mvgm-vvebeheer.nl/pakket/selectief/',
        '/nl/vastgoeddiensten/vve-beheer/compacte-vve-pakketten' => 'https://mvgm-vvebeheer.nl/pakket/',
        '/nl/vastgoeddiensten/compacte-vve-pakketten' => 'https://mvgm-vvebeheer.nl/pakket/',
        '/nl/vastgoeddiensten/vve-beheer/extra-producten' => 'https://mvgm-vvebeheer.nl/pakket/additionele-diensten/',
        '/nl/vastgoeddiensten/vve-beheer/vve-beheer-klein-compleet' => 'https://mvgm-vvebeheer.nl/pakket/',

        // Conversion pages
        '/nl/vastgoeddiensten/vve-beheer/bedankt-voor-uw-interesse' => 'https://mvgm-vvebeheer.nl/bedankt/',

        // Customer service pages
        '/nl/vastgoeddiensten/vve-beheer/ik-ben-al-klant-mijn-vve' => 'https://mvgm-vvebeheer.nl/ik-ben-al-klant-mijn-vve/',
        '/nl/vastgoeddiensten/vve-beheer/automatische-incasso' => 'https://mvgm-vvebeheer.nl/automatische-incasso/',

        // Team/About pages
        '/nl/vastgoeddiensten/vve-beheer/managementteam-mvgm-vve' => 'https://mvgm-vvebeheer.nl/over-ons/managementteam-mvgm-vve/',
        '/nl/vastgoeddiensten/vve-beheer/team-bankzaken-crediteuren' => 'https://mvgm-vvebeheer.nl/over-ons/team-bankzaken-crediteuren/',

        // FAQ pages
        '/vve-faq/ik-wil-mijn-automatisch-incasso-stopzetten' => 'https://mvgm-vvebeheer.nl/faq/automatisch-incasso-stopzetten/',
        '/vve-faq/ik-wil-mijn-vve-bijdrage-automatisch-laten-incasseren/antwoord-ik-wil-mijn-vve-bijdrage-automatisch-laten-incasseren' => 'https://mvgm-vvebeheer.nl/faq/vve-bijdrage-automatisch-incasseren/',
        '/vve-faq/ik-wil-mijn-vve-bijdrage-automatisch-laten-incasseren' => 'https://mvgm-vvebeheer.nl/faq/vve-bijdrage-automatisch-incasseren/',
    );

    // =================================================================
    // PHASE 3: Location & Regional Pages (23-02-2026)
    // =================================================================

    $phase3_redirects = array(
        // Team page
        '/nl/vastgoeddiensten/vve-beheer/team-schade' => 'https://mvgm-vvebeheer.nl/over-ons/team-schade/',

        // Sustainability
        '/nl/vastgoeddiensten/vve-beheer/verduurzaming/stappenplan-verduurzamen-van-uw-vve' => 'https://mvgm-vvebeheer.nl/vve/duurzaamheid-esg/',
        '/nl/esg-vve' => 'https://mvgm-vvebeheer.nl/vve/duurzaamheid-esg/',

        // Newbuild VvE
        '/nl/opstarten-nieuwbouw-vve' => 'https://mvgm-vvebeheer.nl/opstarten-nieuwbouw-vve/',
        '/nl/vve-beheer/vve-beheer-voor-nieuwbouwprojecten' => 'https://mvgm-vvebeheer.nl/opstarten-nieuwbouw-vve/',

        // Region pages
        '/nl/vastgoeddiensten/vve-beheer/mvgm-vve-regio-noord-west' => 'https://mvgm-vvebeheer.nl/noord-west/',
        '/nl/vastgoeddiensten/vve-beheer/mvgm-vve-regio-zuid-west' => 'https://mvgm-vvebeheer.nl/zuid-west/',
        '/nl/vastgoeddiensten/vve-beheer/mvgm-vve-regio-midden-west' => 'https://mvgm-vvebeheer.nl/midden-west/',
        '/nl/vastgoeddiensten/vve-beheer/mvgm-vve-regio-zuid-oost' => 'https://mvgm-vvebeheer.nl/zuid-oost/',
        '/nl/vastgoeddiensten/vve-beheer/mvgm-vve-regio-noord-oost' => 'https://mvgm-vvebeheer.nl/noord-oost/',
        '/nl/vastgoeddiensten/vve-beheer/mvgm-vve-regio-midden-oost' => 'https://mvgm-vvebeheer.nl/midden-oost/',
        '/nl/vastgoeddiensten/vve-beheer/rijnmond' => 'https://mvgm-vvebeheer.nl/rijnmond/',
        '/nl/vastgoeddiensten/vve-beheer/zeeland' => 'https://mvgm-vvebeheer.nl/zeeland/',

        // City pages (from /vastgoeddiensten/vve-beheer/ path)
        '/nl/vastgoeddiensten/vve-beheer/amsterdam' => 'https://mvgm-vvebeheer.nl/amsterdam/',
        '/nl/vastgoeddiensten/vve-beheer/rotterdam' => 'https://mvgm-vvebeheer.nl/rotterdam/',
        '/nl/vastgoeddiensten/vve-beheer/utrecht' => 'https://mvgm-vvebeheer.nl/utrecht/',
        '/nl/vastgoeddiensten/vve-beheer/den-haag' => 'https://mvgm-vvebeheer.nl/den-haag/',
        '/nl/vastgoeddiensten/vve-beheer/den-haag-rijswijk' => 'https://mvgm-vvebeheer.nl/den-haag-rijswijk/',
        '/nl/vastgoeddiensten/vve-beheer/eindhoven' => 'https://mvgm-vvebeheer.nl/eindhoven/',
        '/nl/vastgoeddiensten/vve-beheer/tilburg' => 'https://mvgm-vvebeheer.nl/tilburg/',
        '/nl/vastgoeddiensten/vve-beheer/breda' => 'https://mvgm-vvebeheer.nl/breda/',
        '/nl/vastgoeddiensten/vve-beheer/groningen' => 'https://mvgm-vvebeheer.nl/groningen/',
        '/nl/vastgoeddiensten/vve-beheer/almere' => 'https://mvgm-vvebeheer.nl/almere/',
        '/nl/vastgoeddiensten/vve-beheer/nijmegen' => 'https://mvgm-vvebeheer.nl/nijmegen/',
        '/nl/vastgoeddiensten/vve-beheer/arnhem' => 'https://mvgm-vvebeheer.nl/arnhem/',
        '/nl/vastgoeddiensten/vve-beheer/arnhem-2' => 'https://mvgm-vvebeheer.nl/arnhem/',
        '/nl/vastgoeddiensten/vve-beheer/enschede' => 'https://mvgm-vvebeheer.nl/enschede/',
        '/nl/vastgoeddiensten/vve-beheer/apeldoorn' => 'https://mvgm-vvebeheer.nl/apeldoorn/',
        '/nl/vastgoeddiensten/vve-beheer/amersfoort' => 'https://mvgm-vvebeheer.nl/amersfoort/',
        '/nl/vastgoeddiensten/vve-beheer/zwolle' => 'https://mvgm-vvebeheer.nl/zwolle/',
        '/nl/vastgoeddiensten/vve-beheer/deventer' => 'https://mvgm-vvebeheer.nl/deventer/',
        '/nl/vastgoeddiensten/vve-beheer/leeuwarden' => 'https://mvgm-vvebeheer.nl/leeuwarden/',
        '/nl/vastgoeddiensten/vve-beheer/maastricht' => 'https://mvgm-vvebeheer.nl/maastricht/',
        '/nl/vastgoeddiensten/vve-beheer/leiden' => 'https://mvgm-vvebeheer.nl/leiden/',
        '/nl/vastgoeddiensten/vve-beheer/den-bosch' => 'https://mvgm-vvebeheer.nl/den-bosch/',
        '/nl/vastgoeddiensten/vve-beheer/dordrecht' => 'https://mvgm-vvebeheer.nl/dordrecht/',
        '/nl/vastgoeddiensten/vve-beheer/limmen' => 'https://mvgm-vvebeheer.nl/limmen/',
        '/nl/vastgoeddiensten/vve-beheer/emmen' => 'https://mvgm-vvebeheer.nl/emmen/',
        '/nl/vastgoeddiensten/vve-beheer/assen' => 'https://mvgm-vvebeheer.nl/assen/',
        '/nl/vastgoeddiensten/vve-beheer/lelystad' => 'https://mvgm-vvebeheer.nl/lelystad/',

        // City pages (from /vve-beheer/ alternative path)
        '/nl/vve-beheer/amsterdam' => 'https://mvgm-vvebeheer.nl/amsterdam/',
        '/nl/vve-beheer/rotterdam' => 'https://mvgm-vvebeheer.nl/rotterdam/',
        '/nl/vve-beheer/utrecht' => 'https://mvgm-vvebeheer.nl/utrecht/',
        '/nl/vve-beheer/eindhoven' => 'https://mvgm-vvebeheer.nl/eindhoven/',
        '/nl/vve-beheer/tilburg' => 'https://mvgm-vvebeheer.nl/tilburg/',
        '/nl/vve-beheer/breda' => 'https://mvgm-vvebeheer.nl/breda/',
        '/nl/vve-beheer/groningen' => 'https://mvgm-vvebeheer.nl/groningen/',
        '/nl/vve-beheer/almere' => 'https://mvgm-vvebeheer.nl/almere/',
        '/nl/vve-beheer/nijmegen' => 'https://mvgm-vvebeheer.nl/nijmegen/',
        '/nl/vve-beheer/arnhem' => 'https://mvgm-vvebeheer.nl/arnhem/',
        '/nl/vve-beheer/zwolle' => 'https://mvgm-vvebeheer.nl/zwolle/',
        '/nl/vve-beheer/deventer' => 'https://mvgm-vvebeheer.nl/deventer/',
        '/nl/vve-beheer/leeuwarden' => 'https://mvgm-vvebeheer.nl/leeuwarden/',
        '/nl/vve-beheer/maastricht' => 'https://mvgm-vvebeheer.nl/maastricht/',
        '/nl/vve-beheer/leiden' => 'https://mvgm-vvebeheer.nl/leiden/',
        '/nl/vve-beheer/den-bosch' => 'https://mvgm-vvebeheer.nl/den-bosch/',
        '/nl/vve-beheer/limmen' => 'https://mvgm-vvebeheer.nl/limmen/',
        '/nl/vve-beheer/middelburg' => 'https://mvgm-vvebeheer.nl/middelburg/',
    );

    // =================================================================
    // COMBINE ALL REDIRECTS
    // Comment out phases that aren't active yet
    // =================================================================

    $all_redirects = array_merge(
        $phase1_redirects,
        $phase2_redirects,
        $phase3_redirects
    );

    // Check for exact match
    if (isset($all_redirects[$clean_uri])) {
        wp_redirect($all_redirects[$clean_uri], 301);
        exit;
    }

    // =================================================================
    // SPECIAL HANDLING: Offerte pages with query strings
    // =================================================================

    if (strpos($clean_uri, '/nl/vastgoeddiensten/vve-beheer/offerte-aanvraag') !== false) {
        $vve_keuzes = isset($_GET['vve-keuzes']) ? urldecode($_GET['vve-keuzes']) : '';

        $offerte_redirects = array(
            'VvE Beheer Excellent' => 'https://mvgm-vvebeheer.nl/pakket/excellent/offerte/',
            'VvE Beheer Start' => 'https://mvgm-vvebeheer.nl/pakket/start/offerte/',
            'VvE Beheer Premium' => 'https://mvgm-vvebeheer.nl/pakket/premium/offerte/',
            'VvE Beheer Plus' => 'https://mvgm-vvebeheer.nl/pakket/plus/offerte/',
            'VvE Beheer Selectief' => 'https://mvgm-vvebeheer.nl/pakket/selectief/offerte/',
            'VvE Beheer Klein Compleet' => 'https://mvgm-vvebeheer.nl/pakket/',
        );

        if (!empty($vve_keuzes) && isset($offerte_redirects[$vve_keuzes])) {
            wp_redirect($offerte_redirects[$vve_keuzes], 301);
            exit;
        }

        // Default offerte redirect (no query string)
        wp_redirect('https://mvgm-vvebeheer.nl/offerte-aanvraag/', 301);
        exit;
    }
}

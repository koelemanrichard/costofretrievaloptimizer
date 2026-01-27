# MVGM VvE Beheer Redirect Plan

**Migration:** mvgm.com → mvgm-vvebeheer.nl
**Generated:** 2026-01-23
**Total URLs:** 108 (including trailing slash variants)

---

## Files in This Package

| File | Description | Use For |
|------|-------------|---------|
| `01-redirect-spreadsheet.csv` | Complete redirect mapping | Import to Excel/Sheets, share with team |
| `02-htaccess-redirects.txt` | Apache .htaccess rules | Apache servers |
| `03-nginx-redirects.conf` | Nginx configuration | Nginx servers |
| `04-wordpress-redirects.php` | WordPress PHP code | WordPress sites |
| `05-backlink-analysis-guide.md` | Instructions for backlink data | Preparing SEO analysis |
| `06-missing-urls-found.md` | URLs missing from original plan | Review & add to plan |

---

## Quick Start

### 1. Review Missing URLs
Read `06-missing-urls-found.md` first. Your original plan was missing 21 URLs.

### 2. Choose Your Server Type

**Apache (most WordPress hosts):**
- Copy contents of `02-htaccess-redirects.txt`
- Add to `.htaccess` file on mvgm.com

**Nginx:**
- Copy contents of `03-nginx-redirects.conf`
- Add to server block for mvgm.com

**WordPress (code-based):**
- Upload `04-wordpress-redirects.php` to `/wp-content/mu-plugins/`

**WordPress (plugin-based):**
- Import `01-redirect-spreadsheet.csv` into Redirection plugin

### 3. Phased Rollout

| Phase | Date | What's Included |
|-------|------|-----------------|
| Phase 1 | 09-02-2026 | Legal pages, contact, news articles |
| Phase 2 | 16-02-2026 | Homepage, packages, conversion pages, FAQs |
| Phase 3 | 23-02-2026 | City pages, regions, team pages |

### 4. Testing

Before each phase:
1. Test redirects on staging environment
2. Verify destination pages return 200
3. Check for redirect chains (A→B→C)
4. Confirm no redirect loops

After each phase:
1. Check Google Search Console for 404 errors
2. Monitor server logs for failed redirects
3. Verify in browser (clear cache first)

---

## Important Notes

### URL Formatting Fixes Applied
Your original plan had inconsistent URLs. All URLs in these files have been standardized:
- All destinations include `https://`
- All destinations include `.nl` domain
- All paths end with trailing slash
- Removed typos (like `selectief./offerte`)

### Decisions Required

1. **Thank you page:** Created redirect to `/bedankt/` - verify this page exists
2. **FAQ pages:** Created redirect to `/faq/` section - verify these pages exist
3. **News articles:** All redirected to `/nieuws/` - verify pages exist or remove redirects

### Server Requirements

- Redirects must be processed **before** any CMS routing
- Apache: Requires `mod_rewrite` enabled
- Nginx: Requires `location` blocks in correct order
- WordPress: Hook runs at `template_redirect` priority 1

---

## Support

For questions about implementation, contact:
- Brightlot (main redirects)
- Ronald (individual page redirects)

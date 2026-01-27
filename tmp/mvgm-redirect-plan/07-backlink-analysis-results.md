# Backlink Analysis Results - MVGM VvE Beheer

**Data Source:** Google Search Console
**Analysis Date:** 2026-01-23

---

## Priority Ranking by Link Equity

### CRITICAL Priority (>10 links or >5 linking sites)

| URL | Links | Sites | Status | Action |
|-----|-------|-------|--------|--------|
| `/nl/vastgoeddiensten/vve-beheer/` | 43 | 14 | ✅ In plan | Redirect first |
| `/nl/vastgoeddiensten/vve-beheer/contactformulier-vve/` | 8 | 1 | ❌ **MISSING** | **ADD TO PLAN** |

### HIGH Priority (4-10 links)

| URL | Links | Sites | Status | Action |
|-----|-------|-------|--------|--------|
| `/nl/vastgoeddiensten/vve-beheer/amsterdam/` | 6 | 2 | ✅ In plan | Phase 3 |
| `/nl/vastgoeddiensten/vve-beheer/breda/` | 5 | 4 | ✅ In plan | Phase 3 |
| `/nl/vastgoeddiensten/vve-beheer/offerte-aanvraag/` | 4 | 2 | ✅ In plan | Phase 2 |
| `/nl/vastgoeddiensten/vve-beheer/ik-ben-al-klant-mijn-vve/` | 4 | 2 | ✅ In plan | Phase 2 |
| `/nl/vastgoeddiensten/vve-beheer/den-haag-rijswijk/` | 4 | 2 | ✅ In plan | Phase 3 |

### MEDIUM Priority (2-3 links)

| URL | Links | Sites | Status | Action |
|-----|-------|-------|--------|--------|
| `/nl/vastgoeddiensten/vve-beheer/almere/` | 3 | 1 | ✅ In plan | Phase 3 |
| `/nl/vastgoeddiensten/vve-beheer/automatische-incasso/` | 2 | 1 | ✅ In plan | Phase 2 |
| `/nl/vastgoeddiensten/vve-beheer/den-bosch/` | 2 | 1 | ✅ In plan | Phase 3 |
| `/nl/vastgoeddiensten/vve-beheer/den-haag/` | 2 | 1 | ✅ In plan | Phase 3 |
| `/nl/vastgoeddiensten/vve-beheer/eindhoven/` | 2 | 2 | ✅ In plan | Phase 3 |
| `/nl/vastgoeddiensten/vve-beheer/groningen/` | 2 | 2 | ✅ In plan | Phase 3 |
| `/nl/vastgoeddiensten/vve-beheer/rotterdam/` | 2 | 2 | ✅ In plan | Phase 3 |
| `/nl/mvgm-neemt-actys-wonen-en-actys-vve/` | 2 | 2 | ❌ **MISSING** | **ADD TO PLAN** |
| `/nl/vve-beheer-veelgestelde-vragen/` | 2 | 2 | ❌ **MISSING** | **ADD TO PLAN** |

### LOW Priority (1 link)

| URL | Links | Sites | Status | Action |
|-----|-------|-------|--------|--------|
| `/nl/vastgoeddiensten/vve-beheer/verduurzaming/` | 1 | 1 | ⚠️ Partial | Add parent URL |
| `/nl/vastgoeddiensten/vve-beheer/vve-whatsapp/` | 1 | 1 | ❌ **MISSING** | **ADD TO PLAN** |
| `/nl/vastgoedtypes/commercial-real-estate/vve-commercieel/` | 1 | 1 | ⏸️ Review | May stay on mvgm.com |

---

## NEW URLs to Add to Redirect Plan

### 1. Contact Form Page (CRITICAL - 8 backlinks)

```
Original: https://mvgm.com/nl/vastgoeddiensten/vve-beheer/contactformulier-vve/
Target:   https://mvgm-vvebeheer.nl/contact/
Phase:    2 (16-02-2026)
```

### 2. FAQ Page (2 backlinks)

```
Original: https://mvgm.com/nl/vve-beheer-veelgestelde-vragen/
Target:   https://mvgm-vvebeheer.nl/faq/
Phase:    2 (16-02-2026)
```

### 3. News Article - Actys (2 backlinks)

```
Original: https://mvgm.com/nl/mvgm-neemt-actys-wonen-en-actys-vve/
Target:   https://mvgm-vvebeheer.nl/nieuws/mvgm-neemt-actys-wonen-en-actys-vve/
Phase:    1 (09-02-2026)
```

### 4. WhatsApp Page (1 backlink)

```
Original: https://mvgm.com/nl/vastgoeddiensten/vve-beheer/vve-whatsapp/
Target:   https://mvgm-vvebeheer.nl/contact/ (or /whatsapp/ if exists)
Phase:    2 (16-02-2026)
```

### 5. Verduurzaming Parent Page (1 backlink)

```
Original: https://mvgm.com/nl/vastgoeddiensten/vve-beheer/verduurzaming/
Target:   https://mvgm-vvebeheer.nl/vve/duurzaamheid-esg/
Phase:    3 (23-02-2026)
```

---

## Decision Required: Commercial VvE

This URL may **not** be part of the VvE beheer migration:

```
https://mvgm.com/nl/vastgoedtypes/commercial-real-estate/vve-commercieel/
```

**Options:**
1. Leave on mvgm.com (if commercial VvE stays with MVGM)
2. Redirect to mvgm-vvebeheer.nl if they handle commercial too
3. Redirect to mvgm.com homepage if page is being removed

---

## Link Equity Distribution

```
Total backlinks to VvE pages: 114
Total linking sites: ~50 (estimated unique)

Distribution:
├── Homepage (/vve-beheer/): 43 links (38%)
├── City pages: 35 links (31%)
├── Conversion pages: 16 links (14%)
├── Service pages: 12 links (10%)
└── News/Other: 8 links (7%)
```

### Implication for Migration

The homepage (`/nl/vastgoeddiensten/vve-beheer/`) carries **38% of all link equity**. This redirect is the most critical and should:
- Be implemented in Phase 2 (not delayed)
- Be tested thoroughly before going live
- Be monitored closely after implementation

---

## Redirect Rules to Add

### Apache (.htaccess)

```apache
# Add to Phase 2 section
RewriteRule ^nl/vastgoeddiensten/vve-beheer/contactformulier-vve/?$ https://mvgm-vvebeheer.nl/contact/ [R=301,L]
RewriteRule ^nl/vve-beheer-veelgestelde-vragen/?$ https://mvgm-vvebeheer.nl/faq/ [R=301,L]
RewriteRule ^nl/vastgoeddiensten/vve-beheer/vve-whatsapp/?$ https://mvgm-vvebeheer.nl/contact/ [R=301,L]

# Add to Phase 1 section
RewriteRule ^nl/mvgm-neemt-actys-wonen-en-actys-vve/?$ https://mvgm-vvebeheer.nl/nieuws/mvgm-neemt-actys-wonen-en-actys-vve/ [R=301,L]

# Add to Phase 3 section
RewriteRule ^nl/vastgoeddiensten/vve-beheer/verduurzaming/?$ https://mvgm-vvebeheer.nl/vve/duurzaamheid-esg/ [R=301,L]
```

### Nginx

```nginx
# Add to Phase 2 section
location = /nl/vastgoeddiensten/vve-beheer/contactformulier-vve/ { return 301 https://mvgm-vvebeheer.nl/contact/; }
location = /nl/vve-beheer-veelgestelde-vragen/ { return 301 https://mvgm-vvebeheer.nl/faq/; }
location = /nl/vastgoeddiensten/vve-beheer/vve-whatsapp/ { return 301 https://mvgm-vvebeheer.nl/contact/; }

# Add to Phase 1 section
location = /nl/mvgm-neemt-actys-wonen-en-actys-vve/ { return 301 https://mvgm-vvebeheer.nl/nieuws/mvgm-neemt-actys-wonen-en-actys-vve/; }

# Add to Phase 3 section
location = /nl/vastgoeddiensten/vve-beheer/verduurzaming/ { return 301 https://mvgm-vvebeheer.nl/vve/duurzaamheid-esg/; }
```

---

## Summary

| Metric | Value |
|--------|-------|
| Total VvE URLs with backlinks | 29 |
| URLs in redirect plan | 24 |
| URLs missing from plan | **5** |
| Total backlinks at risk | **14** (from missing URLs) |
| Contact form page (critical) | **8 backlinks** |

# SEO Best Practices: Domain Migration

**Migration:** mvgm.com (VvE section) → mvgm-vvebeheer.nl
**Goal:** Preserve maximum link equity and rankings

---

## Pre-Migration Checklist

### 1. Benchmark Current Performance (Do This NOW)

Before any redirects go live, document:

- [ ] **Rankings**: Export current keyword rankings for all VvE-related terms
  - Use Semrush, Ahrefs, or manual Google checks
  - Focus on: "vve beheer", "vve beheer [stad]", package names

- [ ] **Traffic**: Screenshot Google Analytics for VvE pages
  - Last 30 days organic sessions
  - Top landing pages
  - Conversion data (offerte requests)

- [ ] **Indexed pages**: Run `site:mvgm.com/nl/vastgoeddiensten/vve-beheer`
  - Count indexed pages
  - Screenshot for comparison

- [ ] **Backlink snapshot**: Save current GSC/Ahrefs data (you have this)

### 2. New Site Preparation

- [ ] **All destination URLs return 200** (not 404, not redirect)
- [ ] **Content parity**: New pages have equal or better content
- [ ] **Canonical tags**: Point to new domain (`<link rel="canonical" href="https://mvgm-vvebeheer.nl/...">`)
- [ ] **No noindex**: Verify new pages are indexable
- [ ] **XML Sitemap**: Created and ready at `mvgm-vvebeheer.nl/sitemap.xml`
- [ ] **robots.txt**: Allows crawling of all important pages
- [ ] **HTTPS**: SSL certificate installed and working
- [ ] **Mobile-friendly**: New site passes Google Mobile-Friendly test

### 3. Google Search Console Setup

- [ ] Add `mvgm-vvebeheer.nl` as new property
- [ ] Verify ownership (DNS or HTML file)
- [ ] Submit sitemap
- [ ] **Do NOT use Change of Address tool** (partial migration, not full domain move)

---

## During Migration

### Phase 1 Execution (09-02-2026)

1. **Implement redirects** for legal/news pages
2. **Test each redirect** manually in incognito browser
3. **Check for chains**: Use redirect checker tool
4. **Monitor server logs** for 404s and 500s

### Phase 2 Execution (16-02-2026) - CRITICAL

This phase includes the homepage with 43 backlinks.

1. **Pre-flight check**: Verify `mvgm-vvebeheer.nl/` loads correctly
2. **Implement redirects** during low-traffic hours (early morning)
3. **Immediately test** the main redirect: `mvgm.com/nl/vastgoeddiensten/vve-beheer/`
4. **Request indexing** in GSC for `mvgm-vvebeheer.nl/`
5. **Monitor Search Console** for crawl errors within 24 hours

### Phase 3 Execution (23-02-2026)

1. Implement city/region page redirects
2. Final internal link cleanup on mvgm.com
3. Update footer/navigation links

---

## Link Equity Preservation Rules

### Rule 1: Always Use 301 (Permanent) Redirects

```
301 = "This page has permanently moved"
     = Passes ~90-99% of link equity

302 = "This page has temporarily moved"
     = Passes minimal link equity
     = NEVER use for permanent migration
```

### Rule 2: Avoid Redirect Chains

**Bad:**
```
mvgm.com/vve-beheer/ → mvgm.com/nl/vve-beheer/ → mvgm-vvebeheer.nl/
```
Each hop loses ~10% equity.

**Good:**
```
mvgm.com/vve-beheer/ → mvgm-vvebeheer.nl/
mvgm.com/nl/vve-beheer/ → mvgm-vvebeheer.nl/
```
Direct to final destination.

### Rule 3: Match Content Relevance

**Good redirect (topically matched):**
```
/vve-beheer-premium/ → /pakket/premium/
```

**Bad redirect (generic/irrelevant):**
```
/vve-beheer-premium/ → /
```

When content is 1:1 matched, Google transfers relevance signals more effectively.

### Rule 4: Preserve URL Structure Where Possible

Your city pages do this well:
```
/vve-beheer/amsterdam/ → /amsterdam/
```

The semantic similarity helps Google understand the relationship.

### Rule 5: Keep Redirects Active for 1+ Year

Do not remove 301 redirects for at least 12 months:
- Google needs time to discover and process all redirects
- Cached pages in browsers will still try old URLs
- Some backlinks may not update their href values

---

## Post-Migration Monitoring

### Week 1

| Check | How | Target |
|-------|-----|--------|
| Crawl errors | GSC → Coverage | 0 new errors |
| 404s | GSC → Coverage → Excluded | <5 new 404s |
| Indexing | `site:mvgm-vvebeheer.nl` | Pages appearing |
| Traffic | Analytics | <20% drop is normal |

### Week 2-4

| Check | How | Target |
|-------|-----|--------|
| Rankings | Rank tracker | Stabilizing |
| Organic traffic | Analytics | Recovering |
| Backlink indexing | GSC → Links | New domain appearing |

### Month 2-3

| Check | How | Target |
|-------|-----|--------|
| Full traffic recovery | Analytics | ≥90% of pre-migration |
| Ranking recovery | Rank tracker | Same or improved |
| Old URLs de-indexed | `site:mvgm.com vve-beheer` | Decreasing count |

---

## Common Mistakes to Avoid

### Mistake 1: Soft 404s

**Problem:** New page returns 200 but shows "page not found" content.
**Solution:** Ensure all destination URLs have real content, not error messages.

### Mistake 2: Canonical Pointing to Old Domain

**Problem:** New page has `<link rel="canonical" href="https://mvgm.com/...">`.
**Solution:** Update all canonicals to point to `mvgm-vvebeheer.nl`.

### Mistake 3: Mixed Content (HTTP/HTTPS)

**Problem:** Some internal links on new site point to `http://` instead of `https://`.
**Solution:** Audit all internal links, ensure HTTPS throughout.

### Mistake 4: Blocking Googlebot

**Problem:** robots.txt on new site blocks crawling, or pages have `noindex`.
**Solution:** Check robots.txt and meta robots tags before migration.

### Mistake 5: Forgetting About Internal Links

**Problem:** mvgm.com still has internal links pointing to old VvE URLs.
**Solution:** Update internal links to point directly to new domain (better than relying on redirects).

### Mistake 6: Not Monitoring

**Problem:** Migration goes live, team moves on, issues go unnoticed.
**Solution:** Set calendar reminders for daily checks in week 1, weekly in month 1.

---

## Backlink Outreach (Optional but Recommended)

For your highest-value backlinks (especially the 14 sites linking to homepage), consider:

1. **Identify the linking sites** (from Ahrefs/GSC)
2. **Find contact information** for webmasters
3. **Send update request:**

```
Subject: Updated URL for MVGM VvE Beheer

Hallo,

We noticed your website links to our VvE beheer page at mvgm.com.

We've moved our VvE beheer services to a dedicated website:
https://mvgm-vvebeheer.nl/

While we have redirects in place, updating your link directly would be
appreciated and ensures the best experience for your visitors.

Old: https://mvgm.com/nl/vastgoeddiensten/vve-beheer/
New: https://mvgm-vvebeheer.nl/

Bedankt!
```

This is especially valuable for:
- High-authority sites
- Sites where you have a relationship
- Directory listings you control

---

## Technical Implementation Notes

### Server Response Time

New domain should respond in <200ms. Slow responses delay crawling.

```bash
# Test response time
curl -w "%{time_total}\n" -o /dev/null -s https://mvgm-vvebeheer.nl/
```

### Redirect Response Headers

Verify redirects return proper headers:

```bash
curl -I https://mvgm.com/nl/vastgoeddiensten/vve-beheer/
```

Should show:
```
HTTP/1.1 301 Moved Permanently
Location: https://mvgm-vvebeheer.nl/
```

### Caching Redirects

Set appropriate cache headers on redirects:

```apache
# Apache
Header set Cache-Control "max-age=31536000"
```

```nginx
# Nginx
add_header Cache-Control "max-age=31536000";
```

This reduces server load and speeds up the redirect for users.

---

## Timeline Summary

| Date | Action | Owner |
|------|--------|-------|
| NOW | Benchmark current performance | You |
| NOW | Verify all destination pages exist | Ronald |
| 09-02-2026 | Phase 1: Legal + News redirects | Ronald |
| 10-02-2026 | Monitor Phase 1, fix issues | Ronald |
| 16-02-2026 | Phase 2: Core pages + Homepage | Ronald/Brightlot |
| 17-02-2026 | Request indexing in GSC | You |
| 23-02-2026 | Phase 3: City + Region pages | Ronald |
| 24-02-2026 | Update mvgm.com internal links | Brightlot |
| 01-03-2026 | Week 1 performance review | You |
| 15-03-2026 | Month 1 performance review | You |
| 01-06-2026 | Full recovery assessment | You |

---

## Emergency Rollback Plan

If something goes seriously wrong:

1. **Remove redirect rules** from server config
2. **Restart web server**
3. **Verify old pages accessible**
4. **Investigate root cause** before retrying

Keep a backup of the server config before each phase.

---

## Success Metrics

| Metric | Acceptable | Good | Excellent |
|--------|------------|------|-----------|
| Traffic recovery (3 months) | 80% | 90% | 100%+ |
| Ranking recovery (3 months) | -5 positions | Same | Improved |
| Crawl errors | <10 | <5 | 0 |
| 404 errors | <20 | <10 | 0 |

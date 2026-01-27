# Backlink Analysis Guide for MVGM VvE Beheer Migration

## What Data to Provide

To analyze backlinks and prioritize redirects based on link equity, please export data from one of these tools:

### Option A: Google Search Console (Free)
1. Go to Google Search Console for mvgm.com
2. Navigate to: **Links** → **Top linked pages**
3. Click **Export** (top right)
4. Filter results for URLs containing "vve" or "vve-beheer"

**What this provides:**
- Internal linking data
- Some external link data (limited)
- Top linked pages by link count

---

### Option B: Ahrefs (Recommended)
1. Go to Site Explorer → Enter `mvgm.com`
2. Navigate to: **Backlinks** or **Best by links**
3. Filter by URL containing: `vve-beheer` OR `vve`
4. Export to CSV

**Export columns needed:**
- Referring Page URL
- Target URL (the mvgm.com page)
- Domain Rating (DR)
- Anchor Text
- Link Type (dofollow/nofollow)
- First Seen / Last Seen dates

---

### Option C: Semrush
1. Go to Backlink Analytics → Enter `mvgm.com`
2. Navigate to: **Backlinks**
3. Filter Target URL contains: `vve-beheer`
4. Export to CSV

**Export columns needed:**
- Source URL
- Target URL
- Authority Score
- Anchor Text
- Link Type

---

### Option D: Moz Link Explorer
1. Enter `mvgm.com/nl/vastgoeddiensten/vve-beheer/`
2. Go to: **Inbound Links**
3. Export CSV

---

## What I Will Do With This Data

Once you provide the backlink export, I will:

1. **Identify high-value pages** - Pages with most external backlinks
2. **Prioritize redirect order** - Ensure pages with most link equity are redirected first
3. **Check for broken redirects** - Flag any backlinked URLs not in our redirect list
4. **Analyze anchor text** - Ensure new URLs maintain semantic relevance
5. **Domain authority assessment** - Identify links from high-authority domains

---

## Priority Indicators

When analyzing, I'll flag URLs by priority:

| Link Count | Domain Rating | Priority |
|------------|---------------|----------|
| >50 links  | Any           | Critical |
| 10-50 links | DR >40       | High     |
| 10-50 links | DR <40       | Medium   |
| <10 links  | Any           | Standard |

---

## Additional Useful Data

If available, also provide:
- **Referring domains report** (unique domains linking to VvE pages)
- **Anchor text report** (what text is used to link to VvE pages)
- **Lost backlinks report** (if any links were recently lost)

---

## File Format

Please provide exports as:
- CSV (preferred)
- Excel (.xlsx)
- Or share a Google Sheet link

Upload the file and I'll analyze it for you.

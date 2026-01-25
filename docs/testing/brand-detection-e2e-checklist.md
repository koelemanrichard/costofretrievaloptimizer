# Brand Detection End-to-End Testing Checklist

> Manual testing checklist for the AI Vision-First Brand Design System
> Last updated: 2026-01-25

## Prerequisites

Before testing, ensure you have:

- [ ] **Apify Token** configured in Settings > Services > Apify API Token
- [ ] **AI Provider Key** (Gemini or Anthropic) configured in Settings > AI
- [ ] **Supabase** running (local or cloud)
- [ ] A test project with at least one topic and article draft

---

## Test Environment Setup

```bash
# Start dev server
npm run dev

# Verify Supabase is running
supabase status

# Apply migrations if needed
supabase db push
```

---

## Test Scenarios

### 1. Brand Detection Flow (Happy Path)

**Setup:** Navigate to a topic with article content, open Style & Publish modal

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.1 | Modal opens | Shows Step 1: Brand with URL input | [ ] |
| 1.2 | Enter valid URL (e.g., `https://anthropic.com`) | URL appears in input | [ ] |
| 1.3 | Click "Detect Brand" | Progress indicator shows with steps | [ ] |
| 1.4 | Wait for completion | All 5 steps show green checkmarks | [ ] |
| 1.5 | View collapsed result | Shows: screenshot thumbnail, 5 color dots, fonts, personality, confidence | [ ] |
| 1.6 | Click screenshot thumbnail | Full screenshot modal opens | [ ] |
| 1.7 | Click outside modal | Screenshot modal closes | [ ] |
| 1.8 | Click "Show Details" | Expanded view shows colors, typography, shapes, personality sections | [ ] |
| 1.9 | Verify color values | Colors match the detected brand | [ ] |
| 1.10 | Click "Next" | Moves to Step 2: Preview | [ ] |
| 1.11 | Wait for preview | Styled preview renders in device frame | [ ] |
| 1.12 | Toggle device sizes | Desktop/Tablet/Mobile all render correctly | [ ] |

---

### 2. Design DNA Inline Editing

**Setup:** Complete brand detection, expand Design DNA display

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.1 | Click "Edit" on Colors section | Colors editor opens inline | [ ] |
| 2.2 | Change primary color via color picker | Color picker works | [ ] |
| 2.3 | Change primary color via hex input | Hex input works | [ ] |
| 2.4 | Change Color Mood dropdown | Selection changes | [ ] |
| 2.5 | Click "Cancel" | Editor closes, no changes saved | [ ] |
| 2.6 | Click "Edit" again, make changes | Editor opens | [ ] |
| 2.7 | Click "Apply Changes" | Editor closes, colors update in display | [ ] |
| 2.8 | Repeat for Typography editor | Font changes work | [ ] |
| 2.9 | Repeat for Shapes editor | Shape changes work | [ ] |
| 2.10 | Repeat for Personality editor | Slider changes work | [ ] |

---

### 3. Preview Step with Panels

**Setup:** Complete brand detection, navigate to Preview step

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.1 | Preview loads | Styled content visible in device frame | [ ] |
| 3.2 | See hint message | "Preview looks good? Click 'Next' to publish..." text visible | [ ] |
| 3.3 | See collapsed panels | "Adjust Layout" and "Adjust Sections" panels visible | [ ] |
| 3.4 | Click "Adjust Layout" | Panel expands showing template and component toggles | [ ] |
| 3.5 | Change template | Selection changes | [ ] |
| 3.6 | Toggle a component off | Checkbox unchecks | [ ] |
| 3.7 | Click "Adjust Sections" | Panel expands showing section list | [ ] |
| 3.8 | Change section emphasis | Dropdown selection changes | [ ] |
| 3.9 | Click "Regenerate" | Preview regenerates | [ ] |
| 3.10 | Click "</> HTML" | Raw HTML/CSS code view shows | [ ] |
| 3.11 | Click "Copy Bundle" | HTML+CSS copied to clipboard | [ ] |

---

### 4. Error Handling

**Setup:** Test with missing/invalid configuration

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 4.1 | Remove Apify token, open modal | Warning message about missing Apify token | [ ] |
| 4.2 | Enter invalid URL | Appropriate error message | [ ] |
| 4.3 | Enter unreachable URL | Error shows after timeout | [ ] |
| 4.4 | Click "Try Again" after error | Form resets, can retry | [ ] |
| 4.5 | Disconnect network mid-detection | Error state shown, can retry | [ ] |

---

### 5. Caching Behavior

**Setup:** Complete a successful brand detection

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 5.1 | Note the brand colors detected | Record values | [ ] |
| 5.2 | Close and reopen modal | Previous state cleared | [ ] |
| 5.3 | Enter same URL, detect again | Should hit cache (faster) | [ ] |
| 5.4 | Result shows "(from cache)" badge | Cache indicator visible | [ ] |
| 5.5 | Click "Re-detect" | Forces fresh detection | [ ] |

---

### 6. Database Persistence

**Setup:** Have access to Supabase dashboard or SQL client

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 6.1 | Complete brand detection | Success | [ ] |
| 6.2 | Check `brand_design_dna` table | New row with design_dna JSONB | [ ] |
| 6.3 | Verify screenshot_base64 | Base64 string stored | [ ] |
| 6.4 | Check `brand_design_systems` table | New row with compiled_css | [ ] |
| 6.5 | Verify design_dna_hash | Hash string present | [ ] |

---

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Screenshot capture | < 10s | _____ |
| AI DNA extraction | < 15s | _____ |
| CSS generation | < 10s | _____ |
| Total detection time | < 40s | _____ |
| Preview generation | < 3s | _____ |
| Cached detection | < 2s | _____ |

---

## Browser Compatibility

Test in:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Known Limitations

1. **Apify rate limits** - May fail if too many requests in short period
2. **AI model availability** - Depends on API key quota
3. **Complex websites** - Some heavily JS-rendered sites may not capture well
4. **Screenshot size** - Very long pages may be truncated

---

## Troubleshooting

### Brand detection stuck at "Capturing screenshot"
- Check Apify token is valid
- Check Apify actor run logs in Apify console
- Verify target URL is accessible

### AI extraction fails
- Check AI provider API key is valid
- Check API quota
- Try different AI provider

### Preview doesn't render
- Check browser console for errors
- Verify HTML/CSS are generated (check code view)
- Try regenerating preview

### Changes not saving
- Check Supabase connection
- Verify RLS policies allow insert/update
- Check browser console for errors

---

## Sign-Off

| Tester | Date | Version | Status |
|--------|------|---------|--------|
| ______ | ____ | _______ | ______ |

# Test Improvements Plan

## Current State

The existing Playwright E2E tests only cover UI rendering and navigation. They do **NOT** test actual functionality or database operations.

### What Current Tests Verify
- App loads correctly
- Navigation between screens works
- Form elements are visible
- Form validation (button disabled when fields empty)

### What Current Tests Do NOT Verify
- Actual form submission with valid data
- Database insert/update operations
- Backend service functionality
- End-to-end user workflows

## Gap Identified

**Issue**: Single Page Analysis had a broken `discovered_via` value (`'single_page'` instead of `'manual'`). This was not caught by tests because they only tested UI rendering, not actual database operations.

## Required Test Improvements

### 1. Integration Tests for Single Page Analysis

```typescript
test('should successfully create a single page analysis', async ({ page }) => {
  // Login
  await login(page);

  // Navigate to Site Analysis
  await goToSiteAnalysis(page);

  // Click New Analysis
  await page.locator('button:has-text("New Analysis")').click();

  // Select Single Page
  await page.locator('button:has-text("Single Page")').click();

  // Fill in required fields
  await page.locator('input[placeholder*="Project"]').fill('Test Single Page Project');
  await page.locator('input[placeholder*="URL"]').fill('https://example.com/test-page');

  // Submit the form
  await page.locator('button:has-text("Start Analysis")').click();

  // Verify success - should navigate to extraction/processing view
  await expect(page.locator('text=Extracting')).toBeVisible({ timeout: 10000 });

  // Verify no error messages
  await expect(page.locator('.text-red-400, .bg-red-800')).not.toBeVisible();

  // Verify page appears in project
  await expect(page.locator('text=example.com/test-page')).toBeVisible();
});
```

### 2. Database Operation Tests

```typescript
test('should insert page record with correct discovered_via value', async ({ page }) => {
  // ... setup and submit form ...

  // Use Supabase client to verify database state
  const { data } = await supabase
    .from('site_pages')
    .select('*')
    .eq('url', 'https://example.com/test-page')
    .single();

  expect(data).toBeTruthy();
  expect(data.discovered_via).toBe('manual');
  expect(data.crawl_status).toBe('pending');
});
```

### 3. Full Site Analysis Tests

```typescript
test('should create full site analysis from sitemap', async ({ page }) => {
  // Login and navigate
  await login(page);
  await goToSiteAnalysis(page);

  // Select Full Site
  await page.locator('button:has-text("Full Site")').click();

  // Fill in domain
  await page.locator('input[placeholder*="URL"]').fill('https://example.com');

  // Submit
  await page.locator('button:has-text("Start Analysis")').click();

  // Verify sitemap discovery starts
  await expect(page.locator('text=Discovering sitemap')).toBeVisible({ timeout: 10000 });
});
```

### 4. GSC Import Tests

```typescript
test('should import GSC data correctly', async ({ page }) => {
  // ... setup ...

  // Upload CSV file
  const csvContent = `Page,Clicks,Impressions,CTR,Position
https://example.com/page1,100,1000,10%,5.5`;

  // Create test file and upload
  await page.locator('input[type="file"]').setInputFiles({
    name: 'gsc-export.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  });

  // Verify import success
  await expect(page.locator('text=Imported 1 pages')).toBeVisible();
});
```

### 5. Extraction and Processing Tests

```typescript
test('should extract content from page', async ({ page }) => {
  // Create a project with a page
  // ... setup ...

  // Start extraction
  await page.locator('button:has-text("Extract Content")').click();

  // Wait for extraction to complete (or mock the API)
  await expect(page.locator('text=Extraction complete')).toBeVisible({ timeout: 60000 });

  // Verify content was extracted
  await expect(page.locator('[data-testid="page-title"]')).not.toBeEmpty();
});
```

## Implementation Priority

1. **High**: Single page analysis end-to-end test (caught the discovered_via bug)
2. **High**: Database state verification tests
3. **Medium**: Full site analysis with sitemap
4. **Medium**: GSC import tests
5. **Low**: Extraction/processing tests (require mocking or real APIs)

## Test Environment Requirements

1. **Test Database**: Isolated Supabase project for testing, or use transactions that rollback
2. **Test User**: Dedicated test account with known credentials
3. **Mock APIs**: For external services (Jina, Apify) to avoid real API calls during tests
4. **Cleanup**: Tests should clean up created data after running

## Notes

- Tests should be idempotent - running them multiple times should produce same results
- Consider using Playwright's API testing capabilities for backend verification
- Add data-testid attributes to key elements for reliable selectors
- Consider snapshot testing for complex UI states

---

*Created: 2024-11-25*
*Status: Pending Implementation*

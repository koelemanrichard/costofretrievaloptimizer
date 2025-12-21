# Visual Semantics in Koray Tugberk GÜBÜR's Semantic SEO Framework

**Visual semantics represents one-third of Koray's foundational SEO philosophy: the "Pixels, Letters, and Bytes" framework.** This approach establishes that search engines evaluate web content through three interconnected channels—visual elements (pixels), textual content (letters), and technical data (bytes)—and optimal SEO requires all three to work in semantic harmony. Google's MUM model now processes images and text simultaneously, meaning visual-semantic alignment directly affects how search engines understand and rank your pages.

## The "Pixels, Letters, and Bytes" foundation

Koray's visual semantics framework operates on a core principle: **layout affects semantic meaning**. As he explains in his Majestic interview, "Google talks about how meaning can change based on the layout of the webpage. If a product page doesn't have a proper order, or placement of components, the context can be shifted—even if the content is perfect."

This means visual semantics isn't simply about image optimization—it's about how visual elements communicate meaning to search engines and create coherent semantic signals alongside text. When creating a content brief, Koray states, "we build a harmony between Pixels, Letters, and Bytes, turning everything into a structured data format to communicate directly with search algorithms."

The technical validation for this approach comes from Google's own infrastructure. Google's Vision AI combines **alt text, surrounding page text, computer vision analysis, and structured data** to understand image subject matter. Their MUM model can process "text, images, video, and audio simultaneously," meaning the semantic connection between your visual and textual content is actively evaluated.

---

## Rules and principles for visual semantics implementation

### Image placement and content proximity rules

Koray emphasizes **wrapper text**—the text directly surrounding an image—as a critical ranking factor. While no specific pixel distance is prescribed, the principle is clear: images must appear within the semantic context of related text content.

**Key placement requirements:**
- Images should appear within relevant content sections, not randomly placed
- Visual hierarchy must align with content hierarchy (H1→H2→H3 structure)
- Featured images should connect to the page's primary topic and title
- Component placement order affects how Google interprets page meaning

Google's documentation explicitly supports this: "Wherever possible, make sure images are placed near relevant text and on pages that are relevant to the image subject matter."

### Alt text requirements and formatting

Koray's framework defines seven characteristics of effective alt text:

| Requirement | Implementation |
|-------------|----------------|
| Natural language | Words flow naturally without forced keyword insertion |
| Content description | Describes visual objects and scene composition |
| Purpose definition | Explains why the image exists on this specific page |
| Search intent alignment | Increases relevance for target user queries |
| Web accessibility | Supports screen readers and assistive technology |
| Visual search keywords | Includes terms users search in Google Images |
| No over-optimization | Avoids repetitive keyword patterns |

**Entity-specific alt text is critical.** Koray's approach requires naming specific entities rather than generic descriptors:

- **Good alt text**: "Tesla Model S white sedan on highway"
- **Poor alt text**: "Electric car"
- **Better alt text**: "Cathedral Notre Dame de Paris surrounded by clouds"
- **Weaker alt text**: "Cathedral" (too generic, no entity specificity)

### Visual hierarchy and semantic connection principles

Every image must reinforce the page's **Centerpiece Annotation**—Google's internal concept for identifying a page's primary topic. Koray's framework requires that images strengthen entity relevance rather than dilute it with off-topic visuals.

**Image N-grams represent a sophisticated approach**: analyze what images currently rank in Google Images for your target queries, then create visuals matching those patterns. For "energy consumption comparison" queries, Google expects charts and infographics, not stock photos. Your images should match these established visual expectations.

---

## Technical specifications for implementation

### HTML structure with semantic elements

Koray advocates semantic HTML as the foundation for visual content. The complete implementation pattern:

```html
<figure itemscope itemtype="https://schema.org/ImageObject">
  <picture>
    <source srcset="/images/entity-context.avif" type="image/avif">
    <source srcset="/images/entity-context.webp" type="image/webp">
    <img src="/images/entity-context.jpg" 
         alt="[Primary Entity] [action/context] [secondary entities]"
         title="Extended description connecting to page purpose"
         width="600" 
         height="400"
         itemprop="contentUrl"
         loading="lazy">
  </picture>
  <figcaption itemprop="description">
    Caption describing image content with entity mentions
  </figcaption>
</figure>
```

**Critical elements explained:**
- `<figure>` wraps self-contained visual content with semantic meaning
- `<figcaption>` provides visible caption that reinforces topic entities
- `<picture>` enables format fallbacks for browser compatibility
- Only **one `<figcaption>` per `<figure>`** is permitted
- Always include `width` and `height` attributes to prevent Cumulative Layout Shift

### Image format hierarchy and optimization

Koray's recommended format priority:

1. **AVIF** (best): 36% better compression than WebP
2. **WebP** (good): Superior to JPEG with broad support
3. **JPEG/PNG** (fallback): Legacy compatibility only

**Recommended image width is 600px** for most use cases—compatible with both mobile and desktop viewscreens without excessive file size.

### File naming conventions

The semantic file naming pattern:
```
[primary-subject]-[secondary-descriptor]-[context].extension
```

**Example:** `tesla-model-3-charging-home-station.avif`

**Mutual word usage is required**: file name, alt text, and title attribute should share relevant keywords to create reinforcing semantic signals.

### Structured data integration

Images should connect to broader page schema, particularly Article structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "image": {
    "@type": "ImageObject",
    "url": "https://example.com/images/entity-context.avif",
    "width": 600,
    "height": 400,
    "caption": "Description matching figcaption element"
  }
}
```

**Image sitemaps are required** for optimal discovery. Google uses structured data to enable badges in Google Images (Recipe, Product, Video) and Google Lens results, demonstrating the direct connection between semantic markup and search visibility.

### Lazy loading implementation

Koray recommends **Intersection Observer API** over native `loading="lazy"` due to browser support disparity (91.98% vs 69.39%):

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});
```

**Warning on placeholders**: JavaScript-based image loading can cause Google to index placeholder images instead of actual content. Koray documented cases where "a Search Engine doesn't render your JS in a stable way" and uses placeholders instead of actual images.

---

## Implementation guidelines and best practices

### Context matching requirements

Every image must pass the **topic alignment test**: Does this image reinforce the page's primary entities and search intent?

**For informational content**: Use diagrams, infographics, step-by-step visuals
**For transactional content**: Use product photos, comparison tables as images
**For navigational content**: Use brand logos, UI screenshots

### Entity-image relationship mapping

When covering an entity, images should represent its key attributes. For an article about "iPhone 15":

- ✅ **Correct**: Device itself, specific features, comparison with predecessors
- ✅ **Good alt text**: "iPhone 15 Pro Max titanium blue color front and back view"
- ❌ **Wrong**: Generic smartphone image with vague alt text

Images can establish semantic connections between entities. An article about Steve Jobs should include images connecting to Apple Inc., iPhone, Pixar—with alt text reinforcing these relationships: "Steve Jobs unveiling first iPhone at Macworld 2007."

### Visual proof elements for brand authority

Koray's case study reveals that **visual brand consistency functions as an entity signal**:

- Use brand colors consistently across all visual elements
- Author photos should appear "transparently above the fold"
- Unique visual styling differentiates from competitor templates
- Logo colors should be "represented in every image, the background of some answer boxes, buttons, and other design elements"

This visual consistency helps Google associate your visual content with your brand entity in the Knowledge Graph.

---

## Examples demonstrating correct versus incorrect implementation

### Correct implementation patterns

**The Encazip.com case study** demonstrates proper visual semantics:
- Images accompany relevant subjects with contextual harmony
- Alt tags, image URLs, and surrounding text align semantically
- Images placed within `<figure>` semantic HTML elements
- Image N-grams analyzed to match search engine expectations

**Before optimization**: Generic image usage, no image sitemap, missing AVIF/WebP formats, no srcset implementation.

**After optimization**: AVIF formats, proper srcset for device-appropriate resolutions, image sitemaps with structured data. **Result: 155% organic traffic increase in 6 months** with significant gains in image impressions.

### Common mistakes to avoid

| Mistake | Problem | Solution |
|---------|---------|----------|
| Generic stock photos | Images don't reinforce topic entities | Select images matching page's specific entities |
| Empty alt tags on meaningful images | Lost semantic signal opportunity | Describe content with entity-specific language |
| Keyword-stuffed alt text | Triggers over-optimization penalties | Use natural language descriptions |
| JavaScript-only image loading | Google may index placeholders | Include critical images in initial HTML |
| Oversized image resolutions | Increases cost of retrieval | Use 600px width standard |
| Off-topic images | Dilutes page semantic focus | Every image must support Centerpiece Annotation |

**The context mismatch error is particularly damaging**: Writing about "dog food" but using a generic happy family photo means Image N-grams don't match what search engines expect, and Google's Centerpiece Annotation analyzes both semantic content AND layout tree.

---

## Formulas, metrics, and thresholds

### Cost of retrieval calculation

Koray's Cost of Retrieval concept directly applies to visual content: "If a web search engine crawler has to crawl 500 URLs to find only one quality URL, the cost is not worth your value."

**For images, cost reduction comes from:**
- Properly structured images (optimized AVIF/WebP formats) reducing computational cost
- Semantic HTML (`<figure>`, `<figcaption>`) helping search engines understand context faster
- Organized visual hierarchy reducing ambiguity in page meaning interpretation
- Consistent image-text relationships providing clear semantic signals

### Quality thresholds from Koray's framework

From his AI-powered Semantic SEO presentation, Koray provides comparative metrics:

| Metric | Weak Performance | Strong Performance |
|--------|------------------|-------------------|
| Accuracy | 59% | **94%** |
| Connected Topics | 3 | **7** |
| Content Coherence | "No Clarity" | "Clarity" ✓ |

**Website quality comparison example:**
- **Weak site**: 600 content items, 900 triples, 59% accuracy, 3 connected topics = No Clarity
- **Strong site**: 1400 content items, 1200 triples, **94% accuracy**, 7 connected topics = Clarity

While these metrics apply to overall content quality, visual semantics contributes to accuracy by ensuring images reinforce rather than contradict or dilute the semantic signals of surrounding text.

### Key performance indicators to track

- **Image Impressions** in Google Search Console
- **Visual search traffic** via Google Images referrals
- **Image indexation rate** (indexed images / total images)
- **Cumulative Layout Shift (CLS)** for image loading performance
- **Image click-through rates** from Google Images to landing pages

---

## Integration with other framework components

### Connection to cost of retrieval

Visual semantics directly reduces cost of retrieval through three mechanisms:

1. **Format optimization**: AVIF/WebP require less bandwidth and processing
2. **Semantic clarity**: Proper alt text and HTML structure eliminate ambiguity
3. **Signal consistency**: When pixels, letters, and bytes align, Google needs fewer resources to understand page meaning

Koray states: "Semantic SEO relies on communicating search engines with meaning and creating web sources that utilize semantic connections between concepts, web documents, and components to **decrease the cost of retrieval**."

### Connection to topical authority

Visual content supports topical authority when images:
- Connect to the entities within your topical map
- Use consistent visual representation vectors across related pages
- Include entity-specific alt text that reinforces topical coverage
- Appear in image sitemaps enabling discovery across your topical cluster

Koray emphasizes that "the most critical task is to structure the five fundamental components of the topical map correctly from the start. This includes planning both the core and outer sections, along with their design elements, components, and entity distribution based on contextual relevance."

### Connection to content briefs

Koray's content brief methodology explicitly includes visual planning: "When we create a content brief, we build a harmony between Pixels, Letters, and Bytes."

A semantic content brief should specify:
- Required image types matching target query Image N-grams
- Alt text templates incorporating target entities
- Placement requirements relative to key content sections
- Visual hierarchy alignment with heading structure
- Structured data requirements for image content

### Connection to centerpiece text optimization

Google's Centerpiece Annotation identifies the main topic from analyzing both text AND visual layout. Koray's framework requires visual elements to support—never contradict—the centerpiece.

**Practical implementation**: For a page targeting "sourdough bread recipe," every image should reinforce this centerpiece—sourdough starter, kneading process, finished loaf—rather than generic food imagery that dilutes the semantic signal.

---

## Code-implementable rules summary

For building a semantic SEO application, these are the extractable rules:

**Alt text validation rules:**
- Must contain at least one entity name (not just generic descriptors)
- Should not exceed reasonable length (aim for concise, meaningful descriptions)
- Must not repeat the same keyword more than once
- Should describe visual content AND contextual purpose

**File naming validation:**
- Use hyphens as word separators
- Include primary topic/entity keyword
- Match words used in alt text attribute
- Pattern: `[entity]-[descriptor]-[context].extension`

**HTML structure validation:**
- Images should be wrapped in `<figure>` elements
- `<figcaption>` should be present when contextual description adds value
- `width` and `height` attributes are required
- `alt` attribute is required (empty only for decorative images)
- `<picture>` element with AVIF/WebP sources is preferred

**Semantic proximity rules:**
- Images should appear within or adjacent to relevant text sections
- Alt text should share vocabulary with surrounding paragraph content
- Figcaption should expand on the topic being discussed in adjacent text

**Format optimization:**
- Prefer AVIF > WebP > JPEG/PNG
- Standard width of 600px unless specific requirements
- Include in image sitemap
- Preload LCP (Largest Contentful Paint) images

This framework provides the foundation for building automated semantic SEO tools that can evaluate and optimize visual content according to Koray Tugberk GÜBÜR's comprehensive methodology.
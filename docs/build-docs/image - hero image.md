Based on the Semantic SEO framework provided in the sources, here is the complete, detailed guide to **Hero Images** (also referred to as **Headline Images** or **Representative Images**).

In this framework, the Hero Image is not just a decoration; it is a **Semantic Entity** and a **Quality Signal** that communicates directly with the search engine's Vision AI and "Centerpiece Annotation" algorithms.

### **I. Placement and Structural Role**

The placement of the Hero Image is critical for **LCP (Largest Contentful Paint)** and **Centerpiece Annotation** (how Google identifies the main content).

* **Location:** The Hero Image must be placed at the very top of the article, usually immediately after the H1 (Title) or just before it.  
* **The "Proximity" Rule:** Do **not** place the image between a specific Question Heading (like an H2) and its direct Answer paragraph. This breaks the contextual connection. The Hero Image belongs to the **Macro Context** (the whole page topic), not inside a specific Micro Context answer flow.  
* **LCP Status:** The Hero Image is almost always the **LCP element**. It must load instantly.  
  * **Action:** You must **Preload** the Hero Image in the `<head>` of the HTML document.  
  * **Code:** `<link rel="preload" href="image-url.avif" as="image">`.  
* **Lazy Loading:** **NEVER** lazy load the Hero Image. Lazy loading is for images below the fold. Lazy loading the Hero Image destroys your LCP score and confuses the search engine about the page's main visual entity.

### **II. Visual Semantics: What the Image Must Contain**

You must optimize the image for **Google Vision AI** and **OCR (Optical Character Recognition)**. The search engine "reads" the image to confirm the text content.

| Component | Rule & Action | Why? | Source |
| ----- | ----- | ----- | ----- |
| **Text Overlay** | Write the **H1** (or a shorter, punchy version of the main keyword) directly onto the image. | Google uses OCR to read text on images. If the text on the image matches the H1 and Title Tag, it confirms relevance (Relevance Signal). |  |
| **Object Entity** | The image must contain a clear, visible **Object** relevant to the topic. | If the article is about "Apple (fruit)," the image must contain a fruit, not a computer. Google identifies the object to verify context. |  |
| **Brand Logo** | Include your logo (watermark) on the image. | This proves **Ownership** and builds **Brand Entity** association. It prevents others from stealing your "Attribution Entity" status. |  |
| **Centrality** | The main object must be at the center and fully visible. | Truncated (cut off) objects or small objects reduce the confidence score of the image classification algorithms. |  |
| **Uniqueness** | Do not use stock photos as-is. | Duplicate images have no value. Modify images, add text, or create custom graphics to ensure the image hash is unique. |  |

### **III. Technical Specifications (Size, Format, Resolution)**

You must balance **Quality** (Visual Semantics) with **Cost of Retrieval** (File Size).

* **File Format:** Use **AVIF**. It is currently the most efficient format, outperforming WebP and JPEG. If AVIF is not possible, use WebP.  
* **Resolution (Dimensions):**  
  * **Koray's Strategy:** Use a fixed width of **600px** for both desktop and mobile to simplify the HTML and reduce the DOM size. This avoids complex `srcset` coding and keeps the file small,.  
  * *Note:* While responsive images (`srcset`) are standard, the framework emphasizes reducing the "Cost of Retrieval." A high-quality 600px wide AVIF serves both mobile and desktop efficiently without bloating the code.  
* **File Size:** Aim for the smallest possible size (e.g., under 50KB-100KB) without losing visual clarity.  
* **Image Capping:** Remove unnecessary pixels that the human eye cannot perceive (e.g., converting 3x retina images down to standard resolution) to save bandwidth.

### **IV. Semantic Metadata (The "Hidden" Signals)**

You must fill out the metadata attached to the image file and the HTML tags surrounding it.

| Element | Rule | Correct Example | Wrong Example | Source |
| ----- | ----- | ----- | ----- | ----- |
| **Filename (URL)** | Short, descriptive, uses main entity \+ attribute. No stop words. Use hyphens. | `german-shepherd-diet.avif` | `IMG_2934.jpg` or `the-best-diet-for-a-german-shepherd.jpg` |  |
| **Alt Text** | Must describe the image contents *and* include the Main Keyword. Should align with the filename. | "German Shepherd eating dry food from a bowl." | "German Shepherd" (Too vague) or "keyword keyword keyword" |  |
| **Caption** | The text immediately below the image (or the sentence preceding it) acts as a caption. It must connect the image context to the text context. | "Below is a chart showing the nutritional needs of a German Shepherd." | Leaving the image without surrounding context text. |  |
| **EXIF / IPTC** | You must inject metadata into the image file itself *before* uploading. Include Author, Copyright, and Description. | **Author:** \[Brand Name\]**Copyright:** \[Brand Name\] | Uploading a "clean" image stripped of metadata (Google uses this to identify the original source). |  |

### **V. Schema Markup Implementation**

The Hero Image must be defined in the **Structured Data** to explicitly tell Google "This is the image that represents this page."

* **Type:** Use `ImageObject`.  
* **Nesting:** Nest this `ImageObject` inside your `Article`, `Product`, or `WebPage` schema under the `image` property.  
* **Required Properties:**  
  * `url`: The direct link to the image.  
  * `width`: The width in pixels.  
  * `height`: The height in pixels.  
  * `caption`: A text description.  
  * `license`: A link to your license page (proving ownership).  
  * `acquireLicensePage`: A page where users can buy/license the image (even if you don't sell it, this page proves ownership).

### **VI. Summary Checklist for Hero Images**

1. **Format:** Saved as `.avif`.  
2. **Composition:** Unique image \+ Brand Logo \+ Text Overlay (H1 Keywords) \+ Relevant Object.  
3. **Metadata:** EXIF/IPTC data injected (Copyright/Author).  
4. **Filename:** Clean, keyword-focused, no stop words (e.g., `entity-attribute.avif`).  
5. **Placement:** Top of the page (Macro Context).  
6. **Loading:** Preloaded in `<head>` (`rel="preload"`). **Not** lazy loaded.  
7. **Schema:** Included in JSON-LD as `ImageObject` with license info.  
8. **Context:** Surrounded by text that references the image (e.g., "As seen in the image above...").

By following these rules, the Hero Image becomes a **Data Container** that validates your text, proves your entity ownership, and improves your LCP score simultaneously.


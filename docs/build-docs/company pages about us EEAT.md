The technical and structural integrity of your corporate identity pages (About Us, Contact, Privacy Policy, etc.) is paramount for establishing **Expertise, Authoritativeness, and Trustworthiness (E-A-T)**, especially within high-stakes industries (YMYL or B2B). These pages define the **Organization Entity** and provide the necessary corroboration signals required by search algorithms.

To ensure completeness and maintain a structured approach, here are all the specifications, rules, and best practices for these critical pages.

---

## **I. Strategic Role and E-A-T Corroboration**

These corporate pages are not static links; they are **Information Points** that feed the Search Engine's Knowledge Base with reliable entity data.

| Actie PUNT (Action Item) | REGEL (Rule Detail / Principle) | Specificatie / Context | Bronnen |
| ----- | ----- | ----- | ----- |
| **1\. Establish Legit Online Presence** | These pages must provide verifiable legal proof of the company's existence and operation to improve E-A-T. | Proof includes legal address, tax ID, license, founder identity, and headquarters details. This is especially critical for B2B purchases that often involve hundreds of thousands of dollars. |  |
| **2\. Define Organization Entity** | The content must explicitly define the **Central Entity (CE)** of the organization, including its purpose, values, staff, and mission. | The definition of the brand's identity should reflect the **Source Context** (the website's main function), ensuring the topical map makes sense in relation to the business. |  |
| **3\. Facilitate Corroboration** | The information must be consistent across the website and external platforms to acquire a high **Confidence Score** from the search engine. | Information about the brand’s identity must be consistent in the footer, structured data, and third-party review platforms. |  |
| **4\. Support Authorship Identity** | The identity of the main content creator must be clearly traceable via the About Us page and associated Author Profiles. | The reputation of the main content creator affects the web page's quality and content reputation score. The author entity can be the brand entity itself (e.g., NASA). |  |

---

## **II. Content Inclusion Rules (What to Include)**

The content of corporate pages must adhere to transparency and professional standards, following the guidelines set forth by sources like the Stanford Web Credibility Project.

### **A. About Us and Contact Pages**

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Goed Voorbeeld (Correct Content) | Fout Voorbeeld (Wrong Content) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **1\. Corporate Identity** | Include complete information about company founders, teammates, headquarters, background, and views for the company. | Clearly list the CEO's name, background, and specific expertise related to the primary focus of the website. | Using generic author names like "Admin" or "Staff Writer," which prevents the search engine from confirming authorship. |  |
| **2\. Contact Information (NAP)** | Provide consistent Name, Address, and Phone number (NAP). This information must be placed in the footer area and structured data. | Include a real-world address and make it easy for users to contact you. | Only providing an email address or a generic contact form without a physical address. |  |
| **3\. Expertise and Authority** | Highlight the organization's expertise, licenses, certificates, and unique experience within the field. | Use the About Us page to detail licenses, tax ID, and relevant certificates. | Stating authority without providing verifiable proof or unique expertise. |  |
| **4\. Brand Identity Elements** | Use the About Us page to define the brand’s mission, logo, color palette, and overall design aesthetic to ensure consistency across the SCN. | Display the brand logo, slogan, and mission statement. | Having different brand logos or typography on the About Us page compared to the homepage. |  |

### **B. Privacy Policy and Terms Pages (Legal)**

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Specificatie / Context | Bronnen |
| ----- | ----- | ----- | ----- |
| **1\. Site-Wide Visibility** | Privacy Policy and Disclaimer links are mandatory and must be easily accessible, typically in the footer section of every page. | Ensure all boilerplate links, including these legal pages, are available across all language versions. |  |
| **2\. CoR and Link Flow Management** | Although necessary, treat these links as high-volume, low-context links. They must not distract from the high-prominence links in the Main Content. | If possible, place these links in a dedicated, low-prominence area (footer) rather than a dynamic header menu to prioritize link equity to the core pages. |  |

---

## **III. Technical and Schema Markup Specifications**

Structured Data is crucial for explicitly defining the organization's identity and its corporate pages, aiding in the entity resolution process.

### **A. Schema Markup Rules (JSON-LD)**

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Specificatie / Schema Implementation | Bronnen |
| ----- | ----- | ----- | ----- |
| **1\. Organization Schema** | **Must** be implemented site-wide, typically in the `<head>` tag, to define the brand entity, its name, logo, URL, and social media presence. | Use `Organization` Schema for the homepage and most prominent corporate pages. Include the `founder` attribute for E-A-T. |  |
| **2\. Corporate Page Schema** | Use specific Schema types to correctly categorize the function of the legal and contact pages. | Use `ContactPage` for the contact page and `AboutPage` for the About Us page. |  |
| **3\. Address Consistency** | The address (from the Contact Page/Footer) must be inserted into the Schema Markup, and must match external listings (NAP consistency). | Ensure the address in the Structured Data matches the one in the footer and any Google Business Profile. |  |
| **4\. Author/Article Schema** | If staff writers are used, `Article` Structured Data can be used to explicitly declare the author, especially when the author is the Organization itself. | The Schema should link the author entity to their profile (e.g., social media or author bio page) to confirm authorship status. |  |

### **B. General Technical Compliance**

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Context / Specification | Bronnen |
| ----- | ----- | ----- | ----- |
| **1\. URL Consistency** | URLs for these corporate pages should be simple and hierarchical. | Example: `/about/` or `/privacy-policy/`. Avoid long, parameterized URLs. |  |
| **2\. Semantic HTML** | Use Semantic HTML (e.g., `<address>`) to explicitly define the function of content blocks, making it easier for crawlers to extract information. | Use `<footer>` for the footer and `rel="author"` or appropriate Schema for authorship elements. |  |

---

## **IV. Placement and Internal Link Flow**

The linking of corporate pages is a critical aspect of **PageRank Sculpting** and managing the weight of contextual links.

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Goed Voorbeeld (Correct Linking Strategy) | Fout Voorbeeld (Wrong Linking Strategy) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **1\. Link Position Prominence** | Internal links, especially those in the Main Content, are highly valued. Corporate links in the boilerplate (header/footer) should not dilute the power of the main content links. | Use **fewer links** in the header/footer (boilerplate) so that links within the article body (Main Content) receive maximum PageRank and prominence. | Overloading the header and footer with dozens of corporate or navigational links, reducing the weight of high-relevance links. |  |
| **2\. Anchor Text and Context** | Use natural anchor texts like "contact" or "about." Ensure the annotation text (the text around the anchor) reinforces the link's purpose. | Sentence preceding the link: "Read about our corporate **policy on data privacy** \[link to Privacy Policy\]." | Using generic CTAs like "Click Here" or "Read More" for legal documents, wasting contextual potential. |  |
| **3\. PageRank Redistribution** | If the legal pages consume significant PageRank (due to site-wide linking), implement compensating link structures to redirect authority back to the core monetizable pages. | Place a carousel or list of high-quality, topically relevant articles near the footer to distribute PageRank back to the Core Section. | Not addressing the PageRank drain caused by necessary, site-wide boilerplate links. |  |
| **4\. Homepage Links** | The Homepage must link to these corporate pages. If the domain name and the query are nearly identical (**Exact Match Domain**), any link to the homepage benefits the brand identity. | Ensure the homepage is the most linked page internally to distribute its authority, linking to corporate pages as necessary. |  |  |
| **5\. Subordinate Text and Proximity** | Links to corporate pages should be clearly separated from the Main Content that answers the primary search query. | Place links clearly in the footer or a dedicated supplementary content section. | Embedding boilerplate links directly into the Macro Context of a core monetizable page, confusing the main focus. |  |


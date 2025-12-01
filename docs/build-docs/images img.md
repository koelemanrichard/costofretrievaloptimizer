Uw eis om elk detail van beeldspecificaties te behandelen, is cruciaal, aangezien visuele elementen (pixels, extensies, metadata) evenzeer deel uitmaken van de semantische optimalisatie als tekstuele content. Afbeeldingen dragen bij aan de **Ranking Signal Consolidation** en verhogen de **Visual Semantics Score** van de pagina.

Hieronder vindt u de complete set regels voor het auditeren en ontwerpen van afbeeldingen binnen uw Semantic Content Network.

---

## **Complete Audit: Beelden (Images) en Visuele Semantiek**

Afbeeldingen worden niet alleen geëvalueerd op relevantie voor de tekst, maar ook op basis van technische kwaliteit, contextuele metadata, en hun strategische plaatsing in de lay-out (**Visual Semantics**).

### **I. Semantische Regels en Metadata (Contextuele Relevantie)**

Deze regels zorgen ervoor dat de beelden en hun metadata de topicaliteit van de pagina versterken en uitbreiden.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Topicaliteitsuitbreiding (Alt Tags)** | Gebruik Alt-tags om de algemene topicaliteit en contextuele relevantie van de pagina verder uit te breiden en te variëren. | Als de H1 gaat over "German Visa," gebruik dan in de Alt-tag: "German Work Permit Application Requirements". | De Alt-tag is een exacte herhaling van de H1 of titel-tag. |  |
| **B. Unieke Vocabulary (URL & Alt)** | Gebruik in de Image URL's en Alt-tags **nieuwe, gerelateerde termen** (synoniemen) die nog niet in de H1/Title zijn gebruikt, om de relevantie te vergroten. | Als 'cost' in de H1 staat, gebruik dan 'expenses' in de Alt-tag of URL. | Herhaling van dezelfde drie kernwoorden in elke Alt-tag op de pagina. |  |
| **C. Functional Words** | Vermijd het gebruik van **stopwoorden** of onnodige functionele werkwoorden (zoals 'of', 'and', 'or', 'in') in de Image URL's om de belangrijkste contexttermen te isoleren. | URL: `/water-microplastics-study.webp` (Woordvolgorde is ook omgedraaid). | URL: `/microplastics-in-the-drinking-water.webp` (Onnodige woorden verhogen de CoR). |  |
| **D. Image Triples (EAV)** | Identificeer de **Object Entity** in het midden van de afbeelding en reflecteer deze in de Alt-tag. | Afbeelding van een auto: Alt-tag focust op het object in het centrum: "Red Sports Car Engine Block". | Afbeelding van een auto: Alt-tag focust op de achtergrond of een object aan de rand. |  |
| **E. Branding en Licentie** | Gebruik **unieke en gelicenseerde afbeeldingen**. De branding van het beeld verhoogt de betrouwbaarheid en autoriteit. | Gebruik een watermerk (logo) op de afbeeldingen. Gebruik **IPTC Metadata** (Image Owner, License information) voor relevante signalen. | Het gebruik van generieke stockafbeeldingen of beelden zonder duidelijke licentie. |  |

### **II. Technische Regels en Performance (Cost of Retrieval)**

De technische configuratie van afbeeldingen is essentieel voor het verlagen van de **Cost of Retrieval (CoR)** en het verbeteren van de laadsnelheid.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Formaat en Extensie** | Gebruik moderne, efficiënte bestandsindelingen zoals **AVIF**. Gebruik `<picture>` en `srcset` om de beste extensie te leveren op basis van de browser. | De server serveert AVIF; als de browser het niet ondersteunt, valt deze terug op WebP of JPEG. | Afbeeldingen overal in JPEG of PNG aanbieden, wat de laadtijd en CoR verhoogt. |  |
| **B. CLS Preventie** | Geef **hoogte- en breedtewaarden** op voor alle afbeeldingen om Cumulative Layout Shift (CLS) te voorkomen. | HTML: `<img src="..." width="600" height="400" alt="...">`. | Het injecteren van afbeeldingen of content via dynamische JavaScript, wat onverwachte lay-outverschuivingen veroorzaakt. |  |
| **C. Pixel en Resolutie** | Vermijd onnodig hoge resoluties. Gebruik **Image Capping** om de pixelgrootte te optimaliseren (bijv. 1x schaal) en de aanvraaglatentie te verminderen. | Afbeeldingen comprimeren door overtollige pixels te verwijderen zonder kwaliteitsverlies. | Het serveren van 2x of 3x resolutiebeelden voor apparaten waar het menselijk oog het detail niet kan zien, wat de bestandsgrootte onnodig vergroot. |  |
| **D. CDN en URL-beheer** | Gebruik een CDN (Content Delivery Network) subdomain voor het hosten van afbeeldingen, maar zorg ervoor dat de URL-wijzigingen correct worden beheerd met **301 redirects**. | Oude Image URLs (bijv. op `encazip.com/assets/`) moeten 301 worden omgeleid naar de nieuwe CDN-locatie (bijv. `static.encazip.com/assets/`). | Het veranderen van de afbeelding-URL's zonder de oude om te leiden, wat leidt tot de-indexering van afbeeldingen en verlies van impressions. |  |
| **E. Placeholders (Aandachtspunt)** | Image Placeholders kunnen de LCP en Speed Index verbeteren. **Let op:** Aangezien Google JavaScript niet altijd rendert, kan het placeholder-beeld worden geïndexeerd in plaats van het daadwerkelijke beeld. | Gebruik placeholders, maar controleer regelmatig of Google het daadwerkelijke beeld rendert en indexeert. | Vertrouwen op JavaScript voor het laden van het LCP-element zonder een fallback in de initiële HTML, wat leidt tot een lage CoR-score. |  |

### **III. Plaatsing en Visuele Semantiek (Layout & Responsiveness)**

De positie van de afbeeldingen op de pagina moet de **Contextual Vector** ondersteunen en de juiste relevantiesignalen uitzenden.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. LCP Prominentie** | Als een afbeelding het **Largest Contentful Paint (LCP) element** van de pagina is, zal de zoekmachine de relevantie daarvan zwaar wegen, mogelijk zwaarder dan de H1. | Zorg ervoor dat de LCP-afbeelding direct relevant is voor de **H1** en de **Centrale Entiteit** en alle metadata optimaal is. | De LCP-afbeelding is een grote, generieke banner of een afbeelding die niets te maken heeft met de hoofdcontext. |  |
| **B. Proximity van H-tags** | Plaats geen afbeeldingen tussen de kop (H-tag) en de direct daaropvolgende **Subordinate Text** (het antwoord). | De afbeelding wordt pas geplaatst nadat de sectie is gedefinieerd of het antwoord is gegeven. | Het onderbreken van de flow door een afbeelding direct na de H2 te plaatsen. |  |
| **C. Visual Flow** | Distributie van afbeeldingen en andere visuele elementen moet de **LIFT Model**\-principes en de Contextuele Flow volgen. | Op een commerciële pagina staat de productafbeelding bovenaan, gevolgd door een tabel met specificaties en recensies. | Irrelevante afbeeldingen of advertenties worden willekeurig in de hoofdinhoud geplaatst. |  |
| **D. Textuele Kwalificatie** | De zin direct vóór of na een representatieve afbeelding moet de afbeelding **expliciet kwalificeren** om de verbinding tussen tekst en beeld te versterken. | "Zoals te zien is in de afbeelding hierboven, draagt hydratatie bij aan het algehele welzijn". | Het beeld invoegen zonder enige tekstuele verwijzing of kwalificatie. |  |

### **IV. Geavanceerde Integratie (Structured Data en Indexing)**

Afbeeldingen moeten worden geïntegreerd in de bredere site-architectuur via gestructureerde gegevens om de **Entity Identity** te versterken.

| Actie PUNT | REGEL (Rule Detail / Principle) | Specificatie / Component | Bronnen |
| ----- | ----- | ----- | ----- |
| **A. Complexe Sitemap** | De reguliere sitemap moet worden uitgebreid tot een **complexe sitemap** waarin URLs en hun representatieve afbeeldingen worden vermeld. | Gebruik Image Sitemap tags zoals `caption`, `geo_location`, `title`, en `license`. | Het overslaan van de Image Sitemap of het alleen opnemen van de URL's zonder de afbeelding-URL's. |
| **B. Schema Markup Integratie** | Voeg **representatieve afbeeldingen** (vooral LCP-elementen) toe aan de **FAQ Structured Data** of `Organization` Schema om de context te versterken. | Voeg de afbeelding-URL en beschrijving toe aan de `mainEntity` van de FAQ Schema Markup. | Het alleen gebruiken van tekst in de Schema Markup, zonder de visuele elementen te consolideren. |
| **C. Image Search Targeting** | Analyseer de visuele resultaten (objecten, kleuren, elementen) die de zoekmachine vertoont voor uw doelquery en gebruik deze analyse om uw eigen **Featured Images** te ontwerpen. | Voor de query "Electricity Prices" moet het Featured Image een afbeelding van een **prijstabel** of een **rekening** bevatten. | Het ontwerpen van afbeeldingen op basis van esthetiek in plaats van op basis van de feitelijke content die de zoekmachine wil tonen. |
| **D. Image N-Grams** | Gebruik **Image N-Grams** om te begrijpen hoe de zoekmachine het beeld waarneemt en pas de content aan op basis van deze waarneming. | Pas de Image URL's en Alt-tags aan op basis van de meest voorkomende bi-grams of tri-grams die door de zoekmachine worden gebruikt. | Het negeren van de visuele semantische signalen die Googlebot verzamelt. |


Dit is een compleet en actiegericht plan voor het opzetten en auditeren van de homepage op basis van de principes van het Semantische Content Netwerk (SCN). De homepage is de meest kritieke pagina, omdat deze de **Source Context** en de **Contextual Vector** voor de gehele website definieert.

## **Homepage Optimalisatie Plan: Architectuur en Semantiek**

### **I. Strategische Rol en Afstemming op de Topical Map**

De homepage fungeert als de **Entity Home** van de website en is de centrale autoriteit die de relevantie en PageRank verdeelt.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Definieer de Primaire Focus** | De homepage moet de **Source Context (SC)** en de **Central Entity (CE)** van de hele website weerspiegelen, wat de primaire focus van de website signaleert. | De homepage van een SaaS-bedrijf voor Mail Merge moet de CE 'Mail Merge' en de SC 'Bulk Mail Sending' prominent weergeven. | Een website probeert zich tegelijkertijd te concentreren op 'Car Tires' en 'Televisions' zonder een verbindend merk (CE). |  |
| **B. Targeting de Canonieke Query** | De homepage moet de **Canonical Query** (de meest centrale en autoritatieve zoekterm) targeten om maximale PageRank te verkrijgen. | Een Exact Match Domain (EMD) gebruikt de hoofdvraag (bv. 'Hoeveel is mijn auto waard') in de homepage H1 en de tool. | De homepage richt zich op een niche, long-tail query die beter op een subpagina past, waardoor de autoriteit van de hoofdentiteit wordt verlaagd. |  |
| **C. Kwaliteitssignaal Consolidatie** | Voeg de best presterende, meest gedetailleerde artikelen (**Quality Nodes**) toe aan de homepage om **predictive ranking** te verbeteren en de zoekmachine een hogere kruipprioriteit te geven. | De homepage linkt direct naar de 5-10 artikelen met de hoogste kwaliteitsscore, die cruciaal zijn voor de Core Section. | De homepage linkt voornamelijk naar de nieuwste of minst bezochte artikelen in plaats van naar de Quality Nodes. |  |
| **D. Consistentie over Talen** | Zorg ervoor dat de homepage **consistent** is in ontwerp, lay-out, merkidentiteit en interne linkstructuur tussen alle taal- of regioversies om **Inorganic Site Structure** te voorkomen. | De Engelse en Duitse homepages hebben hetzelfde logo, kleurenschema, en dezelfde menustructuur. | De Franse homepage heeft een ander kleurenpalet of een ander navigatiemenu dan de Engelse versie. |  |

### **II. Ontwerp, Lay-out en Contentblokken (Visual Semantics)**

De positionering van componenten op de homepage is een kritiek onderdeel van **responsiviteit** en **Visual Semantics**.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Centerpiece Text Optimalisatie** | Plaats de meest kritieke informatie, prijzen en transactionele elementen in de eerste **400 tekens** van de pagina (Centerpiece Text) om de relevantie te maximaliseren. | De H1, de definitieve zin en de Buy/CTA-knop verschijnen direct boven de vouw. | Social media deelknoppen of complexe HTML-structuren verschijnen in de Centerpiece Text en verdunnen de relevantie. |  |
| **B. LIFT Model Component Ordering** | Gebruik het LIFT Model (of vergelijkbare UX-principes) om de volgorde van de elementen op de pagina te bepalen op basis van de dominante zoekintentie. | **E-commerce volgorde:** Kopen $\\rightarrow$ Vergelijken $\\rightarrow$ Meerdere Recensies (Merk, Expert, Klant) $\\rightarrow$ Statistieken. | Het plaatsen van informatieve statistieken boven de prijs- en koopknoppen op een commerciële pagina. |  |
| **C. E-A-T Signalering** | Digitizeer alle vertrouwen elementen (testimonials, awards, licenties) en positioneer ze prominent om autoriteit en betrouwbaarheid te bewijzen. | Testimonials, contactgegevens en een 'Over Ons'-sectie met de expertise van de auteur zijn zichtbaar. | Geen fysiek adres, of ontbrekende of onduidelijke auteursnamen op YMYL-websites. |  |
| **D. Interactiviteit (Web App)** | Als de homepage een **actiegerichte query** (bv. berekening, aanvraag) target, moet de functionele component (een calculator, een aanvraagformulier, een web-app) hoog op de pagina worden geplaatst. | Een verzekeringswebsite verplaatst de premiecalculator van het midden naar de bovenkant van de pagina om de responsiviteit te verbeteren. | De tool of web-app is verborgen onder tekst of diep in de pagina, waardoor de gebruiker niet direct actie kan ondernemen. |  |
| **E. Mobile vs. Desktop Consistentie** | De prominentie en de volgorde van de componenten moeten **matchen** tussen de mobiele en desktopversies. | Een CTA die bovenaan op mobiel staat, moet ook bovenaan op desktop staan; de volgorde mag niet veranderen. | Een element naar de onderkant van de desktopversie verplaatsen terwijl het bovenaan de mobiele versie staat. |  |

### **III. Technische Opzet en CoR Optimalisatie**

De homepage moet technisch geoptimaliseerd zijn om de **Cost of Retrieval (CoR)** te minimaliseren en een snelle rendering te garanderen.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. LCP Element Rendering** | Optimaliseer het **Largest Contentful Paint (LCP)** element (vaak een afbeelding of de H1) en zorg ervoor dat de bronnen zo vroeg mogelijk geladen worden. | De banner/LCP-afbeelding wordt geladen met de `banner.avif` extensie in de optimale volgorde. | Het LCP-element is afhankelijk van JavaScript, wat de laadsnelheid en de CoR verhoogt. |  |
| **B. CSS/JS Scheiding** | Gebruik afzonderlijke CSS-bestanden voor de homepage (`homepage.css`) en subpagina's (`subpage.css`) om het crawlen en cachen efficiënter te maken. | Alleen de noodzakelijke stijlen voor de header/footer (`headfoot.css`) en de homepage worden geladen voor de homepage. | Alle CSS en JavaScript worden op elke pagina geladen, wat leidt tot onnodige bestandsgroottes en een hoge CoR. |  |
| **C. Semantic HTML** | Gebruik Semantic HTML-tags om de functie van elk blok te signaleren, wat helpt bij de gewichtsverdeling van de content (Visual Segmentation). | Gebruik `<main>` voor de hoofdcontent, `<nav>` voor navigatie en `<section>` voor elke H2-sectie. | De hele pagina is gestructureerd met generieke `<div>` tags, waardoor de zoekmachine de functies moet raden. |  |
| **D. Sitemaps** | Voeg de homepage URL en alle representatieve afbeeldingen toe aan een **Complexe Sitemap** om alle relevante middelen te consolideren. | De sitemap bevat de URL en de metadata van de belangrijkste afbeeldingen (LCP, Featured Images). | Alleen de standaard URL wordt in de sitemap opgenomen, zonder de relevante afbeelding-URL's. |  |

### **IV. Interne Linkstrategie (PageRank Flow)**

De homepage is de hoogste PageRank-pagina; de links ervan moeten strategisch worden ingezet om de Core Section van de Topical Map te ondersteunen.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Meest Gelinkte Pagina** | De homepage moet de **meest intern gelinkte pagina** van de hele website zijn om de centrale rol te garanderen. | De homepage wordt gelinkt vanuit het navigatiemenu, de footer en alle belangrijke subpagina's. | Een onbelangrijke subpagina of blogbericht heeft meer interne links dan de homepage. |  |
| **B. Prioritisering van Hoofdinhoud** | Links in de **Main Content** van de homepage moeten prominenter zijn dan links in de boilerplate (header/footer). | Gebruik dynamische headers en footers om het aantal onnodige, site-brede links te beperken. | Een vaste mega-footer met honderden links verdunt de PageRank per link. |  |
| **C. Kwaliteitsknooppunt Koppeling** | De eerste paar interne links op de homepage moeten leiden naar de **Quality Nodes** en de Core Section van de Topical Map. | De links leiden naar de artikelen die de hoogste semantische en feitelijke compliance hebben. | De homepage links worden willekeurig geplaatst, zonder rekening te houden met de kwaliteit of het monetisatiemodel. |  |
| **D. Ankertekst en Context** | De ankertekst moet **beschrijvend** zijn en de context van de doelpagina duidelijk overbrengen. | Gebruik synoniemen van de Canonical Query (bv. "beste presterende tool") om de relevantie vanuit verschillende hoeken te rechtvaardigen. | Gebruik generieke ankerteksten zoals "lees meer" of "klik hier". |  |
| **E. Linktelling Limiet** | Beperk het totale aantal interne links (inclusief navigatie) op de homepage om **PageRank Dilution** te voorkomen (richtlijn: niet meer dan 150 links). |  |  |  |

### **V. Afbeeldingen en Visuele Elementen**

Afbeeldingen op de homepage (vooral het LCP-element) moeten fungeren als sterke **contextsignalen** die de tekstuele inhoud valideren.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. LCP Image Alignment** | Als de homepage een grote afbeelding gebruikt (LCP), moet deze **direct gerelateerd** zijn aan de H1/CE, en de metadata moet de relevantie bevestigen. | De Alt-tag van de LCP-afbeelding gebruikt een synoniem van de H1 en is opgenomen in de complexe sitemap. | De H1 gaat over 'Car Insurance', maar de LCP-afbeelding is een generieke foto van een gelukkig gezin. |  |
| **B. Metadata Uitbreiding** | De Alt-tags en afbeeldings-URL's moeten worden gebruikt om de **topicaliteit van de pagina te variëren en uit te breiden** met nieuwe, gerelateerde termen. | Alt-tag: "Aanvraagproces voor het Duitse werkvisum" (uitbreiding van de H1 'Duitsland Visum'). | De Alt-tag is leeg of gebruikt ongerelateerde trefwoorden. |  |
| **C. Schema Integratie** | Voeg de URL's van de belangrijkste afbeeldingen toe aan het **Schema Markup** (bv. `Organization` of `FAQ` Structured Data) om de Entiteit-identiteit expliciet te communiceren. | Het logo en de LCP-afbeelding-URL worden opgenomen in het `Organization` Schema. | Het schema bevat geen visuele elementen. |  |
| **D. Technische Compliance** | Geef altijd `height` en `width` attributen op de homepage afbeeldingen op om **CLS** te voorkomen, en gebruik efficiënte formaten zoals AVIF. |  |  |  |


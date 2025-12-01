De optimalisatie van de **Header en Footer (Boilerplate)** vereist strikte naleving van de semantische en technische regels om de **Source Context (SC)** te definiëren en **PageRank Dilution** te voorkomen.

---

## **I. Essentiële HTML-structuur voor Boilerplate Links**

De technische opzet van de header (`<header>`) en footer (`<footer>`) moet het doel van de links expliciet communiceren naar zoekmachines.

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Semantische Elementen** | Gebruik de juiste Semantic HTML-tags om de functie van de sectie en de links te signaleren. | Gebruik `<header>`, `<footer>`, en `<nav>` tags. | De hele structuur in generieke `<div>` tags wikkelen, waardoor de zoekmachine de functie moet raden. |  |
| **B. Gebruik van Pure HTML** | Links in de boilerplate moeten worden geïmplementeerd met pure HTML (geen JavaScript-afhankelijke links). | Gebruik de standaard `<a>` tag om de links te creëren. | Links die afhankelijk zijn van JavaScript om te functioneren, aangezien dit kan mislukken door kleine renderfouten, waardoor de links niet gecrawld kunnen worden. |  |
| **C. Linktelling Limiet** | Beperk het totale aantal interne links per pagina (inclusief header/footer/sidebar) tot een maximum van **150** om PageRank Dilution tegen te gaan. | De header bevat 5 tot 10 primaire navigatielinks; de footer bevat alleen de noodzakelijke corporate links. | Het gebruik van een vaste mega-menu of mega-footer met honderden links. |  |
| **D. Dynamische Linkimplementatie** | Gebruik **dynamische headers en footers** waar de interne links veranderen op basis van het paginacontext/segment, in plaats van site-brede vaste links. | Als de gebruiker zich in de sectie 'Elektrische Auto's' bevindt, linkt de footer naar 'Oplaadstations' of 'Batterijtypes', niet naar irrelevante secties. | Vaste links gebruiken die naar elk willekeurig onderwerp linken, wat de context van de individuele pagina's verwatert. |  |
| **E. NAP en E-A-T** | Links naar corporate pagina's (About Us, Contact, Privacy) zijn verplicht en moeten in de footer staan om E-A-T signalen te bevestigen. | De footer linkt naar `/about/` en `/privacy/`. | Het alleen geven van een e-mailadres of telefoonnummer zonder een link naar een volledig 'Over Ons'-pagina met expertisebewijs. |  |

---

## **II. Anchor Text Regels voor Boilerplate Links**

Anchor texts bepalen de relevantie van de link en de doelpagina. In de boilerplate moeten ze beknopt en functioneel zijn.

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Beschrijvend Gebruik** | Gebruik uitsluitend **beschrijvende ankerteksten** die de functie van de doelpagina duidelijk aangeven. | Ankerteksten gebruiken zoals "Neem Contact Op" of "Privacy Beleid". | Generieke ankerteksten gebruiken zoals "lees meer" of "klik hier". |  |
| **B. Linktekst Differentiatie** | Gebruik **verschillende ankerteksten** in de header, footer en main content om te voorkomen dat de links als volledig "getemplateerd" worden beschouwd. | De header gebruikt beknopte tekst (bv. "Contact"); de footer gebruikt langere, formele tekst (bv. "Officiële Contactinformatie"). | Het exact dezelfde ankertekst meer dan drie keer op de pagina gebruiken. |  |
| **C. Contextueel Consistentie** | De ankertekst moet de titel van de doelpagina en de **Central Entity (CE)** van de website ondersteunen. | De ankertekst van de homelink in de header en footer gebruikt de merknaam en een site-brede N-gram (bijv. "Mail Merge SaaS Oplossing"). | De ankertekst voor de homelink is slechts het woord "Home" zonder de merkidentiteit te ondersteunen. |  |

---

## **III. Gebruik van H-tags (Headings) in de Footer**

Het gebruik van H-tags in de footer is toegestaan zolang het de strikte hiërarchie van de **Main Content** niet verstoort en de relevantie van de hoofdsecties niet verdunt.

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Toepassing en Context | Bronnen |
| ----- | ----- | ----- | ----- |
| **A. Hoofdcontext Prioriteit** | De Heading Hierarchy (H1, H2, H3) is in de eerste plaats bedoeld om de **Macro Context** en de **Contextuele Vector** van de *Main Content* te definiëren. | De meest prominente H-tags (H1 en H2) moeten uitsluitend de hoofdsecties van het artikel definiëren. |  |
| **B. Subsidiaire Structuur** | Als de footer een kop nodig heeft voor het structureren van groepen links (bijv. 'Corporate', 'Navigatie'), gebruik dan **lagere H-niveaus** (H4, H5, H6). | Gebruik H4 om een lijst met links (zoals 'Contact', 'Privacy', 'Over Ons') in de footer te labelen. |  |
| **C. Visuele Subordinatie** | De visuele styling (lettergrootte en gewicht) van alle H-tags moet de hiërarchie van de Main Content weerspiegelen. De footer H-tags moeten visueel **minder prominent** zijn dan de H2's en H3's van de pagina. | De H4 in de footer is visueel kleiner en lichter dan de H3 in het hoofdartikel. | H4's in de footer dezelfde grootte geven als H3's in de Main Content, wat de hiërarchische signalen verstoort. |
| **D. Geen Redundantie** | De H-tags in de footer mogen de vragen of onderwerpen die in de H1/H2 van de Main Content worden behandeld, niet herhalen. | De footer H-tag bevat 'Contact' of 'Juridische Informatie'. | De footer H-tag bevat de volledige H1 van de pagina, wat leidt tot **Ranking Signal Dilution**. |


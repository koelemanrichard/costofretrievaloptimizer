Deze gedetailleerde auditlijst bevat alle regels, specificaties en voorbeelden voor de implementatie van HTML-headingelementen (H1, H2, H3, enzovoort) op een webpagina, volgens de principes van **Contextuele Flow** en **Microsemantics**. De H-tags zijn cruciaal omdat ze de **Contextual Vector** van het document vaststellen en de zoekmachine helpen bij het begrijpen van de hiërarchie en de relevantie van de content.

---

## **I. Contextuele Vector & Hiërarchie (Structurele Fundamenten)**

De H-tags definiëren de logische opeenvolging van onderwerpen (de Contextual Vector) binnen het document, van breed (Macro Context) naar specifiek (Micro Context).

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Eén Macro Context** | De **H1** moet de enige **Macro Context**, de **Central Entity (CE)** en de **Central Search Intent (CSI)** van de pagina weerspiegelen. | H1: "7 Types of Glasses Frames" (Focus op Frames). | H1: "Glasses Frames and Eye Health" (Twee macro-contexten, verdunning). |  |
| **B. Rechte Lijn Flow** | De reeks koppen (H1, H2, H3) moet een **logische, incrementele gedachtenstroom** volgen, als een rechte lijn, van de eerste H tot de laatste H. | H2: "Symptoms" gevolgd door H2: "Treatment" (Logische progressie). | H2: "Causes" gevolgd door H2: "History" (Breuk in de stroom). |  |
| **C. Hiërarchie Definitie** | Hogere koppen (H2) definiëren sub-contexten, en lagere koppen (H3, H4) definiëren attributen of specificaties van de directe bovenliggende kop. | H2: 'Types of Lenses' $\\rightarrow$ H3: 'Aspheric Lenses' (Attribute van Lenses). | H2: 'Lenses' $\\rightarrow$ H3: 'Glasses Brands' (Verkeerde hiërarchie, Brands is geen attribuut van Lenses). |  |
| **D. Samenvatting** | De **Algemene Samenvatting** (Introductie) moet de **unificatie** zijn van alle belangrijkste H2's en H3's op de pagina. | De introductie bevat termen van de H2's (bijv. Vormen, Materialen, Prijzen), in dezelfde volgorde als de content. | De introductie is te kort en bevat slechts één term uit de H1. |  |

---

## **II. Content en Linguïstische Regels (Wat te schrijven in H-tags)**

De inhoud van de H-tags moet zo worden geformuleerd dat deze overeenkomt met de **Search Language** en de extractie van feiten vergemakkelijkt.

| Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Query Matchen & Patten** | Stem de kop af op het meest waarschijnlijke **query-patroon** of de zoekintentie (definitional, instructional, comparative). | Gebruik 'Types' voor definities; 'How to' voor instructies. | Het gebruik van een definitieve kop (bv. 'Wat is X?') voor een instructie. |  |
| **B. Predicaat Gebruik** | Bij instructieve vragen ('How to') moet de H-tag of de eerste zin direct een **instructief werkwoord (predicaat)** bevatten. | H1: "How to send a mail merge" $\\rightarrow$ Eerste zin begint met: "**Send** the email...". | H1: "Mail merge procedure" (Gebruikt geen actief werkwoord). |  |
| **C. Responsieve Subordinate Text** | De tekst direct na de kop (**Subordinate Text**) moet een **exact, duidelijk en beknopt antwoord** zijn op de vraag die in de kop wordt gesteld. | H2: "What are the risks?" $\\rightarrow$ Antwoord begint met: "The risks are..." (Direct antwoord). | H2: "What are the risks?" $\\rightarrow$ Antwoord begint met: "Before we discuss the risks, we should note..." (Vertraagt het antwoord). |  |
| **D. Contextuele Overlapping** | Elke kop (H2/H3) moet termen of synoniemen bevatten die teruggaan naar de **H1** of de **Centrale Entiteit** om de contextuele consolidatie te versterken. | H2: 'Benefits of Hot Water' (Bevat H1-termen). | H2: 'Benefits of Travel' (Te ver verwijderd van de CE). |  |
| **E. Numeric Value Prominence** | Gebruik numerieke waarden in de H1/Titel wanneer mogelijk (bv. "7 Types...") om de rangschikking en CTR te verhogen. | H1: "3 Types of Mail Merge Templates". | H1: "Mail Merge Templates" (Minder responsief). |  |
| **F. Entiteit Koppeling** | Elke kop die een andere entiteit introduceert, moet idealiter een link naar die entiteit bevatten. | H2: "Types of lenses" $\\rightarrow$ H3: "Polycarbonate" (linked). | Een entiteit introduceren in een kop zonder deze te linken. |  |

---

## **III. Plaatsing en Segmentatie (Contextuele Grenzen)**

De locatie van de H-tags op de pagina scheidt de **Main Content** (Macro Semantics) van de **Supplementary Content** (Micro Semantics) en controleert de PageRank-flow.

| Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Macro Context Plaatsing** | De belangrijkste, meest responsieve informatie, inclusief H1 en de eerste H2-secties, moeten in de **Macro Context** staan. Dit is de bovenste sectie van de pagina. | Plaats de definitie en de meest gezochte attributen direct in het macro-contextgebied. | De meest gezochte H2 staat begraven na vijf minder belangrijke H2's. |  |
| **B. Contextuele Brug** | De scheiding tussen Main Content en Supplementary Content moet een **Contextuele Brug** (vaak een H2) bevatten die de overgang logisch rechtvaardigt. | Een H2 die fungeert als brug (bv. 'Misunderstandings about X' of 'Mail Marketing') wordt gebruikt om de context langzaam te verschuiven. | De content springt abrupt van productvoordelen naar bedrijfshistorie. |  |
| **C. Anchor Text Vertraging** | Interne links naar **minder relevante pagina’s** (of het Core Section vanuit de Author Section) moeten worden **uitgesteld** en in de Supplementary Content (Micro Context) worden geplaatst. | De link naar de Core Section (bv. 'Mail Merge' homepage) wordt aan het einde van de pagina geplaatst, vaak in de H3/H4 van de Supplementary Content. | Vroegtijdig linken naar een pagina waarvan de H1 niet direct relevant is aan de bronpagina. |  |
| **D. Contextuele Dekking (Coverage Weight)** | Balanceer de lengte en het aantal Hx in elke sectie. Te veel detail in één Hx-sectie verdunt de algehele relevantie van de macro-context. | Een H2 beantwoordt de vraag beknopt (bv. 500 woorden), zodat andere H2's ook voldoende **Coverage Weight** krijgen. | De contentlengte van één H2 is 10.000 woorden (een 'artikel in een artikel'), waardoor de topicaliteit breekt. |  |

---

## **IV. Technische & Visuele Regels (HTML en Design)**

Zoekmachines normaliseren HTML en evalueren de visuele hiërarchie. Het correcte gebruik van Semantic HTML en typografie is essentieel.

| Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Semantic HTML Gebruik** | Elke kop moet worden omsloten door een `<section>` tag. Gebruik `<main>` voor de hoofdcontent. | Elke H2 is het begin van een nieuwe `<section>` tag. | Overmatig gebruik van `<div>` of geen Semantic HTML-structuur, wat de extractie belemmert. |  |
| **B. Hiërarchie Striktheid** | Gebruik een strikte, genormaliseerde hiërarchie (H1 $\\rightarrow$ H2 $\\rightarrow$ H3). Zelfs als zoekmachines twee H1's verwerken, helpt de juiste structuur de Googlebot. | Eén H1 per pagina; elke H2 definieert een unieke sectie. | Het gebruiken van H3-tags direct na de H1 (overslaan van H2). |  |
| **C. Visuele Hiërarchie** | De lettergrootte en het gewicht moeten de hiërarchie visueel weerspiegelen. | Gebruik 4 pixels kleiner en een lichtere letterdikte voor elke diepere H-tag (bv. H2 is lichter dan H1, H3 is lichter dan H2). | H2 en H3 hebben dezelfde lettergrootte/dikte, wat de structuur verward. |  |
| **D. HTML Normalisatie** | De HTML-structuur moet eenvoudig zijn, zodat zoekmachines de betekenis van componenten gemakkelijk kunnen extraheren. | Gebruik zo min mogelijk onnodige code om de **DOM Size** te verlagen, wat de responsiviteit verhoogt. | Complexe of "gebroken" HTML-structuur, waardoor zoekmachines de kop niet kunnen renderen. |  |

---

## **V. Specifieke Regels per Heading Niveau**

| Heading Niveau | REGEL (Rule Detail) | Toepassing en Context | Bronnen |
| ----- | ----- | ----- | ----- |
| **H1** | De belangrijkste entiteitsrepresentatie. Moet de **Macro Context, CE, en CSI** weerspiegelen. | Gebruik numerieke waarden ("7 types...") om de macro-context te versterken. Moet de meest prominente component op de pagina zijn. |  |
| **H2** | Definieert het doel van de sectie. Meerdere H2's in de Main Content moeten een **incrementeel geordende lijst** vormen om de flow te garanderen. | Moet een sub-context vragen die de H1 valideert (bv. een type, voordeel, of risico). |  |
| **H3** | Voor tussenliggende of ondergeschikte delen. Wordt vaak gebruikt om een **synoniem** of een meer specifieke locatie te introduceren zonder de H2 te verstoren. | Kan worden gebruikt om de prominentie van een link te verlagen, of om een concept geleidelijk te introduceren. |  |
| **H4/H5/H6** | Worden spaarzaam gebruikt om de **Contextuele Hiërarchie** verder te verdiepen. Wordt soms gebruikt om geleidelijk een link te creëren naar een minder direct relevant sub-context. | Helpt bij het creëren van een vloeiende overgang (Contextual Bridge) wanneer de semantische afstand groot is. |  |
| **Italic Format** | Gebruik **cursief** in content briefs om aan te geven dat een sectie een ander sub-segment of **contextueel domein** vertegenwoordigt, vaak met een tijdelijke verschuiving van de hoofdcontext. | De sectie over 'Gezondheidseffecten van water' is cursief om aan te geven dat het een tijdelijke zijstap is in een artikel over 'Glazen Frames'. |  |


The comprehensive process of deciding when to **merge, remove, or consolidate** content is central to managing a **Semantic Content Network (SCN)**. The ultimate goal is to minimize the **Cost of Retrieval (CoR)** and prevent **Ranking Signal Dilution** by ensuring that every indexed page provides maximum value.

---

## **I. Parameters voor Content Consolidatie: When to Merge or Delete**

The decision to open a new page or consolidate a page is based on four key metrics related to the query and entity structure:

| Actie PUNT | PARAMETER / REGEL (Rule Detail) | Consolidatie/Verwijdering (Action) | Nieuwe Pagina (New Page) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Query Search Demand** | Is de zoekvraag voor deze pagina laag, of heeft de pagina maandenlang geen verkeer ontvangen? | **Verwijder of Merge:** Als er onvoldoende vraag is, moet de content worden geïntegreerd in een bestaand document. | **Open:** Als er een hoge, consistente zoekvraag is. |  |
| **B. Entiteit / Variatie** | Zijn de entiteiten op de pagina te dichtbij of te vergelijkbaar (bv. kleine model- of nummerverschillen)? | **Merge:** Als de entiteiten te dicht bij elkaar staan (bijv. Glock 19, 20, 21 holsters) zonder significante verschil in attributen, merge ze dan naar één **representatieve pagina**. | **Open:** Als de entiteit duidelijk verschilt of de meest populaire is in zijn klasse (bv. Glock 18 is meest populair, verdient een eigen pagina). |  |
| **C. Query Similarity** | Is de query voor deze pagina te vergelijkbaar met de **Canonical Query** van een al bestaande, beter presterende pagina? | **Merge:** Als de query-similariteit hoog is, consolideer dan de ranking-signalen op één pagina. | **Open:** Als de entiteiten verschillend zijn, zelfs als 50% van de query hetzelfde is (de entiteit bepaalt de relevantie, niet het woord). |  |
| **D. Query Pattern** | Voldoet de pagina aan minder dan drie van de vier parameters voor een unieke indexconstructie? | **Verwijder of Merge:** Als de pagina niet voldoet aan de criteria om een unieke index te verdienen. | **Open:** Als de query een uniek patroon heeft (bijv. listicles, 'how-to' instructies) en drie of vier criteria valideert. |  |
| **Contextuele Flow** | Mist de pagina een **contextuele flow** en zijn de onderwerpen gebroken of ongerelateerd? | **Verwijder of Herbruik:** Pagina's die geen logisch verband hebben met de **Central Entity (CE)** van de site moeten worden verwijderd of geherformuleerd om de context te herstellen. |  |  |

---

## **II. Technische Stappen voor Verwijdering en Consolidatie**

Het correct omgaan met statuscodes en redirects is cruciaal om **PageRank** te behouden en de zoekmachine te informeren over de permanentie van de wijzigingen.

### **A. Statuscodes en Redirection**

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Goed Voorbeeld (Correct Status Code) | Fout Voorbeeld (Wrong Status Code) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **1\. Permanent Verplaatsen (Merge)** | Gebruik **301 Redirects** om de Canonical Effect en PageRank-waarde over te dragen naar de nieuwe, geconsolideerde URL. | Verouderde URL (`/old-product-v1/`) wordt 301 omgeleid naar de nieuwe representatieve URL (`/new-product/`). | 302/307 (Temporary Redirect) gebruiken voor permanente verhuizingen; dit vertelt Google dat de oude URL de hoofdbron blijft, waardoor de **CoR** toeneemt en de Canonical Effect wordt geneutraliseerd. |  |
| **2\. Permanent Verwijderen (Pruning)** | Gebruik de **410 Status Code (Gone)** voor content die permanent wordt verwijderd en nooit meer zal terugkeren. | Een verlopen, niet-relevante promotiepagina die geen verkeer heeft, wordt 410 gemarkeerd en uit de interne links verwijderd. | 404 gebruiken voor permanent verwijderde content, wat Googlebot kan aanmoedigen om de URL opnieuw te crawlen en te blijven controleren. |  |
| **3\. Redirect Chaining** | **Verwijder alle redirect chains** (meerdere 301's achter elkaar) en 404-bronnen uit de interne links. | Zorg ervoor dat de broncode en interne links direct verwijzen naar de definitieve URL (één 301). | De interne link laten verwijzen naar een URL die op zijn beurt een andere 301-redirect heeft. Dit schaadt de crawl path-kwaliteit. |  |

### **B. Strategische Migratie (Negatieve Ranking State)**

Wanneer een heel domein is beïnvloed door een Core Update en de beslissing tot migratie wordt genomen, moet dit voorzichtig gebeuren om te voorkomen dat de **Negative Ranking State** van het oude domein wordt overgeërfd.

* **Geleidelijke Overdracht:** Voer een **partiële, stap-voor-stap migratie** uit over maanden. Verhuis eerst de meest kritische documenten, vervolgens de rest. Publiceer unieke documenten op het nieuwe domein om het algoritme te "blurren".  
* **Merkoverlap:** Creëer **overlappende zoekreizen** (overlapping search journeys) door de nieuwe site tijdelijk te laten ranken voor de merknaam van de oude site (bv. "X is Y").

---

## **III. Alternatieven voor Verwijdering en Consolidatiemethoden**

Als een pagina niet direct wordt verwijderd, moet deze worden gebruikt om de semantische kracht van het **Core Section** te vergroten.

### **A. Verbetering en Integratie**

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **1\. Content Consolidatie** | Voeg korte, dunne of overlappende content samen in een nieuw, **alomvattend** document. Dit verhoogt de **Information Value per Page**. | Merge 10 FAQ-pagina's met dunne content naar één alomvattende FAQ-pagina met `FAQPage` Structured Data. | Het handhaven van pagina's met minder dan 500 woorden zonder uitgebreide informatie, wat leidt tot **Content Decay**. |  |
| **2\. Conversie naar Attributen** | Als de pagina weinig zoekvraag heeft, maar waardevolle attributen bevat, converteer deze dan naar een filter of een attribuut binnen een bestaande categoriepagina. | Converging 600 versies van een boek (verschillende uitgevers, jaartallen) naar één Canonical Pagina en de versies als **filters** of attributen weergeven. | Het openen van een nieuwe URL voor elke combinatie van filters (bijv. kleur, maat, model) als er geen aparte zoekvraag is. |  |
| **3\. Unieke N-grams & Semantiek** | De geconsolideerde pagina moet **unieke en contextual relevante N-grams** en **variaties van zinnen** gebruiken om de relevantie te tonen, in plaats van geparaphraseerde of geautomatiseerde herhalingen. | Gebruik **variaties** van de Anchor Text, synoniemen, en lemma's om de content te verrijken en templating te voorkomen. | Het gebruik van identieke zinnen die de kernfeiten beschrijven, wat leidt tot een lage **Unieke Informatie Gain Score**. |  |

### **B. Link Sculpting en Hiding (PageRank Management)**

Als onnodige pagina's niet kunnen worden verwijderd, moeten ze worden **geïsoleerd** van de PageRank-flow om de autoriteit van de Core Section te beschermen.

| Actie PUNT (Action Item) | REGEL (Rule Detail / Principle) | Context / Actie | Bronnen |
| ----- | ----- | ----- | ----- |
| **1\. Disallow Worthless Pages** | Voor pagina's die absoluut **waardeloos** zijn (bv. affiliate redirects, no-content pagina's), gebruik **Disallow** in `robots.txt` om het crawlen te stoppen en PageRank-overdracht te blokkeren. | **DO:** `Disallow` interne links en categorieën die PageRank verspillen, zoals inactieve profielen of irrelevante parameters. |  |
| **2\. Internal Link Cleanup** | Verwijder alle interne links die wijzen naar de verwijderde of samengevoegde pagina's om **Internal Link Rot** te voorkomen. | **DO:** Gebruik Log File Analysis om de meest gecrawlde, maar laagst presterende URL's te identificeren, en herzie de interne links daar. |  |
| **3\. Link Prominence Manipulatie** | Gebruik knoppen of `onclick` JavaScript-events voor filters of links die niet door Google gecrawld moeten worden om PageRank Dilution te voorkomen. | **DO:** Pas de links in de **dynamische headers en footers** aan om de PageRank te concentreren op de Core Section. |  |

---

## **IV. Wat te Doen met Geconsolideerde Content**

Geconsolideerde content moet de autoriteit terugleiden naar de **Core Section** van de Topical Map.

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Goed Voorbeeld (Core Section Linkage) | Fout Voorbeeld (Wrong Linkage) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Link naar Kwaliteitsknopen** | De geconsolideerde pagina moet onmiddellijk en contextueel linken naar de **Quality Nodes** (de meest gezaghebbende en kwalitatieve artikelen) en de Homepage om PageRank terug te voeren. | Link de geconsolideerde content op een prominente manier naar de 5-10 beste artikelen van de website, die de hoogste semantische compliance hebben. | De geconsolideerde pagina linkt alleen naar minder belangrijke subpagina's of verouderde content. |  |
| **B. Linkpositie** | Plaats de interne links die PageRank terugvoeren naar de Core Section bij voorkeur in de **Micro Context** (supplementaire content/onderaan het artikel). | De link naar de Core Mail Merge-pagina wordt onderaan een 'Birthday Mail' artikel geplaatst om relevantieverlies te voorkomen. | Het linken van de Core Section te vroeg in de Macro Context, wat de contextuele relevantie kan verdunnen. |  |
| **C. Vernieuwing en Momentum** | Zorg ervoor dat de geconsolideerde pagina's regelmatig worden **vernieuwd** en **bijgewerkt** om aan de eisen van **Query Deserves Freshness** te voldoen. | Creëer een "Content Bank" en een publicatieplan om momentum te creëren (bv. 3 artikelen per dag) en de zoekmachine constant hogere kwaliteit te laten vinden. | Het publiceren van alle content tegelijk en vervolgens het project stilzetten, wat leidt tot demotie na Core Updates. |  |
| **D. Document Order** | De volgorde van de attributen in de geconsolideerde pagina moet worden aangepast om de **juiste relevantie** te tonen voor de meest gezochte intentie. | Plaats de definitie en de meest gezochte attributen (prijs, specificaties) bovenaan in de **Macro Context**. | De volgorde van de attributen willekeurig kiezen, waardoor de relevantie voor de aankoopintentie wordt verlaagd. |  |


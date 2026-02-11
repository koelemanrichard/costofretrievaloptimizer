# Semantic SEO Content Audit Checklist — Volledig

**Gebaseerd op Koray Tuğberk Gübür's Holistic SEO Framework**
**Versie 2.0 — Februari 2025**

Gebruik deze checklist om elk stuk content te beoordelen. Elke regel is direct afgeleid uit het framework. Geen samenvattingen, geen shortcuts — dit is de complete set.

---

## Legenda

- ✅ = Regel correct toegepast
- ❌ = Overtreding gevonden — actie nodig
- ➖ = Niet van toepassing op dit contenttype
- **[P0]** = Blocker — publicatie blokkeren
- **[P1]** = Kritiek — fixen vóór publicatie
- **[P2]** = Hoog — fixen binnen 1 week
- **[P3]** = Medium — fixen binnen 1 maand
- **[P4]** = Laag — volgende sprint

---

# DEEL A: STRATEGISCHE FUNDERING

## I. MACRO CONTEXT & POSITIONERING

### A. Single Focus

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 1 | Pagina richt zich op ÉÉN Macro Context en ÉÉN Central Entity (CE) | P0 | |
| 2 | H1, Title tag en Centerpiece Text delen dezelfde kernfocus | P0 | |
| 3 | Geen menging van twee hoofdthema's op dezelfde pagina (= relevantieverdunning) | P0 | |
| 4 | Central Entity is helder gedefinieerd in de eerste 2 zinnen | P1 | |
| 5 | Central Entity verschijnt in de eerste zin van de pagina | P1 | |

### B. Source Context (SC) Alignment

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 6 | Content sluit aan bij de Source Context en Central Search Intent (CSI) | P0 | |
| 7 | Attributenprioriteit past bij het monetisatiedoel van de SC | P1 | |
| 8 | SC-type bepaalt welke attributen domineren (zie tabel hieronder) | P1 | |
| 9 | Duidelijk of pagina Core Section (CS) of Author Section (AS) is | P1 | |
| 10 | Geen content die buiten SC valt zonder contextual bridge | P2 | |

**SC Attribuutprioriteit:**

| SC Type | Hoogste prioriteit attributen |
|---------|-------------------------------|
| E-commerce | Prijs, beschikbaarheid, specificaties, reviews |
| SaaS | Features, use cases, integraties, prijzen |
| B2B Dienstverlener | Credentials, case studies, methodologie, expertise |
| Blog/Informatie | Diepgang, onderzoek, unieke inzichten |
| Affiliate | Voordelen voor gebruiker, alternatieven, vergelijkingen |

### C. Central Search Intent (CSI) Predicaten

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 11 | CSI-predicaten (werkwoorden) geïdentificeerd en consistent gebruikt | P1 | |
| 12 | CSI-predicaten verschijnen in root-documenten en major headings | P1 | |
| 13 | Predicaten passen bij SC-type (diensten: "biedt, levert, lost op"; e-commerce: "koop, vergelijk, bestel"; informatie: "leer, begrijp, ontdek") | P2 | |

### D. Content Coverage Weight

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 14 | Subsectie-lengte is proportioneel aan het belang van het subonderwerp voor de Macro Context | P2 | |
| 15 | Geen over-coverage: minor attributen domineren niet de pagina | P2 | |
| 16 | Proportionele H2's: belangrijke topics krijgen meer coverage dan bijzaken | P2 | |

---

## II. E-E-A-T SIGNALERING

### A. Author Entity

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 17 | Author Entity gedefinieerd met naam en credentials | P1 | |
| 18 | Consistent auteursnaamformaat overal op de site | P2 | |
| 19 | Author schema markup aanwezig (name, url, sameAs) | P1 | |
| 20 | Externe citaties: auteur vermeld op externe bronnen (Wikipedia, podcasts, vakbladen) | P3 | |

### B. Expertise & Menselijk Signaal

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 21 | Signalen van menselijke inspanning: origineel onderzoek, unieke inzichten, eigen ervaring | P2 | |
| 22 | Domeinspecifieke terminologie consequent en correct gebruikt (expertisesignaal) | P2 | |
| 23 | Unieke schrijfstijl / Expression Identity herkenbaar — niet generiek | P3 | |
| 24 | Vocabulaire-rijkdom: gevarieerd taalgebruik als expertise-indicator (Uniqueness Score) | P3 | |
| 25 | Publicatiefrequentie voldoende (Momentum) — niet sporadisch | P4 | |

### C. AI-patroonvermijding

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 26 | Geen "Overall" aan einde van secties | P1 | |
| 27 | Geen "I had the pleasure of visiting" of vergelijkbare constructies | P1 | |
| 28 | Geen "In today's world" of "In this day and age" | P1 | |
| 29 | Geen "It is important to note that" — zeg het feit direct | P1 | |
| 30 | Geen lijsten die beginnen met "Firstly, Secondly, Thirdly" | P2 | |
| 31 | Geen "In conclusion" als afsluiting | P2 | |
| 32 | Geen herkenbare AI-gegenereerde review-patronen | P2 | |

---

# DEEL B: ENTITY-ATTRIBUTE-VALUE (EAV) SYSTEEM

## III. EAV TRIPLE-STRUCTUUR

### A. Basisstructuur

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 33 | Alle feiten zijn gestructureerd als Subject-Predicate-Object (EAV triples) | P1 | |
| 34 | Elke zin levert bij voorkeur ÉÉN unieke EAV triple | P2 | |
| 35 | EAV triples zijn expliciet — niet impliciet of verborgen in complexe zinnen | P2 | |
| 36 | Geen onnodige woorden tussen Entity, Attribute en Value | P2 | |

**Correct**: "Het iPhone 15 weegt 171 gram." (1 zin = 1 triple)
**Incorrect**: "Het iPhone 15, een populair toestel dat veel mensen aanspreekt, weegt naar verluidt rond de 171 gram."

### B. Entiteiten

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 37 | Entiteiten expliciet benoemd — geen ambigue voornaamwoorden ("het", "dit", "hij") waar verwarring mogelijk is | P1 | |
| 38 | Uitzondering: voornaamwoord alleen toegestaan als er slechts één entiteit in de direct voorafgaande zin staat zonder enige verwarringsmogelijkheid | P2 | |
| 39 | Bij eerste vermelding: entiteit met volledige naam + definitie | P1 | |

### C. Waarden (Values)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 40 | Waarden specifiek en kwantitatief — geen "veel", "aanzienlijk", "diverse", "structureel lager" | P1 | |
| 41 | Getallen inclusief eenheden (€50, 15 werkdagen, 30 m², 9-13 jaar) | P1 | |
| 42 | Bereiken gebruikt bij onzekere waarden ("tussen 10 en 15 werkdagen", niet "ongeveer 12 dagen") | P2 | |
| 43 | "Beste" of superlatieven alleen met meetbare criteria/onderbouwing | P2 | |

### D. Attribuuttypes & Volgorde

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 44 | Unique Attributes aanwezig (≥3 stuks) — uniek identificerend, onderscheidend van concurrenten | P2 | |
| 45 | Root Attributes volledig behandeld — essentieel voor definitie (prijs, locatie, duur, vereisten, samenstelling) | P1 | |
| 46 | Rare Attributes aanwezig — expertise/diepgang-signaal, niet bij concurrenten te vinden | P3 | |
| 47 | Attribuutvolgorde in content: Unique → Root → Rare | P2 | |
| 48 | Uitzondering: historische/achtergrondattributen komen laatst, tenzij SC historisch is | P3 | |

---

## IV. KNOWLEDGE-BASED TRUST (KBT) — CONSISTENTIE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 49 | Merknaam/entiteitsnaam overal identiek gespeld (geen variatie in schrijfwijze) | P0 | |
| 50 | Feiten consistent met rest van de website (geen conflicterende waarden) | P0 | |
| 51 | Feiten in lijn met externe authoritative sources (Wikipedia, brancheorganisaties, overheidsbronnen) | P1 | |
| 52 | Eenheden consistent (altijd metrisch óf altijd imperiaal, niet mengen) | P2 | |
| 53 | Datumformaat consistent door hele content en hele site | P2 | |
| 54 | Geen tegenstrijdige definities van dezelfde term op verschillende pagina's | P0 | |
| 55 | Geen tegenstrijdige beweringen over hetzelfde attribuut op verschillende pagina's (bijv. "€50" op pagina A, "€60" op pagina B) | P0 | |
| 56 | Bij "Beste" claim voor meerdere items: duidelijke criteria per claim | P2 | |

---

## V. MODALITEIT (Zekerheid & Predicaattypen)

### A. Modaliteitsregels

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 57 | "is/zijn" (definiërend) voor vaststaande feiten en wetenschappelijke consensus | P1 | |
| 58 | "kan/mag" (mogelijkheid) voor variabele uitkomsten en conditionele resultaten | P1 | |
| 59 | "moet/dient" (adviserend) voor professioneel advies en wettelijke vereisten | P2 | |
| 60 | "zou/zou kunnen" (onzeker) alleen voor daadwerkelijk betwiste of variabele claims | P2 | |
| 61 | Geen vals twijfelen ("kan wellicht misschien") bij bewezen feiten | P1 | |
| 62 | Geen overgeneralisatie: "X veroorzaakt Y" alleen als dat altijd zo is; anders "X kan Y veroorzaken" | P2 | |

### B. Predicaatcategorieën

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 63 | Definitie-predicaten correct: is, zijn, betekent, verwijst naar | P2 | |
| 64 | Compositie-predicaten correct: bevat, omvat, heeft, bestaat uit | P2 | |
| 65 | Causale predicaten correct: veroorzaakt, resulteert in, leidt tot | P2 | |
| 66 | Vergelijkende predicaten correct: overtreft, verschilt van, is gelijk aan | P2 | |
| 67 | Actie-predicaten correct: voert uit, genereert, creëert | P2 | |
| 68 | Consistente predicaten voor dezelfde relaties door hele pagina (niet afwisselend "kost" en "is geprijsd op") | P2 | |

### C. Frame-semantiek

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 69 | Predicaten triggeren "frames" — alle verwachte elementen zijn aanwezig | P3 | |
| 70 | Frame "kopen": [Wie] koopt [Wat] van [Wie] voor [Prijs] — elementen ingevuld | P3 | |
| 71 | Frame "veroorzaken": [Oorzaak] veroorzaakt [Gevolg] onder [Conditie] — elementen ingevuld | P3 | |
| 72 | Frame "aanbevelen": [Expert] beveelt [Actie] aan voor [Doelgroep] vanwege [Reden] | P3 | |

---

# DEEL C: MICRO-SEMANTIEK (Zin- en Woordniveau)

## VI. ZINSSTRUCTUUR

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 73 | Zinnen volgen helder Subject-Predicate-Object patroon | P1 | |
| 74 | Definitiezinnen: max 15-20 woorden | P2 | |
| 75 | Verklarende zinnen: max 20-30 woorden | P2 | |
| 76 | Instructiezinnen: max 10-15 woorden | P2 | |
| 77 | Gemiddelde zinslengte <30 woorden | P2 | |
| 78 | Korte dependency trees — geen meervoudig geneste bijzinnen | P2 | |

---

## VII. WOORDVOLGORDE & PROMINENTIE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 79 | Standaard woordvolgorde gebruikt (hoge parseerkans door zoekmachines) | P2 | |
| 80 | Belangrijkste entiteit staat aan het begin van de zin (entity prominence) | P2 | |
| 81 | Attributen staan dicht bij hun entiteit (niet gescheiden door bijzinnen) | P2 | |
| 82 | Waarden staan direct naast attributen ("weegt 171 gram", niet "weegt, afhankelijk van het model, circa 171 gram") | P2 | |
| 83 | Bij attribuut-prominentie: start met het attribuut ("Het gewicht van X is Y") | P3 | |
| 84 | Bij waarde-prominentie: start met de waarde ("171 gram weegt de X") | P4 | |

**Zinspatronen:**

| Patroon | Template | Voorbeeld |
|---------|----------|-----------|
| Definitioneel | [Entity] is [Definitie] | "Een sedumdak is een plat dak met vetplanten." |
| Attributief | [Entity] heeft [Attribuut]: [Waarde] | "Een sedumdak heeft een levensduur van 30-50 jaar." |
| Vergelijkend | [Entity A] is [vergelijking] dan [Entity B] | "Sedumdaken zijn lichter dan grindballastdaken." |

---

## VIII. CONTEXT QUALIFIERS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 85 | Locatiequalifiers aanwezig waar relevant (in Nederland, voor Noord-Brabant, in Oosterhout) | P2 | |
| 86 | Tijdqualifiers aanwezig waar relevant (in 2025, tijdens winter, na 5 jaar) | P2 | |
| 87 | Doelgroepqualifiers aanwezig (voor particulieren, voor bedrijven, voor VvE's) | P2 | |
| 88 | Conditiequalifiers aanwezig (bij lekkage, zonder ervaring, voor beginners) | P2 | |
| 89 | Hoeveelheidsqualifiers aanwezig (onder €50, meer dan 100 m², tussen 3-5 jaar) | P3 | |
| 90 | Qualifiers in headings waar relevant (sterkste signaal) | P2 | |
| 91 | Qualifiers in eerste zin na heading (hoog signaal) | P2 | |
| 92 | Qualifiers consistent door hele pagina (niet wisselend) | P2 | |
| 93 | Query Specificity Ladder: qualifiers gestapeld voor long-tail targeting | P3 | |

---

# DEEL D: INFORMATIEDICHTHEID

## IX. DICHTHEIDSREGELS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 94 | Elke alinea voegt nieuwe, unieke informatie toe | P1 | |
| 95 | Geen herhaling van hetzelfde feit in andere woorden (redundantie) | P1 | |
| 96 | Geen opvulzinnen zonder feitelijke waarde | P1 | |
| 97 | Meningen onderbouwd met meetbare criteria ("beste" alleen met bewijs) | P2 | |
| 98 | Directe antwoorden — geen omhaal voordat de kernvraag beantwoord wordt | P1 | |
| 99 | Elke alinea bevat minstens 1 extraheerbaar feit | P2 | |

---

## X. VULWOORDEN & OVERBODIGHEDEN

### A. Nederlands

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 100 | Verwijderd: "eigenlijk", "in principe", "heel", "erg", "vrij", "nogal", "enigszins" | P1 | |
| 101 | Verwijderd: "zoals eerder vermeld", "het is belangrijk op te merken dat", "vanzelfsprekend" | P1 | |
| 102 | Verwijderd: "al met al", "concluderend", "uiteindelijk", "als het ware", "als zodanig" | P1 | |
| 103 | Verwijderd: "om zo te zeggen", "het moge duidelijk zijn", "niet in de laatste plaats" | P2 | |

### B. Engels

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 104 | Verwijderd: "actually", "basically", "really", "very", "quite", "rather", "somewhat" | P1 | |
| 105 | Verwijderd: "overall", "in conclusion", "as stated before", "it goes without saying" | P1 | |
| 106 | Verwijderd: "needless to say", "at the end of the day", "in my opinion" | P1 | |
| 107 | Verwijderd: "I had the pleasure of", "it is important to note that", "in today's world" | P1 | |

### C. Vaagheid vervangen

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 108 | "Veel" vervangen door exact getal ("12 bedrijven" ipv "diverse bedrijven") | P1 | |
| 109 | "Sommige" vervangen door specificatie ("3 van de 7 typen" ipv "sommige typen") | P2 | |
| 110 | "Aanzienlijk" vervangen door kwantitatieve vergelijking ("40% lager" ipv "aanzienlijk lager") | P1 | |
| 111 | "Vaak" vervangen door frequentie ("in 8 van de 10 gevallen" ipv "vaak") | P2 | |
| 112 | "Recent" vervangen door datum ("sinds januari 2025" ipv "recent") | P2 | |

---

# DEEL E: CONTEXTUAL FLOW (Documentstructuur)

## XI. CENTERPIECE TEXT (Eerste 400 tekens)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 113 | Eerste 400 tekens bevatten de kern: Central Entity + definitie + belangrijkste attributen | P0 | |
| 114 | Core entity/topic verschijnt in de eerste zin | P0 | |
| 115 | Primaire definitie of kernantwoord aanwezig in eerste 2 zinnen | P1 | |
| 116 | Sleutelattributen vermeld in eerste 400 tekens | P1 | |
| 117 | Geen afgekapte tekst, geen ellipsis (...) in de opening | P1 | |
| 118 | Geen share-knoppen, advertenties of auteursinformatie vóór de hoofdtekst | P0 | |
| 119 | Geen generieke inleiding ("Welkom bij...", "In dit artikel...", "Veel mensen vragen zich af...") | P1 | |
| 120 | Geen datums of metadata vóór de inhoudelijke tekst in de DOM | P2 | |

---

## XII. SUBORDINATE TEXT (Eerste zin na elke heading)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 121 | Eerste zin na elke H2/H3 beantwoordt direct de heading | P1 | |
| 122 | "Wat is X?" → "X is..." | P1 | |
| 123 | "Wat zijn de voordelen?" → "De voordelen zijn/omvatten..." | P1 | |
| 124 | "Hoe werkt X?" → "X werkt door..." of "Volg deze stappen:" | P1 | |
| 125 | "Waarom X?" → "X gebeurt omdat..." | P1 | |
| 126 | "Wanneer moet je X?" → "Je moet X wanneer..." | P1 | |
| 127 | Eerste antwoordzin <40 woorden of <340 tekens (Featured Snippet target) | P2 | |
| 128 | Geen fluff-openingszinnen: "Voordat we dit bespreken...", "Zoals eerder vermeld..." | P1 | |
| 129 | Geen "In dit gedeelte bespreken we..." — direct het antwoord geven | P1 | |
| 130 | Bij statement-headings: eerste zin breidt de bewering uit met specifiek feit | P2 | |
| 131 | Bij topic-headings: eerste zin definieert het topic | P2 | |

---

## XIII. HEADING HIËRARCHIE & CONTEXTUAL VECTOR

### A. Structuur

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 132 | Precies één H1 per pagina | P0 | |
| 133 | H1 bevat de Central Entity of het hoofdonderwerp | P0 | |
| 134 | H1 is NIET identiek aan eerste H2 | P0 | |
| 135 | H2's zijn directe subonderwerpen van het H1-thema | P1 | |
| 136 | H3's zijn subonderwerpen van hun bovenliggende H2 | P1 | |
| 137 | H4's alleen gebruikt bij diepe specificatie-behoeften | P3 | |
| 138 | Geen headingniveaus overgeslagen (geen H2 → H4 zonder H3) | P0 | |
| 139 | Subheadings logisch genest onder hun parent | P1 | |
| 140 | Alle headings hebben id-attributen voor navigatie/jump links | P2 | |

### B. Heading Inhoud

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 141 | Headings bevatten de entiteit ("Voordelen van sedumdaken" niet alleen "Voordelen") | P1 | |
| 142 | Headings zijn specifiek ("Types D-Visum" niet "Verschillende types") | P2 | |
| 143 | Geen kale, contextloze headings ("Meer informatie", "Details", "Conclusie") | P2 | |

### C. Vector Straightness (Logische Progressie)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 144 | Headings vormen een logische, incrementele progressie zonder onderbrekingen | P1 | |
| 145 | Volgorde past bij het contenttype: | | |
| | — Definitioneel: Wat → Waarom → Hoe → Wanneer | P1 | |
| | — Proces: Stap 1 → Stap 2 → Stap 3 | P1 | |
| | — Analytisch: Probleem → Oorzaken → Oplossingen | P1 | |
| | — Vergelijkend: Optie A → Optie B → Conclusie | P1 | |
| 146 | Geen off-topic headings die de contextual vector onderbreken | P1 | |
| 147 | Definitie komt vóór types, types vóór oorzaken, oorzaken vóór behandeling | P2 | |
| 148 | Stappen staan in volgorde (niet stap 3 vóór stap 1) | P1 | |
| 149 | Geschiedenis/achtergrond staat aan het einde, niet aan het begin (tenzij SC historisch is) | P3 | |

---

## XIV. DISCOURSE INTEGRATION (Alineaovergangen)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 150 | Laatste zin van elke sectie bevat een term die in de volgende sectie terugkomt (anchor segment) | P2 | |
| 151 | Alinea's beginnen niet met volledig onverwachte, ongeïntroduceerde concepten | P2 | |
| 152 | Sleutelwoorden herhaald op paragraafgrenzen voor vloeiende overgang (mutual phrases) | P3 | |
| 153 | Elke paragraaf is verbonden met de vorige — geen geïsoleerde tekstblokken | P2 | |

**Correct**: "...deze **daktypen** beïnvloeden de isolatiewaarde." → H3: "**Daktypen** en Isolatie"
**Incorrect**: sectie over dakconstructie, gevolgd door compleet losse sectie over verzekering zonder overgang

---

## XV. CONTEXTUAL BRIDGES

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 154 | Bij overgang naar contextueel afgelegen onderwerp: bridge-sectie aanwezig | P2 | |
| 155 | Bridge verklaart waarom het nieuwe onderwerp relevant is voor het hoofdthema | P2 | |
| 156 | Bridge-formaat: H2/H3 met titel "Waarom [Micro Context] belangrijk is voor [Macro Context]" | P3 | |
| 157 | Bridge geplaatst aan het einde van de macro-contextsectie (niet aan het begin) | P3 | |
| 158 | Geen directe links naar verre onderwerpen in de openingsalinea zonder bridge | P2 | |

**Correct**: [Visa-informatie - Core Section] → [H2: "Duitse Cultuur Begrijpen voor Uw Bezoek"] → [Duitse Cultuur - Author Section]

---

## XVI. INTRODUCTIE-ALIGNMENT

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 159 | Introductie bevat termen uit alle hoofdsecties (preview van de contextual vector) | P2 | |
| 160 | Introductie komt overeen met wat daadwerkelijk volgt (accurate preview) | P2 | |
| 161 | Two-pass writing: introductie herzien na afronden body-content | P3 | |

---

# DEEL F: INTERN LINKEN

## XVII. ANKERTEKST

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 162 | Dezelfde exacte ankertekst max 3× per pagina in de hoofdcontent (Max 3x Rule) | P1 | |
| 163 | Bij 4+ links naar dezelfde pagina: synoniemen, woordvolgorde-variaties of hyponiemen gebruikt | P1 | |
| 164 | Ankertekst komt overeen met H1/title van doelpagina | P2 | |
| 165 | Geen generieke ankerteksten ("klik hier", "lees meer", "meer informatie") — minimaliseren | P1 | |
| 166 | Exact match ankertekst voor primaire keyword | P2 | |
| 167 | Partial match voor natuurlijke variaties ("het aanvragen van uw visum") | P3 | |
| 168 | Lexicale hiërarchie: hyperniemen (breder) hoger op de pagina, hyponiemen (specifieker) lager | P3 | |

---

## XVIII. LINKPLAATSING

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 169 | Links geplaatst NÁ definitie van het concept (Definition-First Rule) | P1 | |
| 170 | Links niet in de allereerste zin of het allereerste woord van een alinea | P2 | |
| 171 | Links voornamelijk in de hoofdcontent, niet alleen in sidebar/footer/gerelateerde sectie | P1 | |
| 172 | Minimaal 5 interne links in de main content body bij content >1.000 woorden | P1 | |
| 173 | Strategische plaatsing: belangrijkste doelpagina's krijgen links op prominent positions (niet onderaan begraven) | P2 | |

---

## XIX. ANNOTATIE-TEKST

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 174 | Omringende tekst (1-2 zinnen vóór link) bespreekt het onderwerp van de doelpagina | P1 | |
| 175 | De entiteit van de doelpagina is genoemd in de buurt van de ankertekst | P2 | |
| 176 | Context bereidt de lezer voor op de gelinkte content | P2 | |
| 177 | Geen geïsoleerde links zonder context ("Voor meer informatie, klik hier") | P1 | |

**Correct**: "Het begrijpen van Duitse immigratie-eisen is essentieel. Lees meer over het [Duitsland visum-proces] en zorg dat u aan alle criteria voldoet."
**Incorrect**: "Voor meer info, [klik hier]."

---

## XX. LINKVOLUME & PAGERANK FLOW

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 178 | Totaal aantal interne links per pagina <150 | P1 | |
| 179 | >50% van links in de hoofdcontent (niet in boilerplate/nav/footer) | P1 | |
| 180 | Boilerplate-links (header/footer/sidebar) <50% van totaal | P2 | |
| 181 | Author Section pagina's linken naar Core Section (AS → CS richting dominant) | P1 | |
| 182 | Core Section linkt spaarzaam naar Author Section (niet de PR wegsturen) | P2 | |
| 183 | Homepage ontvangt links van alle pagina's, linkt sterk naar Core Section | P2 | |
| 184 | Geen orphan pages (alle pagina's bereikbaar via minstens 1 interne link) | P1 | |
| 185 | Geen dead-end pages (elke pagina linkt naar minstens 1 andere pagina) | P2 | |

---

## XXI. NAVIGATIE & DYNAMIEK

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 186 | Sidebar/navigatie is dynamisch — verandert per pagina op basis van context | P3 | |
| 187 | Geen mega-menus met 100+ links op elke pagina (PageRank-verdunning) | P2 | |
| 188 | Footer bevat alleen essentiële site-brede links, geen linkfarm | P2 | |
| 189 | CSI-predicaten in ankerteksten ("genereer rapporten" niet "klik hier") | P2 | |

---

## XXII. URL FRAGMENTEN & JUMP LINKS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 190 | Table of Contents aanwezig bij lange artikelen (>1.500 woorden) | P2 | |
| 191 | TOC-links verwijzen naar correcte heading-id's (#fragment) | P2 | |
| 192 | Alle H2/H3 headings hebben id-attributen | P2 | |
| 193 | H1 heeft een id-attribuut | P3 | |
| 194 | ID-namen zijn kort, beschrijvend, lowercase met koppeltekens | P3 | |

---

# DEEL G: SEMANTIC DISTANCE

## XXIII. THEMATISCHE AFSTAND

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 195 | Alle behandelde subonderwerpen hebben lage semantische afstand tot de Central Entity | P2 | |
| 196 | Bij medium-afstand onderwerpen (0.3-0.5): aparte pagina's, bridge content aanwezig | P2 | |
| 197 | Geen directe links naar pagina's met hoge semantische afstand (>0.7) zonder contextuele rechtvaardiging | P2 | |
| 198 | Interne links alleen tussen pagina's met lage semantische afstand (of via bridge) | P2 | |
| 199 | Geen topic-sprongen van >5 "nodes" afstand in de topical graph zonder tussenstappen | P3 | |
| 200 | Cluster-validatie: alle pagina's in hetzelfde cluster hebben afstand <0.5 | P3 | |
| 201 | Bridge content verbindt aangrenzende clusters | P3 | |
| 202 | Geen orphan pages met hoge afstand van cluster | P2 | |
| 203 | Canonieke queries toegewezen aan één enkele pagina (geen dubbele targeting) | P1 | |

---

# DEEL H: CONTENT FORMAAT & VISUELE SEMANTIEK

## XXIV. FORMAAT PER INTENTTYPE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 204 | Definitiecontent: prose paragraph (`<p>`) | P2 | |
| 205 | How-to / processtappen: genummerde lijst (`<ol>`) | P1 | |
| 206 | Vergelijkingen (>2 items, >3 attributen): tabel (`<table>`) | P1 | |
| 207 | Specificaties: tabel of definitielijst (`<table>` of `<dl>`) | P2 | |
| 208 | Superlatieven/rankings: geordende lijst (`<ol>`) | P2 | |
| 209 | Niet-sequentiële opsommingen: ongeordende lijst (`<ul>`) | P2 | |

---

## XXV. LIJSTREGELS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 210 | Lijst-introzin aanwezig die het exacte aantal items vermeldt ("De 5 voordelen van...") | P1 | |
| 211 | Alle lijstitems beginnen op dezelfde manier (allemaal met werkwoord, of allemaal met zelfstandig naamwoord) — consistente opmaak | P2 | |
| 212 | Instructionele lijsten: elk item begint met actie-werkwoord | P2 | |
| 213 | Geordende lijsten alleen voor sequenties, rankings, stappen | P2 | |
| 214 | Ongeordende lijsten alleen voor niet-sequentiële items | P2 | |
| 215 | `<ol>` in HTML voor geordend, `<ul>` voor ongeordend — correcte tags | P1 | |

---

## XXVI. TABELREGELS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 216 | Duidelijke headers (`<th>`) aanwezig | P1 | |
| 217 | Consistente dataformattering in cellen | P2 | |
| 218 | Geen samengevoegde cellen (accessibility) | P3 | |
| 219 | Caption of titel aanwezig boven de tabel | P3 | |

---

## XXVII. VISUELE HIËRARCHIE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 220 | Belangrijkste componenten groter/hoger op de pagina | P2 | |
| 221 | Commercieel intent: Product/dienst → Prijs → Reviews → Statistieken (LIFT model) | P2 | |
| 222 | Informationeel intent: Definitie → Uitleg → Voorbeelden → Referenties | P2 | |
| 223 | CTA/kerninformatie boven de fold bij commercieel intent | P2 | |
| 224 | Componenten geordend op gebruikersintent, niet op willekeur | P2 | |

---

## XXVIII. FEATURED SNIPPET OPTIMALISATIE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 225 | FS Paragraph target: <340 tekens of <40 woorden, direct antwoord, geen fluff | P2 | |
| 226 | FS Lijst target: 3-8 items met introzin + genummerde/ongenummerde lijst | P2 | |
| 227 | FS Tabel target: 3-5 zichtbare rijen met headers + kerndata | P3 | |
| 228 | Elke H2/H3 met vraagformaat is een potentieel FS target — subordinate text geoptimaliseerd | P2 | |
| 229 | IR Zone (eerste 400 tekens) bevat het kernantwoord voor de hoofd-query | P1 | |

---

## XXIX. GERELATEERDE CONTENT SECTIE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 230 | Consistent formaat voor alle gerelateerde items (niet: sommige met beschrijving, andere zonder) | P3 | |
| 231 | Items zijn daadwerkelijk gerelateerd aan het hoofdonderwerp (lage semantische afstand) | P2 | |
| 232 | Gerelateerde links ondersteunen de contextual vector (niet random) | P2 | |

---

# DEEL I: HTML & TECHNISCHE SEMANTIEK

## XXX. SEMANTISCHE HTML-TAGS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 233 | `<article>` voor de zelfstandige hoofdcontent | P1 | |
| 234 | `<section>` voor thematische groepen binnen article | P2 | |
| 235 | `<aside>` voor zijdelingse/tangentiële content | P2 | |
| 236 | `<nav>` voor navigatie-elementen | P2 | |
| 237 | `<header>` voor introductie/header van pagina of sectie | P2 | |
| 238 | `<footer>` voor footer van pagina of sectie | P2 | |
| 239 | `<main>` slechts één keer per pagina | P1 | |
| 240 | Logische leesvolgorde voor screenreaders | P3 | |
| 241 | ARIA labels aanwezig waar nodig | P3 | |

---

## XXXI. HTML VALIDATIE & NESTING

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 242 | Geen `<figure>` genest binnen `<p>` (browser forceert sluiting van `<p>`) | P0 | |
| 243 | Geen `<div>` of andere block-level elementen binnen `<p>` | P0 | |
| 244 | Geen `<strong>` of `<b>` als pseudo-heading — gebruik echte heading-tags | P1 | |
| 245 | Geen kale tekstnodes direct in `<section>` zonder `<p>`-wrapper | P2 | |
| 246 | Geen lege elementen (`<div></div>`, `<p></p>`, `<span></span>`) | P2 | |
| 247 | HTML valideert zonder fouten (W3C Validator) | P1 | |
| 248 | Geen HTML-comments in productie-code | P3 | |
| 249 | Maximale DOM nestdiepte <32 niveaus | P2 | |
| 250 | Maximaal 60 children per node — vermijd extreem platte structuren | P3 | |

---

## XXXII. HEADING-INTEGRITEIT (HTML)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 251 | Precies één `<h1>` tag in de HTML | P0 | |
| 252 | Heading-hiërarchie niet gebroken in HTML (geen `<h2>` → `<h4>` sprong) | P0 | |
| 253 | Alle headings zijn echte heading-tags, niet gestylede `<div>` of `<p>` | P1 | |
| 254 | Alle heading-tags hebben id-attributen | P2 | |

---

## XXXIII. AFBEELDINGEN

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 255 | Echte `<img>` elementen met werkende src (geen placeholders zonder afbeelding) | P1 | |
| 256 | Alt-tekst aanwezig op alle afbeeldingen | P0 | |
| 257 | Alt-tekst gevarieerd per afbeelding — breidt topicaliteit uit voorbij H1 | P2 | |
| 258 | Alt-tekst beschrijft de inhoud van de afbeelding | P1 | |
| 259 | Geen identieke alt-tekst op meerdere afbeeldingen | P2 | |
| 260 | Bestandsnamen kort en beschrijvend: max 3 woorden, geen stopwoorden | P3 | |
| 261 | Expliciete width/height attributen op alle afbeeldingen (CLS-preventie) | P1 | |
| 262 | Afbeeldingen in modern formaat (WebP of AVIF) | P2 | |
| 263 | EXIF/IPTC metadata: eigenaar, licentie, beschrijving | P4 | |
| 264 | Afbeeldingen zijn uniek — geen duplicate stock photos van andere sites | P2 | |
| 265 | Afbeeldingen bevatten branding waar passend | P3 | |
| 266 | Informatieve afbeeldingen: infographics bevatten data/definities, niet alleen decoratie | P3 | |
| 267 | Afbeeldings-URL geoptimaliseerd: kort, max 3 woorden, geen stopwoorden | P3 | |

---

# DEEL J: META & STRUCTURED DATA

## XXXIV. META-TAGS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 268 | `<title>` bevat target keyword + onderscheidende waarde, uniek per pagina | P0 | |
| 269 | Title Query Coverage: % van ranking queries in Title Tag zo hoog mogelijk | P2 | |
| 270 | `<meta name="description">` uniek, bevat Central Entity + CTA/waardepropositie | P1 | |
| 271 | `<link rel="canonical">` aanwezig — zelf-referencing of correct doelwit | P0 | |
| 272 | Geen canonical chains (A → B → C) — direct naar het eindpunt | P1 | |
| 273 | Canonical consistent met indexeringssignalen (geen canonical + noindex conflict) | P0 | |
| 274 | Open Graph tags: og:title, og:description, og:image, og:url, og:type | P2 | |
| 275 | Twitter Card tags aanwezig | P3 | |
| 276 | `<html lang="xx">` correct ingesteld voor de taal van de content | P1 | |
| 277 | Hreflang tags bij meertalige content | P1 | |
| 278 | Viewport meta tag aanwezig (`<meta name="viewport">`) | P1 | |

---

## XXXV. STRUCTURED DATA (JSON-LD)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 279 | Schema.org type passend bij content (Article, LocalBusiness, Product, FAQ, HowTo, Service, etc.) | P1 | |
| 280 | Alle relevante EAV-informatie opgenomen in schema properties | P2 | |
| 281 | Author-informatie in schema: name, url, sameAs | P2 | |
| 282 | datePublished en dateModified aanwezig en accuraat | P2 | |
| 283 | Afbeelding-URL in schema komt overeen met zichtbare LCP-afbeelding | P2 | |
| 284 | Schema valideert zonder fouten (Google Rich Results Test) | P1 | |
| 285 | Schema valideert zonder waarschuwingen | P2 | |
| 286 | FAQ-schema bij Q&A-secties (indien aanwezig) | P2 | |
| 287 | HowTo-schema bij stapsgewijze instructies (indien aanwezig) | P2 | |
| 288 | Bij dienstverleners: LocalBusiness of Service schema met serviceArea, areaServed | P1 | |
| 289 | Bij reviews: Review schema met structured data | P2 | |
| 290 | Bij awards/certificeringen: schema markup + zichtbare weergave | P3 | |
| 291 | Last-Modified HTTP header komt overeen met dateModified in schema | P3 | |

---

# DEEL K: COST OF RETRIEVAL — TECHNISCHE EFFICIËNTIE

## XXXVI. DOM & CODE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 292 | Totaal DOM-nodes <1.500 | P1 | |
| 293 | Maximale DOM nestdiepte <32 niveaus | P2 | |
| 294 | Maximaal 60 children per enkel DOM-element | P3 | |
| 295 | HTML-bestandsgrootte <100KB | P2 | |
| 296 | Text-to-code ratio >50% | P2 | |
| 297 | Geen ongebruikte CSS (>50% unused = tree shaking nodig) | P2 | |
| 298 | Geen ongebruikte JavaScript (dead code verwijderen of lazy loaden) | P2 | |
| 299 | Geen inline styles die als CSS geconsolideerd kunnen worden | P3 | |
| 300 | HTML geminificeerd in productie | P3 | |
| 301 | Inline JavaScript verplaatst naar externe bestanden | P3 | |
| 302 | CSS geëxternaliseerd (niet inline in HTML) | P3 | |
| 303 | CSS classes geconsolideerd (geen redundante class-definities) | P4 | |

---

## XXXVII. SERVER & PERFORMANCE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 304 | Server response time (TTFB) <100ms | P1 | |
| 305 | DNS lookup <50ms | P2 | |
| 306 | SSL/TLS handshake <100ms | P2 | |
| 307 | Server processing (backend) <50ms | P2 | |
| 308 | Gzip of Brotli compressie actief voor text resources | P1 | |
| 309 | Brotli geprefereerd boven Gzip (betere compressie) | P3 | |
| 310 | CDN actief voor global distribution | P2 | |

---

## XXXVIII. CACHING

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 311 | HTML (dynamisch): korte cache of no-cache (`max-age=0`) | P2 | |
| 312 | CSS/JS (versioned): lange cache (`max-age=31536000`, 1 jaar) | P2 | |
| 313 | Afbeeldingen (statisch): lange cache (`max-age=31536000`, 1 jaar) | P2 | |
| 314 | Fonts: lange cache (`max-age=31536000`, 1 jaar) | P3 | |

---

## XXXIX. HTTP HEADERS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 315 | `Link: rel="canonical"` HTTP header voor non-HTML resources (PDFs, afbeeldingen) | P3 | |
| 316 | `Vary: User-Agent` bij dynamic serving (als verschillende content per device) | P3 | |
| 317 | `Last-Modified` header aanwezig en accuraat | P3 | |
| 318 | HSTS header actief (force HTTPS, vermindert redirect hops) | P2 | |
| 319 | `X-Robots-Tag` correct bij programmatische indexeringscontrole | P2 | |

---

## XL. CORE WEB VITALS

### A. LCP (Largest Contentful Paint)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 320 | LCP <2,5 seconden | P1 | |
| 321 | Hero images geoptimaliseerd (WebP/AVIF) | P2 | |
| 322 | Kritieke resources ge-preloaded | P2 | |
| 323 | Render-blocking JS/CSS verwijderd of uitgesteld | P2 | |

### B. FID/INP (Interaction Delay)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 324 | FID/INP <100ms | P1 | |
| 325 | Lange JavaScript-taken opgesplitst | P2 | |
| 326 | Niet-kritieke JS uitgesteld (defer/async) | P2 | |
| 327 | Main thread werk geminimaliseerd | P2 | |

### C. CLS (Cumulative Layout Shift)

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 328 | CLS <0,1 | P1 | |
| 329 | Expliciete dimensies voor alle images | P1 | |
| 330 | Expliciete dimensies voor video/iframe | P2 | |
| 331 | Ruimte gereserveerd voor advertenties | P2 | |
| 332 | Geen dynamisch ingevoegde content boven bestaande content | P2 | |
| 333 | Transform-animaties gebruikt (geen layout-animaties) | P3 | |

---

## XLI. HTTP REQUESTS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 334 | HTTP-requests per pagina <50 | P2 | |
| 335 | Afbeeldingen lazy-loaded waar niet boven de fold | P2 | |

---

# DEEL L: URL-STRUCTUUR & ARCHITECTUUR

## XLII. URL-REGELS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 336 | URL kort en beschrijvend (<75 tekens) | P2 | |
| 337 | URL hiërarchisch (/categorie/subcategorie/pagina) | P2 | |
| 338 | Alleen kleine letters | P1 | |
| 339 | Alleen koppeltekens als woordscheider (geen underscores) | P2 | |
| 340 | Geen sessie-ID's in URL | P1 | |
| 341 | Geen onnodige parameters of speciale tekens | P2 | |
| 342 | Trailing slash-beleid consistent over hele site | P2 | |
| 343 | Geen redundante woorden (/duitsland/duitsland-visum/ → /duitsland/visum/) | P3 | |
| 344 | URL bevat target keyword (maar niet keyword-stuffed) | P2 | |
| 345 | URL-structuur weerspiegelt de content-hiërarchie | P2 | |

---

## XLIII. CANONICALISATIE

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 346 | Self-referencing canonical op alle indexeerbare pagina's | P0 | |
| 347 | Canonical wijst niet naar een niet-bestaande pagina | P0 | |
| 348 | Geen canonical chains (A → B → C) — direct naar eindpunt | P1 | |
| 349 | Canonical consistent met andere signalen (geen canonical + noindex conflict) | P0 | |
| 350 | Bij cross-domain canonical: intentie geverifieerd | P2 | |
| 351 | Canonical op WWW vs non-WWW consistent | P1 | |
| 352 | Canonical op HTTP vs HTTPS consistent (altijd HTTPS) | P1 | |

---

## XLIV. CRAWL EFFICIËNTIE

### A. Log File Metrics

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 353 | HTML hit ratio >80% (meeste crawl-hits op content, niet op assets) | P2 | |
| 354 | Bot response time <100ms | P1 | |
| 355 | Error rate 0% (geen 4xx/5xx errors voor Googlebot) | P1 | |
| 356 | Crawl depth <4 clicks voor belangrijke content | P2 | |
| 357 | Crawl frequency stabiel of stijgend (geen dalende trend) | P3 | |

### B. Status Codes

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 358 | Geen 5xx server errors | P0 | |
| 359 | Geen actieve 404's voor pagina's die in sitemap staan | P1 | |
| 360 | 410 (Gone) gebruikt voor permanent verwijderde pagina's (niet 404) | P2 | |
| 361 | 301 gebruikt voor permanente redirects (niet 302) | P1 | |
| 362 | Geen redirect chains langer dan 1 hop (A → B, niet A → B → C → D) | P1 | |
| 363 | Geen redirect loops | P0 | |
| 364 | Interne links bijgewerkt naar finale URL's (niet via redirect) | P2 | |

### C. Crawl Budget

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 365 | Geen filter-URL-explosie (miljoenen parameter-URL's bij faceted navigation) | P1 | |
| 366 | Dunne content-pagina's noindex of geconsolideerd | P2 | |
| 367 | Duplicate content vermeden via canonical tags | P1 | |

---

## XLV. INDEXATIE

### A. Google Search Console Status

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 368 | Pagina niet "Crawled - currently not indexed" in GSC | P1 | |
| 369 | Pagina niet "Discovered - currently not indexed" in GSC | P1 | |
| 370 | Indexatie-ratio >90% van ingediende pagina's | P2 | |

### B. Robots & Sitemap

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 371 | Pagina niet geblokkeerd door robots.txt (als indexering gewenst is) | P0 | |
| 372 | Pagina niet noindex (als indexering gewenst is) | P0 | |
| 373 | Geen conflict tussen robots.txt blokkade en sitemap-inclusie | P0 | |
| 374 | Pagina opgenomen in XML sitemap | P1 | |
| 375 | XML sitemap bevat alleen indexeerbare pagina's (geen noindex, 404, geblokkeerde pagina's) | P1 | |
| 376 | XML sitemap bijgewerkt met actuele content | P2 | |
| 377 | XML sitemap <50MB en <50.000 URL's per bestand | P2 | |
| 378 | XML sitemap ingediend bij Search Console | P1 | |
| 379 | lastmod in sitemap komt overeen met daadwerkelijke wijzigingsdatum | P3 | |

---

# DEEL M: CROSS-PAGE & NETWERK CONSISTENTIE

## XLVI. WEBSITE-BREDE REGELS

### A. Central Entity Site-breed

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 380 | Central Entity verschijnt in boilerplate (header/footer/nav) | P1 | |
| 381 | Central Entity vormt site-brede N-grams | P2 | |
| 382 | Eén Central Entity per website (niet per pagina) | P1 | |

### B. Factconsistentie Over Pagina's

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 383 | Dezelfde entiteit heeft overal dezelfde attribuutwaarden | P0 | |
| 384 | Geen conflicterende definities van dezelfde term op verschillende pagina's | P0 | |
| 385 | Naamgeving consistent: als merknaam op ene pagina "MVGM" is, niet "M.V.G.M." op andere pagina | P0 | |

### C. Template Consistentie

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 386 | Zelfde type pagina's gebruiken dezelfde template/heading-structuur | P2 | |
| 387 | Alle productpagina's hebben dezelfde H2-volgorde | P2 | |
| 388 | Alle dienstpagina's hebben dezelfde structuur | P2 | |

### D. Netwerk Flow

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 389 | Core Section gepubliceerd vóór Author Section (historische data-prioriteit) | P2 | |
| 390 | Linkrichting volgt prioriteit: AS → CS dominant | P1 | |
| 391 | Alle segmenten verbonden terug naar het hoofdonderwerp (contextual loop closure) | P2 | |
| 392 | Geen orphan pages (alle pagina's bereikbaar via links) | P1 | |
| 393 | Geen dead-end pages (alle pagina's linken naar minstens 1 andere) | P2 | |
| 394 | Canonieke queries toegewezen aan één enkele pagina | P1 | |

### E. Hub-Spoke Architectuur

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 395 | Hub-Spoke ratio ~1:7 per cluster | P3 | |
| 396 | Hub-pagina behandelt het parent-topic uitgebreid (niet slechts navigatie/index) | P2 | |
| 397 | Spokes breiden elk één major attribuut/subonderwerp uit (dupliceren geen hub-content) | P2 | |
| 398 | Spokes linken omhoog naar hub, hub linkt omlaag naar spokes | P2 | |
| 399 | Geen random cross-linking tussen onverbonden spokes zonder hub-connectie | P3 | |

---

# DEEL N: WEBSITE-TYPE SPECIFIEKE REGELS

## XLVII. E-COMMERCE SPECIFIEK

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 400 | Productspecificaties in tabellen | P1 | |
| 401 | Meerdere review-types: merk-review, expert-review, klant-review | P2 | |
| 402 | Transactie-elementen boven de fold | P1 | |
| 403 | Categoriepagina's hebben prose-introductie (niet alleen productlijst) | P2 | |
| 404 | Filter-combinaties gelimiteerd (geen miljoenen facet-URL's) | P1 | |
| 405 | Producten linken naar materiaal/merk-pagina's (ontologie-gebaseerd) | P2 | |
| 406 | Koopgidsen linken naar producten | P2 | |
| 407 | LIFT Model: Buy → Compare → Reviews → Statistics volgorde | P2 | |
| 408 | Social proof: merk-review + expert-review + klant-review | P2 | |

---

## XLVIII. SAAS SPECIFIEK

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 409 | Product verbonden met gebruikers-zoekgedrag (user needs mapping) | P1 | |
| 410 | Features gelinkt aan use cases | P1 | |
| 411 | Homepage ontvangt de meeste interne links | P2 | |
| 412 | CSI-predicaten in ankerteksten (niet "klik hier") | P1 | |
| 413 | Concurrent-attributen geanalyseerd en gaps gevuld | P2 | |
| 414 | Templates flexibel per feature-type | P3 | |
| 415 | Free trial/demo prominent geplaatst | P2 | |

---

## XLIX. B2B DIENSTVERLENER SPECIFIEK

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 416 | Expert-auteurs met credentials | P1 | |
| 417 | Origineel onderzoek/statistieken aanwezig | P2 | |
| 418 | Meerdere perspectieven behandeld (gebruiker, expert, toezichthouder) | P2 | |
| 419 | Methodologie gedocumenteerd | P2 | |
| 420 | Licenties/awards weergegeven met schema markup | P2 | |
| 421 | Case studies met meetbare resultaten | P2 | |
| 422 | Servicepagina's linken naar expertise-content | P2 | |
| 423 | Wetenschappelijke stijl: objectieve taal, citaties | P3 | |
| 424 | Conditionele taal: "Afhankelijk van...", "In gevallen waar..." | P3 | |

---

## L. BLOG/INFORMATIE SPECIFIEK

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 425 | Alle pagina's hebben query-vraag (geen pagina's zonder zoekvraag) | P1 | |
| 426 | Author Section linkt naar Core Section | P1 | |
| 427 | Geen orphan pages | P1 | |
| 428 | Unieke informatie aanwezig die concurrenten niet bieden (Information Gain) | P2 | |
| 429 | Bridge topics verbinden clusters | P2 | |
| 430 | Consistente templates per contenttype (listicle, how-to, definitie, vergelijking) | P2 | |
| 431 | Auteur-vector onderscheidend (eigen stijl, eigen N-grams) | P3 | |
| 432 | Unieke N-grams die specifiek voor deze site zijn | P3 | |

---

# DEEL O: MONITORING & ONGOING

## LI. MONITORING REGELS

| # | Regel | Prio | ✅/❌ |
|---|-------|------|-------|
| 433 | Wekelijkse log file analyse gepland | P3 | |
| 434 | Maandelijkse GSC review gepland | P2 | |
| 435 | Kwartaal volledige audit gepland | P3 | |
| 436 | Indexatie-trends getracked (stijgend, stabiel, dalend) | P3 | |
| 437 | Publicatiemomentum voldoende — regelmatige updates, niet sporadisch | P3 | |

---

# SCORINGSMODEL

## Puntenverdeling per Deel

| Deel | Secties | Regels | Gewicht |
|------|---------|--------|---------|
| A: Strategische Fundering | I-II | 1-32 | 10% |
| B: EAV Systeem | III-IV | 33-56 | 15% |
| C: Modaliteit & Predicaten | V | 57-72 | 5% |
| D: Micro-Semantiek | VI-VIII | 73-93 | 8% |
| E: Informatiedichtheid | IX-X | 94-112 | 8% |
| F: Contextual Flow | XI-XVI | 113-161 | 15% |
| G: Intern Linken | XVII-XXII | 162-194 | 10% |
| H: Semantic Distance | XXIII | 195-203 | 3% |
| I: Content Formaat | XXIV-XXIX | 204-232 | 5% |
| J: HTML & Techniek | XXX-XXXIII | 233-267 | 7% |
| K: Meta & Structured Data | XXXIV-XXXV | 268-291 | 5% |
| L: Cost of Retrieval | XXXVI-XLI | 292-335 | 4% |
| M: URL & Architectuur | XLII-XLV | 336-379 | 3% |
| N: Cross-Page Consistentie | XLVI | 380-399 | 2% |

**Website-type specifieke regels (XLVII-L)** scoren als bonus/malus op het totaal — pas de relevante set toe.

## Score Berekening

Per regel:
- ✅ = 1 punt
- ❌ = 0 punten
- ➖ = niet meegeteld

**Score per Deel** = (behaalde punten / van toepassing zijnde regels) × gewicht × 100

**Totaalscore** = som van alle gewogen deelscores

## Interpretatie

| Score | Beoordeling | Actie |
|-------|-------------|-------|
| 90-100 | Excellent | Publiceren |
| 85-89 | Goed | Minor fixes, dan publiceren |
| 70-84 | Verbetering nodig | Significante revisie vereist |
| <70 | Grote revisie | Niet publiceren vóór herziening |

## Prioriteitsmatrix

| Prioriteit | Actie | Typische voorbeelden |
|------------|-------|----------------------|
| **P0 — Blocker** | Publicatie blokkeren | Ontbrekende canonical, ongeldige HTML-nesting (`<figure>` in `<p>`), gebroken heading-hiërarchie, inconsistente merknaam, conflicterende feiten, 5xx errors, robots.txt conflict |
| **P1 — Kritiek** | Fixen vóór publicatie | Ontbrekende structured data, geen interne links in main content, afgekapte centerpiece text, duplicate H1/H2, ontbrekende alt-tekst, ontbrekende meta-tags, ambigue voornaamwoorden, vage waarden, subordinate text beantwoordt heading niet |
| **P2 — Hoog** | Fixen binnen 1 week | Lage informatiedichtheid, zwakke discourse integration, ontbrekende context qualifiers, ontbrekende bridges, visuele hiërarchie suboptimaal, ontbrekende OG tags, ongebruikte CSS/JS, caching niet geconfigureerd |
| **P3 — Medium** | Fixen binnen 1 maand | Frame-semantiek incompleet, lexicale hiërarchie in ankerteksten, EXIF-data, tabel-captions, max children per node, hub-spoke ratio |
| **P4 — Laag** | Volgende sprint | Expressie-identiteit verfijning, CSS class consolidatie, DNS optimalisatie |

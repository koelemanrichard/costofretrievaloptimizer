import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-4 px-2 hover:bg-gray-700/50"
                aria-expanded={isOpen}
            >
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <svg className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000vh] ease-in' : 'max-h-0 ease-out'}`}>
                <div className="p-4 bg-gray-900/50 text-gray-300 space-y-4 prose prose-invert prose-sm max-w-none">
                    {children}
                </div>
            </div>
        </div>
    );
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Application Guide & Documentation</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>
        
        <div className="p-2 sm:p-6 overflow-y-auto">
            <AccordionItem title="User Guide: Getting Started">
                <h4>What is a Topical Map?</h4>
                <p><strong>For All Users:</strong> A topical map is a blueprint for your website's content. Instead of chasing random keywords, it organizes content around main subjects ("topics") to prove to search engines that you are an expert in your field. This expertise is called "Topical Authority." A strong topical map helps you rank higher, attract more relevant traffic, and become a go-to resource.</p>

                <h4>The Two Project Types</h4>
                <ul>
                    <li>
                        <strong>Create New Topical Map:</strong> Choose this if you are starting from scratch (a new website, a new product line, or a new service). A step-by-step wizard will guide you through defining your core business strategy, and the AI will generate a complete content plan based on your unique inputs.
                    </li>
                    <li>
                        <strong>Analyze Existing Website:</strong> Choose this to audit and improve a website that is already live. The tool will crawl your site, use AI to figure out what your main topic is right now, and build a map of your current content. It then compares this to an "ideal" map and gives you a prioritized action plan, showing you exactly what content to add, improve, or remove.
                    </li>
                </ul>
            </AccordionItem>

            <AccordionItem title="User Guide: The 'New Map' Wizard">
                <h4>Step 1: Business Information Form</h4>
                <p><strong>What it does:</strong> This form collects the essential details about your business. The AI uses this information as the core context for every decision it makes. High-quality inputs here lead to a high-quality topical map.</p>
                <p><strong>Key Fields:</strong></p>
                <ul>
                    <li><strong>Main Topic / Seed Keyword:</strong> The most important term for your business (e.g., "Contract Management Software"). This is the starting point for the entire map.</li>
                    <li><strong>Value Proposition:</strong> Explain what your business does and what makes it unique. Be detailed. This heavily influences how the AI understands your brand's position in the market.</li>
                    <li><strong>AI Provider & API Keys:</strong> Select your preferred AI model and enter the corresponding API key. These are required for the AI to function.</li>
                </ul>

                <h4>Steps 2-4: The Pillar Definition & EAV Wizards</h4>
                <p><strong>What it does:</strong> This multi-step process is the strategic heart of the map generation. It establishes the "SEO Pillars" — the unchanging foundation of your content strategy.</p>
                <ul>
                    <li><strong>Central Entity:</strong> The AI suggests core concepts for your business. You select the one that best represents your main offering.</li>
                    <li><strong>Source Context:</strong> The AI suggests statements that explain *why* your business deserves to rank. You select the one that best captures your unique value.</li>
                    <li><strong>Semantic Triples (E-A-Vs):</strong> The AI extracts the most fundamental "facts" about your Central Entity. These facts (e.g., `Contract Software - HAS_PROPERTY - Automation`) become the semantic DNA of your topical map. You can review, edit, and add to this list to ensure it's perfectly accurate.</li>
                </ul>
                 <p><strong>Action Buttons:</strong></p>
                <ul>
                    <li><strong>Regenerate:</strong> If you don't like the AI's suggestions, click this to get a new set of options.</li>
                    <li><strong>Expand with AI:</strong> In the EAV step, this asks the AI to find more related facts based on the current list, helping you build a more comprehensive foundation.</li>
                    <li><strong>Finalize & Proceed:</strong> Locks in your choices for that step and moves to the next.</li>
                </ul>
            </AccordionItem>

            <AccordionItem title="User Guide: The Topical Map Dashboard">
                <h4>The Action Blocks (Top Section)</h4>
                <p>This is your command center, organized into a logical workflow.</p>
                <ul>
                    <li><strong>Step 1: Analyze Domain & GSC:</strong>
                        <ul>
                            <li><strong>Analyze Knowledge Domain:</strong> The most important first step. The AI reads all your topics and builds a "knowledge graph" (a mind map of your expertise). This unlocks powerful features like smart topic expansion.</li>
                            <li><strong>Upload GSC CSV:</strong> After analyzing the domain, you can upload a keyword export from Google Search Console. The AI will analyze this data to find "opportunity keywords" — terms you get impressions for but don't rank well for — and list them for you to add to your map.</li>
                        </ul>
                    </li>
                     <li><strong>Step 2: Refine & Expand Map:</strong>
                        <ul>
                            <li><strong>Refine Map with AI:</strong> Uses the knowledge graph to find gaps in your map and suggests new topics to fill them.</li>
                            <li><strong>Add Topics Manually:</strong> Use the "Topic Management" section to add your own core or supporting topics. The "AI Placed" option is highly recommended, as it lets the AI decide the best place for your new topic in the hierarchy.</li>
                        </ul>
                    </li>
                     <li><strong>Step 3: Prepare & Export:</strong>
                        <ul>
                            <li><strong>Generate All Briefs:</strong> Kicks off a batch process to create a detailed content brief for every single topic in your map that doesn't already have one.</li>
                            <li><strong>Export Full Package:</strong> Once all briefs are generated, this button becomes active. It downloads a ZIP file containing your topical map, all content briefs in Markdown format, your knowledge graph data, and more.</li>
                        </ul>
                    </li>
                </ul>
                
                <h4>Advanced Analysis & Tools</h4>
                <p>This section contains powerful tools for auditing and improving your map.</p>
                 <ul>
                    <li><strong>Validate Map Structure:</strong> The AI audits your map's structure and completeness, giving it a quality score and providing actionable feedback.</li>
                    <li><strong>Find Merge Opportunities:</strong> Scans for topics that are too similar and could be combined into a single, stronger article.</li>
                    <li><strong>Analyze Semantic Relationships:</strong> Calculates the "semantic distance" between topics to help you understand how they relate and prioritize internal linking.</li>
                    <li><strong>And more...</strong> Each tool is designed to give you deeper insight into your content strategy.</li>
                </ul>

                <h4>Your Topics (The Map)</h4>
                <p>This is the visual representation of your content plan.</p>
                <ul>
                    <li><strong>Core Topics (Green):</strong> Your main "pillar pages." These are the most important pages on your site.</li>
                    <li><strong>Outer Topics (Purple):</strong> Supporting "cluster pages" that link up to a core topic and build its authority.</li>
                    <li><strong>Actions on Topics:</strong>
                        <ul>
                            <li>📄 <strong>(Generate Brief):</strong> Click this icon on any topic to generate its content brief. It turns into a green eye icon ✅ once the brief is ready.</li>
                            <li>✨ <strong>(Expand):</strong> On core topics, click this to have the AI suggest new outer topics that are relevant to it.</li>
                            <li>🗑️ <strong>(Delete):</strong> Removes the topic from the map.</li>
                        </ul>
                    </li>
                     <li><strong>Drag & Drop:</strong> You can drag an outer topic and drop it onto a different core topic to change its parent and automatically update its URL slug.</li>
                </ul>
            </AccordionItem>
            
             <AccordionItem title="Expert Guide: Methodologies & Calculations">
                <h4>SEO Pillar Generation & Framework Alignment</h4>
                <p>The wizard constrains the AI to ensure a strategically sound foundation based on your business inputs, directly aligning with Koray Tuğberk GÜBÜR's framework.</p>
                <ul>
                    <li>
                        <strong>Central Entity Discovery:</strong> The AI is prompted to act as an expert SEO strategist and score 3-5 candidates based on framework criteria: semantic richness (potential for related concepts), business alignment (match with value prop), and implicit search volume. This entity becomes the gravitational center of your content universe.
                    </li>
                     <li>
                        <strong>Source Context:</strong> This defines your unique "angle" or "brand voice." It's the strategic filter that differentiates your content. A strong Source Context (e.g., "A no-nonsense cybersecurity partner for municipalities") provides a clear E-E-A-T signal and guides the AI to generate content that isn't generic.
                    </li>
                    <li>
                        <strong>EAV Discovery & Semantic Modeling:</strong> Entity-Attribute-Value triples are the core of semantic SEO. They are machine-readable facts that form the semantic skeleton of your content.
                        <p>The AI is given a strict prompt to extract these facts, constrained by a specific list of `PredicateType`s (semantic relationships like `HAS_PROPERTY`, `USED_FOR`, `IS_A`). This ensures the output is a structured, coherent knowledge graph foundation, not just a list of keywords.</p>
                        <pre><code>
{`System: You are an expert SEO strategist specializing in semantic content modeling...
User:
- Central Entity: {your entity}
- Source Context: {your context}
Instructions:
1. Generate 15-20 fundamental Semantic Triples about the Central Entity.
2. The 'predicate' should be one of: IS_A, HAS_PROPERTY, HAS_PART...`}
                        </code></pre>
                    </li>
                </ul>
                
                <h4>Advanced Analysis Deep Dive</h4>
                <ul>
                    <li><strong>Semantic Relationship Analysis:</strong> This is a hybrid analysis to create a robust internal linking plan.
                        <ol>
                            <li><strong>Quantitative Analysis:</strong> First, a local taxonomic distance is calculated using a simulated WordNet graph built from your topic hierarchy. The core of this is the **Wu-Palmer Similarity formula**: <br/> <code>Similarity = (2 * Depth(LCS)) / (Depth(Concept1) + Depth(Concept2))</code> <br/> The intuition is that similarity is a function of shared information. The "Lowest Common Subsumer" (LCS) is the nearest shared parent in the topic hierarchy; a deeper LCS means the concepts are more specifically related and thus more similar.</li>
                            <li><strong>Qualitative Analysis:</strong> The quantitative scores and topic pairs are then sent to the AI, which provides a qualitative label (SIBLING, RELATED) and a concrete `internalLinkingPriority`. This combines mathematical relatedness with contextual understanding.</li>
                        </ol>
                    </li>
                    <li><strong>Contextual Coverage Analysis:</strong> The AI is prompted to evaluate your topic list against the four crucial contexts from Koray's framework:
                        <ul>
                            <li><strong>Macro Context:</strong> The main, overarching topic (e.g., "Cybersecurity").</li>
                            <li><strong>Micro Context:</strong> Specific sub-topics and user questions (e.g., "How to prevent phishing attacks").</li>
                            <li><strong>Temporal Context:</strong> Time-sensitive aspects (e.g., "Cybersecurity trends 2024", "Log4j vulnerability analysis").</li>
                            <li><strong>Intentional Context:</strong> Different user intents (Informational "what is MDR", Commercial "best SOC services", Transactional "get a security quote").</li>
                        </ul>
                        <p>The final score reflects how holistically your map covers the topic from all relevant angles.</p>
                    </li>
                    <li>
                        <strong>Information Gain Calculation (based on Google Patent US10229166B1):</strong> This scores how much new, valuable information a brief provides.
                        <ul>
                            <li><strong>Unique Facts Density:</strong> A direct measure against content regurgitation. It's the percentage of facts (hashed EAVs/takeaways) in the brief that are unique across your entire content library.</li>
                            <li><strong>Incremental Value Score:</strong> Measures if a fact provides *contextual* novelty by bridging previously unconnected concepts in your knowledge graph or adding new, deeper attributes to a known entity.</li>
                            <li><strong>Attribute Completeness:</strong> This is a systematic check. The AI is prompted for the *expected* attributes of an entity type (e.g., 'Software' should have 'features', 'pricing'). The score is the percentage of these expected attributes found as predicates in the brief's EAV list. This ensures encyclopedic completeness.</li>
                            <li><strong>Novel Entity Introduction:</strong> Rewards content that introduces new, relevant entities, thereby expanding your site's knowledge graph.</li>
                        </ul>
                    </li>
                </ul>

                <h4>Content Brief & Audit Framework Rules</h4>
                <p>The AI is instructed to be a strict auditor against rules derived from the Holistic SEO framework. This ensures every piece of content is structured for maximum semantic clarity and user satisfaction.</p>
                <ul className="list-disc list-inside">
                    <li><strong>Do Not Delay the Answer:</strong> This is a critical rule for winning **Featured Snippets** and satisfying immediate user intent, reducing pogo-sticking.</li>
                    <li><strong>Linguistic Modality (Certainty):</strong> This directly signals **E-E-A-T**. Using definitive, active language ("X increases Y") instead of uncertain language ("X may help increase Y") demonstrates expertise and builds trust.</li>
                    <li><strong>PoST Consistency in Lists:</strong> Part-of-Speech consistency (e.g., all list items starting with a verb) improves machine readability, making it easier for search engines to parse the content into structured data formats like featured snippets.</li>
                    <li><strong>Bold the Answer, Not the Keyword:</strong> This is a modern SEO practice that shifts focus from keyword density to user value. Bolding the key takeaway helps users scan and signals the most important piece of information in a section to search engines, aiding in passage ranking.</li>
                    <li><strong>Give Examples After Plural Noun:</strong> This rule, known as "Quality Instances," adds semantic richness and demonstrates true expertise. Stating "cybersecurity tools like firewalls and antivirus software" is far more authoritative than just "cybersecurity tools."</li>
                </ul>
            </AccordionItem>

            <AccordionItem title="Developer's Guide: Architecture & File Breakdown">
                 <h4>Frontend Architecture</h4>
                 <p>The application is a single-page application built with React, TypeScript, and TailwindCSS. Its architecture is designed for modularity and clear data flow.</p>
                 <ul>
                     <li><strong><code>index.tsx</code>:</strong> The application's entry point. It sets up the React root and wraps the main `App` component with the `StateProvider`.</li>
                     <li><strong><code>App.tsx</code>:</strong> The main component that acts as a router and orchestrator. It holds the logic for handling user actions, calling services, and rendering the correct component based on the current `AppStep` in the global state. All modal visibility states are managed here.</li>
                     <li><strong><code>state/appState.ts</code>:</strong> The heart of the frontend state management. It uses React's Context API and a `useReducer` hook.
                        <ul>
                            <li><strong>`AppState` interface:</strong> Defines the entire shape of the application's global state.</li>
                            <li><strong>`initialState`:</strong> The default state when the app loads.</li>
                            <li><strong>`AppAction` type:</strong> A discriminated union of all possible actions that can be dispatched to modify the state (e.g., `SET_STEP`, `ADD_BRIEF`).</li>
                            <li><strong>`appReducer`:</strong> A pure function that takes the current state and an action, and returns the new state. This is the only place where state is mutated, ensuring predictability.</li>
                        </ul>
                     </li>
                     <li><strong><code>services/aiService.ts</code>:</strong> A critical abstraction layer. It acts as a dispatcher that routes all AI-related logic to the correct underlying service based on the user's selection (`geminiService.ts`, `openAiService.ts`, etc.). This keeps the UI components clean and unaware of the specific AI provider being used. It also handles logging and caching for AI calls.</li>
                     <li><strong><code>components/</code>:</strong> Contains all UI components.
                        <ul>
                            <li><strong>Wizard Components</strong> (e.g., `PillarDefinitionWizard.tsx`): Guide the user through the initial setup for a new map.</li>
                            <li><strong>Display Components</strong> (e.g., `TopicalMapDisplay.tsx`, `ProjectDashboard.tsx`): The main interfaces for interacting with the generated map or audit results.</li>
                            <li><strong>Modal Components</strong> (e.g., `ContentBriefModal.tsx`, `KnowledgeDomainModal.tsx`): Handle focused tasks and display detailed information in overlays.</li>
                            <li><strong>UI Primitives</strong> (<code>components/ui/</code>): Reusable, basic components like `Button.tsx`, `Card.tsx`, and `Input.tsx`.</li>
                        </ul>
                     </li>
                 </ul>

                <h4>Backend Architecture (Supabase Edge Functions)</h4>
                <p>The "Analyze Existing Website" feature is powered by a serverless pipeline of Deno Edge Functions. This pipeline is designed to be robust, scalable, and fully automated.</p>
                <ol>
                   <li><strong><code>start-website-analysis</code>:</strong>
                        <ul>
                            <li><strong>Purpose:</strong> The main entry point for the audit workflow.</li>
                            <li><strong>Trigger:</strong> Called by the frontend when the user submits the "Analyze Existing Website" form.</li>
                            <li><strong>Core Logic:</strong> Creates or updates a `projects` record in the database. Sets the initial status to "queued".</li>
                            <li><strong>Output:</strong> Returns the `projectId` to the frontend and asynchronously invokes the `sitemap-discovery` function.</li>
                        </ul>
                    </li>
                    <li><strong><code>sitemap-discovery</code>:</strong>
                        <ul>
                            <li><strong>Purpose:</strong> To find all pages on the target website.</li>
                            <li><strong>Trigger:</strong> Invoked by `start-website-analysis`.</li>
                            <li><strong>Core Logic:</strong> Checks `robots.txt` and common paths to find sitemaps. Recursively parses all sitemaps to build a complete list of page URLs. Uses the `sync_discovery_pages` RPC function to efficiently add these URLs to the `discovery.pages` table with a "queued" status.</li>
                            <li><strong>Output:</strong> Updates the project status to "crawling_pages" and invokes the `crawl-worker`.</li>
                        </ul>
                    </li>
                    <li><strong><code>crawl-worker</code>:</strong>
                        <ul>
                            <li><strong>Purpose:</strong> To fetch the HTML content of every discovered page.</li>
                            <li><strong>Trigger:</strong> Invoked by `sitemap-discovery`.</li>
                            <li><strong>Core Logic:</strong> Fetches all "queued" pages for the project from the database. It then starts an Apify web scraping actor (`apify/cheerio-scraper`), passing it the list of URLs to crawl. A webhook URL pointing to our `apify-webhook-handler` is included in the Apify run configuration.</li>
                            <li><strong>Output:</strong> Updates the project status with the Apify Run ID. The actual result is handled by the webhook.</li>
                        </ul>
                    </li>
                     <li><strong><code>apify-webhook-handler</code>:</strong>
                        <ul>
                            <li><strong>Purpose:</strong> To listen for a signal from Apify that the crawl is complete.</li>
                            <li><strong>Trigger:</strong> Called by the Apify platform via a webhook when a crawl succeeds or fails.</li>
                            <li><strong>Core Logic:</strong> Receives the event payload from Apify. If the crawl was successful, it finds the corresponding project ID and invokes the `crawl-results-worker`, passing along the Apify dataset ID where the results are stored.</li>
                            <li><strong>Output:</strong> Asynchronously invokes `crawl-results-worker`.</li>
                        </ul>
                    </li>
                    <li><strong><code>crawl-results-worker</code>:</strong>
                        <ul>
                            <li><strong>Purpose:</strong> To process the raw data from the crawl.</li>
                            <li><strong>Trigger:</strong> Invoked by `apify-webhook-handler`.</li>
                            <li><strong>Core Logic:</strong> Fetches the full results dataset (containing HTML for each page) from Apify. It then iterates through each page's result and invokes the `content-analyzer` function to extract rich, structured data from the raw HTML. Finally, it calls the `update_crawled_pages` RPC function to bulk-save this structured data to the database.</li>
                            <li><strong>Output:</strong> Updates project status to "semantic_mapping" and invokes `semantic-mapping-worker`.</li>
                        </ul>
                    </li>
                    <li><strong><code>content-analyzer</code>:</strong>
                        <ul>
                            <li><strong>Purpose:</strong> A specialized utility function to parse and structure raw HTML.</li>
                            <li><strong>Trigger:</strong> Called by `crawl-results-worker` for each crawled page.</li>
                            <li><strong>Core Logic:</strong> Uses a library (`linkedom`) to parse the HTML string into a DOM. It then extracts multiple layers of data: raw text, JSON-LD structured data, semantic HTML tags, internal links, and a basic simulation of entity/topic extraction.</li>
                            <li><strong>Output:</strong> Returns a `content_layers` JSON object.</li>
                        </ul>
                    </li>
                    <li><strong><code>semantic-mapping-worker</code>:</strong>
                        <ul>
                            <li><strong>Purpose:</strong> The first major AI analysis step. It figures out the website's *current* state.</li>
                            <li><strong>Trigger:</strong> Invoked by `crawl-results-worker`.</li>
                            <li><strong>Core Logic:</strong> Fetches all pages with their `content_layers` from the database. It makes multiple calls to the AI to: 1) Determine the site's Central Entity. 2) Reverse-engineer the current topical map by classifying pages into sections (core, outer) and clusters.</li>
                            <li><strong>Output:</strong> Saves the results to the `semantic_analysis` schema and invokes `gap-analysis-worker`.</li>
                        </ul>
                    </li>
                    <li><strong><code>gap-analysis-worker</code>:</strong>
                        <ul>
                            <li><strong>Purpose:</strong> The final AI step. It compares the current state to an ideal state and generates a report.</li>
                            <li><strong>Trigger:</strong> Invoked by `semantic-mapping-worker`.</li>
                            <li><strong>Core Logic:</strong> Makes AI calls to: 1) Generate an "ideal" topical map based on the site's discovered central entity. 2) Perform a gap analysis between the ideal map and the current map. 3) Generate a final report summarizing content gaps, content to keep, and content to improve.</li>
                            <li><strong>Output:</strong> Saves the final `analysis_result` JSON to the `projects` table and sets the project status to "complete".</li>
                        </ul>
                    </li>
                </ol>
                
                <h4>Database Setup</h4>
                <p>
                    The database setup instructions are located in <code>docs/ops/SUPABASE_SETUP_GUIDE.md</code>.
                </p>
            </AccordionItem>
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 text-right">
            <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </Card>
    </div>
  );
};

export default HelpModal;
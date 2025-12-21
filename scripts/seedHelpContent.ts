/**
 * seedHelpContent.ts
 *
 * Comprehensive help documentation for the Holistic SEO Workbench.
 * Run with: npx tsx scripts/seedHelpContent.ts
 *
 * Documentation Philosophy:
 * - Narrative storytelling to explain WHY, not just HOW
 * - Step-by-step workflows with screenshots
 * - Correct AND incorrect examples for each major feature
 * - Clear explanations of core SEO concepts
 */

import { createClient } from '@supabase/supabase-js';

// Get credentials from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Screenshot storage base URL
const SCREENSHOT_BASE = 'https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots';

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =============================================================================
// CATEGORIES
// =============================================================================

const CATEGORIES = [
  { name: 'Getting Started', slug: 'getting-started', icon: '🚀', description: 'Your journey begins here - understand the vision and get set up', sort_order: 0 },
  { name: 'Core Concepts', slug: 'core-concepts', icon: '💡', description: 'The foundational ideas that power semantic SEO', sort_order: 1 },
  { name: 'Project Management', slug: 'project-management', icon: '📁', description: 'Organize your content strategies into projects', sort_order: 2 },
  { name: 'Complete Workflow', slug: 'complete-workflow', icon: '🗺️', description: 'Step-by-step guide to creating your topical map', sort_order: 3 },
  { name: 'Working with Topics', slug: 'working-with-topics', icon: '📝', description: 'Manage, organize, and refine your content topics', sort_order: 4 },
  { name: 'Content Briefs', slug: 'content-briefs', icon: '📋', description: 'Generate comprehensive writing guidelines', sort_order: 5 },
  { name: 'Article Generation', slug: 'article-generation', icon: '✍️', description: 'AI-powered multi-pass content creation', sort_order: 6 },
  { name: 'Analysis Tools', slug: 'analysis-tools', icon: '🔍', description: 'Audit and improve your content strategy', sort_order: 7 },
  { name: 'Site Analysis', slug: 'site-analysis', icon: '🌐', description: 'Crawl and analyze existing websites', sort_order: 8 },
  { name: 'Admin Console', slug: 'admin-console', icon: '👑', description: 'System administration and user management', sort_order: 9 },
  { name: 'Migration Tools', slug: 'migration-tools', icon: '🔄', description: 'Import, export, and migrate your data', sort_order: 10 },
  { name: 'Export & Integration', slug: 'export-integration', icon: '📤', description: 'Export maps and integrate with other tools', sort_order: 11 },
  { name: 'Settings', slug: 'settings', icon: '⚙️', description: 'Configure API keys and preferences', sort_order: 12 },
  { name: 'Troubleshooting', slug: 'troubleshooting', icon: '🔧', description: 'Common issues and solutions', sort_order: 13 },
];

// =============================================================================
// ARTICLES
// =============================================================================

interface ArticleData {
  category_slug: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  feature_keys?: string[];
  search_keywords?: string[];
  sort_order: number;
}

const ARTICLES: ArticleData[] = [
  // ==========================================
  // GETTING STARTED
  // ==========================================
  {
    category_slug: 'getting-started',
    title: 'Welcome to Holistic SEO Workbench',
    slug: 'welcome',
    summary: 'Understand what this tool does and why it matters for your content strategy.',
    sort_order: 0,
    feature_keys: ['page:welcome'],
    search_keywords: ['welcome', 'introduction', 'overview', 'what is'],
    content: `# Welcome to Holistic SEO Workbench

## The Problem We Solve

Imagine you're building a website about "sustainable gardening." You write an article about composting, another about native plants, and maybe one about water conservation. But here's the problem: **search engines don't see these as connected**. To Google, they're just random articles floating in cyberspace.

**Holistic SEO changes that.** Instead of creating isolated content, you build a structured **topical map** - a comprehensive blueprint that shows search engines (and readers) that you are THE authority on sustainable gardening. Every article links to related pieces. Every piece reinforces your expertise. The result? Better rankings, more traffic, and readers who trust your expertise.

## What is a Topical Map?

Think of a topical map like the table of contents for an encyclopedia. If you were the editor of an encyclopedia about "Coffee," you wouldn't just write random articles. You'd organize them:

- **Core Topics (Money Pages)**: "How to Brew Perfect Espresso" - these directly serve your business goals
- **Supporting Topics (Authority Pages)**: "History of Coffee in Ethiopia" - these build your expertise and authority
- **Semantic Connections**: How "espresso brewing" relates to "coffee grinder types" relates to "water temperature science"

This tool helps you create, organize, and execute that strategy.

## Who Is This For?

- **Content Strategists** planning quarterly content calendars
- **SEO Professionals** building topical authority for clients
- **Business Owners** wanting to dominate their niche in search results
- **Marketing Teams** coordinating content across writers

## The Journey Ahead

Your workflow through this tool follows a clear path:

\`\`\`
Sign In → Create Project → Run Wizard → Generate Map → Create Briefs → Write Content
\`\`\`

Each step builds on the previous. By the end, you'll have:
1. A strategic topical map with 50-200+ organized topics
2. SEO-optimized content briefs for each topic
3. AI-generated article drafts ready for editing
4. Internal linking recommendations
5. Schema markup for rich search results

## Ready to Begin?

Start with **Your First 15 Minutes** to create your first topical map, or read **Understanding Topical Authority** to grasp the SEO concepts behind the tool.
`
  },
  {
    category_slug: 'getting-started',
    title: 'Your First 15 Minutes',
    slug: 'first-15-minutes',
    summary: 'A hands-on tutorial to create your first topical map from scratch.',
    sort_order: 1,
    feature_keys: ['page:welcome', 'page:projects'],
    search_keywords: ['tutorial', 'quick start', 'first map', 'beginner'],
    content: `# Your First 15 Minutes

Let's create your first topical map together. By the end of this tutorial, you'll have a complete content strategy ready to execute.

## Before You Start

You'll need:
- An account (create one if you haven't)
- One AI provider API key (we recommend starting with Google Gemini - it's free)
- A topic you want to build authority around (your business niche)

## Step 1: Sign In (30 seconds)

![Login screen](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/001-auth-login-empty.png)

1. Open the application URL
2. Enter your email address in the **Email** field
3. Enter your password in the **Password** field
4. Click the blue **"Sign In"** button

**First time?** Click the "Sign Up" tab to create an account first.

## Step 2: Configure Your API Key (2 minutes)

Before creating anything, you need to connect an AI provider.

1. Look at the **bottom-right corner** of the screen
2. Click the **gear icon (⚙️)** to open Settings
3. Go to the **"API Keys"** tab
4. Enter your API key for at least one provider:
   - **Google Gemini** (recommended for beginners - free tier available)
   - **OpenAI** (GPT-4 recommended)
   - **Anthropic** (Claude models)
   - **OpenRouter** (access to multiple models)
5. Click **"Save Settings"**

![Settings modal with API configuration](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/modal-settings.png)

## Step 3: Create a Project (1 minute)

![Project selection screen](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/005-projects-selection.png)

Projects are containers for your content strategies. One project = one website or content initiative.

1. In the **"Create New Project"** section:
   - **Project Name**: Enter a descriptive name (e.g., "Sustainable Gardening Blog")
   - **Domain**: Enter your website domain (e.g., "greenthumb.com")
2. Click **"Create and Open Project"**

### Correct vs. Incorrect Examples

| Field | ✅ Correct | ❌ Incorrect | Why |
|-------|-----------|-------------|-----|
| Project Name | "Q4 2024 Fitness Content" | "test" | Descriptive names help you organize multiple projects |
| Domain | "fitnessfirst.com" | "https://fitnessfirst.com/blog" | Use domain only, not full URLs |

## Step 4: Start the Wizard (10 minutes)

![Project workspace](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/008-workspace-main.png)

The wizard guides you through the complete setup process. It's the heart of topical map creation.

1. In the Project Workspace, find the **"Create New Topical Map"** card
2. Click **"Start Wizard"**

The wizard has **four stages**:

### Stage 1: Business Information

![Business info form](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/project-02-validation.png)

Tell the AI about your business so it generates relevant content.

| Field | What to Enter | Example |
|-------|---------------|---------|
| Company Name | Your official business name | "GreenThumb Gardens LLC" |
| Industry | Your business sector | "Sustainable Gardening & Landscaping" |
| Website Type | What your site does | Select "Blog/Content Site" |
| Value Proposition | What makes you unique | "We teach urban dwellers to grow food in small spaces" |
| Target Audience | Who you're writing for | "Urban millennials interested in sustainability" |

**Pro Tip**: Be specific! "We sell things" tells the AI nothing. "We provide organic pest control solutions for vegetable gardens" gives it context to generate relevant topics.

### Stage 2: SEO Pillars (The Critical Step)

![SEO Pillars modal](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/021-modal-seo-pillars-filled.png)

This is where you define the three pillars of your content strategy:

**Central Entity (CE)**: The main topic you want to be known for
- Think: "What do I want to rank #1 for?"
- Example: "Sustainable Urban Gardening"

**Source Context (SC)**: The broader category your topic belongs to
- Think: "What industry or field is this part of?"
- Example: "Sustainable Living & Environmental Practices"

**Central Search Intent (CSI)**: The primary reason users search for your topic
- Think: "What problem are users trying to solve?"
- Example: "Learning to grow food in limited urban spaces"

### Correct vs. Incorrect Pillars

| Pillar | ✅ Correct | ❌ Incorrect | Why |
|--------|-----------|-------------|-----|
| Central Entity | "Container Vegetable Gardening" | "Gardening" | Too broad - you can't be #1 for "gardening" |
| Source Context | "Urban Agriculture & Sustainability" | "Plants" | Should be an industry/field, not a noun |
| Central Search Intent | "Growing fresh vegetables in apartments and small spaces" | "Gardening tips" | Be specific about the user's problem |

### Stage 3: EAV Discovery

![EAV Manager](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/022-modal-eav-manager-main.png)

EAVs (Entity-Attribute-Value triples) are semantic connections. They tell the AI HOW topics relate to each other.

Example EAVs for "Sustainable Urban Gardening":
- **Sustainable Urban Gardening** → **requires** → **Proper Drainage Systems**
- **Container Plants** → **benefit from** → **Organic Compost**
- **Vertical Gardens** → **are ideal for** → **Small Balconies**

The wizard will suggest EAVs automatically. You can:
- **Accept** suggested EAVs
- **Reject** irrelevant ones
- **Add custom** EAVs you know are important

### Stage 4: Generate the Map

Once you've completed the wizard:
1. Review your settings
2. Click **"Generate Topical Map"**
3. Wait 2-5 minutes while AI creates your map

## Step 5: Explore Your Map (2 minutes)

![Map dashboard with topics](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/012-dashboard-main.png)

Congratulations! You now have a complete topical map. Explore it:

1. **Topics Tab**: Browse all generated topics
2. **Graph View**: See visual connections between topics
3. **Analysis Tab**: Check map quality and coverage

## What's Next?

Now that you have a map:
1. **Generate Content Briefs** for your priority topics
2. **Create Article Drafts** using the 9-pass AI system
3. **Export** your strategy to share with your team

Read **Understanding the Dashboard** for a complete tour of all features.
`
  },
  {
    category_slug: 'getting-started',
    title: 'System Requirements',
    slug: 'system-requirements',
    summary: 'What you need to run the Holistic SEO Workbench effectively.',
    sort_order: 2,
    feature_keys: [],
    search_keywords: ['requirements', 'api key', 'browser', 'setup'],
    content: `# System Requirements

## Browser Requirements

The Holistic SEO Workbench runs in your web browser. For the best experience:

**Recommended Browsers:**
- Google Chrome (latest version)
- Microsoft Edge (latest version)
- Firefox (latest version)
- Safari 15+

**Not Recommended:**
- Internet Explorer (not supported)
- Browsers older than 2 years

## AI Provider API Keys

The application requires at least ONE AI provider API key. Here are your options:

### Google Gemini (Recommended for Beginners)

**Cost**: Free tier available (60 requests/minute)
**Setup**:
1. Go to https://makersuite.google.com/app/apikey
2. Create an API key
3. Copy and paste into Settings > API Keys > Gemini

**Best For**: Getting started, budget-conscious users

### OpenAI (GPT-4)

**Cost**: Pay-per-use (~$0.03-0.06 per 1K tokens)
**Setup**:
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste into Settings > API Keys > OpenAI

**Best For**: Highest quality content generation

### Anthropic (Claude)

**Cost**: Pay-per-use (~$0.008-0.024 per 1K tokens)
**Setup**:
1. Go to https://console.anthropic.com/
2. Create an API key
3. Copy and paste into Settings > API Keys > Anthropic

**Best For**: Long-form content, nuanced writing

### OpenRouter

**Cost**: Varies by model
**Setup**:
1. Go to https://openrouter.ai/
2. Create an account and API key
3. Copy and paste into Settings > API Keys > OpenRouter

**Best For**: Access to multiple models through one API

## Recommended Setup

For beginners, we recommend starting with **Google Gemini** for:
- Free tier to learn the system
- Fast response times
- Good quality for map generation

Once comfortable, consider adding **OpenAI** or **Anthropic** for:
- Content brief generation (higher quality)
- Article drafts (better writing)
`
  },

  // ==========================================
  // CORE CONCEPTS
  // ==========================================
  {
    category_slug: 'core-concepts',
    title: 'Understanding Topical Authority',
    slug: 'topical-authority',
    summary: 'Learn why building topical authority is the foundation of modern SEO.',
    sort_order: 0,
    feature_keys: [],
    search_keywords: ['topical authority', 'seo', 'expertise', 'authority'],
    content: `# Understanding Topical Authority

## The Story of Two Websites

Imagine two websites about "home brewing beer":

**Website A** has 500 articles covering everything from cooking recipes to travel guides to... a few beer brewing posts mixed in.

**Website B** has 75 articles, ALL about beer brewing: brewing equipment, ingredient selection, fermentation science, recipe development, troubleshooting common problems, and reviews of brewing supplies.

Which website does Google consider the "expert" on beer brewing? **Website B**, every time.

This is **Topical Authority** - Google's way of measuring whether you're a legitimate expert or just someone who occasionally writes about a topic.

## How Google Measures Authority

Google looks at several signals to determine your topical authority:

### 1. Content Depth
Do you cover the topic comprehensively? If someone asks "everything about beer brewing," could your site answer them? The deeper you go, the more authority you build.

### 2. Content Breadth
Do you cover all the related sub-topics? Beer brewing connects to water chemistry, yeast science, equipment maintenance, recipe scaling, and dozens of other areas. Covering these related topics signals expertise.

### 3. Semantic Connections
Do your articles reference and link to each other in meaningful ways? A site with isolated articles looks random. A site where "fermentation temperature" links to "yeast health" which links to "troubleshooting off-flavors" looks like it was written by an expert.

### 4. E-E-A-T Signals
**Experience, Expertise, Authoritativeness, Trustworthiness** - Google's quality guidelines. Your content should demonstrate real experience with the topic, not just surface-level information anyone could Google.

## Why This Tool Exists

Building topical authority manually is overwhelming:
- What topics should I cover?
- How do they connect to each other?
- In what order should I create content?
- Am I missing important sub-topics?

The Holistic SEO Workbench answers all these questions by:
1. Mapping your entire topic area systematically
2. Identifying the semantic connections between topics
3. Prioritizing which content to create first
4. Ensuring comprehensive coverage

## The Topical Map Strategy

Instead of randomly writing articles, you follow a strategic approach:

### Step 1: Define Your Central Entity
What main topic do you want to dominate? This becomes your content hub.

### Step 2: Map the Territory
Identify all related sub-topics, organized by importance and relationship.

### Step 3: Create Strategic Content
Start with "money pages" (commercial intent) supported by "authority pages" (informational).

### Step 4: Build Semantic Bridges
Connect everything through internal linking and contextual references.

### Step 5: Fill the Gaps
Continuously identify and fill missing topic areas.

## The Result

A website built with topical authority strategy:
- Ranks for hundreds of related keywords
- Gets recommended by Google for related searches
- Builds reader trust through comprehensive coverage
- Converts better because readers see you as the expert

## Next: Understanding the Three Pillars

Read **The Three Pillars: CE, SC, and CSI** to learn the framework that powers all topical maps.
`
  },
  {
    category_slug: 'core-concepts',
    title: 'The Three Pillars: CE, SC, and CSI',
    slug: 'three-pillars',
    summary: 'Master the Central Entity, Source Context, and Central Search Intent framework.',
    sort_order: 1,
    feature_keys: ['modal:seoPillars'],
    search_keywords: ['central entity', 'source context', 'search intent', 'ce', 'sc', 'csi'],
    content: `# The Three Pillars: CE, SC, and CSI

Every topical map is built on three foundational pillars. Understanding these is crucial - they're not just fields you fill in; they're the strategic decisions that shape your entire content strategy.

## The Three Pillars Explained

### Central Entity (CE): Your Content Kingdom

**Definition**: The specific topic you want to become THE authority on.

**The Question to Ask**: "If I could rank #1 for one topic and all its variations, what would it be?"

**How to Choose Your CE**:
1. **Specific enough to dominate**: "Coffee" is too broad. "Specialty Coffee Home Brewing" is achievable.
2. **Broad enough to support many articles**: "Chemex Brewing" is too narrow. You'd run out of topics.
3. **Aligned with your business**: Your CE should connect to what you sell or provide.

**Examples**:
| Too Broad | Just Right | Too Narrow |
|-----------|------------|------------|
| "Fitness" | "Home Gym Strength Training" | "Dumbbell Bicep Curls" |
| "Gardening" | "Container Vegetable Gardening" | "Growing Tomatoes in 5-Gallon Buckets" |
| "Marketing" | "B2B Content Marketing Strategy" | "LinkedIn Post Scheduling" |

### Source Context (SC): The Expert's Playground

**Definition**: The broader field or industry your CE belongs to.

**The Question to Ask**: "What professional field or discipline would my topic appear in?"

**How to Choose Your SC**:
1. Think about what industry experts call this field
2. Consider what university department would teach this
3. Identify the professional associations or communities

**Examples**:
| Central Entity | Source Context |
|----------------|----------------|
| "Home Gym Strength Training" | "Fitness & Exercise Science" |
| "Container Vegetable Gardening" | "Urban Agriculture & Sustainable Living" |
| "B2B Content Marketing Strategy" | "Digital Marketing & Business Development" |

**Why SC Matters**: The AI uses SC to understand the vocabulary, concepts, and frameworks relevant to your topic. "Container Gardening" in the context of "Interior Design" generates different content than in the context of "Sustainable Agriculture."

### Central Search Intent (CSI): The Reader's Mission

**Definition**: The primary problem or goal your target audience has when searching for your CE.

**The Question to Ask**: "Why is someone Googling this? What problem are they trying to solve?"

**How to Choose Your CSI**:
1. Think about your ideal reader
2. Identify their main pain point or goal
3. Describe the transformation they want

**Examples**:
| Central Entity | Poor CSI | Strong CSI |
|----------------|----------|------------|
| "Home Gym Strength Training" | "Learn exercises" | "Building muscle and strength effectively at home without expensive gym memberships" |
| "Container Vegetable Gardening" | "Grow vegetables" | "Growing fresh, organic produce in small urban spaces like apartments and balconies" |
| "B2B Content Marketing Strategy" | "Create content" | "Generating qualified leads and establishing thought leadership through strategic content" |

## Putting It All Together

Let's see a complete example:

**Business**: An online course about becoming a freelance web designer

| Pillar | Value | Reasoning |
|--------|-------|-----------|
| CE | "Freelance Web Design Business" | Specific niche (freelance + web design + business) |
| SC | "Digital Entrepreneurship & Creative Services" | The professional field |
| CSI | "Launching and growing a profitable freelance web design career from scratch" | The transformation students want |

This generates topics like:
- "How to Set Your Freelance Web Design Rates"
- "Building a Portfolio When You Have No Clients"
- "Finding Your First Web Design Client"
- "Managing Client Expectations as a Freelancer"
- "Scaling Your Freelance Design Business"

## Common Mistakes

### Mistake 1: CE Too Broad
**Wrong**: "Digital Marketing"
**Right**: "Email Marketing for E-commerce Brands"

**Problem**: You'll generate thousands of unfocused topics you can't possibly cover.

### Mistake 2: SC Too Vague
**Wrong**: "Business"
**Right**: "E-commerce & Direct-to-Consumer Retail"

**Problem**: The AI doesn't know which vocabulary and concepts to use.

### Mistake 3: CSI Too Generic
**Wrong**: "Learn about email marketing"
**Right**: "Increasing revenue through automated email sequences that convert browsers into buyers"

**Problem**: Generic intent creates generic content that doesn't resonate.

## Next: Understanding EAVs

Read **Semantic Triples (EAVs)** to learn how topics connect to each other.
`
  },
  {
    category_slug: 'core-concepts',
    title: 'Semantic Triples (EAVs)',
    slug: 'eavs-explained',
    summary: 'How Entity-Attribute-Value relationships power semantic SEO.',
    sort_order: 2,
    feature_keys: ['modal:eavManager'],
    search_keywords: ['eav', 'entity', 'attribute', 'value', 'semantic', 'triple'],
    content: `# Semantic Triples (EAVs)

## What Are EAVs?

EAV stands for **Entity-Attribute-Value** - a way of expressing relationships between concepts. Think of them as the building blocks of meaning.

Every EAV is a simple sentence:
**[Entity]** → **[Attribute/Relationship]** → **[Value]**

Examples:
- **Espresso** → **is brewed using** → **High Pressure**
- **Container Gardens** → **require** → **Proper Drainage**
- **Email Marketing** → **increases** → **Customer Retention**

## Why EAVs Matter for SEO

Google's Knowledge Graph is built on these relationships. When you search "What temperature to brew espresso?", Google doesn't just match keywords - it understands that:
- Espresso is a type of coffee
- Brewing involves temperature
- Temperature affects extraction
- Extraction determines flavor

By explicitly defining EAVs in your topical map, you're teaching the AI to create content that matches how Google understands the world.

## EAV Categories

![EAV Manager showing categories](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/022-modal-eav-manager-main.png)

EAVs are categorized by how unique they are to your central entity:

### UNIQUE EAVs
Relationships that ONLY apply to your specific topic.
- **Container Gardening** → **uses** → **Self-Watering Reservoirs**
- These are your competitive advantage - things only experts know

### ROOT EAVs
Fundamental relationships that define your topic.
- **Container Gardening** → **is a type of** → **Horticulture**
- These establish what category you belong to

### RARE EAVs
Relationships that exist but aren't commonly discussed.
- **Container Gardening** → **mitigates** → **Soil-Borne Diseases**
- These showcase depth of expertise

### COMMON EAVs
Well-known relationships that most people understand.
- **Plants** → **require** → **Sunlight**
- These provide context but don't differentiate you

## EAV Classifications

Beyond categories, EAVs are classified by the type of relationship:

| Classification | What It Describes | Example |
|---------------|-------------------|---------|
| TYPE | Category membership | "Espresso → is a → Coffee Beverage" |
| COMPONENT | Parts or ingredients | "Espresso → contains → Crema" |
| BENEFIT | Positive outcomes | "Container Gardens → provide → Fresh Produce" |
| RISK | Potential problems | "Overwatering → causes → Root Rot" |
| PROCESS | Actions or methods | "Composting → transforms → Kitchen Scraps" |
| SPECIFICATION | Technical details | "Espresso → extracts at → 9 bars pressure" |

## How EAVs Influence Your Map

When you add an EAV, you're telling the AI:
1. **This relationship exists** and should be covered somewhere
2. **How important it is** (UNIQUE > ROOT > RARE > COMMON)
3. **What type of content** to create about it

An EAV like **"Container Gardens → prevent → Soil Compaction"** might generate:
- A section in an article about container gardening benefits
- A comparison article: "Container vs. Ground Gardens"
- An FAQ entry answering "Why don't containers have compaction issues?"

## Managing EAVs in the Tool

![EAV discovery wizard](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/023-modal-eav-manager-scrolled.png)

During map creation, the wizard will:

1. **Generate suggested EAVs** based on your CE, SC, and CSI
2. **Ask you to accept or reject** each suggestion
3. **Allow you to add custom EAVs** you know are important

### When to Add Custom EAVs

Add custom EAVs when you have:
- **Industry insider knowledge** others don't cover
- **Specific product relationships** to your business
- **Common customer questions** that reveal important connections
- **Competitive advantages** you want to highlight

### When to Reject Suggested EAVs

Reject EAVs that are:
- **Off-topic** for your specific niche
- **Too generic** to be useful
- **Incorrect** based on your expertise
- **Redundant** with other EAVs

## Best Practices

### Do This:
- Accept UNIQUE and ROOT EAVs liberally - these shape your map
- Add custom EAVs from your industry experience
- Review COMMON EAVs carefully - only keep truly relevant ones
- Think about customer questions when adding custom EAVs

### Don't Do This:
- Accept every suggested EAV without review
- Skip the EAV step (it's critical for map quality)
- Add only COMMON EAVs (your map will be generic)
- Forget that YOU are the expert - the AI suggestions are starting points
`
  },
  {
    category_slug: 'core-concepts',
    title: 'Core vs. Outer Topics',
    slug: 'core-outer-topics',
    summary: 'Understand the two-section content strategy: Core (money) and Outer (authority) pages.',
    sort_order: 3,
    feature_keys: ['page:dashboard'],
    search_keywords: ['core topics', 'outer topics', 'money pages', 'authority pages'],
    content: `# Core vs. Outer Topics

## The Two-Section Strategy

Every effective topical map divides content into two strategic sections:

### Core Topics (Money Pages)
**Purpose**: Directly support business goals and monetization

These are the pages that:
- Target commercial or transactional search intent
- Feature your products or services
- Include calls-to-action
- Drive conversions

**Examples**:
- "Best Espresso Machines Under $500" (affiliate site)
- "Container Garden Kits for Beginners" (e-commerce)
- "Web Design Services for Small Business" (services)

### Outer Topics (Authority Pages)
**Purpose**: Build topical authority and attract search traffic

These are the pages that:
- Target informational search intent
- Demonstrate expertise
- Attract organic traffic
- Link TO your money pages

**Examples**:
- "How Espresso Extraction Works" (informational)
- "The Science of Container Soil Drainage" (educational)
- "Web Design Trends in 2024" (thought leadership)

## Why You Need Both

Imagine walking into a store where every employee immediately tries to sell you something. Uncomfortable, right?

Now imagine a store where friendly experts answer your questions, teach you about products, and THEN suggest relevant purchases. Much better.

Your website works the same way:

1. **Outer Topics** attract visitors through helpful content
2. Visitors begin to trust your expertise
3. Internal links guide them toward **Core Topics**
4. Core Topics convert them into customers

## The Ratio

A healthy topical map typically has:
- **20-30%** Core Topics (money pages)
- **70-80%** Outer Topics (authority pages)

This ratio ensures:
- Enough commercial content to support business goals
- Enough informational content to build authority
- Natural internal linking opportunities
- Sustainable traffic growth

## Identifying Topic Types

When reviewing your generated map, look for these signals:

### This is a Core Topic if:
- It mentions products, services, or prices
- The search intent is to buy or compare
- You'd put a conversion form on this page
- It directly relates to what you sell

### This is an Outer Topic if:
- It answers "how to" or "what is" questions
- The search intent is to learn
- You'd share this on social media for thought leadership
- It builds expertise without selling

## Converting Between Types

Sometimes the AI categorizes a topic as one type when it should be another. You can change this:

1. Click on any topic to open the detail panel
2. Find the "Topic Type" or "Section" field
3. Change from Core to Outer or vice versa
4. Save your changes

### When to Convert Core → Outer

**Before**: "Buy Container Garden Supplies"
**After**: "Essential Supplies for Container Gardening"

Convert when the topic is too commercially aggressive for your strategy.

### When to Convert Outer → Core

**Before**: "Types of Espresso Machines"
**After**: "Best Espresso Machines for Home Baristas"

Convert when you want to add commercial intent to an informational topic.

## Linking Strategy

The relationship between Core and Outer topics drives your internal linking:

\`\`\`
[Outer Topic A] ────┐
                    │
[Outer Topic B] ────┼──→ [Core Topic 1]
                    │
[Outer Topic C] ────┘
\`\`\`

Multiple authority pages link to each money page, passing:
- Topical relevance
- Link equity
- Reader trust
`
  },
  {
    category_slug: 'core-concepts',
    title: 'Glossary of Terms',
    slug: 'glossary',
    summary: 'Quick reference for all terminology used in the application.',
    sort_order: 4,
    feature_keys: [],
    search_keywords: ['glossary', 'terms', 'definitions', 'vocabulary'],
    content: `# Glossary of Terms

## A

**Authority Page**: See Outer Topic. Content designed to build expertise rather than drive conversions.

## C

**Central Entity (CE)**: The main topic you want to establish authority for. The hub of your topical map.

**Central Search Intent (CSI)**: The primary goal or problem your target audience has when searching for your CE.

**Content Brief**: A comprehensive writing guide for a specific topic, including outline, keywords, tone guidance, and research.

**Core Topic**: Content directly supporting business goals (commercial intent). Also called "Money Page."

## E

**EAV (Entity-Attribute-Value)**: A semantic triple expressing a relationship: Entity → Attribute → Value. Example: "Coffee → requires → Grinding"

**E-E-A-T**: Experience, Expertise, Authoritativeness, Trustworthiness - Google's quality guidelines.

## I

**Internal Linking**: Links between pages on the same website. Critical for distributing authority and guiding users.

## K

**Knowledge Graph**: Google's database of entities and their relationships. Topical maps align with this structure.

## M

**Money Page**: See Core Topic. Content designed to convert visitors into customers.

**Multi-Pass Generation**: The 9-step AI content creation process that progressively improves article quality.

## O

**Outer Topic**: Content building topical authority (informational intent). Also called "Authority Page."

## P

**Pillar**: See Three Pillars. The CE, SC, and CSI that define your topical map strategy.

## S

**Schema Markup**: Structured data (JSON-LD) that helps search engines understand your content. Auto-generated in Pass 9.

**Semantic Distance**: How closely related two topics are. Topics with shorter semantic distance should be closer in your site architecture.

**Semantic Triple**: See EAV.

**SERP**: Search Engine Results Page. The page displayed when you search on Google.

**Source Context (SC)**: The broader field or industry your Central Entity belongs to.

## T

**Topic Cluster**: A group of related topics that link to a central pillar page.

**Topical Authority**: Search engines' measure of your expertise on a specific subject. Built through comprehensive, interconnected content.

**Topical Map**: A strategic content blueprint organizing topics around a central theme with defined relationships.

## V

**Value Proposition**: What makes your business/content unique. Influences content angle and differentiation.
`
  },

  // ==========================================
  // PROJECT MANAGEMENT
  // ==========================================
  {
    category_slug: 'project-management',
    title: 'Creating and Loading Projects',
    slug: 'creating-loading-projects',
    summary: 'How to create new projects and load existing ones.',
    sort_order: 0,
    feature_keys: ['page:projects'],
    search_keywords: ['create project', 'load project', 'open project'],
    content: `# Creating and Loading Projects

## Understanding Projects

A **Project** is a container for your content strategy. Typically, you'll have:
- One project per website
- Or one project per major content initiative

## The Project Selection Screen

![Project selection screen](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/005-projects-selection.png)

When you sign in, you'll see the Project Selection screen with two main areas:

### Left: Create New Project

Use this to start a fresh content strategy:

1. **Project Name**: A descriptive name you'll recognize
   - ✅ "Acme Blog Q4 Strategy"
   - ❌ "test123"

2. **Domain**: Your website's domain
   - ✅ "acmeblog.com"
   - ❌ "https://acmeblog.com/blog/posts"

3. Click **"Create and Open Project"**

### Right: Load Existing Project

Your previously created projects appear here:
- Each project shows its **name** and **domain**
- Click **"Load"** to open a project
- Projects with existing maps show a map indicator

## What Happens After Loading

When you load a project, you enter the **Project Workspace** where you can:
- Create new topical maps
- Load existing maps
- Run site analysis
- Merge multiple maps

## Managing Multiple Projects

You can have unlimited projects. Common patterns:

### By Website
- "Main Blog - cooking.com"
- "Recipes Section - cooking.com/recipes"
- "Product Reviews - cooking.com/reviews"

### By Time Period
- "2024 Q1 Content Strategy"
- "2024 Q2 Content Strategy"
- "Holiday Campaign 2024"

### By Client (for agencies)
- "Client A - Restaurant Chain"
- "Client B - Fitness Studio"
- "Client C - Law Firm"

## Deleting Projects

Currently, projects cannot be deleted from the UI. Contact your administrator if you need a project removed.

## Next Steps

After creating or loading a project, read **The Project Workspace** to understand your options.
`
  },
  {
    category_slug: 'project-management',
    title: 'The Project Workspace',
    slug: 'project-workspace',
    summary: 'Navigate the project workspace and understand your options.',
    sort_order: 1,
    feature_keys: ['page:workspace'],
    search_keywords: ['workspace', 'dashboard', 'project home'],
    content: `# The Project Workspace

## Overview

![Project workspace](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/008-workspace-main.png)

The Project Workspace is your command center for a single project. From here, you can:
- Create new topical maps
- Load existing maps
- Run site analysis
- Merge maps together

## The Four Sections

### 1. Create New Topical Map

![Create map section](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/009-workspace-create-map-section.png)

Start a new topical map from scratch:

- **Start Wizard**: Launch the guided 4-step wizard
- **Quick Generate**: Skip the wizard and use defaults (not recommended for new users)

**Always use the wizard for your first few maps.** It teaches you the process and ensures quality results.

### 2. Load Existing Map

If you've already created maps in this project:
- See all saved maps with their creation dates
- Click **"Load Map"** to open and edit
- Maps save automatically as you work

### 3. Site Analysis

![Site analysis section](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/010-workspace-analyze-section.png)

Analyze an existing website to:
- Import existing content structure
- Find gaps in coverage
- Compare against your topical map

Click **"Open Site Analysis"** to access the crawler and analysis tools.

### 4. Merge Maps

![Merge section](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/011-workspace-merge-section.png)

Combine multiple topical maps:
- Useful when merging strategies
- Handles duplicate topics intelligently
- Preserves EAVs from both maps

## Navigation

### Header Elements

- **Project Name**: Displayed at the top
- **Admin Dashboard**: Access system administration (if you're an admin)

### Footer Elements

- **Settings (⚙️)**: Configure API keys and preferences
- **Ask Strategist**: Get AI-powered help
- **Help (?)**: Open this help system

## Tips for the Workspace

1. **One map per major strategy**: Don't cram everything into one map
2. **Name maps descriptively**: "Q4 Product Content" not "Map 1"
3. **Use site analysis before creating maps**: Understand what you have before planning what you need
4. **Back to Projects**: Click your project name or use the back button to return to project selection
`
  },

  // ==========================================
  // COMPLETE WORKFLOW
  // ==========================================
  {
    category_slug: 'complete-workflow',
    title: 'Step 1: Business Information',
    slug: 'step-1-business-info',
    summary: 'Configure your business details for personalized map generation.',
    sort_order: 0,
    feature_keys: ['wizard:businessInfo'],
    search_keywords: ['business info', 'company', 'setup', 'wizard step 1'],
    content: `# Step 1: Business Information

## Why This Matters

The AI that generates your topical map needs context. Without knowing who you are, it generates generic content that could apply to anyone. With business information, it generates content tailored to YOUR audience, YOUR products, and YOUR voice.

## The Business Information Form

![Business information wizard](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/project-02-validation.png)

### Required Fields

#### Company Name
Your official business name.

**Used For**:
- Schema markup (JSON-LD)
- Content personalization
- Brand consistency

**Examples**:
- ✅ "Green Thumb Gardens LLC"
- ❌ "my gardening site"

#### Domain
Your website address.

**Used For**:
- Site analysis integration
- External link filtering
- Schema markup

**Examples**:
- ✅ "greenthumbgardens.com"
- ❌ "https://www.greenthumbgardens.com/blog/"

#### Industry
Your business sector or field.

**Used For**:
- Vocabulary selection
- Competitor context
- Industry-specific terms

**Examples**:
- ✅ "Sustainable Gardening & Urban Agriculture"
- ❌ "Plants"

#### Website Type
Select the category that best fits your site.

**Options**:
| Type | Best For | Content Style |
|------|----------|---------------|
| Blog/Content Site | Publishers, educators | Informational, long-form |
| E-commerce | Online stores | Product-focused, transactional |
| Service Business | Consultants, agencies | Trust-building, case studies |
| SaaS/Software | Tech products | Feature-focused, tutorials |
| Local Business | Brick-and-mortar | Location-based, community |

#### Value Proposition
What makes you different from competitors.

**This is critical.** Your value proposition shapes the angle of every piece of content.

**Good Value Propositions**:
- "We specialize in container gardening for apartment dwellers with no outdoor space"
- "The only coffee roaster focused on single-origin beans from women-owned farms"
- "Enterprise security solutions with 24/7 human support, not chatbots"

**Poor Value Propositions**:
- "We sell plants"
- "Good coffee"
- "Quality security"

### Optional Fields

#### Target Audience
Who you're writing for.

**Be Specific**:
- ✅ "Urban millennials (25-40) interested in sustainable living, new to gardening, limited space"
- ❌ "People who like plants"

#### Competitors
Other companies in your space.

**Adding Competitors Helps**:
- Identify content gaps they're not covering
- Differentiate your content angle
- Avoid duplicating their strategy

#### Content Tone
How your content should sound.

**Options**:
- Professional & Authoritative
- Friendly & Approachable
- Technical & Detailed
- Casual & Conversational

## Completing This Step

1. Fill in all required fields
2. Review your entries for specificity
3. Click **"Next"** or **"Continue"**

## Common Mistakes

### Mistake 1: Being Too Generic

**Wrong**: Industry = "Marketing"
**Right**: Industry = "B2B SaaS Content Marketing"

**Why**: Generic industries generate generic topics. Specific industries generate relevant content.

### Mistake 2: Vague Value Proposition

**Wrong**: "We help businesses grow"
**Right**: "We help e-commerce brands reduce cart abandonment through personalized email sequences"

**Why**: The value proposition influences content angle throughout your map.

### Mistake 3: Skipping Target Audience

**Wrong**: Leaving blank or "everyone"
**Right**: "Marketing managers at companies with 50-500 employees, looking to justify content investments to their CEO"

**Why**: Good content speaks to specific people. Generic content speaks to no one.

## Next Step

Continue to **Step 2: SEO Pillars** to define your CE, SC, and CSI.
`
  },
  {
    category_slug: 'complete-workflow',
    title: 'Step 2: SEO Pillars',
    slug: 'step-2-seo-pillars',
    summary: 'Define your Central Entity, Source Context, and Central Search Intent.',
    sort_order: 1,
    feature_keys: ['wizard:seoPillars', 'modal:seoPillars'],
    search_keywords: ['seo pillars', 'central entity', 'ce', 'sc', 'csi', 'wizard step 2'],
    content: `# Step 2: SEO Pillars

## The Most Important Step

This is the strategic heart of your topical map. The three pillars you define here determine:
- What topics get generated
- How they relate to each other
- What vocabulary and angle the content takes
- Whether your map builds genuine authority

Spend time here. A rushed pillar definition creates a weak map.

## The SEO Pillars Modal

![SEO Pillars modal with fields](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/021-modal-seo-pillars-filled.png)

### Central Entity (CE)

**The Question**: "What topic do I want to be THE authority on?"

**How to Write It**:
1. Start with your main topic
2. Add qualifiers that make it specific
3. Test: "Could I realistically write 100+ articles about this?"

**Examples by Industry**:

| Industry | Too Broad | Just Right | Too Narrow |
|----------|-----------|------------|------------|
| Fitness | "Exercise" | "Strength Training for Home Gyms" | "Barbell Squats" |
| Cooking | "Food" | "Italian Home Cooking" | "Making Pasta Carbonara" |
| Finance | "Money" | "Personal Finance for Tech Workers" | "401k Contribution Limits" |
| Software | "Technology" | "No-Code Website Building" | "Wix Button Design" |

### Source Context (SC)

**The Question**: "What professional field or discipline does this belong to?"

**How to Write It**:
1. Think about industry conferences on this topic
2. What would a university call this field?
3. What publications cover this area?

**Examples**:

| Central Entity | Source Context |
|----------------|----------------|
| "Strength Training for Home Gyms" | "Fitness, Exercise Science & Physical Health" |
| "Italian Home Cooking" | "Culinary Arts & Food Culture" |
| "Personal Finance for Tech Workers" | "Financial Planning & Wealth Management" |
| "No-Code Website Building" | "Web Development & Digital Business" |

### Central Search Intent (CSI)

**The Question**: "What transformation does my reader want? What problem are they solving?"

**How to Write It**:
1. Identify your reader's pain point
2. Describe the desired outcome
3. Be specific about the context

**Examples**:

| Central Entity | Poor CSI | Strong CSI |
|----------------|----------|------------|
| "Home Gym Strength Training" | "Getting stronger" | "Building muscle and strength effectively at home without expensive gym memberships or complicated equipment" |
| "Italian Home Cooking" | "Making Italian food" | "Recreating authentic Italian restaurant dishes at home with accessible ingredients and traditional techniques" |
| "Personal Finance for Tech Workers" | "Managing money" | "Maximizing wealth through tax-advantaged accounts, stock compensation, and strategic investing specific to tech industry compensation" |

## Pillar Combinations That Work

### E-commerce Site
- **CE**: "Organic Baby Skincare Products"
- **SC**: "Baby Care & Natural Parenting"
- **CSI**: "Finding safe, chemical-free skincare for babies with sensitive skin and eczema"

### Service Business
- **CE**: "WordPress Website Maintenance"
- **SC**: "Web Development & Digital Business Management"
- **CSI**: "Keeping WordPress sites secure, fast, and updated without technical expertise"

### SaaS Product
- **CE**: "Project Management for Remote Teams"
- **SC**: "Team Collaboration & Remote Work Practices"
- **CSI**: "Coordinating distributed teams across time zones with clear visibility and accountability"

### Content/Blog
- **CE**: "Sourdough Bread Baking"
- **SC**: "Artisan Baking & Fermentation"
- **CSI**: "Mastering the art of sourdough from starter creation to beautiful, flavorful loaves"

## Validation Checklist

Before proceeding, verify:

- [ ] CE is specific enough to dominate but broad enough for 50+ articles
- [ ] SC describes a recognized field or discipline
- [ ] CSI describes a real problem your audience has
- [ ] All three align with your business and value proposition
- [ ] You can imagine writing content about this for the next year

## Editing Pillars Later

You can modify your pillars after map creation:
1. Open your map
2. Click **"Edit Pillars"** button
3. Modify values
4. The map will offer to regenerate affected topics

**Warning**: Changing pillars significantly after map creation may require regenerating large portions of your map.

## Next Step

Continue to **Step 3: EAV Discovery** to define the semantic relationships in your map.
`
  },
  {
    category_slug: 'complete-workflow',
    title: 'Step 3: EAV Discovery',
    slug: 'step-3-eav-discovery',
    summary: 'Define the semantic relationships that connect your topics.',
    sort_order: 2,
    feature_keys: ['wizard:eavDiscovery', 'modal:eavManager'],
    search_keywords: ['eav', 'discovery', 'semantic', 'relationships', 'wizard step 3'],
    content: `# Step 3: EAV Discovery

## What Happens in This Step

The EAV Discovery wizard:
1. Analyzes your CE, SC, and CSI
2. Generates suggested Entity-Attribute-Value relationships
3. Presents them for your review
4. Lets you add custom relationships

## The Discovery Interface

![EAV Manager interface](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/022-modal-eav-manager-main.png)

### Suggested EAVs

The AI suggests relationships based on your pillars. Each suggestion shows:
- **Entity**: The subject (often your CE or related concept)
- **Attribute**: The relationship type (requires, benefits from, causes, etc.)
- **Value**: The object being related to
- **Category**: How unique this relationship is (UNIQUE, ROOT, RARE, COMMON)

### Review Actions

For each suggested EAV, you can:

**Accept** ✅
- Adds the EAV to your map
- Influences topic generation
- Creates semantic connections

**Reject** ❌
- Removes the suggestion
- Won't influence your map
- Can be reconsidered later

**Edit** ✏️
- Modify any part of the EAV
- Useful for refining suggestions
- Keeps the relationship, changes details

## Category Priorities

Focus your attention based on category:

### UNIQUE (Accept Most)
These are relationships specific to YOUR topic that competitors probably miss.
- Shows deep expertise
- Differentiates your content
- Valuable for authority building

### ROOT (Accept Carefully)
Fundamental relationships that define your topic.
- Essential for context
- Establishes category membership
- Review for accuracy

### RARE (Selective)
Less common relationships that show depth.
- Good for advanced content
- Accept if truly relevant
- Skip if tangential

### COMMON (Be Selective)
Well-known relationships everyone covers.
- Necessary for completeness
- Don't need many
- Avoid generic ones

## Adding Custom EAVs

The wizard lets you add relationships the AI missed:

### When to Add Custom EAVs

1. **Industry insider knowledge**: Things you know from experience
2. **Product-specific relationships**: Related to what you sell
3. **Customer FAQs**: Questions that reveal important connections
4. **Competitive gaps**: Things competitors don't cover

### How to Add Custom EAVs

1. Click **"Add Custom EAV"**
2. Enter the Entity (usually your CE or a sub-topic)
3. Select or type the Attribute (relationship type)
4. Enter the Value (what it relates to)
5. Choose the Category
6. Click **"Add"**

### Example Custom EAVs

For "Container Vegetable Gardening":

| Entity | Attribute | Value | Category |
|--------|-----------|-------|----------|
| Container Gardens | eliminate | Soil Compaction Problems | UNIQUE |
| Self-Watering Containers | reduce | Watering Frequency | UNIQUE |
| Container Size | determines | Root Development Space | ROOT |
| Drainage Holes | prevent | Root Rot | ROOT |
| Container Material | affects | Soil Temperature | RARE |

## Common EAV Mistakes

### Mistake 1: Accepting Everything
**Problem**: Generic map without differentiation
**Solution**: Be selective, especially with COMMON EAVs

### Mistake 2: Rejecting Too Much
**Problem**: Sparse map missing important connections
**Solution**: Accept most UNIQUE and ROOT EAVs

### Mistake 3: Only Generic Relationships
**Problem**: Content won't show expertise
**Solution**: Add custom UNIQUE EAVs from your knowledge

### Mistake 4: Incorrect Classifications
**Problem**: Wrong relationship types
**Solution**: Review attribute accuracy before accepting

## Moving Forward

After reviewing EAVs:
1. Ensure you have 15-30 accepted EAVs minimum
2. At least 5 should be UNIQUE or ROOT
3. Click **"Continue"** or **"Next"**

## Next Step

Continue to **Step 4: Map Generation** to create your complete topical map.
`
  },
  {
    category_slug: 'complete-workflow',
    title: 'Step 4: Map Generation',
    slug: 'step-4-map-generation',
    summary: 'Generate your complete topical map with AI.',
    sort_order: 3,
    feature_keys: ['wizard:generation'],
    search_keywords: ['generate', 'create map', 'wizard step 4', 'generation'],
    content: `# Step 4: Map Generation

## The Final Wizard Step

You've completed:
- ✅ Business Information
- ✅ SEO Pillars (CE, SC, CSI)
- ✅ EAV Discovery

Now the AI will generate your complete topical map.

## Generation Options

### Topic Count

Choose how many topics to generate:

| Option | Count | Best For |
|--------|-------|----------|
| Small | 30-50 | Testing, narrow niches |
| Medium | 50-100 | Most use cases |
| Large | 100-150 | Comprehensive coverage |
| Custom | Your choice | Specific needs |

**Recommendation**: Start with Medium (50-100). You can always expand later.

### Include Competitor Analysis

If you entered competitors in Business Info:
- Check this option
- AI will analyze competitor content
- Identifies gaps you can fill
- Adds differentiation angles

### Generate Initial Content Briefs

Optionally generate briefs during map creation:
- Takes longer but saves time later
- Briefs only for high-priority topics
- Can generate more briefs later

## Starting Generation

1. Review your settings
2. Click **"Generate Topical Map"**
3. Wait for the progress indicator

### Generation Time

| Map Size | Typical Time |
|----------|--------------|
| Small | 1-2 minutes |
| Medium | 2-4 minutes |
| Large | 4-7 minutes |

**Note**: Time depends on your AI provider and their current load.

## What the AI Creates

During generation, the AI:

1. **Analyzes your pillars** to understand scope
2. **Expands EAVs** into topic ideas
3. **Clusters topics** into logical groups
4. **Assigns types** (Core vs. Outer)
5. **Creates hierarchy** (parent-child relationships)
6. **Suggests intents** (informational, commercial, etc.)
7. **Identifies opportunities** (featured snippet potential, etc.)

## Generation Progress

Watch the progress indicator for:
- Current step name
- Percentage complete
- Error messages (rare)

**If generation seems stuck:**
1. Wait at least 2 minutes
2. Check browser console for errors
3. Refresh and try again
4. Try a smaller topic count

## After Generation

When generation completes:
1. Review the topic count
2. Explore the Topics tab
3. Check the Graph view
4. Run Analysis tools

## What You'll See

![Map dashboard with generated topics](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/012-dashboard-main.png)

Your completed map shows:
- **All generated topics** in a table
- **Core vs. Outer** sections
- **Parent-child hierarchies**
- **Semantic relationships**

## Regenerating

If you're not satisfied:

**Regenerate Entire Map**:
- Click **"Edit Pillars"**
- Modify your CE, SC, CSI
- Choose **"Regenerate Map"**

**Expand Specific Sections**:
- Select topics
- Use **"AI Expansion"** to add related topics
- More targeted than full regeneration

## Next: Working with Your Map

Your topical map is ready! Continue to:
- **Navigating the Dashboard** to learn the interface
- **Managing Topics** to organize and refine
- **Generating Content Briefs** to start writing
`
  },
  {
    category_slug: 'complete-workflow',
    title: 'Navigating the Dashboard',
    slug: 'navigating-dashboard',
    summary: 'Master the map dashboard interface and all its features.',
    sort_order: 4,
    feature_keys: ['page:dashboard'],
    search_keywords: ['dashboard', 'interface', 'navigation', 'tabs'],
    content: `# Navigating the Dashboard

## The Dashboard Layout

![Map dashboard overview](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/012-dashboard-main.png)

The dashboard is organized into several key areas:

### Header Bar

Top of the screen, contains:
- **Map Name**: Click to rename
- **Edit Pillars**: Modify your CE, SC, CSI
- **Manage EAVs**: Add or remove semantic relationships
- **Competitors**: View/edit competitor list
- **Generate Report**: Export strategy documents

### Tab Navigation

![Tab navigation](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/014-dashboard-tab-strategy.png)

Main navigation tabs:

| Tab | Purpose |
|-----|---------|
| Strategy Overview | High-level map statistics and health |
| Topics | Browse and manage all topics |
| Content | Content briefs and article drafts |
| Data | Raw data and export options |
| Planning | Publication calendar and scheduling |
| Analysis | Audit tools and quality checks |
| Advanced | Graph view, semantic analysis |

### Topic Table

The main workspace showing your topics:
- **Columns**: Title, Type, Intent, Status, Actions
- **Sorting**: Click column headers
- **Filtering**: Use the filter dropdowns
- **Selection**: Click rows to see details

### Detail Panel

Right side panel (opens when topic selected):
- Full topic information
- Edit capabilities
- Brief generation button
- Related topics

### Footer Dock

Bottom of screen:
- **Add Topic**: Manually add topics
- **Quick Actions**: Bulk operations
- **Settings (⚙️)**: API keys and preferences
- **Ask Strategist**: AI chat helper
- **Help (?)**: This help system

## Using Tabs Effectively

### Strategy Overview Tab

Start here to understand your map:
- **Topic distribution** (Core vs. Outer)
- **Coverage metrics** by category
- **Health indicators** (gaps, issues)
- **Quick stats** (total topics, briefs, drafts)

### Topics Tab

Your main working area:
- Browse all topics
- Sort by any column
- Filter by type, status, parent
- Select topics for bulk actions

### Content Tab

Manage generated content:
- View all content briefs
- Access article drafts
- Track content status
- Batch generation options

### Data Tab

Raw data and exports:
- Full topic data
- EAV relationships
- Export formats (JSON, CSV)
- Import capabilities

### Planning Tab

![Planning tab](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/030-planning-tab-main.png)

Publication scheduling:
- Calendar view
- Assignment tracking
- Deadline management
- Publication workflow

### Analysis Tab

![Analysis dropdown](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/019-dashboard-analysis-dropdown.png)

Quality and audit tools:
- Map structure validation
- Semantic coverage analysis
- Internal linking audit
- Gap identification

### Advanced Tab

Power user features:
- Knowledge graph visualization
- Semantic distance calculation
- Entity relationship explorer
- Advanced filtering

## Quick Navigation Tips

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| / | Focus search |
| Esc | Close panel/modal |
| ↑↓ | Navigate topics |
| Enter | Select topic |

### Search

Use the search bar to find topics by:
- Title text
- Keywords
- Parent topic name

### Bulk Selection

Select multiple topics:
1. Click first topic
2. Hold Shift + click last topic (range)
3. Hold Ctrl + click (individual)
4. Use **"Select All"** for entire list

### Quick Filters

Common filter combinations:
- **Core + No Brief**: Priority for brief generation
- **Outer + Low Quality**: Needs attention
- **All + Featured Snippet Opportunity**: Quick wins
`
  },

  // ==========================================
  // WORKING WITH TOPICS
  // ==========================================
  {
    category_slug: 'working-with-topics',
    title: 'Managing Topics',
    slug: 'managing-topics',
    summary: 'Edit, organize, and maintain your topics.',
    sort_order: 0,
    feature_keys: ['page:dashboard'],
    search_keywords: ['edit topic', 'manage', 'organize', 'topics'],
    content: `# Managing Topics

## Selecting Topics

![Topic selected with detail panel](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/025-topic-detail-panel.png)

Click any topic row to:
- View full details in the side panel
- Access editing options
- See related topics
- Generate content briefs

## Editing Topic Details

### Editable Fields

| Field | What It Controls |
|-------|------------------|
| Title | The topic/article title |
| Type | Core (money) or Outer (authority) |
| Search Intent | Informational, Commercial, Transactional, Navigational |
| Parent Topic | Hierarchical organization |
| Keywords | Target keywords for SEO |
| Notes | Your internal notes |

### How to Edit

1. Select the topic
2. In the detail panel, click the field to edit
3. Make your changes
4. Changes save automatically

### Title Best Practices

**Good Titles**:
- "How to Choose Container Sizes for Vegetable Gardens"
- "Container Gardening vs. Raised Beds: Complete Comparison"
- "Best Self-Watering Containers for Tomatoes"

**Poor Titles**:
- "Container Sizes" (too vague)
- "Gardening Tips" (too generic)
- "Everything You Need to Know About..." (filler phrase)

## Organizing Topics

### Parent-Child Hierarchy

Topics can have parent topics, creating a hierarchy:

\`\`\`
Container Gardening Basics (parent)
├── Choosing Your First Container
├── Soil Mixes for Containers
├── Drainage Essentials
└── Container Placement Guide
\`\`\`

**To Set a Parent**:
1. Select the child topic
2. Find "Parent Topic" field
3. Select from dropdown or search
4. Save

### Topic Types

#### Core Topics
- Commercial intent
- Conversion-focused
- Product/service related
- Typically 20-30% of topics

#### Outer Topics
- Informational intent
- Authority-building
- Educational content
- Typically 70-80% of topics

**To Change Type**:
1. Select topic
2. Find "Topic Type" field
3. Toggle Core/Outer
4. Save

## Bulk Operations

### Selecting Multiple Topics

1. **Range Select**: Click first, Shift+Click last
2. **Multi-Select**: Ctrl+Click individual topics
3. **Select All**: Use the checkbox in header

### Bulk Actions Available

| Action | What It Does |
|--------|--------------|
| Generate Briefs | Create briefs for all selected |
| Change Type | Set Core/Outer for all |
| Set Parent | Assign parent topic |
| Delete | Remove topics (careful!) |
| Export | Export selected topics |

## Adding Topics Manually

Sometimes you need topics the AI didn't generate:

1. Click **"Add Topic"** in footer
2. Enter the topic title
3. Set type (Core/Outer)
4. Set parent (optional)
5. Click **"Add"**

### When to Add Manually

- Customer questions not in the map
- Trending topics in your industry
- Competitor content you want to match
- Product/service specific pages

## Deleting Topics

**Warning**: Deletion is permanent.

To delete:
1. Select the topic
2. Click **"Delete"** in detail panel
3. Confirm deletion

**When to Delete**:
- Duplicate topics
- Off-topic content
- Outdated information
- Topics outside your scope

**Don't Delete**:
- Topics just because they seem hard
- Topics you're not sure about (add to "low priority" instead)
- Topics that are parents of other topics
`
  },
  {
    category_slug: 'working-with-topics',
    title: 'AI Topic Expansion',
    slug: 'ai-topic-expansion',
    summary: 'Use AI to generate related topics and fill gaps.',
    sort_order: 1,
    feature_keys: ['modal:topicExpansion'],
    search_keywords: ['expand', 'ai generation', 'add topics', 'grow map'],
    content: `# AI Topic Expansion

## When to Expand

Your initial map is a starting point. Expand when:
- A section needs more depth
- You discover a gap in coverage
- Reader questions reveal missing topics
- Competitors cover something you don't

## Expansion Options

### Expand from Topic

Generate topics related to a specific parent:

1. Select the topic to expand
2. Click **"Expand Topic"** or right-click menu
3. Choose expansion count (5-20 topics)
4. AI generates related sub-topics

**Example**:
- Parent: "Container Soil Basics"
- Expansion generates:
  - "Best Potting Mix Ingredients"
  - "DIY Container Soil Recipes"
  - "Soil pH for Container Plants"
  - "When to Replace Container Soil"

### Expand by Gap Analysis

Let AI identify what's missing:

1. Go to **Analysis Tab**
2. Run **"Gap Analysis"**
3. Review suggested topics
4. Accept or reject suggestions

### Expand by Competitor

If you've added competitors:

1. Go to **Analysis Tab**
2. Run **"Competitor Gap Analysis"**
3. See topics competitors cover that you don't
4. Add relevant ones to your map

## Expansion Settings

### Depth Control

| Setting | Result |
|---------|--------|
| Shallow | Direct sub-topics only |
| Medium | Sub-topics plus related concepts |
| Deep | Comprehensive exploration |

### Topic Count

- **5 topics**: Quick exploration
- **10 topics**: Standard expansion
- **20 topics**: Comprehensive coverage

### Filter Options

- **Exclude existing**: Don't suggest what you have
- **Focus on**: Informational/Commercial bias
- **Match style**: Keep similar topic format

## Expansion Best Practices

### Do This:
- Expand Core topics to find supporting content
- Expand gaps identified by analysis
- Use competitor insights for expansion
- Review each generated topic before accepting

### Don't Do This:
- Expand everything repeatedly (creates bloat)
- Accept all suggestions blindly
- Expand topics outside your expertise
- Create more topics than you can execute

## Managing Expanded Topics

After expansion:

1. **Review each new topic** - Is it relevant?
2. **Assign parents** - Organize into hierarchy
3. **Set types** - Core or Outer?
4. **Delete irrelevant** - Remove off-topic suggestions

## Quality Over Quantity

A 100-topic map with focused, expert content beats a 500-topic map with generic surface-level coverage.

**Expand strategically**, not exhaustively.
`
  },

  // ==========================================
  // CONTENT BRIEFS
  // ==========================================
  {
    category_slug: 'content-briefs',
    title: 'Understanding Content Briefs',
    slug: 'understanding-briefs',
    summary: 'Learn what content briefs are and why they matter.',
    sort_order: 0,
    feature_keys: ['modal:contentBrief'],
    search_keywords: ['brief', 'content brief', 'writing guide'],
    content: `# Understanding Content Briefs

## What is a Content Brief?

A content brief is a comprehensive writing guide for a specific topic. It tells writers:
- **What** to write about
- **How** to structure the article
- **Who** they're writing for
- **Why** this content matters
- **What** makes it different from competitors

## Why Briefs Matter

### Without a Brief
Writer gets: "Write about container gardening"
Result: Generic 500-word post that ranks nowhere

### With a Brief
Writer gets:
- Detailed outline with H2s and H3s
- Target keywords with search volume
- Reader persona and pain points
- Competitor analysis and differentiation angles
- Internal linking opportunities
- Schema markup requirements

Result: Strategic content that builds authority and ranks

## Brief Components

### 1. Core Information
- **Topic Title**: The exact title to use
- **Target Keyword**: Primary SEO target
- **Search Intent**: What users want
- **Word Count**: Recommended length

### 2. Audience Context
- **Reader Persona**: Who is reading this?
- **Pain Points**: What problem are they solving?
- **Stage in Journey**: Awareness → Consideration → Decision

### 3. Content Structure
- **Outline**: H2 and H3 headers
- **Key Points**: Must-cover information
- **Questions to Answer**: Based on "People Also Ask"

### 4. SEO Guidance
- **Secondary Keywords**: LSI and related terms
- **Internal Links**: Pages to link to
- **External Links**: Authoritative sources
- **Featured Snippet Opportunity**: Yes/No and format

### 5. Differentiation
- **Competitor Gaps**: What others miss
- **Unique Angle**: Your differentiator
- **EAV Connections**: Semantic relationships to include

## Brief Quality

Not all briefs are equal. The generator produces a **quality score** (0-100):

| Score | Meaning |
|-------|---------|
| 90-100 | Excellent - Ready to write |
| 70-89 | Good - Minor gaps |
| 50-69 | Adequate - Review recommended |
| Below 50 | Poor - Regenerate or edit |

### What Affects Quality

- **Topic specificity**: Vague topics = vague briefs
- **Available data**: More SERP data = better insights
- **EAV connections**: Semantic relationships improve depth
- **Business context**: Your pillars inform the angle

## Viewing Briefs

![Content brief modal](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/026-modal-content-brief-view.png)

Click any topic with a brief to view:
1. Select the topic
2. Click the **Brief score** or **"View Brief"**
3. Modal opens with full brief content

## Brief Status

Topics can have:
- **No Brief**: Not yet generated
- **Brief Generated**: Ready to use
- **Brief + Draft**: Content written
- **Published**: Live on your site
`
  },
  {
    category_slug: 'content-briefs',
    title: 'Generating Content Briefs',
    slug: 'generating-briefs',
    summary: 'Create comprehensive writing guides for your topics.',
    sort_order: 1,
    feature_keys: ['modal:contentBrief'],
    search_keywords: ['generate brief', 'create brief', 'brief generation'],
    content: `# Generating Content Briefs

## Single Brief Generation

### From Topic Detail Panel

1. Select a topic in the Topics tab
2. In the detail panel, find **"Generate Brief"**
3. Click the button
4. Wait for generation (30-60 seconds)
5. Brief appears in the panel

### Generation Options

Before generating, you can configure:

| Option | Description |
|--------|-------------|
| Include SERP Analysis | Analyze top-ranking pages |
| Include Competitor Content | Reference competitor approaches |
| Target Word Count | Minimum/maximum length |
| Include Schema Suggestions | Structured data recommendations |

## Bulk Brief Generation

Generate briefs for multiple topics at once:

### Method 1: Selection

1. Select multiple topics (Ctrl+Click or Shift+Click)
2. Click **"Generate Briefs"** in the action bar
3. Confirm the count
4. Monitor progress

### Method 2: Filtered Batch

1. Filter topics (e.g., Core + No Brief)
2. Click **"Generate All Filtered"**
3. Confirm
4. Generation runs in background

## Generation Time

| Count | Typical Time |
|-------|--------------|
| 1 brief | 30-60 seconds |
| 5 briefs | 2-4 minutes |
| 10 briefs | 4-8 minutes |
| 20+ briefs | 10-20 minutes |

**Note**: Batch generation runs in the background. You can continue working.

## Brief Regeneration

If a brief isn't satisfactory:

1. Open the brief
2. Click **"Regenerate"**
3. Optionally modify generation settings
4. New brief replaces old one

### When to Regenerate

- Quality score below 70
- Missing important sections
- Wrong angle or audience
- After updating topic details

## Viewing Generated Briefs

![Content brief scrolled view](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/027-modal-content-brief-scrolled.png)

The brief modal shows:

### Header Section
- Topic title and quality score
- Generation date
- Target keyword and search volume

### Outline Section
- Complete article structure
- H2 and H3 headers
- Key points under each section

### SEO Section
- Primary and secondary keywords
- Internal linking recommendations
- Featured snippet opportunities

### Research Section
- Competitor analysis
- SERP features present
- Questions to answer

## Exporting Briefs

Export briefs for writers or stakeholders:

1. Open the brief
2. Click **"Export"**
3. Choose format:
   - PDF (formatted document)
   - Markdown (for content systems)
   - Google Docs (opens in Docs)
4. Share with your team

## Brief Best Practices

### For Best Results:
- Generate briefs after finalizing topics
- Use SERP analysis for competitive insights
- Review and edit before sending to writers
- Regenerate if quality score is low

### Common Issues:
- **Too generic**: Add more EAVs and business context
- **Missing sections**: Topic may be too narrow
- **Wrong angle**: Check your CSI alignment
- **No keywords**: SERP data may be unavailable
`
  },

  // ==========================================
  // ARTICLE GENERATION
  // ==========================================
  {
    category_slug: 'article-generation',
    title: 'The 9-Pass Generation System',
    slug: 'nine-pass-system',
    summary: 'Understand how multi-pass AI creates high-quality content.',
    sort_order: 0,
    feature_keys: ['modal:drafting'],
    search_keywords: ['9 pass', 'multi-pass', 'article generation', 'draft'],
    content: `# The 9-Pass Generation System

## Why Multiple Passes?

Single-prompt AI content generation produces:
- Generic, surface-level content
- Poor structure and flow
- Missing SEO optimizations
- No semantic depth

The 9-pass system fixes this by breaking content creation into specialized steps, each improving the previous output.

## The Nine Passes Explained

### Pass 1: Draft Generation
**Goal**: Create the initial article structure and content

- Writes section by section
- Follows the content brief outline
- Captures the main information
- Establishes the article foundation

### Pass 2: Header Optimization
**Goal**: Improve heading hierarchy and structure

- Optimizes H1/H2/H3 flow
- Adds keyword variations to headers
- Ensures logical progression
- Creates scannable structure

### Pass 3: Lists & Tables
**Goal**: Add structured data for featured snippets

- Converts prose to lists where appropriate
- Creates comparison tables
- Formats for featured snippet capture
- Improves scannability

### Pass 4: Visual Semantics
**Goal**: Add image placeholders with descriptive alt text

- Inserts image suggestions
- Writes semantic alt text
- Describes what images should show
- Extends visual vocabulary

### Pass 5: Micro Semantics
**Goal**: Optimize linguistic patterns

- Improves sentence structure
- Optimizes stop word usage
- Ensures subject positioning
- Enhances readability

### Pass 6: Discourse Integration
**Goal**: Add transitions and contextual bridges

- Connects sections smoothly
- Adds transitional phrases
- Creates contextual links between ideas
- Improves reading flow

### Pass 7: Introduction Synthesis
**Goal**: Rewrite the introduction with full article context

- Creates engaging hook
- Summarizes article value
- Optimizes for featured snippets
- Aligns with conclusion

### Pass 8: Final Audit
**Goal**: Quality check and optimization

- Runs 10 automated checks
- Identifies issues
- Calculates quality score
- Flags areas for improvement

### Pass 9: Schema Generation
**Goal**: Create JSON-LD structured data

- Detects page type
- Resolves entities to Wikidata
- Generates complete schema
- Validates against standards

## Pass Status Indicators

During generation, you'll see:

| Status | Meaning |
|--------|---------|
| ⏳ Pending | Not yet started |
| 🔄 Running | Currently processing |
| ✅ Complete | Finished successfully |
| ❌ Failed | Error occurred |
| ⏸️ Paused | Waiting for retry |

## Generation Time

Complete 9-pass generation typically takes:
- **Short articles** (1000 words): 3-5 minutes
- **Medium articles** (2000 words): 5-8 minutes
- **Long articles** (3000+ words): 8-12 minutes

## Resumability

The system is fully resumable:
- If generation stops, progress is saved
- Click **"Resume"** to continue
- No work is lost

## Viewing Pass Results

After generation:
1. Open the article draft
2. Navigate between pass versions
3. Compare improvements
4. Export final version

## Quality Scores

### Pass 8 Audit Score

The audit pass calculates a quality score based on:
- Readability metrics
- Keyword optimization
- Structure quality
- Semantic coverage
- Internal linking opportunities

| Score | Rating |
|-------|--------|
| 90-100 | Excellent |
| 80-89 | Good |
| 70-79 | Acceptable |
| Below 70 | Needs Work |
`
  },
  {
    category_slug: 'article-generation',
    title: 'Generating Article Drafts',
    slug: 'generating-drafts',
    summary: 'Step-by-step guide to creating AI-generated articles.',
    sort_order: 1,
    feature_keys: ['modal:drafting'],
    search_keywords: ['generate draft', 'create article', 'write content'],
    content: `# Generating Article Drafts

## Prerequisites

Before generating a draft, you need:
- A topic with a generated content brief
- AI provider configured (OpenAI or Anthropic recommended)
- Brief quality score of 70+ (recommended)

## Starting Generation

### From Topic Detail Panel

1. Select a topic with a brief
2. Click **"Generate Draft"** or **"Start Writing"**
3. The drafting modal opens

### Generation Settings

![Drafting modal](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/modal-drafting.png)

Configure your draft:

| Setting | Options | Recommendation |
|---------|---------|----------------|
| Model | GPT-4, Claude, etc. | GPT-4 or Claude for best quality |
| Target Length | Short/Medium/Long | Match brief recommendation |
| Passes | 1-9 | Use all 9 for production content |
| Style | From brief or custom | Usually from brief |

## During Generation

### Progress Tracking

The modal shows:
- Current pass name and number
- Progress percentage
- Estimated time remaining
- Section-by-section completion

### Pause and Resume

You can:
- **Pause**: Stop generation temporarily
- **Resume**: Continue from where you stopped
- **Cancel**: Abort and discard progress

### Generation Logs

Expand "Details" to see:
- AI responses for each section
- Token usage
- Error messages (if any)

## After Generation

### Viewing the Draft

Once complete:
1. The full article appears in the modal
2. Quality score is displayed
3. Pass comparison is available

### Quality Assessment

Review the audit results:
- **Overall Score**: Aggregate quality
- **Individual Checks**: Specific assessments
- **Suggestions**: AI recommendations

### Exporting the Draft

Export your article:

| Format | Best For |
|--------|----------|
| Markdown | WordPress, static sites |
| HTML | Direct publishing |
| Google Docs | Editing and collaboration |
| Word | Traditional workflows |

## Editing After Generation

The generated draft is a starting point. You should:

1. **Review for accuracy** - AI can make mistakes
2. **Add personal expertise** - Include your unique insights
3. **Verify facts** - Check any statistics or claims
4. **Add internal links** - Use the suggestions provided
5. **Optimize images** - Replace placeholders with real images

## Regeneration Options

### Regenerate Entire Draft
- Start fresh with new generation
- Previous draft is replaced

### Regenerate Specific Sections
- Keep good sections
- Only regenerate problem areas

### Regenerate from Specific Pass
- Keep passes 1-4
- Regenerate from pass 5 onward

## Common Issues

### Draft Too Generic
**Cause**: Weak content brief
**Fix**: Regenerate brief with more context, then regenerate draft

### Missing Information
**Cause**: Brief missing key sections
**Fix**: Edit brief outline, regenerate from pass 1

### Wrong Tone
**Cause**: Style mismatch
**Fix**: Update content tone settings, regenerate from pass 1

### Low Quality Score
**Cause**: Various optimization issues
**Fix**: Review audit suggestions, manually improve
`
  },

  // ==========================================
  // ANALYSIS TOOLS
  // ==========================================
  {
    category_slug: 'analysis-tools',
    title: 'Analysis Tools Overview',
    slug: 'analysis-overview',
    summary: 'Audit and improve your content strategy with built-in tools.',
    sort_order: 0,
    feature_keys: ['page:analysis'],
    search_keywords: ['analysis', 'audit', 'tools', 'quality'],
    content: `# Analysis Tools Overview

## Purpose of Analysis

Analysis tools help you:
- Validate your map structure
- Find gaps in coverage
- Identify internal linking opportunities
- Measure semantic completeness
- Compare against competitors

## Accessing Analysis

![Analysis tab dropdown](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/019-dashboard-analysis-dropdown.png)

Go to the **Analysis** tab or use the dropdown menu to access:

### Structure Validation
Checks your map for:
- Orphan topics (no parent or children)
- Circular hierarchies
- Missing topic types
- Naming inconsistencies

### Semantic Coverage
Analyzes:
- EAV coverage in topics
- Contextual completeness
- Vocabulary breadth
- Entity relationships

### Internal Linking Audit
Identifies:
- Topics that should link to each other
- Missing link opportunities
- Over-linked pages
- Link hierarchy issues

### Gap Analysis
Discovers:
- Missing sub-topics
- Competitor content you lack
- Questions you don't answer
- Semantic holes

### Publication Readiness
Checks:
- Brief completion rate
- Draft quality scores
- Missing metadata
- Export readiness

## Using Analysis Results

Each analysis produces:

### Issue List
Problems found, sorted by severity:
- 🔴 Critical - Must fix
- 🟡 Warning - Should fix
- 🟢 Info - Optional improvement

### Recommendations
Specific actions to take:
- Add topic X
- Create link between A and B
- Update brief for topic Y

### Metrics
Quantified measurements:
- Coverage percentage
- Quality scores
- Completion rates

## Analysis Best Practices

### When to Analyze

| Timing | Analysis Type |
|--------|---------------|
| After map generation | Structure Validation |
| Before brief generation | Gap Analysis |
| After briefs complete | Semantic Coverage |
| Before publishing | Publication Readiness |
| Ongoing | Internal Linking |

### Acting on Results

1. **Prioritize critical issues** - Fix red items first
2. **Batch similar fixes** - Handle all naming issues together
3. **Validate after fixes** - Re-run analysis to confirm
4. **Track over time** - Monitor quality scores
`
  },
  {
    category_slug: 'analysis-tools',
    title: 'Running Audits',
    slug: 'running-audits',
    summary: 'Step-by-step guide to running and interpreting audits.',
    sort_order: 1,
    feature_keys: ['modal:audit'],
    search_keywords: ['audit', 'run audit', 'check quality'],
    content: `# Running Audits

## Available Audits

### 1. Map Structure Audit

**What It Checks**:
- Topic hierarchy validity
- Orphan detection
- Circular reference detection
- Type distribution

**How to Run**:
1. Go to Analysis tab
2. Click **"Validate Map Structure"**
3. Review results

**Common Issues**:
- **Orphan Topics**: Topics with no parent or children
  - Fix: Assign to appropriate parent or mark as top-level pillar
- **Circular Hierarchy**: A is parent of B, B is parent of A
  - Fix: Correct the parent assignment
- **Unbalanced Types**: Too many Core or Outer topics
  - Fix: Review type assignments

### 2. Semantic Coverage Audit

**What It Checks**:
- EAV representation in topics
- Vocabulary coverage
- Entity mention frequency
- Contextual bridges

**How to Run**:
1. Go to Analysis tab
2. Click **"Semantic Coverage Analysis"**
3. Review coverage map

**Common Issues**:
- **Low EAV Coverage**: Some EAVs never appear in topics
  - Fix: Add topics covering these relationships
- **Vocabulary Gaps**: Missing important terms
  - Fix: Expand topics or update existing ones
- **Weak Entity Connections**: Topics don't reinforce CE
  - Fix: Add internal linking, update content angles

### 3. Internal Linking Audit

**What It Checks**:
- Potential link opportunities
- Existing link patterns
- Link depth and distribution
- Hub and spoke patterns

**How to Run**:
1. Go to Analysis tab
2. Click **"Internal Linking Audit"**
3. Review link recommendations

**Output Includes**:
- Suggested links (source → target)
- Link priority (high, medium, low)
- Anchor text suggestions
- Hub pages identified

### 4. Competitor Gap Analysis

**Requires**: Competitors added in Business Info

**What It Checks**:
- Topics competitors cover
- Your unique topics
- Overlap percentage
- Gap opportunities

**How to Run**:
1. Go to Analysis tab
2. Click **"Competitor Gap Analysis"**
3. Review comparison matrix

**Using Results**:
- Gaps = Topics to add
- Overlaps = Differentiation needed
- Your Unique = Competitive advantages

## Interpreting Audit Scores

### Overall Health Score

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | Excellent | Maintain and monitor |
| 75-89 | Good | Address warnings |
| 60-74 | Fair | Fix critical issues |
| Below 60 | Poor | Major revision needed |

### Issue Severity

- **Critical**: Breaks map functionality or SEO
- **Warning**: Reduces effectiveness
- **Info**: Best practice recommendations

## Scheduling Audits

Run audits:
- After initial map generation
- Before content production begins
- After major updates or expansions
- Monthly for ongoing maintenance
`
  },

  // ==========================================
  // SITE ANALYSIS
  // ==========================================
  {
    category_slug: 'site-analysis',
    title: 'Site Analysis Overview',
    slug: 'site-analysis-overview',
    summary: 'Crawl and analyze existing websites to inform your strategy.',
    sort_order: 0,
    feature_keys: ['page:siteAnalysis'],
    search_keywords: ['site analysis', 'crawl', 'website audit'],
    content: `# Site Analysis Overview

## What is Site Analysis?

Site Analysis lets you:
- Crawl your existing website
- Import existing content structure
- Compare against your topical map
- Identify gaps and opportunities

## When to Use Site Analysis

### Before Creating a Map
- Understand your current content landscape
- Import existing structure as a starting point
- Identify what's working and what's missing

### After Creating a Map
- Compare planned vs. existing content
- Find content to update vs. create new
- Prioritize based on gaps

### For Competitor Research
- Crawl competitor sites
- Understand their content strategy
- Find differentiation opportunities

## Accessing Site Analysis

![Site Analysis main screen](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/031-site-analysis-main.png)

From the Project Workspace:
1. Find the **"Site Analysis"** section
2. Click **"Open Site Analysis"**

Or from the header:
- Click **"Site Analysis"** link

## Analysis Capabilities

### Content Inventory
- All pages discovered
- Page titles and URLs
- Content length estimates
- Publication dates

### Structure Analysis
- Category/tag organization
- Internal link patterns
- Hub pages identification
- Orphan content detection

### SEO Audit
- Title tag analysis
- Meta description coverage
- Header hierarchy
- Schema markup presence

### Gap Identification
- Missing topic areas
- Thin content pages
- Outdated content
- Duplicate topics

## Integration with Topical Maps

Site Analysis connects to your maps:

1. **Import Structure**: Pull site categories into map
2. **Match Existing**: Connect topics to existing pages
3. **Identify Gaps**: See what topics need new content
4. **Update Planning**: Prioritize updates vs. new content
`
  },
  {
    category_slug: 'site-analysis',
    title: 'Running a Site Crawl',
    slug: 'running-crawl',
    summary: 'Step-by-step guide to crawling and analyzing a website.',
    sort_order: 1,
    feature_keys: ['page:siteAnalysis'],
    search_keywords: ['crawl', 'site crawl', 'website analysis'],
    content: `# Running a Site Crawl

## Starting a Crawl

### Method 1: From URL

1. Open Site Analysis
2. Click **"New Analysis"**
3. Enter the website URL
4. Configure crawl settings
5. Click **"Start Crawl"**

### Method 2: From Sitemap

1. Open Site Analysis
2. Click **"Import from Sitemap"**
3. Enter sitemap URL (e.g., example.com/sitemap.xml)
4. Click **"Import"**

### Method 3: From GSC Export

1. Export your URLs from Google Search Console
2. Open Site Analysis
3. Click **"Import from CSV"**
4. Upload your GSC export
5. Click **"Import"**

## Crawl Settings

| Setting | Description | Recommended |
|---------|-------------|-------------|
| Max Pages | Limit on pages to crawl | 500-1000 for most sites |
| Depth | How deep to crawl | 3-4 levels |
| Include Images | Crawl image URLs | Optional |
| Follow External | Crawl external links | No |
| Respect Robots | Follow robots.txt | Yes |

## During the Crawl

The crawl progress shows:
- Pages discovered
- Pages analyzed
- Current URL
- Estimated time remaining

**Large Sites**: May take 10-30 minutes for 1000+ pages

## After Crawling

### Content Inventory

View all discovered pages:
- Title and URL
- Word count (estimated)
- Links in/out
- Last modified date

### Visualizations

- **Site tree**: Hierarchical page structure
- **Link graph**: Internal linking patterns
- **Category clusters**: Content groupings

### Export Options

- Full inventory (CSV)
- Structure report (PDF)
- Gap analysis (compared to map)

## Troubleshooting Crawls

### Crawl Blocked
**Cause**: Robots.txt or server blocking
**Fix**: Use sitemap import instead

### Missing Pages
**Cause**: Depth limit or JavaScript rendering
**Fix**: Increase depth or use sitemap

### Slow Crawl
**Cause**: Server rate limiting
**Fix**: Reduce concurrent requests in settings

### Timeout Errors
**Cause**: Server not responding
**Fix**: Try again later or use smaller page batches
`
  },

  // ==========================================
  // ADMIN CONSOLE
  // ==========================================
  {
    category_slug: 'admin-console',
    title: 'Admin Console Overview',
    slug: 'admin-overview',
    summary: 'System administration for managing users, usage, and settings.',
    sort_order: 0,
    feature_keys: ['page:admin'],
    search_keywords: ['admin', 'administration', 'manage users'],
    content: `# Admin Console Overview

## What is the Admin Console?

The Admin Console is where system administrators manage:
- User accounts and permissions
- AI usage tracking and limits
- System configuration
- Help documentation

## Accessing the Admin Console

![Admin Console button](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/032-admin-main.png)

Only administrators can access the console:

1. From the Project Selection screen
2. Click **"Admin Dashboard"** button (top right)
3. Or navigate directly to /admin

**Not seeing the button?** You may not have admin privileges. Contact your system administrator.

## Admin Console Sections

### System Overview

![Admin system overview](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/033-admin-system-overview.png)

Dashboard showing:
- Total users
- Active sessions
- AI usage this period
- System health status

### User Management

![Admin users](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/036-admin-users.png)

Manage user accounts:
- View all users
- Edit user permissions
- Reset passwords
- Disable accounts

### AI Usage

![Admin AI usage](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/034-admin-ai-usage.png)

Track AI consumption:
- Usage by user
- Usage by model
- Cost estimates
- Rate limit status

### Configuration

![Admin configuration](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/035-admin-configuration.png)

System settings:
- Default AI provider
- Rate limits
- Feature flags
- Integration settings

### Help Documentation

![Admin help docs](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/037-admin-help-docs.png)

Manage help content:
- Edit articles
- Add new documentation
- Upload screenshots
- Manage categories

## Admin Best Practices

### User Management
- Regularly review user list
- Remove inactive accounts
- Assign appropriate permissions
- Monitor high-usage accounts

### Usage Monitoring
- Set usage alerts
- Review weekly reports
- Track cost trends
- Identify optimization opportunities

### System Health
- Monitor error rates
- Check API response times
- Review failed operations
- Keep documentation updated
`
  },
  {
    category_slug: 'admin-console',
    title: 'User Management',
    slug: 'user-management',
    summary: 'Add, edit, and manage user accounts.',
    sort_order: 1,
    feature_keys: ['page:admin'],
    search_keywords: ['users', 'manage users', 'permissions', 'accounts'],
    content: `# User Management

## Viewing Users

In the Admin Console, click **"Users"** tab to see:

| Column | Description |
|--------|-------------|
| Email | User's email address |
| Name | Display name |
| Role | Admin, Editor, Viewer |
| Status | Active, Invited, Disabled |
| Last Active | Last login date |
| Projects | Number of projects owned |

## User Roles

### Admin
- Full system access
- Can manage other users
- Access to Admin Console
- All features enabled

### Editor (Default)
- Create and edit projects
- Generate content
- Run analysis
- Cannot access Admin Console

### Viewer
- Read-only access
- View projects (shared with them)
- Cannot create or edit
- Cannot generate content

## Adding Users

1. Click **"Add User"** button
2. Enter email address
3. Select role
4. Click **"Send Invitation"**

User receives email with:
- Invitation link
- Temporary password
- Setup instructions

## Editing Users

1. Click on user row
2. Edit details:
   - Name
   - Role
   - Status
3. Click **"Save"**

## Disabling Users

When someone leaves or should lose access:

1. Find the user
2. Click **"Actions"** → **"Disable"**
3. Confirm

**What happens**:
- User cannot log in
- Their data is preserved
- Can be re-enabled later

## Deleting Users

⚠️ **Warning**: Deletion is permanent

1. Disable the user first
2. Transfer their projects (if needed)
3. Click **"Actions"** → **"Delete"**
4. Confirm with admin password

## User Activity

View user activity:
- Login history
- Projects created
- AI usage
- Last actions

Click user → **"Activity"** tab
`
  },
  {
    category_slug: 'admin-console',
    title: 'AI Usage Tracking',
    slug: 'ai-usage-tracking',
    summary: 'Monitor and manage AI API usage across the system.',
    sort_order: 2,
    feature_keys: ['page:admin'],
    search_keywords: ['usage', 'ai usage', 'tokens', 'costs'],
    content: `# AI Usage Tracking

## Usage Dashboard

The AI Usage section shows:

### Summary Metrics
- Total API calls this period
- Total tokens consumed
- Estimated cost
- Comparison to previous period

### By Provider

| Provider | Calls | Tokens | Est. Cost |
|----------|-------|--------|-----------|
| Gemini | 1,234 | 567K | $2.34 |
| OpenAI | 567 | 890K | $45.67 |
| Anthropic | 234 | 123K | $12.34 |

### By User

See who's using the most AI:
- User email
- Total calls
- Total tokens
- Primary provider used

### By Operation

What operations consume AI:
- Map generation
- Brief generation
- Article drafts
- Analysis tools

## Setting Limits

### System-Wide Limits

1. Go to **Configuration** → **Usage Limits**
2. Set limits:
   - Daily token limit
   - Monthly token limit
   - Per-request limit
3. Click **"Save"**

### Per-User Limits

1. Go to **Users**
2. Click user → **"Usage Limits"**
3. Set individual limits
4. Click **"Save"**

## Alerts

Configure usage alerts:

1. Go to **Configuration** → **Alerts**
2. Set thresholds:
   - 75% of limit (warning)
   - 90% of limit (critical)
   - Limit exceeded (blocked)
3. Add notification emails
4. Click **"Save"**

## Cost Management

### Reducing Costs

- Use Gemini for map generation (free tier)
- Reserve GPT-4/Claude for content writing
- Set appropriate token limits
- Review high-usage users

### Tracking Costs

- Enable cost estimates in settings
- Review weekly cost reports
- Set budget alerts
- Compare provider costs
`
  },

  // ==========================================
  // MIGRATION TOOLS
  // ==========================================
  {
    category_slug: 'migration-tools',
    title: 'Migration Workbench Overview',
    slug: 'migration-overview',
    summary: 'Import, export, and migrate your topical maps and data.',
    sort_order: 0,
    feature_keys: ['page:migration'],
    search_keywords: ['migration', 'import', 'export', 'backup'],
    content: `# Migration Workbench Overview

## What is the Migration Workbench?

The Migration Workbench handles:
- Importing maps from other tools
- Exporting your maps for backup
- Migrating between accounts
- Merging multiple maps

## Accessing the Workbench

From the Project Workspace:
1. Find **"Map Merge & Migration"** section
2. Or click **"Migration"** in the navigation

## Key Capabilities

### Import

Bring in data from:
- Previous exports (JSON)
- Spreadsheets (CSV, Excel)
- Other SEO tools (varies)
- Manual entry templates

### Export

Export your maps as:
- JSON (full fidelity)
- CSV (topics and briefs)
- Excel (formatted reports)
- PDF (strategy documents)

### Merge

Combine multiple maps:
- Select source maps
- Choose merge strategy
- Resolve duplicates
- Preserve relationships

### Backup

Create full backups:
- All maps in a project
- Include briefs and drafts
- Include settings
- Downloadable archive

## Migration Scenarios

### Scenario 1: Backup Before Major Changes
Before making significant changes:
1. Export full map as JSON
2. Save to secure location
3. Make changes
4. If needed, restore from backup

### Scenario 2: Team Handoff
When transferring ownership:
1. Export map with all data
2. Share export file
3. New owner imports to their account
4. Original can be archived

### Scenario 3: Tool Switching
Coming from another tool:
1. Export from old tool (CSV usually)
2. Map columns to our format
3. Import into new project
4. Generate briefs for imported topics

### Scenario 4: Merging Strategies
Combining two content strategies:
1. Open Merge tool
2. Select both maps
3. Choose merge rules
4. Review and resolve conflicts
5. Generate merged map
`
  },
  {
    category_slug: 'migration-tools',
    title: 'Importing and Exporting',
    slug: 'import-export',
    summary: 'Step-by-step guides for importing and exporting data.',
    sort_order: 1,
    feature_keys: ['page:migration'],
    search_keywords: ['import', 'export', 'csv', 'json'],
    content: `# Importing and Exporting

## Export Formats

### JSON Export (Recommended for Backups)

Includes everything:
- All topics with full details
- All EAVs
- Content briefs
- Draft content
- Settings and metadata

**How to Export JSON**:
1. Open your map
2. Go to **Data** tab
3. Click **"Export"** → **"JSON"**
4. Choose what to include
5. Download file

### CSV Export (For Spreadsheets)

Includes core data:
- Topic titles and types
- Keywords and intent
- Brief summaries
- Parent relationships

**How to Export CSV**:
1. Open your map
2. Go to **Data** tab
3. Click **"Export"** → **"CSV"**
4. Select columns to include
5. Download file

### Excel Export (For Reports)

Formatted spreadsheet:
- Multiple sheets (topics, briefs, analysis)
- Formatted headers
- Ready for sharing

**How to Export Excel**:
1. Open your map
2. Go to **Data** tab
3. Click **"Export"** → **"Excel"**
4. Download .xlsx file

## Importing Data

### Import from JSON

Restore a previous export:
1. Go to Project Workspace
2. Click **"Import Map"**
3. Select your JSON file
4. Choose import options:
   - Create new map
   - Merge with existing
5. Click **"Import"**

### Import from CSV

Bring in topic lists:
1. Go to Project Workspace
2. Click **"Import Topics"**
3. Upload CSV file
4. Map columns:
   - Title → Topic Name
   - Type → Core/Outer
   - Parent → Parent Topic
5. Preview import
6. Click **"Import"**

### CSV Column Mapping

| Your Column | Maps To |
|-------------|---------|
| Title, Name, Topic | Topic Name |
| Type, Category | Topic Type |
| Parent, Group | Parent Topic |
| Intent, Search Intent | Search Intent |
| Keywords, Tags | Keywords |

### Import from Other Tools

If coming from another SEO tool:
1. Export from that tool (usually CSV)
2. Review the column structure
3. Rename columns to match expected format
4. Import using CSV import
5. Review and clean up imported data

## Import Validation

Before completing import:

### Preview Screen
Shows:
- Number of topics found
- Column mapping results
- Potential issues

### Validation Warnings
- Duplicate titles
- Missing required fields
- Invalid relationships
- Format issues

### Fixing Issues
- Edit in preview screen
- Fix source file and re-upload
- Skip problematic rows

## Best Practices

### For Exports
- Export JSON regularly as backups
- Include all data in backup exports
- Store exports in secure cloud storage
- Name files with dates: "map-backup-2024-01-15.json"

### For Imports
- Always preview before importing
- Start with small batches to test
- Review imported data after
- Generate briefs for imported topics
`
  },
  {
    category_slug: 'migration-tools',
    title: 'Merging Maps',
    slug: 'merging-maps',
    summary: 'Combine multiple topical maps into one comprehensive strategy.',
    sort_order: 2,
    feature_keys: ['modal:mapMerge'],
    search_keywords: ['merge', 'combine', 'consolidate'],
    content: `# Merging Maps

## When to Merge

### Consolidating Strategies
You have separate maps for:
- Blog content
- Product pages
- Resource center
And want one unified strategy

### Team Collaboration
Different team members created maps:
- Each focused on different areas
- Now combining into master strategy

### Acquisition/Merger
Combining content from:
- Acquired company
- Merged business units
- Partner content

## Starting a Merge

1. Go to Project Workspace
2. Find **"Map Merge"** section
3. Click **"Start Merge Wizard"**

## Merge Wizard Steps

### Step 1: Select Maps

Choose maps to merge:
- Check boxes next to each map
- Minimum 2 maps required
- All must be in same project

### Step 2: Choose Base Map

Select which map is the foundation:
- Its pillars (CE, SC, CSI) become primary
- Its structure forms the baseline
- Other maps merge INTO this one

### Step 3: Duplicate Handling

How to handle same/similar topics:

| Option | Result |
|--------|--------|
| Keep Both | Both topics preserved (may need cleanup) |
| Merge Similar | AI combines similar topics |
| Prefer Base | Base map wins conflicts |
| Prefer Newest | Most recent version wins |

### Step 4: EAV Merging

How to handle EAVs:
- **Combine All**: Keep EAVs from all maps
- **Unique Only**: Remove duplicates
- **Base Priority**: Prefer base map's EAVs

### Step 5: Review

Before merging:
- See topic count (before/after)
- Review conflicts
- Check duplicate handling
- Verify EAV totals

### Step 6: Execute Merge

1. Click **"Merge Maps"**
2. Wait for processing
3. Review merged map
4. Make manual adjustments if needed

## Post-Merge Tasks

### Clean Up Duplicates
Even with smart merging, review for:
- Similar topics that should combine
- Topics with slightly different names
- Redundant content

### Verify Hierarchy
Check parent-child relationships:
- No orphaned topics
- Logical groupings
- Appropriate depth

### Update EAVs
Review semantic relationships:
- Remove redundant EAVs
- Add new connecting EAVs
- Verify category assignments

### Run Analysis
After merge:
1. Run Structure Validation
2. Run Semantic Coverage
3. Review suggestions
4. Make improvements

## Merge Best Practices

### Do
- Back up maps before merging
- Use descriptive map names
- Review results carefully
- Run analysis after merge

### Don't
- Merge incompatible niches
- Skip the review step
- Merge more than 3-4 maps at once
- Forget to clean up after
`
  },

  // ==========================================
  // EXPORT & INTEGRATION
  // ==========================================
  {
    category_slug: 'export-integration',
    title: 'Exporting Your Strategy',
    slug: 'exporting-strategy',
    summary: 'Export your topical map and content for use elsewhere.',
    sort_order: 0,
    feature_keys: ['modal:export'],
    search_keywords: ['export', 'download', 'save'],
    content: `# Exporting Your Strategy

## Export Options

![Export settings modal](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/029-modal-export-settings.png)

### Strategy Document (PDF)

A formatted document including:
- Executive summary
- Map overview
- Topic list with details
- Publication recommendations
- Next steps

**Best for**: Sharing with stakeholders, clients, team presentations

### Full Data Export (JSON)

Complete data export:
- All topics and relationships
- All briefs and drafts
- All EAVs and metadata
- Full configuration

**Best for**: Backups, migrations, development

### Topic List (CSV)

Spreadsheet-friendly format:
- Topic titles
- Types and intents
- Keywords
- Parent relationships

**Best for**: Editing in Excel, import to other tools

### Content Calendar (Excel)

Publication planning spreadsheet:
- Topics by date
- Assignment columns
- Status tracking
- Notes section

**Best for**: Editorial planning, team coordination

## Generating Reports

### Strategy Report

1. Click **"Generate Report"** button
2. Select report type: Strategy Overview
3. Choose what to include:
   - Map statistics
   - Topic breakdown
   - EAV summary
   - Recommendations
4. Click **"Generate"**
5. Download or view in browser

### Publication Plan

1. Go to **Planning** tab
2. Click **"Export Plan"**
3. Select format (PDF or Excel)
4. Download

### Audit Report

1. Run analysis/audit
2. Click **"Export Results"**
3. Choose format
4. Download

## Export to WordPress

Direct WordPress integration:
1. Configure WordPress connection in Settings
2. Select topics with briefs
3. Click **"Export to WordPress"**
4. Topics created as draft posts

**Requirements**:
- WordPress REST API enabled
- Application password configured
- Editor or higher permissions

## Export to Google Docs

Create documents in Google Drive:
1. Connect Google account in Settings
2. Select briefs or drafts
3. Click **"Export to Google Docs"**
4. Documents appear in Drive folder

## Bulk Export

Export multiple items at once:
1. Select topics (Ctrl+Click for multiple)
2. Click **"Bulk Export"**
3. Choose format
4. Download zip archive
`
  },

  // ==========================================
  // SETTINGS
  // ==========================================
  {
    category_slug: 'settings',
    title: 'API Key Configuration',
    slug: 'api-configuration',
    summary: 'Set up your AI provider API keys for content generation.',
    sort_order: 0,
    feature_keys: ['modal:settings'],
    search_keywords: ['api key', 'settings', 'configuration', 'setup'],
    content: `# API Key Configuration

## Accessing Settings

Click the **gear icon (⚙️)** in the bottom-right corner to open Settings.

![Settings modal](https://shtqshmmsrmtquuhyupl.supabase.co/storage/v1/object/public/help-screenshots/screenshots/modal-settings.png)

## API Keys Tab

### Google Gemini

**Getting Your Key**:
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**Entering the Key**:
1. Open Settings → API Keys
2. Find Gemini section
3. Paste your key
4. Click Save

**Notes**:
- Free tier: 60 requests/minute
- Good for map generation
- Fast response times

### OpenAI (GPT-4)

**Getting Your Key**:
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy immediately (shown only once)

**Entering the Key**:
1. Open Settings → API Keys
2. Find OpenAI section
3. Paste your key
4. Click Save

**Notes**:
- Pay-per-use pricing
- Best for content writing
- Requires payment method

### Anthropic (Claude)

**Getting Your Key**:
1. Go to https://console.anthropic.com/
2. Navigate to API Keys
3. Create new key
4. Copy the key

**Entering the Key**:
1. Open Settings → API Keys
2. Find Anthropic section
3. Paste your key
4. Click Save

**Notes**:
- Pay-per-use pricing
- Excellent for long-form content
- Good for nuanced writing

### OpenRouter

**Getting Your Key**:
1. Go to https://openrouter.ai/keys
2. Create an API key
3. Copy the key

**Entering the Key**:
1. Open Settings → API Keys
2. Find OpenRouter section
3. Paste your key
4. Click Save

**Notes**:
- Access to multiple models
- Pay-per-use
- Useful for experimentation

## Testing Your Keys

After entering a key:
1. Look for the ✅ indicator
2. Or click **"Test Connection"**
3. Green = working
4. Red = check the key

## Provider Selection

### Per-Operation Settings

| Operation | Recommended Provider |
|-----------|---------------------|
| Map Generation | Gemini (free/fast) |
| Brief Generation | GPT-4 or Claude |
| Article Writing | Claude or GPT-4 |
| Analysis | Gemini (cost effective) |

### Setting Defaults

1. Go to Settings → AI Providers
2. Select default for each operation
3. Click Save

## Security Notes

- Keys are encrypted at rest
- Keys are never sent to third parties
- You can rotate keys anytime
- Delete old keys from provider dashboards
`
  },
  {
    category_slug: 'settings',
    title: 'Application Preferences',
    slug: 'preferences',
    summary: 'Customize the application behavior and appearance.',
    sort_order: 1,
    feature_keys: ['modal:settings'],
    search_keywords: ['preferences', 'settings', 'customize'],
    content: `# Application Preferences

## General Settings

### Theme
- **Dark** (default): Easier on eyes for long sessions
- **Light**: High contrast for bright environments
- **System**: Follow your OS setting

### Language
- English (currently the only option)
- More languages coming soon

### Timezone
- Affects publication planning
- Set to your local timezone
- Or your target audience's timezone

## Default Values

### New Project Defaults

Pre-fill new projects with:
- Default domain
- Default industry
- Default website type
- Default AI provider

### New Map Defaults

Pre-set for new maps:
- Topic count (default: 50)
- Include Core/Outer ratio
- Default EAV categories

## Notifications

### Email Notifications

Enable/disable emails for:
- Generation complete
- Audit warnings
- Weekly summary
- System announcements

### In-App Notifications

Control notification types:
- Success messages
- Warning alerts
- Tips and hints

## Performance

### Data Loading

- **Lazy Load**: Load data as needed (faster start)
- **Preload**: Load all data upfront (smoother navigation)

### Auto-Save

- **Enabled**: Save changes automatically
- **Interval**: How often (default: 30 seconds)

### Cache

- Clear cache if experiencing issues
- Cache improves performance
- Auto-clears when needed

## Keyboard Shortcuts

View and customize shortcuts:
- Navigation shortcuts
- Action shortcuts
- Modal shortcuts

## Privacy

### Analytics

- Help improve the product (anonymous usage data)
- Disable if preferred

### Data Retention

- View what data is stored
- Request data export
- Request data deletion
`
  },

  // ==========================================
  // TROUBLESHOOTING
  // ==========================================
  {
    category_slug: 'troubleshooting',
    title: 'Common Issues',
    slug: 'common-issues',
    summary: 'Solutions to frequently encountered problems.',
    sort_order: 0,
    feature_keys: [],
    search_keywords: ['error', 'problem', 'issue', 'fix', 'help'],
    content: `# Common Issues

## API Key Issues

### "Invalid API Key"

**Symptoms**:
- Error when generating content
- "API key invalid" message

**Solutions**:
1. Check you copied the full key (no spaces)
2. Verify the key is active in provider dashboard
3. Regenerate key and try again
4. Check you're using the right provider's key

### "Rate Limited"

**Symptoms**:
- "Too many requests" error
- Generation fails repeatedly

**Solutions**:
1. Wait a few minutes and retry
2. Switch to different AI provider
3. Reduce batch size for generations
4. Upgrade your API plan

### "Insufficient Quota"

**Symptoms**:
- "Out of credits" error
- Generation stops mid-process

**Solutions**:
1. Add credits to your provider account
2. Switch to free-tier provider (Gemini)
3. Contact your admin for more quota

## Generation Issues

### Map Generation Stuck

**Symptoms**:
- Progress bar not moving
- "Generating..." for over 10 minutes

**Solutions**:
1. Check browser console for errors (F12)
2. Refresh the page and try again
3. Try smaller topic count
4. Switch AI provider
5. Clear browser cache

### Brief Generation Fails

**Symptoms**:
- Brief shows error
- Quality score is 0

**Solutions**:
1. Check topic has sufficient detail
2. Verify API key is working
3. Try regenerating the brief
4. Check network connection

### Draft Generation Incomplete

**Symptoms**:
- Draft stops mid-article
- Passes don't complete

**Solutions**:
1. Use Resume button to continue
2. Check token limits
3. Try shorter target length
4. Switch to higher-capacity model

## Interface Issues

### Page Won't Load

**Symptoms**:
- White screen
- Error messages
- Infinite loading

**Solutions**:
1. Refresh the page (Ctrl+R)
2. Clear browser cache
3. Try different browser
4. Check internet connection
5. Disable browser extensions

### Changes Not Saving

**Symptoms**:
- Edits disappear
- "Unsaved changes" persistent

**Solutions**:
1. Check internet connection
2. Refresh and re-login
3. Try different browser
4. Contact support

### Modal Won't Close

**Symptoms**:
- Escape key doesn't work
- Close button unresponsive

**Solutions**:
1. Click outside the modal
2. Press Escape key
3. Refresh the page
4. Check for JavaScript errors

## Data Issues

### Missing Topics

**Symptoms**:
- Topics disappeared
- Map shows fewer items

**Solutions**:
1. Check filter settings (clear filters)
2. Check if accidentally deleted
3. Restore from export backup
4. Contact support with map ID

### Duplicate Topics

**Symptoms**:
- Same topic appears multiple times
- After merge or import

**Solutions**:
1. Use bulk select to delete duplicates
2. Run Structure Validation
3. Manually review and clean up

## Getting More Help

If these solutions don't work:
1. Use **Ask Strategist** for AI help
2. Check for system status announcements
3. Contact support with:
   - Error message text
   - Steps to reproduce
   - Browser and version
   - Screenshot if possible
`
  },
  {
    category_slug: 'troubleshooting',
    title: 'Performance Optimization',
    slug: 'performance',
    summary: 'Tips to improve application speed and responsiveness.',
    sort_order: 1,
    feature_keys: [],
    search_keywords: ['slow', 'performance', 'speed', 'optimization'],
    content: `# Performance Optimization

## Browser Optimization

### Recommended Browsers
- Chrome (latest) - Best performance
- Edge (latest) - Good performance
- Firefox (latest) - Good performance
- Safari 15+ - Acceptable

### Browser Settings
- Enable hardware acceleration
- Clear cache periodically
- Disable unnecessary extensions
- Keep browser updated

### Tab Management
- Don't have 50+ tabs open
- Avoid having multiple instances
- Close unused applications

## Application Settings

### Data Loading
Change to lazy loading if experiencing slowdowns:
1. Settings → Performance
2. Select "Lazy Load"
3. Save

### Reduce Animation
If animations cause lag:
1. Settings → Preferences
2. Disable animations
3. Save

### Cache Management
Clear cache if app feels slow:
1. Settings → Performance
2. Click "Clear Cache"
3. Refresh browser

## Working with Large Maps

### Maps with 200+ Topics

**Recommendations**:
- Use table view instead of graph
- Filter to work with subsets
- Paginate topic list
- Export sections for review offline

### Batch Operations

When working with many items:
- Process in batches of 20-50
- Allow processing to complete
- Monitor progress
- Avoid interrupting operations

## Network Optimization

### Stable Connection
- Use wired connection if possible
- Ensure stable WiFi
- Close bandwidth-heavy applications
- Consider VPN impact

### Slow Connection Tips
- Enable data saving mode in settings
- Work with smaller batches
- Download data for offline review
- Schedule heavy operations for good connectivity

## AI Provider Performance

### Fastest Providers
1. Google Gemini (usually fastest)
2. OpenRouter (varies by model)
3. OpenAI GPT-3.5 (fast but lower quality)
4. OpenAI GPT-4 (slower but high quality)
5. Anthropic Claude (varies)

### Optimizing AI Usage
- Use fast providers for draft/testing
- Use quality providers for final content
- Batch requests when possible
- Don't interrupt mid-generation
`
  },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function clearExistingData() {
  console.log('Clearing existing help data...');

  // Delete ALL rows - use 'not is null' on id to match everything
  // Delete in correct order due to foreign keys
  const { error: e1, count: c1 } = await supabase
    .from('help_screenshots')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  console.log(`  Screenshots: deleted ${c1 || 0} rows`, e1 ? `(error: ${e1.message})` : '');

  const { error: e2, count: c2 } = await supabase
    .from('help_articles')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  console.log(`  Articles: deleted ${c2 || 0} rows`, e2 ? `(error: ${e2.message})` : '');

  const { error: e3, count: c3 } = await supabase
    .from('help_categories')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  console.log(`  Categories: deleted ${c3 || 0} rows`, e3 ? `(error: ${e3.message})` : '');

  console.log('Cleared existing data');
}

async function seedCategories(): Promise<Map<string, string>> {
  console.log('Seeding categories...');

  const categoryIdMap = new Map<string, string>();

  for (const category of CATEGORIES) {
    const { data, error } = await supabase
      .from('help_categories')
      .upsert(
        {
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          description: category.description,
          sort_order: category.sort_order
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (error) {
      console.error(`Error seeding category ${category.slug}:`, error);
    } else if (data) {
      categoryIdMap.set(category.slug, data.id);
      console.log(`  ✓ ${category.name}`);
    }
  }

  return categoryIdMap;
}

async function seedArticles(categoryIdMap: Map<string, string>) {
  console.log('\nSeeding articles...');

  for (const article of ARTICLES) {
    const categoryId = categoryIdMap.get(article.category_slug);

    if (!categoryId) {
      console.error(`  ✗ Category not found: ${article.category_slug}`);
      continue;
    }

    const { error } = await supabase
      .from('help_articles')
      .insert({
        category_id: categoryId,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        feature_keys: article.feature_keys || [],
        search_keywords: article.search_keywords || [],
        sort_order: article.sort_order,
        status: 'published',
        published_at: new Date().toISOString()
      });

    if (error) {
      console.error(`  ✗ Error seeding article ${article.slug}:`, error);
    } else {
      console.log(`  ✓ ${article.title}`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('HELP DOCUMENTATION SEEDER');
  console.log('='.repeat(60));
  console.log(`\nUsing Supabase URL: ${SUPABASE_URL}`);
  console.log(`Total categories: ${CATEGORIES.length}`);
  console.log(`Total articles: ${ARTICLES.length}\n`);

  try {
    await clearExistingData();
    const categoryIdMap = await seedCategories();
    await seedArticles(categoryIdMap);

    console.log('\n' + '='.repeat(60));
    console.log('SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nSeeded ${CATEGORIES.length} categories and ${ARTICLES.length} articles.`);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();

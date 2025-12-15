/**
 * seedHelpContent.ts
 *
 * Script to seed the help documentation database with comprehensive content.
 * Run with: npx tsx scripts/seedHelpContent.ts
 *
 * This script:
 * 1. Creates all help categories
 * 2. Generates all help articles with full content
 */

import { createClient } from '@supabase/supabase-js';

// Get credentials from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://blucvnmncvwzlwxoyoum.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =============================================================================
// CATEGORIES
// =============================================================================

const CATEGORIES = [
  { name: 'Getting Started', slug: 'getting-started', icon: '🚀', description: 'Learn the basics and get up and running quickly', sort_order: 0 },
  { name: 'Project Management', slug: 'project-management', icon: '📁', description: 'Create, load, and organize your projects', sort_order: 1 },
  { name: 'Topical Map Creation', slug: 'topical-map-creation', icon: '🗺️', description: 'Build your SEO content strategy', sort_order: 2 },
  { name: 'Working with Topics', slug: 'working-with-topics', icon: '📝', description: 'Manage and organize your content topics', sort_order: 3 },
  { name: 'Content Briefs', slug: 'content-briefs', icon: '📋', description: 'Generate and customize content briefs', sort_order: 4 },
  { name: 'Article Generation', slug: 'article-generation', icon: '✍️', description: 'AI-powered multi-pass content creation', sort_order: 5 },
  { name: 'Analysis Tools', slug: 'analysis-tools', icon: '🔍', description: 'Audit and improve your content strategy', sort_order: 6 },
  { name: 'Site Analysis', slug: 'site-analysis', icon: '🌐', description: 'Crawl and analyze existing websites', sort_order: 7 },
  { name: 'Export & Integration', slug: 'export-integration', icon: '📤', description: 'Export and integrate with other tools', sort_order: 8 },
  { name: 'Settings', slug: 'settings', icon: '⚙️', description: 'Configure API keys and preferences', sort_order: 9 },
  { name: 'Troubleshooting', slug: 'troubleshooting', icon: '🔧', description: 'Common issues and solutions', sort_order: 10 },
  { name: 'Advanced Topics', slug: 'advanced-topics', icon: '🎓', description: 'Deep dives into SEO concepts and theory', sort_order: 11 },
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
    title: 'Quick Start Guide',
    slug: 'quick-start-guide',
    summary: 'Get up and running with the Holistic SEO Topical Map Generator in minutes.',
    sort_order: 0,
    feature_keys: ['page:welcome'],
    search_keywords: ['start', 'begin', 'first', 'setup', 'tutorial'],
    content: `# Quick Start Guide

Welcome to the **Holistic SEO Topical Map Generator**! This guide will help you create your first topical map in just a few minutes.

## What is a Topical Map?

A topical map is a strategic content blueprint that organizes your website's content around a **Central Entity** (your main topic) and its related sub-topics. It helps search engines understand your expertise and improves your topical authority.

## Core Workflow (6 Steps)

1. **Create a Project** → Container for your content strategy
2. **Enter Business Info** → Define your company, domain, and value proposition
3. **Configure SEO Pillars** → Set your Central Entity and Source Context
4. **Discover EAVs** → Generate Entity-Attribute-Value semantic triples
5. **Review Competitors** → Analyze competitor topics (optional)
6. **Generate Map** → AI creates your complete topical map

## First-Time Setup Checklist

Before you begin, ensure you have:

- [ ] An active Supabase account (for data storage)
- [ ] At least one AI provider API key (Gemini, OpenAI, or Anthropic)
- [ ] A clear understanding of your website's main topic

## Getting Started

1. Click **"New Project"** on the Project Selection screen
2. Enter your project name and domain
3. Follow the wizards to configure your SEO strategy
4. Generate your topical map

## Next Steps

- Read **Creating Your First Project** for detailed project setup
- Learn about **Understanding Topical Maps** for framework concepts
- Check **API Key Configuration** in Settings
`
  },
  {
    category_slug: 'getting-started',
    title: 'Creating Your First Project',
    slug: 'creating-first-project',
    summary: 'Step-by-step guide to creating and configuring your first SEO project.',
    sort_order: 1,
    feature_keys: ['button:newProject', 'modal:createProject'],
    search_keywords: ['create', 'new', 'project', 'setup'],
    content: `# Creating Your First Project

Projects are the top-level container for your content strategy. Each project can contain multiple topical maps for different content areas.

## Step 1: Create the Project

1. From the **Project Selection** screen, click **"+ New Project"**
2. Enter a descriptive **Project Name** (e.g., "Main Website Content Strategy")
3. Enter your **Domain** (e.g., "example.com")
4. Click **"Create"**

## Step 2: Configure Business Information

After creating the project, you'll be guided through the **Business Info Wizard**:

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| Company Name | Your business name | "Acme Solutions" |
| Website Type | The type of site you're building | E-commerce, Blog, SaaS, etc. |
| Industry | Your primary industry | "Software", "Healthcare" |
| Niche | Your specific focus area | "Project Management Tools" |

### Why Website Type Matters

The **Website Type** selection affects several aspects of map generation:

- **E-commerce**: Emphasizes product categories, buyer intent topics
- **Blog/Publisher**: Focuses on informational content, editorial clusters
- **SaaS/Service**: Balances features, use cases, and support content
- **Local Business**: Prioritizes location-based, service-area topics

## Step 3: Continue to SEO Pillars

After saving business info, you'll proceed to the **SEO Pillar Wizard** to define your Central Entity and Source Context.

## Project Management Tips

- **One project per domain** is recommended
- You can create **multiple maps** within a project for different content areas
- Projects can be **renamed** but not merged
`
  },
  {
    category_slug: 'getting-started',
    title: 'Understanding Topical Maps',
    slug: 'understanding-topical-maps',
    summary: 'Learn the core concepts behind topical maps and how they improve SEO.',
    sort_order: 2,
    feature_keys: ['page:dashboard'],
    search_keywords: ['topical', 'map', 'concepts', 'theory', 'seo'],
    content: `# Understanding Topical Maps

A **Topical Map** is a hierarchical organization of content topics that demonstrates expertise to search engines and provides value to users.

## The Holistic SEO Framework

This tool implements the **Holistic SEO Framework**, which structures content around:

### Central Entity (CE)

The **Central Entity** is the main subject your website is about. Everything else revolves around this core concept.

**Example**: For a coffee roasting business, the CE might be "Coffee Roasting"

### Source Context (SC)

The **Source Context** defines how your content approaches the Central Entity based on your business model.

**Example**: "Coffee Roasting for Home Enthusiasts" vs "Coffee Roasting for Commercial Operations"

### Central Search Intent (CSI)

The **Central Search Intent** captures what users primarily want to accomplish when searching for your CE+SC combination.

## Two Content Sections

Topical maps contain two distinct sections:

### Core Section (Money Pages)

- Topics directly supporting monetization
- Closer to commercial intent
- Higher priority for creation
- Receives PageRank from Author Section

### Author Section (Authority Pages)

- Topics building expertise and trust
- Informational and educational content
- Demonstrates E-E-A-T
- Links to Core Section

## Topic Hierarchy

Topics are organized in parent-child relationships:

\`\`\`
Root Topic
├── Parent Topic
│   ├── Child Topic
│   └── Child Topic
└── Parent Topic
    └── Child Topic
\`\`\`

## Semantic Distance

Topics are assigned a **Semantic Distance** score (1-7) indicating how closely they relate to the Central Entity:

- **1**: Core concept (Central Entity itself)
- **2-3**: Primary related topics
- **4-5**: Secondary related topics
- **6-7**: Peripheral supporting topics
`
  },
  {
    category_slug: 'getting-started',
    title: 'Glossary of Terms',
    slug: 'glossary',
    summary: 'Definitions for all terms used in the Holistic SEO framework.',
    sort_order: 3,
    feature_keys: [],
    search_keywords: ['glossary', 'terms', 'definitions', 'vocabulary'],
    content: `# Glossary of Terms

Quick reference for terms used throughout the application.

## Core Concepts

### Central Entity (CE)
The main subject your website is about. The single concept around which all content revolves.

### Source Context (SC)
The specific angle or perspective from which you approach your Central Entity, typically aligned with your business model.

### Central Search Intent (CSI)
The primary user goal when searching for your CE+SC combination.

## Semantic Concepts

### EAV (Entity-Attribute-Value)
A semantic triple expressing a fact: *Coffee (Entity) has Roast Level (Attribute) of Medium (Value)*

### Semantic Distance
A score (1-7) indicating how closely a topic relates to the Central Entity. Lower = closer.

### Semantic Triple
A three-part statement expressing a relationship: Subject → Predicate → Object

### Knowledge-Based Trust (KBT)
Google's system for evaluating factual accuracy based on entity relationships.

## Content Structure

### Core Section
Topics directly supporting monetization and commercial goals. "Money pages."

### Author Section
Topics building expertise, trust, and topical authority. "Authority pages."

### Root Attribute
Universal attributes that apply to any instance of an entity type.

### Rare Attribute
Attributes that only some instances of an entity possess.

### Unique Attribute
Attributes specific to a single instance of an entity.

## Technical Terms

### Contextual Vector
The thematic direction established by keyword combinations.

### Hub-Spoke Structure
Content architecture with hub pages linking to detailed spoke pages.

### PageRank Flow
The direction authority passes through internal links.

### E-E-A-T
Experience, Expertise, Authoritativeness, Trustworthiness - Google's quality criteria.

### Response Code
Brief answer format for featured snippet optimization.

### Cost of Retrieval (CoR)
The cognitive effort required for users to find information.
`
  },

  // ==========================================
  // PROJECT MANAGEMENT
  // ==========================================
  {
    category_slug: 'project-management',
    title: 'Managing Projects',
    slug: 'managing-projects',
    summary: 'Learn how to create, load, rename, and delete projects.',
    sort_order: 0,
    feature_keys: ['page:projectSelection'],
    search_keywords: ['project', 'manage', 'create', 'delete', 'load'],
    content: `# Managing Projects

Projects are the top-level organizational unit in the application. Each project contains one or more topical maps.

## Project Selection Screen

When you log in, you'll see the **Project Selection** screen showing all your projects.

### Creating a New Project

1. Click **"+ New Project"**
2. Enter project name and domain
3. Click **"Create"**

### Loading an Existing Project

Click on any project card to load it and access its topical maps.

### Deleting a Project

1. Hover over a project card
2. Click the **trash icon**
3. Confirm deletion

**Warning**: Deleting a project removes ALL associated topical maps, topics, and content briefs. This cannot be undone.

## Best Practices

- **One project per domain**: Keep each website's strategy in its own project
- **Descriptive names**: Use clear names like "Main Blog Strategy" not "Project 1"
- **Regular backups**: Export maps before making major changes

## Project vs. Map

| Level | Purpose | Contains |
|-------|---------|----------|
| Project | Container for a domain | Multiple topical maps |
| Topical Map | Content strategy | Topics, briefs, articles |
`
  },
  {
    category_slug: 'project-management',
    title: 'Working with Multiple Maps',
    slug: 'multiple-maps',
    summary: 'How to create and manage multiple topical maps within a project.',
    sort_order: 1,
    feature_keys: ['button:newMap'],
    search_keywords: ['multiple', 'maps', 'topical', 'strategy'],
    content: `# Working with Multiple Maps

A single project can contain multiple topical maps, allowing you to organize different content strategies.

## When to Use Multiple Maps

- **Different content sections**: Blog vs. Product pages
- **Different Central Entities**: For diversified businesses
- **Testing variations**: A/B test different map structures
- **Language/region versions**: Separate maps for different markets

## Creating a New Map

From the Project Workspace:

1. Click **"+ New Map"**
2. Enter a map name
3. Complete the wizards (Business Info, SEO Pillars, EAV Discovery)
4. Generate the map

## Switching Between Maps

In the Project Dashboard sidebar:

1. Click on the **map selector dropdown**
2. Select the map you want to work with
3. The dashboard will reload with that map's data

## Map Comparison

You can compare maps side-by-side:

1. Export both maps to CSV or JSON
2. Use external tools to compare
3. Or view them in separate browser tabs

## Merging Maps

To combine topics from multiple maps:

1. Open **Analysis Tools** → **Merge Opportunities**
2. Select source and target maps
3. Review merge suggestions
4. Execute the merge
`
  },

  // ==========================================
  // TOPICAL MAP CREATION
  // ==========================================
  {
    category_slug: 'topical-map-creation',
    title: 'Business Information Setup',
    slug: 'business-info-setup',
    summary: 'Configure your company details and website type for accurate map generation.',
    sort_order: 0,
    feature_keys: ['wizard:businessInfo', 'component:BusinessInfoForm'],
    search_keywords: ['business', 'info', 'company', 'setup', 'website type'],
    content: `# Business Information Setup

The Business Information wizard captures essential details about your business that influence map generation.

## Required Fields

### Company Name
Your official business name. Used in schema markup and content generation.

### Domain
Your website domain (e.g., "example.com"). Used for:
- Internal linking suggestions
- URL structure recommendations
- Site crawling features

### Website Type
Select the category that best matches your site:

| Type | Description | Content Focus |
|------|-------------|---------------|
| **E-commerce** | Online store | Products, categories, buyer guides |
| **Blog/Publisher** | Content publication | Articles, tutorials, news |
| **SaaS/Software** | Software service | Features, use cases, documentation |
| **Local Business** | Location-based | Services, areas, reviews |
| **Corporate** | Company presence | Services, about, careers |
| **Educational** | Learning resource | Courses, tutorials, resources |
| **Portfolio** | Showcase work | Projects, case studies |

### Industry
Your broad industry category (e.g., "Technology", "Healthcare", "Finance").

### Niche
Your specific focus within the industry (e.g., "Project Management Software").

## Optional Fields

### Value Proposition
A brief statement of your unique value. Helps AI understand your positioning.

### Target Audience
Description of your ideal customer/reader.

### Monetization Model
How your site generates revenue (ads, products, services, subscriptions).

## How This Affects Map Generation

The website type and industry settings influence:

- **Topic suggestions**: Different industries have different topic patterns
- **Content types**: E-commerce gets product topics; blogs get informational topics
- **Compliance rules**: Some industries have specific content requirements
- **Semantic focus**: Different attributes are prioritized
`
  },
  {
    category_slug: 'topical-map-creation',
    title: 'Central Entity Selection',
    slug: 'central-entity-selection',
    summary: 'Define your website\'s core topic that everything else revolves around.',
    sort_order: 1,
    feature_keys: ['wizard:seoPillar', 'step:centralEntity'],
    search_keywords: ['central', 'entity', 'main', 'topic', 'core'],
    content: `# Central Entity Selection

The **Central Entity (CE)** is the most important concept in your topical map. It's the single topic that defines what your entire website is about.

## What Makes a Good Central Entity?

A strong Central Entity:

- **Is specific enough** to demonstrate expertise
- **Is broad enough** to support many subtopics
- **Aligns with your business** goals
- **Has search demand** (people search for it)

## Examples by Website Type

| Website Type | Poor CE | Good CE |
|--------------|---------|---------|
| E-commerce | "Products" | "Running Shoes" |
| SaaS | "Software" | "Project Management" |
| Blog | "Tips" | "Personal Finance" |
| Local | "Services" | "Plumbing" |

## How to Identify Your CE

Ask yourself:

1. **What single topic** do I want to be the #1 authority on?
2. **What do customers** associate my brand with?
3. **What expertise** does my business actually have?

## Common Mistakes

### Too Broad
❌ "Marketing" → Too competitive, too vague
✅ "Email Marketing Automation" → Specific, defensible

### Too Narrow
❌ "Blue Running Shoes for Marathons" → Too specific
✅ "Running Shoes" → Room to expand

### Misaligned with Business
❌ CE: "Coffee" but you sell coffee machines → Mismatched
✅ CE: "Coffee Machines" → Aligned with products

## After Selection

Once you select your CE, you'll define the **Source Context** - how your website approaches this topic based on your business model.
`
  },
  {
    category_slug: 'topical-map-creation',
    title: 'Source Context Definition',
    slug: 'source-context-definition',
    summary: 'Set how your business uniquely approaches your Central Entity.',
    sort_order: 2,
    feature_keys: ['wizard:seoPillar', 'step:sourceContext'],
    search_keywords: ['source', 'context', 'perspective', 'approach'],
    content: `# Source Context Definition

The **Source Context (SC)** defines the specific angle from which your website approaches the Central Entity. It differentiates your content from competitors covering the same topic.

## The Formula

**Central Entity + Source Context = Unique Content Strategy**

Example:
- CE: "Coffee Roasting"
- SC: "For Home Enthusiasts"
- Combined: "Coffee Roasting for Home Enthusiasts"

## How to Define Source Context

Consider these dimensions:

### 1. Audience Segment
Who specifically are you writing for?
- Beginners vs. experts
- Hobbyists vs. professionals
- B2B vs. B2C

### 2. Use Case
What will they do with your content?
- Learning and education
- Making purchase decisions
- Solving specific problems

### 3. Business Model
How does your site monetize?
- Selling products → Buyer-focused SC
- Affiliate marketing → Review-focused SC
- Lead generation → Problem-solving SC

## Examples

| Central Entity | Source Context | Result |
|---------------|----------------|--------|
| Running Shoes | For Marathon Runners | Performance-focused content |
| Running Shoes | For Beginners | Comfort and guidance content |
| Project Management | For Remote Teams | Collaboration-focused content |
| Project Management | For Agencies | Client work and billing content |

## The Predicate

You'll also select a **Predicate** (verb) that describes the action your content takes:

- **Teaches**: Educational content
- **Reviews**: Product comparisons
- **Guides**: How-to content
- **Sells**: Commercial pages

## Impact on Map Generation

Your Source Context influences:

- Which topics are suggested
- How topics are prioritized (Core vs. Author)
- The angle of content briefs
- Recommended internal linking patterns
`
  },
  {
    category_slug: 'topical-map-creation',
    title: 'Understanding EAVs',
    slug: 'understanding-eavs',
    summary: 'Learn about Entity-Attribute-Value semantic triples and their role in SEO.',
    sort_order: 3,
    feature_keys: ['wizard:eavDiscovery'],
    search_keywords: ['eav', 'entity', 'attribute', 'value', 'semantic', 'triple'],
    content: `# Understanding EAVs

**EAV** stands for **Entity-Attribute-Value**, a way of expressing semantic information that search engines understand.

## The EAV Structure

Every EAV is a three-part statement:

\`\`\`
[Entity] has [Attribute] of [Value]
\`\`\`

### Examples

| Entity | Attribute | Value |
|--------|-----------|-------|
| Coffee | Roast Level | Medium |
| Running Shoe | Cushioning | High |
| Project Management Software | Team Size | Enterprise |

## Why EAVs Matter for SEO

Search engines build **knowledge graphs** from EAV-style information:

1. **Google's Knowledge Graph** stores facts as entity relationships
2. **Knowledge-Based Trust (KBT)** evaluates accuracy using EAVs
3. **Featured Snippets** often answer EAV-structured queries
4. **Entity Salience** measures how well content establishes facts

## How EAVs Improve Your Content

When you include EAVs in your content:

- Content becomes **more specific** and authoritative
- Search engines can **extract facts** more easily
- Content **matches user queries** better
- You build **semantic relationships** between pages

## EAV Categories

EAVs are categorized by how specific they are:

### ROOT Attributes
Universal attributes that apply to ALL instances of an entity.
- *All* coffee has a roast level
- *All* running shoes have cushioning

### RARE Attributes
Attributes that only SOME instances have.
- *Some* coffee is organic certified
- *Some* running shoes have carbon plates

### UNIQUE Attributes
Attributes specific to ONE instance.
- *This specific* coffee blend's flavor notes
- *This particular* shoe's proprietary technology

## EAV Discovery

The **EAV Discovery Wizard** helps you identify relevant EAVs:

1. AI generates suggested EAVs based on your CE and SC
2. You review and customize the suggestions
3. EAVs are used to generate topic ideas
4. Content briefs include relevant EAVs to cover
`
  },
  {
    category_slug: 'topical-map-creation',
    title: 'EAV Categories Explained',
    slug: 'eav-categories',
    summary: 'Deep dive into attribute classifications: ROOT, RARE, UNIQUE, and more.',
    sort_order: 4,
    feature_keys: ['wizard:eavDiscovery', 'component:eavCategorySelect'],
    search_keywords: ['eav', 'category', 'root', 'rare', 'unique', 'classification'],
    content: `# EAV Categories Explained

EAV attributes are classified in two ways: by **specificity** and by **type**.

## Specificity Classifications

### ROOT Attributes
**Definition**: Universal attributes that apply to every instance of an entity type.

**Example for "Coffee":**
- Roast Level (all coffee has one)
- Caffeine Content (all coffee has caffeine amount)
- Origin (all coffee comes from somewhere)

**SEO Impact**: ROOT attributes create high-volume, competitive topics.

### RARE Attributes
**Definition**: Attributes that only some instances of an entity possess.

**Example for "Coffee":**
- Organic Certification (only certified coffee)
- Single Origin (only non-blend coffee)
- Award-Winning (only competition winners)

**SEO Impact**: RARE attributes create medium-competition niche topics.

### UNIQUE Attributes
**Definition**: Attributes specific to a single, named instance.

**Example for "Coffee":**
- "Starbucks Reserve" proprietary roasting
- Specific farm's micro-lot characteristics
- Brand-exclusive blends

**SEO Impact**: UNIQUE attributes create low-competition, branded topics.

### COMMON Attributes
**Definition**: Attributes shared broadly but not universally.

## Type Classifications

Attributes are also classified by what they describe:

### TYPE
What category or kind something belongs to.
- Coffee TYPE: Arabica, Robusta
- Shoe TYPE: Road, Trail, Racing

### COMPONENT
Physical or logical parts of the entity.
- Coffee COMPONENT: Beans, Water
- Shoe COMPONENT: Upper, Midsole, Outsole

### BENEFIT
Advantages or positive outcomes.
- Coffee BENEFIT: Energy boost, Antioxidants
- Shoe BENEFIT: Injury prevention, Speed improvement

### RISK
Potential downsides or concerns.
- Coffee RISK: Caffeine sensitivity, Staining
- Shoe RISK: Break-in period, Durability issues

### PROCESS
Actions or procedures related to the entity.
- Coffee PROCESS: Brewing, Grinding, Roasting
- Shoe PROCESS: Fitting, Breaking in, Cleaning

### SPECIFICATION
Measurable technical details.
- Coffee SPECIFICATION: Water temperature, Grind size
- Shoe SPECIFICATION: Stack height, Drop, Weight

## Using Categories in Content

Different categories serve different content purposes:

| Category | Content Type | User Intent |
|----------|--------------|-------------|
| ROOT | Comprehensive guides | Informational |
| RARE | Comparison articles | Consideration |
| UNIQUE | Product reviews | Transactional |
| BENEFIT | Buyer guides | Commercial |
| PROCESS | How-to tutorials | Informational |
`
  },
  {
    category_slug: 'topical-map-creation',
    title: 'Adding Custom EAVs',
    slug: 'adding-custom-eavs',
    summary: 'How to manually add and edit EAVs for your topical map.',
    sort_order: 5,
    feature_keys: ['wizard:eavDiscovery', 'button:addEav', 'component:TripleEditRow'],
    search_keywords: ['add', 'custom', 'eav', 'manual', 'edit'],
    content: `# Adding Custom EAVs

While AI generates initial EAV suggestions, you can add custom EAVs to capture your unique expertise.

## When to Add Custom EAVs

Add custom EAVs when:

- AI missed an important attribute for your niche
- You have proprietary knowledge or data
- Your business focuses on specific aspects
- You want to target specific search queries

## Adding EAVs Manually

### In the EAV Discovery Wizard

1. Scroll to the bottom of the EAV list
2. Click **"+ Add Custom EAV"**
3. Fill in the fields:
   - **Entity**: Usually your Central Entity or related concept
   - **Attribute**: The characteristic or property
   - **Value**: A specific instance of that attribute
4. Select the **Category** (ROOT, RARE, UNIQUE)
5. Select the **Classification** (TYPE, BENEFIT, PROCESS, etc.)
6. Click **"Add"**

### Best Practices

**Be Specific**
- ❌ "Coffee" / "Flavor" / "Good"
- ✅ "Single Origin Coffee" / "Tasting Notes" / "Bright Citrus Acidity"

**Use Search Language**
Think about how users would search for this attribute.

**Match User Intent**
Consider whether this EAV supports informational, navigational, or transactional content.

## Editing Existing EAVs

To edit an EAV:

1. Find the EAV in the list
2. Click the **pencil icon** or click on the row
3. Modify any field
4. Click **"Save"**

## Deleting EAVs

To remove an EAV:

1. Find the EAV in the list
2. Click the **trash icon**
3. Confirm deletion

## Bulk Import

For large numbers of EAVs, you can import from CSV:

1. Click **"Import EAVs"**
2. Upload a CSV with columns: entity, attribute, value, category, classification
3. Review the import preview
4. Click **"Confirm Import"**
`
  },
  {
    category_slug: 'topical-map-creation',
    title: 'Competitor Research',
    slug: 'competitor-research',
    summary: 'Analyze competitor topics to improve your content strategy.',
    sort_order: 6,
    feature_keys: ['wizard:competitorRefinement'],
    search_keywords: ['competitor', 'analysis', 'research', 'gaps'],
    content: `# Competitor Research

The **Competitor Refinement Wizard** helps you analyze competitor content to identify gaps and opportunities.

## How It Works

1. **Identify Competitors**: Enter 2-5 competitor domains
2. **Crawl Topics**: AI analyzes their content structure
3. **Compare Coverage**: See topic overlap and gaps
4. **Add Topics**: Import competitor topics to your map

## Accessing Competitor Research

From the Project Workspace or Dashboard:

1. Click **"Competitor Refinement"** in the wizard navigation
2. Or open **Analysis Tools** → **Competitor Analysis**

## Adding Competitors

1. Enter competitor domain (e.g., "competitor.com")
2. Click **"Add"**
3. Repeat for additional competitors (2-5 recommended)

## Analysis Results

After crawling, you'll see:

### Topic Overlap
Topics that both you and competitors cover.
- Green: You cover it well
- Yellow: You could expand coverage
- Red: Competitors cover it better

### Gap Topics
Topics competitors cover that you don't.
- High priority: Topics multiple competitors cover
- Consider adding these to your map

### Unique Topics
Topics only you cover.
- These are differentiators
- Ensure they align with your Source Context

## Importing Competitor Topics

To add competitor topics to your map:

1. Check the topics you want to import
2. Select target section (Core or Author)
3. Click **"Import Selected"**
4. Topics are added to your map for review

## Best Practices

- **Don't copy blindly**: Only import topics that fit your strategy
- **Analyze intent**: Understand WHY competitors cover each topic
- **Find gaps**: Your best opportunities are topics others miss
- **Regular updates**: Re-run competitor analysis quarterly
`
  },

  // ==========================================
  // WORKING WITH TOPICS
  // ==========================================
  {
    category_slug: 'working-with-topics',
    title: 'Core vs Outer Topics',
    slug: 'core-vs-outer-topics',
    summary: 'Understand the two-section content strategy: Core (money) and Outer (authority) pages.',
    sort_order: 0,
    feature_keys: ['section:coreTopics', 'section:outerTopics'],
    search_keywords: ['core', 'outer', 'author', 'money', 'pages'],
    content: `# Core vs Outer Topics

Topical maps are divided into two sections, each serving a different strategic purpose.

## Core Section (Money Pages)

**Purpose**: Directly support business goals and monetization.

### Characteristics
- Commercial or transactional intent
- Closer to conversion
- Product/service focused
- Higher priority for creation

### Examples
- Product pages
- Service descriptions
- Pricing comparisons
- Best-of guides
- Buyer's guides

### PageRank Flow
Core topics RECEIVE link authority from Author topics.

## Author Section (Outer Topics)

**Purpose**: Build topical authority and demonstrate expertise (E-E-A-T).

### Characteristics
- Informational intent
- Educational content
- Builds trust and credibility
- Supports Core topics

### Examples
- How-to tutorials
- Concept explanations
- Industry news analysis
- Research summaries
- Glossary content

### PageRank Flow
Author topics SEND link authority to Core topics.

## The Internal Linking Strategy

\`\`\`
[Author Topics] ---PageRank---> [Core Topics] ---Conversion---> [Revenue]
     ↑                              ↑
     |                              |
[External Links]           [Internal Links]
\`\`\`

## How to Classify Topics

Ask these questions:

| Question | Core Answer | Author Answer |
|----------|-------------|---------------|
| Does this page sell something? | Yes | No |
| Would you advertise this? | Yes | No |
| Is the intent commercial? | Yes | No |
| Does it demonstrate expertise? | Secondary | Primary |

## Balance

A healthy topical map typically has:
- **30-40%** Core topics
- **60-70%** Author topics

This creates a strong authority foundation supporting conversion pages.
`
  },
  {
    category_slug: 'working-with-topics',
    title: 'Adding Topics Manually',
    slug: 'adding-topics-manually',
    summary: 'How to add individual topics to your topical map.',
    sort_order: 1,
    feature_keys: ['button:addTopic', 'modal:newTopic'],
    search_keywords: ['add', 'topic', 'manual', 'create', 'new'],
    content: `# Adding Topics Manually

While AI generates topics automatically, you can add custom topics anytime.

## Adding a New Topic

### From the Dashboard

1. Click **"+ Add Topic"** in the topic tree
2. Or right-click on a parent topic → **"Add Child Topic"**

### Topic Fields

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | The topic/page title |
| Slug | Auto | URL-friendly version of title |
| Type | Yes | Core or Outer |
| Parent | No | Parent topic for hierarchy |
| Semantic Distance | No | Relevance to Central Entity (1-7) |
| Description | No | Brief topic summary |

## Choosing Topic Type

### Select "Core" when:
- The topic directly supports sales/conversions
- It targets commercial keywords
- It's a product, service, or comparison page

### Select "Outer" (Author) when:
- The topic builds authority
- It targets informational keywords
- It's educational or explanatory content

## Parent-Child Relationships

Topics can be nested to create hierarchy:

\`\`\`
Running Shoes (Core) [Parent]
├── Best Running Shoes for Beginners (Core)
├── Running Shoe Buying Guide (Core)
└── How to Choose Running Shoes (Outer)
    ├── Understanding Cushioning (Outer)
    └── Measuring Your Foot (Outer)
\`\`\`

### Setting a Parent

1. When adding a topic, select the **Parent** dropdown
2. Choose the existing topic it should nest under
3. The new topic appears as a child in the tree

## After Adding Topics

New topics need content briefs generated:
1. Select the topic
2. Click **"Generate Brief"** in the detail panel
3. Review and customize the brief
`
  },
  {
    category_slug: 'working-with-topics',
    title: 'AI Topic Expansion',
    slug: 'ai-topic-expansion',
    summary: 'Use AI to automatically expand topics with related subtopics.',
    sort_order: 2,
    feature_keys: ['button:expandTopic', 'button:aiExpand'],
    search_keywords: ['ai', 'expand', 'subtopics', 'generate', 'automatic'],
    content: `# AI Topic Expansion

Quickly generate subtopics using AI to expand your topical map coverage.

## How to Expand a Topic

1. Select a topic in the topic tree
2. In the topic detail panel, click **"AI Expand"** or **"Generate Subtopics"**
3. Wait for AI to generate suggestions
4. Review and approve suggested subtopics

## What AI Considers

When expanding topics, AI looks at:

- Your Central Entity and Source Context
- The parent topic's focus
- Your defined EAVs
- Semantic distance from CE
- Search intent patterns
- Common subtopic patterns for your industry

## Expansion Options

### Number of Subtopics
Choose how many subtopics to generate (3, 5, or 10).

### Depth Level
- **Shallow**: Direct subtopics only
- **Deep**: Subtopics with their own children

### Intent Bias
- **Balanced**: Mix of informational and commercial
- **Commercial**: Favor buyer-intent topics
- **Informational**: Favor educational topics

## Reviewing Suggestions

Each suggested subtopic shows:

- **Title**: Proposed topic name
- **Type**: Core or Outer classification
- **Rationale**: Why AI suggested this topic
- **Keywords**: Related search terms

### Actions
- ✅ **Accept**: Add to your map
- ❌ **Reject**: Remove from suggestions
- ✏️ **Edit**: Modify before accepting

## Best Practices

- **Expand strategically**: Don't expand every topic
- **Review relevance**: Ensure subtopics fit your Source Context
- **Check duplication**: Avoid overlapping with existing topics
- **Maintain balance**: Keep Core/Outer ratio healthy
- **Use sparingly**: Quality over quantity
`
  },
  {
    category_slug: 'working-with-topics',
    title: 'Editing and Organizing Topics',
    slug: 'editing-organizing-topics',
    summary: 'Edit topic details and reorganize your topical map structure.',
    sort_order: 3,
    feature_keys: ['panel:topicDetail', 'action:dragDrop'],
    search_keywords: ['edit', 'organize', 'drag', 'drop', 'reorder', 'move'],
    content: `# Editing and Organizing Topics

Keep your topical map well-organized as it grows.

## Editing Topic Details

### From the Topic Detail Panel

1. Select a topic in the tree
2. The detail panel appears on the right
3. Edit any field:
   - **Title**: Click to edit inline
   - **Type**: Use the Core/Outer toggle
   - **Semantic Distance**: Adjust the slider
   - **Description**: Click to expand and edit
   - **Parent**: Select new parent from dropdown

### Quick Edit Actions

- **Double-click** a topic title to rename
- **Right-click** for context menu options
- **Press Enter** to save, **Escape** to cancel

## Drag and Drop Reorganization

### Moving Topics

1. Click and hold a topic in the tree
2. Drag to the new position
3. Drop on:
   - Another topic to make it a child
   - Between topics to reorder at same level
   - The "Core" or "Outer" section headers

### Visual Indicators

While dragging:
- 🔵 Blue line: Drop position between topics
- 🟢 Green highlight: Drop as child of highlighted topic
- 🔴 Red indicator: Invalid drop position

## Bulk Operations

### Select Multiple Topics

- **Ctrl+Click**: Add individual topics to selection
- **Shift+Click**: Select range of topics
- **Ctrl+A**: Select all visible topics

### Bulk Actions

With multiple topics selected:
- **Move**: Drag all selected topics together
- **Change Type**: Convert all to Core or Outer
- **Delete**: Remove all selected topics
- **Generate Briefs**: Create briefs for all

## Topic Search

Use the search bar to find topics:
- Search by title
- Filter by type (Core/Outer)
- Filter by brief status
`
  },
  {
    category_slug: 'working-with-topics',
    title: 'Merging Topics',
    slug: 'merging-topics',
    summary: 'Combine duplicate or overlapping topics for a cleaner map.',
    sort_order: 4,
    feature_keys: ['modal:mergeMap', 'tool:mergeOpportunities'],
    search_keywords: ['merge', 'combine', 'duplicate', 'consolidate'],
    content: `# Merging Topics

Over time, topical maps can develop overlap. Merging consolidates similar topics.

## When to Merge Topics

Merge topics when:

- **Duplicate content**: Two topics cover the same thing
- **Cannibalization risk**: Topics compete for same keywords
- **Too granular**: Topics could be combined into one stronger page
- **Map cleanup**: Simplifying structure

## Types of Merges

### Topic-Level Merge
Combine two topics into one, keeping the best content from each.

### Map-Level Merge
Combine entire maps (useful when consolidating strategies).

## How to Merge Topics

### Using Merge Opportunities

1. Open **Analysis Tools** → **Merge Opportunities**
2. Review AI-suggested merge candidates
3. For each suggestion:
   - **Accept**: Merge the topics
   - **Ignore**: Keep them separate
   - **Review**: Look at both topics first

### Manual Topic Merge

1. Select two topics in the tree (Ctrl+Click)
2. Right-click → **"Merge Topics"**
3. Choose which topic to keep as primary
4. Select what to preserve:
   - Title and metadata
   - Content brief
   - Generated content
5. Click **"Merge"**

## Merge Rules

Based on the Holistic SEO framework:

### MERGE when:
- Topics target identical search intent
- Combined page would be stronger
- Topics have 80%+ keyword overlap

### KEEP SEPARATE when:
- Topics serve different user intents
- Each has distinct value proposition
- Separate pages perform well

### REMOVE (instead of merge) when:
- One topic is clearly inferior
- Topic doesn't fit Source Context
- No search demand exists

## After Merging

- Redirects may be needed if pages were published
- Content briefs may need regeneration
- Check internal linking references
`
  },

  // ==========================================
  // CONTENT BRIEFS
  // ==========================================
  {
    category_slug: 'content-briefs',
    title: 'Understanding Content Briefs',
    slug: 'understanding-content-briefs',
    summary: 'Learn what content briefs are and how they guide article creation.',
    sort_order: 0,
    feature_keys: ['modal:contentBrief'],
    search_keywords: ['brief', 'content', 'understand', 'overview'],
    content: `# Understanding Content Briefs

A **Content Brief** is a comprehensive document that guides the creation of an article or page.

## What's in a Content Brief?

Each brief contains several sections:

### 1. SERP Analysis
Insights from search engine results:
- **People Also Ask**: Common questions searchers have
- **Related Searches**: Additional keyword opportunities
- **SERP Features**: Featured snippets, knowledge panels, etc.
- **Competitor Analysis**: What top-ranking pages cover

### 2. Structured Outline
The recommended content structure:
- Heading hierarchy (H2, H3, H4)
- Topic flow and organization
- Key points to cover in each section
- Word count recommendations

### 3. Contextual Bridge
How this content connects to:
- Parent topics (link up)
- Sibling topics (link across)
- Child topics (link down)
- Related concepts (semantic connections)

### 4. Visual Semantics
Image and media recommendations:
- Suggested images and their purpose
- Alt text recommendations
- Diagram/infographic ideas
- Visual content strategy

### 5. Response Codes
Featured snippet targets:
- Question-answer pairs
- Definition boxes
- Quick facts
- Comparison tables

## Brief Status

Each brief has a status:

| Status | Meaning |
|--------|---------|
| **None** | No brief generated yet |
| **Draft** | Brief generated, not reviewed |
| **Approved** | Brief reviewed and ready for writing |
| **In Progress** | Article being written from brief |
| **Complete** | Article written and reviewed |

## Why Briefs Matter

Content briefs ensure:

1. **Consistency**: All content follows the same strategy
2. **Completeness**: No important topics are missed
3. **SEO Optimization**: Content targets right keywords
4. **Efficiency**: Writers have clear direction
5. **Quality**: Content meets E-E-A-T standards
`
  },
  {
    category_slug: 'content-briefs',
    title: 'Generating Content Briefs',
    slug: 'generating-briefs',
    summary: 'How to create AI-powered content briefs for your topics.',
    sort_order: 1,
    feature_keys: ['button:generateBrief'],
    search_keywords: ['generate', 'create', 'brief', 'ai'],
    content: `# Generating Content Briefs

Create comprehensive content briefs using AI analysis.

## Generating a Single Brief

### From the Topic Tree

1. Select a topic in the tree
2. In the topic detail panel, click **"Generate Brief"**
3. Wait for AI to analyze and generate
4. Review the generated brief

### From the Content Brief Modal

1. Open a topic's existing brief
2. Click **"Regenerate"** to create a new version

## Generation Options

### SERP Analysis Depth
- **Quick**: Basic keyword analysis
- **Standard**: Includes competitor review
- **Deep**: Full SERP analysis with PAA, related searches

### Content Type
- **Informational**: How-to, explanatory content
- **Commercial**: Buyer guides, comparisons
- **Transactional**: Product/service pages

### Word Count Target
Suggested article length (can be adjusted):
- Short: 800-1,200 words
- Medium: 1,500-2,000 words
- Long: 2,500-3,500 words
- Comprehensive: 4,000+ words

## Bulk Brief Generation

Generate briefs for multiple topics at once:

1. Select multiple topics (Ctrl+Click or Shift+Click)
2. Click **"Generate Briefs"** in the toolbar
3. Or use **Analysis Tools** → **Bulk Brief Generation**

### Batch Settings
- Maximum concurrent generations
- Priority order (Core first, or by tree order)
- Error handling (skip or retry failed topics)

## Generation Time

Brief generation time depends on:
- SERP analysis depth
- Current AI provider load
- Number of related EAVs
- Topic complexity

Typical times:
- Quick: 10-20 seconds
- Standard: 30-60 seconds
- Deep: 1-3 minutes

## After Generation

1. Review the brief for accuracy
2. Edit sections as needed
3. Set status to "Approved" when ready
4. Proceed to article generation
`
  },
  {
    category_slug: 'content-briefs',
    title: 'Brief Structure Details',
    slug: 'brief-structure',
    summary: 'Detailed explanation of each section in a content brief.',
    sort_order: 2,
    feature_keys: ['modal:contentBrief'],
    search_keywords: ['brief', 'structure', 'sections', 'outline'],
    content: `# Brief Structure Details

Deep dive into each section of a content brief.

## SERP Analysis Section

### People Also Ask (PAA)
Questions from Google's PAA feature:
- Exact questions searchers ask
- Use as H2/H3 headings
- Answer directly for featured snippets

### Related Searches
Keywords Google suggests:
- Long-tail variations
- Related topics to cover
- Internal linking opportunities

### SERP Features
What appears in search results:
- Featured snippets (target with Response Codes)
- Knowledge panels (entity-related content)
- Image packs (visual content needs)
- Video carousels (video content opportunity)

## Structured Outline Section

### Heading Hierarchy
\`\`\`
H1: Page Title
├── H2: Main Section 1
│   ├── H3: Subsection 1.1
│   └── H3: Subsection 1.2
├── H2: Main Section 2
│   └── H3: Subsection 2.1
└── H2: Conclusion
\`\`\`

### Section Instructions
Each heading includes:
- Key points to cover
- Keywords to include
- Approximate word count
- Relevant EAVs to incorporate

## Contextual Bridge Section

### Internal Link Recommendations
\`\`\`
This Page
├── Links TO (children): [subtopics to link to]
├── Links FROM (parents): [expect links from these]
└── Related Links: [sibling/related topics]
\`\`\`

### Semantic Connections
- How this topic relates to Central Entity
- Which EAVs should be mentioned
- Context for cross-linking

## Visual Semantics Section

### Image Recommendations
For each suggested image:
- Purpose (hero, explanatory, example)
- Recommended alt text
- Placement within content
- SEO value it provides

### Diagram Suggestions
- Flowcharts for processes
- Comparison tables
- Infographic ideas
- Screenshot requirements

## Response Codes Section

### Format
\`\`\`
Q: [Question from SERP or PAA]
A: [Concise 40-60 word answer]
\`\`\`

### Purpose
- Target featured snippets
- Improve voice search results
- Provide quick answers
- Increase click-through rate
`
  },
  {
    category_slug: 'content-briefs',
    title: 'Editing Content Briefs',
    slug: 'editing-briefs',
    summary: 'How to customize and improve AI-generated content briefs.',
    sort_order: 3,
    feature_keys: ['modal:contentBrief', 'button:editBrief'],
    search_keywords: ['edit', 'modify', 'customize', 'brief'],
    content: `# Editing Content Briefs

Customize AI-generated briefs to match your expertise and strategy.

## Opening the Brief Editor

1. Select a topic with an existing brief
2. Click the **brief icon** or **"View Brief"** button
3. The Content Brief Modal opens

## Editable Sections

### Editing the Outline

Click on any heading or section to edit:
- Rename headings
- Add/remove sections
- Reorder sections (drag and drop)
- Adjust word count targets

### Adding Custom Sections

1. Click **"+ Add Section"** in the outline
2. Enter heading text
3. Set heading level (H2, H3, H4)
4. Add section instructions

### Editing Response Codes

For each response code:
- Edit the question
- Refine the answer (keep 40-60 words)
- Add new response codes
- Remove irrelevant ones

### Modifying Visual Semantics

- Edit image descriptions
- Change recommended alt text
- Add specific image requirements
- Note diagram specifications

## Brief Versions

The system maintains version history:

### Viewing History
1. Click **"Version History"** in the brief modal
2. See list of previous versions with timestamps
3. Click to view any previous version
4. Option to restore a previous version

### When Versions Are Created
- After generation
- After manual edits (auto-saved)
- After regeneration

## Approval Workflow

### Setting Brief Status

1. **Draft**: Initial generated state
2. **Under Review**: Being evaluated
3. **Approved**: Ready for content generation
4. **Needs Revision**: Requires changes

### Approval Tips

Before approving, verify:
- [ ] Outline covers all key points
- [ ] Keywords are relevant
- [ ] Word count is appropriate
- [ ] Response codes are accurate
- [ ] Internal linking makes sense
`
  },

  // ==========================================
  // ARTICLE GENERATION
  // ==========================================
  {
    category_slug: 'article-generation',
    title: 'Multi-Pass Generation Overview',
    slug: 'multi-pass-overview',
    summary: 'Understanding the 9-pass article generation system.',
    sort_order: 0,
    feature_keys: ['modal:contentGeneration', 'component:ContentGenerationProgress'],
    search_keywords: ['multipass', 'generation', 'article', 'passes', 'overview'],
    content: `# Multi-Pass Generation Overview

Article generation uses a sophisticated 9-pass system for high-quality content.

## Why Multiple Passes?

Single-pass generation often produces:
- Inconsistent quality
- Missing optimizations
- Poor structure
- Limited SEO value

Multi-pass generation ensures:
- Comprehensive coverage
- Consistent optimization
- High-quality output
- Full SEO potential

## The 9 Passes

### Pass 1: Draft Generation
Creates the initial article content from the brief outline, section by section.

### Pass 2: Header Optimization
Refines heading structure for SEO and readability.

### Pass 3: Lists & Tables
Adds structured data elements for featured snippets and scanability.

### Pass 4: Visual Semantics
Inserts image placeholders with optimized alt text.

### Pass 5: Micro Semantics
Optimizes linguistic elements: modality, stop words, subject positioning.

### Pass 6: Discourse Integration
Adds transitions and contextual bridges between sections.

### Pass 7: Introduction Synthesis
Rewrites the introduction based on final content.

### Pass 8: Final Audit
Performs algorithmic audit against quality rules.

### Pass 9: Schema Generation
Creates JSON-LD structured data for the page.

## Generation Flow

\`\`\`
Content Brief
     ↓
Pass 1: Draft ──────────────────────►
Pass 2: Headers ────────────────────►
Pass 3: Lists ──────────────────────►
Pass 4: Visuals ────────────────────►
Pass 5: Micro ──────────────────────►
Pass 6: Discourse ──────────────────►
Pass 7: Intro ──────────────────────►
Pass 8: Audit ──────────────────────►
Pass 9: Schema ─────────────────────►
     ↓
Final Article + Schema
\`\`\`

## Resumability

If generation is interrupted:
- Progress is saved after each pass
- Resume from the last completed pass
- No work is lost

## Time Estimates

Full generation typically takes:
- Short articles (1,000 words): 3-5 minutes
- Medium articles (2,000 words): 5-8 minutes
- Long articles (3,500+ words): 10-15 minutes
`
  },
  {
    category_slug: 'article-generation',
    title: 'Pass 1: Draft Generation',
    slug: 'pass-1-draft',
    summary: 'How the initial article draft is created section by section.',
    sort_order: 1,
    feature_keys: ['pass:draft'],
    search_keywords: ['pass', 'draft', 'generate', 'content', 'section'],
    content: `# Pass 1: Draft Generation

The first pass creates the initial article content from your content brief.

## How It Works

### Section-by-Section Generation

The draft is created one section at a time:

1. **Read the brief outline** for section requirements
2. **Generate section content** following guidelines
3. **Incorporate EAVs** relevant to the section
4. **Match word count** targets from brief
5. **Move to next section**

### Why Section-by-Section?

- Better quality control per section
- Easier error recovery
- More accurate word counts
- Resumable if interrupted

## What's Included

The draft includes:

- Full article text
- All sections from the outline
- Relevant keywords naturally included
- EAV-based semantic content
- Initial heading structure

## What's NOT Included (Yet)

Handled by later passes:

- ❌ Optimized headings (Pass 2)
- ❌ Lists and tables (Pass 3)
- ❌ Images (Pass 4)
- ❌ Fine-tuned language (Pass 5)
- ❌ Transitions (Pass 6)
- ❌ Final introduction (Pass 7)

## Progress Tracking

During Pass 1, you'll see:

- Current section being generated
- Word count progress
- Estimated time remaining
- Section completion status

## Handling Errors

If a section fails to generate:

1. **Automatic retry** (up to 3 attempts)
2. **Error logged** with details
3. **Option to retry** individual sections
4. **Skip option** to continue with other sections

## After Pass 1

Once complete:
- Draft is saved to database
- Can be viewed in the Drafting Modal
- Automatically proceeds to Pass 2
- Or pause here for manual review
`
  },
  {
    category_slug: 'article-generation',
    title: 'Pass 2: Header Optimization',
    slug: 'pass-2-headers',
    summary: 'How headings are optimized for SEO and user experience.',
    sort_order: 2,
    feature_keys: ['pass:headers'],
    search_keywords: ['headers', 'headings', 'h2', 'h3', 'optimize'],
    content: `# Pass 2: Header Optimization

Pass 2 refines the heading structure for SEO and readability.

## What Gets Optimized

### Heading Hierarchy
Ensures proper nesting:
\`\`\`
H1 (single, title)
├── H2 (main sections)
│   └── H3 (subsections)
│       └── H4 (details)
\`\`\`

### Heading Content

Headers are optimized to:
- Include primary keywords
- Be descriptive and specific
- Avoid keyword stuffing
- Match user search patterns
- Be concise (under 60 characters)

## Optimization Rules

Based on the Holistic SEO framework:

### Rule 1: Single H1
Only one H1 (the page title), clearly stating the topic.

### Rule 2: Descriptive H2s
Each H2 should:
- Be answerable as a question
- Contain key topic keywords
- Lead to distinct content

### Rule 3: Logical Hierarchy
- H3s always under H2s
- H4s always under H3s
- No skipped levels

### Rule 4: Contextual Overlap
Adjacent headings should share some semantic context while remaining distinct.

### Rule 5: Question Headers
When targeting PAA, use question format:
- ❌ "Benefits"
- ✅ "What are the benefits of [topic]?"

## Before and After

**Before (Pass 1)**:
\`\`\`
## Types of Running Shoes
### Road Running Shoes
### Trail Running Shoes
\`\`\`

**After (Pass 2)**:
\`\`\`
## What Are the Different Types of Running Shoes?
### Road Running Shoes for Pavement
### Trail Running Shoes for Off-Road Terrain
\`\`\`

## Viewing Changes

After Pass 2:
- Compare view shows before/after
- Changed headings are highlighted
- Original structure is preserved in history
`
  },
  {
    category_slug: 'article-generation',
    title: 'Pass 3: Lists and Tables',
    slug: 'pass-3-lists',
    summary: 'Adding structured content elements for featured snippets.',
    sort_order: 3,
    feature_keys: ['pass:lists'],
    search_keywords: ['lists', 'tables', 'featured', 'snippets', 'structure'],
    content: `# Pass 3: Lists and Tables

Pass 3 adds structured content elements that improve scanability and target featured snippets.

## Why Lists and Tables Matter

### For Users
- Easier to scan
- Quick information access
- Better comprehension
- Mobile-friendly

### For SEO
- Featured snippet targeting
- Better indexing
- Increased time on page
- Lower bounce rate

## What Gets Added

### Bullet Lists
For unordered information:
- Features and benefits
- Requirements and prerequisites
- Tips and recommendations

### Numbered Lists
For sequential information:
- Step-by-step processes
- Rankings and priorities
- Chronological events

### Comparison Tables
For structured comparisons:
| Feature | Option A | Option B |
|---------|----------|----------|
| Price | $99 | $149 |
| Rating | 4.5/5 | 4.8/5 |

### Definition Lists
For term-definition pairs:
- **Term**: Definition text
- **Concept**: Explanation

## Placement Rules

Lists and tables are inserted where:
- Content is naturally list-like
- Comparisons are discussed
- Steps are explained
- Features are described

## Featured Snippet Optimization

### List Snippets
Target with:
- Clear header question
- 5-8 item lists
- Consistent formatting

### Table Snippets
Target with:
- Header row labels
- 3-5 columns
- Relevant data

## Quality Checks

The system ensures:
- Lists have 3+ items (avoid 2-item lists)
- Tables have meaningful data
- No redundant structures
- Proper markdown formatting
`
  },
  {
    category_slug: 'article-generation',
    title: 'Pass 4: Visual Semantics',
    slug: 'pass-4-visuals',
    summary: 'How images and visual elements are strategically placed.',
    sort_order: 4,
    feature_keys: ['pass:visuals'],
    search_keywords: ['images', 'visual', 'alt', 'text', 'media'],
    content: `# Pass 4: Visual Semantics

Pass 4 adds image placeholders with SEO-optimized alt text and captions.

## Image Strategy

Images serve multiple purposes:
1. **Break up text** for readability
2. **Illustrate concepts** for comprehension
3. **Extend vocabulary** through alt text
4. **Target image search** results

## What Gets Added

### Hero Image
A primary image for the article:
- Placed near the top
- Represents the main topic
- Has comprehensive alt text

### Section Images
Images within sections:
- Illustrate specific points
- Break up long text blocks
- Add visual interest

### Diagram Placeholders
Suggestions for:
- Process flowcharts
- Comparison infographics
- Data visualizations

## Alt Text Optimization

Alt text follows specific rules:

### Rule 1: Vocabulary Extension
Alt text should include words NOT in surrounding text:
- ❌ "Running shoes on a track"
- ✅ "Blue Nike Pegasus 40 running shoes on Olympic-style rubberized track surface"

### Rule 2: Descriptive Detail
Include specific, factual details:
- Colors, brands, models
- Settings, contexts
- Actions, states

### Rule 3: Keyword Relevance
Naturally include relevant keywords without stuffing.

## Image Placeholder Format

Placeholders include:
\`\`\`markdown
![Alt text description](placeholder:image-id)
Caption: Image caption text here
\`\`\`

## After Generation

You'll need to:
1. Replace placeholders with actual images
2. Verify alt text accuracy
3. Add appropriate captions
4. Optimize image file sizes
`
  },
  {
    category_slug: 'article-generation',
    title: 'Viewing and Editing Generated Content',
    slug: 'viewing-editing-content',
    summary: 'How to review and edit AI-generated article content.',
    sort_order: 8,
    feature_keys: ['modal:drafting', 'component:DraftingModal'],
    search_keywords: ['view', 'edit', 'draft', 'content', 'review'],
    content: `# Viewing and Editing Generated Content

After generation, review and refine your content in the Drafting Modal.

## Opening the Drafting Modal

1. Select a topic with generated content
2. Click **"View Draft"** or the **draft icon**
3. Or access via **"Open Drafting"** button

## Modal Layout

### Left Panel: Content View
- Full article content
- Section navigation
- Word count display
- Edit mode toggle

### Right Panel: Requirements
- Content brief summary
- EAV checklist
- Keyword targets
- Quality metrics

## Viewing Options

### Rendered View
See content as it would appear on your website:
- Formatted headings
- Styled lists and tables
- Image placeholders

### Markdown View
See raw markdown source:
- Direct editing
- Formatting control
- Copy for export

### Diff View
Compare versions:
- Before/after passes
- Manual edit changes
- Previous versions

## Editing Content

### Section Editing
1. Click on a section
2. Edit in the editor panel
3. Changes auto-save

### Bulk Editing
1. Switch to Markdown View
2. Edit raw content directly
3. Preview changes in real-time

## Quality Checks

The modal shows:
- Word count vs. target
- Keyword density
- Reading level score
- SEO checklist status

## Regenerating Sections

If a section needs improvement:
1. Select the section
2. Click **"Regenerate Section"**
3. AI rewrites just that section
4. Compare with original

## Exporting Content

From the modal:
- **Copy to clipboard** (Markdown or HTML)
- **Download** as .md file
- **Export** with front matter
`
  },

  // ==========================================
  // ANALYSIS TOOLS
  // ==========================================
  {
    category_slug: 'analysis-tools',
    title: 'Analysis Tools Overview',
    slug: 'analysis-tools-overview',
    summary: 'Overview of all analysis tools available for improving your strategy.',
    sort_order: 0,
    feature_keys: ['panel:analysisTools'],
    search_keywords: ['analysis', 'tools', 'overview', 'audit'],
    content: `# Analysis Tools Overview

The Analysis Tools panel provides various tools to audit and improve your content strategy.

## Available Tools

### Knowledge Domain
Analyze the semantic scope of your topical map.
- Entity relationships
- Topic coverage gaps
- Semantic completeness

### Map Validation
Check your map for issues and improvements.
- Structural problems
- Missing content
- SEO opportunities

### Merge Opportunities
Find topics that could be consolidated.
- Duplicate detection
- Overlap analysis
- Merge recommendations

### Semantic Analysis
Deep dive into semantic relationships.
- Entity connections
- Attribute coverage
- Knowledge graph view

### Contextual Coverage
Analyze how well topics connect.
- Internal linking map
- Coverage gaps
- Context flow

### Linking Audit
Review internal linking strategy.
- Link distribution
- Orphan pages
- Over-linked topics

### Publication Planning
Plan your content rollout.
- Priority ordering
- Dependency mapping
- Schedule suggestions

## Accessing Analysis Tools

### From the Dashboard
1. Open the **Analysis Tools** panel
2. Click on any tool to open it

### From Topic Context Menu
Right-click on a topic for relevant analysis options.

## Common Workflows

### Weekly Audit
1. Run Map Validation
2. Review flagged issues
3. Run Linking Audit
4. Fix orphan pages

### Before Publishing
1. Run Contextual Coverage
2. Ensure linking is complete
3. Run Semantic Analysis
4. Verify EAV coverage
`
  },
  {
    category_slug: 'analysis-tools',
    title: 'Knowledge Domain Analysis',
    slug: 'knowledge-domain',
    summary: 'Analyze the semantic scope and entity relationships in your map.',
    sort_order: 1,
    feature_keys: ['modal:knowledgeDomain'],
    search_keywords: ['knowledge', 'domain', 'semantic', 'entities'],
    content: `# Knowledge Domain Analysis

The Knowledge Domain tool analyzes the semantic scope of your topical map.

## What It Shows

### Entity Map
Visual representation of:
- Your Central Entity at the center
- Related entities surrounding it
- Connection strength indicated by distance
- Entity types color-coded

### Coverage Analysis
How well you cover your domain:
- Core concepts covered vs. missing
- Attribute completeness
- Gap identification

### Semantic Depth
Analysis of semantic relationships:
- How many levels deep your content goes
- Breadth of topic coverage
- Semantic distance distribution

## Using the Tool

### Opening Knowledge Domain

1. Open **Analysis Tools** panel
2. Click **"Knowledge Domain"**
3. Wait for analysis to complete

### Understanding the Visualization

**Node Types:**
- 🔵 Central Entity (your CE)
- 🟢 Core Topics (money pages)
- 🟡 Author Topics (authority pages)
- ⚪ Missing/suggested entities

**Connection Lines:**
- Thick = strong relationship
- Thin = weak relationship
- Dashed = suggested connection

### Identifying Gaps

The tool highlights:
- Expected entities you don't cover
- Weak connections that need strengthening
- Over-covered areas (potential consolidation)

## Taking Action

### Adding Missing Entities
1. Click on a missing entity suggestion
2. Review the recommendation
3. Click **"Add as Topic"** to include it

### Strengthening Connections
1. Identify weak connections
2. Add internal links between topics
3. Create bridging content if needed

## Exporting Analysis

Export options:
- PNG image of the entity map
- CSV of entity relationships
- JSON of full analysis data
`
  },
  {
    category_slug: 'analysis-tools',
    title: 'Contextual Coverage Analysis',
    slug: 'contextual-coverage',
    summary: 'Analyze how well your topics connect and flow together.',
    sort_order: 2,
    feature_keys: ['modal:contextualCoverage'],
    search_keywords: ['contextual', 'coverage', 'linking', 'flow'],
    content: `# Contextual Coverage Analysis

Analyze how well your topics connect and ensure proper content flow.

## What It Measures

### Topic Connectivity
- Which topics link to which
- Orphan topics (no incoming links)
- Dead ends (no outgoing links)
- Hub topics (many connections)

### Contextual Flow
- Logical content progression
- User journey mapping
- Information architecture quality

### Gap Analysis
- Topics that should connect but don't
- Missing bridge content
- Weak contextual relationships

## The Analysis View

### Coverage Map
Visual representation showing:
- Topics as nodes
- Links as connections
- Color-coded by coverage quality:
  - 🟢 Well connected
  - 🟡 Needs improvement
  - 🔴 Poorly connected

### Metrics Panel
Key statistics:
- Average connections per topic
- Orphan topic count
- Hub topic identification
- Overall coverage score

## Understanding Results

### Orphan Topics
Topics with no incoming links:
- New visitors can't find them
- Search engines may undervalue them
- **Fix**: Add links from related topics

### Dead-End Topics
Topics with no outgoing links:
- Users can't continue their journey
- Misses internal link opportunities
- **Fix**: Add relevant outbound links

### Over-Connected Topics
Topics with too many links:
- Dilutes link equity
- May confuse users
- **Fix**: Prioritize most relevant links

## Taking Action

### Fixing Orphan Topics
1. Click on the orphan topic
2. View **"Suggested Sources"**
3. Add links from those topics

### Adding Missing Connections
1. Click on a suggested connection
2. Review the recommendation
3. Add the link to your content

### Optimizing Hub Topics
1. Review hub topic links
2. Remove low-value links
3. Strengthen high-value connections
`
  },
  {
    category_slug: 'analysis-tools',
    title: 'Linking Audit',
    slug: 'linking-audit',
    summary: 'Review and optimize your internal linking strategy.',
    sort_order: 3,
    feature_keys: ['modal:linkingAudit'],
    search_keywords: ['linking', 'audit', 'internal', 'links'],
    content: `# Linking Audit

Comprehensive review of your internal linking strategy.

## Audit Categories

### Core-to-Author Links
- Author topics should link TO Core topics
- Passes PageRank to money pages
- Check: Author → Core link count

### Hub-Spoke Patterns
- Hub pages (pillar content) should link to spokes
- Spoke pages should link back to hub
- Check: Bidirectional linking

### Sibling Links
- Related topics at same level should link
- Creates topic clusters
- Check: Horizontal linking

### Anchor Text
- Internal links should have descriptive anchors
- Avoid generic "click here"
- Check: Anchor text relevance

## Audit Results

### Summary Metrics
| Metric | Ideal | Your Score |
|--------|-------|------------|
| Orphan Rate | < 5% | ? |
| Avg Links/Page | 5-15 | ? |
| Core Link Ratio | > 60% | ? |

### Issue List
Each issue shows:
- **Topic affected**
- **Issue type** (orphan, over-linked, poor anchor)
- **Severity** (High, Medium, Low)
- **Fix recommendation**

### Quick Fix Actions
- **Add Link**: Suggest link placement
- **Update Anchor**: Improve anchor text
- **Remove Link**: Flag for removal

## Best Practices

### Optimal Link Count
- 5-15 internal links per page
- Quality over quantity
- Relevance is key

### Link Placement
- Within content (contextual)
- At natural break points
- In conclusion sections

### Anchor Text Rules
- Descriptive of target page
- Include target keywords
- Avoid exact match overuse
- Vary anchor text naturally
`
  },
  {
    category_slug: 'analysis-tools',
    title: 'Publication Planning',
    slug: 'publication-planning',
    summary: 'Plan your content publication schedule based on priorities.',
    sort_order: 4,
    feature_keys: ['modal:publicationPlanning'],
    search_keywords: ['publication', 'planning', 'schedule', 'priority'],
    content: `# Publication Planning

Strategic planning for your content publication schedule.

## How It Works

The planner analyzes your topics and suggests an optimal publication order based on:

- **Dependencies**: Which topics should exist first
- **Priorities**: Core topics vs. Author topics
- **Linking requirements**: What needs to exist for internal links
- **Seasonal relevance**: Time-sensitive content

## Publication Phases

### Phase 1: Foundation
- Central Entity content
- Core hub pages
- Essential definitions

### Phase 2: Core Expansion
- Core topic children
- Commercial content
- Conversion-focused pages

### Phase 3: Authority Building
- Author section content
- Educational resources
- Supporting content

### Phase 4: Gap Filling
- Missing subtopics
- Low-priority pages
- Supplementary content

## Using the Planner

### Viewing the Plan
1. Open **Analysis Tools** → **Publication Planning**
2. View suggested phases and order
3. Review dependencies

### Customizing the Plan

**Drag to Reorder:**
- Move topics between phases
- Adjust order within phases

**Set Priorities:**
- Mark topics as "High Priority"
- Set "Must Publish By" dates
- Flag seasonal content

**Handle Dependencies:**
- View which topics depend on others
- Ensure foundations are published first

## Calendar View

### Timeline
- Visual timeline of publication
- Phase boundaries marked
- Milestone indicators

### Export Options
- CSV for spreadsheets
- iCal for calendar apps
- JSON for custom tools

## Tracking Progress

As you publish:
1. Mark topics as "Published"
2. Add publication date
3. Plan auto-updates with progress
4. View remaining work
`
  },

  // ==========================================
  // SITE ANALYSIS
  // ==========================================
  {
    category_slug: 'site-analysis',
    title: 'Site Crawling',
    slug: 'site-crawling',
    summary: 'How to crawl and analyze existing websites.',
    sort_order: 0,
    feature_keys: ['page:siteAnalysis', 'component:SiteAnalysisToolV2'],
    search_keywords: ['crawl', 'site', 'analysis', 'existing', 'website'],
    content: `# Site Crawling

Analyze existing websites to understand their content structure and identify opportunities.

## Accessing Site Analysis

From the Project Selection screen:
1. Click **"Site Analysis"** in the navigation
2. Or click the **globe icon**

## Starting a Crawl

### Enter Domain
1. Enter the website domain (e.g., "example.com")
2. Optionally add specific paths to crawl

### Configure Settings

**Crawl Depth:**
- Shallow (2 levels): Quick overview
- Medium (4 levels): Balanced analysis
- Deep (6+ levels): Comprehensive scan

**Page Limit:**
- Set maximum pages to crawl
- Prevents runaway crawls on large sites

**Respect Robots.txt:**
- Enable to follow site's crawl rules
- Disable for your own sites only

## Crawl Progress

During crawling, you'll see:
- Pages discovered
- Pages crawled
- Errors encountered
- Estimated time remaining

## Crawl Results

### Site Structure
Visual tree of the site's content hierarchy.

### Page List
All discovered pages with:
- URL
- Title
- Meta description
- Word count
- Heading structure

### Statistics
- Total pages
- Average word count
- Missing meta data
- Duplicate content flags

## Using Results

### Import as Topics
1. Select pages to import
2. Map to your topic structure
3. Pages become topics in your map

### Gap Analysis
Compare crawl results with your existing map:
- Find topics you're missing
- Identify competitor strengths
- Discover content opportunities

### Export Data
- CSV of all pages
- JSON for custom analysis
- HTML report
`
  },
  {
    category_slug: 'site-analysis',
    title: 'Gap Analysis',
    slug: 'gap-analysis',
    summary: 'Find content gaps between your site and competitors.',
    sort_order: 1,
    feature_keys: ['tool:gapAnalysis'],
    search_keywords: ['gap', 'analysis', 'competitor', 'missing'],
    content: `# Gap Analysis

Identify content opportunities by comparing your coverage to competitors.

## How Gap Analysis Works

1. **Your Content**: Topics from your topical map
2. **Competitor Content**: Pages from crawled competitor sites
3. **Comparison**: AI identifies gaps and opportunities

## Running Gap Analysis

### Prerequisites
- An existing topical map
- At least one competitor site crawled

### Steps
1. Open **Analysis Tools** → **Gap Analysis**
2. Select competitor(s) to compare
3. Click **"Run Analysis"**
4. Review results

## Understanding Results

### Gap Types

**Content Gaps**
Topics competitors cover that you don't.
- High priority: Multiple competitors cover it
- Medium: One competitor covers it
- Low: Minor subtopic only

**Depth Gaps**
Topics you cover but not as comprehensively.
- Competitor has more subtopics
- Competitor content is longer/more detailed
- Competitor has better structure

**Quality Gaps**
Areas where competitor content is stronger.
- Better keywords targeting
- More comprehensive coverage
- Superior content format

### Opportunity Score
Each gap has a score (1-100) based on:
- Competitor coverage level
- Search volume potential
- Relevance to your CE
- Difficulty to address

## Taking Action

### Adding Gap Topics
1. Click on a gap topic
2. Review the recommendation
3. Click **"Add to Map"**
4. Topic is created with suggested brief

### Improving Depth
1. View depth gap details
2. See suggested subtopics
3. Add as children to existing topics

### Quality Improvements
1. Review quality suggestions
2. Update existing content briefs
3. Regenerate content as needed
`
  },

  // ==========================================
  // SETTINGS
  // ==========================================
  {
    category_slug: 'settings',
    title: 'API Key Configuration',
    slug: 'api-keys',
    summary: 'How to configure API keys for AI providers and services.',
    sort_order: 0,
    feature_keys: ['modal:settings', 'section:apiKeys'],
    search_keywords: ['api', 'key', 'configuration', 'setup'],
    content: `# API Key Configuration

Configure the API keys needed to power the application's AI features.

## Required API Keys

### AI Provider (Choose One)

**Gemini (Google)**
- Get key at: https://aistudio.google.com/app/apikey
- Free tier available
- Good for general use

**OpenAI**
- Get key at: https://platform.openai.com/api-keys
- GPT-4 recommended
- Best for complex content

**Anthropic (Claude)**
- Get key at: https://console.anthropic.com/
- Claude 3 models
- Excellent for analysis

## Optional API Keys

### Perplexity
- Real-time web search
- Enhanced SERP analysis
- Get key at: https://perplexity.ai/

### OpenRouter
- Access to multiple models
- Flexible provider switching
- Get key at: https://openrouter.ai/

### DataForSEO
- Advanced keyword data
- SERP analysis
- Get at: https://dataforseo.com/

## Configuring Keys

### Opening Settings

1. Click the **gear icon** (⚙️) in the bottom-right
2. Or use keyboard shortcut **Ctrl+,**

### Adding an API Key

1. Go to the **API Keys** tab
2. Find the provider section
3. Enter your API key
4. Click **"Save"**

### Verifying Keys

After saving:
- Green checkmark = key is valid
- Red X = key is invalid or expired
- Test with a simple operation

## Security

### How Keys Are Stored
- Encrypted in Supabase
- Never exposed to frontend
- Used only server-side

### Best Practices
- Use dedicated API keys for this app
- Set spending limits where available
- Rotate keys periodically
- Never share keys
`
  },
  {
    category_slug: 'settings',
    title: 'AI Provider Selection',
    slug: 'ai-providers',
    summary: 'Choose and configure your preferred AI provider.',
    sort_order: 1,
    feature_keys: ['modal:settings', 'section:aiProvider'],
    search_keywords: ['ai', 'provider', 'model', 'gemini', 'openai', 'anthropic'],
    content: `# AI Provider Selection

Choose the best AI provider for your needs.

## Available Providers

### Gemini (Google)

**Pros:**
- Generous free tier
- Fast response times
- Good for general tasks

**Cons:**
- Occasional availability issues
- Less consistent than paid options

**Best for:** Budget-conscious users, general use

### OpenAI (GPT-4)

**Pros:**
- Most capable models
- Consistent quality
- Excellent for complex tasks

**Cons:**
- Higher cost
- Rate limits on free tier

**Best for:** Professional use, complex content

### Anthropic (Claude)

**Pros:**
- Excellent analysis capabilities
- Thoughtful, nuanced output
- Good at following instructions

**Cons:**
- Premium pricing
- May be slower

**Best for:** Content analysis, detailed briefs

### OpenRouter

**Pros:**
- Access to many models
- Flexible switching
- Competitive pricing

**Cons:**
- Requires understanding model differences
- Variable quality by model

**Best for:** Power users, experimentation

## Selecting a Provider

### In Settings

1. Open **Settings** → **AI Provider** tab
2. Select your provider from dropdown
3. Choose specific model (if applicable)
4. Save settings

### Model Options

Each provider has multiple models:

**Gemini:**
- gemini-pro: Balanced
- gemini-pro-vision: With images

**OpenAI:**
- gpt-4-turbo: Best quality
- gpt-3.5-turbo: Faster, cheaper

**Anthropic:**
- claude-3-opus: Most capable
- claude-3-sonnet: Balanced
- claude-3-haiku: Fast, affordable

## Switching Providers

You can switch providers anytime:
- Settings apply globally
- In-progress operations continue with original provider
- New operations use new provider
`
  },

  // ==========================================
  // TROUBLESHOOTING
  // ==========================================
  {
    category_slug: 'troubleshooting',
    title: 'Common Errors',
    slug: 'common-errors',
    summary: 'Solutions for frequently encountered errors.',
    sort_order: 0,
    feature_keys: [],
    search_keywords: ['error', 'problem', 'issue', 'fix', 'common'],
    content: `# Common Errors

Solutions for frequently encountered errors.

## API Errors

### "API Key Invalid"
**Cause:** The API key is incorrect or expired.

**Fix:**
1. Go to Settings → API Keys
2. Verify the key is correct
3. Check if key has expired at provider
4. Generate a new key if needed

### "Rate Limit Exceeded"
**Cause:** Too many API requests in short time.

**Fix:**
1. Wait a few minutes before retrying
2. Reduce concurrent operations
3. Consider upgrading API plan
4. Switch to different provider temporarily

### "Quota Exceeded"
**Cause:** Monthly usage limit reached.

**Fix:**
1. Wait for quota reset
2. Upgrade API plan
3. Switch to different provider
4. Reduce content generation frequency

## Generation Errors

### "Generation Failed"
**Cause:** Various issues during content generation.

**Fix:**
1. Check API key validity
2. Try regenerating the section
3. Check for unusual characters in input
4. Reduce content length target

### "Timeout Error"
**Cause:** Operation took too long.

**Fix:**
1. Retry the operation
2. Generate smaller sections
3. Check internet connection
4. Try at off-peak hours

## Data Errors

### "Failed to Save"
**Cause:** Database write error.

**Fix:**
1. Check internet connection
2. Refresh the page
3. Try again
4. Contact support if persists

### "Data Not Found"
**Cause:** Referenced item no longer exists.

**Fix:**
1. Refresh the page
2. Item may have been deleted
3. Check if using correct project

## UI Errors

### Blank Screen
**Cause:** JavaScript error crashed the app.

**Fix:**
1. Refresh the page
2. Clear browser cache
3. Try incognito mode
4. Check browser console for errors

### Modal Won't Close
**Cause:** UI state issue.

**Fix:**
1. Press Escape key
2. Click outside the modal
3. Refresh the page
`
  },
  {
    category_slug: 'troubleshooting',
    title: 'Performance Issues',
    slug: 'performance-issues',
    summary: 'How to handle slow performance and optimization tips.',
    sort_order: 1,
    feature_keys: [],
    search_keywords: ['slow', 'performance', 'speed', 'optimize'],
    content: `# Performance Issues

Tips for improving application performance.

## Slow Loading

### Symptoms
- Long initial load times
- Pages taking 5+ seconds to render
- Spinning loaders that don't stop

### Solutions

**Clear Browser Cache**
1. Open browser settings
2. Clear cached images and files
3. Reload the application

**Check Internet Connection**
- Test connection speed
- Try on different network
- Restart router if needed

**Reduce Data Size**
- Work with smaller maps first
- Paginate large topic lists
- Archive unused maps

## Slow Generation

### Content Generation

**Speed Tips:**
- Use faster AI providers (GPT-3.5 vs GPT-4)
- Generate sections individually
- Reduce target word counts
- Run during off-peak hours

**Expected Times:**
- Brief generation: 30-60 seconds
- Section draft: 20-40 seconds per section
- Full article: 5-15 minutes

### Bulk Operations

When generating multiple items:
- Limit concurrent operations
- Use batch processing
- Allow time between batches

## Memory Issues

### Symptoms
- Browser becomes unresponsive
- Fan running constantly
- "Page Unresponsive" warnings

### Solutions

**Close Other Tabs**
- Reduce browser memory usage
- Close unnecessary applications

**Restart Browser**
- Clears memory leaks
- Start with just this application

**Use Lighter Browser**
- Try different browser
- Disable extensions temporarily

## Mobile Performance

### Known Limitations
- Touch gestures limited
- Slower processing
- Some features may not work

### Recommendations
- Use desktop for complex tasks
- Mobile best for viewing only
- Ensure strong wifi connection
`
  },

  // ==========================================
  // ADVANCED TOPICS
  // ==========================================
  {
    category_slug: 'advanced-topics',
    title: 'Knowledge Graph Theory',
    slug: 'knowledge-graph-theory',
    summary: 'Deep dive into how knowledge graphs power modern SEO.',
    sort_order: 0,
    feature_keys: [],
    search_keywords: ['knowledge', 'graph', 'theory', 'semantic', 'advanced'],
    content: `# Knowledge Graph Theory

Understanding how knowledge graphs power modern search engines and SEO.

## What is a Knowledge Graph?

A knowledge graph is a network of entities and their relationships:

\`\`\`
[Entity A] --[Relationship]--> [Entity B]
\`\`\`

Example:
\`\`\`
[Apple Inc.] --[headquartered_in]--> [Cupertino]
[Tim Cook] --[CEO_of]--> [Apple Inc.]
\`\`\`

## Google's Knowledge Graph

Launched in 2012, Google's Knowledge Graph:
- Contains billions of facts
- Powers Knowledge Panels
- Influences search rankings
- Enables semantic search

## How Search Engines Build Knowledge

### 1. Entity Recognition
Identifying entities in content:
- People, places, things
- Concepts, events
- Products, organizations

### 2. Relation Extraction
Understanding connections:
- "Apple makes iPhone" → makes(Apple, iPhone)
- "Tim Cook leads Apple" → CEO(Tim Cook, Apple)

### 3. Knowledge Fusion
Combining facts from multiple sources:
- Wikipedia
- Authoritative websites
- Structured data

## Knowledge-Based Trust (KBT)

Google's KBT system evaluates source reliability:

### How It Works
1. Extract facts from a page
2. Compare to known facts in Knowledge Graph
3. Score page accuracy
4. Use score in ranking

### Implications for SEO
- Accurate facts improve rankings
- Contradicting established facts hurts
- Citing authoritative sources helps
- Structured data aids extraction

## EAVs and Knowledge Graphs

Your EAVs map directly to knowledge graph structure:

| EAV Component | Knowledge Graph |
|---------------|-----------------|
| Entity | Node |
| Attribute | Edge type |
| Value | Connected node |

Example:
\`\`\`
EAV: Coffee / has origin / Ethiopia
KG: Coffee --origin--> Ethiopia
\`\`\`

## Building Topical Authority

Knowledge graphs help establish:
- **Entity Salience**: How central you are to a topic
- **Topical Coverage**: Breadth of your expertise
- **Semantic Relationships**: How concepts connect

Your topical map strategy leverages these principles to build search authority.
`
  },
  {
    category_slug: 'advanced-topics',
    title: 'Semantic Distance Deep Dive',
    slug: 'semantic-distance-deep-dive',
    summary: 'Understanding semantic distance and its role in content strategy.',
    sort_order: 1,
    feature_keys: [],
    search_keywords: ['semantic', 'distance', 'relevance', 'theory'],
    content: `# Semantic Distance Deep Dive

Understanding how semantic distance shapes your content strategy.

## What is Semantic Distance?

Semantic distance measures how conceptually close two ideas are:

- **Close distance**: Directly related concepts
- **Far distance**: Loosely connected concepts

## The 1-7 Scale

In this application, semantic distance uses a 1-7 scale:

| Level | Description | Example (CE: "Coffee") |
|-------|-------------|------------------------|
| 1 | The CE itself | Coffee |
| 2 | Core attributes | Roasting, Brewing |
| 3 | Primary related | Coffee Beans, Caffeine |
| 4 | Secondary related | Coffee Machines, Mugs |
| 5 | Extended related | Kitchen Appliances |
| 6 | Peripheral | Home Goods |
| 7 | Tangential | Lifestyle |

## Why Semantic Distance Matters

### For Topical Authority

**Close Distance (1-3)**
- Establishes core expertise
- High keyword relevance
- Direct user intent match

**Medium Distance (4-5)**
- Expands topical coverage
- Supports hub-spoke structure
- Creates linking opportunities

**Far Distance (6-7)**
- Attracts broader audience
- Builds general authority
- Provides context

### For Internal Linking

Link naturally between:
- Same level (horizontal)
- Adjacent levels (vertical)

Avoid linking between:
- Level 1 and Level 7 directly
- Unrelated branches

### For Content Prioritization

**Create First:**
1. Level 1-2 content (foundation)
2. Level 3 content (core expansion)
3. Level 4-5 content (authority building)

**Create Later:**
- Level 6-7 content (supplementary)

## Calculating Semantic Distance

The system calculates distance based on:

1. **Knowledge Graph proximity**: How many hops between entities
2. **Co-occurrence data**: How often terms appear together
3. **Taxonomy relationship**: Parent-child connections
4. **User behavior**: Search journey patterns

## Applying This Knowledge

When adding topics:
- Consider semantic distance to CE
- Maintain balance across levels
- Connect topics within 2 levels
- Build comprehensive coverage at each level
`
  },
  {
    category_slug: 'advanced-topics',
    title: 'E-E-A-T and Content Strategy',
    slug: 'eeat-content-strategy',
    summary: 'How to demonstrate Experience, Expertise, Authoritativeness, and Trust.',
    sort_order: 2,
    feature_keys: [],
    search_keywords: ['eeat', 'experience', 'expertise', 'authority', 'trust'],
    content: `# E-E-A-T and Content Strategy

Building content that demonstrates Experience, Expertise, Authoritativeness, and Trustworthiness.

## What is E-E-A-T?

E-E-A-T is Google's quality guideline framework:

- **Experience**: First-hand knowledge
- **Expertise**: Skill and knowledge
- **Authoritativeness**: Recognition as an expert
- **Trustworthiness**: Reliability and accuracy

## Experience Signals

### How to Demonstrate

**Personal Narratives**
- Share personal experiences
- Include real-world examples
- Show practical application

**Original Research**
- Conduct surveys or studies
- Share unique data
- Publish findings

**Case Studies**
- Document actual results
- Show before/after
- Include specific details

### In Your Content
\`\`\`markdown
## My Experience with [Topic]
After 10 years of [doing X], I've learned that...
\`\`\`

## Expertise Signals

### How to Demonstrate

**Depth of Knowledge**
- Cover topics comprehensively
- Explain complex concepts
- Answer advanced questions

**Credentials**
- Author bios with qualifications
- Professional certifications
- Published works

**Technical Accuracy**
- Cite sources
- Use correct terminology
- Update with new information

### In Your Content

Include expert-level details that only someone with deep knowledge would know.

## Authoritativeness Signals

### How to Build

**External Recognition**
- Earn backlinks from authorities
- Get mentioned in publications
- Speak at industry events

**Social Proof**
- Customer testimonials
- Industry awards
- Professional associations

**Consistent Publishing**
- Regular content updates
- Long-term presence
- Growing content library

### In Your Map

Your topical map structure itself demonstrates authority by:
- Comprehensive coverage
- Logical organization
- Clear expertise areas

## Trustworthiness Signals

### How to Build

**Accuracy**
- Fact-check all content
- Update outdated information
- Correct errors promptly

**Transparency**
- Clear about sponsorships
- Honest about limitations
- Privacy policy present

**Security**
- HTTPS encryption
- Safe browsing
- Contact information

### Content Guidelines

- Never make unverifiable claims
- Always cite sources
- Disclose affiliations
- Be balanced and fair
`
  }
];

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function seedCategories() {
  console.log('Seeding categories...');

  for (const cat of CATEGORIES) {
    const { error } = await supabase
      .from('help_categories')
      .upsert(
        {
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          description: cat.description,
          sort_order: cat.sort_order,
          is_published: true
        },
        { onConflict: 'slug' }
      );

    if (error) {
      console.error(`Failed to upsert category ${cat.slug}:`, error);
    } else {
      console.log(`  ✓ ${cat.name}`);
    }
  }
}

async function seedArticles() {
  console.log('\nSeeding articles...');

  // First, get category IDs
  const { data: categories, error: catError } = await supabase
    .from('help_categories')
    .select('id, slug');

  if (catError) {
    console.error('Failed to fetch categories:', catError);
    return;
  }

  const categoryMap = new Map(categories?.map(c => [c.slug, c.id]) || []);

  for (const article of ARTICLES) {
    const categoryId = categoryMap.get(article.category_slug);

    if (!categoryId) {
      console.error(`  ✗ Category not found: ${article.category_slug} for article ${article.title}`);
      continue;
    }

    const { error } = await supabase
      .from('help_articles')
      .upsert(
        {
          category_id: categoryId,
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          content: article.content,
          sort_order: article.sort_order,
          feature_keys: article.feature_keys || [],
          search_keywords: article.search_keywords || [],
          status: 'published',
          published_at: new Date().toISOString()
        },
        { onConflict: 'category_id,slug' }
      );

    if (error) {
      console.error(`  ✗ Failed to upsert article ${article.slug}:`, error);
    } else {
      console.log(`  ✓ ${article.title}`);
    }
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Help Documentation Seeder');
  console.log('='.repeat(50));
  console.log(`Database: ${SUPABASE_URL}`);
  console.log('');

  await seedCategories();
  await seedArticles();

  console.log('\n' + '='.repeat(50));
  console.log('Seeding complete!');
  console.log(`Categories: ${CATEGORIES.length}`);
  console.log(`Articles: ${ARTICLES.length}`);
  console.log('='.repeat(50));
}

main().catch(console.error);

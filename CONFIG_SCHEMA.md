# Application Configuration Schema

This document is the single source of truth for all user-configurable settings in the application. It dictates the structure of the `settings_data` field in the `user_settings` table and the fields available in the `SettingsModal` component.

## 1. AI Provider Configuration

These settings control the default AI provider and model for all operations. They are managed in the "AI Providers" tab of the Settings Modal.

| Key             | Type                                                           | Description                                                                                                   |
| :-------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `aiProvider`    | `'gemini' \| 'openai' \| 'anthropic' \| 'perplexity' \| 'openrouter'` | The default AI provider to use for all generative tasks. Can be overridden on a per-map basis.                |
| `aiModel`       | `string`                                                       | The specific model to use from the selected provider (e.g., `gemini-2.5-flash`, `gpt-4o`).                        |
| `geminiApiKey`  | `string` (encrypted)                                           | The API key for Google Gemini services.                                                                       |
| `openAiApiKey`  | `string` (encrypted)                                           | The API key for OpenAI services.                                                                              |
| `anthropicApiKey`| `string` (encrypted)                                          | The API key for Anthropic (Claude) services.                                                                  |
| `perplexityApiKey`| `string` (encrypted)                                        | The API key for Perplexity AI services.                                                                       |
| `openRouterApiKey`| `string` (encrypted)                                        | The API key for OpenRouter, which acts as a proxy for multiple models.                                        |

## 2. SERP & Crawling Service Credentials

These settings are for third-party services used for fetching Search Engine Results Page (SERP) data and crawling websites. They are managed in the "SERP & Services" tab.

| Key                  | Type                 | Description                                                              |
| :------------------- | :------------------- | :----------------------------------------------------------------------- |
| `dataforseoLogin`    | `string` (encrypted) | The login email for the DataForSEO API.                                  |
| `dataforseoPassword` | `string` (encrypted) | The password (API key) for the DataForSEO API.                           |
| `apifyToken`         | `string` (encrypted) | The API token for the Apify platform, used for web scraping and crawling. |
| `firecrawlApiKey`    | `string` (encrypted) | The API key for the Firecrawl service, an alternative for web crawling.  |

## 3. Knowledge Graph & Tooling Credentials

These are credentials for services that provide knowledge graph capabilities or other specialized tools. They are managed in the "SERP & Services" tab.

| Key                 | Type                 | Description                                                                 |
| :------------------ | :------------------- | :-------------------------------------------------------------------------- |
| `infranodusApiKey`  | `string` (encrypted) | The API key for Infranodus, used for text-to-graph visualization.         |
| `jinaApiKey`        | `string` (encrypted) | The API key for Jina AI, which can be used for multimodal embedding tasks.  |
| `apitemplateApiKey` | `string` (encrypted) | The API key for APITemplate.io, used for generating PDFs or images.       |
| `neo4jUri`          | `string` (encrypted) | The connection URI for a Neo4j graph database instance (e.g., `neo4j+s://...`). |
| `neo4jUser`         | `string` (encrypted) | The username for the Neo4j database.                                        |
| `neo4jPassword`     | `string` (encrypted) | The password for the Neo4j database.                                        |
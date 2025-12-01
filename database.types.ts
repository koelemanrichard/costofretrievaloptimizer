export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_suggestions: {
        Row: {
          approved_at: string | null
          confidence: number | null
          created_at: string | null
          id: string
          model_used: string | null
          original_value: string
          page_id: string | null
          project_id: string
          reasoning: string | null
          rejection_reason: string | null
          status: string | null
          suggested_value: string
          task_id: string
          updated_at: string | null
          user_modified_value: string | null
        }
        Insert: {
          approved_at?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          model_used?: string | null
          original_value: string
          page_id?: string | null
          project_id: string
          reasoning?: string | null
          rejection_reason?: string | null
          status?: string | null
          suggested_value: string
          task_id: string
          updated_at?: string | null
          user_modified_value?: string | null
        }
        Update: {
          approved_at?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          model_used?: string | null
          original_value?: string
          page_id?: string | null
          project_id?: string
          reasoning?: string | null
          rejection_reason?: string | null
          status?: string | null
          suggested_value?: string
          task_id?: string
          updated_at?: string | null
          user_modified_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "site_analysis_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "audit_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          created_at: string
          id: string
          map_id: string
          result_data: Json | null
          result_summary: string | null
          tool_name: Database["public"]["Enums"]["analysis_tool_name"]
        }
        Insert: {
          created_at?: string
          id?: string
          map_id: string
          result_data?: Json | null
          result_summary?: string | null
          tool_name: Database["public"]["Enums"]["analysis_tool_name"]
        }
        Update: {
          created_at?: string
          id?: string
          map_id?: string
          result_data?: Json | null
          result_summary?: string | null
          tool_name?: Database["public"]["Enums"]["analysis_tool_name"]
        }
        Relationships: [
          {
            foreignKeyName: "analyses_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_history: {
        Row: {
          audit_date: string | null
          average_score: number | null
          avg_content_quality_score: number | null
          avg_link_structure_score: number | null
          avg_semantic_score: number | null
          avg_technical_score: number | null
          avg_visual_schema_score: number | null
          critical_issues: number | null
          high_issues: number | null
          id: string
          low_issues: number | null
          medium_issues: number | null
          pages_audited: number | null
          pages_changed: number | null
          project_id: string
          top_issues: Json | null
          total_pages: number | null
        }
        Insert: {
          audit_date?: string | null
          average_score?: number | null
          avg_content_quality_score?: number | null
          avg_link_structure_score?: number | null
          avg_semantic_score?: number | null
          avg_technical_score?: number | null
          avg_visual_schema_score?: number | null
          critical_issues?: number | null
          high_issues?: number | null
          id?: string
          low_issues?: number | null
          medium_issues?: number | null
          pages_audited?: number | null
          pages_changed?: number | null
          project_id: string
          top_issues?: Json | null
          total_pages?: number | null
        }
        Update: {
          audit_date?: string | null
          average_score?: number | null
          avg_content_quality_score?: number | null
          avg_link_structure_score?: number | null
          avg_semantic_score?: number | null
          avg_technical_score?: number | null
          avg_visual_schema_score?: number | null
          critical_issues?: number | null
          high_issues?: number | null
          id?: string
          low_issues?: number | null
          medium_issues?: number | null
          pages_audited?: number | null
          pages_changed?: number | null
          project_id?: string
          top_issues?: Json | null
          total_pages?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "site_analysis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_tasks: {
        Row: {
          audit_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          dismissed_reason: string | null
          estimated_impact: string | null
          has_ai_suggestion: boolean | null
          id: string
          issue_group: string | null
          page_id: string | null
          phase: string | null
          priority: string
          project_id: string
          remediation: string | null
          rule_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audit_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          dismissed_reason?: string | null
          estimated_impact?: string | null
          has_ai_suggestion?: boolean | null
          id?: string
          issue_group?: string | null
          page_id?: string | null
          phase?: string | null
          priority: string
          project_id: string
          remediation?: string | null
          rule_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audit_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          dismissed_reason?: string | null
          estimated_impact?: string | null
          has_ai_suggestion?: boolean | null
          id?: string
          issue_group?: string | null
          page_id?: string | null
          phase?: string | null
          priority?: string
          project_id?: string
          remediation?: string | null
          rule_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_tasks_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "page_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_tasks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "site_analysis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_briefs: {
        Row: {
          article_draft: string | null
          content_audit: Json | null
          contextual_bridge: Json | null
          contextual_vectors: Json | null
          created_at: string
          discourse_anchors: Json | null
          featured_snippet_target: Json | null
          id: string
          key_takeaways: Json | null
          meta_description: string | null
          methodology_note: string | null
          outline: string | null
          perspectives: Json | null
          predicted_user_journey: string | null
          query_type_format: string | null
          serp_analysis: Json | null
          status: Database["public"]["Enums"]["content_brief_status"]
          structural_template_hash: string | null
          structured_outline: Json | null
          title: string | null
          topic_id: string
          user_id: string
          visual_semantics: Json | null
          visuals: Json | null
        }
        Insert: {
          article_draft?: string | null
          content_audit?: Json | null
          contextual_bridge?: Json | null
          contextual_vectors?: Json | null
          created_at?: string
          discourse_anchors?: Json | null
          featured_snippet_target?: Json | null
          id?: string
          key_takeaways?: Json | null
          meta_description?: string | null
          methodology_note?: string | null
          outline?: string | null
          perspectives?: Json | null
          predicted_user_journey?: string | null
          query_type_format?: string | null
          serp_analysis?: Json | null
          status?: Database["public"]["Enums"]["content_brief_status"]
          structural_template_hash?: string | null
          structured_outline?: Json | null
          title?: string | null
          topic_id: string
          user_id: string
          visual_semantics?: Json | null
          visuals?: Json | null
        }
        Update: {
          article_draft?: string | null
          content_audit?: Json | null
          contextual_bridge?: Json | null
          contextual_vectors?: Json | null
          created_at?: string
          discourse_anchors?: Json | null
          featured_snippet_target?: Json | null
          id?: string
          key_takeaways?: Json | null
          meta_description?: string | null
          methodology_note?: string | null
          outline?: string | null
          perspectives?: Json | null
          predicted_user_journey?: string | null
          query_type_format?: string | null
          serp_analysis?: Json | null
          status?: Database["public"]["Enums"]["content_brief_status"]
          structural_template_hash?: string | null
          structured_outline?: Json | null
          title?: string | null
          topic_id?: string
          user_id?: string
          visual_semantics?: Json | null
          visuals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_briefs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      foundation_pages: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deletion_reason: string | null
          h1_template: string | null
          id: string
          map_id: string
          meta_description: string | null
          metadata: Json | null
          nap_data: Json | null
          page_type: string
          schema_type: string | null
          sections: Json | null
          slug: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          h1_template?: string | null
          id?: string
          map_id: string
          meta_description?: string | null
          metadata?: Json | null
          nap_data?: Json | null
          page_type: string
          schema_type?: string | null
          sections?: Json | null
          slug: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          h1_template?: string | null
          id?: string
          map_id?: string
          meta_description?: string | null
          metadata?: Json | null
          nap_data?: Json | null
          page_type?: string
          schema_type?: string | null
          sections?: Json | null
          slug?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foundation_pages_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_kv: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      navigation_structures: {
        Row: {
          created_at: string | null
          dynamic_by_section: boolean | null
          footer: Json
          header: Json
          id: string
          map_id: string
          max_footer_links: number | null
          max_header_links: number | null
          metadata: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dynamic_by_section?: boolean | null
          footer?: Json
          header?: Json
          id?: string
          map_id: string
          max_footer_links?: number | null
          max_header_links?: number | null
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dynamic_by_section?: boolean | null
          footer?: Json
          header?: Json
          id?: string
          map_id?: string
          max_footer_links?: number | null
          max_header_links?: number | null
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_structures_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: true
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_sync_status: {
        Row: {
          created_at: string | null
          id: string
          last_synced_at: string | null
          map_id: string
          pending_changes: Json | null
          requires_review: boolean | null
          topics_modified_since: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          map_id: string
          pending_changes?: Json | null
          requires_review?: boolean | null
          topics_modified_since?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          map_id?: string
          pending_changes?: Json | null
          requires_review?: boolean | null
          topics_modified_since?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_sync_status_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: true
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      page_audits: {
        Row: {
          ai_analysis_complete: boolean | null
          audit_type: string | null
          ce_alignment_explanation: string | null
          ce_alignment_score: number | null
          content_hash_at_audit: string | null
          content_quality_checks: Json | null
          content_quality_score: number | null
          content_suggestions: string[] | null
          created_at: string | null
          critical_issues_count: number | null
          csi_alignment_explanation: string | null
          csi_alignment_score: number | null
          high_issues_count: number | null
          id: string
          link_structure_checks: Json | null
          link_structure_score: number | null
          low_issues_count: number | null
          medium_issues_count: number | null
          overall_score: number | null
          page_id: string
          project_id: string
          sc_alignment_explanation: string | null
          sc_alignment_score: number | null
          semantic_checks: Json | null
          semantic_score: number | null
          summary: string | null
          technical_checks: Json | null
          technical_score: number | null
          version: number
          visual_schema_checks: Json | null
          visual_schema_score: number | null
        }
        Insert: {
          ai_analysis_complete?: boolean | null
          audit_type?: string | null
          ce_alignment_explanation?: string | null
          ce_alignment_score?: number | null
          content_hash_at_audit?: string | null
          content_quality_checks?: Json | null
          content_quality_score?: number | null
          content_suggestions?: string[] | null
          created_at?: string | null
          critical_issues_count?: number | null
          csi_alignment_explanation?: string | null
          csi_alignment_score?: number | null
          high_issues_count?: number | null
          id?: string
          link_structure_checks?: Json | null
          link_structure_score?: number | null
          low_issues_count?: number | null
          medium_issues_count?: number | null
          overall_score?: number | null
          page_id: string
          project_id: string
          sc_alignment_explanation?: string | null
          sc_alignment_score?: number | null
          semantic_checks?: Json | null
          semantic_score?: number | null
          summary?: string | null
          technical_checks?: Json | null
          technical_score?: number | null
          version?: number
          visual_schema_checks?: Json | null
          visual_schema_score?: number | null
        }
        Update: {
          ai_analysis_complete?: boolean | null
          audit_type?: string | null
          ce_alignment_explanation?: string | null
          ce_alignment_score?: number | null
          content_hash_at_audit?: string | null
          content_quality_checks?: Json | null
          content_quality_score?: number | null
          content_suggestions?: string[] | null
          created_at?: string | null
          critical_issues_count?: number | null
          csi_alignment_explanation?: string | null
          csi_alignment_score?: number | null
          high_issues_count?: number | null
          id?: string
          link_structure_checks?: Json | null
          link_structure_score?: number | null
          low_issues_count?: number | null
          medium_issues_count?: number | null
          overall_score?: number | null
          page_id?: string
          project_id?: string
          sc_alignment_explanation?: string | null
          sc_alignment_score?: number | null
          semantic_checks?: Json | null
          semantic_score?: number | null
          summary?: string | null
          technical_checks?: Json | null
          technical_score?: number | null
          version?: number
          visual_schema_checks?: Json | null
          visual_schema_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_audits_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "site_analysis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          analysis_result: Json | null
          apify_token: string | null
          created_at: string
          domain: string
          id: string
          project_name: string
          seed_keyword: string | null
          status: string | null
          status_message: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          analysis_result?: Json | null
          apify_token?: string | null
          created_at?: string
          domain: string
          id?: string
          project_name: string
          seed_keyword?: string | null
          status?: string | null
          status_message?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          analysis_result?: Json | null
          apify_token?: string | null
          created_at?: string
          domain?: string
          id?: string
          project_name?: string
          seed_keyword?: string | null
          status?: string | null
          status_message?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_analysis_projects: {
        Row: {
          central_entity: string | null
          central_entity_type: string | null
          central_search_intent: string | null
          created_at: string | null
          domain: string
          error_message: string | null
          id: string
          input_method: string | null
          last_audit_at: string | null
          linked_project_id: string | null
          name: string
          pillars_source: string | null
          pillars_validated: boolean | null
          pillars_validated_at: string | null
          sitemap_url: string | null
          source_context: string | null
          source_context_type: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          central_entity?: string | null
          central_entity_type?: string | null
          central_search_intent?: string | null
          created_at?: string | null
          domain: string
          error_message?: string | null
          id?: string
          input_method?: string | null
          last_audit_at?: string | null
          linked_project_id?: string | null
          name: string
          pillars_source?: string | null
          pillars_validated?: boolean | null
          pillars_validated_at?: string | null
          sitemap_url?: string | null
          source_context?: string | null
          source_context_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          central_entity?: string | null
          central_entity_type?: string | null
          central_search_intent?: string | null
          created_at?: string | null
          domain?: string
          error_message?: string | null
          id?: string
          input_method?: string | null
          last_audit_at?: string | null
          linked_project_id?: string | null
          name?: string
          pillars_source?: string | null
          pillars_validated?: boolean | null
          pillars_validated_at?: string | null
          sitemap_url?: string | null
          source_context?: string | null
          source_context_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_analysis_projects_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_inventory: {
        Row: {
          action: Database["public"]["Enums"]["action_type"] | null
          content_hash: string | null
          cor_score: number | null
          created_at: string | null
          dom_size: number | null
          gsc_clicks: number | null
          gsc_impressions: number | null
          gsc_position: number | null
          http_status: number | null
          id: string
          index_status: string | null
          link_count: number | null
          mapped_topic_id: string | null
          project_id: string
          section: Database["public"]["Enums"]["section_type"] | null
          status: Database["public"]["Enums"]["transition_status"] | null
          striking_distance_keywords: Json | null
          title: string | null
          ttfb_ms: number | null
          updated_at: string | null
          url: string
          word_count: number | null
        }
        Insert: {
          action?: Database["public"]["Enums"]["action_type"] | null
          content_hash?: string | null
          cor_score?: number | null
          created_at?: string | null
          dom_size?: number | null
          gsc_clicks?: number | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          http_status?: number | null
          id?: string
          index_status?: string | null
          link_count?: number | null
          mapped_topic_id?: string | null
          project_id: string
          section?: Database["public"]["Enums"]["section_type"] | null
          status?: Database["public"]["Enums"]["transition_status"] | null
          striking_distance_keywords?: Json | null
          title?: string | null
          ttfb_ms?: number | null
          updated_at?: string | null
          url: string
          word_count?: number | null
        }
        Update: {
          action?: Database["public"]["Enums"]["action_type"] | null
          content_hash?: string | null
          cor_score?: number | null
          created_at?: string | null
          dom_size?: number | null
          gsc_clicks?: number | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          http_status?: number | null
          id?: string
          index_status?: string | null
          link_count?: number | null
          mapped_topic_id?: string | null
          project_id?: string
          section?: Database["public"]["Enums"]["section_type"] | null
          status?: Database["public"]["Enums"]["transition_status"] | null
          striking_distance_keywords?: Json | null
          title?: string | null
          ttfb_ms?: number | null
          updated_at?: string | null
          url?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_inventory_mapped_topic_id_fkey"
            columns: ["mapped_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_inventory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          apify_crawled: boolean | null
          canonical_url: string | null
          content_hash: string | null
          content_markdown: string | null
          crawl_error: string | null
          crawl_status: string | null
          crawled_at: string | null
          created_at: string | null
          discovered_via: string | null
          dom_nodes: number | null
          gsc_clicks: number | null
          gsc_ctr: number | null
          gsc_impressions: number | null
          gsc_position: number | null
          gsc_queries: Json | null
          h1: string | null
          headings: Json | null
          html_size_kb: number | null
          id: string
          images: Json | null
          jina_crawled: boolean | null
          latest_audit_at: string | null
          latest_audit_id: string | null
          latest_audit_score: number | null
          links: Json | null
          load_time_ms: number | null
          meta_description: string | null
          path: string | null
          project_id: string
          robots_meta: string | null
          schema_json: Json | null
          schema_types: string[] | null
          sitemap_changefreq: string | null
          sitemap_lastmod: string | null
          sitemap_priority: number | null
          status_code: number | null
          title: string | null
          ttfb_ms: number | null
          updated_at: string | null
          url: string
          word_count: number | null
        }
        Insert: {
          apify_crawled?: boolean | null
          canonical_url?: string | null
          content_hash?: string | null
          content_markdown?: string | null
          crawl_error?: string | null
          crawl_status?: string | null
          crawled_at?: string | null
          created_at?: string | null
          discovered_via?: string | null
          dom_nodes?: number | null
          gsc_clicks?: number | null
          gsc_ctr?: number | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          gsc_queries?: Json | null
          h1?: string | null
          headings?: Json | null
          html_size_kb?: number | null
          id?: string
          images?: Json | null
          jina_crawled?: boolean | null
          latest_audit_at?: string | null
          latest_audit_id?: string | null
          latest_audit_score?: number | null
          links?: Json | null
          load_time_ms?: number | null
          meta_description?: string | null
          path?: string | null
          project_id: string
          robots_meta?: string | null
          schema_json?: Json | null
          schema_types?: string[] | null
          sitemap_changefreq?: string | null
          sitemap_lastmod?: string | null
          sitemap_priority?: number | null
          status_code?: number | null
          title?: string | null
          ttfb_ms?: number | null
          updated_at?: string | null
          url: string
          word_count?: number | null
        }
        Update: {
          apify_crawled?: boolean | null
          canonical_url?: string | null
          content_hash?: string | null
          content_markdown?: string | null
          crawl_error?: string | null
          crawl_status?: string | null
          crawled_at?: string | null
          created_at?: string | null
          discovered_via?: string | null
          dom_nodes?: number | null
          gsc_clicks?: number | null
          gsc_ctr?: number | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          gsc_queries?: Json | null
          h1?: string | null
          headings?: Json | null
          html_size_kb?: number | null
          id?: string
          images?: Json | null
          jina_crawled?: boolean | null
          latest_audit_at?: string | null
          latest_audit_id?: string | null
          latest_audit_score?: number | null
          links?: Json | null
          load_time_ms?: number | null
          meta_description?: string | null
          path?: string | null
          project_id?: string
          robots_meta?: string | null
          schema_json?: Json | null
          schema_types?: string[] | null
          sitemap_changefreq?: string | null
          sitemap_lastmod?: string | null
          sitemap_priority?: number | null
          status_code?: number | null
          title?: string | null
          ttfb_ms?: number | null
          updated_at?: string | null
          url?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_latest_audit_id_fkey"
            columns: ["latest_audit_id"]
            isOneToOne: false
            referencedRelation: "page_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "site_analysis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      topical_maps: {
        Row: {
          analysis_state: Json | null
          business_info: Json | null
          competitors: string[] | null
          created_at: string
          eavs: Json | null
          id: string
          map_type: string
          name: string
          pillars: Json | null
          project_id: string
          seo_pillars: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          analysis_state?: Json | null
          business_info?: Json | null
          competitors?: string[] | null
          created_at?: string
          eavs?: Json | null
          id?: string
          map_type?: string
          name: string
          pillars?: Json | null
          project_id: string
          seo_pillars?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          analysis_state?: Json | null
          business_info?: Json | null
          competitors?: string[] | null
          created_at?: string
          eavs?: Json | null
          id?: string
          map_type?: string
          name?: string
          pillars?: Json | null
          project_id?: string
          seo_pillars?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topical_maps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          freshness: string
          id: string
          map_id: string
          metadata: Json | null
          parent_topic_id: string | null
          slug: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          freshness?: string
          id?: string
          map_id: string
          metadata?: Json | null
          parent_topic_id?: string | null
          slug: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          freshness?: string
          id?: string
          map_id?: string
          metadata?: Json | null
          parent_topic_id?: string | null
          slug?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      transition_snapshots: {
        Row: {
          content_markdown: string | null
          created_at: string | null
          id: string
          inventory_id: string
          snapshot_type: string | null
        }
        Insert: {
          content_markdown?: string | null
          created_at?: string | null
          id?: string
          inventory_id: string
          snapshot_type?: string | null
        }
        Update: {
          content_markdown?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string
          snapshot_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transition_snapshots_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "site_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          settings_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          settings_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          settings_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_text_column_if_not_exists: {
        Args: {
          p_column_name: string
          p_schema_name: string
          p_table_name: string
        }
        Returns: undefined
      }
      bulk_add_topics: {
        Args: { p_map_id: string; p_topics: Json }
        Returns: undefined
      }
      bulk_insert_topics: {
        Args: { p_map_id: string; p_topics: Json }
        Returns: undefined
      }
      check_table_exists: {
        Args: { schema_name: string; table_name_to_check: string }
        Returns: boolean
      }
      create_foundation_pages: {
        Args: { p_map_id: string; p_pages: Json }
        Returns: {
          created_at: string | null
          deleted_at: string | null
          deletion_reason: string | null
          h1_template: string | null
          id: string
          map_id: string
          meta_description: string | null
          metadata: Json | null
          nap_data: Json | null
          page_type: string
          schema_type: string | null
          sections: Json | null
          slug: string
          title: string
          updated_at: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "foundation_pages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_new_map: {
        Args: { p_map_name: string; p_project_id: string }
        Returns: {
          analysis_state: Json | null
          business_info: Json | null
          competitors: string[] | null
          created_at: string
          eavs: Json | null
          id: string
          map_type: string
          name: string
          pillars: Json | null
          project_id: string
          seo_pillars: Json | null
          status: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "topical_maps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_new_project: {
        Args: { p_project_data: Json }
        Returns: {
          ai_model: string | null
          ai_provider: string | null
          analysis_result: Json | null
          apify_token: string | null
          created_at: string
          domain: string
          id: string
          project_name: string
          seed_keyword: string | null
          status: string | null
          status_message: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_project: { Args: { p_project_id: string }; Returns: undefined }
      delete_topical_map: { Args: { p_map_id: string }; Returns: undefined }
      get_next_audit_version: { Args: { p_page_id: string }; Returns: number }
      get_project_dashboard_data: {
        Args: { p_project_id: string }
        Returns: Json
      }
      mark_navigation_synced: {
        Args: { p_map_id: string }
        Returns: {
          created_at: string | null
          id: string
          last_synced_at: string | null
          map_id: string
          pending_changes: Json | null
          requires_review: boolean | null
          topics_modified_since: number | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "navigation_sync_status"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      restore_foundation_page: {
        Args: { p_page_id: string }
        Returns: {
          created_at: string | null
          deleted_at: string | null
          deletion_reason: string | null
          h1_template: string | null
          id: string
          map_id: string
          meta_description: string | null
          metadata: Json | null
          nap_data: Json | null
          page_type: string
          schema_type: string | null
          sections: Json | null
          slug: string
          title: string
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "foundation_pages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_project_progress: { Args: { p_data: Json }; Returns: undefined }
      secure_upsert_settings:
        | {
            Args: {
              p_anthropic_api_key?: string
              p_apify_token?: string
              p_apitemplate_api_key?: string
              p_dataforseo_login?: string
              p_dataforseo_password?: string
              p_firecrawl_api_key?: string
              p_infranodus_api_key?: string
              p_jina_api_key?: string
              p_neo4j_password?: string
              p_neo4j_uri?: string
              p_neo4j_user?: string
              p_openai_api_key?: string
              p_openrouter_api_key?: string
              p_perplexity_api_key?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_apify_token?: string
              p_apitemplate_api_key?: string
              p_dataforseo_login?: string
              p_dataforseo_password?: string
              p_firecrawl_api_key?: string
              p_infranodus_api_key?: string
              p_jina_api_key?: string
              p_neo4j_password?: string
              p_neo4j_uri?: string
              p_neo4j_user?: string
            }
            Returns: undefined
          }
        | { Args: { p_settings: Json }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_foundation_page: {
        Args: { p_page_id: string; p_reason?: string }
        Returns: {
          created_at: string | null
          deleted_at: string | null
          deletion_reason: string | null
          h1_template: string | null
          id: string
          map_id: string
          meta_description: string | null
          metadata: Json | null
          nap_data: Json | null
          page_type: string
          schema_type: string | null
          sections: Json | null
          slug: string
          title: string
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "foundation_pages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_sitemap_pages: {
        Args: { p_project_id: string; pages_data: Json }
        Returns: {
          added: number
          removed: number
          updated: number
        }[]
      }
      update_crawled_pages:
        | {
            Args: { page_updates: Json }
            Returns: {
              updated_count: number
            }[]
          }
        | { Args: { p_project_id: number; pages_data: Json }; Returns: Json }
        | { Args: { p_project_id: string; pages_data: Json }; Returns: Json }
      update_map_details:
        | {
            Args: {
              p_business_info?: Json
              p_competitors?: string[]
              p_eavs?: Json
              p_map_id: string
              p_pillars?: Json
            }
            Returns: undefined
          }
        | {
            Args: {
              p_business_info?: Json
              p_competitors?: string[]
              p_eavs?: Json
              p_map_id: string
              p_pillars?: Json
            }
            Returns: undefined
          }
      upsert_navigation_structure: {
        Args: {
          p_dynamic_by_section?: boolean
          p_footer: Json
          p_header: Json
          p_map_id: string
          p_max_footer_links?: number
          p_max_header_links?: number
          p_metadata?: Json
        }
        Returns: {
          created_at: string | null
          dynamic_by_section: boolean | null
          footer: Json
          header: Json
          id: string
          map_id: string
          max_footer_links: number | null
          max_header_links: number | null
          metadata: Json | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "navigation_structures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      action_type:
        | "KEEP"
        | "REWRITE"
        | "MERGE"
        | "REDIRECT_301"
        | "PRUNE_410"
        | "CANONICALIZE"
      analysis_tool_name:
        | "VALIDATION"
        | "SEMANTIC_ANALYSIS"
        | "MERGE_SUGGESTIONS"
      content_brief_status:
        | "NOT_STARTED"
        | "DRAFTING"
        | "COMPLETE"
        | "PUBLISHED"
      section_type: "CORE_SECTION" | "AUTHOR_SECTION" | "ORPHAN"
      topical_map_type: "NEW" | "AUDIT_AS_IS" | "AUDIT_OPTIMAL" | "COMPETITOR"
      transition_status:
        | "AUDIT_PENDING"
        | "GAP_ANALYSIS"
        | "ACTION_REQUIRED"
        | "IN_PROGRESS"
        | "OPTIMIZED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_type: [
        "KEEP",
        "REWRITE",
        "MERGE",
        "REDIRECT_301",
        "PRUNE_410",
        "CANONICALIZE",
      ],
      analysis_tool_name: [
        "VALIDATION",
        "SEMANTIC_ANALYSIS",
        "MERGE_SUGGESTIONS",
      ],
      content_brief_status: [
        "NOT_STARTED",
        "DRAFTING",
        "COMPLETE",
        "PUBLISHED",
      ],
      section_type: ["CORE_SECTION", "AUTHOR_SECTION", "ORPHAN"],
      topical_map_type: ["NEW", "AUDIT_AS_IS", "AUDIT_OPTIMAL", "COMPETITOR"],
      transition_status: [
        "AUDIT_PENDING",
        "GAP_ANALYSIS",
        "ACTION_REQUIRED",
        "IN_PROGRESS",
        "OPTIMIZED",
      ],
    },
  },
} as const

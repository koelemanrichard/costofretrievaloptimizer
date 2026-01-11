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
          draft_history: Json | null
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
          draft_history?: Json | null
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
          draft_history?: Json | null
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
      content_generation_jobs: {
        Row: {
          id: string
          brief_id: string
          user_id: string
          map_id: string
          status: string
          current_pass: number
          passes_status: Json
          total_sections: number | null
          completed_sections: number | null
          current_section_key: string | null
          draft_content: string | null
          final_audit_score: number | null
          audit_details: Json | null
          last_error: string | null
          retry_count: number | null
          max_retries: number | null
          created_at: string | null
          updated_at: string | null
          started_at: string | null
          completed_at: string | null
          schema_data: Json | null
          schema_validation_results: Json | null
          schema_entities: Json | null
          schema_page_type: string | null
          progressive_schema_data: Json | null
        }
        Insert: {
          id?: string
          brief_id: string
          user_id: string
          map_id: string
          status?: string
          current_pass?: number
          passes_status?: Json
          total_sections?: number | null
          completed_sections?: number | null
          current_section_key?: string | null
          draft_content?: string | null
          final_audit_score?: number | null
          audit_details?: Json | null
          last_error?: string | null
          retry_count?: number | null
          max_retries?: number | null
          created_at?: string | null
          updated_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          schema_data?: Json | null
          schema_validation_results?: Json | null
          schema_entities?: Json | null
          schema_page_type?: string | null
          progressive_schema_data?: Json | null
        }
        Update: {
          id?: string
          brief_id?: string
          user_id?: string
          map_id?: string
          status?: string
          current_pass?: number
          passes_status?: Json
          total_sections?: number | null
          completed_sections?: number | null
          current_section_key?: string | null
          draft_content?: string | null
          final_audit_score?: number | null
          audit_details?: Json | null
          last_error?: string | null
          retry_count?: number | null
          max_retries?: number | null
          created_at?: string | null
          updated_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          schema_data?: Json | null
          schema_validation_results?: Json | null
          schema_entities?: Json | null
          schema_page_type?: string | null
          progressive_schema_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_jobs_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: true
            referencedRelation: "content_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_jobs_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_sections: {
        Row: {
          id: string
          job_id: string
          section_key: string
          section_heading: string | null
          section_order: number
          section_level: number | null
          pass_1_content: string | null
          pass_2_content: string | null
          pass_3_content: string | null
          pass_4_content: string | null
          pass_5_content: string | null
          pass_6_content: string | null
          pass_7_content: string | null
          pass_8_content: string | null
          current_content: string | null
          current_pass: number | null
          audit_scores: Json | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          section_key: string
          section_heading?: string | null
          section_order: number
          section_level?: number | null
          pass_1_content?: string | null
          pass_2_content?: string | null
          pass_3_content?: string | null
          pass_4_content?: string | null
          pass_5_content?: string | null
          pass_6_content?: string | null
          pass_7_content?: string | null
          pass_8_content?: string | null
          current_content?: string | null
          current_pass?: number | null
          audit_scores?: Json | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          section_key?: string
          section_heading?: string | null
          section_order?: number
          section_level?: number | null
          pass_1_content?: string | null
          pass_2_content?: string | null
          pass_3_content?: string | null
          pass_4_content?: string | null
          pass_5_content?: string | null
          pass_6_content?: string | null
          pass_7_content?: string | null
          pass_8_content?: string | null
          current_content?: string | null
          current_pass?: number | null
          audit_scores?: Json | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_sections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
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
          is_super_admin: boolean | null
        }
        Insert: {
          settings_data?: Json | null
          updated_at?: string | null
          user_id: string
          is_super_admin?: boolean | null
        }
        Update: {
          settings_data?: Json | null
          updated_at?: string | null
          user_id?: string
          is_super_admin?: boolean | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          type: 'personal' | 'team' | 'enterprise' | null
          owner_id: string
          settings: Json | null
          billing_email: string | null
          stripe_customer_id: string | null
          cost_visibility: Json | null
          branding: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          type?: 'personal' | 'team' | 'enterprise' | null
          owner_id: string
          settings?: Json | null
          billing_email?: string | null
          stripe_customer_id?: string | null
          cost_visibility?: Json | null
          branding?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          type?: 'personal' | 'team' | 'enterprise' | null
          owner_id?: string
          settings?: Json | null
          billing_email?: string | null
          stripe_customer_id?: string | null
          cost_visibility?: Json | null
          branding?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer' | null
          permission_overrides: Json | null
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer' | null
          permission_overrides?: Json | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer' | null
          permission_overrides?: Json | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_api_keys: {
        Row: {
          id: string
          organization_id: string
          provider: 'openai' | 'anthropic' | 'perplexity' | 'openrouter' | 'google'
          vault_secret_id: string
          key_source: 'inherit' | 'platform' | 'byok' | null
          is_active: boolean | null
          usage_this_month: { tokens: number; requests: number; cost_usd: number } | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          last_used_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          provider: 'openai' | 'anthropic' | 'perplexity' | 'openrouter' | 'google'
          vault_secret_id: string
          key_source?: 'inherit' | 'platform' | 'byok' | null
          is_active?: boolean | null
          usage_this_month?: { tokens: number; requests: number; cost_usd: number } | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_used_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          provider?: 'openai' | 'anthropic' | 'perplexity' | 'openrouter' | 'google'
          vault_secret_id?: string
          key_source?: 'inherit' | 'platform' | 'byok' | null
          is_active?: boolean | null
          usage_this_month?: { tokens: number; requests: number; cost_usd: number } | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_subscriptions: {
        Row: {
          id: string
          organization_id: string
          module_id: string
          status: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          module_id: string
          status?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          module_id?: string
          status?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          }
        ]
      }
      invitations: {
        Row: {
          id: string
          type: 'organization' | 'project'
          organization_id: string | null
          project_id: string | null
          email: string
          role: string
          token: string
          invited_by: string
          message: string | null
          created_at: string | null
          expires_at: string | null
          accepted_at: string | null
          declined_at: string | null
        }
        Insert: {
          id?: string
          type: 'organization' | 'project'
          organization_id?: string | null
          project_id?: string | null
          email: string
          role: string
          token?: string
          invited_by: string
          message?: string | null
          created_at?: string | null
          expires_at?: string | null
          accepted_at?: string | null
          declined_at?: string | null
        }
        Update: {
          id?: string
          type?: 'organization' | 'project'
          organization_id?: string | null
          project_id?: string | null
          email?: string
          role?: string
          token?: string
          invited_by?: string
          message?: string | null
          created_at?: string | null
          expires_at?: string | null
          accepted_at?: string | null
          declined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      modules: {
        Row: {
          id: string
          name: string
          description: string | null
          price_monthly_usd: number | null
          price_yearly_usd: number | null
          features: Json | null
          is_active: boolean | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          price_monthly_usd?: number | null
          price_yearly_usd?: number | null
          features?: Json | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_monthly_usd?: number | null
          price_yearly_usd?: number | null
          features?: Json | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string | null
          permission_overrides: Json | null
          source: string | null
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          created_at: string | null
          monthly_usage_limit_usd: number | null
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: string | null
          permission_overrides?: Json | null
          source?: string | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string | null
          monthly_usage_limit_usd?: number | null
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string | null
          permission_overrides?: Json | null
          source?: string | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string | null
          monthly_usage_limit_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_audit_log: {
        Row: {
          id: string
          organization_id: string
          actor_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          old_value: string | null
          new_value: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          actor_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          old_value?: string | null
          new_value?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          actor_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          old_value?: string | null
          new_value?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      role_module_access: {
        Row: {
          id: string
          organization_id: string
          role: string
          module_id: string
          can_access: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          role: string
          module_id: string
          can_access?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          role?: string
          module_id?: string
          can_access?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_module_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_module_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          }
        ]
      }
      project_api_keys: {
        Row: {
          id: string
          project_id: string
          provider: 'openai' | 'anthropic' | 'perplexity' | 'openrouter' | 'google'
          encrypted_key: string | null
          key_source: 'inherit' | 'platform' | 'byok' | null
          is_active: boolean | null
          usage_this_month: { tokens: number; requests: number; cost_usd: number } | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          last_used_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          provider: 'openai' | 'anthropic' | 'perplexity' | 'openrouter' | 'google'
          encrypted_key?: string | null
          key_source?: 'inherit' | 'platform' | 'byok' | null
          is_active?: boolean | null
          usage_this_month?: { tokens: number; requests: number; cost_usd: number } | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_used_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          provider?: 'openai' | 'anthropic' | 'perplexity' | 'openrouter' | 'google'
          encrypted_key?: string | null
          key_source?: 'inherit' | 'platform' | 'byok' | null
          is_active?: boolean | null
          usage_this_month?: { tokens: number; requests: number; cost_usd: number } | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_scores: {
        Row: {
          id: string
          organization_id: string
          total_score: number | null
          total_articles_generated: number | null
          total_high_quality_articles: number | null
          avg_audit_score: number | null
          global_rank: number | null
          score_this_week: number | null
          score_this_month: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          total_score?: number | null
          total_articles_generated?: number | null
          total_high_quality_articles?: number | null
          avg_audit_score?: number | null
          global_rank?: number | null
          score_this_week?: number | null
          score_this_month?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          total_score?: number | null
          total_articles_generated?: number | null
          total_high_quality_articles?: number | null
          avg_audit_score?: number | null
          global_rank?: number | null
          score_this_week?: number | null
          score_this_month?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_achievements: {
        Row: {
          id: string
          organization_id: string
          achievement_id: string
          achievement_name: string | null
          achievement_description: string | null
          points_awarded: number | null
          earned_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          achievement_id: string
          achievement_name?: string | null
          achievement_description?: string | null
          points_awarded?: number | null
          earned_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          achievement_id?: string
          achievement_name?: string | null
          achievement_description?: string | null
          points_awarded?: number | null
          earned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_leaderboard_history: {
        Row: {
          id: string
          organization_id: string
          period_type: string
          period_start: string
          rank: number
          score: number
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          period_type: string
          period_start: string
          rank: number
          score: number
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          period_type?: string
          period_start?: string
          rank?: number
          score?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_leaderboard_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_usage_logs: {
        Row: {
          id: string
          user_id: string | null
          project_id: string | null
          map_id: string | null
          topic_id: string | null
          brief_id: string | null
          job_id: string | null
          provider: string
          model: string
          operation: string
          operation_detail: string | null
          tokens_in: number
          tokens_out: number
          cost_usd: number
          duration_ms: number | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          success: boolean
          error_message: string | null
          error_code: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          project_id?: string | null
          map_id?: string | null
          topic_id?: string | null
          brief_id?: string | null
          job_id?: string | null
          provider: string
          model: string
          operation: string
          operation_detail?: string | null
          tokens_in?: number
          tokens_out?: number
          cost_usd?: number
          duration_ms?: number | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          success?: boolean
          error_message?: string | null
          error_code?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          project_id?: string | null
          map_id?: string | null
          topic_id?: string | null
          brief_id?: string | null
          job_id?: string | null
          provider?: string
          model?: string
          operation?: string
          operation_detail?: string | null
          tokens_in?: number
          tokens_out?: number
          cost_usd?: number
          duration_ms?: number | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          success?: boolean
          error_message?: string | null
          error_code?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "content_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      // Placeholder tables for optional logging services (disabled)
      console_logs: {
        Row: {
          id: string
          session_id: string
          level: string
          message: string
          context: Json | null
          component: string | null
          error_type: string | null
          stack_trace: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          level: string
          message: string
          context?: Json | null
          component?: string | null
          error_type?: string | null
          stack_trace?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          level?: string
          message?: string
          context?: Json | null
          component?: string | null
          error_type?: string | null
          stack_trace?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      api_call_logs: {
        Row: {
          id: string
          session_id: string
          job_id: string | null
          category: string
          provider: string
          endpoint: string
          method: string
          status: string
          duration_ms: number
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          job_id?: string | null
          category: string
          provider: string
          endpoint: string
          method: string
          status: string
          duration_ms: number
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          job_id?: string | null
          category?: string
          provider?: string
          endpoint?: string
          method?: string
          status?: string
          duration_ms?: number
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          id: string
          session_id: string
          job_id: string | null
          metric_type: string
          metric_name: string
          value: number
          unit: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          job_id?: string | null
          metric_type: string
          metric_name: string
          value: number
          unit?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          job_id?: string | null
          metric_type?: string
          metric_name?: string
          value?: number
          unit?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_profiles: {
        Row: {
          id: string | null
          email: string | null
          raw_user_meta_data: Json | null
          created_at: string | null
          last_sign_in_at: string | null
        }
        Relationships: []
      }
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
      resolve_api_key: {
        Args: {
          p_project_id: string
          p_provider: string
        }
        Returns: {
          encrypted_key: string | null
          key_source: string
          billable_to: string
          billable_id: string
        }[]
      }
      has_api_key: {
        Args: {
          p_project_id: string
          p_provider: string
        }
        Returns: boolean
      }
      get_billable_info: {
        Args: {
          p_project_id: string
          p_provider: string
        }
        Returns: {
          key_source: string
          billable_to: string
          billable_id: string
        }
      }
      get_org_role: {
        Args: {
          org_id: string
        }
        Returns: string | null
      }
      get_project_role: {
        Args: {
          proj_id: string
        }
        Returns: string | null
      }
      is_org_member: {
        Args: {
          org_id: string
        }
        Returns: boolean
      }
      has_project_access: {
        Args: {
          proj_id: string
        }
        Returns: boolean
      }
      accept_invitation: {
        Args: {
          p_token: string
        }
        Returns: Json
      }
      decline_invitation: {
        Args: {
          p_token: string
        }
        Returns: Json
      }
      log_audit_event: {
        Args: {
          p_org_id: string
          p_action: string
          p_target_type?: string
          p_target_id?: string
          p_target_email?: string | null
          p_old_value?: Json | null
          p_new_value?: Json | null
          p_metadata?: Json
        }
        Returns: string
      }
      resend_invitation: {
        Args: {
          p_invitation_id: string
        }
        Returns: Json
      }
      admin_get_all_projects: {
        Args: Record<string, never>
        Returns: Array<{
          id: string
          project_name: string
          domain: string
          created_at: string
          updated_at: string
          user_id: string
          organization_id: string | null
          user_email: string
          map_count: number
        }>
      }
      admin_reassign_project: {
        Args: {
          p_project_id: string
          p_new_user_id: string
        }
        Returns: {
          success: boolean
          project_id: string
          project_name?: string
          old_user_id?: string
          new_user_id?: string
          maps_updated: number
          error?: string
        }
      }
      can_use_feature: {
        Args: {
          p_org_id: string
          p_feature: string
        }
        Returns: boolean
      }
      get_available_features: {
        Args: {
          p_org_id: string
        }
        Returns: string[]
      }
      get_org_cost_summary: {
        Args: {
          p_org_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          total_cost_usd: number
          total_requests: number
          total_tokens: number
          by_provider: Record<string, { cost_usd: number; requests: number; tokens: number }>
          by_user: Record<string, { cost_usd: number; requests: number; tokens: number; email?: string }>
          by_project: Record<string, { cost_usd: number; requests: number; tokens: number; name?: string }>
          daily_trend: Array<{ date: string; cost_usd: number; requests: number }>
        }
      }
      recalculate_organization_scores: {
        Args: {
          p_org_id?: string
        }
        Returns: undefined
      }
      get_user_usage_stats: {
        Args: {
          p_user_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          provider: string
          model: string
          call_count: number
          total_tokens_in: number
          total_tokens_out: number
          total_cost_usd: number
          avg_duration_ms: number
          success_rate: number
        }[]
      }
      get_map_usage_stats: {
        Args: {
          p_map_id: string
        }
        Returns: {
          provider: string
          model: string
          operation: string
          call_count: number
          total_tokens_in: number
          total_tokens_out: number
          total_cost_usd: number
          avg_duration_ms: number
        }[]
      }
      rollback_to_pass: {
        Args: {
          p_job_id: string
          p_pass_number: number
        }
        Returns: undefined
      }
      get_quality_trend: {
        Args: {
          p_job_id: string
        }
        Returns: {
          pass_number: number
          score: number
          delta: number
        }[]
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

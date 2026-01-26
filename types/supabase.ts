Initialising login role...
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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_data: Json | null
          achievement_type: string
          id: string
          map_id: string | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_data?: Json | null
          achievement_type: string
          id?: string
          map_id?: string | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_data?: Json | null
          achievement_type?: string
          id?: string
          map_id?: string | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_pricing_rates: {
        Row: {
          created_at: string | null
          effective_from: string
          effective_to: string | null
          id: string
          input_rate_per_1k: number
          model: string
          notes: string | null
          output_rate_per_1k: number
          provider: string
        }
        Insert: {
          created_at?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          input_rate_per_1k: number
          model: string
          notes?: string | null
          output_rate_per_1k: number
          provider: string
        }
        Update: {
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          input_rate_per_1k?: number
          model?: string
          notes?: string | null
          output_rate_per_1k?: number
          provider?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          billable_id: string | null
          billable_to: string | null
          brief_id: string | null
          cost_usd: number
          created_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          id: string
          is_external_usage: boolean | null
          job_id: string | null
          key_source: string | null
          map_id: string | null
          model: string
          operation: string
          operation_detail: string | null
          organization_id: string | null
          project_id: string | null
          provider: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          success: boolean
          tokens_in: number
          tokens_out: number
          topic_id: string | null
          user_id: string | null
        }
        Insert: {
          billable_id?: string | null
          billable_to?: string | null
          brief_id?: string | null
          cost_usd?: number
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_external_usage?: boolean | null
          job_id?: string | null
          key_source?: string | null
          map_id?: string | null
          model: string
          operation: string
          operation_detail?: string | null
          organization_id?: string | null
          project_id?: string | null
          provider: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          success?: boolean
          tokens_in?: number
          tokens_out?: number
          topic_id?: string | null
          user_id?: string | null
        }
        Update: {
          billable_id?: string | null
          billable_to?: string | null
          brief_id?: string | null
          cost_usd?: number
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_external_usage?: boolean | null
          job_id?: string | null
          key_source?: string | null
          map_id?: string | null
          model?: string
          operation?: string
          operation_detail?: string | null
          organization_id?: string | null
          project_id?: string | null
          provider?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          success?: boolean
          tokens_in?: number
          tokens_out?: number
          topic_id?: string | null
          user_id?: string | null
        }
        Relationships: [
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
          },
          {
            foreignKeyName: "ai_usage_logs_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_call_logs: {
        Row: {
          category: string
          created_at: string | null
          duration_ms: number | null
          endpoint: string
          error_message: string | null
          error_type: string | null
          id: string
          job_id: string | null
          method: string | null
          provider: string
          request_size: number | null
          response_size: number | null
          retry_count: number | null
          session_id: string
          status: string
          status_code: number | null
          token_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          duration_ms?: number | null
          endpoint: string
          error_message?: string | null
          error_type?: string | null
          id?: string
          job_id?: string | null
          method?: string | null
          provider: string
          request_size?: number | null
          response_size?: number | null
          retry_count?: number | null
          session_id: string
          status: string
          status_code?: number | null
          token_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          duration_ms?: number | null
          endpoint?: string
          error_message?: string | null
          error_type?: string | null
          id?: string
          job_id?: string | null
          method?: string | null
          provider?: string
          request_size?: number | null
          response_size?: number | null
          retry_count?: number | null
          session_id?: string
          status?: string
          status_code?: number | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      article_blueprints: {
        Row: {
          blueprint: Json
          components_used: string[] | null
          created_at: string | null
          generation_duration_ms: number | null
          id: string
          model_used: string | null
          pacing: string
          sections_count: number | null
          topic_id: string
          topical_map_id: string
          updated_at: string | null
          user_overrides: Json | null
          visual_style: string
          word_count: number | null
        }
        Insert: {
          blueprint: Json
          components_used?: string[] | null
          created_at?: string | null
          generation_duration_ms?: number | null
          id?: string
          model_used?: string | null
          pacing: string
          sections_count?: number | null
          topic_id: string
          topical_map_id: string
          updated_at?: string | null
          user_overrides?: Json | null
          visual_style: string
          word_count?: number | null
        }
        Update: {
          blueprint?: Json
          components_used?: string[] | null
          created_at?: string | null
          generation_duration_ms?: number | null
          id?: string
          model_used?: string | null
          pacing?: string
          sections_count?: number | null
          topic_id?: string
          topical_map_id?: string
          updated_at?: string | null
          user_overrides?: Json | null
          visual_style?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "article_blueprints_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_blueprints_topical_map_id_fkey"
            columns: ["topical_map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_history: {
        Row: {
          applied_at: string | null
          audit_id: string
          category_id: string
          confidence: number | null
          description: string | null
          field: string
          fix_type: string
          id: string
          issue_id: string
          new_value: Json | null
          old_value: Json | null
          required_ai: boolean | null
          target_id: string
          target_table: string
          undone_at: string | null
          undone_by: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          audit_id: string
          category_id: string
          confidence?: number | null
          description?: string | null
          field: string
          fix_type: string
          id?: string
          issue_id: string
          new_value?: Json | null
          old_value?: Json | null
          required_ai?: boolean | null
          target_id: string
          target_table: string
          undone_at?: string | null
          undone_by?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          audit_id?: string
          category_id?: string
          confidence?: number | null
          description?: string | null
          field?: string
          fix_type?: string
          id?: string
          issue_id?: string
          new_value?: Json | null
          old_value?: Json | null
          required_ai?: boolean | null
          target_id?: string
          target_table?: string
          undone_at?: string | null
          undone_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_history_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_history_undone_by_fkey"
            columns: ["undone_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_results: {
        Row: {
          auto_fixable_count: number | null
          categories: Json
          critical_count: number | null
          id: string
          map_id: string
          overall_score: number | null
          rules_snapshot: Json | null
          run_at: string | null
          run_by: string | null
          suggestion_count: number | null
          total_issues: number | null
          user_id: string
          warning_count: number | null
        }
        Insert: {
          auto_fixable_count?: number | null
          categories?: Json
          critical_count?: number | null
          id?: string
          map_id: string
          overall_score?: number | null
          rules_snapshot?: Json | null
          run_at?: string | null
          run_by?: string | null
          suggestion_count?: number | null
          total_issues?: number | null
          user_id: string
          warning_count?: number | null
        }
        Update: {
          auto_fixable_count?: number | null
          categories?: Json
          critical_count?: number | null
          id?: string
          map_id?: string
          overall_score?: number | null
          rules_snapshot?: Json | null
          run_at?: string | null
          run_by?: string | null
          suggestion_count?: number | null
          total_issues?: number | null
          user_id?: string
          warning_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_results_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_results_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_tasks: {
        Row: {
          audit_id: string | null
          created_at: string | null
          description: string | null
          id: string
          page_id: string | null
          priority: string | null
          project_id: string
          remediation: string | null
          resolved_at: string | null
          rule_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audit_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          page_id?: string | null
          priority?: string | null
          project_id: string
          remediation?: string | null
          resolved_at?: string | null
          rule_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audit_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          page_id?: string | null
          priority?: string | null
          project_id?: string
          remediation?: string | null
          resolved_at?: string | null
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
            referencedRelation: "site_analysis_pages"
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
      blueprint_history: {
        Row: {
          article_blueprint_id: string
          blueprint_snapshot: Json
          change_description: string | null
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          user_overrides_snapshot: Json | null
        }
        Insert: {
          article_blueprint_id: string
          blueprint_snapshot: Json
          change_description?: string | null
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          user_overrides_snapshot?: Json | null
        }
        Update: {
          article_blueprint_id?: string
          blueprint_snapshot?: Json
          change_description?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          user_overrides_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_history_article_blueprint_id_fkey"
            columns: ["article_blueprint_id"]
            isOneToOne: false
            referencedRelation: "article_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_components: {
        Row: {
          bounding_box: Json | null
          component_type: string | null
          content_slots: Json
          created_at: string | null
          extraction_id: string
          id: string
          literal_css: string
          literal_html: string
          project_id: string
          their_class_names: string[] | null
          visual_description: string
        }
        Insert: {
          bounding_box?: Json | null
          component_type?: string | null
          content_slots?: Json
          created_at?: string | null
          extraction_id: string
          id?: string
          literal_css: string
          literal_html: string
          project_id: string
          their_class_names?: string[] | null
          visual_description: string
        }
        Update: {
          bounding_box?: Json | null
          component_type?: string | null
          content_slots?: Json
          created_at?: string | null
          extraction_id?: string
          id?: string
          literal_css?: string
          literal_html?: string
          project_id?: string
          their_class_names?: string[] | null
          visual_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_components_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "brand_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_design_dna: {
        Row: {
          ai_model: string | null
          confidence_score: number | null
          created_at: string | null
          design_dna: Json
          id: string
          processing_time_ms: number | null
          project_id: string | null
          screenshot_base64: string | null
          screenshot_url: string | null
          source_url: string
          updated_at: string | null
        }
        Insert: {
          ai_model?: string | null
          confidence_score?: number | null
          created_at?: string | null
          design_dna: Json
          id?: string
          processing_time_ms?: number | null
          project_id?: string | null
          screenshot_base64?: string | null
          screenshot_url?: string | null
          source_url: string
          updated_at?: string | null
        }
        Update: {
          ai_model?: string | null
          confidence_score?: number | null
          created_at?: string | null
          design_dna?: Json
          id?: string
          processing_time_ms?: number | null
          project_id?: string | null
          screenshot_base64?: string | null
          screenshot_url?: string | null
          source_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_design_dna_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_design_systems: {
        Row: {
          ai_model: string | null
          brand_name: string
          compiled_css: string
          component_styles: Json
          created_at: string | null
          decorative_elements: Json | null
          design_dna_hash: string
          design_dna_id: string | null
          id: string
          image_treatments: Json | null
          interactions: Json | null
          project_id: string | null
          tokens: Json
          typography_treatments: Json | null
          variant_mappings: Json | null
        }
        Insert: {
          ai_model?: string | null
          brand_name: string
          compiled_css: string
          component_styles: Json
          created_at?: string | null
          decorative_elements?: Json | null
          design_dna_hash: string
          design_dna_id?: string | null
          id?: string
          image_treatments?: Json | null
          interactions?: Json | null
          project_id?: string | null
          tokens: Json
          typography_treatments?: Json | null
          variant_mappings?: Json | null
        }
        Update: {
          ai_model?: string | null
          brand_name?: string
          compiled_css?: string
          component_styles?: Json
          created_at?: string | null
          decorative_elements?: Json | null
          design_dna_hash?: string
          design_dna_id?: string | null
          id?: string
          image_treatments?: Json | null
          interactions?: Json | null
          project_id?: string | null
          tokens?: Json
          typography_treatments?: Json | null
          variant_mappings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_design_systems_design_dna_id_fkey"
            columns: ["design_dna_id"]
            isOneToOne: false
            referencedRelation: "brand_design_dna"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_design_systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_extractions: {
        Row: {
          computed_styles: Json | null
          extracted_at: string | null
          id: string
          page_type: string
          project_id: string
          raw_html: string
          screenshot_base64: string | null
          screenshot_url: string | null
          source_url: string
        }
        Insert: {
          computed_styles?: Json | null
          extracted_at?: string | null
          id?: string
          page_type: string
          project_id: string
          raw_html: string
          screenshot_base64?: string | null
          screenshot_url?: string | null
          source_url: string
        }
        Update: {
          computed_styles?: Json | null
          extracted_at?: string | null
          id?: string
          page_type?: string
          project_id?: string
          raw_html?: string
          screenshot_base64?: string | null
          screenshot_url?: string | null
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_extractions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_tokens: {
        Row: {
          borders: Json
          colors: Json
          extracted_at: string | null
          extracted_from: string[] | null
          gradients: Json | null
          id: string
          project_id: string
          shadows: Json
          spacing: Json
          typography: Json
        }
        Insert: {
          borders: Json
          colors: Json
          extracted_at?: string | null
          extracted_from?: string[] | null
          gradients?: Json | null
          id?: string
          project_id: string
          shadows: Json
          spacing: Json
          typography: Json
        }
        Update: {
          borders?: Json
          colors?: Json
          extracted_at?: string | null
          extracted_from?: string[] | null
          gradients?: Json | null
          id?: string
          project_id?: string
          shadows?: Json
          spacing?: Json
          typography?: Json
        }
        Relationships: [
          {
            foreignKeyName: "brand_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_url_suggestions: {
        Row: {
          created_at: string | null
          discovered_from: string
          extracted: boolean | null
          id: string
          page_type: string
          project_id: string
          prominence_score: number | null
          selected: boolean | null
          suggested_url: string
          visual_context: string | null
        }
        Insert: {
          created_at?: string | null
          discovered_from: string
          extracted?: boolean | null
          id?: string
          page_type: string
          project_id: string
          prominence_score?: number | null
          selected?: boolean | null
          suggested_url: string
          visual_context?: string | null
        }
        Update: {
          created_at?: string | null
          discovered_from?: string
          extracted?: boolean | null
          id?: string
          page_type?: string
          project_id?: string
          prominence_score?: number | null
          selected?: boolean | null
          suggested_url?: string
          visual_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_url_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_compliance_checks: {
        Row: {
          applied_at: string | null
          auto_suggestions: Json | null
          brief_id: string
          check_results: Json
          created_at: string | null
          id: string
          missing_fields: Json | null
          overall_score: number | null
          suggestions_applied: boolean | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          auto_suggestions?: Json | null
          brief_id: string
          check_results: Json
          created_at?: string | null
          id?: string
          missing_fields?: Json | null
          overall_score?: number | null
          suggestions_applied?: boolean | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          auto_suggestions?: Json | null
          brief_id?: string
          check_results?: Json
          created_at?: string | null
          id?: string
          missing_fields?: Json | null
          overall_score?: number | null
          suggestions_applied?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_compliance_checks_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "content_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_compliance_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_designs: {
        Row: {
          analysis_date: string | null
          competitor_name: string | null
          competitor_url: string
          created_at: string | null
          design_patterns: Json | null
          id: string
          project_id: string
          raw_data: Json | null
          updated_at: string | null
        }
        Insert: {
          analysis_date?: string | null
          competitor_name?: string | null
          competitor_url: string
          created_at?: string | null
          design_patterns?: Json | null
          id?: string
          project_id: string
          raw_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          analysis_date?: string | null
          competitor_name?: string | null
          competitor_url?: string
          created_at?: string | null
          design_patterns?: Json | null
          id?: string
          project_id?: string
          raw_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_designs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      console_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          job_id: string | null
          level: string
          message: string
          session_id: string
          stack: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          level: string
          message: string
          session_id: string
          stack?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          level?: string
          message?: string
          session_id?: string
          stack?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "console_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_briefs: {
        Row: {
          article_draft: string | null
          competitor_specs: Json | null
          content_audit: Json | null
          contextual_bridge: Json | null
          contextual_vectors: Json | null
          created_at: string | null
          cta: string | null
          discourse_anchors: Json | null
          draft_history: Json | null
          featured_snippet_target: Json | null
          id: string
          key_takeaways: Json | null
          map_id: string | null
          meta_description: string | null
          methodology_note: string | null
          outline: string | null
          perspectives: Json | null
          predicted_user_journey: string | null
          project_id: string | null
          query_type_format: string | null
          search_intent: string | null
          serp_analysis: Json | null
          slug: string | null
          status: string | null
          structural_template_hash: string | null
          structured_outline: Json | null
          target_keyword: string | null
          title: string
          topic_id: string
          updated_at: string | null
          user_id: string | null
          visual_semantics: Json | null
          visuals: Json | null
        }
        Insert: {
          article_draft?: string | null
          competitor_specs?: Json | null
          content_audit?: Json | null
          contextual_bridge?: Json | null
          contextual_vectors?: Json | null
          created_at?: string | null
          cta?: string | null
          discourse_anchors?: Json | null
          draft_history?: Json | null
          featured_snippet_target?: Json | null
          id?: string
          key_takeaways?: Json | null
          map_id?: string | null
          meta_description?: string | null
          methodology_note?: string | null
          outline?: string | null
          perspectives?: Json | null
          predicted_user_journey?: string | null
          project_id?: string | null
          query_type_format?: string | null
          search_intent?: string | null
          serp_analysis?: Json | null
          slug?: string | null
          status?: string | null
          structural_template_hash?: string | null
          structured_outline?: Json | null
          target_keyword?: string | null
          title: string
          topic_id: string
          updated_at?: string | null
          user_id?: string | null
          visual_semantics?: Json | null
          visuals?: Json | null
        }
        Update: {
          article_draft?: string | null
          competitor_specs?: Json | null
          content_audit?: Json | null
          contextual_bridge?: Json | null
          contextual_vectors?: Json | null
          created_at?: string | null
          cta?: string | null
          discourse_anchors?: Json | null
          draft_history?: Json | null
          featured_snippet_target?: Json | null
          id?: string
          key_takeaways?: Json | null
          map_id?: string | null
          meta_description?: string | null
          methodology_note?: string | null
          outline?: string | null
          perspectives?: Json | null
          predicted_user_journey?: string | null
          project_id?: string | null
          query_type_format?: string | null
          search_intent?: string | null
          serp_analysis?: Json | null
          slug?: string | null
          status?: string | null
          structural_template_hash?: string | null
          structured_outline?: Json | null
          target_keyword?: string | null
          title?: string
          topic_id?: string
          updated_at?: string | null
          user_id?: string | null
          visual_semantics?: Json | null
          visuals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_briefs_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_briefs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_briefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_fixes: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          fixed_content: string | null
          id: string
          issue_id: string | null
          issue_type: string
          job_id: string
          original_content: string | null
          reverted_at: string | null
          reverted_by: string | null
          section_id: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          fixed_content?: string | null
          id?: string
          issue_id?: string | null
          issue_type: string
          job_id: string
          original_content?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          section_id?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          fixed_content?: string | null
          id?: string
          issue_id?: string | null
          issue_type?: string
          job_id?: string
          original_content?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_fixes_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_fixes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_fixes_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_fixes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "content_generation_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_jobs: {
        Row: {
          audit_details: Json | null
          audit_issues: Json | null
          brief_id: string
          completed_at: string | null
          completed_sections: number | null
          created_at: string | null
          current_pass: number
          current_section_key: string | null
          depth_mode: string | null
          draft_content: string | null
          final_audit_score: number | null
          id: string
          image_placeholders: Json | null
          last_error: string | null
          map_id: string
          max_retries: number | null
          pass_quality_scores: Json | null
          passes_status: Json
          progressive_schema_data: Json | null
          quality_report: Json | null
          quality_warning: string | null
          retry_count: number | null
          schema_data: Json | null
          schema_entities: Json | null
          schema_page_type: string | null
          schema_validation_results: Json | null
          selected_template: string | null
          settings_id: string | null
          started_at: string | null
          status: string
          structural_snapshots: Json | null
          template_compliance_score: number | null
          template_confidence: number | null
          total_sections: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audit_details?: Json | null
          audit_issues?: Json | null
          brief_id: string
          completed_at?: string | null
          completed_sections?: number | null
          created_at?: string | null
          current_pass?: number
          current_section_key?: string | null
          depth_mode?: string | null
          draft_content?: string | null
          final_audit_score?: number | null
          id?: string
          image_placeholders?: Json | null
          last_error?: string | null
          map_id: string
          max_retries?: number | null
          pass_quality_scores?: Json | null
          passes_status?: Json
          progressive_schema_data?: Json | null
          quality_report?: Json | null
          quality_warning?: string | null
          retry_count?: number | null
          schema_data?: Json | null
          schema_entities?: Json | null
          schema_page_type?: string | null
          schema_validation_results?: Json | null
          selected_template?: string | null
          settings_id?: string | null
          started_at?: string | null
          status?: string
          structural_snapshots?: Json | null
          template_compliance_score?: number | null
          template_confidence?: number | null
          total_sections?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audit_details?: Json | null
          audit_issues?: Json | null
          brief_id?: string
          completed_at?: string | null
          completed_sections?: number | null
          created_at?: string | null
          current_pass?: number
          current_section_key?: string | null
          depth_mode?: string | null
          draft_content?: string | null
          final_audit_score?: number | null
          id?: string
          image_placeholders?: Json | null
          last_error?: string | null
          map_id?: string
          max_retries?: number | null
          pass_quality_scores?: Json | null
          passes_status?: Json
          progressive_schema_data?: Json | null
          quality_report?: Json | null
          quality_warning?: string | null
          retry_count?: number | null
          schema_data?: Json | null
          schema_entities?: Json | null
          schema_page_type?: string | null
          schema_validation_results?: Json | null
          selected_template?: string | null
          settings_id?: string | null
          started_at?: string | null
          status?: string
          structural_snapshots?: Json | null
          template_compliance_score?: number | null
          template_confidence?: number | null
          total_sections?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_jobs_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
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
          {
            foreignKeyName: "content_generation_jobs_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "content_generation_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_sections: {
        Row: {
          audit_scores: Json | null
          created_at: string | null
          current_content: string | null
          current_pass: number | null
          id: string
          job_id: string
          pass_1_content: string | null
          pass_2_content: string | null
          pass_3_content: string | null
          pass_4_content: string | null
          pass_5_content: string | null
          pass_6_content: string | null
          pass_7_content: string | null
          pass_8_content: string | null
          pass_9_content: string | null
          pass_contents: Json | null
          section_heading: string | null
          section_key: string
          section_level: number | null
          section_order: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          audit_scores?: Json | null
          created_at?: string | null
          current_content?: string | null
          current_pass?: number | null
          id?: string
          job_id: string
          pass_1_content?: string | null
          pass_2_content?: string | null
          pass_3_content?: string | null
          pass_4_content?: string | null
          pass_5_content?: string | null
          pass_6_content?: string | null
          pass_7_content?: string | null
          pass_8_content?: string | null
          pass_9_content?: string | null
          pass_contents?: Json | null
          section_heading?: string | null
          section_key: string
          section_level?: number | null
          section_order: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          audit_scores?: Json | null
          created_at?: string | null
          current_content?: string | null
          current_pass?: number | null
          id?: string
          job_id?: string
          pass_1_content?: string | null
          pass_2_content?: string | null
          pass_3_content?: string | null
          pass_4_content?: string | null
          pass_5_content?: string | null
          pass_6_content?: string | null
          pass_7_content?: string | null
          pass_8_content?: string | null
          pass_9_content?: string | null
          pass_contents?: Json | null
          section_heading?: string | null
          section_key?: string
          section_level?: number | null
          section_order?: number
          status?: string | null
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
      content_generation_settings: {
        Row: {
          audience_expertise: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          length_preset: string | null
          map_id: string | null
          max_sections: number | null
          name: string
          pass_config: Json | null
          priority_business_conversion: number | null
          priority_factual_density: number | null
          priority_human_readability: number | null
          priority_machine_optimization: number | null
          respect_topic_type: boolean | null
          target_word_count: number | null
          tone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audience_expertise?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          length_preset?: string | null
          map_id?: string | null
          max_sections?: number | null
          name?: string
          pass_config?: Json | null
          priority_business_conversion?: number | null
          priority_factual_density?: number | null
          priority_human_readability?: number | null
          priority_machine_optimization?: number | null
          respect_topic_type?: boolean | null
          target_word_count?: number | null
          tone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audience_expertise?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          length_preset?: string | null
          map_id?: string | null
          max_sections?: number | null
          name?: string
          pass_config?: Json | null
          priority_business_conversion?: number | null
          priority_factual_density?: number | null
          priority_human_readability?: number | null
          priority_machine_optimization?: number | null
          respect_topic_type?: boolean | null
          target_word_count?: number | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_settings_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pass_deltas: {
        Row: {
          auto_reverted: boolean | null
          created_at: string | null
          id: string
          job_id: string | null
          pass_number: number
          revert_reason: string | null
          rules_fixed: string[] | null
          rules_regressed: string[] | null
          rules_unchanged: string[] | null
        }
        Insert: {
          auto_reverted?: boolean | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          pass_number: number
          revert_reason?: string | null
          rules_fixed?: string[] | null
          rules_regressed?: string[] | null
          rules_unchanged?: string[] | null
        }
        Update: {
          auto_reverted?: boolean | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          pass_number?: number
          revert_reason?: string | null
          rules_fixed?: string[] | null
          rules_regressed?: string[] | null
          rules_unchanged?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "content_pass_deltas_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_rule_snapshots: {
        Row: {
          content_hash: string | null
          created_at: string | null
          id: string
          job_id: string | null
          pass_number: number
          rules: Json
          snapshot_type: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          pass_number: number
          rules: Json
          snapshot_type: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          pass_number?: number
          rules?: Json
          snapshot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_rule_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_section_versions: {
        Row: {
          content: string
          content_hash: string
          created_at: string | null
          id: string
          is_best_version: boolean | null
          job_id: string | null
          pass_number: number
          rule_snapshot: Json | null
          section_key: string
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string | null
          id?: string
          is_best_version?: boolean | null
          job_id?: string | null
          pass_number: number
          rule_snapshot?: Json | null
          section_key: string
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string | null
          id?: string
          is_best_version?: boolean | null
          job_id?: string | null
          pass_number?: number
          rule_snapshot?: Json | null
          section_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_section_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_template_analytics: {
        Row: {
          ai_recommended_template: string | null
          brief_id: string | null
          completed_at: string | null
          created_at: string | null
          depth_mode: string | null
          final_audit_score: number | null
          final_section_count: number | null
          final_word_count: number | null
          generation_time_ms: number | null
          id: string
          job_id: string | null
          post_publish_engagement: number | null
          post_publish_views: number | null
          selected_template: string
          target_word_count_max: number | null
          target_word_count_min: number | null
          template_compliance_score: number | null
          template_confidence: number | null
          total_passes_completed: number | null
          user_id: string | null
          user_overrode_recommendation: boolean | null
        }
        Insert: {
          ai_recommended_template?: string | null
          brief_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          depth_mode?: string | null
          final_audit_score?: number | null
          final_section_count?: number | null
          final_word_count?: number | null
          generation_time_ms?: number | null
          id?: string
          job_id?: string | null
          post_publish_engagement?: number | null
          post_publish_views?: number | null
          selected_template: string
          target_word_count_max?: number | null
          target_word_count_min?: number | null
          template_compliance_score?: number | null
          template_confidence?: number | null
          total_passes_completed?: number | null
          user_id?: string | null
          user_overrode_recommendation?: boolean | null
        }
        Update: {
          ai_recommended_template?: string | null
          brief_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          depth_mode?: string | null
          final_audit_score?: number | null
          final_section_count?: number | null
          final_word_count?: number | null
          generation_time_ms?: number | null
          id?: string
          job_id?: string | null
          post_publish_engagement?: number | null
          post_publish_views?: number | null
          selected_template?: string
          target_word_count_max?: number | null
          target_word_count_min?: number | null
          template_compliance_score?: number | null
          template_confidence?: number | null
          total_passes_completed?: number | null
          user_id?: string | null
          user_overrode_recommendation?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "content_template_analytics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_template_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          compliance_audit: Json | null
          compliance_score: number | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          job_id: string
          pass_number: number
          prompt_used: string | null
          reverted_at: string | null
          reverted_by: string | null
          settings_snapshot: Json | null
          version_number: number
          word_count: number | null
        }
        Insert: {
          compliance_audit?: Json | null
          compliance_score?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          job_id: string
          pass_number: number
          prompt_used?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          settings_snapshot?: Json | null
          version_number?: number
          word_count?: number | null
        }
        Update: {
          compliance_audit?: Json | null
          compliance_score?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          job_id?: string
          pass_number?: number
          prompt_used?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          settings_snapshot?: Json | null
          version_number?: number
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_versions_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_audits: {
        Row: {
          anchor_patterns: Json | null
          content_overlaps: Json | null
          created_at: string | null
          domain: string
          id: string
          issues: Json | null
          map_id: string
          metrics: Json | null
          page_limit: number | null
          pages: Json | null
          semantic_coverage: Json | null
          semantic_coverage_percentage: number | null
          sitemap_url: string | null
          total_overlaps: number | null
          total_pages: number | null
          user_id: string
        }
        Insert: {
          anchor_patterns?: Json | null
          content_overlaps?: Json | null
          created_at?: string | null
          domain: string
          id?: string
          issues?: Json | null
          map_id: string
          metrics?: Json | null
          page_limit?: number | null
          pages?: Json | null
          semantic_coverage?: Json | null
          semantic_coverage_percentage?: number | null
          sitemap_url?: string | null
          total_overlaps?: number | null
          total_pages?: number | null
          user_id: string
        }
        Update: {
          anchor_patterns?: Json | null
          content_overlaps?: Json | null
          created_at?: string | null
          domain?: string
          id?: string
          issues?: Json | null
          map_id?: string
          metrics?: Json | null
          page_limit?: number | null
          pages?: Json | null
          semantic_coverage?: Json | null
          semantic_coverage_percentage?: number | null
          sitemap_url?: string | null
          total_overlaps?: number | null
          total_pages?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corpus_audits_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corpus_audits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_reports_refresh_queue: {
        Row: {
          id: number
          organization_id: string | null
          queued_at: string | null
        }
        Insert: {
          id?: number
          organization_id?: string | null
          queued_at?: string | null
        }
        Update: {
          id?: number
          organization_id?: string | null
          queued_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_reports_refresh_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "cost_reports_refresh_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      design_preferences: {
        Row: {
          choice: string
          context: string
          created_at: string | null
          frequency: number | null
          id: string
          last_used: string | null
          preference_type: string
          project_id: string
        }
        Insert: {
          choice: string
          context: string
          created_at?: string | null
          frequency?: number | null
          id?: string
          last_used?: string | null
          preference_type: string
          project_id: string
        }
        Update: {
          choice?: string
          context?: string
          created_at?: string | null
          frequency?: number | null
          id?: string
          last_used?: string | null
          preference_type?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_profiles: {
        Row: {
          brand_discovery: Json
          created_at: string | null
          final_tokens: Json
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          screenshot_url: string | null
          target_url: string | null
          updated_at: string | null
          user_overrides: Json | null
        }
        Insert: {
          brand_discovery: Json
          created_at?: string | null
          final_tokens: Json
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          screenshot_url?: string | null
          target_url?: string | null
          updated_at?: string | null
          user_overrides?: Json | null
        }
        Update: {
          brand_discovery?: Json
          created_at?: string | null
          final_tokens?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          screenshot_url?: string | null
          target_url?: string | null
          updated_at?: string | null
          user_overrides?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "design_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      eat_scanner_audits: {
        Row: {
          authority_score: number | null
          co_occurrences: Json | null
          created_at: string | null
          domain: string | null
          eat_breakdown: Json | null
          entity_authority: Json | null
          entity_name: string
          expertise_score: number | null
          id: string
          industry: string | null
          language: string | null
          map_id: string
          overall_eat_score: number | null
          overall_sentiment: string | null
          recommendations: Json | null
          reputation_signals: Json | null
          trust_score: number | null
          user_id: string
        }
        Insert: {
          authority_score?: number | null
          co_occurrences?: Json | null
          created_at?: string | null
          domain?: string | null
          eat_breakdown?: Json | null
          entity_authority?: Json | null
          entity_name: string
          expertise_score?: number | null
          id?: string
          industry?: string | null
          language?: string | null
          map_id: string
          overall_eat_score?: number | null
          overall_sentiment?: string | null
          recommendations?: Json | null
          reputation_signals?: Json | null
          trust_score?: number | null
          user_id: string
        }
        Update: {
          authority_score?: number | null
          co_occurrences?: Json | null
          created_at?: string | null
          domain?: string | null
          eat_breakdown?: Json | null
          entity_authority?: Json | null
          entity_name?: string
          expertise_score?: number | null
          id?: string
          industry?: string | null
          language?: string | null
          map_id?: string
          overall_eat_score?: number | null
          overall_sentiment?: string | null
          recommendations?: Json | null
          reputation_signals?: Json | null
          trust_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eat_scanner_audits_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eat_scanner_audits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_metrics_snapshots: {
        Row: {
          action_roadmap: Json | null
          authority_indicators: Json | null
          category_distribution: Json | null
          classification_distribution: Json | null
          common_eav_count: number | null
          created_at: string | null
          eav_authority_score: number | null
          eav_count: number | null
          id: string
          information_density: Json | null
          information_density_score: number | null
          map_id: string
          notes: string | null
          rare_eav_count: number | null
          root_eav_count: number | null
          semantic_compliance: Json | null
          semantic_compliance_score: number | null
          snapshot_name: string | null
          snapshot_type: string | null
          topic_count: number | null
          unique_eav_count: number | null
          user_id: string
        }
        Insert: {
          action_roadmap?: Json | null
          authority_indicators?: Json | null
          category_distribution?: Json | null
          classification_distribution?: Json | null
          common_eav_count?: number | null
          created_at?: string | null
          eav_authority_score?: number | null
          eav_count?: number | null
          id?: string
          information_density?: Json | null
          information_density_score?: number | null
          map_id: string
          notes?: string | null
          rare_eav_count?: number | null
          root_eav_count?: number | null
          semantic_compliance?: Json | null
          semantic_compliance_score?: number | null
          snapshot_name?: string | null
          snapshot_type?: string | null
          topic_count?: number | null
          unique_eav_count?: number | null
          user_id: string
        }
        Update: {
          action_roadmap?: Json | null
          authority_indicators?: Json | null
          category_distribution?: Json | null
          classification_distribution?: Json | null
          common_eav_count?: number | null
          created_at?: string | null
          eav_authority_score?: number | null
          eav_count?: number | null
          id?: string
          information_density?: Json | null
          information_density_score?: number | null
          map_id?: string
          notes?: string | null
          rare_eav_count?: number | null
          root_eav_count?: number | null
          semantic_compliance?: Json | null
          semantic_compliance_score?: number | null
          snapshot_name?: string | null
          snapshot_type?: string | null
          topic_count?: number | null
          unique_eav_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_metrics_snapshots_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_metrics_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_hashtag_mappings: {
        Row: {
          branded_hashtags: string[] | null
          created_at: string | null
          entity_name: string
          entity_type: string | null
          id: string
          map_id: string
          platform: string
          primary_hashtag: string
          secondary_hashtags: string[] | null
          user_id: string
          wikidata_id: string | null
        }
        Insert: {
          branded_hashtags?: string[] | null
          created_at?: string | null
          entity_name: string
          entity_type?: string | null
          id?: string
          map_id: string
          platform: string
          primary_hashtag: string
          secondary_hashtags?: string[] | null
          user_id: string
          wikidata_id?: string | null
        }
        Update: {
          branded_hashtags?: string[] | null
          created_at?: string | null
          entity_name?: string
          entity_type?: string | null
          id?: string
          map_id?: string
          platform?: string
          primary_hashtag?: string
          secondary_hashtags?: string[] | null
          user_id?: string
          wikidata_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_hashtag_mappings_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_hashtag_mappings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_resolution_cache: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          entity_name: string
          entity_type: string
          id: string
          last_verified_at: string | null
          resolution_source: string | null
          resolved_data: Json | null
          same_as_urls: Json | null
          updated_at: string | null
          user_id: string
          wikidata_id: string | null
          wikipedia_url: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          entity_name: string
          entity_type: string
          id?: string
          last_verified_at?: string | null
          resolution_source?: string | null
          resolved_data?: Json | null
          same_as_urls?: Json | null
          updated_at?: string | null
          user_id: string
          wikidata_id?: string | null
          wikipedia_url?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          last_verified_at?: string | null
          resolution_source?: string | null
          resolved_data?: Json | null
          same_as_urls?: Json | null
          updated_at?: string | null
          user_id?: string
          wikidata_id?: string | null
          wikipedia_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_resolution_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled_org_ids: string[] | null
          enabled_user_ids: string[] | null
          flag_key: string
          id: string
          is_enabled: boolean | null
          rollout_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled_org_ids?: string[] | null
          enabled_user_ids?: string[] | null
          flag_key: string
          id?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled_org_ids?: string[] | null
          enabled_user_ids?: string[] | null
          flag_key?: string
          id?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "foundation_pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_versions: {
        Row: {
          article_id: string
          change_summary: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          version_number: number
        }
        Insert: {
          article_id: string
          change_summary?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          version_number: number
        }
        Update: {
          article_id?: string
          change_summary?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "help_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_article_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category_id: string
          content: string
          created_at: string | null
          created_by: string | null
          feature_keys: string[] | null
          id: string
          metadata: Json | null
          parent_article_id: string | null
          published_at: string | null
          search_keywords: string[] | null
          search_vector: unknown
          slug: string
          sort_order: number | null
          status: string
          summary: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          feature_keys?: string[] | null
          id?: string
          metadata?: Json | null
          parent_article_id?: string | null
          published_at?: string | null
          search_keywords?: string[] | null
          search_vector?: unknown
          slug: string
          sort_order?: number | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          feature_keys?: string[] | null
          id?: string
          metadata?: Json | null
          parent_article_id?: string | null
          published_at?: string | null
          search_keywords?: string[] | null
          search_vector?: unknown
          slug?: string
          sort_order?: number | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_parent_article_id_fkey"
            columns: ["parent_article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_published: boolean | null
          metadata: Json | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      help_screenshots: {
        Row: {
          alt_text: string
          article_id: string
          caption: string | null
          created_at: string | null
          filename: string
          height: number | null
          id: string
          metadata: Json | null
          sort_order: number | null
          storage_bucket: string | null
          storage_path: string
          updated_at: string | null
          width: number | null
        }
        Insert: {
          alt_text: string
          article_id: string
          caption?: string | null
          created_at?: string | null
          filename: string
          height?: number | null
          id?: string
          metadata?: Json | null
          sort_order?: number | null
          storage_bucket?: string | null
          storage_path: string
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          article_id?: string
          caption?: string | null
          created_at?: string | null
          filename?: string
          height?: number | null
          id?: string
          metadata?: Json | null
          sort_order?: number | null
          storage_bucket?: string | null
          storage_path?: string
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "help_screenshots_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          declined_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          message: string | null
          organization_id: string | null
          project_id: string | null
          role: string
          token: string
          type: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          message?: string | null
          organization_id?: string | null
          project_id?: string | null
          role: string
          token?: string
          type: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          message?: string | null
          organization_id?: string | null
          project_id?: string | null
          role?: string
          token?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
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
          },
        ]
      }
      layout_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          layout_config: Json
          name: string
          template_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          layout_config?: Json
          name: string
          template_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          layout_config?: Json
          name?: string
          template_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "layout_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      linking_audit_results: {
        Row: {
          auto_fixable_count: number | null
          created_at: string | null
          critical_issues_count: number | null
          external_score: number | null
          flow_direction_score: number | null
          fundamentals_score: number | null
          id: string
          map_id: string
          navigation_score: number | null
          overall_score: number | null
          pass_results: Json
          rules_snapshot: Json | null
          total_issues_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_fixable_count?: number | null
          created_at?: string | null
          critical_issues_count?: number | null
          external_score?: number | null
          flow_direction_score?: number | null
          fundamentals_score?: number | null
          id?: string
          map_id: string
          navigation_score?: number | null
          overall_score?: number | null
          pass_results?: Json
          rules_snapshot?: Json | null
          total_issues_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_fixable_count?: number | null
          created_at?: string | null
          critical_issues_count?: number | null
          external_score?: number | null
          flow_direction_score?: number | null
          fundamentals_score?: number | null
          id?: string
          map_id?: string
          navigation_score?: number | null
          overall_score?: number | null
          pass_results?: Json
          rules_snapshot?: Json | null
          total_issues_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linking_audit_results_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linking_audit_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      linking_fix_history: {
        Row: {
          applied_at: string | null
          audit_id: string
          confidence: number | null
          description: string | null
          field: string
          fix_type: string
          id: string
          issue_id: string
          new_value: Json | null
          old_value: Json | null
          required_ai: boolean | null
          target_id: string
          target_table: string
          undone_at: string | null
          undone_by: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          audit_id: string
          confidence?: number | null
          description?: string | null
          field: string
          fix_type: string
          id?: string
          issue_id: string
          new_value?: Json | null
          old_value?: Json | null
          required_ai?: boolean | null
          target_id: string
          target_table: string
          undone_at?: string | null
          undone_by?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          audit_id?: string
          confidence?: number | null
          description?: string | null
          field?: string
          fix_type?: string
          id?: string
          issue_id?: string
          new_value?: Json | null
          old_value?: Json | null
          required_ai?: boolean | null
          target_id?: string
          target_table?: string
          undone_at?: string | null
          undone_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linking_fix_history_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "linking_audit_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linking_fix_history_undone_by_fkey"
            columns: ["undone_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linking_fix_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly_usd: number | null
          price_yearly_usd: number | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id: string
          is_active?: boolean | null
          name: string
          price_monthly_usd?: number | null
          price_yearly_usd?: number | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly_usd?: number | null
          price_yearly_usd?: number | null
          sort_order?: number | null
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
          {
            foreignKeyName: "navigation_structures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_sync_status_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: true
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_sync_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_achievements: {
        Row: {
          achievement_description: string | null
          achievement_id: string
          achievement_name: string | null
          earned_at: string | null
          id: string
          organization_id: string
          points_awarded: number | null
        }
        Insert: {
          achievement_description?: string | null
          achievement_id: string
          achievement_name?: string | null
          earned_at?: string | null
          id?: string
          organization_id: string
          points_awarded?: number | null
        }
        Update: {
          achievement_description?: string | null
          achievement_id?: string
          achievement_name?: string | null
          earned_at?: string | null
          id?: string
          organization_id?: string
          points_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          encrypted_key: string
          id: string
          is_active: boolean | null
          key_source: string | null
          last_used_at: string | null
          organization_id: string
          provider: string
          updated_at: string | null
          usage_this_month: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          encrypted_key: string
          id?: string
          is_active?: boolean | null
          key_source?: string | null
          last_used_at?: string | null
          organization_id: string
          provider: string
          updated_at?: string | null
          usage_this_month?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          encrypted_key?: string
          id?: string
          is_active?: boolean | null
          key_source?: string | null
          last_used_at?: string | null
          organization_id?: string
          provider?: string
          updated_at?: string | null
          usage_this_month?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          organization_id: string | null
          target_email: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string | null
          target_email?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string | null
          target_email?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_log_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_audit_log_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_leaderboard_history: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          period_start: string
          period_type: string
          rank: number
          score: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          period_start: string
          period_type: string
          rank: number
          score: number
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          period_start?: string
          period_type?: string
          rank?: number
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_leaderboard_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_leaderboard_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          organization_id: string
          permission_overrides: Json | null
          role: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          organization_id: string
          permission_overrides?: Json | null
          role?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          organization_id?: string
          permission_overrides?: Json | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_quality_settings: {
        Row: {
          auto_reject_below_threshold: boolean | null
          created_at: string | null
          custom_rules: Json | null
          enforce_on_publish: boolean | null
          id: string
          max_consecutive_short_paragraphs: number | null
          max_word_count: number | null
          min_audit_score: number | null
          min_heading_ratio: number | null
          min_paragraph_length: number | null
          min_word_count: number | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          auto_reject_below_threshold?: boolean | null
          created_at?: string | null
          custom_rules?: Json | null
          enforce_on_publish?: boolean | null
          id?: string
          max_consecutive_short_paragraphs?: number | null
          max_word_count?: number | null
          min_audit_score?: number | null
          min_heading_ratio?: number | null
          min_paragraph_length?: number | null
          min_word_count?: number | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          auto_reject_below_threshold?: boolean | null
          created_at?: string | null
          custom_rules?: Json | null
          enforce_on_publish?: boolean | null
          id?: string
          max_consecutive_short_paragraphs?: number | null
          max_word_count?: number | null
          min_audit_score?: number | null
          min_heading_ratio?: number | null
          min_paragraph_length?: number | null
          min_word_count?: number | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_quality_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_quality_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_scores: {
        Row: {
          avg_audit_score: number | null
          global_rank: number | null
          id: string
          organization_id: string
          score_this_month: number | null
          score_this_week: number | null
          total_articles_generated: number | null
          total_high_quality_articles: number | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          avg_audit_score?: number | null
          global_rank?: number | null
          id?: string
          organization_id: string
          score_this_month?: number | null
          score_this_week?: number | null
          total_articles_generated?: number | null
          total_high_quality_articles?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_audit_score?: number | null
          global_rank?: number | null
          id?: string
          organization_id?: string
          score_this_month?: number | null
          score_this_week?: number | null
          total_articles_generated?: number | null
          total_high_quality_articles?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          module_id: string
          organization_id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          module_id: string
          organization_id: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          module_id?: string
          organization_id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_email: string | null
          branding: Json | null
          cost_visibility: Json | null
          created_at: string | null
          id: string
          name: string
          owner_id: string
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          billing_email?: string | null
          branding?: Json | null
          cost_visibility?: Json | null
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_email?: string | null
          branding?: Json | null
          cost_visibility?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          content_suggestions: Json | null
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
          content_suggestions?: Json | null
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
          content_suggestions?: Json | null
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
            referencedRelation: "site_analysis_pages"
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
      performance_metrics: {
        Row: {
          category: string
          created_at: string | null
          duration_ms: number
          id: string
          job_id: string | null
          metadata: Json | null
          operation: string
          session_id: string
          success: boolean
        }
        Insert: {
          category: string
          created_at?: string | null
          duration_ms: number
          id?: string
          job_id?: string | null
          metadata?: Json | null
          operation: string
          session_id: string
          success: boolean
        }
        Update: {
          category?: string
          created_at?: string | null
          duration_ms?: number
          id?: string
          job_id?: string | null
          metadata?: Json | null
          operation?: string
          session_id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          capture_source: string
          captured_at: string
          created_at: string | null
          delta_clicks: number | null
          delta_ctr: number | null
          delta_impressions: number | null
          delta_position: number | null
          gsc_clicks: number | null
          gsc_ctr: number | null
          gsc_impressions: number | null
          gsc_position: number | null
          id: string
          is_baseline: boolean
          map_id: string
          raw_import_data: Json | null
          snapshot_type: string
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          capture_source?: string
          captured_at?: string
          created_at?: string | null
          delta_clicks?: number | null
          delta_ctr?: number | null
          delta_impressions?: number | null
          delta_position?: number | null
          gsc_clicks?: number | null
          gsc_ctr?: number | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          id?: string
          is_baseline?: boolean
          map_id: string
          raw_import_data?: Json | null
          snapshot_type?: string
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          capture_source?: string
          captured_at?: string
          created_at?: string | null
          delta_clicks?: number | null
          delta_ctr?: number | null
          delta_impressions?: number | null
          delta_position?: number | null
          gsc_clicks?: number | null
          gsc_ctr?: number | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          id?: string
          is_baseline?: boolean
          map_id?: string
          raw_import_data?: Json | null
          snapshot_type?: string
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_snapshots_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_posting_guides: {
        Row: {
          best_practices: string | null
          character_limits: Json
          hashtag_guidelines: Json
          help_url: string | null
          id: string
          image_specs: Json
          optimal_times: Json | null
          platform: string
          posting_instructions: string
          updated_at: string | null
        }
        Insert: {
          best_practices?: string | null
          character_limits: Json
          hashtag_guidelines: Json
          help_url?: string | null
          id?: string
          image_specs: Json
          optimal_times?: Json | null
          platform: string
          posting_instructions: string
          updated_at?: string | null
        }
        Update: {
          best_practices?: string | null
          character_limits?: Json
          hashtag_guidelines?: Json
          help_url?: string | null
          id?: string
          image_specs?: Json
          optimal_times?: Json | null
          platform?: string
          posting_instructions?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          encrypted_key: string | null
          id: string
          is_active: boolean | null
          key_source: string | null
          last_used_at: string | null
          project_id: string
          provider: string
          updated_at: string | null
          usage_this_month: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          encrypted_key?: string | null
          id?: string
          is_active?: boolean | null
          key_source?: string | null
          last_used_at?: string | null
          project_id: string
          provider: string
          updated_at?: string | null
          usage_this_month?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          encrypted_key?: string | null
          id?: string
          is_active?: boolean | null
          key_source?: string | null
          last_used_at?: string | null
          project_id?: string
          provider?: string
          updated_at?: string | null
          usage_this_month?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_blueprints: {
        Row: {
          ai_reasoning: string | null
          avoid_components: string[] | null
          color_intensity: string
          component_preferences: Json | null
          created_at: string | null
          cta_intensity: string | null
          cta_positions: string[] | null
          cta_style: string | null
          id: string
          pacing: string
          project_id: string
          updated_at: string | null
          visual_style: string
        }
        Insert: {
          ai_reasoning?: string | null
          avoid_components?: string[] | null
          color_intensity?: string
          component_preferences?: Json | null
          created_at?: string | null
          cta_intensity?: string | null
          cta_positions?: string[] | null
          cta_style?: string | null
          id?: string
          pacing?: string
          project_id: string
          updated_at?: string | null
          visual_style?: string
        }
        Update: {
          ai_reasoning?: string | null
          avoid_components?: string[] | null
          color_intensity?: string
          component_preferences?: Json | null
          created_at?: string | null
          cta_intensity?: string | null
          cta_positions?: string[] | null
          cta_style?: string | null
          id?: string
          pacing?: string
          project_id?: string
          updated_at?: string | null
          visual_style?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_blueprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_design_defaults: {
        Row: {
          component_preferences: Json | null
          created_at: string | null
          default_personality: string | null
          design_profile_id: string | null
          id: string
          project_id: string
          spacing_preference: string | null
          updated_at: string | null
          visual_intensity: string | null
        }
        Insert: {
          component_preferences?: Json | null
          created_at?: string | null
          default_personality?: string | null
          design_profile_id?: string | null
          id?: string
          project_id: string
          spacing_preference?: string | null
          updated_at?: string | null
          visual_intensity?: string | null
        }
        Update: {
          component_preferences?: Json | null
          created_at?: string | null
          default_personality?: string | null
          design_profile_id?: string | null
          id?: string
          project_id?: string
          spacing_preference?: string | null
          updated_at?: string | null
          visual_intensity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_design_defaults_design_profile_id_fkey"
            columns: ["design_profile_id"]
            isOneToOne: false
            referencedRelation: "design_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_design_defaults_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          monthly_usage_limit_usd: number | null
          permission_overrides: Json | null
          project_id: string
          role: string | null
          source: string | null
          usage_reset_at: string | null
          usage_this_month_usd: number | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          monthly_usage_limit_usd?: number | null
          permission_overrides?: Json | null
          project_id: string
          role?: string | null
          source?: string | null
          usage_reset_at?: string | null
          usage_this_month_usd?: number | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          monthly_usage_limit_usd?: number | null
          permission_overrides?: Json | null
          project_id?: string
          role?: string | null
          source?: string | null
          usage_reset_at?: string | null
          usage_this_month_usd?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          analysis_result: Json | null
          api_key_mode: string | null
          apify_token: string | null
          created_at: string | null
          domain: string | null
          id: string
          organization_id: string | null
          project_name: string
          seed_keyword: string | null
          status: string | null
          status_message: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          analysis_result?: Json | null
          api_key_mode?: string | null
          apify_token?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          organization_id?: string | null
          project_name: string
          seed_keyword?: string | null
          status?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          analysis_result?: Json | null
          api_key_mode?: string | null
          apify_token?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          organization_id?: string | null
          project_name?: string
          seed_keyword?: string | null
          status?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          available_variables: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_version_id: string | null
          prompt_key: string
          template_content: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          available_variables?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_version_id?: string | null
          prompt_key: string
          template_content: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          available_variables?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_version_id?: string | null
          prompt_key?: string
          template_content?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_history: {
        Row: {
          action: string
          app_content_snapshot: string | null
          content_diff_summary: string | null
          created_at: string | null
          id: string
          new_status: string | null
          previous_status: string | null
          publication_id: string
          triggered_by: string | null
          wp_content_snapshot: string | null
        }
        Insert: {
          action: string
          app_content_snapshot?: string | null
          content_diff_summary?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          publication_id: string
          triggered_by?: string | null
          wp_content_snapshot?: string | null
        }
        Update: {
          action?: string
          app_content_snapshot?: string | null
          content_diff_summary?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          publication_id?: string
          triggered_by?: string | null
          wp_content_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_history_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "wordpress_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publishing_styles: {
        Row: {
          created_at: string | null
          design_tokens: Json
          id: string
          is_default: boolean | null
          name: string
          project_id: string
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          design_tokens?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          project_id: string
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          design_tokens?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          project_id?: string
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publishing_styles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_analytics_daily: {
        Row: {
          articles_auto_fixed: number | null
          articles_generated: number | null
          articles_manual_intervention: number | null
          articles_passed_first_time: number | null
          conflict_patterns: Json | null
          created_at: string | null
          date: string
          id: string
          organization_id: string | null
          rule_compliance: Json | null
          user_id: string | null
        }
        Insert: {
          articles_auto_fixed?: number | null
          articles_generated?: number | null
          articles_manual_intervention?: number | null
          articles_passed_first_time?: number | null
          conflict_patterns?: Json | null
          created_at?: string | null
          date: string
          id?: string
          organization_id?: string | null
          rule_compliance?: Json | null
          user_id?: string | null
        }
        Update: {
          articles_auto_fixed?: number | null
          articles_generated?: number | null
          articles_manual_intervention?: number | null
          articles_passed_first_time?: number | null
          conflict_patterns?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          organization_id?: string | null
          rule_compliance?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_analytics_daily_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quality_analytics_daily_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_analytics_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_rules: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          is_critical: boolean | null
          name: string
          severity: string | null
          threshold: Json | null
          updated_at: string | null
          upgrade_date: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id: string
          is_critical?: boolean | null
          name: string
          severity?: string | null
          threshold?: Json | null
          updated_at?: string | null
          upgrade_date?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          is_critical?: boolean | null
          name?: string
          severity?: string | null
          threshold?: Json | null
          updated_at?: string | null
          upgrade_date?: string | null
        }
        Relationships: []
      }
      query_network_audits: {
        Row: {
          competitor_eavs: Json | null
          content_gaps: Json | null
          created_at: string | null
          id: string
          intent_distribution: Json | null
          language: string | null
          map_id: string
          query_network: Json | null
          questions: Json | null
          recommendations: Json | null
          seed_keyword: string
          target_domain: string | null
          total_competitor_eavs: number | null
          total_content_gaps: number | null
          total_queries: number | null
          total_recommendations: number | null
          user_id: string
        }
        Insert: {
          competitor_eavs?: Json | null
          content_gaps?: Json | null
          created_at?: string | null
          id?: string
          intent_distribution?: Json | null
          language?: string | null
          map_id: string
          query_network?: Json | null
          questions?: Json | null
          recommendations?: Json | null
          seed_keyword: string
          target_domain?: string | null
          total_competitor_eavs?: number | null
          total_content_gaps?: number | null
          total_queries?: number | null
          total_recommendations?: number | null
          user_id: string
        }
        Update: {
          competitor_eavs?: Json | null
          content_gaps?: Json | null
          created_at?: string | null
          id?: string
          intent_distribution?: Json | null
          language?: string | null
          map_id?: string
          query_network?: Json | null
          questions?: Json | null
          recommendations?: Json | null
          seed_keyword?: string
          target_domain?: string | null
          total_competitor_eavs?: number | null
          total_content_gaps?: number | null
          total_queries?: number | null
          total_recommendations?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_network_audits_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_network_audits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_packages: {
        Row: {
          base_price: number
          created_at: string | null
          description: string | null
          discount_percent: number | null
          display_order: number | null
          id: string
          included_modules: Json
          is_active: boolean | null
          name: string
          target_site_sizes: string[] | null
          updated_at: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          display_order?: number | null
          id: string
          included_modules?: Json
          is_active?: boolean | null
          name: string
          target_site_sizes?: string[] | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          included_modules?: Json
          is_active?: boolean | null
          name?: string
          target_site_sizes?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotation_service_modules: {
        Row: {
          base_price_max: number
          base_price_min: number
          category: string
          created_at: string | null
          deliverables: Json | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          kpi_contributions: Json | null
          name: string
          recurring_interval: string | null
          updated_at: string | null
        }
        Insert: {
          base_price_max: number
          base_price_min: number
          category: string
          created_at?: string | null
          deliverables?: Json | null
          description?: string | null
          display_order?: number | null
          id: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          kpi_contributions?: Json | null
          name: string
          recurring_interval?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price_max?: number
          base_price_min?: number
          category?: string
          created_at?: string | null
          deliverables?: Json | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          kpi_contributions?: Json | null
          name?: string
          recurring_interval?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          created_by: string | null
          details: Json | null
          id: string
          quote_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          quote_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          quote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_activities_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          analysis_data: Json | null
          client_company: string | null
          client_domain: string | null
          client_email: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          discount_percent: number | null
          id: string
          internal_notes: string | null
          kpi_projections: Json | null
          line_items: Json
          notes: string | null
          organization_id: string | null
          parent_quote_id: string | null
          pricing_factors: Json | null
          questionnaire_responses: Json | null
          responded_at: string | null
          roi_calculation: Json | null
          selected_package_id: string | null
          sent_at: string | null
          status: string | null
          subtotal: number | null
          total_max: number | null
          total_min: number | null
          updated_at: string | null
          valid_until: string | null
          version: number | null
          viewed_at: string | null
        }
        Insert: {
          analysis_data?: Json | null
          client_company?: string | null
          client_domain?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_percent?: number | null
          id?: string
          internal_notes?: string | null
          kpi_projections?: Json | null
          line_items?: Json
          notes?: string | null
          organization_id?: string | null
          parent_quote_id?: string | null
          pricing_factors?: Json | null
          questionnaire_responses?: Json | null
          responded_at?: string | null
          roi_calculation?: Json | null
          selected_package_id?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          total_max?: number | null
          total_min?: number | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
          viewed_at?: string | null
        }
        Update: {
          analysis_data?: Json | null
          client_company?: string | null
          client_domain?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_percent?: number | null
          id?: string
          internal_notes?: string | null
          kpi_projections?: Json | null
          line_items?: Json
          notes?: string | null
          organization_id?: string | null
          parent_quote_id?: string | null
          pricing_factors?: Json | null
          questionnaire_responses?: Json | null
          responded_at?: string | null
          roi_calculation?: Json | null
          selected_package_id?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          total_max?: number | null
          total_min?: number | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_selected_package_id_fkey"
            columns: ["selected_package_id"]
            isOneToOne: false
            referencedRelation: "quotation_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      refinement_patterns: {
        Row: {
          context: Json | null
          created_at: string | null
          frequency: number
          id: string
          last_used: string | null
          pattern_type: string
          project_id: string
          source_value: string
          target_value: string
          topical_map_id: string | null
          updated_at: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          frequency?: number
          id?: string
          last_used?: string | null
          pattern_type: string
          project_id: string
          source_value: string
          target_value: string
          topical_map_id?: string | null
          updated_at?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          frequency?: number
          id?: string
          last_used?: string | null
          pattern_type?: string
          project_id?: string
          source_value?: string
          target_value?: string
          topical_map_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refinement_patterns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refinement_patterns_topical_map_id_fkey"
            columns: ["topical_map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      role_module_access: {
        Row: {
          can_use: boolean | null
          created_at: string | null
          id: string
          module_id: string
          role: string
        }
        Insert: {
          can_use?: boolean | null
          created_at?: string | null
          id?: string
          module_id: string
          role: string
        }
        Update: {
          can_use?: boolean | null
          created_at?: string | null
          id?: string
          module_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_module_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      score_history: {
        Row: {
          competitive_parity_score: number
          content_readiness_score: number
          created_at: string
          entity_clarity_score: number
          id: string
          intent_alignment_score: number
          map_id: string
          metadata: Json | null
          overall_score: number
          tier_id: string
          topical_coverage_score: number
          trigger: string
          user_id: string
        }
        Insert: {
          competitive_parity_score: number
          content_readiness_score: number
          created_at?: string
          entity_clarity_score: number
          id?: string
          intent_alignment_score: number
          map_id: string
          metadata?: Json | null
          overall_score: number
          tier_id: string
          topical_coverage_score: number
          trigger?: string
          user_id: string
        }
        Update: {
          competitive_parity_score?: number
          content_readiness_score?: number
          created_at?: string
          entity_clarity_score?: number
          id?: string
          intent_alignment_score?: number
          map_id?: string
          metadata?: Json | null
          overall_score?: number
          tier_id?: string
          topical_coverage_score?: number
          trigger?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_history_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_analysis_results: {
        Row: {
          ce_alignment: number | null
          content_hash: string | null
          created_at: string | null
          csi_alignment: number | null
          detected_ce: string | null
          detected_csi: string | null
          detected_sc: string | null
          id: string
          inventory_id: string
          map_id: string | null
          overall_score: number | null
          result: Json
          sc_alignment: number | null
          updated_at: string | null
        }
        Insert: {
          ce_alignment?: number | null
          content_hash?: string | null
          created_at?: string | null
          csi_alignment?: number | null
          detected_ce?: string | null
          detected_csi?: string | null
          detected_sc?: string | null
          id?: string
          inventory_id: string
          map_id?: string | null
          overall_score?: number | null
          result: Json
          sc_alignment?: number | null
          updated_at?: string | null
        }
        Update: {
          ce_alignment?: number | null
          content_hash?: string | null
          created_at?: string | null
          csi_alignment?: number | null
          detected_ce?: string | null
          detected_csi?: string | null
          detected_sc?: string | null
          id?: string
          inventory_id?: string
          map_id?: string | null
          overall_score?: number | null
          result?: Json
          sc_alignment?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_analysis_results_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "site_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_analysis_results_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      site_analysis_pages: {
        Row: {
          apify_crawled: boolean | null
          apify_extraction: Json | null
          canonical_url: string | null
          content_changed: boolean | null
          content_hash: string | null
          content_layers: Json | null
          content_markdown: string | null
          crawl_error: string | null
          created_at: string | null
          discovered_via: string | null
          dom_nodes: number | null
          firecrawl_crawled: boolean | null
          firecrawl_extraction: Json | null
          h1: string | null
          headings: Json | null
          html_size_kb: number | null
          id: string
          images: Json | null
          jina_crawled: boolean | null
          jina_extraction: Json | null
          last_crawled_at: string | null
          links: Json | null
          load_time_ms: number | null
          meta_description: string | null
          path: string | null
          project_id: string
          robots_meta: string | null
          schema_json: Json | null
          schema_types: Json | null
          sitemap_changefreq: string | null
          sitemap_lastmod: string | null
          sitemap_priority: number | null
          status: string | null
          status_code: number | null
          title: string | null
          ttfb_ms: number | null
          updated_at: string | null
          url: string
          word_count: number | null
        }
        Insert: {
          apify_crawled?: boolean | null
          apify_extraction?: Json | null
          canonical_url?: string | null
          content_changed?: boolean | null
          content_hash?: string | null
          content_layers?: Json | null
          content_markdown?: string | null
          crawl_error?: string | null
          created_at?: string | null
          discovered_via?: string | null
          dom_nodes?: number | null
          firecrawl_crawled?: boolean | null
          firecrawl_extraction?: Json | null
          h1?: string | null
          headings?: Json | null
          html_size_kb?: number | null
          id?: string
          images?: Json | null
          jina_crawled?: boolean | null
          jina_extraction?: Json | null
          last_crawled_at?: string | null
          links?: Json | null
          load_time_ms?: number | null
          meta_description?: string | null
          path?: string | null
          project_id: string
          robots_meta?: string | null
          schema_json?: Json | null
          schema_types?: Json | null
          sitemap_changefreq?: string | null
          sitemap_lastmod?: string | null
          sitemap_priority?: number | null
          status?: string | null
          status_code?: number | null
          title?: string | null
          ttfb_ms?: number | null
          updated_at?: string | null
          url: string
          word_count?: number | null
        }
        Update: {
          apify_crawled?: boolean | null
          apify_extraction?: Json | null
          canonical_url?: string | null
          content_changed?: boolean | null
          content_hash?: string | null
          content_layers?: Json | null
          content_markdown?: string | null
          crawl_error?: string | null
          created_at?: string | null
          discovered_via?: string | null
          dom_nodes?: number | null
          firecrawl_crawled?: boolean | null
          firecrawl_extraction?: Json | null
          h1?: string | null
          headings?: Json | null
          html_size_kb?: number | null
          id?: string
          images?: Json | null
          jina_crawled?: boolean | null
          jina_extraction?: Json | null
          last_crawled_at?: string | null
          links?: Json | null
          load_time_ms?: number | null
          meta_description?: string | null
          path?: string | null
          project_id?: string
          robots_meta?: string | null
          schema_json?: Json | null
          schema_types?: Json | null
          sitemap_changefreq?: string | null
          sitemap_lastmod?: string | null
          sitemap_priority?: number | null
          status?: string | null
          status_code?: number | null
          title?: string | null
          ttfb_ms?: number | null
          updated_at?: string | null
          url?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_analysis_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "site_analysis_projects"
            referencedColumns: ["id"]
          },
        ]
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
          page_count: number | null
          pillars_source: string | null
          pillars_validated: boolean | null
          pillars_validated_at: string | null
          sitemap_url: string | null
          source_context: string | null
          source_context_type: string | null
          status: string | null
          status_message: string | null
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
          page_count?: number | null
          pillars_source?: string | null
          pillars_validated?: boolean | null
          pillars_validated_at?: string | null
          sitemap_url?: string | null
          source_context?: string | null
          source_context_type?: string | null
          status?: string | null
          status_message?: string | null
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
          page_count?: number | null
          pillars_source?: string | null
          pillars_validated?: boolean | null
          pillars_validated_at?: string | null
          sitemap_url?: string | null
          source_context?: string | null
          source_context_type?: string | null
          status?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_analysis_projects_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_analysis_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      site_schema_entities: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_primary: boolean | null
          map_id: string
          schema_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_primary?: boolean | null
          map_id: string
          schema_data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_primary?: boolean | null
          map_id?: string
          schema_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_schema_entities_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_schema_entities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_campaigns: {
        Row: {
          campaign_name: string | null
          created_at: string | null
          hub_platform: string | null
          id: string
          job_id: string | null
          overall_compliance_score: number | null
          status: string | null
          topic_id: string
          updated_at: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string | null
          hub_platform?: string | null
          id?: string
          job_id?: string | null
          overall_compliance_score?: number | null
          status?: string | null
          topic_id: string
          updated_at?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          campaign_name?: string | null
          created_at?: string | null
          hub_platform?: string | null
          id?: string
          job_id?: string | null
          overall_compliance_score?: number | null
          status?: string | null
          topic_id?: string
          updated_at?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_campaigns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_campaigns_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_export_history: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          export_format: string | null
          export_type: string | null
          id: string
          posts_included: string[] | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          export_format?: string | null
          export_type?: string | null
          id?: string
          posts_included?: string[] | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          export_format?: string | null
          export_type?: string | null
          id?: string
          posts_included?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_export_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_export_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_templates: {
        Row: {
          character_limits: Json | null
          content_pattern: string
          created_at: string | null
          cta_templates: string[] | null
          hashtag_strategy: Json | null
          id: string
          image_specs: Json | null
          is_default: boolean | null
          map_id: string | null
          platform: string
          template_name: string
          template_type: string
          user_id: string | null
        }
        Insert: {
          character_limits?: Json | null
          content_pattern: string
          created_at?: string | null
          cta_templates?: string[] | null
          hashtag_strategy?: Json | null
          id?: string
          image_specs?: Json | null
          is_default?: boolean | null
          map_id?: string | null
          platform: string
          template_name: string
          template_type: string
          user_id?: string | null
        }
        Update: {
          character_limits?: Json | null
          content_pattern?: string
          created_at?: string | null
          cta_templates?: string[] | null
          hashtag_strategy?: Json | null
          id?: string
          image_specs?: Json | null
          is_default?: boolean | null
          map_id?: string | null
          platform?: string
          template_name?: string
          template_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_templates_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          campaign_id: string | null
          content_text: string
          content_thread: Json | null
          created_at: string | null
          eav_triple: Json | null
          entities_mentioned: string[] | null
          exported_at: string | null
          hashtags: string[] | null
          id: string
          image_instructions: Json | null
          is_hub: boolean | null
          job_id: string | null
          link_url: string | null
          manually_posted_at: string | null
          mentions: string[] | null
          optimal_posting_time: string | null
          platform: string
          platform_post_url: string | null
          post_type: string
          posting_instructions: string | null
          semantic_compliance_score: number | null
          semantic_distance_from_hub: number | null
          short_link: string | null
          spoke_position: number | null
          status: string | null
          topic_id: string
          updated_at: string | null
          user_id: string
          utm_parameters: Json | null
        }
        Insert: {
          campaign_id?: string | null
          content_text: string
          content_thread?: Json | null
          created_at?: string | null
          eav_triple?: Json | null
          entities_mentioned?: string[] | null
          exported_at?: string | null
          hashtags?: string[] | null
          id?: string
          image_instructions?: Json | null
          is_hub?: boolean | null
          job_id?: string | null
          link_url?: string | null
          manually_posted_at?: string | null
          mentions?: string[] | null
          optimal_posting_time?: string | null
          platform: string
          platform_post_url?: string | null
          post_type: string
          posting_instructions?: string | null
          semantic_compliance_score?: number | null
          semantic_distance_from_hub?: number | null
          short_link?: string | null
          spoke_position?: number | null
          status?: string | null
          topic_id: string
          updated_at?: string | null
          user_id: string
          utm_parameters?: Json | null
        }
        Update: {
          campaign_id?: string | null
          content_text?: string
          content_thread?: Json | null
          created_at?: string | null
          eav_triple?: Json | null
          entities_mentioned?: string[] | null
          exported_at?: string | null
          hashtags?: string[] | null
          id?: string
          image_instructions?: Json | null
          is_hub?: boolean | null
          job_id?: string | null
          link_url?: string | null
          manually_posted_at?: string | null
          mentions?: string[] | null
          optimal_posting_time?: string | null
          platform?: string
          platform_post_url?: string | null
          post_type?: string
          posting_instructions?: string | null
          semantic_compliance_score?: number | null
          semantic_distance_from_hub?: number | null
          short_link?: string | null
          spoke_position?: number | null
          status?: string | null
          topic_id?: string
          updated_at?: string | null
          user_id?: string
          utm_parameters?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_ab_assignments: {
        Row: {
          assigned_template: string
          assigned_variant: string
          audit_score: number | null
          completed_at: string | null
          created_at: string | null
          generation_time_ms: number | null
          id: string
          job_id: string | null
          template_compliance_score: number | null
          test_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_template: string
          assigned_variant: string
          audit_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          generation_time_ms?: number | null
          id?: string
          job_id?: string | null
          template_compliance_score?: number | null
          test_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_template?: string
          assigned_variant?: string
          audit_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          generation_time_ms?: number | null
          id?: string
          job_id?: string | null
          template_compliance_score?: number | null
          test_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_ab_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_ab_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "template_ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_ab_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_ab_tests: {
        Row: {
          control_avg_audit_score: number | null
          control_count: number | null
          control_template: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          min_authority_score: number | null
          name: string
          start_date: string | null
          statistical_significance: number | null
          traffic_split: number | null
          updated_at: string | null
          variant_avg_audit_score: number | null
          variant_count: number | null
          variant_template: string
          website_types: string[] | null
        }
        Insert: {
          control_avg_audit_score?: number | null
          control_count?: number | null
          control_template: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          min_authority_score?: number | null
          name: string
          start_date?: string | null
          statistical_significance?: number | null
          traffic_split?: number | null
          updated_at?: string | null
          variant_avg_audit_score?: number | null
          variant_count?: number | null
          variant_template: string
          website_types?: string[] | null
        }
        Update: {
          control_avg_audit_score?: number | null
          control_count?: number | null
          control_template?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          min_authority_score?: number | null
          name?: string
          start_date?: string | null
          statistical_significance?: number | null
          traffic_split?: number | null
          updated_at?: string | null
          variant_avg_audit_score?: number | null
          variant_count?: number | null
          variant_template?: string
          website_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "template_ab_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_version_history: {
        Row: {
          action: string
          id: string
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          previous_active_version_id: string | null
          template_name: string
          version_id: string | null
        }
        Insert: {
          action: string
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          previous_active_version_id?: string | null
          template_name: string
          version_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          previous_active_version_id?: string | null
          template_name?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_version_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_version_history_previous_active_version_id_fkey"
            columns: ["previous_active_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_version_history_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          activated_at: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          deactivated_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          label: string | null
          rollback_reason: string | null
          rolled_back_at: string | null
          rolled_back_from: string | null
          template_name: string
          version_number: number
        }
        Insert: {
          activated_at?: string | null
          config: Json
          created_at?: string | null
          created_by?: string | null
          deactivated_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          rolled_back_from?: string | null
          template_name: string
          version_number: number
        }
        Update: {
          activated_at?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          deactivated_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          rolled_back_from?: string | null
          template_name?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_rolled_back_from_fkey"
            columns: ["rolled_back_from"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_serp_analysis: {
        Row: {
          analysis_time_ms: number | null
          analyzed_at: string | null
          competitors: Json | null
          created_at: string | null
          expires_at: string | null
          gaps: Json | null
          id: string
          mode: string
          patterns: Json | null
          scores: Json | null
          serp_data: Json | null
          topic_id: string | null
          topic_title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_time_ms?: number | null
          analyzed_at?: string | null
          competitors?: Json | null
          created_at?: string | null
          expires_at?: string | null
          gaps?: Json | null
          id?: string
          mode: string
          patterns?: Json | null
          scores?: Json | null
          serp_data?: Json | null
          topic_id?: string | null
          topic_title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_time_ms?: number | null
          analyzed_at?: string | null
          competitors?: Json | null
          created_at?: string | null
          expires_at?: string | null
          gaps?: Json | null
          id?: string
          mode?: string
          patterns?: Json | null
          scores?: Json | null
          serp_data?: Json | null
          topic_id?: string | null
          topic_title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_serp_analysis_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_serp_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topical_map_blueprints: {
        Row: {
          ai_reasoning: string | null
          cluster_rules: Json | null
          color_intensity: string | null
          component_preferences: Json | null
          created_at: string | null
          cta_intensity: string | null
          cta_positions: string[] | null
          cta_style: string | null
          id: string
          pacing: string | null
          project_id: string
          topical_map_id: string
          updated_at: string | null
          visual_style: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          cluster_rules?: Json | null
          color_intensity?: string | null
          component_preferences?: Json | null
          created_at?: string | null
          cta_intensity?: string | null
          cta_positions?: string[] | null
          cta_style?: string | null
          id?: string
          pacing?: string | null
          project_id: string
          topical_map_id: string
          updated_at?: string | null
          visual_style?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          cluster_rules?: Json | null
          color_intensity?: string | null
          component_preferences?: Json | null
          created_at?: string | null
          cta_intensity?: string | null
          cta_positions?: string[] | null
          cta_style?: string | null
          id?: string
          pacing?: string | null
          project_id?: string
          topical_map_id?: string
          updated_at?: string | null
          visual_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topical_map_blueprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topical_map_blueprints_topical_map_id_fkey"
            columns: ["topical_map_id"]
            isOneToOne: true
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      topical_map_design_rules: {
        Row: {
          cluster_rules: Json | null
          created_at: string | null
          id: string
          inherit_from_project: boolean | null
          overrides: Json | null
          project_id: string
          topical_map_id: string
          updated_at: string | null
        }
        Insert: {
          cluster_rules?: Json | null
          created_at?: string | null
          id?: string
          inherit_from_project?: boolean | null
          overrides?: Json | null
          project_id: string
          topical_map_id: string
          updated_at?: string | null
        }
        Update: {
          cluster_rules?: Json | null
          created_at?: string | null
          id?: string
          inherit_from_project?: boolean | null
          overrides?: Json | null
          project_id?: string
          topical_map_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topical_map_design_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topical_map_design_rules_topical_map_id_fkey"
            columns: ["topical_map_id"]
            isOneToOne: true
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      topical_maps: {
        Row: {
          analysis_state: Json | null
          business_info: Json | null
          competitors: Json | null
          created_at: string | null
          domain: string | null
          eavs: Json | null
          id: string
          map_type: string | null
          name: string
          pillars: Json | null
          project_id: string
          seo_pillars: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_state?: Json | null
          business_info?: Json | null
          competitors?: Json | null
          created_at?: string | null
          domain?: string | null
          eavs?: Json | null
          id?: string
          map_type?: string | null
          name: string
          pillars?: Json | null
          project_id: string
          seo_pillars?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_state?: Json | null
          business_info?: Json | null
          competitors?: Json | null
          created_at?: string | null
          domain?: string | null
          eavs?: Json | null
          id?: string
          map_type?: string | null
          name?: string
          pillars?: Json | null
          project_id?: string
          seo_pillars?: Json | null
          status?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "topical_maps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          actual_publication_date: string | null
          attribute_focus: string | null
          blueprint: Json | null
          canonical_query: string | null
          cluster_role: string | null
          created_at: string | null
          decay_score: number | null
          description: string | null
          display_parent_id: string | null
          freshness: string | null
          id: string
          map_id: string
          metadata: Json | null
          optimal_publication_date: string | null
          parent_topic_id: string | null
          planned_publication_date: string | null
          planning_notes: string | null
          priority_level: string | null
          priority_score: number | null
          publication_dependencies: string[] | null
          publication_phase: string | null
          publication_status: string | null
          query_network: Json | null
          query_type: string | null
          scheduled_date: string | null
          slug: string | null
          title: string
          topic_class: string | null
          topical_border_note: string | null
          type: string
          updated_at: string | null
          url_slug_hint: string | null
          user_id: string | null
        }
        Insert: {
          actual_publication_date?: string | null
          attribute_focus?: string | null
          blueprint?: Json | null
          canonical_query?: string | null
          cluster_role?: string | null
          created_at?: string | null
          decay_score?: number | null
          description?: string | null
          display_parent_id?: string | null
          freshness?: string | null
          id?: string
          map_id: string
          metadata?: Json | null
          optimal_publication_date?: string | null
          parent_topic_id?: string | null
          planned_publication_date?: string | null
          planning_notes?: string | null
          priority_level?: string | null
          priority_score?: number | null
          publication_dependencies?: string[] | null
          publication_phase?: string | null
          publication_status?: string | null
          query_network?: Json | null
          query_type?: string | null
          scheduled_date?: string | null
          slug?: string | null
          title: string
          topic_class?: string | null
          topical_border_note?: string | null
          type: string
          updated_at?: string | null
          url_slug_hint?: string | null
          user_id?: string | null
        }
        Update: {
          actual_publication_date?: string | null
          attribute_focus?: string | null
          blueprint?: Json | null
          canonical_query?: string | null
          cluster_role?: string | null
          created_at?: string | null
          decay_score?: number | null
          description?: string | null
          display_parent_id?: string | null
          freshness?: string | null
          id?: string
          map_id?: string
          metadata?: Json | null
          optimal_publication_date?: string | null
          parent_topic_id?: string | null
          planned_publication_date?: string | null
          planning_notes?: string | null
          priority_level?: string | null
          priority_score?: number | null
          publication_dependencies?: string[] | null
          publication_phase?: string | null
          publication_status?: string | null
          query_network?: Json | null
          query_type?: string | null
          scheduled_date?: string | null
          slug?: string | null
          title?: string
          topic_class?: string | null
          topical_border_note?: string | null
          type?: string
          updated_at?: string | null
          url_slug_hint?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_display_parent_id_fkey"
            columns: ["display_parent_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          ai_model: string | null
          ai_provider: string | null
          anthropic_api_key: string | null
          apify_token: string | null
          apitemplate_api_key: string | null
          cloudinary_api_key: string | null
          cloudinary_cloud_name: string | null
          cloudinary_upload_preset: string | null
          created_at: string | null
          dataforseo_login: string | null
          dataforseo_password: string | null
          firecrawl_api_key: string | null
          gemini_api_key: string | null
          id: string
          infranodus_api_key: string | null
          is_super_admin: boolean | null
          jina_api_key: string | null
          markupgo_api_key: string | null
          neo4j_password: string | null
          neo4j_uri: string | null
          neo4j_user: string | null
          openai_api_key: string | null
          openrouter_api_key: string | null
          perplexity_api_key: string | null
          settings_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          anthropic_api_key?: string | null
          apify_token?: string | null
          apitemplate_api_key?: string | null
          cloudinary_api_key?: string | null
          cloudinary_cloud_name?: string | null
          cloudinary_upload_preset?: string | null
          created_at?: string | null
          dataforseo_login?: string | null
          dataforseo_password?: string | null
          firecrawl_api_key?: string | null
          gemini_api_key?: string | null
          id?: string
          infranodus_api_key?: string | null
          is_super_admin?: boolean | null
          jina_api_key?: string | null
          markupgo_api_key?: string | null
          neo4j_password?: string | null
          neo4j_uri?: string | null
          neo4j_user?: string | null
          openai_api_key?: string | null
          openrouter_api_key?: string | null
          perplexity_api_key?: string | null
          settings_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          anthropic_api_key?: string | null
          apify_token?: string | null
          apitemplate_api_key?: string | null
          cloudinary_api_key?: string | null
          cloudinary_cloud_name?: string | null
          cloudinary_upload_preset?: string | null
          created_at?: string | null
          dataforseo_login?: string | null
          dataforseo_password?: string | null
          firecrawl_api_key?: string | null
          gemini_api_key?: string | null
          id?: string
          infranodus_api_key?: string | null
          is_super_admin?: boolean | null
          jina_api_key?: string | null
          markupgo_api_key?: string | null
          neo4j_password?: string | null
          neo4j_uri?: string | null
          neo4j_user?: string | null
          openai_api_key?: string | null
          openrouter_api_key?: string | null
          perplexity_api_key?: string | null
          settings_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_analytics: {
        Row: {
          created_at: string | null
          date: string
          gsc_clicks: number | null
          gsc_ctr: number | null
          gsc_impressions: number | null
          gsc_position: number | null
          gsc_queries: Json | null
          id: string
          publication_id: string
          wp_comments: number | null
          wp_views: number | null
          wp_visitors: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          gsc_clicks?: number | null
          gsc_ctr?: number | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          gsc_queries?: Json | null
          id?: string
          publication_id: string
          wp_comments?: number | null
          wp_views?: number | null
          wp_visitors?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          gsc_clicks?: number | null
          gsc_ctr?: number | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          gsc_queries?: Json | null
          id?: string
          publication_id?: string
          wp_comments?: number | null
          wp_views?: number | null
          wp_visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_analytics_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "wordpress_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_connections: {
        Row: {
          api_password_encrypted: string
          api_username: string
          created_at: string | null
          hmac_secret_encrypted: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string | null
          plugin_verified_at: string | null
          plugin_version: string | null
          project_id: string | null
          site_name: string | null
          site_url: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_password_encrypted: string
          api_username: string
          created_at?: string | null
          hmac_secret_encrypted?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string | null
          plugin_verified_at?: string | null
          plugin_version?: string | null
          project_id?: string | null
          site_name?: string | null
          site_url: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_password_encrypted?: string
          api_username?: string
          created_at?: string | null
          hmac_secret_encrypted?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string | null
          plugin_verified_at?: string | null
          plugin_version?: string | null
          project_id?: string | null
          site_name?: string | null
          site_url?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "wordpress_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_media: {
        Row: {
          alt_text: string | null
          app_image_url: string | null
          caption: string | null
          connection_id: string
          created_at: string | null
          file_size: number | null
          height: number | null
          id: string
          image_type: string | null
          mime_type: string | null
          placeholder_id: string | null
          publication_id: string | null
          width: number | null
          wp_media_id: number
          wp_media_url: string
          wp_thumbnail_url: string | null
        }
        Insert: {
          alt_text?: string | null
          app_image_url?: string | null
          caption?: string | null
          connection_id: string
          created_at?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          image_type?: string | null
          mime_type?: string | null
          placeholder_id?: string | null
          publication_id?: string | null
          width?: number | null
          wp_media_id: number
          wp_media_url: string
          wp_thumbnail_url?: string | null
        }
        Update: {
          alt_text?: string | null
          app_image_url?: string | null
          caption?: string | null
          connection_id?: string
          created_at?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          image_type?: string | null
          mime_type?: string | null
          placeholder_id?: string | null
          publication_id?: string | null
          width?: number | null
          wp_media_id?: number
          wp_media_url?: string
          wp_thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_media_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "wordpress_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_media_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "wordpress_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_publications: {
        Row: {
          app_version_hash: string | null
          brief_id: string | null
          connection_id: string
          created_at: string | null
          has_wp_changes: boolean | null
          id: string
          last_pulled_at: string | null
          last_pushed_at: string | null
          last_sync_status: string | null
          layout_config: Json | null
          organization_id: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string | null
          style_config: Json | null
          topic_id: string
          updated_at: string | null
          wp_post_id: number
          wp_post_slug: string | null
          wp_post_type: string | null
          wp_post_url: string | null
          wp_version_hash: string | null
        }
        Insert: {
          app_version_hash?: string | null
          brief_id?: string | null
          connection_id: string
          created_at?: string | null
          has_wp_changes?: boolean | null
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          last_sync_status?: string | null
          layout_config?: Json | null
          organization_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          style_config?: Json | null
          topic_id: string
          updated_at?: string | null
          wp_post_id: number
          wp_post_slug?: string | null
          wp_post_type?: string | null
          wp_post_url?: string | null
          wp_version_hash?: string | null
        }
        Update: {
          app_version_hash?: string | null
          brief_id?: string | null
          connection_id?: string
          created_at?: string | null
          has_wp_changes?: boolean | null
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          last_sync_status?: string | null
          layout_config?: Json | null
          organization_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          style_config?: Json | null
          topic_id?: string
          updated_at?: string | null
          wp_post_id?: number
          wp_post_slug?: string | null
          wp_post_type?: string | null
          wp_post_url?: string | null
          wp_version_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_publications_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "content_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_publications_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "wordpress_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_publications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_quality_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "wordpress_publications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_publications_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_usage_summary: {
        Row: {
          avg_duration_ms: number | null
          call_count: number | null
          day: string | null
          error_count: number | null
          map_id: string | null
          model: string | null
          operation: string | null
          project_id: string | null
          provider: string | null
          success_count: number | null
          total_cost_usd: number | null
          total_tokens_in: number | null
          total_tokens_out: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_reports: {
        Row: {
          avg_duration_ms: number | null
          billable_to: string | null
          error_count: number | null
          key_source: string | null
          map_id: string | null
          model: string | null
          operation: string | null
          organization_id: string | null
          project_id: string | null
          provider: string | null
          report_date: string | null
          request_count: number | null
          total_cost_usd: number | null
          total_tokens: number | null
          total_tokens_in: number | null
          total_tokens_out: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "topical_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_quality_metrics: {
        Row: {
          avg_audit_score: number | null
          completed_generations: number | null
          high_quality_count: number | null
          low_quality_count: number | null
          organization_id: string | null
          organization_name: string | null
          total_briefs: number | null
          total_generations: number | null
        }
        Relationships: []
      }
      performance_summary: {
        Row: {
          avg_duration_ms: number | null
          call_count: number | null
          category: string | null
          first_call: string | null
          job_id: string | null
          last_call: string | null
          max_duration_ms: number | null
          median_duration_ms: number | null
          min_duration_ms: number | null
          operation: string | null
          p95_duration_ms: number | null
          success_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          last_sign_in_at: string | null
          raw_user_meta_data: Json | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_sign_in_at?: string | null
          raw_user_meta_data?: Json | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_sign_in_at?: string | null
          raw_user_meta_data?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: Json }
      activate_template_version: {
        Args: { p_user_id?: string; p_version_id: string }
        Returns: boolean
      }
      admin_get_all_projects: {
        Args: never
        Returns: {
          created_at: string
          domain: string
          id: string
          map_count: number
          project_name: string
          updated_at: string
          user_email: string
          user_id: string
        }[]
      }
      admin_reassign_project: {
        Args: { p_new_user_id: string; p_project_id: string }
        Returns: Json
      }
      calculate_ai_cost: {
        Args: {
          p_input_tokens: number
          p_model: string
          p_output_tokens: number
          p_provider: string
          p_timestamp?: string
        }
        Returns: number
      }
      can_use_feature:
        | { Args: { p_feature: string }; Returns: boolean }
        | { Args: { p_feature: string; p_org_id: string }; Returns: boolean }
      check_external_usage_limit: {
        Args: {
          p_estimated_cost: number
          p_project_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_table_exists: {
        Args: { schema_name: string; table_name: string }
        Returns: boolean
      }
      claim_migrated_data: { Args: never; Returns: Json }
      cleanup_expired_topic_serp_analysis: { Args: never; Returns: number }
      cleanup_old_api_call_logs: { Args: never; Returns: number }
      cleanup_old_console_logs: { Args: never; Returns: number }
      cleanup_old_performance_metrics: { Args: never; Returns: number }
      compare_metrics_snapshots: {
        Args: { p_snapshot_id_1: string; p_snapshot_id_2: string }
        Returns: Json
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
        Returns: Json
      }
      create_new_project: { Args: { p_project_data: Json }; Returns: Json }
      current_org_id: { Args: never; Returns: string }
      current_org_role: { Args: never; Returns: string }
      decline_invitation: { Args: { p_token: string }; Returns: Json }
      delete_secret: { Args: { p_secret_id: string }; Returns: boolean }
      get_active_template_version: {
        Args: { p_template_name: string }
        Returns: Json
      }
      get_available_features: { Args: { p_org_id: string }; Returns: string[] }
      get_billable_info: {
        Args: { p_project_id: string; p_provider: string }
        Returns: Json
      }
      get_default_layout_template: {
        Args: { p_template_type: string; p_user_id: string }
        Returns: string
      }
      get_help_article_by_feature_key: {
        Args: { p_feature_key: string }
        Returns: {
          article_slug: string
          category_slug: string
          id: string
          summary: string
          title: string
        }[]
      }
      get_help_article_by_slug: {
        Args: { p_article_slug: string; p_category_slug: string }
        Returns: {
          category_id: string
          category_name: string
          category_slug: string
          content: string
          feature_keys: string[]
          id: string
          metadata: Json
          published_at: string
          slug: string
          summary: string
          title: string
        }[]
      }
      get_latest_audits: {
        Args: { p_map_id: string }
        Returns: {
          audit_id: string
          audit_type: string
          created_at: string
          summary: Json
        }[]
      }
      get_latest_score: {
        Args: { p_map_id: string }
        Returns: {
          created_at: string
          overall_score: number
          tier_id: string
        }[]
      }
      get_map_usage_stats: {
        Args: { p_map_id: string }
        Returns: {
          avg_duration_ms: number
          call_count: number
          model: string
          operation: string
          provider: string
          total_cost_usd: number
          total_tokens_in: number
          total_tokens_out: number
        }[]
      }
      get_next_audit_version: { Args: { p_page_id: string }; Returns: number }
      get_or_create_default_publishing_style: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_org_cost_summary: {
        Args: { p_end_date?: string; p_org_id: string; p_start_date?: string }
        Returns: {
          by_project: Json
          by_provider: Json
          by_user: Json
          daily_trend: Json
          total_cost_usd: number
          total_requests: number
          total_tokens: number
        }[]
      }
      get_org_role: { Args: { org_id: string }; Returns: string }
      get_project_id_from_blueprint: {
        Args: { bp_id: string }
        Returns: string
      }
      get_project_id_from_map: { Args: { map_id: string }; Returns: string }
      get_project_publications: {
        Args: { p_project_id: string }
        Returns: {
          has_wp_changes: boolean
          publication_id: string
          published_at: string
          site_url: string
          status: string
          topic_id: string
          topic_title: string
          wp_post_url: string
        }[]
      }
      get_project_role: { Args: { proj_id: string }; Returns: string }
      get_quality_score: { Args: { job_id: string }; Returns: number }
      get_quality_trend: {
        Args: { p_job_id: string }
        Returns: {
          delta: number
          pass_number: number
          score: number
        }[]
      }
      get_related_help_articles: {
        Args: { p_article_id: string; p_limit?: number }
        Returns: {
          article_slug: string
          category_slug: string
          id: string
          summary: string
          title: string
        }[]
      }
      get_score_delta: {
        Args: { p_map_id: string }
        Returns: {
          current_score: number
          current_tier: string
          delta: number
          previous_score: number
          previous_tier: string
          tier_changed: boolean
        }[]
      }
      get_score_trend: {
        Args: { p_limit?: number; p_map_id: string }
        Returns: {
          created_at: string
          overall_score: number
          tier_id: string
          trigger: string
        }[]
      }
      get_secret: { Args: { p_secret_id: string }; Returns: string }
      get_topic_publication_status: {
        Args: { p_topic_id: string }
        Returns: {
          connection_id: string
          has_wp_changes: boolean
          last_pushed_at: string
          published_at: string
          site_name: string
          site_url: string
          status: string
          wp_post_id: number
          wp_post_url: string
        }[]
      }
      get_topic_serp_analysis: {
        Args: {
          p_max_age_hours?: number
          p_topic_id: string
          p_user_id: string
        }
        Returns: {
          analyzed_at: string
          competitors: Json
          gaps: Json
          id: string
          is_fresh: boolean
          mode: string
          patterns: Json
          scores: Json
          serp_data: Json
          topic_title: string
        }[]
      }
      get_user_usage_stats: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          avg_duration_ms: number
          call_count: number
          model: string
          provider: string
          success_rate: number
          total_cost_usd: number
          total_tokens_in: number
          total_tokens_out: number
        }[]
      }
      has_api_key: {
        Args: { p_project_id: string; p_provider: string }
        Returns: boolean
      }
      has_map_access: { Args: { map_id: string }; Returns: boolean }
      has_project_access: { Args: { proj_id: string }; Returns: boolean }
      has_site_analysis_project_access: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      has_topic_access: { Args: { topic_id: string }; Returns: boolean }
      increment_external_usage: {
        Args: { p_cost: number; p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_feature_enabled: {
        Args: { p_flag_key: string; p_org_id?: string; p_user_id?: string }
        Returns: boolean
      }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_ip_address?: unknown
          p_new_value?: Json
          p_old_value?: Json
          p_org_id: string
          p_target_email?: string
          p_target_id?: string
          p_target_type?: string
          p_user_agent?: string
        }
        Returns: string
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
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "navigation_sync_status"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      org_has_module: {
        Args: { p_module_id: string; p_org_id: string }
        Returns: boolean
      }
      process_cost_refresh_queue: { Args: never; Returns: number }
      recalculate_organization_scores: {
        Args: { p_org_id?: string }
        Returns: undefined
      }
      refresh_cost_reports: { Args: never; Returns: undefined }
      refresh_org_costs: { Args: { p_org_id: string }; Returns: undefined }
      resend_invitation: { Args: { p_invitation_id: string }; Returns: Json }
      resolve_api_key: {
        Args: { p_project_id: string; p_provider: string }
        Returns: {
          billable_id: string
          billable_to: string
          encrypted_key: string
          key_source: string
        }[]
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
      rollback_template_version: {
        Args: {
          p_reason?: string
          p_target_version_id: string
          p_template_name: string
          p_user_id?: string
        }
        Returns: boolean
      }
      rollback_to_pass: {
        Args: { p_job_id: string; p_pass_number: number }
        Returns: undefined
      }
      rotate_secret: {
        Args: { p_new_secret: string; p_old_secret_id: string }
        Returns: string
      }
      search_help_articles: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          category_id: string
          category_slug: string
          id: string
          rank: number
          slug: string
          summary: string
          title: string
        }[]
      }
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
      store_secret: {
        Args: { p_description?: string; p_name?: string; p_secret: string }
        Returns: string
      }
      sync_sitemap_pages: {
        Args: { p_project_id: string; pages_data: Json }
        Returns: Json
      }
      update_ab_test_stats: { Args: { p_test_id: string }; Returns: undefined }
      update_crawled_pages: { Args: { page_updates: Json }; Returns: Json }
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
      section_type: "CORE_SECTION" | "AUTHOR_SECTION" | "ORPHAN"
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
  graphql_public: {
    Enums: {},
  },
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
      section_type: ["CORE_SECTION", "AUTHOR_SECTION", "ORPHAN"],
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
A new version of Supabase CLI is available: v2.72.7 (currently installed v2.67.1)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  discovery: {
    Tables: {
      crawl_sessions: {
        Row: {
          created_at: string
          domain: string | null
          finished_at: string | null
          id: string
          internal_links_count: number | null
          project_id: string
          started_at: string | null
          status: string
          status_message: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          finished_at?: string | null
          id?: string
          internal_links_count?: number | null
          project_id: string
          started_at?: string | null
          status?: string
          status_message?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          finished_at?: string | null
          id?: string
          internal_links_count?: number | null
          project_id?: string
          started_at?: string | null
          status?: string
          status_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          changefreq: string | null
          content_hash: string | null
          content_layers: Json | null
          created_at: string
          id: number
          language: string | null
          last_crawled_at: string | null
          lastmod: string | null
          priority: string | null
          project_id: string
          status: string
          url: string
          word_count: number | null
        }
        Insert: {
          changefreq?: string | null
          content_hash?: string | null
          content_layers?: Json | null
          created_at?: string
          id?: number
          language?: string | null
          last_crawled_at?: string | null
          lastmod?: string | null
          priority?: string | null
          project_id: string
          status?: string
          url: string
          word_count?: number | null
        }
        Update: {
          changefreq?: string | null
          content_hash?: string | null
          content_layers?: Json | null
          created_at?: string
          id?: number
          language?: string | null
          last_crawled_at?: string | null
          lastmod?: string | null
          priority?: string | null
          project_id?: string
          status?: string
          url?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sync_sitemap_pages: {
        Args: {
          p_project_id: string
          pages_data: Json
        }
        Returns: {
          added: number
          updated: number
          removed: number
        }
      }
      update_crawled_pages: {
        Args: {
          page_updates: Json
        }
        Returns: {
          updated_count: number
        }
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
        }
        Relationships: []
      }
      topical_maps: {
        Row: {
          id: string
          project_id: string
          name: string
          created_at: string
          business_info: Json | null
          pillars: Json | null
          eavs: Json | null
          competitors: string[] | null
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          created_at?: string
          business_info?: Json | null
          pillars?: Json | null
          eavs?: Json | null
          competitors?: string[] | null
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          created_at?: string
          business_info?: Json | null
          pillars?: Json | null
          eavs?: Json | null
          competitors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "topical_maps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      topics: {
        Row: {
          id: string
          map_id: string
          parent_topic_id: string | null
          title: string
          slug: string
          description: string | null
          type: "core" | "outer"
          freshness: string
          created_at: string
        }
        Insert: {
          id?: string
          map_id: string
          parent_topic_id?: string | null
          title: string
          slug: string
          description?: string | null
          type: "core" | "outer"
          freshness: string
          created_at?: string
        }
        Update: {
          id?: string
          map_id?: string
          parent_topic_id?: string | null
          title?: string
          slug?: string
          description?: string | null
          type?: "core" | "outer"
          freshness?: string
          created_at?: string
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
          }
        ]
      }
      content_briefs: {
        Row: {
          id: string
          topic_id: string
          created_at: string
          title: string | null
          meta_description: string | null
          key_takeaways: Json | null
          article_draft: string | null
        }
        Insert: {
          id?: string
          topic_id: string
          created_at?: string
          title?: string | null
          meta_description?: string | null
          key_takeaways?: Json | null
          article_draft?: string | null
        }
        Update: {
          id?: string
          topic_id?: string
          created_at?: string
          title?: string | null
          meta_description?: string | null
          key_takeaways?: Json | null
          article_draft?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_briefs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_new_project: {
        Args: {
          p_project_data: Json
        }
        Returns: string
      }
      get_project_dashboard_data: {
        Args: {
          p_project_id: string
        }
        Returns: Json
      }
      save_project_progress: {
        Args: {
          p_data: Json
        }
        Returns: undefined
      }
       bulk_add_topics: {
        Args: {
          p_map_id: string
          p_topics: Json
        }
        Returns: undefined
      }
      bulk_insert_topics: {
        Args: {
          p_map_id: string
          p_topics: Json
        }
        Returns: undefined
      }
      update_map_details: {
        Args: {
          p_map_id: string
          p_pillars: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
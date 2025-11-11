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
  public: {
    Tables: {
      archie_knowledge: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          embedding: string | null
          id: string
          is_active: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author: string
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean
          published_at: string
          slug: string
          subtitle: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number
        }
        Insert: {
          author?: string
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean
          published_at?: string
          slug: string
          subtitle?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean
          published_at?: string
          slug?: string
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number
        }
        Relationships: []
      }
      dbm_calculations: {
        Row: {
          calculation_date: string
          created_at: string
          economic_overstock_units: number | null
          economic_units: number | null
          id: string
          location_code: string
          on_hand_units: number | null
          sku: string
          target_units: number | null
        }
        Insert: {
          calculation_date: string
          created_at?: string
          economic_overstock_units?: number | null
          economic_units?: number | null
          id?: string
          location_code: string
          on_hand_units?: number | null
          sku: string
          target_units?: number | null
        }
        Update: {
          calculation_date?: string
          created_at?: string
          economic_overstock_units?: number | null
          economic_units?: number | null
          id?: string
          location_code?: string
          on_hand_units?: number | null
          sku?: string
          target_units?: number | null
        }
        Relationships: []
      }
      knowledge_usage: {
        Row: {
          id: string
          knowledge_id: string | null
          question: string
          similarity_score: number | null
          used_at: string | null
          was_helpful: boolean | null
        }
        Insert: {
          id?: string
          knowledge_id?: string | null
          question: string
          similarity_score?: number | null
          used_at?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          id?: string
          knowledge_id?: string | null
          question?: string
          similarity_score?: number | null
          used_at?: string | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_usage_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "archie_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          scope: string
          scope_ref: string | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          scope: string
          scope_ref?: string | null
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          scope?: string
          scope_ref?: string | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      unanswered_questions: {
        Row: {
          context: Json | null
          first_asked: string | null
          frequency: number | null
          id: string
          knowledge_article_id: string | null
          last_asked: string | null
          notes: string | null
          question: string
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          context?: Json | null
          first_asked?: string | null
          frequency?: number | null
          id?: string
          knowledge_article_id?: string | null
          last_asked?: string | null
          notes?: string | null
          question: string
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          context?: Json | null
          first_asked?: string | null
          frequency?: number | null
          id?: string
          knowledge_article_id?: string | null
          last_asked?: string | null
          notes?: string | null
          question?: string
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unanswered_questions_knowledge_article_id_fkey"
            columns: ["knowledge_article_id"]
            isOneToOne: false
            referencedRelation: "archie_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          created_at: string | null
          id: string
          location_code: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_code: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_code?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_inventory_metric: {
        Args: {
          p_date_range?: string
          p_grouping?: string
          p_location_code: string
          p_metric_type: string
        }
        Returns: {
          confidence_level: string
          data_gaps: string[]
          group_name: string
          metric_value: number
          sku_count: number
        }[]
      }
      calculate_riv: {
        Args: {
          p_end_date?: string
          p_location_code: string
          p_sku: string
          p_start_date?: string
        }
        Returns: number
      }
      get_data_date_range: {
        Args: never
        Returns: {
          max_date: string
          min_date: string
        }[]
      }
      get_fact_daily_aggregated: {
        Args: {
          p_end_date?: string
          p_location_code: string
          p_sku: string
          p_start_date?: string
        }
        Returns: {
          d: string
          location_code: string
          on_hand_units: number
          on_hand_units_sim: number
          sku: string
          units_sold: number
        }[]
      }
      get_fact_daily_raw: {
        Args: {
          p_end_date: string
          p_location_code: string
          p_sku: string
          p_start_date: string
        }
        Returns: {
          d: string
          economic_overstock_units: number
          economic_units: number
          in_transit_units: number
          location_code: string
          on_hand_units: number
          on_hand_units_sim: number
          on_order_units: number
          sku: string
          target_units: number
          units_sold: number
        }[]
      }
      get_inventory_pipeline: {
        Args: {
          p_end_date?: string
          p_location_code?: string
          p_pipeline_stage?: string
          p_start_date?: string
          p_unit_of_measure?: string
        }
        Returns: {
          data_points: number
          data_quality_note: string
          has_sufficient_data: boolean
          in_transit_value: number
          new_assignment_value: number
          on_order_value: number
          replenishment_value: number
          total_value: number
        }[]
      }
      get_inventory_zones_report: {
        Args: {
          p_end_date?: string
          p_location_code?: string
          p_start_date?: string
        }
        Returns: {
          avg_economic: number
          avg_economic_overstock: number
          avg_on_hand: number
          avg_target: number
          avg_weekly_sales: number
          rolling_21d_avg_daily: number
          rolling_21d_sales: number
          sku: string
          sku_name: string
          stockout_days: number
          total_days: number
        }[]
      }
      get_kpi_data_aggregated: {
        Args: {
          p_end_date?: string
          p_location_code: string
          p_sku: string
          p_start_date?: string
        }
        Returns: {
          days_total: number
          location_code: string
          missed_units: number
          mtv: number
          riv: number
          riv_sim: number
          service_level: number
          service_level_sim: number
          sku: string
          sku_loc_days: number
          tcm: number
          turns_current: number
          turns_sim: number
        }[]
      }
      get_latest_inventory_snapshot: {
        Args: { p_location_code?: string }
        Returns: {
          cost_value: number
          data_freshness_days: number
          missing_locations: string[]
          retail_value: number
          snapshot_date: string
          total_in_transit: number
          total_on_hand: number
          total_on_order: number
        }[]
      }
      get_locations: {
        Args: never
        Returns: {
          code: string
          name: string
        }[]
      }
      get_mtv_by_sku_style: {
        Args: {
          p_end_date?: string
          p_location_code?: string
          p_start_date?: string
          p_style_length?: number
        }
        Returns: {
          sample_skus: string[]
          sku_count: number
          sku_style: string
          total_mtv: number
        }[]
      }
      get_pareto_analysis: {
        Args: { p_date?: string; p_location_code: string; p_sku?: string }
        Returns: {
          availability_percent: number
          cumulative_percent: number
          cumulative_units: number
          is_selected_sku: boolean
          rank: number
          sku: string
          sku_name: string
          total_skus: number
          total_units_sold: number
        }[]
      }
      get_products: {
        Args: never
        Returns: {
          name: string
          sku: string
        }[]
      }
      get_sku_details: {
        Args: {
          p_end_date: string
          p_location_code: string
          p_sku: string
          p_start_date: string
        }
        Returns: {
          avg_daily_sales: number
          avg_on_hand: number
          days_with_data: number
          max_on_hand: number
          min_on_hand: number
          sku: string
          sku_name: string
          stockout_days: number
          total_units_sold: number
        }[]
      }
      get_system_setting: {
        Args: {
          p_location_code?: string
          p_setting_key: string
          p_sku?: string
        }
        Returns: Json
      }
      get_top_skus_by_metric: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_location_code: string
          p_metric: string
          p_start_date?: string
        }
        Returns: {
          avg_inventory: number
          metric_value: number
          sku: string
          sku_name: string
          units_sold: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_fact_daily_batch: { Args: { records: Json }; Returns: undefined }
      search_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          tags: string[]
          title: string
        }[]
      }
      track_knowledge_usage: {
        Args: {
          p_knowledge_id: string
          p_question: string
          p_similarity_score: number
        }
        Returns: string
      }
      track_unanswered_question: {
        Args: { p_context?: Json; p_question: string }
        Returns: string
      }
      update_fact_daily_batch: { Args: { updates: Json }; Returns: undefined }
      upsert_inventory_batch: { Args: { records: Json }; Returns: undefined }
      upsert_locations_batch: { Args: { records: Json }; Returns: undefined }
      upsert_products_batch: { Args: { records: Json }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

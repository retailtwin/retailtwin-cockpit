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
      calculate_riv: {
        Args: {
          p_end_date?: string
          p_location_code: string
          p_sku: string
          p_start_date?: string
        }
        Returns: number
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
          sku: string
          sku_name: string
          stockout_days: number
          total_days: number
          total_throughput: number
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
          service_level: number
          service_level_sim: number
          sku: string
          sku_loc_days: number
          tcm: number
          turns_current: number
          turns_sim: number
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

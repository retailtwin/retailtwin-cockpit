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
          content_snippet: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_synced: string | null
          notion_page_id: string | null
          notion_url: string | null
          search_vector: unknown
          source_type: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content_snippet: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_synced?: string | null
          notion_page_id?: string | null
          notion_url?: string | null
          search_vector?: unknown
          source_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content_snippet?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_synced?: string | null
          notion_page_id?: string | null
          notion_url?: string | null
          search_vector?: unknown
          source_type?: string | null
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
      dataset_limits: {
        Row: {
          created_at: string | null
          id: string
          max_datasets: number | null
          max_file_size_mb: number | null
          max_records_per_dataset: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_datasets?: number | null
          max_file_size_mb?: number | null
          max_records_per_dataset?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          max_datasets?: number | null
          max_file_size_mb?: number | null
          max_records_per_dataset?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dataset_metadata: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          start_date: string | null
          total_records: number | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          total_records?: number | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          total_records?: number | null
        }
        Relationships: []
      }
      datasets: {
        Row: {
          created_at: string | null
          dataset_name: string
          dataset_slug: string
          date_range_end: string | null
          date_range_start: string | null
          description: string | null
          error_message: string | null
          id: string
          inventory_filename: string | null
          last_updated: string | null
          locations_filename: string | null
          processed_at: string | null
          products_filename: string | null
          sales_filename: string | null
          status: string
          total_inventory_records: number | null
          total_locations: number | null
          total_products: number | null
          total_sales_records: number | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dataset_name: string
          dataset_slug: string
          date_range_end?: string | null
          date_range_start?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          inventory_filename?: string | null
          last_updated?: string | null
          locations_filename?: string | null
          processed_at?: string | null
          products_filename?: string | null
          sales_filename?: string | null
          status?: string
          total_inventory_records?: number | null
          total_locations?: number | null
          total_products?: number | null
          total_sales_records?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dataset_name?: string
          dataset_slug?: string
          date_range_end?: string | null
          date_range_start?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          inventory_filename?: string | null
          last_updated?: string | null
          locations_filename?: string | null
          processed_at?: string | null
          products_filename?: string | null
          sales_filename?: string | null
          status?: string
          total_inventory_records?: number | null
          total_locations?: number | null
          total_products?: number | null
          total_sales_records?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
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
      fact_daily: {
        Row: {
          day: string
          economic_overstock_units: number | null
          economic_units: number | null
          location_code: string
          on_hand_units_sim: number | null
          sku: string
          target_units: number | null
          units_in_transit: number | null
          units_on_hand: number | null
          units_on_order: number | null
          units_sold: number | null
        }
        Insert: {
          day: string
          economic_overstock_units?: number | null
          economic_units?: number | null
          location_code: string
          on_hand_units_sim?: number | null
          sku: string
          target_units?: number | null
          units_in_transit?: number | null
          units_on_hand?: number | null
          units_on_order?: number | null
          units_sold?: number | null
        }
        Update: {
          day?: string
          economic_overstock_units?: number | null
          economic_units?: number | null
          location_code?: string
          on_hand_units_sim?: number | null
          sku?: string
          target_units?: number | null
          units_in_transit?: number | null
          units_on_hand?: number | null
          units_on_order?: number | null
          units_sold?: number | null
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
      landing_content: {
        Row: {
          body_text: string | null
          created_at: string | null
          heading: string | null
          id: string
          image_url: string | null
          section_key: string
          subheading: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          body_text?: string | null
          created_at?: string | null
          heading?: string | null
          id?: string
          image_url?: string | null
          section_key: string
          subheading?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          body_text?: string | null
          created_at?: string | null
          heading?: string | null
          id?: string
          image_url?: string | null
          section_key?: string
          subheading?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          code: string
          name: string
          order_days: string | null
          production_lead_time: number | null
          shipping_lead_time: number | null
        }
        Insert: {
          code: string
          name: string
          order_days?: string | null
          production_lead_time?: number | null
          shipping_lead_time?: number | null
        }
        Update: {
          code?: string
          name?: string
          order_days?: string | null
          production_lead_time?: number | null
          shipping_lead_time?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          cost_price: number
          group_1: string | null
          group_2: string | null
          group_3: string | null
          minimum_order_quantity: number | null
          name: string
          pack_size: number | null
          sales_price: number
          sku: string
        }
        Insert: {
          cost_price: number
          group_1?: string | null
          group_2?: string | null
          group_3?: string | null
          minimum_order_quantity?: number | null
          name: string
          pack_size?: number | null
          sales_price: number
          sku: string
        }
        Update: {
          cost_price?: number
          group_1?: string | null
          group_2?: string | null
          group_3?: string | null
          minimum_order_quantity?: number | null
          name?: string
          pack_size?: number | null
          sales_price?: number
          sku?: string
        }
        Relationships: []
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
      clear_inventory_data: { Args: never; Returns: undefined }
      clear_sales_data: { Args: never; Returns: undefined }
      export_inventory_data:
        | {
            Args: { p_dataset_id: string }
            Returns: {
              d: string
              in_transit_units: number
              location_code: string
              on_hand_units: number
              on_order_units: number
              sku: string
            }[]
          }
        | {
            Args: never
            Returns: {
              d: string
              in_transit_units: number
              location_code: string
              on_hand_units: number
              on_order_units: number
              sku: string
            }[]
          }
      export_locations_data:
        | {
            Args: { p_dataset_id: string }
            Returns: {
              code: string
              name: string
              order_days: string
              production_lead_time: number
              shipping_lead_time: number
            }[]
          }
        | {
            Args: never
            Returns: {
              code: string
              name: string
              order_days: string
              production_lead_time: number
              shipping_lead_time: number
            }[]
          }
      export_products_data:
        | {
            Args: { p_dataset_id: string }
            Returns: {
              group_1: string
              group_2: string
              group_3: string
              minimum_order_quantity: number
              name: string
              pack_size: number
              sku: string
              unit_cost: number
              unit_price: number
            }[]
          }
        | {
            Args: never
            Returns: {
              group_1: string
              group_2: string
              group_3: string
              minimum_order_quantity: number
              name: string
              pack_size: number
              sku: string
              unit_cost: number
              unit_price: number
            }[]
          }
      export_sales_data:
        | {
            Args: { p_dataset_id: string }
            Returns: {
              d: string
              location_code: string
              sku: string
              units_sold: number
            }[]
          }
        | {
            Args: never
            Returns: {
              d: string
              location_code: string
              sku: string
              units_sold: number
            }[]
          }
      get_contiguous_date_range: {
        Args: never
        Returns: {
          completeness: number
          end_date: string
          start_date: string
          total_days: number
          valid_dates: string[]
          valid_days_count: number
        }[]
      }
      get_data_date_range: {
        Args: never
        Returns: {
          max_date: string
          min_date: string
        }[]
      }
      get_fact_daily_aggregated:
        | {
            Args: {
              p_dataset_id: string
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
        | {
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
      get_fact_daily_raw:
        | {
            Args: {
              p_dataset_id: string
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
        | {
            Args: {
              p_end_date: string
              p_location_code: string
              p_sku: string
              p_start_date: string
            }
            Returns: {
              d: string
              in_transit_units: number
              location_code: string
              on_hand_units: number
              on_order_units: number
              sku: string
              units_sold: number
            }[]
          }
      get_inventory_date_range: {
        Args: never
        Returns: {
          end_date: string
          start_date: string
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
      get_inventory_zones_report:
        | {
            Args: {
              p_dataset_id: string
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
        | {
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
      get_kpi_data_aggregated:
        | {
            Args: {
              p_dataset_id: string
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
        | {
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
      get_locations:
        | {
            Args: never
            Returns: {
              code: string
              name: string
            }[]
          }
        | {
            Args: { p_dataset_id: string }
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
      get_pareto_analysis:
        | {
            Args: {
              p_dataset_id: string
              p_date?: string
              p_location_code: string
              p_sku?: string
            }
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
        | {
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
      get_products:
        | {
            Args: never
            Returns: {
              name: string
              sku: string
            }[]
          }
        | {
            Args: { p_dataset_id: string }
            Returns: {
              name: string
              sku: string
            }[]
          }
      get_sku_details:
        | {
            Args: {
              p_dataset_id: string
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
        | {
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
          p_metric?: string
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
      insert_inventory_batch: { Args: { records: Json }; Returns: undefined }
      insert_sales_batch: { Args: { records: Json }; Returns: undefined }
      insert_sales_for_dataset: {
        Args: { p_dataset_id: string; records: Json }
        Returns: undefined
      }
      merge_sales_inventory_to_fact_daily: {
        Args: { p_dataset_id: string }
        Returns: {
          max_date: string
          min_date: string
          records_created: number
        }[]
      }
      replace_inventory: { Args: { records: Json }; Returns: undefined }
      replace_locations: { Args: { records: Json }; Returns: undefined }
      replace_products: { Args: { records: Json }; Returns: undefined }
      replace_sales: { Args: { records: Json }; Returns: undefined }
      search_knowledge:
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              query_text: string
            }
            Returns: {
              category: string
              content_snippet: string
              id: string
              notion_url: string
              similarity: number
              tags: string[]
              title: string
            }[]
          }
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              category: string
              content: string
              id: string
              notion_page_id: string
              notion_url: string
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
      upsert_inventory_for_dataset: {
        Args: { p_dataset_id: string; records: Json }
        Returns: undefined
      }
      upsert_locations_for_dataset: {
        Args: { p_dataset_id: string; records: Json }
        Returns: undefined
      }
      upsert_products_for_dataset: {
        Args: { p_dataset_id: string; records: Json }
        Returns: undefined
      }
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

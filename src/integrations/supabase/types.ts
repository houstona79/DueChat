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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string
          id: string
          session_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      buddies: {
        Row: {
          buddy_id: string
          created_at: string
          id: string
          nickname: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          buddy_id: string
          created_at?: string
          id?: string
          nickname?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          buddy_id?: string
          created_at?: string
          id?: string
          nickname?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_settings: {
        Row: {
          auto_hide_threshold: number
          created_at: string
          id: boolean
          updated_at: string
        }
        Insert: {
          auto_hide_threshold?: number
          created_at?: string
          id?: boolean
          updated_at?: string
        }
        Update: {
          auto_hide_threshold?: number
          created_at?: string
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          emoji: string | null
          id: string
          kind: string
          preview: string | null
          read_at: string | null
          update_id: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          kind: string
          preview?: string | null
          read_at?: string | null
          update_id?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          kind?: string
          preview?: string | null
          read_at?: string | null
          update_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "profile_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_update_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          update_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          update_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          update_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_update_comments_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "profile_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_update_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_update_reactions_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "profile_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_updates: {
        Row: {
          body: string
          created_at: string
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          pinned_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          pinned_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          pinned_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_eula_at: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          country: string | null
          created_at: string
          display_name: string
          gender: string | null
          gender_visibility: string
          id: string
          last_seen_at: string
          name_color: string | null
          pronouns: string | null
          pronouns_visibility: string
          status_message: string | null
          updated_at: string
          username: string
          website_url: string | null
        }
        Insert: {
          accepted_eula_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          country?: string | null
          created_at?: string
          display_name: string
          gender?: string | null
          gender_visibility?: string
          id: string
          last_seen_at?: string
          name_color?: string | null
          pronouns?: string | null
          pronouns_visibility?: string
          status_message?: string | null
          updated_at?: string
          username: string
          website_url?: string | null
        }
        Update: {
          accepted_eula_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          gender?: string | null
          gender_visibility?: string
          id?: string
          last_seen_at?: string
          name_color?: string | null
          pronouns?: string | null
          pronouns_visibility?: string
          status_message?: string | null
          updated_at?: string
          username?: string
          website_url?: string | null
        }
        Relationships: []
      }
      room_admins: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_admins_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_bans: {
        Row: {
          banned_by: string
          created_at: string
          id: string
          reason: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          id?: string
          reason?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          id?: string
          reason?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_bans_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "room_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "room_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_posts: {
        Row: {
          body: string
          created_at: string
          id: string
          media_url: string | null
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          media_url?: string | null
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          media_url?: string | null
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_posts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          category: string
          created_at: string
          created_by: string
          direct_key: string | null
          id: string
          is_direct: boolean
          name: string
          radio_name: string | null
          radio_url: string | null
          rating: string
          slug: string
          topic: string | null
          youtube_title: string | null
          youtube_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          direct_key?: string | null
          id?: string
          is_direct?: boolean
          name: string
          radio_name?: string | null
          radio_url?: string | null
          rating?: string
          slug: string
          topic?: string | null
          youtube_title?: string | null
          youtube_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          direct_key?: string | null
          id?: string
          is_direct?: boolean
          name?: string
          radio_name?: string | null
          radio_url?: string | null
          rating?: string
          slug?: string
          topic?: string | null
          youtube_title?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      session_kicks: {
        Row: {
          created_at: string
          id: string
          kicked_by: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kicked_by: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kicked_by?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_bans: {
        Row: {
          banned_by: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      update_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          update_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          update_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          update_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_reports_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "profile_updates"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_adult: { Args: { _user_id: string }; Returns: boolean }
      is_room_admin: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_banned: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_owner: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_site_banned: { Args: { _user_id: string }; Returns: boolean }
      room_requires_adult: { Args: { _room_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      report_status: "pending" | "reviewed" | "dismissed"
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
      report_status: ["pending", "reviewed", "dismissed"],
    },
  },
} as const

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
      announcement_dismissals: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          level: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          level?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          level?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_comments: {
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
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
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
            foreignKeyName: "blog_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
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
      credit_grants: {
        Row: {
          amount: number
          created_at: string
          granted_by: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          granted_by: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          granted_by?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      device_accounts: {
        Row: {
          created_at: string
          device_id: string
          id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gift_items: {
        Row: {
          color_hex: string | null
          cost: number
          created_at: string
          credit_payout: number
          emoji: string
          image_url: string | null
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          color_hex?: string | null
          cost: number
          created_at?: string
          credit_payout?: number
          emoji: string
          image_url?: string | null
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          color_hex?: string | null
          cost?: number
          created_at?: string
          credit_payout?: number
          emoji?: string
          image_url?: string | null
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          credits: number
          gift_key: string
          id: string
          note: string | null
          recipient_id: string
          room_id: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          credits: number
          gift_key: string
          id?: string
          note?: string | null
          recipient_id: string
          room_id?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          gift_key?: string
          id?: string
          note?: string | null
          recipient_id?: string
          room_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_gift_key_fkey"
            columns: ["gift_key"]
            isOneToOne: false
            referencedRelation: "gift_items"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "gifts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_redemptions: {
        Row: {
          code: string
          created_at: string
          id: string
          invited_id: string
          inviter_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          invited_id: string
          inviter_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          invited_id?: string
          inviter_id?: string
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          archived_at: string
          body: string
          display_name: string | null
          id: string
          is_direct: boolean
          message_id: string | null
          room_id: string | null
          room_name: string | null
          room_slug: string | null
          sent_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          archived_at?: string
          body: string
          display_name?: string | null
          id?: string
          is_direct?: boolean
          message_id?: string | null
          room_id?: string | null
          room_name?: string | null
          room_slug?: string | null
          sent_at: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          archived_at?: string
          body?: string
          display_name?: string | null
          id?: string
          is_direct?: boolean
          message_id?: string | null
          room_id?: string | null
          room_name?: string | null
          room_slug?: string | null
          sent_at?: string
          user_id?: string | null
          username?: string | null
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
          room_id: string | null
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
          room_id?: string | null
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
          room_id?: string | null
          update_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
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
          decoration: string | null
          display_name: string
          gender: string | null
          gender_visibility: string
          id: string
          last_seen_at: string
          mail_handle: string | null
          name_color: string | null
          name_color_expires_at: string | null
          profile_visibility: string
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
          decoration?: string | null
          display_name: string
          gender?: string | null
          gender_visibility?: string
          id: string
          last_seen_at?: string
          mail_handle?: string | null
          name_color?: string | null
          name_color_expires_at?: string | null
          profile_visibility?: string
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
          decoration?: string | null
          display_name?: string
          gender?: string | null
          gender_visibility?: string
          id?: string
          last_seen_at?: string
          mail_handle?: string | null
          name_color?: string | null
          name_color_expires_at?: string | null
          profile_visibility?: string
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
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          room_id: string
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          room_id?: string
          tier?: string
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
          expires_at: string | null
          id: string
          reason: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
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
      room_hands: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          raised_at: string
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          raised_at?: string
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          raised_at?: string
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_hands_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_invites: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_locks: {
        Row: {
          code: string
          created_at: string
          room_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          room_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_locks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
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
      room_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          room_id: string
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          room_id: string
          stars: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          room_id?: string
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_ratings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_silences: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          room_id: string
          silenced_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          room_id: string
          silenced_by: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          room_id?: string
          silenced_by?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_silences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          banner_url: string | null
          category: string
          created_at: string
          created_by: string
          direct_key: string | null
          icon_url: string | null
          id: string
          invisible: boolean
          is_direct: boolean
          locked: boolean
          name: string
          name_color: string | null
          radio_name: string | null
          radio_url: string | null
          rating: string
          slug: string
          staff_only: boolean
          status_message: string | null
          topic: string | null
          trivia_enabled: boolean
          website_label: string | null
          website_url: string | null
          youtube_title: string | null
          youtube_url: string | null
        }
        Insert: {
          banner_url?: string | null
          category?: string
          created_at?: string
          created_by: string
          direct_key?: string | null
          icon_url?: string | null
          id?: string
          invisible?: boolean
          is_direct?: boolean
          locked?: boolean
          name: string
          name_color?: string | null
          radio_name?: string | null
          radio_url?: string | null
          rating?: string
          slug: string
          staff_only?: boolean
          status_message?: string | null
          topic?: string | null
          trivia_enabled?: boolean
          website_label?: string | null
          website_url?: string | null
          youtube_title?: string | null
          youtube_url?: string | null
        }
        Update: {
          banner_url?: string | null
          category?: string
          created_at?: string
          created_by?: string
          direct_key?: string | null
          icon_url?: string | null
          id?: string
          invisible?: boolean
          is_direct?: boolean
          locked?: boolean
          name?: string
          name_color?: string | null
          radio_name?: string | null
          radio_url?: string | null
          rating?: string
          slug?: string
          staff_only?: boolean
          status_message?: string | null
          topic?: string | null
          trivia_enabled?: boolean
          website_label?: string | null
          website_url?: string | null
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
      support_logs: {
        Row: {
          archived_at: string
          body: string
          from_staff: boolean
          guest_email: string | null
          guest_name: string | null
          id: string
          member_name: string | null
          message_id: string | null
          sender_id: string | null
          sent_at: string
          subject: string | null
          ticket_id: string | null
        }
        Insert: {
          archived_at?: string
          body: string
          from_staff?: boolean
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          member_name?: string | null
          message_id?: string | null
          sender_id?: string | null
          sent_at: string
          subject?: string | null
          ticket_id?: string | null
        }
        Update: {
          archived_at?: string
          body?: string
          from_staff?: boolean
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          member_name?: string | null
          message_id?: string | null
          sender_id?: string | null
          sent_at?: string
          subject?: string | null
          ticket_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          from_staff: boolean
          id: string
          sender_id: string | null
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_staff?: boolean
          id?: string
          sender_id?: string | null
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_staff?: boolean
          id?: string
          sender_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          guest_email: string | null
          guest_name: string | null
          guest_token: string
          id: string
          last_message_at: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_token?: string
          id?: string
          last_message_at?: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_token?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          created_at: string
          id: string
          source_hash: string
          source_text: string
          target_lang: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_hash: string
          source_text: string
          target_lang: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          source_hash?: string
          source_text?: string
          target_lang?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      trivia_rounds: {
        Row: {
          answer: string
          answered_at: string | null
          choices: string[]
          created_at: string
          id: string
          question: string
          room_id: string
          started_by: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          answer: string
          answered_at?: string | null
          choices?: string[]
          created_at?: string
          id?: string
          question: string
          room_id: string
          started_by: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          answer?: string
          answered_at?: string | null
          choices?: string[]
          created_at?: string
          id?: string
          question?: string
          room_id?: string
          started_by?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trivia_rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
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
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          last_grant_on: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          last_grant_on?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          last_grant_on?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ip_log: {
        Row: {
          checked_at: string | null
          created_at: string
          device_id: string | null
          id: string
          ip: string
          is_vpn: boolean
          network: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          ip: string
          is_vpn?: boolean
          network?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          ip?: string
          is_vpn?: boolean
          network?: string | null
          updated_at?: string
          user_agent?: string | null
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
      archive_and_clear_messages: { Args: never; Returns: number }
      archive_and_clear_support: { Args: never; Returns: number }
      blog_comment_feed: {
        Args: { _post_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_username: string
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }[]
      }
      claim_daily_credits: { Args: never; Returns: number }
      claim_device: {
        Args: { _device_id: string; _user_agent: string }
        Returns: undefined
      }
      device_claimed_by_other: {
        Args: { _device_id: string }
        Returns: boolean
      }
      expire_name_colors: { Args: never; Returns: number }
      generate_invite_code: { Args: never; Returns: string }
      get_published_blog: {
        Args: { _slug: string; _username: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_username: string
          body: string
          comment_count: number
          cover_url: string
          excerpt: string
          id: string
          like_count: number
          published_at: string
          slug: string
          title: string
          user_id: string
        }[]
      }
      gift_shelf: {
        Args: { _user_id: string }
        Returns: {
          color_hex: string
          emoji: string
          gift_key: string
          image_url: string
          label: string
          last_at: string
          total: number
        }[]
      }
      grant_credits: {
        Args: { _amount: number; _note?: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_owner: {
        Args: { _code: string }
        Returns: {
          avatar_url: string
          display_name: string
          username: string
        }[]
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
      is_room_silenced: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_super_admin: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_site_banned: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_public_rooms: {
        Args: { _limit?: number }
        Returns: {
          category: string
          icon_url: string
          id: string
          member_count: number
          name: string
          name_color: string
          rating: string
          rating_avg: number
          rating_count: number
          slug: string
          topic: string
        }[]
      }
      list_published_blogs: {
        Args: { _limit?: number; _username?: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_username: string
          comment_count: number
          cover_url: string
          excerpt: string
          id: string
          like_count: number
          published_at: string
          slug: string
          title: string
          user_id: string
        }[]
      }
      my_invite_code: { Args: never; Returns: string }
      profile_points: { Args: { _user_id: string }; Returns: number }
      public_room_profile: {
        Args: { _slug: string }
        Returns: {
          banner_url: string
          category: string
          created_at: string
          icon_url: string
          id: string
          member_count: number
          name: string
          name_color: string
          radio_name: string
          radio_url: string
          rating: string
          rating_avg: number
          rating_count: number
          slug: string
          status_message: string
          topic: string
          website_label: string
          website_url: string
        }[]
      }
      public_room_reviews: {
        Args: { _limit?: number; _slug: string }
        Returns: {
          avatar_url: string
          comment: string
          created_at: string
          display_name: string
          id: string
          stars: number
          username: string
        }[]
      }
      public_room_staff: {
        Args: { _slug: string }
        Returns: {
          avatar_url: string
          country: string
          display_name: string
          name_color: string
          tier: string
          user_id: string
          username: string
        }[]
      }
      room_crowns: {
        Args: never
        Returns: {
          join_count: number
          period: string
          room_id: string
          slug: string
        }[]
      }
      room_is_invisible: { Args: { _room_id: string }; Returns: boolean }
      room_is_locked: { Args: { _room_id: string }; Returns: boolean }
      room_is_staff_only: { Args: { _room_id: string }; Returns: boolean }
      room_requires_adult: { Args: { _room_id: string }; Returns: boolean }
      send_gift: {
        Args: {
          _gift_key: string
          _note?: string
          _recipient: string
          _room_id?: string
        }
        Returns: number
      }
      set_room_lock: {
        Args: { _code: string; _room_id: string }
        Returns: undefined
      }
      top_rooms_since: {
        Args: { _limit?: number; _since: string }
        Returns: {
          category: string
          icon_url: string
          id: string
          join_count: number
          member_count: number
          name: string
          name_color: string
          rating: string
          rating_avg: number
          rating_count: number
          slug: string
          topic: string
        }[]
      }
      unlock_room: {
        Args: { _code: string; _room_id: string }
        Returns: boolean
      }
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

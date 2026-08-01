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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          show_until: string | null
          target_audience: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          show_until?: string | null
          target_audience?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          show_until?: string | null
          target_audience?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admissions_data: {
        Row: {
          act_score: string | null
          act_taken: boolean | null
          analysis_results: Json | null
          ap_course_count: string | null
          ap_scores: string | null
          class_rank: string | null
          class_size: string | null
          created_at: string
          curriculum: string | null
          extracurricular_details: string | null
          extracurricular_level: string | null
          gpa: string | null
          honors_course_count: string | null
          id: string
          name: string
          sat_score: string | null
          sat_taken: boolean | null
          sequence_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          act_score?: string | null
          act_taken?: boolean | null
          analysis_results?: Json | null
          ap_course_count?: string | null
          ap_scores?: string | null
          class_rank?: string | null
          class_size?: string | null
          created_at?: string
          curriculum?: string | null
          extracurricular_details?: string | null
          extracurricular_level?: string | null
          gpa?: string | null
          honors_course_count?: string | null
          id?: string
          name?: string
          sat_score?: string | null
          sat_taken?: boolean | null
          sequence_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          act_score?: string | null
          act_taken?: boolean | null
          analysis_results?: Json | null
          ap_course_count?: string | null
          ap_scores?: string | null
          class_rank?: string | null
          class_size?: string | null
          created_at?: string
          curriculum?: string | null
          extracurricular_details?: string | null
          extracurricular_level?: string | null
          gpa?: string | null
          honors_course_count?: string | null
          id?: string
          name?: string
          sat_score?: string | null
          sat_taken?: boolean | null
          sequence_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      advisor_artifacts: {
        Row: {
          content_json: Json | null
          content_markdown: string | null
          conversation_id: string | null
          created_at: string | null
          file_mime: string | null
          file_path: string | null
          id: string
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          content_json?: Json | null
          content_markdown?: string | null
          conversation_id?: string | null
          created_at?: string | null
          file_mime?: string | null
          file_path?: string | null
          id?: string
          kind: string
          title: string
          user_id: string
        }
        Update: {
          content_json?: Json | null
          content_markdown?: string | null
          conversation_id?: string | null
          created_at?: string | null
          file_mime?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      advisor_memories: {
        Row: {
          content: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      advisor_projects: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      advisor_settings: {
        Row: {
          autoplay_voice: boolean | null
          created_at: string | null
          extra_notes: string | null
          history_retention_days: number | null
          max_response_tokens: number | null
          memory_enabled: boolean | null
          model: string | null
          nickname: string | null
          occupation: string | null
          reasoning_effort: string | null
          show_artifact_previews: boolean | null
          show_suggestions: boolean | null
          temperature: number | null
          traits: string | null
          updated_at: string | null
          user_id: string
          voice_name: string | null
        }
        Insert: {
          autoplay_voice?: boolean | null
          created_at?: string | null
          extra_notes?: string | null
          history_retention_days?: number | null
          max_response_tokens?: number | null
          memory_enabled?: boolean | null
          model?: string | null
          nickname?: string | null
          occupation?: string | null
          reasoning_effort?: string | null
          show_artifact_previews?: boolean | null
          show_suggestions?: boolean | null
          temperature?: number | null
          traits?: string | null
          updated_at?: string | null
          user_id: string
          voice_name?: string | null
        }
        Update: {
          autoplay_voice?: boolean | null
          created_at?: string | null
          extra_notes?: string | null
          history_retention_days?: number | null
          max_response_tokens?: number | null
          memory_enabled?: boolean | null
          model?: string | null
          nickname?: string | null
          occupation?: string | null
          reasoning_effort?: string | null
          show_artifact_previews?: boolean | null
          show_suggestions?: boolean | null
          temperature?: number | null
          traits?: string | null
          updated_at?: string | null
          user_id?: string
          voice_name?: string | null
        }
        Relationships: []
      }
      ai_plan_limits: {
        Row: {
          max_daily_credits: number
          plan: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          max_daily_credits?: number
          plan: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          max_daily_credits?: number
          plan?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          estimated_cost: number | null
          feature_type: string
          id: string
          request_metadata: Json | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_cost?: number | null
          feature_type: string
          id?: string
          request_metadata?: Json | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_cost?: number | null
          feature_type?: string
          id?: string
          request_metadata?: Json | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      application_entries: {
        Row: {
          created_at: string
          id: string
          input_text: string
          refined_text: string | null
          section_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_text: string
          refined_text?: string | null
          section_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_text?: string
          refined_text?: string | null
          section_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assignment_progress: {
        Row: {
          assignment_id: string
          id: string
          status: string
          student_id: string
          student_note: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          id?: string
          status?: string
          student_id: string
          student_note?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          id?: string
          status?: string
          student_id?: string
          student_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teacher_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      brag_sheets: {
        Row: {
          anecdotes: string | null
          career_goals: string | null
          challenges_overcome: string | null
          character_traits: string | null
          community_impact: string | null
          created_at: string
          extra_context: string | null
          id: string
          intended_major: string | null
          last_pdf_artifact_id: string | null
          leadership_examples: string | null
          title: string
          top_accomplishments: string | null
          updated_at: string
          user_id: string
          why_this_recommender: string | null
        }
        Insert: {
          anecdotes?: string | null
          career_goals?: string | null
          challenges_overcome?: string | null
          character_traits?: string | null
          community_impact?: string | null
          created_at?: string
          extra_context?: string | null
          id?: string
          intended_major?: string | null
          last_pdf_artifact_id?: string | null
          leadership_examples?: string | null
          title?: string
          top_accomplishments?: string | null
          updated_at?: string
          user_id: string
          why_this_recommender?: string | null
        }
        Update: {
          anecdotes?: string | null
          career_goals?: string | null
          challenges_overcome?: string | null
          character_traits?: string | null
          community_impact?: string | null
          created_at?: string
          extra_context?: string | null
          id?: string
          intended_major?: string | null
          last_pdf_artifact_id?: string | null
          leadership_examples?: string | null
          title?: string
          top_accomplishments?: string | null
          updated_at?: string
          user_id?: string
          why_this_recommender?: string | null
        }
        Relationships: []
      }
      class_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          joined_via: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          joined_via?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          joined_via?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          grade_level: string | null
          id: string
          invite_code: string
          name: string
          school_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_level?: string | null
          id?: string
          invite_code: string
          name: string
          school_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_level?: string | null
          id?: string
          invite_code?: string
          name?: string
          school_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      counsellor_app_strategies: {
        Row: {
          college_name: string
          counsellor_id: string
          created_at: string
          deadline: string | null
          fit_tier: string
          id: string
          stage: string
          strategy_notes: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          college_name: string
          counsellor_id: string
          created_at?: string
          deadline?: string | null
          fit_tier?: string
          id?: string
          stage?: string
          strategy_notes?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          college_name?: string
          counsellor_id?: string
          created_at?: string
          deadline?: string | null
          fit_tier?: string
          id?: string
          stage?: string
          strategy_notes?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      counsellor_daily_focus: {
        Row: {
          counsellor_id: string
          created_at: string
          done: boolean
          done_at: string | null
          focus_date: string
          id: string
          related_student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          counsellor_id: string
          created_at?: string
          done?: boolean
          done_at?: string | null
          focus_date: string
          id?: string
          related_student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          counsellor_id?: string
          created_at?: string
          done?: boolean
          done_at?: string | null
          focus_date?: string
          id?: string
          related_student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      counsellor_followups: {
        Row: {
          completed_at: string | null
          counsellor_id: string
          created_at: string
          due_date: string
          id: string
          note: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          counsellor_id: string
          created_at?: string
          due_date: string
          id?: string
          note: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          counsellor_id?: string
          created_at?: string
          due_date?: string
          id?: string
          note?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      counsellor_interactions: {
        Row: {
          counsellor_id: string
          created_at: string
          id: string
          kind: string
          occurred_at: string
          student_id: string
          summary: string
        }
        Insert: {
          counsellor_id: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          student_id: string
          summary: string
        }
        Update: {
          counsellor_id?: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          student_id?: string
          summary?: string
        }
        Relationships: []
      }
      counsellor_overrides: {
        Row: {
          body: string | null
          counsellor_id: string
          created_at: string
          id: string
          is_active: boolean
          override_type: string
          priority: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          counsellor_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          override_type?: string
          priority?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          counsellor_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          override_type?: string
          priority?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      counsellor_roadmaps: {
        Row: {
          counsellor_id: string
          created_at: string
          focus_areas: string[] | null
          id: string
          long_term_plan: string | null
          monthly_focus: string | null
          notes: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          counsellor_id: string
          created_at?: string
          focus_areas?: string[] | null
          id?: string
          long_term_plan?: string | null
          monthly_focus?: string | null
          notes?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          counsellor_id?: string
          created_at?: string
          focus_areas?: string[] | null
          id?: string
          long_term_plan?: string | null
          monthly_focus?: string | null
          notes?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      counsellor_student_notes: {
        Row: {
          body: string
          counsellor_id: string
          created_at: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          body: string
          counsellor_id: string
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          counsellor_id?: string
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          code: string
          credits_granted: number
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          credits_granted: number
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          credits_granted?: number
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string
          credits: number
          expires_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          plan_grant: string | null
          plan_grant_duration_days: number | null
          times_used: number
          updated_at: string
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          credits: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          plan_grant?: string | null
          plan_grant_duration_days?: number | null
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          credits?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          plan_grant?: string | null
          plan_grant_duration_days?: number | null
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
        }
        Relationships: []
      }
      credit_adjustments: {
        Row: {
          admin_user_id: string
          created_at: string
          delta: number
          id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          delta: number
          id?: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          delta?: number
          id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      credit_gifts: {
        Row: {
          admin_user_id: string | null
          amount: number
          created_at: string
          id: string
          message: string | null
          seen: boolean
          seen_at: string | null
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          amount: number
          created_at?: string
          id?: string
          message?: string | null
          seen?: boolean
          seen_at?: string | null
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          message?: string | null
          seen?: boolean
          seen_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          recipient_email: string
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_email: string
          status?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_email?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string
          cta_label: string | null
          cta_url: string | null
          error_message: string | null
          heading: string
          id: string
          preview_text: string | null
          sent_at: string | null
          status: string
          subject: string
          target_filter: Json
          target_kind: string
          template_key: string | null
          total_queued: number
          total_recipients: number
          total_skipped: number
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by: string
          cta_label?: string | null
          cta_url?: string | null
          error_message?: string | null
          heading: string
          id?: string
          preview_text?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          target_filter?: Json
          target_kind: string
          template_key?: string | null
          total_queued?: number
          total_recipients?: number
          total_skipped?: number
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string
          cta_label?: string | null
          cta_url?: string | null
          error_message?: string | null
          heading?: string
          id?: string
          preview_text?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          target_filter?: Json
          target_kind?: string
          template_key?: string | null
          total_queued?: number
          total_recipients?: number
          total_skipped?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          code_hash: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      enterprise_inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          organization: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          organization?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          organization?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          rollout_percentage: number | null
          target_users: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          rollout_percentage?: number | null
          target_users?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          rollout_percentage?: number | null
          target_users?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      flagged_prompts: {
        Row: {
          action_taken: string | null
          ai_verdict: string | null
          categories: string[] | null
          created_at: string
          feature: string
          id: string
          prompt: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          ai_verdict?: string | null
          categories?: string[] | null
          created_at?: string
          feature: string
          id?: string
          prompt: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          ai_verdict?: string | null
          categories?: string[] | null
          created_at?: string
          feature?: string
          id?: string
          prompt?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      full_applications: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          output: Json | null
          status: string
          university: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          output?: Json | null
          status?: string
          university: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          output?: Json | null
          status?: string
          university?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      guest_sessions: {
        Row: {
          created_at: string
          guest_user_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_user_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_user_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      journey_personalizations: {
        Row: {
          country: string | null
          curriculum: string | null
          generated_at: string
          grade: string | null
          id: string
          major: string
          tasks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          curriculum?: string | null
          generated_at?: string
          grade?: string | null
          id?: string
          major: string
          tasks?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          curriculum?: string | null
          generated_at?: string
          grade?: string | null
          id?: string
          major?: string
          tasks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journey_scores: {
        Row: {
          academics_score: number
          activities_score: number
          competitions_score: number
          completed_milestones: Json | null
          created_at: string
          diamonds: number
          heart_resets_used: number
          hearts: number
          hearts_decay_anchor: string | null
          hearts_period_start: string | null
          hearts_refilled_at: string
          id: string
          journey_started: boolean
          last_level_at: string | null
          leadership_score: number
          overall_score: number
          roadmap: Json | null
          started_at: string | null
          submitted_stage_ids: Json
          test_prep_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          academics_score?: number
          activities_score?: number
          competitions_score?: number
          completed_milestones?: Json | null
          created_at?: string
          diamonds?: number
          heart_resets_used?: number
          hearts?: number
          hearts_decay_anchor?: string | null
          hearts_period_start?: string | null
          hearts_refilled_at?: string
          id?: string
          journey_started?: boolean
          last_level_at?: string | null
          leadership_score?: number
          overall_score?: number
          roadmap?: Json | null
          started_at?: string | null
          submitted_stage_ids?: Json
          test_prep_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          academics_score?: number
          activities_score?: number
          competitions_score?: number
          completed_milestones?: Json | null
          created_at?: string
          diamonds?: number
          heart_resets_used?: number
          hearts?: number
          hearts_decay_anchor?: string | null
          hearts_period_start?: string | null
          hearts_refilled_at?: string
          id?: string
          journey_started?: boolean
          last_level_at?: string | null
          leadership_score?: number
          overall_score?: number
          roadmap?: Json | null
          started_at?: string | null
          submitted_stage_ids?: Json
          test_prep_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      level_evaluations: {
        Row: {
          created_at: string
          error: string | null
          evidence_count: number
          gaps: Json
          id: string
          level: number
          model: string | null
          priorities: Json
          score: number | null
          status: string
          strengths: Json
          summary: string | null
          updated_at: string
          user_id: string
          verdict: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          evidence_count?: number
          gaps?: Json
          id?: string
          level: number
          model?: string | null
          priorities?: Json
          score?: number | null
          status?: string
          strengths?: Json
          summary?: string | null
          updated_at?: string
          user_id: string
          verdict?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          evidence_count?: number
          gaps?: Json
          id?: string
          level?: number
          model?: string | null
          priorities?: Json
          score?: number | null
          status?: string
          strengths?: Json
          summary?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string | null
        }
        Relationships: []
      }
      linkedin_imports: {
        Row: {
          created_at: string
          grow_plan: Json | null
          grow_plan_updated_at: string | null
          id: string
          linkedin_url: string
          profile_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grow_plan?: Json | null
          grow_plan_updated_at?: string | null
          id?: string
          linkedin_url: string
          profile_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grow_plan?: Json | null
          grow_plan_updated_at?: string | null
          id?: string
          linkedin_url?: string
          profile_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      managed_content: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          data: Json
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by?: string | null
          data?: Json
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      micro_question_responses: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          question_key: string
          response: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          question_key: string
          response: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          question_key?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_broadcasts: {
        Row: {
          audience_grade: string | null
          audience_school_id: string | null
          audience_type: string
          audience_user_ids: string[] | null
          created_at: string
          id: string
          message: string
          recipient_count: number
          sender_id: string
          sender_role: string
          title: string
        }
        Insert: {
          audience_grade?: string | null
          audience_school_id?: string | null
          audience_type: string
          audience_user_ids?: string[] | null
          created_at?: string
          id?: string
          message: string
          recipient_count?: number
          sender_id: string
          sender_role: string
          title: string
        }
        Update: {
          audience_grade?: string | null
          audience_school_id?: string | null
          audience_type?: string
          audience_user_ids?: string[] | null
          created_at?: string
          id?: string
          message?: string
          recipient_count?: number
          sender_id?: string
          sender_role?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          broadcast_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          sender_id: string | null
          sender_role: string | null
          title: string
          user_id: string
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          sender_id?: string | null
          sender_role?: string | null
          title: string
          user_id: string
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          sender_id?: string | null
          sender_role?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "notification_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_data: {
        Row: {
          application_year: string
          areas_of_interest: string[] | null
          biggest_constraint: string | null
          biggest_fear: string | null
          career_direction: string | null
          country: string
          created_at: string
          curriculum: string
          extracurricular_level: string
          gpa: string | null
          gpa_range: string | null
          grade: string
          high_school_name: string
          id: string
          intended_major: string
          major_confidence: number | null
          major_reason: string | null
          onboarding_completed: boolean
          open_to_adjacent_majors: boolean | null
          preferred_work_types: string[] | null
          primary_motivation: string | null
          school_id: string | null
          standardized_test_score: string | null
          standardized_test_type: string | null
          study_destinations: string[] | null
          target_universities: string[] | null
          updated_at: string
          user_id: string
          weekly_hours_available: string | null
        }
        Insert: {
          application_year: string
          areas_of_interest?: string[] | null
          biggest_constraint?: string | null
          biggest_fear?: string | null
          career_direction?: string | null
          country: string
          created_at?: string
          curriculum: string
          extracurricular_level: string
          gpa?: string | null
          gpa_range?: string | null
          grade: string
          high_school_name: string
          id?: string
          intended_major: string
          major_confidence?: number | null
          major_reason?: string | null
          onboarding_completed?: boolean
          open_to_adjacent_majors?: boolean | null
          preferred_work_types?: string[] | null
          primary_motivation?: string | null
          school_id?: string | null
          standardized_test_score?: string | null
          standardized_test_type?: string | null
          study_destinations?: string[] | null
          target_universities?: string[] | null
          updated_at?: string
          user_id: string
          weekly_hours_available?: string | null
        }
        Update: {
          application_year?: string
          areas_of_interest?: string[] | null
          biggest_constraint?: string | null
          biggest_fear?: string | null
          career_direction?: string | null
          country?: string
          created_at?: string
          curriculum?: string
          extracurricular_level?: string
          gpa?: string | null
          gpa_range?: string | null
          grade?: string
          high_school_name?: string
          id?: string
          intended_major?: string
          major_confidence?: number | null
          major_reason?: string | null
          onboarding_completed?: boolean
          open_to_adjacent_majors?: boolean | null
          preferred_work_types?: string[] | null
          primary_motivation?: string | null
          school_id?: string | null
          standardized_test_score?: string | null
          standardized_test_type?: string | null
          study_destinations?: string[] | null
          target_universities?: string[] | null
          updated_at?: string
          user_id?: string
          weekly_hours_available?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_data_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      outcomes_data: {
        Row: {
          competitions: Json | null
          courses: Json | null
          created_at: string
          creative_works: Json
          follow_pathforge: boolean | null
          grade_level: string
          id: string
          internships: Json
          leadership_roles: Json | null
          projects: Json | null
          research_outputs: Json
          service_roles: Json
          target_tier: string
          task_states: Json | null
          test_score: string | null
          test_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          competitions?: Json | null
          courses?: Json | null
          created_at?: string
          creative_works?: Json
          follow_pathforge?: boolean | null
          grade_level?: string
          id?: string
          internships?: Json
          leadership_roles?: Json | null
          projects?: Json | null
          research_outputs?: Json
          service_roles?: Json
          target_tier?: string
          task_states?: Json | null
          test_score?: string | null
          test_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          competitions?: Json | null
          courses?: Json | null
          created_at?: string
          creative_works?: Json
          follow_pathforge?: boolean | null
          grade_level?: string
          id?: string
          internships?: Json
          leadership_roles?: Json | null
          projects?: Json | null
          research_outputs?: Json
          service_roles?: Json
          target_tier?: string
          task_states?: Json | null
          test_score?: string | null
          test_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          default_announcement_audience: string
          default_announcement_priority: string
          email_sender_name: string
          guest_mode_enabled: boolean
          id: number
          signups_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_announcement_audience?: string
          default_announcement_priority?: string
          email_sender_name?: string
          guest_mode_enabled?: boolean
          id?: number
          signups_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_announcement_audience?: string
          default_announcement_priority?: string
          email_sender_name?: string
          guest_mode_enabled?: boolean
          id?: number
          signups_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profile_extracted_data: {
        Row: {
          created_at: string
          data: Json
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          email_verification_sent_at: string | null
          email_verified_at: string | null
          full_name: string | null
          id: string
          is_vc: boolean
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verification_sent_at?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          is_vc?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verification_sent_at?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          is_vc?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      proof_submissions: {
        Row: {
          admin_notes: string | null
          ai_confidence: number | null
          ai_extracted_text: string | null
          ai_reasoning: string | null
          created_at: string
          file_path: string | null
          file_type: string | null
          id: string
          proof_note: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          stage_id: string
          status: string
          task_context: string | null
          task_id: string
          task_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ai_confidence?: number | null
          ai_extracted_text?: string | null
          ai_reasoning?: string | null
          created_at?: string
          file_path?: string | null
          file_type?: string | null
          id?: string
          proof_note?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_id: string
          status?: string
          task_context?: string | null
          task_id: string
          task_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ai_confidence?: number | null
          ai_extracted_text?: string | null
          ai_reasoning?: string | null
          created_at?: string
          file_path?: string | null
          file_type?: string | null
          id?: string
          proof_note?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_id?: string
          status?: string
          task_context?: string | null
          task_id?: string
          task_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      readiness_analyses: {
        Row: {
          analysis_result: Json | null
          created_at: string
          id: string
          intended_major: string
          name: string
          report_card_text: string | null
          sequence_number: number
          short_term_goals: string | null
          target_universities: string | null
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          intended_major: string
          name: string
          report_card_text?: string | null
          sequence_number?: number
          short_term_goals?: string | null
          target_universities?: string | null
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          intended_major?: string
          name?: string
          report_card_text?: string | null
          sequence_number?: number
          short_term_goals?: string | null
          target_universities?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recommenders: {
        Row: {
          brag_sheet_id: string | null
          created_at: string
          due_date: string | null
          email: string | null
          id: string
          last_packet_artifact_id: string | null
          last_packet_at: string | null
          last_reminder_at: string | null
          name: string
          notes: string | null
          position: string | null
          relationship_duration: string | null
          reminder_stage: string | null
          requested_at: string | null
          school: string | null
          status: string
          strength: string | null
          strength_analyzed_at: string | null
          strength_reasoning: string | null
          subject: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brag_sheet_id?: string | null
          created_at?: string
          due_date?: string | null
          email?: string | null
          id?: string
          last_packet_artifact_id?: string | null
          last_packet_at?: string | null
          last_reminder_at?: string | null
          name: string
          notes?: string | null
          position?: string | null
          relationship_duration?: string | null
          reminder_stage?: string | null
          requested_at?: string | null
          school?: string | null
          status?: string
          strength?: string | null
          strength_analyzed_at?: string | null
          strength_reasoning?: string | null
          subject?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brag_sheet_id?: string | null
          created_at?: string
          due_date?: string | null
          email?: string | null
          id?: string
          last_packet_artifact_id?: string | null
          last_packet_at?: string | null
          last_reminder_at?: string | null
          name?: string
          notes?: string | null
          position?: string | null
          relationship_duration?: string | null
          reminder_stage?: string | null
          requested_at?: string | null
          school?: string | null
          status?: string
          strength?: string | null
          strength_analyzed_at?: string | null
          strength_reasoning?: string | null
          subject?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommenders_brag_sheet_id_fkey"
            columns: ["brag_sheet_id"]
            isOneToOne: false
            referencedRelation: "brag_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          accepted_at: string | null
          code: string
          created_at: string
          id: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string
        }
        Insert: {
          accepted_at?: string | null
          code: string
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
        }
        Update: {
          accepted_at?: string | null
          code?: string
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
        }
        Relationships: []
      }
      requirements_reports: {
        Row: {
          college: string
          created_at: string
          id: string
          report: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          college: string
          created_at?: string
          id?: string
          report: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          college?: string
          created_at?: string
          id?: string
          report?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          is_verified: boolean
          name: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          is_verified?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          is_verified?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          instructions: string | null
          kind: string
          status: string
          target_id: string
          target_type: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          instructions?: string | null
          kind: string
          status?: string
          target_id: string
          target_type: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          instructions?: string | null
          kind?: string
          status?: string
          target_id?: string
          target_type?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_feedback: {
        Row: {
          body: string
          created_at: string
          id: string
          rating: number | null
          student_id: string
          subject_ref: string | null
          subject_type: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          rating?: number | null
          student_id: string
          subject_ref?: string | null
          subject_type: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          rating?: number | null
          student_id?: string
          subject_ref?: string | null
          subject_type?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          countries_expertise: string[] | null
          created_at: string
          curriculum_expertise: string[] | null
          grade_levels_taught: string[] | null
          id: string
          invite_accepted_at: string | null
          invite_status: string
          onboarding_completed: boolean
          school_id: string | null
          school_role: string | null
          school_website: string | null
          services_offered: string[] | null
          specializations: string[] | null
          students_handled_range: string | null
          subject: string | null
          title: string
          updated_at: string
          user_id: string
          verified: boolean
          verified_at: string | null
          years_experience: string | null
        }
        Insert: {
          countries_expertise?: string[] | null
          created_at?: string
          curriculum_expertise?: string[] | null
          grade_levels_taught?: string[] | null
          id?: string
          invite_accepted_at?: string | null
          invite_status?: string
          onboarding_completed?: boolean
          school_id?: string | null
          school_role?: string | null
          school_website?: string | null
          services_offered?: string[] | null
          specializations?: string[] | null
          students_handled_range?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
          years_experience?: string | null
        }
        Update: {
          countries_expertise?: string[] | null
          created_at?: string
          curriculum_expertise?: string[] | null
          grade_levels_taught?: string[] | null
          id?: string
          invite_accepted_at?: string | null
          invite_status?: string
          onboarding_completed?: boolean
          school_id?: string | null
          school_role?: string | null
          school_website?: string | null
          services_offered?: string[] | null
          specializations?: string[] | null
          students_handled_range?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
          years_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_verification_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          proof_file_path: string | null
          proof_type: string
          proof_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          status: string
          teacher_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          proof_file_path?: string | null
          proof_type: string
          proof_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          teacher_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          proof_file_path?: string | null
          proof_type?: string
          proof_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          teacher_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          page_path: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          page_path?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          page_path?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          bonus_credits: number
          created_at: string
          credits_used_month: number
          credits_used_today: number
          free_plan_grant: string | null
          free_plan_grant_days: number | null
          id: string
          last_reset_at: string
          max_daily_credits: number
          month_reset_at: string | null
          plan: string
          plan_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_credits?: number
          created_at?: string
          credits_used_month?: number
          credits_used_today?: number
          free_plan_grant?: string | null
          free_plan_grant_days?: number | null
          id?: string
          last_reset_at?: string
          max_daily_credits?: number
          month_reset_at?: string | null
          plan?: string
          plan_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_credits?: number
          created_at?: string
          credits_used_month?: number
          credits_used_today?: number
          free_plan_grant?: string | null
          free_plan_grant_days?: number | null
          id?: string
          last_reset_at?: string
          max_daily_credits?: number
          month_reset_at?: string | null
          plan?: string
          plan_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_flags: {
        Row: {
          created_at: string
          expires_at: string | null
          flag_type: string
          flagged_by: string
          id: string
          is_active: boolean
          notes: string | null
          reason: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          flag_type: string
          flagged_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          reason: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          flag_type?: string
          flagged_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          reason?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          google_email: string | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          activity_visibility: string
          ai_personalization: boolean
          created_at: string
          notify_deadlines: boolean
          notify_marketing: boolean
          notify_product_updates: boolean
          notify_weekly_summary: boolean
          profile_visibility: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_visibility?: string
          ai_personalization?: boolean
          created_at?: string
          notify_deadlines?: boolean
          notify_marketing?: boolean
          notify_product_updates?: boolean
          notify_weekly_summary?: boolean
          profile_visibility?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_visibility?: string
          ai_personalization?: boolean
          created_at?: string
          notify_deadlines?: boolean
          notify_marketing?: boolean
          notify_product_updates?: boolean
          notify_weekly_summary?: boolean
          profile_visibility?: string
          updated_at?: string
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
      voice_advisor_sessions: {
        Row: {
          advisor_response: string
          archived: boolean
          conversation_id: string | null
          created_at: string
          id: string
          name: string | null
          pinned: boolean
          project_id: string | null
          topics_discussed: string[] | null
          transcript: string
          user_id: string
        }
        Insert: {
          advisor_response: string
          archived?: boolean
          conversation_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          pinned?: boolean
          project_id?: string | null
          topics_discussed?: string[] | null
          transcript: string
          user_id: string
        }
        Update: {
          advisor_response?: string
          archived?: boolean
          conversation_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          pinned?: boolean
          project_id?: string | null
          topics_discussed?: string[] | null
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          activities: Json
          created_at: string
          id: string
          recommendations: Json
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          activities?: Json
          created_at?: string
          id?: string
          recommendations?: Json
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          activities?: Json
          created_at?: string
          id?: string
          recommendations?: Json
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_credits: {
        Args: { _delta: number; _reason?: string; _target_user_id: string }
        Returns: Json
      }
      admin_assign_counsellor_to_school: {
        Args: { _school_id: string; _teacher_user_id: string }
        Returns: Json
      }
      admin_delete_user_data: {
        Args: { _target_user_id: string }
        Returns: Json
      }
      admin_flag_user: {
        Args: {
          _expires_at?: string
          _flag_type: string
          _notes?: string
          _reason: string
          _target_user_id: string
        }
        Returns: Json
      }
      admin_get_coupon_stats: { Args: never; Returns: Json }
      admin_get_recent_activity: { Args: { _limit?: number }; Returns: Json }
      admin_get_user_details: {
        Args: { target_user_id: string }
        Returns: Json
      }
      admin_list_counsellors: { Args: never; Returns: Json }
      admin_list_flagged_prompts: {
        Args: { _limit?: number; _only_unreviewed?: boolean }
        Returns: Json
      }
      admin_list_schools_with_counts: { Args: never; Returns: Json }
      admin_list_targeting_facets: { Args: never; Returns: Json }
      admin_list_user_ai_usage: {
        Args: { _limit?: number; _search?: string }
        Returns: Json
      }
      admin_reset_user_state: {
        Args: { _target_user_id: string }
        Returns: Json
      }
      admin_reset_user_usage: {
        Args: { _target_user_id: string }
        Returns: Json
      }
      admin_resolve_email_recipients: {
        Args: { _filter: Json; _target_kind: string }
        Returns: {
          email: string
          grade: string
          school: string
          user_id: string
        }[]
      }
      admin_review_flagged_prompt: {
        Args: { _action?: string; _id: string }
        Returns: Json
      }
      admin_search_users:
        | {
            Args: {
              filter_country?: string
              filter_grade?: string
              filter_major?: string
              filter_onboarded?: string
              filter_role?: string
              filter_school_id?: string
              page_num?: number
              page_size?: number
              search_term?: string
              sort_by?: string
            }
            Returns: Json
          }
        | {
            Args: {
              filter_country?: string
              filter_grade?: string
              filter_major?: string
              page_num?: number
              page_size?: number
              search_term?: string
            }
            Returns: Json
          }
      admin_set_user_daily_limit: {
        Args: { _max_daily_credits: number; _target_user_id: string }
        Returns: Json
      }
      admin_set_user_plan: {
        Args: {
          _bonus_credits?: number
          _plan: string
          _target_user_id: string
        }
        Returns: Json
      }
      admin_unflag_user: {
        Args: { _flag_type?: string; _target_user_id: string }
        Returns: Json
      }
      admin_update_plan_limit: {
        Args: { _cascade?: boolean; _max_daily_credits: number; _plan: string }
        Returns: Json
      }
      admin_update_user_profile: {
        Args: {
          _role?: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
          _username?: string
        }
        Returns: Json
      }
      advisor_credit_cost: {
        Args: { _effort: string; _plan: string }
        Returns: number
      }
      apply_subscription_credits: {
        Args: {
          credits_to_grant: number
          plan_name: string
          target_user_id: string
        }
        Returns: undefined
      }
      claim_free_plan: { Args: never; Returns: Json }
      cleanup_expired_unsubscribe_tokens: { Args: never; Returns: number }
      consume_advisor_credit: { Args: { _effort?: string }; Returns: Json }
      consume_credit: { Args: never; Returns: boolean }
      consume_credits: { Args: { amount: number }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      effective_daily_credit_limit: {
        Args: { _plan: string; _stored_limit: number; _user_id: string }
        Returns: number
      }
      email_is_verified: { Args: { _user_id: string }; Returns: boolean }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      evaluate_feature_flag: { Args: { flag_name: string }; Returns: boolean }
      get_admin_stats: { Args: never; Returns: Json }
      get_class_invite_code: { Args: { _class_id: string }; Returns: string }
      get_comprehensive_admin_stats: { Args: never; Returns: Json }
      get_credits: { Args: never; Returns: Json }
      get_journey_leaderboard: {
        Args: { limit_count?: number; scope?: string }
        Returns: {
          diamonds: number
          display_name: string
          grade: string
          hearts: number
          is_me: boolean
          rank: number
          school_name: string
          streak: number
        }[]
      }
      get_my_referral_stats: { Args: never; Returns: Json }
      get_or_create_referral_code: { Args: never; Returns: string }
      get_student_deep_dive: { Args: { _student_id: string }; Returns: Json }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_teacher: { Args: { _user_id: string }; Returns: boolean }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      is_vc_user: { Args: { _uid?: string }; Returns: boolean }
      is_verified_teacher: { Args: { _user_id: string }; Returns: boolean }
      journey_decrement_heart: { Args: { _user_id: string }; Returns: number }
      journey_reset_hearts: { Args: never; Returns: Json }
      journey_submit_stage: {
        Args: { stage_id: string; task_ids: string[] }
        Returns: Json
      }
      journey_sync_hearts: { Args: never; Returns: Json }
      link_or_create_school: {
        Args: {
          _city?: string
          _country?: string
          _name: string
          _verified?: boolean
        }
        Returns: string
      }
      list_fellow_counsellors: { Args: never; Returns: Json }
      log_user_activity: {
        Args: { _action_type: string; _details?: Json; _page_path?: string }
        Returns: undefined
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      monthly_credit_allowance: { Args: { _plan: string }; Returns: number }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalized_school_name: { Args: { _name: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_coupon: { Args: { _code: string }; Returns: Json }
      refund_credit: { Args: never; Returns: boolean }
      revert_all_expired_subscriptions: { Args: never; Returns: number }
      revert_to_free_plan: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      revert_user_if_expired: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      roll_credit_windows: {
        Args: { _user_id: string }
        Returns: {
          bonus_credits: number
          created_at: string
          credits_used_month: number
          credits_used_today: number
          free_plan_grant: string | null
          free_plan_grant_days: number | null
          id: string
          last_reset_at: string
          max_daily_credits: number
          month_reset_at: string | null
          plan: string
          plan_expires_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_credits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_users_for_broadcast: {
        Args: { _limit?: number; _query: string }
        Returns: Json
      }
      send_notification_broadcast: {
        Args: {
          _audience_grade?: string
          _audience_school_id?: string
          _audience_type: string
          _audience_user_ids?: string[]
          _message: string
          _title: string
        }
        Returns: Json
      }
      switch_plan: { Args: { _target_plan: string }; Returns: Json }
      teacher_can_view_student: {
        Args: { _student_uid: string; _teacher_uid: string }
        Returns: boolean
      }
      teacher_roster: {
        Args: never
        Returns: {
          email: string
          grade: string
          high_school_name: string
          intended_major: string
          overall_score: number
          status: string
          target_universities: string[]
          user_id: string
          username: string
        }[]
      }
      teacher_school_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "teacher"
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
      app_role: ["admin", "moderator", "user", "teacher"],
    },
  },
} as const

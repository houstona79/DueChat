-- Automatic bookkeeping routines: never callable directly.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'apply_report_auto_hide()','clear_room_invite_notification()','force_owner_buddy()',
    'guard_name_color_expiry()','handle_new_user()','lock_birth_date()','log_room_join()',
    'log_room_leave()','notify_admins_of_support_message()','notify_buddies_of_update()',
    'notify_room_invite()','notify_update_comment()','notify_update_reaction()',
    'protect_owner_admin_role()','protect_owner_buddy()','reject_red_name_color()',
    'release_owner_buddy()','set_updated_at()','support_clear_on_close()',
    'touch_support_ticket()','touch_updated_at()',
    'archive_and_clear_messages()','archive_and_clear_support()','expire_name_colors()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Member-only helpers: signed-in members only.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'claim_daily_credits()','gift_shelf(uuid)','grant_credits(uuid,integer,text)',
    'my_invite_code()','profile_points(uuid)','send_gift(uuid,text,uuid,text)',
    'set_room_lock(uuid,text)','unlock_room(uuid,text)','generate_invite_code()',
    'is_room_silenced(uuid,uuid)','is_room_super_admin(uuid,uuid)','is_site_banned(uuid)',
    'is_staff(uuid)','room_is_invisible(uuid)','room_is_locked(uuid)',
    'room_is_staff_only(uuid)','room_requires_adult(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;
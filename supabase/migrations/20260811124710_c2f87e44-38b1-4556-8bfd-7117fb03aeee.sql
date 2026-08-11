-- 1. Ban + kick visibility: staff or the affected member only
DROP POLICY IF EXISTS "Signed-in users can view site bans" ON public.site_bans;
CREATE POLICY "Staff and the banned member can view site bans"
ON public.site_bans FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Signed-in users can view kicks" ON public.session_kicks;
CREATE POLICY "Staff and the kicked member can view kicks"
ON public.session_kicks FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR user_id = auth.uid());

-- 2. Scope room policies to signed-in members only
DROP POLICY IF EXISTS "Signed-in users can view group rooms" ON public.rooms;
CREATE POLICY "Signed-in users can view group rooms"
ON public.rooms FOR SELECT TO authenticated
USING (
  ((NOT staff_only) OR public.is_staff(auth.uid()))
  AND ((is_direct = false) OR public.is_room_member(id, auth.uid()) OR created_by = auth.uid())
  AND ((NOT invisible) OR created_by = auth.uid() OR public.is_room_member(id, auth.uid())
       OR EXISTS (SELECT 1 FROM public.room_invites ri
                  WHERE ri.room_id = rooms.id AND ri.invitee_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can join rooms themselves" ON public.room_members;
CREATE POLICY "Users can join rooms themselves"
ON public.room_members FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_room_banned(room_id, auth.uid())
  AND NOT public.is_site_banned(auth.uid())
  AND ((NOT public.room_requires_adult(room_id)) OR public.is_adult(auth.uid()))
  AND ((NOT public.room_is_staff_only(room_id)) OR public.is_staff(auth.uid()))
  AND ((NOT public.room_is_locked(room_id)) OR public.is_room_admin(room_id, auth.uid()) OR public.is_staff(auth.uid()))
);

-- 3. Trigger + maintenance routines: not callable through the API at all
REVOKE EXECUTE ON FUNCTION public.apply_report_auto_hide() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_room_invite_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_owner_buddy() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_name_color_expiry() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_birth_date() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_room_join() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_room_leave() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_of_support_message() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_buddies_of_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_room_invite() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_update_comment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_update_reaction() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_owner_admin_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_owner_buddy() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_red_name_color() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_owner_buddy() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_clear_on_close() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_support_ticket() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_and_clear_messages() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_and_clear_support() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_name_colors() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon, authenticated;

-- 4. Signed-in-only helpers and actions: no anonymous execution
REVOKE EXECUTE ON FUNCTION public.claim_daily_credits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_device(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.device_claimed_by_other(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.gift_shelf(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.profile_points(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_gift(uuid, text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_credits(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_invite_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_room_lock(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unlock_room(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_adult(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_site_banned(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_room_silenced(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_room_super_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.room_is_invisible(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.room_is_locked(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.room_is_staff_only(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.room_requires_adult(uuid) FROM anon;
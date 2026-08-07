import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("accepted_eula_at")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile?.accepted_eula_at) {
      throw redirect({ to: "/terms", search: { accept: "1" } });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});

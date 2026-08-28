import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** E-mail do usuário logado no painel, usado para escopar controles por conta. */
export function useCurrentUserEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return email;
}

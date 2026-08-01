import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPaddleEnv } from "@/lib/paddle";

export interface Subscription {
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  paddle_subscription_id: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const env = getPaddleEnv();
    const { data } = await supabase
      .from("subscriptions")
      .select("product_id, price_id, status, current_period_end, cancel_at_period_end, paddle_subscription_id")
      .eq("user_id", user.id)
      .eq("environment", env)
      .maybeSingle();
    setSubscription(data as Subscription | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSub(); }, [fetchSub]);

  // Realtime updates when webhook writes
  useEffect(() => {
    if (!user) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase.channel(`sub:${user.id}:${suffix}`);
    try {
      ch.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        () => fetchSub()
      ).subscribe();
    } catch (e) {
      console.warn('subscription realtime unavailable', e);
    }
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchSub]);

  const isActive = !!subscription && ['active', 'trialing'].includes(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return { subscription, loading, isActive, refresh: fetchSub };
}

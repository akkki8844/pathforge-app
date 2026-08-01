import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Zap, Crown, Rocket, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "pf:lastCelebratedSub";

// Single "Pro" plan with credit tiers. Naming derived from price_id pattern: pro_<credits>_<cycle>
const PLAN_META: Record<string, { name: string; credits: string; icon: typeof Zap; tagline: string }> = {
  pro_100_monthly:  { name: "Pro",  credits: "100 credits/mo",   icon: Zap,    tagline: "Welcome to Pro. Every credit, well spent." },
  pro_200_monthly:  { name: "Pro",  credits: "200 credits/mo",   icon: Zap,    tagline: "Pro unlocked. Build relentlessly." },
  pro_500_monthly:  { name: "Pro",  credits: "500 credits/mo",   icon: Rocket, tagline: "Now playing in the big leagues." },
  pro_1000_monthly: { name: "Pro",  credits: "1,000 credits/mo", icon: Crown,  tagline: "Power-user mode. The platform is yours." },
  pro_2500_monthly: { name: "Pro",  credits: "2,500 credits/mo", icon: Crown,  tagline: "Top-tier access. No throttling." },
  pro_5000_monthly: { name: "Pro",  credits: "5,000 credits/mo", icon: Crown,  tagline: "Top-tier access. No throttling." },
  pro_7000_monthly: { name: "Pro",  credits: "7,000 credits/mo", icon: Crown,  tagline: "Maximum Pro. The whole platform is yours." },
};

export function UpgradeCelebration() {
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription();
  const [open, setOpen] = useState(false);
  const seenRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !subscription || !isActive) return;
    if (seenRef.current) return;
    const key = `${STORAGE_KEY}:${user.id}`;
    const last = localStorage.getItem(key);
    const sig = `${subscription.paddle_subscription_id}:${subscription.price_id}`;
    if (last === sig) return;
    seenRef.current = true;
    localStorage.setItem(key, sig);
    setOpen(true);
  }, [user, subscription, isActive]);

  if (!subscription) return null;
  const meta = PLAN_META[subscription.price_id] || { name: "Pro", credits: "More daily credits", icon: PartyPopper, tagline: "Welcome to the next chapter." };
  const Icon = meta.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={() => setOpen(false)}
        >
          {/* Confetti dots */}
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [0, -200 - Math.random() * 200],
                x: [(Math.random() - 0.5) * 600, (Math.random() - 0.5) * 800],
                scale: [0, 1, 0.5],
                rotate: Math.random() * 720,
              }}
              transition={{ duration: 2.5, delay: i * 0.04, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
              style={{ background: ["#3B82F6", "#22D3EE", "#F59E0B", "#EC4899", "#10B981"][i % 5] }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full rounded-3xl border border-border/40 bg-card/95 backdrop-blur-2xl p-10 shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent pointer-events-none" />
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>

            <div className="relative text-center space-y-5">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, delay: 0.1 }}
                className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <Icon className="h-10 w-10 text-primary-foreground" />
              </motion.div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Welcome to {meta.name}</p>
                <h2 className="text-3xl font-bold text-foreground leading-tight">
                  You're officially upgraded.
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
                  {meta.tagline}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: meta.credits, sub: "every day" },
                  { label: "Full AI", sub: "no throttling" },
                  { label: "Priority", sub: "support" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border/40 bg-background/40 p-3">
                    <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => { setOpen(false); navigate("/journey"); }}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                >
                  Open my journey
                </Button>
                <Button onClick={() => setOpen(false)} variant="outline" className="h-11 rounded-xl">
                  Later
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

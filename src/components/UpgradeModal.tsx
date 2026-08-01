import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth } from "@/contexts/AuthContext";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openCheckout, loading } = usePaddleCheckout();

  const handleQuickUpgrade = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Default quick-upgrade: Pro at 100 credits/mo ($25/mo)
    await openCheckout("pro_100_monthly");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl relative"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
              >
                <Zap className="h-8 w-8 text-primary-foreground" />
              </motion.div>

              <h2 className="text-2xl font-bold text-foreground">You've used all your credits</h2>
              <p className="text-muted-foreground text-sm">
                Upgrade to Pro to keep building. Pick your monthly credit volume — pay only for what you use.
              </p>

              <Button
                onClick={handleQuickUpgrade}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Upgrade to Pro — from $5/mo <ArrowRight className="h-4 w-4" /></>}
              </Button>

              <Button
                onClick={() => { onClose(); navigate("/pricing"); }}
                variant="outline"
                className="w-full h-11 rounded-xl"
              >
                See all plans
              </Button>

              <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                I'll wait for the daily reset
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

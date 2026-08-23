import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface CouponSuccessModalProps {
  open: boolean;
  onClose: () => void;
  /** Plan display name if a plan was unlocked, e.g. "Pro". Omit for a credits-only redemption. */
  planName?: string | null;
  /** e.g. "250 credits / month" — the unlocked plan's ongoing allotment, shown instead of a
   * misleading "0 credits granted" when the coupon itself carries no bonus credits. */
  planCreditLabel?: string | null;
  creditsGranted?: number;
  code: string;
  /** Shown as a call-to-action when a plan still needs to be activated. */
  onActivatePlan?: () => void;
  /**
   * True when redemption already put the user on the plan.
   *
   * Redemption used to only *unlock* a tier — the user then had to find a "$0"
   * button on /pricing, which is why coupons appeared to do nothing. The server
   * now applies the plan during `redeem_coupon`, so telling people to go and
   * claim it would be sending them after a button that is no longer there.
   */
  planActive?: boolean;
}

/**
 * Full congratulations screen shown after a successful coupon redemption —
 * replaces the old toast, which was too easy to miss and didn't communicate
 * what was actually unlocked.
 */
export function CouponSuccessModal({
  open,
  onClose,
  planName,
  planCreditLabel,
  creditsGranted,
  code,
  onActivatePlan,
  planActive = false,
}: CouponSuccessModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-background/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <span className="text-xl leading-none" aria-hidden="true">×</span>
            </button>

            <div className="p-10 text-center space-y-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
                className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl"
              >
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.25 }}
                  className="text-3xl font-bold text-white"
                  aria-hidden="true"
                >
                  ✓
                </motion.span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="space-y-2"
              >
                <h2 className="text-2xl font-bold text-foreground">Congratulations</h2>
                <p className="text-muted-foreground">
                  {planName
                    ? `${planName} is ${planActive ? "active on your account" : "unlocked"} at no charge${planCreditLabel ? ` — ${planCreditLabel}` : ""}.`
                    : `${creditsGranted ?? 0} bonus credits have been added to your account.`}
                </p>
                {planName && creditsGranted != null && creditsGranted > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Plus {creditsGranted.toLocaleString()} bonus credits added to your account.
                  </p>
                )}
                {planName && (
                  <p className="text-sm text-muted-foreground">
                    {planActive
                      ? `Nothing else to do — every ${planName} feature is unlocked right now.`
                      : `Find the ${planName} plan in the tier list above and claim it to make it active.`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Code <span className="font-medium text-foreground">{code}</span> applied
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="pt-2"
              >
                {planName && onActivatePlan && !planActive ? (
                  <Button
                    onClick={() => {
                      onActivatePlan();
                      onClose();
                    }}
                    className="w-full h-11 rounded-xl font-semibold"
                  >
                    Activate {planName} now
                  </Button>
                ) : (
                  <Button onClick={onClose} variant="outline" className="w-full h-11 rounded-xl">
                    Continue
                  </Button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

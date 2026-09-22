import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

declare global {
  interface Window { Paddle: any; }
}

const PADDLE_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";

/**
 * The in-flight (or finished) load, cached so concurrent callers share one.
 *
 * A boolean flag cannot do this job: it only flips once the script has loaded,
 * so two components calling `initializePaddle()` in the same tick both saw
 * `false`, and the second one ran while the first had appended the tag but not
 * yet loaded it — `window.Paddle` was still undefined, so it appended a SECOND
 * copy of paddle.js and both onloads then called `Paddle.Initialize`. Caching
 * the promise means the second caller waits on the first load instead.
 */
let initPromise: Promise<void> | null = null;

export function getPaddleEnv(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

export async function initializePaddle(): Promise<void> {
  if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      const env = clientToken.startsWith("test_") ? "sandbox" : "production";
      window.Paddle.Environment.set(env);
      window.Paddle.Initialize({ token: clientToken });
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PADDLE_SRC}"]`);
    if (existing) {
      // A tag someone else added (or a previous, discarded attempt): wait for
      // it rather than adding another.
      if (window.Paddle) { onLoad(); return; }
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = PADDLE_SRC;
    script.onload = onLoad;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  // A failed load must not be cached forever — the next checkout attempt should
  // be allowed to try again. The rejection is still delivered to this caller.
  initPromise.catch(() => { initPromise = null; });

  return initPromise;
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnv();
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId) throw new Error(`Failed to resolve price: ${priceId}`);
  return data.paddleId;
}

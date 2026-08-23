import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import pathforgeLogo from '@/assets/pathforge-logo.webp';

type View = 'verifying' | 'success' | 'invalid';

const VALID_TYPES = new Set(['signup', 'magiclink', 'invite', 'email_change', 'email']);

export default function AuthConfirm() {
  const [view, setView] = useState<View>('verifying');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const token = params.get('token');
      const email = params.get('email');
      const rawType = params.get('type') || 'signup';
      const type = (rawType === 'email' ? 'email' : rawType) as any;

      if (!VALID_TYPES.has(rawType)) {
        setView('invalid');
        setMessage('Unsupported confirmation type.');
        return;
      }

      try {
        let error: any = null;
        if (tokenHash) {
          ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
        } else if (token && email) {
          ({ error } = await supabase.auth.verifyOtp({ token, email, type }));
        } else {
          // Hash fragment fallback (supabase-js detectSessionInUrl)
          await new Promise((r) => setTimeout(r, 400));
          const { data } = await supabase.auth.getSession();
          if (cancelled) return;
          if (data.session) { setView('success'); setTimeout(() => navigate('/dashboard'), 900); return; }
          setView('invalid');
          setMessage('Missing or invalid confirmation token.');
          return;
        }
        if (cancelled) return;
        if (error) {
          setView('invalid');
          setMessage(error.message || 'Link is invalid or expired.');
          return;
        }
        window.history.replaceState({}, '', '/auth/confirm');
        setView('success');
        setTimeout(() => navigate('/dashboard'), 900);
      } catch (e: any) {
        if (cancelled) return;
        setView('invalid');
        setMessage(e?.message || 'Something went wrong.');
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-[100svh] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md card-elevated p-8 text-center">
        <img src={pathforgeLogo} alt="Pathforge" className="h-12 mx-auto mb-6" />
        {view === 'verifying' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Confirming…</h1>
            <p className="text-muted-foreground mt-2">Just a moment.</p>
          </>
        )}
        {view === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-accent mx-auto mb-4" />
            <h1 className="text-2xl font-bold">You're in</h1>
            <p className="text-muted-foreground mt-2">Redirecting…</p>
          </>
        )}
        {view === 'invalid' && (
          <>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Link invalid</h1>
            <p className="text-muted-foreground mt-2">{message || 'This link is invalid or has expired.'}</p>
            <Button onClick={() => navigate('/auth')} className="mt-6 w-full">Back to sign in</Button>
          </>
        )}
      </div>
    </div>
  );
}

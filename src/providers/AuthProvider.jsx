import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext.jsx';
import AuthLoading from '../components/common/AuthLoading.jsx';
import { supabase } from '../lib/supabase.js';

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      isAuthenticated: Boolean(session),
    }),
    [session, user, isLoading],
  );

  if (isLoading) {
    return <AuthLoading />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

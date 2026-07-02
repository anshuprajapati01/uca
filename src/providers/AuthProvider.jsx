import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext.jsx';
import AuthLoading from '../components/common/AuthLoading.jsx';
import { supabase } from '../lib/supabase.js';
import { fetchUserProfile } from '../services/userProfileService.js';
import { getAuthErrorMessage } from '../utils/authErrors.js';

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);

  const isFetchingProfile = useRef(false);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setRole(null);
      setProfileError(null);
      return;
    }

    if (isFetchingProfile.current) {
      return;
    }

    isFetchingProfile.current = true;

    try {
      const userProfile = await fetchUserProfile(authUser.id, authUser.email);
      setProfile(userProfile);
      setRole(userProfile.role);
      setProfileError(null);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setProfile(null);
      setRole(null);
      setProfileError(getAuthErrorMessage(error));
    } finally {
      isFetchingProfile.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user);
        } else {
          setProfile(null);
          setRole(null);
          setProfileError(null);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setProfileError(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;

      try {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          await loadProfile(nextSession.user);
        } else {
          setProfile(null);
          setRole(null);
          setProfileError(null);
        }
      } catch (error) {
        console.error('Auth state change handler failed:', error);
        if (mounted) {
          setProfile(null);
          setRole(null);
          setProfileError(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
  const failsafeTimeoutId = setTimeout(() => {
      setLoading(false);
    }, 8000);

    return () => clearTimeout(failsafeTimeoutId);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      role,
      loading,
      isAuthenticated: Boolean(session),
      profileError,
    }),
    [session, user, profile, role, loading, profileError],
  );

  if (loading) {
    return <AuthLoading />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
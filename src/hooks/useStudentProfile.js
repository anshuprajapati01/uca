import { useState, useEffect } from 'react';
import { fetchStudentProfile } from '../services/studentService.js';
import { useAuth } from '../hooks/useAuth.js';

export function useStudentProfile() {
  const { user, profile: authProfile } = useAuth();
  const [studentProfile, setStudentProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setStudentProfile(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchStudentProfile(user.id);
        if (!cancelled) {
          setStudentProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setStudentProfile(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayProfile = studentProfile
    ? {
        ...studentProfile,
        full_name:
          studentProfile.full_name ??
          authProfile?.full_name ??
          null,
      }
    : authProfile;

  return {
    profile: displayProfile,
    isLoading,
    error,
  };
}

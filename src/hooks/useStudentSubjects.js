import { useState, useEffect } from 'react';
import { fetchSubjectsByBatch } from '../services/subjectService.js';
import { useAuth } from './useAuth.js';

export function useStudentSubjects() {
  const { user, profile } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !profile?.batch_id) {
      setSubjects([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchSubjectsByBatch(profile.batch_id);
        if (!cancelled) {
          setSubjects(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setSubjects([]);
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
  }, [user, profile?.batch_id]);

  return {
    subjects,
    isLoading,
    error,
  };
}
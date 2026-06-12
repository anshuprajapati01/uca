import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export default function useStudentSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBatchSubjects = async () => {
      try {
        // 1. Get current user
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) throw new Error("Authentication failed");

        // 2. Fetch the user's specific batch_id directly
        const { data: profile, error: profileErr } = await supabase
          .from('user_profiles')
          .select('batch_id')
          .eq('id', user.id)
          .single();
          
        if (profileErr || !profile?.batch_id) {
          setSubjects([]); // No batch assigned yet
          return;
        }

        // 3. Fetch subjects for this exact batch_id
        const { data: subjectsData, error: subErr } = await supabase
          .from('subjects')
          .select('*')
          .eq('batch_id', profile.batch_id);

        if (subErr) throw subErr;
        setSubjects(subjectsData || []);
      } catch (err) {
        console.error("Subject fetch error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchSubjects();
  }, []);

  return { subjects, isLoading, error };
}
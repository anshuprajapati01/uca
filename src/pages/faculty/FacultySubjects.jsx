import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { BookOpen } from 'lucide-react';
import './FacultySubjects.css';

export default function FacultySubjects() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setSubjects([]);
            setError(null);
          }
          return;
        }

        const { data, error: supabaseError } = await supabase
          .from('subjects')
          .select('*')
          .eq('faculty_id', user.id)
          .order('created_at', { ascending: false });
        if (supabaseError) throw supabaseError;
        if (!cancelled) setSubjects(data || []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return <p className="dashboard-resources__status">Loading subjects…</p>;
  }

  if (error) {
    return (
      <p className="dashboard-resources__status dashboard-resources__status--error">
        Unable to load subjects. Please try again later.
      </p>
    );
  }

  return (
    <>
      <header className="faculty-subjects__header">
        <h2>My Subjects</h2>
      </header>

      {subjects.length === 0 ? (
        <p className="dashboard-resources__status">
          No subjects assigned yet.
        </p>
      ) : (
        <div className="faculty-subjects__grid">
          {subjects.map((subject) => (
            <div key={subject.id} className="subject-card">
              <div className="subject-card__icon">
                <BookOpen size={22} />
              </div>
              <div className="subject-card__body">
                <h3 className="subject-card__name">{subject.name}</h3>
                <div className="subject-card__meta">
                  <span className="subject-badge">{subject.code}</span>
                </div>
                <div className="subject-card__details">
                  <span>Semester {subject.semester}</span>
                  <span>{subject.credits} Credits</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
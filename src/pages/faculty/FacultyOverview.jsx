import { useState, useEffect } from 'react';
import { BookOpen, FileText, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import './FacultyOverview.css';

function StatCard({ icon: Icon, label, value, isLoading }) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon">
        <Icon size={24} />
      </div>
      <div className="stat-card__content">
        <p className="stat-card__label">{label}</p>
        {isLoading ? (
          <p className="stat-card__value stat-card__value--loading">Loading…</p>
        ) : (
          <p className="stat-card__value">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function FacultyOverview() {
  const [stats, setStats] = useState({
    subjects: 0,
    resources: 0,
    announcements: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [{ count: subjectsCount }, { count: resourcesCount }, { count: announcementsCount }] =
          await Promise.all([
            supabase.from('subjects').select('*', { count: 'exact', head: true }),
            supabase.from('study_materials').select('*', { count: 'exact', head: true }),
            supabase.from('announcements').select('*', { count: 'exact', head: true }),
          ]);
        if (!cancelled) {
          setStats({
            subjects: subjectsCount || 0,
            resources: resourcesCount || 0,
            announcements: announcementsCount || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <section className="faculty-overview__welcome">
        <h2>Welcome to Faculty Portal</h2>
        <p>Manage your subjects, resources, and announcements from here.</p>
      </section>

      <section className="faculty-overview__stats">
        <StatCard icon={BookOpen} label="My Subjects" value={stats.subjects} isLoading={isLoading} />
        <StatCard icon={FileText} label="Total Resources Uploaded" value={stats.resources} isLoading={isLoading} />
        <StatCard icon={Megaphone} label="Announcements" value={stats.announcements} isLoading={isLoading} />
      </section>
    </>
  );
}

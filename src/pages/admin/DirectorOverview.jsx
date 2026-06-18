import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import './DirectorOverview.css';

export default function DirectorOverview() {
  const [stats, setStats] = useState({
    students: 1240,
    faculty: 48,
    health: '99.9%',
  });

  useEffect(() => {
    async function loadStats() {
      const [{ count: studentCount }, { count: facultyCount }] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'faculty'),
      ]);
      setStats(prev => ({
        ...prev,
        students: studentCount || prev.students,
        faculty: facultyCount || prev.faculty,
      }));
    }
    loadStats();
  }, []);

  return (
    <div className="director-overview">
      <div className="director-header">
        <h1 className="director-header__title">Welcome back, Director</h1>
        <p className="director-header__subtitle">Overview and System Status</p>
      </div>

      <div className="director-stats-grid">
        <div className="stat-card">
          <span className="stat-card__label">Total Students</span>
          <span className="stat-card__value">{stats.students.toLocaleString()}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">Active Faculty</span>
          <span className="stat-card__value">{stats.faculty.toLocaleString()}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">System Health</span>
          <span className="stat-card__value">{stats.health} Online</span>
        </div>
      </div>

      <section className="director-placeholder-section">
        <h2 className="director-placeholder-section__title">Quick Actions</h2>
        <p className="director-placeholder-section__text">Content coming soon...</p>
      </section>
    </div>
  );
}
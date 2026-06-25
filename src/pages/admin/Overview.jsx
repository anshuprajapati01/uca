import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import './Overview.css';

export default function Overview() {
  const [stats, setStats] = useState({ faculty: 0, students: 0, materials: 0 });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { count: fCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'faculty');
      const { count: sCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
      const { count: mCount } = await supabase.from('study_materials').select('*', { count: 'exact', head: true });

      const { data: materials } = await supabase.from('study_materials')
        .select('*, user_profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      const activityItems = materials?.map(m => ({
        id: m.id,
        title: m.title,
        author: m.user_profiles?.full_name || 'Admin',
        date: new Date(m.created_at).toLocaleDateString()
      })) || [];

      setStats({ faculty: fCount || 0, students: sCount || 0, materials: mCount || 0 });
      setRecentActivity(activityItems);
    }
    fetchData();
  }, []);

  return (
    <div className="admin-overview">
      <h1 className="overview-title">Department Overview</h1>

      <div className="stats-row">
        <div className="stat-card">
          <p className="stat-label">Total Faculty</p>
          <p className="stat-value">{stats.faculty}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Students</p>
          <p className="stat-value">{stats.students}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Materials</p>
          <p className="stat-value">{stats.materials}</p>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.length > 0 ? recentActivity.map(item => (
            <div key={item.id} className="activity-item">
              <span className="activity-title">{item.title}</span>
              <span className="activity-meta">{item.author} • {item.date}</span>
            </div>
          )) : (
            <p className="empty-state">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}

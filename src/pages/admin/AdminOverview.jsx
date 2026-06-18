import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminOverview() {
  const [stats, setStats] = useState({ faculty: 0, students: 0, materials: 0 });
  const [recentUploads, setRecentUploads] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { count: fCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'faculty');
      const { count: sCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
      const { count: mCount } = await supabase.from('study_materials').select('*', { count: 'exact', head: true });
      
      const { data: materials } = await supabase.from('study_materials')
        .select('*, user_profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({ faculty: fCount || 0, students: sCount || 0, materials: mCount || 0 });
      setRecentUploads(materials || []);
    }
    fetchData();
  }, []);

  const glassCard = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '20px',
    transition: 'transform 0.2s'
  };

  return (
    <div style={{ padding: '24px', color: '#fff', maxWidth: '1000px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px' }}>Department Overview</h2>
      
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {[ { label: 'Total Faculty', val: stats.faculty }, { label: 'Total Students', val: stats.students }, { label: 'Total Materials', val: stats.materials } ].map((item, i) => (
          <div key={i} style={{ ...glassCard, cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ color: '#9ca3af', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px' }}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* Recent Uploads */}
      <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Recent Activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recentUploads.length > 0 ? recentUploads.map((m) => (
          <div key={m.id} style={{ ...glassCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600' }}>{m.title}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Uploaded by: {m.user_profiles?.full_name || 'Admin'}</div>
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>{new Date(m.created_at).toLocaleDateString()}</div>
          </div>
        )) : (
          <div style={{ ...glassCard, textAlign: 'center', color: '#6b7280' }}>No recent activity found.</div>
        )}
      </div>
    </div>
  );
}
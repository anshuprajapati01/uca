import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    subjects: 0,
    resources: 0,
    announcements: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [myClasses, setMyClasses] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      setScheduleLoading(true);
      try {
        const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: slots, error } = await supabase
          .from('timetable_slots')
          .select('*, subjects(name)')
          .eq('day_of_week', currentDay)
          .eq('faculty_id', user.id)
          .order('start_time', { ascending: true });

        if (error) throw error;
        if (!cancelled) setMyClasses(slots || []);
      } catch (err) {
        console.error('Failed to load today schedule:', err);
        if (!cancelled) setMyClasses([]);
      } finally {
        if (!cancelled) setScheduleLoading(false);
      }
    }
    loadSchedule();
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

    <div style={{ marginTop: '2rem', backgroundColor: '#1a1d2d', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #1f2937' }}>
  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    📅 My Schedule Today
  </h3>
  {myClasses && myClasses.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {myClasses.map((slot, index) => {
        const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
        const isLive = currentTime >= slot.start_time && currentTime <= slot.end_time;

        return (
          <div key={index} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252940', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #374151', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '0.875rem' }}>
                {slot.start_time} - {slot.end_time}
              </span>
              <span style={{ color: 'white', fontWeight: '800', fontSize: '1.25rem' }}>
                {slot.subjects?.name || 'Subject'}
              </span>
              <span style={{ color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                Room: {slot.room_no} &bull; Batch: {slot.batch}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isLive && (
                <span style={{ padding: '0.375rem 1rem', borderRadius: '9999px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.875rem', fontWeight: '900' }}>
                  🟢 LIVE
                </span>
              )}
              <button 
                onClick={() => navigate('/faculty/subjects')} 
                style={{ padding: '0.625rem 1.25rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}
              >
                📝 Take Attendance
              </button>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#252940', borderRadius: '0.75rem', border: '1px solid #374151' }}>
      <p style={{ color: '#9ca3af', fontWeight: '500', fontSize: '1.125rem', margin: 0 }}>No classes scheduled for today. Relax! ☕</p>
    </div>
  )}
</div>
    </>
  );
}

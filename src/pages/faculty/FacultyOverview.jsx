import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import '../student/StudentDashboard.css';
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

// Isko yahan replace kar do
const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getInitialDay = () => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return days.includes(today) ? today : 'Monday';
};

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
  const [selectedDay, setSelectedDay] = useState(getInitialDay);

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const currentUser = user;

        const { data: slots, error } = await supabase
          .from('timetable_slots')
          .select('*, subjects(name, code), user_profiles(full_name)')
          .eq('faculty_id', currentUser.id)
          .eq('day_of_week', selectedDay) // Ensure 'selectedDay' matches exactly what is in DB (e.g., 'Tuesday')
          .order('start_time', { ascending: true });

        if (!error && slots) {
          console.log(`DEBUG: Raw Data for ${selectedDay}:`, JSON.stringify(slots, null, 2));
        }

        if (error) throw error;
        if (!cancelled) setMyClasses(slots || []);
      } catch (err) {
        console.error('Failed to load schedule:', err);
        if (!cancelled) setMyClasses([]);
      } finally {
        if (!cancelled) setScheduleLoading(false);
      }
    }
    loadSchedule();
    return () => { cancelled = true; };
  }, [selectedDay]);

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

    <section className="student-section student-section--grow student-section--full faculty-schedule-section">
      <h3 className="student-section__title">
        📅 My Weekly Schedule <span className="st-header-sub">({selectedDay})</span>
      </h3>

      <div className="st-day-selector">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            className={`st-day-btn ${selectedDay === day ? 'active' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            {day.substring(0, 3)}
          </button>
        ))}
      </div>

      {scheduleLoading ? (
        <div className="student-empty-box">
          <p>Loading your schedule…</p>
        </div>
      ) : myClasses && myClasses.length > 0 ? (
        <div className={`st-timeline-container ${myClasses.length > 2 ? 'st-timeline-container--scroll' : ''}`}>
          {myClasses.map((slot) => {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
            const isLive = selectedDay === today && currentTime >= slot.start_time && currentTime <= slot.end_time;

            const formatBatchDisplay = (batch) => {
              if (!batch || batch.toLowerCase() === 'all') return 'Batch All (B1 & B2)';
              return `Section ${batch.toUpperCase()}`;
            };

            return (
              <div
                key={slot.id}
                className={`st-class-card st-type-${slot.slot_type?.toLowerCase() || 'theory'}`}
              >
                <div className="st-time-col">
                  <span className="st-time-badge">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </span>
                  {isLive && <span className="student-schedule-card__live">🟢 LIVE</span>}
                </div>
                <div className="st-info-col">
                  <h4>
                    {slot.subjects?.name || 'Unknown Subject'}{' '}
                    <span className="st-sub-code">({slot.subjects?.code || 'N/A'})</span>
                  </h4>
                  <p className="st-faculty">{slot.user_profiles?.full_name || 'Assigned Faculty'}</p>
                  <p className="st-faculty">
                    Room {slot.room_no || 'TBA'} &bull; {formatBatchDisplay(slot.batch)}
                  </p>
                </div>
                <div className="st-room-col">
                  <button
                    type="button"
                    className="faculty-take-attendance-btn"
                    onClick={() => navigate('/faculty/subjects')}
                  >
                    📝 Take Attendance
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="student-empty-box">
          <p>No classes scheduled for {selectedDay}. Enjoy your day!</p>
        </div>
      )}
    </section>
    </>
  );
}

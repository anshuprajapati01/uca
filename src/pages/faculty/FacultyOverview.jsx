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

// Turn a numeric/string year (1..4) into an ordinal label, e.g. 2 -> "2nd Year"
const getYearLabel = (year) => {
  if (year === null || year === undefined || year === '') return '';
  const n = parseInt(year, 10);
  if (Number.isNaN(n)) return String(year);
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' })[n] || 'th';
  return `${n}${suffix} Year`;
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatSectionLabel = (val) => {
  if (!val || val.toString().toLowerCase() === 'all') {
    return 'All';
  }
  const sectionName = val.toString().toUpperCase();
  return `Section ${sectionName}`;
};

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
  const [uniqueBranches, setUniqueBranches] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');

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
    async function loadFilters() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch every branch/year this faculty is assigned to across the whole week
        const { data, error } = await supabase
          .from('timetable_slots')
          .select('branch, year')
          .eq('faculty_id', user.id);

        if (error) throw error;
        if (!cancelled) {
          const branches = [...new Set((data || []).map((s) => s.branch).filter(Boolean))].sort();
          setUniqueBranches(branches);
          // If the currently active filter is no longer valid, reset to "All"
          setActiveFilter((prev) => (prev === 'All' || branches.includes(prev) ? prev : 'All'));
        }
      } catch (err) {
        console.error('Failed to load schedule filters:', err);
        if (!cancelled) setUniqueBranches([]);
      }
    }
    loadFilters();
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

        const { data: rawSlots, error } = await supabase
          .from('timetable_slots')
          .select('*')
          .eq('faculty_id', currentUser.id)
          .eq('day_of_week', selectedDay) // Ensure 'selectedDay' matches exactly what is in DB (e.g., 'Tuesday')
          .order('start_time', { ascending: true });

        if (!error && rawSlots) {
          console.log(`DEBUG: Raw Data for ${selectedDay}:`, JSON.stringify(rawSlots, null, 2));
        }
        if (error) throw error;

        const subjectIds = [...new Set((rawSlots || []).map((s) => s.subject_id).filter(Boolean))];
        const facultyIds = [...new Set((rawSlots || []).map((s) => s.faculty_id).filter(Boolean))];

        const [subjectsRes, facultiesRes] = await Promise.all([
          subjectIds.length
            ? supabase.from('subjects').select('id, name, code').in('id', subjectIds)
            : Promise.resolve({ data: [] }),
          facultyIds.length
            ? supabase.from('user_profiles').select('id, full_name').in('id', facultyIds)
            : Promise.resolve({ data: [] }),
        ]);

        const subjectMap = new Map((subjectsRes.data || []).map((s) => [s.id, s]));
        const facultyMap = new Map((facultiesRes.data || []).map((f) => [f.id, f]));

        const slots = (rawSlots || []).map((slot) => ({
          ...slot,
          subjects: subjectMap.get(slot.subject_id) || null,
          user_profiles: facultyMap.get(slot.faculty_id) || null,
        }));

        if (!cancelled) setMyClasses(slots);
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

  // Apply the active branch filter to the day's schedule
  const displayedSchedule = myClasses.filter(
    (slot) => activeFilter === 'All' || slot.branch === activeFilter
  );

  // Route straight to the subject workspace with the Attendance tab open,
  // carrying the section/batch context so faculty need not re-select it.
  const handleTakeAttendance = (slot) => {
    const batch = (slot.batch || '').toLowerCase();
    const sectionContext = batch && batch !== 'all' ? batch.toUpperCase() : 'All';

    if (!slot.subject_id) {
      // Non-academic / unlinked slot: fall back to the subjects list
      navigate('/faculty/subjects', { state: { targetSlot: slot } });
      return;
    }

    navigate(`/faculty/workspace/${encodeURIComponent(slot.subject_id)}`, {
      state: {
        activeSlot: slot,
        openAttendance: true,
        sectionContext,
      },
    });
  };

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

      {uniqueBranches.length > 0 && (
        <div className="faculty-filter-pills">
          <button
            type="button"
            className={`faculty-filter-pill ${activeFilter === 'All' ? 'active' : ''}`}
            onClick={() => setActiveFilter('All')}
          >
            All
          </button>
          {uniqueBranches.map((branch) => (
            <button
              key={branch}
              type="button"
              className={`faculty-filter-pill ${activeFilter === branch ? 'active' : ''}`}
              onClick={() => setActiveFilter(branch)}
            >
              {branch}
            </button>
          ))}
        </div>
      )}

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
      ) : displayedSchedule && displayedSchedule.length > 0 ? (
        <div className={`st-timeline-container ${displayedSchedule.length > 2 ? 'st-timeline-container--scroll' : ''}`}>
          {displayedSchedule.map((slot) => {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
            const isLive = selectedDay === today && currentTime >= slot.start_time && currentTime <= slot.end_time;

            const yearLabel = getYearLabel(slot.year);
            const metaParts = [
              slot.room_no ? `📍 Room ${slot.room_no}` : '📍 Room TBA',
               formatSectionLabel(slot.batch || slot.section || ''),
            ];
            if (slot.branch || yearLabel) {
              metaParts.push([slot.branch, yearLabel].filter(Boolean).join(' '));
            }

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
                <div className="st-info-col class-card-body">
                  <h4>
                    {slot.subjects?.name || 'Unknown Subject'}{' '}
                    <span className="st-sub-code">({slot.subjects?.code || 'N/A'})</span>
                  </h4>
                  <p className="st-faculty">{slot.user_profiles?.full_name || 'Assigned Faculty'}</p>
                  <div className="st-meta-row">
                    {metaParts.map((part, idx) => (
                      <span key={idx} className="st-meta-item">
                        {idx > 0 && <span className="st-meta-dot">•</span>}
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="st-room-col">
                  <button
                    type="button"
                    className="faculty-take-attendance-btn"
                    onClick={() => handleTakeAttendance(slot)}
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
          <p>
            {myClasses.length > 0 && activeFilter !== 'All'
              ? `No ${activeFilter} classes on ${selectedDay}. Try another branch or day.`
              : `No classes scheduled for ${selectedDay}. Enjoy your day!`}
          </p>
        </div>
      )}
    </section>
    </>
  );
}

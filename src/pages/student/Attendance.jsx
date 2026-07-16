import { useState, useEffect } from "react";
import { supabase } from '../../lib/supabase.js';
import "./Attendance.css";

const THRESHOLD = 75;

const computePct = (present = 0, total = 0) =>
  total > 0 ? Math.round((present / total) * 100) : 0;

const formatTimelineDate = (dateStr) => {
  if (!dateStr) return { day: "N/A", full: "—" };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { day: "N/A", full: "—" };
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    full: d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
};

const formatCleanDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
};

const formatTime12h = (time) => {
  if (!time) return "—";
  const [h, m] = String(time).split(":");
  const hour24 = parseInt(h, 10);
  if (Number.isNaN(hour24)) return time;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(m || "00").padStart(2, "0")} ${period}`;
};

const formatTime = (time) => formatTime12h(time);

const getFullTimeRange = (record, isLab = false) => {
  const start = record.start_time || record.time;
  if (!start) return 'N/A';

  let end = record.end_time;
  if (!end) {
    const [hours, minutes] = start.split(':').map(Number);
    const dateObj = new Date();
    dateObj.setHours(hours, minutes + (isLab ? 110 : 55), 0);
    end = dateObj.toTimeString().split(' ')[0];
  }

  return `${formatTime(start)} - ${formatTime(end)}`;
};

const statusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "present") return "present";
  if (s === "late") return "late";
  return "absent";
};

const normalizeStatus = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "P") return "Present";
  if (s === "A") return "Absent";
  if (s === "L") return "Late";
  return status || "Absent";
};

// Shared academic-week anchor. Dynamically fetched from system_settings.
// Falls back to June 29, 2026 if not configured.
const getSemesterStart = (semesterStartDate) => semesterStartDate || new Date(2026, 5, 29);

const getAnchorMonday = (startDate) => {
  const d = new Date(getSemesterStart(startDate));
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekBounds = (weekNum, semesterStartDate) => {
  const anchor = getAnchorMonday(semesterStartDate);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + (weekNum - 1) * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getWeekNumber = (dateStr, semesterStartDate) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const anchor = getAnchorMonday(semesterStartDate);
  const diff = d.getTime() - anchor.getTime();
  const weekNum = Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) + 1;
  return Math.max(1, weekNum);
};

const groupRecordsByWeek = (records, semesterStartDate) => {
  const map = {};
  records.forEach((rec) => {
    const weekNum = getWeekNumber(rec.date, semesterStartDate);
    if (weekNum == null) return;
    const key = `Week ${weekNum}`;
    if (!map[key]) map[key] = [];
    map[key].push(rec);
  });
  return map;
};

const recordBelongsToSubject = (rec, sub) => {
  if (!rec.subjectName) return false;
  if (sub.code && rec.subjectName.includes(sub.code)) return true;
  if (sub.name && rec.subjectName.includes(sub.name)) return true;
  return false;
};

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export default function Attendance({ subjects, records, loading = false }) {
  const [subjectType, setSubjectType] = useState("All");
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeWeek, setActiveWeek] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterStartDate, setSemesterStartDate] = useState(null);
  const [isSemesterLoading, setIsSemesterLoading] = useState(true);

  useEffect(() => {
    const fetchSemesterConfig = async () => {
      setIsSemesterLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('semester_start_date')
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error fetching semester config:', error);
        } else if (data?.semester_start_date) {
          setSemesterStartDate(new Date(data.semester_start_date));
        } else {
          setSemesterStartDate(new Date(2026, 5, 29));
        }
      } catch (err) {
        console.error('Failed to fetch semester config:', err);
        setSemesterStartDate(new Date(2026, 5, 29));
      } finally {
        setIsSemesterLoading(false);
      }
    };

    fetchSemesterConfig();
  }, []);

  const rawData = (records && Array.isArray(records) ? records : []);

  const normalizedRecords = rawData
     .filter((r) => r.attendance_sessions != null && r.attendance_sessions.date != null)
     .map((r) => ({
       ...r,
       subjectName:
         r.attendance_sessions?.subjects?.name || r.subjectName || r.subject || null,
       date: r.attendance_sessions.date,
       start_time: r.attendance_sessions.start_time,
       end_time: r.attendance_sessions.end_time,
       day: r.attendance_sessions.day || new Date(r.attendance_sessions.date).toLocaleDateString('en-US', { weekday: 'short' }),
       type: r.attendance_sessions.type || (String(r.attendance_sessions?.subjects?.name || '').toLowerCase().includes('lab') ? 'Lab' : 'Theory'),
       time:
         r.attendance_sessions.start_time ||
         (r.marked_at
           ? new Date(r.marked_at).toLocaleTimeString("en-GB", {
               hour: "2-digit",
               minute: "2-digit",
             })
           : null),
       status: normalizeStatus(r.status),
       is_extra_class: r.attendance_sessions.is_extra_class || r.is_extra_class || false,
     }));

  const attendanceSummary = normalizedRecords.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === 'Present') acc.present += 1;
      return acc;
    },
    { total: 0, present: 0 }
  );

  const safeOverall = { total: attendanceSummary.total, present: attendanceSummary.present };
  const safeOverallPct = computePct(attendanceSummary.present, attendanceSummary.total);

  const isSafe = safeOverallPct >= THRESHOLD;

  const safeSubjects =
    subjects && Array.isArray(subjects)
      ? subjects
      : [];

  const normalizedSubjects = safeSubjects.map((s) => {
    const present = s.present ?? 0;
    const total = s.total ?? 0;
    const pct = typeof s.percentage === "number" ? s.percentage : computePct(present, total);
    const history =
      normalizedRecords
        .filter((r) => recordBelongsToSubject(r, s))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((r, i) => ({
          id: `${s.code || s.name}-${r.date}-${i}`,
          date: r.date,
          time: r.time,
          start_time: r.start_time,
          end_time: r.end_time,
          status: r.status,
          is_extra_class: r.is_extra_class,
        }));
    return {
      id: s.code || s.name || s.id,
      name: s.name,
      code: s.code || "",
      type: s.type || "Theory",
      present,
      total,
      percentage: pct,
      history,
    };
  });

  const filteredSubjects = normalizedSubjects.filter((sub) => {
    const matchesTab =
      subjectType === "All" || sub.type?.toLowerCase() === subjectType.toLowerCase();
    const matchesSearch = !searchQuery ||
      (sub.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.code?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      const stillVisible = filteredSubjects.some((s) => s.id === activeSubject);
      if (!stillVisible) {
        setActiveSubject(filteredSubjects[0].id);
      }
    } else {
      setActiveSubject(null);
    }
    if (activeWeek !== "All") {
      setActiveWeek("All");
    }
  }, [subjectType, searchQuery]);

  const handleSubjectChange = (id) => {
    setActiveSubject(id);
    setActiveWeek("All");
  };

  const activeSub =
    filteredSubjects.find((s) => s.id === activeSubject) ||
    filteredSubjects[0];

  const weeksMap = activeSub?.history?.length ? groupRecordsByWeek(activeSub.history, semesterStartDate) : {};
  const weekKeys = Object.keys(weeksMap).sort(
    (a, b) => parseInt(a.replace("Week ", ""), 10) - parseInt(b.replace("Week ", ""), 10)
  );

  const weeklySummary = (() => {
    if (!activeWeek || activeWeek === "All" || !weeksMap[activeWeek]) return null;
    const records = weeksMap[activeWeek];
    const total = records.length;
    const attended = records.filter((r) => String(r.status || "").toLowerCase() === "present").length;
    return { total, attended };
  })();

  // Donut geometry
  const size = 230;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeOverallPct / 100);

  if (isSemesterLoading || !semesterStartDate) {
    return (
      <div className="attendance-page">
        <div className="att-glass att-loading">
          <div className="att-spinner" />
          Loading semester configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <section className="att-glass att-hero">
        {/* ===== 1. OVERALL HERO (unchanged) ===== */}
        <div className="att-donut-wrap">
          <svg className="att-donut" width={size} height={size}>
            <circle
              className="att-donut__track"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={stroke}
            />
            <circle
              className={`att-donut__progress att-donut__progress--${isSafe ? "safe" : "critical"}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="att-donut-center">
            <div className="att-donut-pct">
              {safeOverallPct}
              <span>%</span>
            </div>
            <div className={`att-donut-sub att-donut-sub--${isSafe ? "safe" : "critical"}`}>
              {isSafe ? "Safe Zone" : "Critical"}
            </div>
          </div>
        </div>

        <div className="att-hero-stats">
          <div className="att-glass att-stat-card">
            <span className="att-stat-label">
              <span className="att-stat-icon att-stat-icon--total"><ClockIcon /></span>
              Total Classes
            </span>
            <span className="att-stat-value">{safeOverall.total}</span>
            <span className="att-stat-sub">Sessions conducted so far</span>
          </div>
          <div className="att-glass att-stat-card">
            <span className="att-stat-label">
              <span className="att-stat-icon att-stat-icon--present"><CheckIcon /></span>
              Attended Classes
            </span>
            <span className="att-stat-value">{safeOverall.present}</span>
            <span className="att-stat-sub">
              {safeOverall.total - safeOverall.present} classes missed
            </span>
          </div>
        </div>
      </section>

      {/* ===== 2. SUBJECT TABS (ALL SUBJECTS HORIZONTAL ROW) ===== */}
      <section>
        <div className="att-subject-filter-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '8px 14px 8px 32px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '180px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.border = '1px solid rgba(139, 92, 246, 0.5)'}
                onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.9rem' }}>
                🔍
              </span>
            </div>

            <div className="att-filter">
              <button
                type="button"
                className={`att-filter-btn ${subjectType === "All" ? "att-filter-btn--active" : ""}`}
                onClick={() => setSubjectType("All")}
              >
                All
              </button>
              <button
                type="button"
                className={`att-filter-btn ${subjectType === "Theory" ? "att-filter-btn--active" : ""}`}
                onClick={() => setSubjectType("Theory")}
              >
                Theory
              </button>
              <button
                type="button"
                className={`att-filter-btn ${subjectType === "Practical" ? "att-filter-btn--active" : ""}`}
                onClick={() => setSubjectType("Practical")}
              >
                Practical
              </button>
            </div>
          </div>

          <h3 className="att-section-title">
            <span className="att-section-icon"><GridIcon /></span>
            Subject-wise Attendance
          </h3>
        </div>

        {loading ? (
          <div className="att-glass att-loading">
            <div className="att-spinner" />
            Loading subjects…
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="att-glass att-empty">
            {searchQuery
              ? `No ${subjectType === "All" ? "" : subjectType + " "}subjects match "${searchQuery}".`
              : `No ${subjectType === "All" ? "" : subjectType + " "}subjects found.`}
          </div>
        ) : (
          <div className="att-pills">
            {filteredSubjects.map((sub, index) => {
              const high = sub.percentage >= THRESHOLD;
              const isActive = sub.id === activeSubject;
              return (
                <button
                  key={sub.id && sub.id !== 'N/A' ? sub.id : `subject-tab-${index}`}
                  type="button"
                  className={`att-pill ${isActive ? "att-pill--active" : ""} ${high ? "att-pill--safe" : "att-pill--critical"}`}
                  onClick={() => handleSubjectChange(sub.id)}
                >
                  <span className="att-pill-dot" />
                  <span className="att-pill-name">
                    {sub.name}
                    {sub.code && <span className="att-pill-code"> · {sub.code}</span>}
                  </span>
                  <span className="att-pill-pct">{sub.percentage}%</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== 3. ACTIVE SUBJECT CONTAINER (DETAILS + HISTORY TABLE) ===== */}
      {!loading && activeSub && (
        <section className="att-glass att-subject-panel">
          {/* Compact header: name + progress bar */}
          <div className="att-subject-panel__head">
            <div className="att-subject-panel__title">
              <span className="att-subject-name">
                {activeSub.name}
                {activeSub.code && (
                  <span className="att-subject-code"> ({activeSub.code})</span>
                )}
              </span>
              <span
                className="att-subject-type"
                style={{ textTransform: 'uppercase' }}
              >
                {activeSub?.type || 'THEORY'}
              </span>
            </div>

            <div className="att-subject-panel__meta">
              <div className="att-progress-track att-progress-track--compact">
                <div
                  className={`att-progress-fill ${activeSub.percentage >= THRESHOLD ? "att-progress-fill--high" : "att-progress-fill--low"}`}
                  style={{ width: `${Math.min(activeSub.percentage, 100)}%` }}
                />
              </div>
              <span className="att-subject-count">
                Attended: <strong>{activeSub.present}</strong>/{activeSub.total}
              </span>
            </div>
          </div>

          <div className="att-subject-stats">
            <span className="att-subject-stat">
              Total Classes: <strong>{activeSub.total}</strong>
            </span>
            <span className="att-subject-stat">
              Attended: <strong>{activeSub.present}</strong>
            </span>
            <span className="att-subject-stat">
              Percentage:{' '}
              <strong
                className={`att-subject-stat--${
                  activeSub.percentage >= 75 ? "high" : activeSub.percentage >= 60 ? "medium" : "low"
                }`}
              >
                {activeSub.percentage}%
              </strong>
            </span>
          </div>

          {/* Strict HTML history table */}
          {weekKeys.length > 0 && (
            <div className="att-week-selector">
              <button
                type="button"
                className={`att-week-pill ${activeWeek === "All" ? "att-week-pill--active" : ""}`}
                onClick={() => setActiveWeek("All")}
              >
                All
              </button>
              {weekKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`att-week-pill ${activeWeek === key ? "att-week-pill--active" : ""}`}
                  onClick={() => setActiveWeek(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          {weeklySummary && (
            <div className="weekly-summary">
              <strong>{activeWeek} Summary:</strong> {weeklySummary.attended} / {weeklySummary.total} Classes Attended
            </div>
          )}

          <table className="glass-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeSub.history.length === 0 ? (
                <tr>
                  <td colSpan="4" className="glass-table__empty">
                    No classes conducted yet.
                  </td>
                </tr>
              ) : (
                 activeSub.history
                   .filter((rec) => {
                     if (activeWeek === "All") return true;
                     const weekNum = parseInt(activeWeek.replace("Week ", ""), 10);
                      const { start, end } = getWeekBounds(weekNum, semesterStartDate);
                     const d = new Date(rec.date);
                     return d >= start && d <= end;
                   })
                  .map((rec) => {
                    const { day } = formatTimelineDate(rec.date);
                    const cls = statusClass(rec.status);
                    const isExtra = rec.is_extra_class === true || 
                                    (rec.attendance_sessions && rec.attendance_sessions.is_extra_class === true);
                    return (
                      <tr key={rec.id}>
                        <td>{formatCleanDate(rec.date)}</td>
                        <td>{day}</td>
                        <td>
                          {getFullTimeRange(rec, ["lab", "practical"].includes(String(activeSub?.type).toLowerCase()))}
                          {isExtra && (
                            <span style={{ 
                              background: 'rgba(250, 204, 21, 0.15)', 
                              color: '#facc15', 
                              border: '1px solid rgba(250, 204, 21, 0.4)', 
                              boxShadow: '0 0 10px rgba(250, 204, 21, 0.1)',
                              fontSize: '0.7rem', 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              marginLeft: '10px', 
                              fontWeight: '600',
                              letterSpacing: '0.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span style={{ fontSize: '0.8rem' }}>✨</span> EXTRA
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge-${cls}`}>{String(rec.status).toUpperCase()}</span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

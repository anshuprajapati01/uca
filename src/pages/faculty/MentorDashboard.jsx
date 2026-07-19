import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { toast } from 'react-hot-toast';
import './MentorDashboard.css';

const ACTIVITY_TYPES = [
  'Extra Class',
  'Extra Curricular',
  'Sports',
  'Research',
  'Placement',
  'Skill Development',
  'Mentor Mentee Meeting',
  'Community Development',
  'WEC',
];

const FULL_DAY_PERIODS = 7;

const PERIOD_OPTIONS = Array.from({ length: FULL_DAY_PERIODS }, (_, i) => i + 1);

const getToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const STATUS_COLORS = {
  P: '#22c55e',
  A: '#ef4444',
};

const formatTime12h = (timeString) => {
  if (!timeString) return '';
  const [hourStr, minuteStr] = timeString.split(':');
  let hour = parseInt(hourStr, 10);
  
  if (hour >= 1 && hour <= 6) {
    hour += 12;
  }
  
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minuteStr} ${ampm}`;
};

export default function MentorDashboard() {
  const [mentorSection, setMentorSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(getToday);
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0]);
  const [isFullDay, setIsFullDay] = useState(true);
  const [durationPeriods, setDurationPeriods] = useState(FULL_DAY_PERIODS);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [presentHover, setPresentHover] = useState(false);
  const [presentPress, setPresentPress] = useState(false);
  const [absentHover, setAbsentHover] = useState(false);
  const [absentPress, setAbsentPress] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('full');
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState({});
  const [sessionLoading, setSessionLoading] = useState(false);
  const saveTimeoutRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const getStudentKey = (s) => String(s.roll_number || s.roll_no || s.id);

  useEffect(() => {
    if (activeTab === 'full' || activeTab === 'specific') {
      if (students && students.length > 0) {
        const defaultPresent = {};
        students.forEach(student => {
          defaultPresent[getStudentKey(student)] = true;
        });
        setSessionAttendance(defaultPresent);
      }
      setSaveMessage('');
    }
  }, [activeTab, students]);

  useEffect(() => {
    async function loadMentorSection() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('section_mentors')
          .select('branch, year, section')
          .eq('faculty_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setMentorSection(null);
          setStudents([]);
          return;
        }

        setMentorSection(data);

        const { data: studentsData, error: studentsError } = await supabase
          .from('user_profiles')
          .select('id, full_name, roll_number')
          .eq('selected_branch', data.branch)
          .eq('selected_year', data.year)
          .eq('section', data.section)
          .eq('role', 'student')
          .order('full_name', { ascending: true });

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
      } catch (err) {
        console.error('Failed to load mentor data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMentorSection();
  }, []);

  // Check whether attendance has ALREADY been submitted/locked for the selected
  // date + activity + specific-session. extra_attendance has no `section`
  // column, so we scope by the mentor's section student rolls. A mentor can
  // submit MULTIPLE *different* events on the same day (distinguished by
  // duration_periods and/or start_time). We therefore key the check on
  // date + activity_type + duration_periods + start_time. start_time is null
  // for a Full Day session, so Full Day events share one session.
  const getSectionRolls = () =>
    students.map((s) => s.roll_number).filter(Boolean);

  // Load the per-student statuses for the selected date + activity + specific
  // session so mentors can mark/take it.
  useEffect(() => {
    if (!date || !activityType || students.length === 0) {
      setSessionAttendance({});
      return;
    }

    const rolls = students.map((s) => getStudentKey(s)).filter(Boolean);
    if (rolls.length === 0) {
      setSessionAttendance({});
      return;
    }

    const effectiveStart = isFullDay ? null : (startTime || null);
    (async () => {
      let query = supabase
        .from('extra_attendance')
        .select('student_roll, status')
        .eq('date', date)
        .eq('activity_type', activityType)
        .eq('duration_periods', durationPeriods)
        .in('student_roll', rolls);

      query = effectiveStart == null
        ? query.is('start_time', null)
        : query.eq('start_time', effectiveStart);

      const { data } = await query;

      const map = {};
      (data || []).forEach((row) => {
        map[getStudentKey({ roll_number: row.student_roll })] = row.status;
      });
      setSessionAttendance(map);
    })();
  }, [date, activityType, durationPeriods, startTime, students]);

  useEffect(() => {
    setSaveMessage('');
  }, [date, activityType, durationPeriods, startTime, endTime, isFullDay]);

  const getYearLabel = (year) => {
    if (!year) return '';
    const n = parseInt(year, 10);
    if (Number.isNaN(n)) return String(year);
    const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' })[n] || 'th';
    return `${n}${suffix} Year`;
   };

  const handleMarkAllPresent = () => {
    const newAtt = {};
    students.forEach(s => { newAtt[getStudentKey(s)] = true; });
    setSessionAttendance(newAtt);
    setSaveMessage('');
  };

  const handleMarkAllAbsent = () => {
    const newAtt = {};
    students.forEach(s => { newAtt[getStudentKey(s)] = false; });
    setSessionAttendance(newAtt);
    setSaveMessage('');
  };

  const handleToggleAttendance = (student, status) => {
    setSessionAttendance(prev => ({
      ...prev,
      [getStudentKey(student)]: status === 'P' || status === true
    }));
    setSaveMessage('');
  };

  const formatForDB = (timeStr) => (timeStr && timeStr.length === 5) ? `${timeStr}:00` : timeStr;

  const handleLockAttendance = async () => {
    if (!date || !activityType) {
      setSaveMessage('Please select date and activity type.');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      let deleteQuery = supabase
        .from('extra_attendance')
        .delete()
        .eq('date', date)
        .eq('activity_type', activityType);

      if (isFullDay) {
        deleteQuery = deleteQuery.is('start_time', null);
      } else {
        deleteQuery = deleteQuery.eq('start_time', formatForDB(startTime));
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.error("🚨 SUPABASE DELETE ERROR:", deleteError);
        setSaveMessage(`❌ Database Error: ${deleteError.message}`);
        setIsSaving(false);
        return;
      }

      const recordsToInsert = students.map(student => {
        const roll = getStudentKey(student);
        const isPresent = sessionAttendance[roll] === true;

        return {
          date: date,
          student_roll: roll,
          activity_type: String(activityType),
          is_full_day: Boolean(isFullDay),
          start_time: isFullDay ? null : formatForDB(startTime),
          end_time: isFullDay ? null : formatForDB(endTime),
          duration_periods: isFullDay ? 7 : (Number(durationPeriods) || 1),
          status: isPresent
        };
      });

      console.log("🚨 PAYLOAD GOING TO DB:", recordsToInsert);

      const { error } = await supabase.from('extra_attendance').insert(recordsToInsert);

      if (error) {
        console.error("🚨 SUPABASE INSERT ERROR:", error);
        setSaveMessage(`❌ Database Error: ${error.message}`);
        setIsSaving(false);
        return;
      }

      console.log("✅ SUCCESSFULLY INSERTED:", recordsToInsert.length, "records");
      setSaveMessage('✅ Successfully locked attendance');
      
      if (students && students.length > 0) {
        const defaultPresent = {};
        students.forEach(student => {
          defaultPresent[getStudentKey(student)] = true;
        });
        setSessionAttendance(defaultPresent);
      }
      
      await fetchHistory();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('🚨 LOCK ATTENDANCE CRITICAL ERROR:', err);
      setSaveMessage('❌ Critical Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSession = async (item) => {
    if (!item || students.length === 0) return;
    setIsDeleting(true);
    setSaveMessage('');
    try {
      const rolls = getSectionRolls();
      let query = supabase
        .from('extra_attendance')
        .delete()
        .eq('date', item.date)
        .eq('activity_type', item.activity_type)
        .in('student_roll', rolls);

      if (item.start_time) {
        query = query.eq('start_time', item.start_time);
      } else {
        query = query.is('start_time', null);
      }

      const { error } = await query;

      if (error) throw error;

      toast.success('Attendance deleted successfully!');
      if (expandedSessionId === getSessionId(item)) {
        setExpandedSessionId(null);
        setSessionAttendance({});
      }
      await fetchHistory();
    } catch (err) {
      console.error('Delete error:', err);
      setSaveMessage('Failed to delete attendance: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchSessionAttendance = async (item) => {
    if (!item || students.length === 0) {
      setSessionAttendance({});
      return;
    }
    setSessionLoading(true);
    try {
      const rolls = getSectionRolls();
      const effectiveStart = item.is_full_day ? null : (item.start_time || null);
      let query = supabase
        .from('extra_attendance')
        .select('student_roll, status')
        .eq('date', item.date)
        .eq('activity_type', item.activity_type)
        .eq('duration_periods', item.duration_periods)
        .in('student_roll', rolls);

      query = effectiveStart == null
        ? query.is('start_time', null)
        : query.eq('start_time', effectiveStart);

      const { data } = await query;

      const attMap = {};
      (data || []).forEach((row) => {
        attMap[String(row.student_roll)] = row.status;
      });
      setSessionAttendance(attMap);
    } catch (err) {
      console.error('Failed to fetch session attendance:', err);
      setSessionAttendance({});
    } finally {
      setSessionLoading(false);
    }
  };

  const toggleSessionExpand = (item) => {
    const sessionId = `${item.date}__${item.activity_type}__${item.start_time ?? ''}__${item.duration_periods}`;
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setSessionAttendance({});
    } else {
      setExpandedSessionId(sessionId);
      setSessionAttendance({});
      fetchSessionAttendance(item);
    }
  };

  // Recent "Extra Attendance" history for the mentor's section. Groups the raw
  // rows into unique sessions by (date, activity_type, start_time,
  // duration_periods) and orders them by date descending, so mentors can see —
  // and jump back into — everything they've already uploaded.
  const fetchHistory = async () => {
    const rolls = getSectionRolls();
    if (rolls.length === 0) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('extra_attendance')
        .select('date, activity_type, is_full_day, start_time, end_time, duration_periods')
        .in('student_roll', rolls);

      if (error) throw error;

      const rows = data || [];
      const seen = new Map();
      rows.forEach((r) => {
        const key = [r.date, r.activity_type, r.start_time ?? '', r.duration_periods].join('__');
        if (!seen.has(key)) {
          seen.set(key, {
            date: r.date,
            activity_type: r.activity_type,
            is_full_day: r.is_full_day,
            start_time: r.start_time,
            end_time: r.end_time,
            duration_periods: r.duration_periods,
          });
        }
      });

      const list = [...seen.values()].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setHistory(list);
    } catch (err) {
      console.error('Failed to fetch extra attendance history:', err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const sectionLabel = mentorSection
    ? `${getYearLabel(mentorSection.year)} - ${mentorSection.branch} - Section ${mentorSection.section}`
    : '';

  const getSessionId = (item) =>
    `${item.date}__${item.activity_type}__${item.start_time ?? ''}__${item.duration_periods}`;

  if (isLoading) {
    return (
      <div className="mentor-dashboard">
        <div className="mentor-card">
          <p className="mentor-loading">Loading mentor data…</p>
        </div>
      </div>
    );
  }

  if (!mentorSection) {
    return (
      <div className="mentor-dashboard">
        <div className="mentor-card">
          <h3 className="mentor-card__title">⭐ Mentor Dashboard</h3>
          <p className="mentor-empty">You are not assigned as a mentor for any section yet.</p>
        </div>
      </div>
    );
  }

  const isEntryMode = activeTab === 'full' || activeTab === 'specific';
  const isHistoryMode = activeTab === 'history-full' || activeTab === 'history-specific';
  const historyFilterFn = activeTab === 'history-full'
    ? (item) => item.is_full_day || item.start_time == null
    : (item) => !item.is_full_day && item.start_time != null;
  const filteredHistory = history.filter(historyFilterFn);

  return (
    <div className="mentor-dashboard">
      <div className="mentor-card">
        <div className="mentor-header">
          <div>
            <h3 className="mentor-card__title">⭐ Mentor Dashboard</h3>
            <p className="mentor-card__subtitle">Mentoring: {sectionLabel}</p>
          </div>
        </div>

        <div className="mentor-duration">
          <label className="mentor-label">Mode</label>
          <div className="mentor-duration__toggle">
            <button
              type="button"
              className={`mentor-duration__option ${activeTab === 'full' ? 'mentor-duration__option--active' : ''}`}
              onClick={() => { setActiveTab('full'); setIsFullDay(true); }}
            >
              Full Day
            </button>
            <button
              type="button"
              className={`mentor-duration__option ${activeTab === 'specific' ? 'mentor-duration__option--active' : ''}`}
              onClick={() => { setActiveTab('specific'); setIsFullDay(false); }}
            >
              Specific Periods
            </button>
            <button
              type="button"
              className={`mentor-duration__option ${activeTab === 'history-full' ? 'mentor-duration__option--active' : ''}`}
              onClick={() => setActiveTab('history-full')}
            >
              Full Day History
            </button>
            <button
              type="button"
              className={`mentor-duration__option ${activeTab === 'history-specific' ? 'mentor-duration__option--active' : ''}`}
              onClick={() => setActiveTab('history-specific')}
            >
              Specific Periods History
            </button>
          </div>
        </div>

        {isEntryMode ? (
          <>
            <div className="mentor-controls">
              <div className="mentor-control">
                <label className="mentor-label" htmlFor="mentor-date">Date</label>
                <input
                  id="mentor-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mentor-input"
                />
              </div>
              <div className="mentor-control">
                <label className="mentor-label" htmlFor="mentor-activity">Activity Type</label>
                <select
                  id="mentor-activity"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="mentor-select"
                >
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {!isFullDay && (
              <div className="mentor-duration__fields">
                <div className="mentor-control">
                  <label className="mentor-label" htmlFor="mentor-periods">Number of Periods</label>
                  <select
                    id="mentor-periods"
                    value={durationPeriods}
                    onChange={(e) => setDurationPeriods(Number(e.target.value))}
                    className="mentor-select"
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="mentor-control">
                  <label className="mentor-label" htmlFor="mentor-start">Start Time</label>
                  <input
                    id="mentor-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mentor-input"
                  />
                </div>
                <div className="mentor-control">
                  <label className="mentor-label" htmlFor="mentor-end">End Time</label>
                  <input
                    id="mentor-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mentor-input"
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginTop: '1rem' }}>
              <button
                onClick={handleMarkAllPresent}
                onMouseEnter={() => setPresentHover(true)}
                onMouseLeave={() => { setPresentHover(false); setPresentPress(false); }}
                onMouseDown={() => setPresentPress(true)}
                onMouseUp={() => setPresentPress(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: presentPress ? 'rgba(34, 197, 94, 0.35)' : presentHover ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                  border: `1px solid ${presentPress ? 'rgba(34, 197, 94, 0.8)' : presentHover ? 'rgba(34, 197, 94, 0.6)' : 'rgba(34, 197, 94, 0.3)'}`,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  boxShadow: presentHover ? '0 4px 15px rgba(34, 197, 94, 0.3)' : 'none',
                  transform: presentPress ? 'scale(0.96)' : 'scale(1)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Mark All Present
              </button>
              <button
                onClick={handleMarkAllAbsent}
                onMouseEnter={() => setAbsentHover(true)}
                onMouseLeave={() => { setAbsentHover(false); setAbsentPress(false); }}
                onMouseDown={() => setAbsentPress(true)}
                onMouseUp={() => setAbsentPress(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: absentPress ? 'rgba(239, 68, 68, 0.35)' : absentHover ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: `1px solid ${absentPress ? 'rgba(239, 68, 68, 0.8)' : absentHover ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.3)'}`,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  boxShadow: absentHover ? '0 4px 15px rgba(239, 68, 68, 0.3)' : 'none',
                  transform: absentPress ? 'scale(0.96)' : 'scale(1)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Mark All Absent
              </button>
            </div>

            <div style={{ backgroundColor: '#1c1d2e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: '1rem' }}>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {students.length === 0 ? (
                  <div className="mentor-empty">No students found in this section.</div>
                ) : (
                  students.map((student) => {
                    const rollStr = getStudentKey(student);
                    const isPresent = sessionAttendance[rollStr] === true;
                    const status = isPresent ? 'P' : 'A';

                    return (
                      <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.875rem', flexShrink: 0 }}>
                            {(student.full_name || student.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: '#f8fafc', fontWeight: '500', fontSize: '0.95rem' }}>{student.full_name || 'Unknown'}</div>
                            <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Roll: {student.roll_number || 'N/A'}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {['P', 'A'].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleToggleAttendance(student, s)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '9999px',
                                backgroundColor: status === s ? STATUS_COLORS[s] : 'rgba(255,255,255,0.05)',
                                color: status === s ? '#fff' : '#9ca3af',
                                border: status === s ? `1px solid ${STATUS_COLORS[s]}` : '1px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
                {saveMessage && (
                  <div className={`mentor-message ${saveMessage.includes('Failed') || saveMessage.includes('No attendance') ? 'mentor-message--error' : 'mentor-message--success'}`}>
                    {saveMessage}
                  </div>
                )}
                <button
                  onClick={handleLockAttendance}
                  disabled={isSaving}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  {isSaving ? 'Locking...' : 'Lock Attendance'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {historyLoading ? (
              <div className="mentor-loading">Loading history…</div>
            ) : filteredHistory.length === 0 ? (
              <div className="mentor-empty">No extra attendance submitted yet for this mode.</div>
            ) : (
              filteredHistory.map((item) => {
                const sessionId = getSessionId(item);
                const isExpanded = expandedSessionId === sessionId;
                const fullDayLabel = item.is_full_day || item.start_time == null ? 'Full Day' : `${item.duration_periods} Period${item.duration_periods === 1 ? '' : 's'}`;
                const timeLabel = item.is_full_day || item.start_time == null ? '' : [formatTime12h(item.start_time), formatTime12h(item.end_time)].filter(Boolean).join(' – ');
                const statusText = timeLabel ? `${fullDayLabel} • ${timeLabel}` : fullDayLabel;

                return (
                  <div key={sessionId} style={{ backgroundColor: '#1c1d2e', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px' }}>
                    <p style={{ color: '#fbbf24', fontSize: '0.95rem', fontWeight: '700', margin: '0 0 6px 0' }}>
                      ✅ Submitted Sessions for this Day
                    </p>
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '14px' }}>
                      Date: {item.date}
                      <span style={{ margin: '0 8px' }}>•</span>
                      Activity: {item.activity_type}
                      <span style={{ margin: '0 8px' }}>•</span>
                      {statusText}
                    </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => { setSessionToDelete(item); setShowDeleteModal(true); }}
                          disabled={isDeleting}
                          style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.18)',
                          color: '#fca5a5',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          opacity: isDeleting ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        🗑️ Delete
                      </button>
                      <button
                        onClick={() => toggleSessionExpand(item)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          background: 'rgba(99, 102, 241, 0.18)',
                          color: '#c7d2fe',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isExpanded ? '🙈 Hide Student' : '👁️ View Student'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ backgroundColor: '#1c1d2e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: '12px' }}>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          {students.length === 0 ? (
                            <div className="mentor-empty">No students found in this section.</div>
                          ) : sessionLoading ? (
                            <div className="mentor-loading">Loading...</div>
                           ) : (
                               students.map((student) => {
                                 const rollStr = getStudentKey(student);
                                 const isPresent = sessionAttendance[rollStr] === true;
                                 const status = isPresent ? 'P' : 'A';
                              return (
                                <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.875rem', flexShrink: 0 }}>
                                      {(student.full_name || student.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ color: '#f8fafc', fontWeight: '500', fontSize: '0.95rem' }}>{student.full_name || 'Unknown'}</div>
                                      <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Roll: {student.roll_number || 'N/A'}</div>
                                    </div>
                                  </div>
                                   <div style={{ display: 'flex', gap: '8px' }}>
                                     {['P', 'A'].map((s) => (
                                       <span
                                         key={s}
                                         style={{
                                           padding: '6px 12px',
                                           borderRadius: '9999px',
                                           backgroundColor: status === s ? STATUS_COLORS[s] : 'rgba(255,255,255,0.05)',
                                           color: status === s ? '#fff' : '#9ca3af',
                                           border: status === s ? `1px solid ${STATUS_COLORS[s]}` : '1px solid transparent',
                                           cursor: 'not-allowed',
                                           fontSize: '0.75rem',
                                           fontWeight: '600',
                                           opacity: 0.75,
                                           transition: 'all 0.2s'
                                         }}
                                       >
                                         {s}
                                       </span>
                                     ))}
                                   </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#1c1d2e',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ color: '#f8fafc', margin: '0 0 12px 0', fontSize: '1.1rem' }}>Confirm Delete</h3>
            <p style={{ color: '#cbd5e1', margin: '0 0 20px 0', fontSize: '0.9rem' }}>Are you sure you want to delete this session? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowDeleteModal(false); setSessionToDelete(null); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteModal(false);
                  if (sessionToDelete) {
                    await deleteSession(sessionToDelete);
                    setSessionToDelete(null);
                  }
                }}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

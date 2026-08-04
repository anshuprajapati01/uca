import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.js';
import toast from 'react-hot-toast';

function formatTime(timeString) {
  if (!timeString) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const calculateDynamicEndTime = (startTimeStr, isLab) => {
  if (!startTimeStr) return 'N/A';
  try {
    const match = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return startTimeStr;

    let [, hours, minutes, ampm] = match;
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);

    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }

    const totalMinutes = (hours * 60) + minutes + (isLab ? 110 : 55);
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;

    const formattedHours = newHours % 12 || 12;
    const newAmPm = newHours >= 12 ? 'PM' : 'AM';
    const formattedMins = newMins.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMins} ${newAmPm}`;
  } catch {
    return startTimeStr;
  }
};

function getWeekDates(refDate) {
  const today = refDate ? new Date(refDate) : new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff);

  const dates = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getMockSlots(refDate) {
  const dates = getWeekDates(refDate);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = [
    { start: '10:05', end: '11:00' },
    { start: '11:15', end: '12:10' },
    { start: '12:10', end: '13:05' },
    { start: '13:45', end: '14:40' },
  ];

  const slots = [];
  dayNames.forEach((day, index) => {
    const time = times[index % times.length];
    slots.push({
      day_of_week: day,
      date: dates[index].toISOString().split('T')[0],
      start_time: time.start,
      end_time: time.end,
    });
  });
  return slots;
}

export default function TakeAttendance({ subjectId, subjectDetails, initialSection }) {
  void subjectId;

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_NAME_MAP = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
  const DAY_OFFSET_MAP = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };

  const [weeklySlots, setWeeklySlots] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [activeDay, setActiveDay] = useState('Mon');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [weeklyCompletedSessions, setWeeklyCompletedSessions] = useState([]);
  const [allLockedSessions, setAllLockedSessions] = useState([]);
  const [semesterStartDate, setSemesterStartDate] = useState(null);

  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [entryMode, setEntryMode] = useState('manual');
  const [isExtraMode, setIsExtraMode] = useState(false);
  const [extraStartTime, setExtraStartTime] = useState('');
  const [extraEndTime, setExtraEndTime] = useState('');
  const [completedSessions, setCompletedSessions] = useState([]);
  const [sectionFilter, setSectionFilter] = useState(initialSection || 'All');
  const { user } = useAuth();
  const [presentHover, setPresentHover] = useState(false);
  const [presentPress, setPresentPress] = useState(false);
  const [absentHover, setAbsentHover] = useState(false);
  const [absentPress, setAbsentPress] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  useEffect(() => {
    const fetchSemesterConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('semester_start_date')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
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
      }
    };

    fetchSemesterConfig();
  }, []);

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoadingSchedule(true);
      try {
        const { data, error } = await supabase
          .from('timetable_slots')
          .select('day_of_week, start_time, end_time')
          .eq('subject_id', subjectId)
          .order('start_time', { ascending: true });

        if (!error && data) {
          const dates = getWeekDates(referenceDate);
          const dayToDate = {
            Monday: dates[0].toISOString().split('T')[0],
            Tuesday: dates[1].toISOString().split('T')[0],
            Wednesday: dates[2].toISOString().split('T')[0],
            Thursday: dates[3].toISOString().split('T')[0],
            Friday: dates[4].toISOString().split('T')[0],
            Saturday: dates[5].toISOString().split('T')[0],
          };

          const enriched = data.map((slot, index) => {
            const dayDate = dayToDate[slot.day_of_week] || dates[index % 6].toISOString().split('T')[0];
            return {
              ...slot,
              date: dayDate,
              exactDate: dayDate,
              dayName: slot.day_of_week,
            };
          });

          if (enriched.length > 0) {
            setWeeklySlots(enriched);
          } else {
            const mock = getMockSlots(referenceDate);
            setWeeklySlots(mock);
          }
        } else {
          const mock = getMockSlots(referenceDate);
          setWeeklySlots(mock);
        }
      } catch (err) {
        console.error('Failed to fetch schedule:', err);
        const mock = getMockSlots(referenceDate);
        setWeeklySlots(mock);
      } finally {
        setIsLoadingSchedule(false);
      }
    };
    fetchSchedule();
  }, [subjectId, referenceDate]);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        let query = supabase
          .from('user_profiles')
          .select('id, full_name, roll_number, email, section')
          .eq('role', 'student');

        if (subjectDetails?.department && subjectDetails?.year !== undefined) {
          query = query
            .eq('selected_branch', subjectDetails.department)
            .eq('selected_year', subjectDetails.year);
        }

        const { data, error } = await query;
        if (!error && data) {
          setStudents(data);
          setSectionFilter(initialSection || 'All');
          const initialAttendance = {};
          data.forEach(student => {
            initialAttendance[student.id] = 'P';
          });
          setAttendanceState(initialAttendance);
        }
      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setIsLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [subjectDetails, initialSection]);

  useEffect(() => {
    const fetchWeeklySessions = async () => {
      setWeeklyCompletedSessions([]);
      const weekDates = getWeekDates(referenceDate);
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[5].toISOString().split('T')[0];

      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('id, date, start_time, end_time, is_extra_class')
          .eq('subject_id', subjectId)
          .gte('date', startDate)
          .lte('date', endDate);

        if (!error && data) {
          setWeeklyCompletedSessions(data);
        } else {
          setWeeklyCompletedSessions([]);
        }
      } catch (err) {
        console.error('Failed to fetch weekly sessions:', err);
        setWeeklyCompletedSessions([]);
      }
    };

    fetchWeeklySessions();
  }, [subjectId, referenceDate]);

  useEffect(() => {
    const fetchAllLockedSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('id, date, is_extra_class, status')
          .eq('subject_id', subjectId)
          .eq('status', 'Locked');

        if (!error && data) {
          setAllLockedSessions(data);
        } else {
          setAllLockedSessions([]);
        }
      } catch (err) {
        console.error('Failed to fetch locked sessions:', err);
        setAllLockedSessions([]);
      }
    };

    fetchAllLockedSessions();
  }, [subjectId]);

  const MAX_WEEKS = 16;

  // 2. SAFE DERIVED STATE (Before useEffects, guarded by semesterStartDate)
  let targetDateObj = null;
  let formattedDateDB = null;
  let availableWeeks = [];
  let activeWeek = 1;

  if (semesterStartDate) {
    // FIND THE ANCHOR MONDAY of the week containing semesterStartDate
    const anchorMonday = new Date(semesterStartDate);
    const dayOfWeek = anchorMonday.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    anchorMonday.setDate(anchorMonday.getDate() + diffToMonday);
    anchorMonday.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffInTime = now.getTime() - anchorMonday.getTime();
    const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));
    const currentWeekNum = Math.min(Math.max(1, Math.floor(diffInDays / 7) + 1), MAX_WEEKS);
    availableWeeks = Array.from({ length: currentWeekNum }, (_, i) => {
      const weekDate = new Date(anchorMonday);
      weekDate.setDate(anchorMonday.getDate() + i * 7);
      return { weekNum: i + 1, label: `Week ${i + 1}`, date: weekDate };
    });

    const dayOffsetMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5 };
    const dayOffset = dayOffsetMap[activeDay] || 0;

    const refDiffInDays = Math.floor((referenceDate.getTime() - anchorMonday.getTime()) / (1000 * 60 * 60 * 24));
    activeWeek = Math.max(1, Math.floor(refDiffInDays / 7) + 1);

    // Calculate exact target date from the ANCHOR MONDAY, not semesterStartDate
    targetDateObj = new Date(anchorMonday);
    targetDateObj.setDate(anchorMonday.getDate() + ((activeWeek - 1) * 7) + dayOffset);

    formattedDateDB = targetDateObj.toLocaleDateString('en-CA');
  }

  const activeSlot = weeklySlots.find(slot => slot.day_of_week === DAY_NAME_MAP[activeDay]) || null;

  // 3. ALL USEEFFECT HOOKS HERE (above early return)
  useEffect(() => {
    if (!formattedDateDB) return;

    const fetchCompletedSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('id, start_time, end_time, is_extra_class')
          .eq('subject_id', subjectId)
          .eq('date', formattedDateDB)
          .order('start_time', { ascending: true });

        if (!error && data) {
          setCompletedSessions(data);
        } else {
          setCompletedSessions([]);
        }
      } catch (err) {
        console.error('Failed to fetch completed sessions:', err);
        setCompletedSessions([]);
      }
    };
    fetchCompletedSessions();
  }, [subjectId, formattedDateDB]);

  // Derive the submitted session that matches the currently selected day/time.
  const selectedSubmittedSession = (() => {
    if (!formattedDateDB || !activeSlot || isExtraMode) return null;
    if (!completedSessions || completedSessions.length === 0) return null;
    return completedSessions.find(
      s => s.start_time === (activeSlot?.start_time || '')
    ) || completedSessions[0];
  })();

  // Hydrate the UI with the ACTUAL saved records when a submitted session is selected.
  useEffect(() => {
    if (!selectedSubmittedSession) return;
    if (students.length === 0) return;

    const sessionId = selectedSubmittedSession.id;
    const hydrateFromSession = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .eq('session_id', sessionId);

        const newAttendanceState = {};
        students.forEach(s => {
          newAttendanceState[s.id] = 'P';
        });

        if (!error && data && data.length > 0) {
          data.forEach(record => {
            const studentId = record.student_id || record.student || record.roll_number;
            if (studentId == null) return;

            const isPresent = record.status === true ||
              record.status === 'P' ||
              record.status === 'Present' ||
              record.status === 'PRESENT';
            newAttendanceState[studentId] = isPresent ? 'P' : 'A';
          });
        }

        setAttendanceState(newAttendanceState);
      } catch (err) {
        console.error('Failed to hydrate attendance records:', err);
      }
    };
    hydrateFromSession();
  }, [selectedSubmittedSession, students]);

  // 4. EARLY RETURN (strictly after ALL hooks)
  if (!semesterStartDate) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', color: '#fff' }}>
        Loading Academic Calendar...
      </div>
    );
  }

  const formattedDateUI = targetDateObj.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const calculatedExactDate = formattedDateDB;

  const anchorMonday = new Date(semesterStartDate);
  const anchorDayOfWeek = anchorMonday.getDay();
  const anchorDiffToMonday = anchorDayOfWeek === 0 ? -6 : 1 - anchorDayOfWeek;
  anchorMonday.setDate(anchorMonday.getDate() + anchorDiffToMonday);
  anchorMonday.setHours(0, 0, 0, 0);

  const isWeekCompleted = (weekNum) => {
    // 1. ABSOLUTELY NO MOCK LOGIC for past weeks.
    if (!allLockedSessions || allLockedSessions.length === 0) return false;

    // 2. Calculate precise boundaries for this specific week
    const weekStart = new Date(anchorMonday);
    weekStart.setDate(anchorMonday.getDate() + (weekNum - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // 3. Filter sessions strictly belonging to this week
    const sessionsThisWeek = allLockedSessions.filter(session => {
      if (!session.date) return false;
      const sDate = new Date(session.date);
      return sDate >= weekStart && sDate <= weekEnd;
    });

    // 4. STRICT GUARD: If 0 sessions are found, it CANNOT be complete
    if (sessionsThisWeek.length === 0) return false;

    // 5. Evaluate completion (at least 1 locked session in the week)
    const expectedSlots = 1;
    return sessionsThisWeek.length >= expectedSlots;
  };

  const isLockedView = !!selectedSubmittedSession && !isExtraMode;

  const subjectName = (subjectDetails?.subject_name || subjectDetails?.name || subjectDetails?.title || '').toLowerCase();
  const subjectType = (subjectDetails?.type || '').toLowerCase();

  const isLabActive = subjectType === 'practical' ||
                      subjectType === 'lab' ||
                      subjectName.includes('lab') ||
                      subjectName.includes('practical');

  const sessionStartTime = activeSlot?.start_time || '';
  const computedEndTime = sessionStartTime
    ? calculateDynamicEndTime(sessionStartTime, isLabActive)
    : '';

  const filteredStudents = students.filter(student => {
    if (sectionFilter === 'All') return true;

    const sectionValue = student.section || student.section_name || student.batch || student.class_section || '';
    return sectionValue.toString().toUpperCase() === sectionFilter.toUpperCase();
  });

  // Create a sorted copy of the students array
  const displayedStudents = [...filteredStudents].sort((a, b) => {
    // Safely extract the roll number, handling potential nulls or different key names
    const rollA = String(a.roll_number || a.roll_no || a.id || '').trim();
    const rollB = String(b.roll_number || b.roll_no || b.id || '').trim();

    // Use localeCompare with numeric: true so it handles large numeric strings perfectly
    return rollA.localeCompare(rollB, undefined, { numeric: true });
  });

  const statusColors = {
    P: '#22c55e',
    A: '#ef4444'
  };

  const selectedDateWithDay = formattedDateUI;

  const markAll = (status) => {
    const updated = {};
    displayedStudents.forEach(student => {
      updated[student.id] = status;
    });
    setAttendanceState(prev => ({ ...prev, ...updated }));
  };

  const resetAttendanceToDefault = () => {
    if (students.length === 0) return;
    const fresh = {};
    students.forEach(student => {
      fresh[student.id] = 'P';
    });
    setAttendanceState(fresh);
  };

  const setStatus = (studentId, status) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const newAttendance = {};
      students.forEach(student => {
        newAttendance[student.id] = 'P';
      });
      lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const [rollNumber, status] = line.split(',').map(s => s.trim());
        if (!rollNumber || !status) return;
        const student = students.find(s => s.roll_number === rollNumber);
        if (student) {
          const mapped = status.toUpperCase() === 'A' ? 'A' : 'P';
          newAttendance[student.id] = mapped;
        }
      });
      setAttendanceState(newAttendance);
      toast.success('CSV Parsed Successfully!');
      setEntryMode('manual');
    };
    reader.readAsText(file);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    const sessionIdToDelete = sessionToDelete;
    try {
      const { error: recordErr } = await supabase
        .from('attendance_records')
        .delete()
        .eq('session_id', sessionIdToDelete);

      if (recordErr) {
        alert("Database Error (Records): " + recordErr.message);
        console.error(recordErr);
        return;
      }

      const { error: sessionErr } = await supabase
        .from('attendance_sessions')
        .delete()
        .eq('id', sessionIdToDelete);

      if (sessionErr) {
        alert("Database Error (Session): " + sessionErr.message);
        console.error(sessionErr);
        return;
      }

      setCompletedSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
      setWeeklyCompletedSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));

      // FORCE update the global state driving the ticks:
      if (typeof setAllLockedSessions === 'function') {
        setAllLockedSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
      }

      // Reset local UI: revert to fresh default 'P's so the faculty can re-take attendance.
      const resetAttendance = {};
      students.forEach(student => {
        resetAttendance[student.id] = 'P';
      });
      setAttendanceState(resetAttendance);

    } catch (err) {
      console.error("Delete exception:", err);
      alert("An unexpected error occurred during deletion.");
    } finally {
      setDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleLockAttendance = async () => {
    const sessionDate = calculatedExactDate;
    const startTime = isExtraMode ? extraStartTime : (activeSlot?.start_time || '');
    const endTime = isExtraMode ? extraEndTime : computedEndTime;

    if (!sessionDate || !startTime || !endTime) {
      toast.error('Please fill in date, start time, and end time.');
      return;
    }

    setIsLocking(true);
    try {
      const { data: existing, error: dupError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('date', sessionDate)
        .eq('start_time', startTime)
        .maybeSingle();

      if (dupError) throw dupError;
      if (existing) {
        toast.error('An attendance session with this exact date and start time already exists.');
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .insert([{
          subject_id: subjectId,
          faculty_id: user.id,
          date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          status: 'Locked',
          is_extra_class: isExtraMode
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      const records = displayedStudents.map(student => ({
        session_id: sessionData.id,
        student_id: student.id,
        status: attendanceState[student.id] || 'P'
      }));

      const { error: recordsError } = await supabase
        .from('attendance_records')
        .insert(records);

      if (recordsError) throw recordsError;

      toast.success('Attendance Locked Successfully!');
      setEntryMode('manual');
      setIsExtraMode(false);
      setExtraStartTime('');
      setExtraEndTime('');
      const newSessionData = {
        id: sessionData.id,
        date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        is_extra_class: isExtraMode
      };
      setCompletedSessions(prev => [...prev, newSessionData]);
      setWeeklyCompletedSessions(prev => [...prev, newSessionData]);
      setAllLockedSessions(prev => [...prev, { id: sessionData.id, date: sessionDate, is_extra_class: isExtraMode, status: 'Locked' }]);
      const currentIndex = DAYS.indexOf(activeDay);
      if (currentIndex < 5) {
        const nextDay = DAYS[currentIndex + 1];
        setActiveDay(nextDay);
        // Imperatively force a clean slate for the new day, bypassing any
        // useEffect race with hydration. Clearing completedSessions prevents the
        // derived selectedSubmittedSession (and thus hydration) from re-firing
        // with the previously locked session's data.
        setCompletedSessions([]);
        resetAttendanceToDefault();
      }
    } catch (err) {
      console.error('Lock attendance failed:', err);
      toast.error('Failed to lock attendance. Please try again.');
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ color: '#f8fafc', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
        Take Attendance
      </h2>
      <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 8px 0' }}>
        Select a day to view and mark attendance for the scheduled session.
      </p>

      {availableWeeks.length > 0 && (
        <div>
          <style>{`.week-scroll::-webkit-scrollbar { display: none; }`}</style>
          <div
            className="week-scroll"
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              marginBottom: '8px',
            }}
          >
             {availableWeeks.map((week) => {
              const weekStart = new Date(week.date);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              const ref = new Date(referenceDate);
              ref.setHours(0, 0, 0, 0);
              const refStr = referenceDate.toISOString().split('T')[0];
              const weekStr = new Date(week.date).toISOString().split('T')[0];
              const isActive = refStr === weekStr || (ref >= weekStart && ref <= weekEnd);

              return (
                <button
                  key={week.label}
                  onClick={() => setReferenceDate(new Date(week.date))}
                  style={{
                    flex: '0 0 auto',
                    padding: '6px 16px',
                    borderRadius: '999px',
                    border: isActive ? '1px solid #4f46e5' : '1px solid rgba(255, 255, 255, 0.22)',
                    background: isActive ? '#4f46e5' : 'transparent',
                    color: isActive ? '#fff' : '#cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.22s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 0 10px rgba(79, 70, 229, 0.3)' : 'none',
                    backdropFilter: isActive ? 'none' : 'blur(12px)',
                    WebkitBackdropFilter: isActive ? 'none' : 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(79, 70, 229, 0.14)';
                      e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.55)';
                      e.currentTarget.style.color = '#e9d5ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
                      e.currentTarget.style.color = '#cbd5e1';
                    }
                  }}
                >
                  {week.label}
                  {isWeekCompleted(week.weekNum) && (
                    <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>✅</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {DAYS.map((day) => {
          const dayOffset = (DAY_OFFSET_MAP[day] || 0);
          const dayTargetDateObj = new Date(anchorMonday);
          dayTargetDateObj.setDate(anchorMonday.getDate() + ((activeWeek - 1) * 7) + dayOffset);
          const dayDate = dayTargetDateObj.toLocaleDateString('en-CA');
          const hasSession = weeklyCompletedSessions.some(s => s.date === dayDate);

          return (
            <button
              key={day}
                onClick={() => { setActiveDay(day); setIsExtraMode(false); setExtraStartTime(''); setExtraEndTime(''); resetAttendanceToDefault(); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: activeDay === day ? '#4f46e5' : 'rgba(255,255,255,0.02)',
                color: activeDay === day ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: '0.3s',
                boxShadow: activeDay === day ? '0 0 10px rgba(79, 70, 229, 0.3)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {day}
              {hasSession && <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>✅</span>}
            </button>
          );
        })}
      </div>
      {completedSessions.length > 0 && (
        <div style={{ backgroundColor: '#1c1d2e', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#fbbf24', fontSize: '0.875rem', fontWeight: '600', margin: '0 0 4px 0' }}>✅ Submitted Sessions for this Day</p>
          <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '12px' }}>Date: {formatDate(calculatedExactDate)}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {completedSessions.map((session, idx) => (
              <div key={session.id || idx} style={{ padding: '6px 12px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✅ {formatTime(session.start_time)} - {formatTime(session.end_time)}
                {session.is_extra_class === true && (
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
                <button
                  onClick={() => { setSessionToDelete(session.id); setDeleteModalOpen(true); }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    marginLeft: '4px'
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {isLoadingSchedule ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '48px' }}>Loading weekly schedule...</div>
      ) : (activeSlot || isExtraMode) ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {isExtraMode ? (
              <button
                onClick={() => { setIsExtraMode(false); setExtraStartTime(''); setExtraEndTime(''); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  transition: '0.3s',
                }}
              >
                ❌ Cancel Extra Class
              </button>
            ) : (
              <button
                onClick={() => setIsExtraMode(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  transition: '0.3s',
                }}
              >
                ➕ Extra Class
              </button>
            )}
          </div>
          <div style={{ backgroundColor: '#1c1d2e', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: isExtraMode ? '#fbbf24' : '#f8fafc', fontSize: '1.125rem', fontWeight: '600', margin: '0 0 20px 0' }}>
              {isExtraMode ? 'Extra Class Details' : 'Session Details'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '6px' }}>
                  Date
                </label>
                <p className="glass-text" style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', color: '#f8fafc', fontSize: '0.95rem' }}>
                  {selectedDateWithDay}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '6px' }}>
                  Start Time
                </label>
                {isExtraMode ? (
                  <input
                    type="time"
                    value={extraStartTime}
                    onChange={(e) => setExtraStartTime(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', color: '#f8fafc', fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                  />
                ) : (
                  <p className="glass-text" style={{ padding: '10px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', textAlign: 'center', color: '#a5b4fc', fontSize: '0.95rem', fontWeight: '600' }}>
                    {formatTime(activeSlot?.start_time)}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '6px' }}>
                  End Time
                </label>
                {isExtraMode ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="time"
                      value={extraEndTime}
                      onChange={(e) => setExtraEndTime(e.target.value)}
                      className="glass-input"
                      style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', color: '#f8fafc', fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                    />
                  </div>
                ) : (
                  <p className="glass-text" style={{ padding: '10px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', textAlign: 'center', color: '#a5b4fc', fontSize: '0.95rem', fontWeight: '600' }}>
                    {calculateDynamicEndTime(sessionStartTime, isLabActive)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', opacity: isLockedView ? 0.55 : 1 }}>
            <button
              onClick={() => setEntryMode('manual')}
              disabled={isLockedView}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: entryMode === 'manual' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                color: entryMode === 'manual' ? '#fff' : '#9ca3af',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: isLockedView ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setEntryMode('csv')}
              disabled={isLockedView}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: entryMode === 'csv' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                color: entryMode === 'csv' ? '#fff' : '#9ca3af',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: isLockedView ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              Upload CSV
            </button>
          </div>

          {entryMode === 'csv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', backgroundColor: '#151623', padding: '20px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.2)' }}>
              <input
                type="file"
                accept=".csv"
                disabled={isLockedView}
                onChange={handleCSVUpload}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#11131f',
                  border: '1px solid #2d314d',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  cursor: isLockedView ? 'not-allowed' : 'pointer',
                  opacity: isLockedView ? 0.55 : 1
                }}
              />
              <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Expected CSV columns: roll_number, status (P, A)</span>
            </div>
          )}

          {entryMode === 'manual' && (
            <>
              <div style={{ display: 'flex', gap: '16px', opacity: isLockedView ? 0.55 : 1 }}>
                <button
                  onClick={() => markAll('P')}
                  disabled={isLockedView}
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
                    cursor: isLockedView ? 'not-allowed' : 'pointer',
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
                  onClick={() => markAll('A')}
                  disabled={isLockedView}
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
                    cursor: isLockedView ? 'not-allowed' : 'pointer',
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

              {isLoadingStudents ? (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '48px' }}>Loading students...</div>
              ) : students.length === 0 ? (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '48px', backgroundColor: '#151623', borderRadius: '16px' }}>No students found for this subject.</div>
              ) : (
                <div style={{ backgroundColor: '#1c1d2e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  {isLabActive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '600' }}>Section:</span>
                      {['All', 'B1', 'B2'].map((section) => (
                        <button
                          key={section}
                          type="button"
                          onClick={() => setSectionFilter(section)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: sectionFilter === section ? '#6366f1' : 'rgba(255,255,255,0.05)',
                            color: sectionFilter === section ? '#fff' : '#9ca3af',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                        >
                          {section === 'All' ? 'All' : `Section ${section}`}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {displayedStudents.map((student) => {
                      const status = attendanceState[student.id] || 'P';
                      return (
                        <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.875rem' }}>
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
                                onClick={() => setStatus(student.id, s)}
                                disabled={isLockedView}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '9999px',
                                  backgroundColor: status === s ? statusColors[s] : 'rgba(255,255,255,0.05)',
                                  color: status === s ? '#fff' : '#9ca3af',
                                  border: status === s ? `1px solid ${statusColors[s]}` : '1px solid transparent',
                                  cursor: isLockedView ? 'not-allowed' : 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  transition: 'all 0.2s',
                                  opacity: isLockedView ? 0.55 : 1
                                }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: isLockedView ? 'stretch' : 'flex-end' }}>
                    {isLockedView && (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(250, 204, 21, 0.1)',
                        border: '1px solid rgba(250, 204, 21, 0.3)',
                        color: '#facc15',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        🔒 This session is locked. Delete the session above to re-take attendance.
                      </div>
                    )}
                    {!isLockedView && (
                      <button
                        onClick={handleLockAttendance}
                        disabled={isLocking}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '8px',
                          backgroundColor: '#6366f1',
                          color: '#fff',
                          border: 'none',
                          cursor: isLocking ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: '0.95rem',
                          opacity: isLocking ? 0.7 : 1
                        }}
                      >
                        {isLocking ? 'Locking...' : 'Lock Attendance'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <p className="glass-text" style={{ color: '#9ca3af' }}>
            No scheduled classes today.
          </p>
          <button
            onClick={() => setIsExtraMode(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              transition: '0.3s',
            }}
          >
            ➕ Extra Class
          </button>
        </div>
      )}
      {deleteModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#1c1d2e',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.15)',
            maxWidth: '360px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}>
            <p style={{ color: '#f8fafc', fontSize: '0.95rem', fontWeight: '600', margin: '0 0 16px 0' }}>Are you sure you want to delete this session?</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => { setDeleteModalOpen(false); setSessionToDelete(null); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

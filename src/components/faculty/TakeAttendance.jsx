import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.js';
import toast from 'react-hot-toast';

export default function TakeAttendance({ subjectId, subjectDetails }) {
  void subjectId;
  const today = new Date().toISOString().split('T')[0];
  
  const [sessionForm, setSessionForm] = useState({
    date: today,
    startTime: '',
    endTime: '',
    topic: '',
    lectureType: 'Theoretical'
  });

  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [entryMode, setEntryMode] = useState('manual');
  const { user } = useAuth();

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        let query = supabase
          .from('user_profiles')
          .select('id, full_name, roll_number, email')
          .eq('role', 'student');

        if (subjectDetails?.department && subjectDetails?.year !== undefined) {
          query = query
            .eq('selected_branch', subjectDetails.department)
            .eq('selected_year', subjectDetails.year);
        }

        const { data, error } = await query;
        if (!error && data) {
          setStudents(data);
          const initialAttendance = {};
          data.forEach(student => {
            initialAttendance[student.id] = 'Present';
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
  }, [subjectDetails]);

  const handleInputChange = (field, value) => {
    setSessionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(student => {
      updated[student.id] = status;
    });
    setAttendanceState(updated);
  };

  const setStatus = (studentId, status) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const statusMap = {
    P: 'Present',
    A: 'Absent',
    L: 'Late',
    OD: 'Official Duty',
    M: 'Medical'
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
        newAttendance[student.id] = 'Present';
      });

      lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const [rollNumber, status] = line.split(',').map(s => s.trim());
        if (!rollNumber || !status) return;
        
        const student = students.find(s => s.roll_number === rollNumber);
        if (student) {
          newAttendance[student.id] = statusMap[status.toUpperCase()] || 'Present';
        }
      });

      setAttendanceState(newAttendance);
      toast.success('CSV Parsed Successfully!');
      setEntryMode('manual');
    };
    reader.readAsText(file);
  };

  const handleLockAttendance = async () => {
    const { date, startTime, endTime, topic, lectureType } = sessionForm;
    if (!date || !startTime || !endTime) {
      toast.error('Please fill in date, start time, and end time.');
      return;
    }

    setIsLocking(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .insert([{
          subject_id: subjectId,
          faculty_id: user.id,
          date,
          start_time: startTime,
          end_time: endTime,
          topic_taught: topic,
          lecture_type: lectureType,
          status: 'Locked'
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      const records = students.map(student => ({
        session_id: sessionData.id,
        student_id: student.id,
        status: attendanceState[student.id] || 'Present'
      }));

      const { error: recordsError } = await supabase
        .from('attendance_records')
        .insert(records);

      if (recordsError) throw recordsError;

      toast.success('Attendance Locked Successfully!');
      setSessionForm(prev => ({
        ...prev,
        startTime: '',
        endTime: '',
        topic: ''
      }));
      const resetAttendance = {};
      students.forEach(student => {
        resetAttendance[student.id] = 'Present';
      });
      setAttendanceState(resetAttendance);
    } catch (err) {
      console.error('Lock attendance failed:', err);
      toast.error('Failed to lock attendance. Please try again.');
    } finally {
      setIsLocking(false);
    }
  };

  const statusColors = {
    Present: '#22c55e',
    Absent: '#ef4444',
    Late: '#eab308',
    'Official Duty': '#3b82f6',
    Medical: '#a855f7'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ backgroundColor: '#1c1d2e', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ color: '#f8fafc', fontSize: '1.125rem', fontWeight: '600', margin: '0 0 20px 0' }}>
          Session Details
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '6px' }}>
              Date
            </label>
            <input
              type="date"
              value={sessionForm.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#11131f',
                border: '1px solid #2d314d',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '6px' }}>
              Start Time
            </label>
            <input
              type="time"
              value={sessionForm.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#11131f',
                border: '1px solid #2d314d',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '6px' }}>
              End Time
            </label>
            <input
              type="time"
              value={sessionForm.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#11131f',
                border: '1px solid #2d314d',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '6px' }}>
              Topic Taught
            </label>
            <input
              type="text"
              placeholder="E.g. Deadlocks in OS"
              value={sessionForm.topic}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#11131f',
                border: '1px solid #2d314d',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '6px' }}>
              Lecture Type
            </label>
            <select
              value={sessionForm.lectureType}
              onChange={(e) => handleInputChange('lectureType', e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#11131f',
                border: '1px solid #2d314d',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Theoretical">Theoretical</option>
              <option value="Practical">Practical</option>
              <option value="Lab">Lab</option>
            </select>
          </div>
        </div>
       </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setEntryMode('manual')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: entryMode === 'manual' ? '#6366f1' : 'rgba(255,255,255,0.05)',
            color: entryMode === 'manual' ? '#fff' : '#9ca3af',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setEntryMode('csv')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: entryMode === 'csv' ? '#6366f1' : 'rgba(255,255,255,0.05)',
            color: entryMode === 'csv' ? '#fff' : '#9ca3af',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
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
            onChange={handleCSVUpload}
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: '#11131f',
              border: '1px solid #2d314d',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Expected CSV columns: roll_number, status (P, A, L, OD, M)</span>
        </div>
      )}

      {entryMode === 'manual' && (
        <>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => markAll('Present')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              Mark All Present
            </button>
            <button
              onClick={() => markAll('Absent')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
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
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {students.map((student) => {
                  const status = attendanceState[student.id] || 'Present';
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
                        {['Present', 'Absent', 'Late', 'Official Duty', 'Medical'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(student.id, s)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '9999px',
                              backgroundColor: status === s ? statusColors[s] : 'rgba(255,255,255,0.05)',
                              color: status === s ? '#fff' : '#9ca3af',
                              border: status === s ? `1px solid ${statusColors[s]}` : '1px solid transparent',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              transition: 'all 0.2s'
                            }}
                          >
                            {s === 'Present' ? 'P' : s === 'Absent' ? 'A' : s === 'Late' ? 'L' : s === 'Official Duty' ? 'OD' : 'M'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end' }}>
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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
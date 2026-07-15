import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import Attendance from '../student/Attendance.jsx';

// Reuses the exact same Student Portal attendance component (<Attendance />),
// but fetches the data for an arbitrary student_id instead of the logged-in user.
export default function StudentAttendanceDetail({ studentId, studentName }) {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // 1. Fetch the student's attendance records (with session + subject join).
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select(`
            *,
            attendance_sessions!inner (
              *,
              subjects ( name )
            )
          `)
          .eq('student_id', studentId)
          .order('marked_at', { ascending: false });

        if (recordsError) throw recordsError;
        const attendanceRecords = recordsData || [];

        // 2. Build subject-wise stats from the raw records (mirrors StudentDashboard).
        const subjectWiseStats = attendanceRecords.reduce((acc, record) => {
          const subjectName = record.attendance_sessions?.subjects?.name || 'Unknown';
          if (!acc[subjectName]) acc[subjectName] = { total: 0, present: 0 };
          acc[subjectName].total += 1;
          if (String(record.status).toUpperCase() === 'P') acc[subjectName].present += 1;
          return acc;
        }, {});

        const subjectWiseData = Object.entries(subjectWiseStats).map(([name, stats]) => ({
          name,
          total: stats.total,
          present: stats.present,
          percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
        }));

        // 3. Resolve the student's enrolled subjects (branch + semester) for a full pill list.
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*, batches(*)')
          .eq('id', studentId)
          .single();

        const branch =
          profileData?.selected_branch ||
          profileData?.branch ||
          profileData?.branch_id ||
          profileData?.department ||
          profileData?.batches?.department ||
          profileData?.batches?.branch ||
          null;

        const semesterNum = parseInt(
          String(profileData?.batches?.semester || profileData?.selected_semester || '').replace(/\D/g, ''),
          10
        );

        let gridSubjects = [];
        if (branch && !Number.isNaN(semesterNum)) {
          const { data: subjData } = await supabase
            .from('subjects')
            .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
            .eq('department', branch)
            .eq('semester', `Semester ${semesterNum}`);
          gridSubjects = subjData || [];
        }

        // 4. Merge enrolled subjects with attendance stats (mirrors StudentDashboard.attendanceSubjects).
        const attendanceSubjects = (gridSubjects.length > 0 ? gridSubjects : subjectWiseData).map((sub) => {
          const subName = sub.subject_name || sub.name || sub.title || '';
          const subCode = sub.subject_code || sub.code || '';
          const subType = sub.type || (String(subName).toLowerCase().includes('lab') ? 'Lab' : 'Theory');
          const match = subjectWiseData.find(
            (sw) =>
              (subName && sw.name && sw.name.toLowerCase() === subName.toLowerCase()) ||
              (subCode && sw.name && sw.name.includes(subCode))
          );
          return {
            name: subName,
            code: subCode,
            type: subType,
            present: match?.present ?? 0,
            total: match?.total ?? 0,
            percentage: match?.percentage ?? 0,
          };
        });

        if (!cancelled) {
          setRecords(attendanceRecords);
          setSubjects(attendanceSubjects);
        }
      } catch (err) {
        console.error('Failed to load student attendance detail:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return <Attendance subjects={subjects} records={records} loading={loading} studentName={studentName} />;
}

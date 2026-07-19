import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import Attendance from '../student/Attendance.jsx';

// Reuses the exact same Student Portal attendance component (<Attendance />),
// but fetches the data for an arbitrary student_id instead of the logged-in user.
export default function StudentAttendanceDetail({ studentId, studentName, globalAcademicTotal: parentGlobalAcademicTotal, branch: parentBranch, year: parentYear, enrolledSubjects }) {
  const hasEnrolledSubjects = Array.isArray(enrolledSubjects) && enrolledSubjects.length > 0;
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [records, setRecords] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [globalAcademicTotal, setGlobalAcademicTotal] = useState(parentGlobalAcademicTotal ?? null);

  useEffect(() => {
    if (parentGlobalAcademicTotal != null) {
      setGlobalAcademicTotal(parentGlobalAcademicTotal);
    }
  }, [parentGlobalAcademicTotal]);

  useEffect(() => {
    if (!studentId) return;
    let requestId = 0;

    async function load() {
      const currentRequestId = ++requestId;
      setLoading(true);
      try {
        // 1. Fetch the student's attendance records (with session + subject join).
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select(`
            *,
            attendance_sessions!inner (
              *,
              subjects ( name, code )
            )
          `)
          .eq('student_id', studentId)
          .order('marked_at', { ascending: false });

        if (recordsError) throw recordsError;
        if (currentRequestId !== requestId) return;
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
        //    When the parent has already pre-fetched the section syllabus
        //    (enrolledSubjects), skip the per-open network requests entirely.
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*, batches(*)')
          .eq('id', studentId)
          .single();

        if (currentRequestId !== requestId) return;

        let gridSubjects = [];
        if (hasEnrolledSubjects) {
          gridSubjects = enrolledSubjects;
        } else {
          const branch =
            parentBranch ||
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
          ) || (parentYear ? (['1st Year', '2nd Year', '3rd Year', '4th Year'].indexOf(parentYear) + 1) * 2 : NaN);

          if (branch && !Number.isNaN(semesterNum)) {
            const { data: subjData } = await supabase
              .from('subjects')
              .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
              .eq('department', branch)
              .eq('semester', `Semester ${semesterNum}`);
            gridSubjects = subjData || [];
          }
        }

        if (currentRequestId !== requestId) return;

        let computedGlobalAcademicTotal = null;
        if (gridSubjects.length > 0) {
          const subjectIds = gridSubjects.map(s => s.id);
          const { data: sessionsData } = await supabase
            .from('attendance_sessions')
            .select('id')
            .in('subject_id', subjectIds);
          const uniqueSessionIds = new Set((sessionsData || []).map(s => s.id));
          computedGlobalAcademicTotal = uniqueSessionIds.size;
        }

        if (currentRequestId === requestId && computedGlobalAcademicTotal != null) {
          setGlobalAcademicTotal(computedGlobalAcademicTotal);
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

        if (currentRequestId !== requestId) return;

        setRecords(attendanceRecords);
        setSubjects(attendanceSubjects);
        setStudentData(profileData);
      } catch (err) {
        console.error('Failed to load student attendance detail:', err);
      } finally {
        if (currentRequestId === requestId) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      requestId += 1;
    };
  }, [studentId, parentBranch, parentYear, enrolledSubjects, hasEnrolledSubjects]);

  const studentRoll = studentData?.roll_number || studentData?.roll_no || studentData?.id || studentId;

  return (
    <Attendance
      subjects={subjects}
      records={records}
      loading={loading}
      studentRoll={studentRoll}
      studentData={studentData}
      studentName={studentName}
      globalAcademicTotal={globalAcademicTotal}
      enrolledSubjects={hasEnrolledSubjects ? enrolledSubjects : undefined}
    />
  );
}

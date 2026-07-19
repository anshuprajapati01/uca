import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import { ArrowUpRight } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import StudentAttendanceDetail from './StudentAttendanceDetail.jsx';
import './HodDashboard.css';

// 3-tier status derived from the attendance percentage.
const getAttendanceStatus = (pct) => {
  if (pct >= 75) {
    return { label: 'Safe', bg: 'rgba(34, 197, 94, 0.2)', color: '#bbf7d0', border: 'rgba(34, 197, 94, 0.4)' };
  }
  if (pct >= 60) {
    return { label: 'Warning', bg: 'rgba(251, 191, 36, 0.2)', color: '#fde68a', border: 'rgba(251, 191, 36, 0.4)' };
  }
  return { label: 'Defaulter', bg: 'rgba(239, 68, 68, 0.2)', color: '#fecaca', border: 'rgba(239, 68, 68, 0.4)' };
};

// Advanced faculty initials generator — strips titles (incl. combinations such
// as Prof.Dr.) and punctuation, then takes the first letter of each remaining
// word. Only extreme exceptions are hardcoded.
const getFacultyInitials = (name) => {
  if (!name) return "";
  // Keep the map ONLY for extreme exceptions, otherwise use dynamic logic
  const exceptionMap = { "Mr. Salman Khan": "SK" };
  if (exceptionMap[name]) return exceptionMap[name];

  // Strip all known titles (Mr., Mrs., Ms., Dr., Prof., Er.) and combinations like Prof.Dr.
  let cleanName = name.replace(/\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Er\.)\s*/gi, '').trim();
  // Remove any remaining punctuation like periods or commas
  cleanName = cleanName.replace(/[^a-zA-Z\s]/g, '');

  return cleanName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase();
};

// Advanced subject initials generator — drops common stop-words and special
// characters, and appends " LAB" for lab subjects. Only edge cases that don't
// follow the acronym rules are hardcoded.
const getSubjectInitials = (name) => {
  if (!name) return "";
  // Keep edge cases that don't follow acronym rules
  const exceptionMap = { "Techedge": "Tech Edge", "CSEP": "CSEP" };
  if (exceptionMap[name]) return exceptionMap[name];

  // Remove common stop words and special characters
  let cleanName = name.replace(/\b(of|and|with|the|in|for)\b/gi, '').replace(/&/g, '').trim();

  // Specific fix for "Lab" -> we want the 'L' to be part of the acronym or appended
  if (cleanName.toLowerCase().includes('lab')) {
     cleanName = cleanName.replace(/\blab\b/gi, '');
     const initials = cleanName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase();
     return `${initials} LAB`;
  }

  return cleanName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase();
};

export default function HODAttendance() {
  const { hodDepartmentsData } = useHodContext();
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [extraAttendanceRecords, setExtraAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportWeek, setExportWeek] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [semesterHeading, setSemesterHeading] = useState('');
  const [isHeadingLocked, setIsHeadingLocked] = useState(false);
  const [isHeadingLoading, setIsHeadingLoading] = useState(false);
  const [sectionSubjects, setSectionSubjects] = useState([]);

  useEffect(() => {
    const fetchHeading = async () => {
      if (isExportModalOpen && filterBranch && filterBranch !== 'All') {
        setIsHeadingLoading(true);
        const { data } = await supabase
          .from('hod_export_settings')
          .select('semester_heading')
          .eq('department_code', filterBranch)
          .maybeSingle();

        if (data && data.semester_heading) {
          setSemesterHeading(data.semester_heading);
          setIsHeadingLocked(true);
        } else {
          setSemesterHeading('');
          setIsHeadingLocked(false);
        }
        setIsHeadingLoading(false);
      } else {
        setSemesterHeading('');
        setIsHeadingLocked(false);
      }
    };
    fetchHeading();
  }, [isExportModalOpen, filterBranch]);

  const handleLockHeading = async () => {
    const val = semesterHeading.trim();
    if (!val || !filterBranch || filterBranch === 'All') return;
    setIsHeadingLoading(true);

    await supabase.from('hod_export_settings').delete().eq('department_code', filterBranch);

    const { error } = await supabase.from('hod_export_settings').insert([
      { department_code: filterBranch, semester_heading: val }
    ]);

    if (!error) {
      setIsHeadingLocked(true);
    }
    setIsHeadingLoading(false);
  };

  const handleClearHeading = async () => {
    if (!filterBranch || filterBranch === 'All') return;
    setIsHeadingLoading(true);

    await supabase.from('hod_export_settings').delete().eq('department_code', filterBranch);

    setSemesterHeading('');
    setIsHeadingLocked(false);
    setIsHeadingLoading(false);
  };

  const openStudentAttendanceDetail = (studentId, studentName) => {
    setSelectedStudent({ id: studentId, name: studentName });
  };

  const closeStudentAttendanceDetail = () => {
    setSelectedStudent(null);
  };

  const hodAuthorizedBranches = useMemo(() => {
    const branchMap = {};
    hodDepartmentsData.forEach((d) => {
      const year = d.description;
      const code = d.code || d.name;
      const name = d.name || d.code;
      if (!year || !code) return;
      if (!branchMap[year]) branchMap[year] = [];
      if (AGGREGATE_DEPARTMENTS[code]) {
        branchMap[year].push(...AGGREGATE_DEPARTMENTS[code]);
      } else if (AGGREGATE_DEPARTMENTS[name]) {
        branchMap[year].push(...AGGREGATE_DEPARTMENTS[name]);
      } else {
        branchMap[year].push(code);
      }
    });
    return branchMap;
  }, [hodDepartmentsData]);

  const availableYears = useMemo(
    () => [...new Set(hodDepartmentsData.map((d) => d.description))].filter(Boolean).sort(),
    [hodDepartmentsData]
  );

  const availableBranches = useMemo(() => {
    const branchSet = new Set();
    Object.values(hodAuthorizedBranches).forEach((list) => {
      (list || []).forEach((b) => branchSet.add(b));
    });
    return [...branchSet].sort();
  }, [hodAuthorizedBranches]);

  // Fetch the section syllabus ONCE per branch/year selection (not per modal open).
  // The syllabus is identical for every student in a section, so caching it here
  // eliminates the per-click network latency when opening the attendance modal.
  useEffect(() => {
    let cancelled = false;
    async function fetchSectionSubjects() {
      try {
        const branchList =
          filterBranch === 'All'
            ? (filterYear !== 'All' && hodAuthorizedBranches[filterYear]?.length
                ? hodAuthorizedBranches[filterYear]
                : availableBranches)
            : [filterBranch];

        if (!branchList || branchList.length === 0) {
          if (!cancelled) setSectionSubjects([]);
          return;
        }

        let query = supabase
          .from('subjects')
          .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
          .in('department', branchList);
        if (filterYear !== 'All') query = query.eq('year', filterYear);

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setSectionSubjects(data || []);
      } catch (err) {
        console.error('Failed to fetch section subjects:', err);
        if (!cancelled) setSectionSubjects([]);
      }
    }
    fetchSectionSubjects();
    return () => {
      cancelled = true;
    };
  }, [filterBranch, filterYear, availableBranches, hodAuthorizedBranches]);

  const isFilterActive = filterYear !== 'All' || filterBranch !== 'All';

  const authorizedStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s.selected_year) return false;
      const authorizedBranches = hodAuthorizedBranches[s.selected_year];
      if (!authorizedBranches) return false;
      if (!s.selected_branch) return false;
      if (!authorizedBranches.includes(s.selected_branch)) return false;
      if (filterSection !== 'All') {
        const sec = String(s.section || '').toUpperCase().trim();
        if (sec !== filterSection) return false;
      }
      return true;
    });
  }, [students, hodAuthorizedBranches, filterSection]);

  const sectionGlobalTotals = useMemo(() => {
    const studentMap = {};
    authorizedStudents.forEach((s) => {
      studentMap[s.id] = { academicTotalClasses: 0 };
    });

    attendanceRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        studentMap[r.student_id].academicTotalClasses += 1;
      }
    });

    const globalAcademicTotal = Object.values(studentMap).length > 0
      ? Math.max(...Object.values(studentMap).map(s => s.academicTotalClasses))
      : 0;

    const currentSectionRolls = new Set(
      authorizedStudents.map(s => String(s.roll_number || s.roll_no || s.id))
    );

    const globalUniqueSessions = new Set();
    let globalExtraTotal = 0;

    extraAttendanceRecords.forEach((row) => {
      const roll = String(row.student_roll);
      if (!currentSectionRolls.has(roll)) return;

      let p = parseInt(row.duration_periods, 10);
      p = (!isNaN(p) && p > 0) ? p : (row.is_full_day ? 7 : 1);
      const sessionKey = `${row.date}_${row.activity_type}_${row.start_time || 'fullday'}`;

      if (!globalUniqueSessions.has(sessionKey)) {
        globalUniqueSessions.add(sessionKey);
        globalExtraTotal += p;
      }
    });

    return { globalAcademicTotal, globalExtraTotal };
  }, [authorizedStudents, attendanceRecords, extraAttendanceRecords]);

  const studentStats = useMemo(() => {
    const studentMap = {};
    authorizedStudents.forEach((s) => {
      studentMap[s.id] = {
        id: s.id,
        full_name: s.full_name || 'Unknown',
        roll_number: s.roll_number || 'N/A',
        academicTotalClasses: 0,
        academicAttendedClasses: 0,
        studentSpecificExtraAttended: 0,
      };
    });

    const rollToId = {};
    authorizedStudents.forEach((s) => {
      if (s.roll_number != null) rollToId[String(s.roll_number)] = s.id;
    });

    attendanceRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        studentMap[r.student_id].academicTotalClasses += 1;
        const status = String(r.status || '').toUpperCase();
        if (status === 'P' || status === 'PRESENT') {
          studentMap[r.student_id].academicAttendedClasses += 1;
        }
      }
    });

    extraAttendanceRecords.forEach((row) => {
      const roll = String(row.student_roll);
      const sid = rollToId[roll];
      if (!sid || !studentMap[sid]) return;
      let p = parseInt(row.duration_periods, 10);
      p = (!isNaN(p) && p > 0) ? p : (row.is_full_day ? 7 : 1);
      const isPresent = row.status === true || row.status === 'P' || row.status === 'PRESENT';
      if (isPresent) {
        studentMap[sid].studentSpecificExtraAttended += p;
      }
    });

    const { globalAcademicTotal, globalExtraTotal } = sectionGlobalTotals;

    return Object.values(studentMap)
      .map((s) => {
        const grandTotal = globalAcademicTotal + globalExtraTotal;
        const grandAttended = s.academicAttendedClasses + s.studentSpecificExtraAttended;
        return {
          id: s.id,
          full_name: s.full_name,
          roll_number: s.roll_number,
          total: grandTotal,
          present: grandAttended,
          percentage: grandTotal > 0 ? Math.round((grandAttended / grandTotal) * 100) : 0,
        };
      })
      .sort((a, b) => {
        // Robust alphanumeric sort by roll number (ascending)
        const rollA = String(a.roll_number || a.roll_no || a.id || '').trim();
        const rollB = String(b.roll_number || b.roll_no || b.id || '').trim();
        const rollCompare = rollA.localeCompare(rollB, undefined, { numeric: true });
        // Fall back to percentage (ascending) for stable tie-breaking
        return rollCompare !== 0 ? rollCompare : a.percentage - b.percentage;
      });
  }, [authorizedStudents, attendanceRecords, extraAttendanceRecords]);

  const totalStudents = authorizedStudents.length;
  const totalDefaulters = studentStats.filter((s) => s.percentage < 60).length;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let studentsQuery = supabase
          .from('user_profiles')
          .select('id, full_name, roll_number, selected_year, selected_branch, section')
          .eq('role', 'student');

        // Apply year / branch filters only when a specific value is selected.
        if (filterYear !== 'All') {
          studentsQuery = studentsQuery.eq('selected_year', filterYear);
        }
        if (filterBranch !== 'All') {
          studentsQuery = studentsQuery.eq('selected_branch', filterBranch);
        }

        const { data: studentsData, error: studentsError } = await studentsQuery;

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        const studentIds = (studentsData || []).map((s) => s.id);
        if (studentIds.length === 0) {
          setAttendanceRecords([]);
          return;
        }

        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('status, student_id, attendance_sessions!inner(*)')
          .in('student_id', studentIds);

        if (recordsError) throw recordsError;
        setAttendanceRecords(recordsData || []);

        const rollNumbers = (studentsData || [])
          .map((s) => s.roll_number)
          .filter(Boolean);
        if (rollNumbers.length > 0) {
          const { data: extraData, error: extraError } = await supabase
            .from('extra_attendance')
            .select('student_roll, activity_type, status, date, duration_periods, is_full_day, start_time')
            .in('student_roll', rollNumbers);

          if (extraError) throw extraError;
          setExtraAttendanceRecords(extraData || []);
        } else {
          setExtraAttendanceRecords([]);
        }
      } catch (err) {
        console.error('Failed to fetch attendance analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filterYear, filterBranch]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleExportExcel = async (weekNo = '', dateRange = '', semHeading = semesterHeading) => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const sectionLabel = filterSection === 'All' ? 'All' : filterSection;
      const yearLabel = filterYear === 'All' ? '' : filterYear;
      const branchLabel =
        filterBranch === 'IT' ? 'INFORMATION TECHNOLOGY' : filterBranch === 'All' ? 'All Departments' : filterBranch;
      // Resolve the branch codes this report covers.
      const branchList =
        filterBranch === 'All'
          ? filterYear !== 'All' && hodAuthorizedBranches[filterYear]?.length
            ? hodAuthorizedBranches[filterYear]
            : availableBranches
          : [filterBranch];

      if (!branchList || branchList.length === 0) {
        alert('Please select a department to export the report.');
        return;
      }

      // 1. Subjects for the selected branch(es) / year -> ordered columns.
      //    Faculty is joined in so we can render faculty initials in the
      //    multi-tier header.
      let subjectsQuery = supabase
        .from('subjects')
        .select(
          'id, name, code, type, department, year, semester, faculty_id, faculty:faculty_id(full_name)'
        )
        .in('department', branchList);
      if (filterYear !== 'All') subjectsQuery = subjectsQuery.eq('year', filterYear);
      const { data: subjectsData, error: subjectsError } = await subjectsQuery;
      if (subjectsError) throw subjectsError;

      const normType = (t) => String(t || '').toLowerCase();
      const isNonAcademic = (t) => normType(t) === 'non-academic';

      const allSubjects = (subjectsData || [])
        .filter((s) => !isNonAcademic(s.type))
        .map((s) => ({
          id: s.id,
          name: s.name || s.subject_name || 'Unknown Subject',
          code: s.code || s.subject_code || '',
          type: normType(s.type),
          facultyName: s.faculty?.full_name || '',
        }));

      // Group subjects into the three academic categories the physical
      // register expects: THEORY ('Theory'), SD ('Skill') and LAB ('Practical').
      const theorySubs = allSubjects.filter((s) => s.type === 'theory');
      const skillSubs = allSubjects.filter((s) => s.type === 'skill');
      const labSubs = allSubjects.filter((s) => s.type === 'practical');
      const academicSubs = [...theorySubs, ...skillSubs, ...labSubs];

      // 2. Students for the selection (with section).
      let studentsQuery = supabase
        .from('user_profiles')
        .select('id, full_name, roll_number, selected_year, selected_branch, section')
        .eq('role', 'student')
        .in('selected_branch', branchList);
      if (filterYear !== 'All') studentsQuery = studentsQuery.eq('selected_year', filterYear);
      const { data: studentsData, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      const normSection = (s) => (s == null ? '' : String(s).toUpperCase().trim());

      let reportStudents = (studentsData || []).filter((s) =>
        filterSection === 'All' ? true : normSection(s.section) === filterSection
      );
      reportStudents = reportStudents.sort((a, b) => {
        const ra = parseInt(a.roll_number, 10) || 0;
        const rb = parseInt(b.roll_number, 10) || 0;
        return ra - rb;
      });

      if (reportStudents.length === 0) {
        alert('No students found for the selected filters.');
        return;
      }

      // Fetch the mentor name for this section (used in the sheet's meta rows).
      // First resolve the faculty_id from section_mentors, then the full_name
      // from user_profiles; prefix with Mr/Ms. per the standard register.
      let mentorName = '';
      if (filterSection !== 'All') {
        const mentorBranch = branchList[0];
        const mentorYear = filterYear !== 'All' ? filterYear : undefined;
        let mentorQuery = supabase
          .from('section_mentors')
          .select('faculty_id')
          .eq('branch', mentorBranch)
          .eq('section', filterSection);
        if (mentorYear) mentorQuery = mentorQuery.eq('year', mentorYear);
        const { data: mentorData, error: mentorError } = await mentorQuery.maybeSingle();
        if (!mentorError && mentorData?.faculty_id) {
          const { data: facultyData, error: facultyError } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', mentorData.faculty_id)
            .maybeSingle();
          if (!facultyError && facultyData?.full_name) {
            mentorName = `Mr/Ms. ${facultyData.full_name}`;
          }
        }
      }

      // 3. Attendance records joined to their sessions (subject + type + section).
      const studentIds = reportStudents.map((s) => s.id);
      const { data: recordsData, error: recordsError } = await supabase
        .from('attendance_records')
        .select('student_id, status, attendance_sessions!inner(*)')
        .in('student_id', studentIds);
      if (recordsError) throw recordsError;

      // Per-student, per-subject tallies.
      const studentTally = {};
      reportStudents.forEach((s) => {
        studentTally[s.id] = {};
        academicSubs.forEach((sub) => {
          studentTally[s.id][sub.id] = { total: 0, present: 0 };
        });
      });

      (recordsData || []).forEach((rec) => {
        const tally = studentTally[rec.student_id];
        if (!tally) return;
        const sess = rec.attendance_sessions;
        if (!sess || !sess.subject_id) return;
        const cell = tally[sess.subject_id];
        if (!cell) return;

        const sessIsTheory = normType(sess.type) === 'theory';
        const sessSection = normSection(sess.section || sess.batch);
        const universalLab = sessSection === 'ALL';
        const include =
          sessIsTheory ||
          filterSection === 'All' ||
          universalLab ||
          sessSection === filterSection ||
          !sessSection;
        if (!include) return;

        cell.total += 1;
        const status = String(rec.status || '').toUpperCase();
        if (status === 'P' || status === 'PRESENT') cell.present += 1;
      });

      // Max academic sessions per subject, derived strictly from the current
      // section's students. This prevents cross-section leakage (e.g. B1's OS
      // Lab session leaking into B2's sheet).
      const maxAcademicPerSubject = {};
      academicSubs.forEach((sub) => {
        maxAcademicPerSubject[sub.id] = 0;
      });
      Object.values(studentTally).forEach((tally) => {
        academicSubs.forEach((sub) => {
          const total = tally[sub.id]?.total || 0;
          if (total > maxAcademicPerSubject[sub.id]) {
            maxAcademicPerSubject[sub.id] = total;
          }
        });
      });

      // 4. Build the strict college-format sheet: an 8-row title/header block
      //    (title, dept, class, then a 5-tier academic header) that mirrors the
      //    physical university attendance register.
      const extraCategories = [
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

      // Fixed left columns: ROLL NO., STUDENT NAME, and a row-label column that
      // carries FACULTY NAME / SUBJECT NAME / SUBJECT CODE / TOTAL CLASS.
      const ROLL_COL = 0;
      const NAME_COL = 1;
      const LABEL_COL = 2;
      const SUBJ_START = 3;

      const theoryStart = SUBJ_START;
      const theoryEnd = theoryStart + theorySubs.length - 1;
      const skillStart = theoryEnd + 1;
      const skillEnd = skillStart + skillSubs.length - 1;
      const labStart = skillEnd + 1;
      const labEnd = labStart + labSubs.length - 1;

      const A_COL = labEnd + 1; // (A) — merged header, Row 13 = TOTAL
      const A_PCT_COL = A_COL + 1; // PERCENTAGE — merged header, Row 13 = 100
      const EXTRA_START = A_PCT_COL + 1;
      const EXTRA_END = EXTRA_START + extraCategories.length - 1;
      const B_COL = EXTRA_END + 1; // (B) — merged header, Row 13 = TOTAL
      const C_COL = B_COL + 1; // C = (A+B) — merged header, Row 13 = GRAND TOTAL
      const OVERALL_COL = C_COL + 1; // OVERALL % — merged header, Row 13 = 100
      const TOTAL_COLS = OVERALL_COL + 1;

      const emptyRow = () => new Array(TOTAL_COLS).fill('');
      const bannerRow = emptyRow();
      const facultyRow = emptyRow();
      const subjectRow = emptyRow();
      const codeRow = emptyRow();
      const totalClassRow = emptyRow();

      // Row 4 (main categories) — banners merged over their sub-columns.
      bannerRow[ROLL_COL] = 'ROLL NO.';
      bannerRow[NAME_COL] = 'STUDENT NAME';
      if (theorySubs.length > 0) bannerRow[theoryStart] = 'THEORY';
      if (skillSubs.length > 0) bannerRow[skillStart] = 'SD';
      if (labSubs.length > 0) bannerRow[labStart] = 'LAB';
      bannerRow[A_COL] = '(A)';
      bannerRow[A_PCT_COL] = 'PERCENTAGE';
      bannerRow[EXTRA_START] = 'Extra Attendance';
      bannerRow[B_COL] = '(B)';
      bannerRow[C_COL] = 'C = (A+B)';
      bannerRow[OVERALL_COL] = 'OVERALL %';

      // Row 5: FACULTY NAME label + faculty initials under each subject.
      facultyRow[LABEL_COL] = 'FACULTY NAME';
      // Row 6: SUBJECT NAME label + subject initials for academic columns.
      subjectRow[LABEL_COL] = 'SUBJECT NAME';
      // Row 7: SUBJECT CODE label.
      codeRow[LABEL_COL] = 'SUBJECT CODE';
      // Row 8: TOTAL CLASS label + total sessions conducted per subject.
      totalClassRow[LABEL_COL] = 'TOTAL CLASS';

      academicSubs.forEach((sub, i) => {
        const col = SUBJ_START + i;
        facultyRow[col] = sub.facultyName ? getFacultyInitials(sub.facultyName) : '?';
        subjectRow[col] = getSubjectInitials(sub.name);
        codeRow[col] = sub.code || 'N/A';
        totalClassRow[col] = maxAcademicPerSubject[sub.id] || 0;
      });

      // Row 12 (SUBJECT CODE tier) sub-labels for the split summary columns.
      codeRow[A_COL] = 'TOTAL'; // (A) -> TOTAL
      codeRow[B_COL] = 'TOTAL'; // (B) -> TOTAL
      codeRow[C_COL] = 'GRAND TOTAL'; // C = (A+B) -> GRAND TOTAL

      // Extra Attendance sub-categories listed under the banner (row 5).
      extraCategories.forEach((cat, i) => {
        facultyRow[EXTRA_START + i] = cat;
      });

      // Calculate Conducted and Attended Periods Properly
      const conductedMap = {
          'Extra Class': 0, 'Extra Curricular': 0, 'Sports': 0, 'Research': 0,
          'Placement': 0, 'Skill Development': 0, 'Mentor Mentee Meeting': 0,
          'Community Development': 0, 'WEC': 0
      };
      const studentExtraData = {};
      const uniqueSessions = new Set();

      const currentSectionRolls = new Set(
        authorizedStudents.map(s => String(s.roll_number || s.roll_no || s.id))
      );

      if (extraAttendanceRecords) {
          extraAttendanceRecords.forEach(row => {
              const roll = String(row.student_roll);
              if (!currentSectionRolls.has(roll)) return;

              let p = parseInt(row.duration_periods, 10);
              p = (!isNaN(p) && p > 0) ? p : (row.is_full_day ? 7 : 1);
              const act = row.activity_type;

              // Unique Conducted (For the Blue Row)
              const sessionKey = `${row.date}_${act}_${row.start_time || 'fullday'}`;
              if (!uniqueSessions.has(sessionKey)) {
                  uniqueSessions.add(sessionKey);
                  if (conductedMap[act] !== undefined) conductedMap[act] += p;
              }

              // Student Attended (For the Student Rows below)
              if (!studentExtraData[roll]) studentExtraData[roll] = {};
              if (!studentExtraData[roll][act]) studentExtraData[roll][act] = 0;

              const isPresent = row.status === true || row.status === 'P' || row.status === 'PRESENT';
              if (isPresent) {
                  studentExtraData[roll][act] += p;
              }
          });
      }

      let sectionTotalExtraConducted = 0;
      extraCategories.forEach((act) => {
          sectionTotalExtraConducted += conductedMap[act] || 0;
      });

      // Row 8 (TOTAL CLASS) — academic conducted, the new (A) TOTAL and
      // PERCENTAGE columns, the per-category extra conducted sessions, and the
      // rolled up (B) EXTRA / C GRAND TOTAL denominations.
      const sectionTotalAcademicConducted = academicSubs.reduce(
        (sum, sub) => sum + (maxAcademicPerSubject[sub.id] || 0),
        0
      );
      const sectionGrandTotalConducted = sectionTotalAcademicConducted + sectionTotalExtraConducted;

      totalClassRow[A_COL] = sectionTotalAcademicConducted; // (A) TOTAL
      totalClassRow[A_PCT_COL] = sectionTotalAcademicConducted > 0
        ? Math.round((sectionTotalAcademicConducted / sectionTotalAcademicConducted) * 100)
        : 0; // PERCENTAGE — always 100% at class level

      totalClassRow[EXTRA_START] = conductedMap['Extra Class'] || 0;
      totalClassRow[EXTRA_START + 1] = conductedMap['Extra Curricular'] || 0;
      totalClassRow[EXTRA_START + 2] = conductedMap['Sports'] || 0;
      totalClassRow[EXTRA_START + 3] = conductedMap['Research'] || 0;
      totalClassRow[EXTRA_START + 4] = conductedMap['Placement'] || 0;
      totalClassRow[EXTRA_START + 5] = conductedMap['Skill Development'] || 0;
      totalClassRow[EXTRA_START + 6] = conductedMap['Mentor Mentee Meeting'] || 0;
      totalClassRow[EXTRA_START + 7] = conductedMap['Community Development'] || 0;
      totalClassRow[EXTRA_START + 8] = conductedMap['WEC'] || 0;

      totalClassRow[B_COL] = sectionTotalExtraConducted; // (B) TOTAL
      totalClassRow[C_COL] = sectionGrandTotalConducted; // C = (A+B) GRAND TOTAL
      totalClassRow[OVERALL_COL] = 100; // OVERALL % — strictly 100% at class level

      // Data rows: attended sessions per subject, the academic/extra/grand
      // totals, and the overall percentage. Percentages are computed against
      // the SECTION's total conducted classes (NOT the student's own attended
      // count) so the math matches the physical register.
      const rows = reportStudents.map((s) => {
        const tally = studentTally[s.id];
        let academicAttended = 0;
        const subjectCells = academicSubs.map((sub) => {
          const c = tally[sub.id] || { total: 0, present: 0 };
          academicAttended += c.present;
          return c.present;
        });
        const academicTotal = academicAttended; // (A) TOTAL
        const roll = String(s.roll_number || s.id);
        const extraCells = extraCategories.map((cat) => studentExtraData[roll]?.[cat] || 0);
        const extraTotal = extraCells.reduce((sum, val) => sum + val, 0); // (B) EXTRA
        const grandTotal = academicTotal + extraTotal; // C = (A+B)
        const aPercentage =
          sectionTotalAcademicConducted > 0
            ? Math.round((academicTotal / sectionTotalAcademicConducted) * 100)
            : 0;
        const overallPct =
          sectionGrandTotalConducted > 0
            ? Math.round((grandTotal / sectionGrandTotalConducted) * 100)
            : 0;
        return [
          s.roll_number || 'N/A',
          s.full_name || 'Unknown',
          '', // row-label column (blank in data rows)
          ...subjectCells,
          academicTotal, // (A) TOTAL
          `${aPercentage}%`, // PERCENTAGE
          ...extraCells,
          extraTotal, // (B) TOTAL
          grandTotal, // C = (A+B) GRAND TOTAL
          `${overallPct}%`, // OVERALL %
        ];
      });

      const blueStyle = {
          // patternType is required for the fill to actually render in most
          // spreadsheet engines; without it the blue background is dropped.
          fill: { patternType: "solid", fgColor: { rgb: "FF9BC2E6" } },
          font: { bold: true, color: { rgb: "FF000000" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
      };

      const styledTotalRow = [];
      for (let i = 0; i < 29; i++) {
          let val = "";
          if (i < 17) {
              val = totalClassRow[i];
          } else {
              if (i === 17) val = conductedMap['Extra Class'] || 0;
              if (i === 18) val = conductedMap['Extra Curricular'] || 0;
              if (i === 19) val = conductedMap['Sports'] || 0;
              if (i === 20) val = conductedMap['Research'] || 0;
              if (i === 21) val = conductedMap['Placement'] || 0;
              if (i === 22) val = conductedMap['Skill Development'] || 0;
              if (i === 23) val = conductedMap['Mentor Mentee Meeting'] || 0;
              if (i === 24) val = conductedMap['Community Development'] || 0;
              if (i === 25) val = conductedMap['WEC'] || 0;
              if (i === 26) val = sectionTotalExtraConducted || 0;
              if (i === 27) val = sectionGrandTotalConducted || 0;
              if (i === 28) val = "100";
          }

          styledTotalRow.push({
              v: (val !== undefined && val !== null) ? val : 0,
              t: (typeof val === 'number') ? 'n' : 's',
              s: blueStyle
          });
      }

      const aoa = [
        ['BUDDHA INSTITUTE OF TECHNOLOGY, GORAKHPUR'], // Row 1 — meta
        [semHeading || 'Semester Heading Not Set'], // Row 2 — meta
        ['Attendance Sheet'], // Row 3 — meta
        [`MENTOR NAME: ${mentorName}`], // Row 4 — meta
        [`DEPARTMENT NAME : ${branchLabel}`], // Row 5 — meta
        [`CLASS - ${yearLabel} (4th Sem. - ${sectionLabel} )`], // Row 6 — meta
        [`WEEK NO - ${weekNo || ''}`], // Row 7 — meta
        [`DATE FROM - ${dateRange || ''}`], // Row 8 — meta
        bannerRow, // Row 9 — main categories
        facultyRow, // Row 10 — faculty names
        subjectRow, // Row 11 — subject names
        codeRow, // Row 12 — subject codes
        styledTotalRow, // Row 13 — total classes
        ...rows,
      ];

      // Index of the first header tier (the main category banner). All
      // reference-row math below is expressed relative to HEADER_ROW so the
      // 8 meta rows above stay decoupled from the 5-tier academic header.
      const HEADER_ROW = 8; // 0-based index of bannerRow
      const HEADER_END = HEADER_ROW + 4; // totalClassRow

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Merges:
      //  - Top meta rows 1-3 merged fully across all columns.
      //  - Top meta rows 4-8 merged across the first few columns (labels).
      //  - ROLL NO. / STUDENT NAME vertical spans through the 5-tier header.
      //  - THEORY / SD / LAB group banners; single academic/extra/grand/overall
      //    columns merged vertically; Extra Attendance sub-category columns
      //    merged down so their names stay centered.
      const merges = [];
      const pushMerge = (r1, c1, r2, c2) => {
        if (c1 > c2 || r1 > r2) return;
        merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
      };

      pushMerge(0, 0, 0, TOTAL_COLS - 1); // Row 1 — title (full width)
      pushMerge(1, 0, 1, TOTAL_COLS - 1); // Row 2 — semester (full width)
      pushMerge(2, 0, 2, TOTAL_COLS - 1); // Row 3 — sheet name (full width)
      pushMerge(3, 0, 3, TOTAL_COLS - 1); // Row 4 — mentor (full width)
      pushMerge(4, 0, 4, TOTAL_COLS - 1); // Row 5 — department (full width)
      pushMerge(5, 0, 5, TOTAL_COLS - 1); // Row 6 — class (full width)
      pushMerge(6, 0, 6, TOTAL_COLS - 1); // Row 7 — week (full width)
      pushMerge(7, 0, 7, TOTAL_COLS - 1); // Row 8 — date (full width)
      pushMerge(HEADER_ROW, ROLL_COL, HEADER_END, ROLL_COL); // ROLL NO.
      pushMerge(HEADER_ROW, NAME_COL, HEADER_END, NAME_COL); // STUDENT NAME
      if (theorySubs.length > 0) pushMerge(HEADER_ROW, theoryStart, HEADER_ROW, theoryEnd);
      if (skillSubs.length > 0) pushMerge(HEADER_ROW, skillStart, HEADER_ROW, skillEnd);
      if (labSubs.length > 0) pushMerge(HEADER_ROW, labStart, HEADER_ROW, labEnd);
      pushMerge(HEADER_ROW, A_COL, HEADER_ROW + 2, A_COL); // (A) — rows 9-11
      pushMerge(HEADER_ROW, A_PCT_COL, HEADER_END - 1, A_PCT_COL); // PERCENTAGE — rows 9-12
      pushMerge(HEADER_ROW, EXTRA_START, HEADER_ROW, EXTRA_END);
      // CRITICAL FIX: the Extra Activity header names live in row HEADER_ROW + 1
      // and were merged all the way down to HEADER_END — which IS the blue
      // "TOTAL CLASS" row. That merge visually swallowed the value and blue fill
      // of the TOTAL CLASS row for these columns. Stop the merge exactly one row
      // ABOVE HEADER_END so the TOTAL CLASS row is free to render its own cells.
      extraCategories.forEach((_, i) => pushMerge(HEADER_ROW + 1, EXTRA_START + i, HEADER_END - 1, EXTRA_START + i));
      pushMerge(HEADER_ROW, B_COL, HEADER_ROW + 2, B_COL); // (B) — rows 9-11
      pushMerge(HEADER_ROW, C_COL, HEADER_ROW + 2, C_COL); // C = (A+B) — rows 9-11
      pushMerge(HEADER_ROW, OVERALL_COL, HEADER_END - 1, OVERALL_COL); // OVERALL % — rows 9-12
      ws['!merges'] = merges;

      // ----------------------------------------------------------------------
      // Styling: exact background colors, thin black borders, and centered
      // alignment — matching the physical university register.
      // ----------------------------------------------------------------------
      const thinBorder = {
        top: { style: 'thin', color: { rgb: 'FF000000' } },
        bottom: { style: 'thin', color: { rgb: 'FF000000' } },
        left: { style: 'thin', color: { rgb: 'FF000000' } },
        right: { style: 'thin', color: { rgb: 'FF000000' } },
      };

      const bg = (rgb) => ({ rgb: `FF${rgb.replace('#', '')}` });
      const fill = (rgb) => ({ patternType: 'solid', fgColor: bg(rgb) });

      // Per-column header color (the 5-tier academic block) keyed by column.
      const COLORS = {
        PEACH: '#F8CBAD', // Row 1 meta — title
        LIGHT_BLUE: '#B4C6E7', // Row 2 meta — semester
        LIGHT_YELLOW: '#FFF2CC', // Row 3 meta — sheet name / (A) TOTAL etc.
        YELLOW: '#FFD966', // ROLL NO. / STUDENT NAME
        LIGHT_ORANGE: '#FCE4D6', // THEORY
        LIGHT_GREEN: '#E2EFDA', // SD
        SOLID_ORANGE: '#F4B084', // LAB
        LAVENDER: '#E4DFEC', // Extra Attendance
        CYAN: '#9BC2E6', // TOTAL CLASS row / (B) TOTAL denominator
        GOLD: '#FFC000', // C = (A+B) GRAND TOTAL
        TEAL: '#4BACC6', // OVERALL %
      };

      // Map every column to its assigned header color.
      const colColor = new Array(TOTAL_COLS).fill(null);
      colColor[ROLL_COL] = COLORS.YELLOW;
      colColor[NAME_COL] = COLORS.YELLOW;
      colColor[LABEL_COL] = COLORS.YELLOW; // cell above FACULTY NAME (Row 9)
      for (let i = theoryStart; i <= theoryEnd; i += 1) colColor[i] = COLORS.LIGHT_ORANGE;
      for (let i = skillStart; i <= skillEnd; i += 1) colColor[i] = COLORS.LIGHT_GREEN;
      for (let i = labStart; i <= labEnd; i += 1) colColor[i] = COLORS.SOLID_ORANGE;
      colColor[A_COL] = COLORS.LIGHT_YELLOW; // (A) TOTAL
      colColor[A_PCT_COL] = COLORS.LIGHT_YELLOW; // PERCENTAGE
      for (let i = EXTRA_START; i <= EXTRA_END; i += 1) colColor[i] = COLORS.LAVENDER;
      colColor[B_COL] = COLORS.LIGHT_YELLOW; // (B) TOTAL
      colColor[C_COL] = COLORS.GOLD; // C = (A+B) GRAND TOTAL
      colColor[OVERALL_COL] = COLORS.TEAL; // OVERALL %

      // Distinct background per top meta row (rows 1-3 get the exact spec
      // colors; rows 4-8 are plain white label rows). All get borders.
      const metaRowFill = {
        0: COLORS.PEACH, // Row 1 — title
        1: COLORS.LIGHT_BLUE, // Row 2 — semester
        2: COLORS.LIGHT_YELLOW, // Row 3 — sheet name
      };

      // Top meta rows (1-8). Rows 1-3 are centered (with spec fills); rows
      // 4-8 are left-aligned white label rows. All get thin black borders
      // across the ENTIRE merged width — so we create style placeholders for
      // every column even where aoa_to_sheet left no cell object.
      for (let r = 0; r <= 7; r += 1) {
        const fillColor = metaRowFill[r];
        const isCentered = r <= 2;
        for (let c = 0; c < TOTAL_COLS; c += 1) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { t: 's', v: '' };
          ws[ref].s = {
            alignment: {
              horizontal: isCentered ? 'center' : 'left',
              vertical: 'center',
              wrapText: true,
            },
            font: { bold: true, color: { rgb: 'FF000000' } },
            fill: fillColor ? fill(fillColor) : { patternType: 'solid', fgColor: { rgb: 'FFFFFFFF' } },
            border: thinBorder,
          };
        }
      }

      // Header block (rows 9-13) and all data rows (14+): color by column,
      // borders on every populated cell, centered alignment (wrapped headers).
      for (let r = HEADER_ROW; r < aoa.length; r += 1) {
        if (r === HEADER_END) continue;
        for (let c = 0; c < TOTAL_COLS; c += 1) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) continue;
          const color = colColor[c];
          const isHeader = r >= HEADER_ROW && r <= HEADER_END;
          ws[ref].s = {
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: isHeader,
            },
            font: { bold: true, color: { rgb: 'FF000000' } },
            fill: color ? fill(color) : { patternType: 'solid', fgColor: { rgb: 'FFFFFFFF' } },
            border: thinBorder,
          };
        }
      }

      // Reasonable, auto-sized columns.
      const colWidths = [];
      for (let c = 0; c < TOTAL_COLS; c += 1) {
        let w = 8;
        [bannerRow, facultyRow, subjectRow, codeRow, totalClassRow].forEach((rowArr) => {
          const v = rowArr[c];
          if (v != null && v !== '') w = Math.max(w, String(v).length + 2);
        });
        rows.forEach((r) => {
          const v = r[c];
          if (v != null) w = Math.max(w, String(v).length + 2);
        });
        colWidths.push({ wch: Math.min(Math.max(w, 8), 22) });
      }
      colWidths[NAME_COL] = { wch: 24 };
      colWidths[LABEL_COL] = { wch: 16 };
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_Report_${sectionLabel}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export attendance Excel:', err);
      alert('Failed to export attendance report. ' + (err?.message || ''));
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const confirmExportExcel = async () => {
    const formattedDateRange = `${formatDate(startDate)} to ${formatDate(endDate)}`;
    await handleExportExcel(exportWeek, formattedDateRange);
    setIsExportModalOpen(false);
    setExportWeek('1');
    setStartDate('');
    setEndDate('');
  };

  const filterSelectStyle = {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '0.6rem 2.2rem 0.6rem 0.9rem',
    color: '#e2e8f0',
    fontSize: '0.85rem',
    outline: 'none',
    minWidth: '200px',
    cursor: 'pointer',
  };

  const selectChevronStyle = {
    position: 'absolute',
    right: '0.8rem',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: '#94a3b8',
    fontSize: '0.7rem',
  };

  return (
    <div className="hod-dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">All Sections</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
        </div>

        <button
          type="button"
          className="hod-export-btn"
          onClick={() => setIsExportModalOpen(true)}
          disabled={isExporting}
          title="Export the current selection to Excel"
        >
          <span aria-hidden="true">⬇️</span>
          {isExporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      {isLoading ? (
        <div className="hod-card">
          <div className="skeleton-line" style={{ width: '40%', height: '1.4rem', marginBottom: '1rem' }} />
          <div className="skeleton-line" style={{ width: '100%', height: '2.5rem', marginBottom: '0.75rem' }} />
          <div className="skeleton-line" style={{ width: '100%', height: '2.5rem', marginBottom: '0.75rem' }} />
          <div className="skeleton-line" style={{ width: '80%', height: '2.5rem' }} />
        </div>
      ) : (
        <>
          <div className="hod-card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.03em' }}>
          Department Attendance Analytics
        </h3>
        <div className="hod-stats-grid">
          <div className="hod-stat hod-stat--cyan">
            <span>Total Students</span>
            <strong>{totalStudents}</strong>
          </div>
              <div className="hod-stat hod-stat--amber">
                <span>Total Defaulters (&lt; 60%)</span>
                <strong>{totalDefaulters}</strong>
              </div>
        </div>
      </div>

      <div className="hod-card">
      <div className="w-full overflow-x-auto table-wrapper">
        <table className="hod-table" style={{ minWidth: 0 }}>
          <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Overall Attendance</th>
                <th className="pr-8">Status</th>
                <th className="pr-8">Details</th>
              </tr>
          </thead>
          <tbody>
            {studentStats.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px dashed rgba(148, 163, 184, 0.25)' }}>
                  {isFilterActive
                    ? 'No students found for this selection'
                    : 'No attendance records found for your department.'}
                </td>
              </tr>
            ) : (
              studentStats.map((s) => {
                const status = getAttendanceStatus(s.percentage);
                return (
                  <tr
                    key={s.id}
                    onClick={() => openStudentAttendanceDetail(s.id, s.full_name)}
                    style={{ cursor: 'pointer' }}
                    className="hod-attendance-row"
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: '#fff',
                          fontSize: '0.8rem',
                          flexShrink: 0,
                        }}>
                          {getInitials(s.full_name)}
                        </div>
                        <strong>{s.full_name}</strong>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{s.roll_number}</td>
                    <td>
                      <span style={{
                        fontWeight: '900',
                        color: status.color,
                        fontSize: '0.95rem',
                      }}>
                        {s.percentage}%
                      </span>
                    </td>
                    <td className="pr-8">
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.28rem 0.68rem',
                          border: `1px solid ${status.border}`,
                          borderRadius: '999px',
                          color: status.color,
                          background: status.bg,
                          fontSize: '0.78rem',
                          fontWeight: '900',
                        }}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudentAttendanceDetail(s.id, s.full_name);
                          }}
                          title="View attendance details"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: '#c7d2fe',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.28)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'; }}
                        >
                          <ArrowUpRight size={16} strokeWidth={2.4} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 15, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={closeStudentAttendanceDetail}
        >
          <div
            style={{
              width: 'min(680px, 100%)',
              height: '100%',
              background: '#0c0e1a',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
              overflowY: 'auto',
              padding: '1.5rem 1.75rem',
              animation: 'hod-drawer-in 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900' }}>
                  {selectedStudent.name}
                </h3>
                <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Subject-wise &amp; Week-wise Attendance Breakdown
                </p>
              </div>
              <button
                type="button"
                onClick={closeStudentAttendanceDetail}
                title="Close"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <StudentAttendanceDetail 
              studentId={selectedStudent.id} 
              studentName={selectedStudent.name}
              globalAcademicTotal={sectionGlobalTotals.globalAcademicTotal}
              branch={filterBranch !== 'All' ? filterBranch : undefined}
              year={filterYear !== 'All' ? filterYear : undefined}
              enrolledSubjects={sectionSubjects}
            />
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div
          onClick={() => setIsExportModalOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              background: '#1c1d2e',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              padding: '24px',
            }}
          >
            <h3 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '1.1rem', fontWeight: '700' }}>
              Export Attendance Report
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#9ca3af', fontSize: '0.8rem' }}>
              Enter the reporting details to stamp onto the exported file.
            </p>

            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginBottom: '6px' }}>
              Semester Heading
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                    type="text"
                    value={semesterHeading}
                    onChange={(e) => setSemesterHeading(e.target.value)}
                    disabled={isHeadingLocked || isHeadingLoading}
                    placeholder="e.g., Even Semester (Jan - June. 2025-26)"
                    style={{ flex: 1, backgroundColor: '#1E2335', border: '1px solid #4B5563', borderRadius: '6px', padding: '8px 12px', color: 'white', outline: 'none' }}
                />
                {!isHeadingLocked ? (
                    <button
                        type="button"
                        onClick={handleLockHeading}
                        disabled={isHeadingLoading}
                        style={{ backgroundColor: '#10B981', color: 'white', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', border: 'none', cursor: isHeadingLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isHeadingLoading ? 0.7 : 1 }}
                    >
                        {isHeadingLoading ? 'Saving...' : 'Save'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleClearHeading}
                        disabled={isHeadingLoading}
                        style={{ backgroundColor: '#EF4444', color: 'white', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', border: 'none', cursor: isHeadingLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isHeadingLoading ? 0.7 : 1 }}
                    >
                        {isHeadingLoading ? 'Resetting...' : 'Reset'}
                    </button>
                )}
            </div>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.72rem' }}>
              Saves to the database for this department until cleared.
            </p>

            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginBottom: '6px' }}>
              Reporting Week
            </label>
            <select
              value={exportWeek}
              onChange={(e) => setExportWeek(e.target.value)}
              className="glass-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                marginBottom: '16px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.9rem',
                border: '1px solid rgba(255,255,255,0.1)',
                outline: 'none',
              }}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={String(w)} style={{ background: '#1c1d2e', color: '#f8fafc' }}>
                  Week {w}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginBottom: '6px' }}>
                  Date From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="glass-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginBottom: '6px' }}>
                  Date To
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="glass-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExportExcel}
                disabled={isExporting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#6366f1',
                  color: '#fff',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  opacity: isExporting ? 0.7 : 1,
                }}
              >
                {isExporting ? 'Generating…' : 'Download Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

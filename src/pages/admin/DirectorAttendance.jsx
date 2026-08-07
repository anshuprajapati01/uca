import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import { ArrowUpRight } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import StudentAttendanceDetail from '../dashboard/StudentAttendanceDetail.jsx';
import '../dashboard/HodDashboard.css';

const getAttendanceStatus = (pct) => {
  if (pct >= 75) {
    return { label: 'Safe', bg: 'rgba(34, 197, 94, 0.2)', color: '#bbf7d0', border: 'rgba(34, 197, 94, 0.4)' };
  }
  if (pct >= 60) {
    return { label: 'Warning', bg: 'rgba(251, 191, 36, 0.2)', color: '#fde68a', border: 'rgba(251, 191, 36, 0.4)' };
  }
  return { label: 'Defaulter', bg: 'rgba(239, 68, 68, 0.2)', color: '#fecaca', border: 'rgba(239, 68, 68, 0.4)' };
};

const getFacultyInitials = (name) => {
  if (!name) return "";
  const exceptionMap = { "Mr. Salman Khan": "SK" };
  if (exceptionMap[name]) return exceptionMap[name];
  let cleanName = name.replace(/\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Er\.)\s*/gi, '').trim();
  cleanName = cleanName.replace(/[^a-zA-Z\s]/g, '');
  return cleanName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase();
};

const getSubjectInitials = (name) => {
  if (!name) return "";
  const exceptionMap = { "Techedge": "Tech Edge", "CSEP": "CSEP" };
  if (exceptionMap[name]) return exceptionMap[name];
  let cleanName = name.replace(/\b(of|and|with|the|in|for)\b/gi, '').replace(/&/g, '').trim();
  if (cleanName.toLowerCase().includes('lab')) {
     cleanName = cleanName.replace(/\blab\b/gi, '');
     const initials = cleanName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase();
     return `${initials} LAB`;
  }
  return cleanName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase();
};

export default function DirectorAttendance() {
  const [students, setStudents] = useState([]);
  const [departmentsData, setDepartmentsData] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [extraAttendanceRecords, setExtraAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterYear, setFilterYear] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [semesterHeading, setSemesterHeading] = useState('');
  const [isHeadingLocked, setIsHeadingLocked] = useState(false);
  const [isHeadingLoading, setIsHeadingLoading] = useState(false);
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [sectionSubjects, setSectionSubjects] = useState([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching branches:", error);
        return;
      }

      console.log("Raw Academic Data:", data);

      if (data) {
        const mapped = (data || []).map((row) => {
          const branchName = row.name || row.code || '';
          const year = row.description || '';
          const trimmedName = branchName.trim();
          const trimmedYear = year.trim();
          const aggBranches = AGGREGATE_DEPARTMENTS[branchName];

          let branches;
          if (aggBranches) {
            branches = [...aggBranches];
          } else {
            if (trimmedName.includes(' & ')) {
              branches = trimmedName.split(' & ');
            } else if (trimmedName.includes(',')) {
              branches = trimmedName.split(',').map((s) => s.trim()).filter(Boolean);
            } else {
              branches = [trimmedName];
            }
          }

          return {
            id: row.id,
            name: branchName,
            year: year,
            branches,
            locked_sections: row.locked_sections || {},
          };
        });
        setDepartmentsData(mapped || []);
      }
    };

    fetchDepartments();
  }, []);

  const availableYears = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const availableDepartments = useMemo(() => {
    const yearFiltered = departmentsData.filter((d) => {
      const isYearMatch = String(d.year) === filterYear || String(d.year) === filterYear.charAt(0) || (filterYear !== 'All' && filterYear.includes(String(d.year)));
      return filterYear === 'All' || isYearMatch;
    });
    return [...new Set(yearFiltered.map((d) => d.department_name || d.dept_name || d.name || d.title).filter(Boolean))].sort();
  }, [departmentsData, filterYear]);

  const availableBranches = useMemo(() => {
    let source = departmentsData.filter((d) => {
      const isYearMatch = String(d.year) === filterYear || String(d.year) === filterYear.charAt(0) || (filterYear !== 'All' && filterYear.includes(String(d.year)));
      return filterYear === 'All' || isYearMatch;
    });

    if (filterDepartment !== 'All') {
      const deptName = filterDepartment;
      source = source.filter((d) => (d.department_name || d.dept_name || d.name || d.title) === deptName);
    }

    return [...new Set(
      source.flatMap((d) => {
        let branches = d.branches;
        if (typeof branches === 'string') {
          try { branches = JSON.parse(branches); } catch (e) { branches = []; }
        }
        if (!Array.isArray(branches)) branches = [];
        return branches.filter(Boolean);
      })
    )].sort();
  }, [departmentsData, filterYear, filterDepartment]);

  const availableSections = useMemo(() => {
    if (filterYear === 'All' || filterDepartment === 'All' || filterBranch === 'All') return [];
    
    const matchedDept = departmentsData.find(d => 
      (String(d.year) === filterYear || filterYear.includes(String(d.year))) &&
      (d.name && d.name.toLowerCase() === filterDepartment.toLowerCase())
    );
    
    if (!matchedDept || !matchedDept.locked_sections) return [];

    const branchKey = Object.keys(matchedDept.locked_sections).find(
      k => k.toLowerCase() === filterBranch.toLowerCase()
    );

    return branchKey ? matchedDept.locked_sections[branchKey] : [];
  }, [departmentsData, filterYear, filterDepartment, filterBranch]);

  useEffect(() => {
    if (filterSection !== 'All' && !availableSections.includes(filterSection)) {
      setFilterSection('All');
    }
  }, [availableSections, filterSection]);

  useEffect(() => {
    setFilterDepartment('All');
    setFilterBranch('All');
    setFilterSection('All');
  }, [filterYear]);

  useEffect(() => {
    setFilterBranch('All');
    setFilterSection('All');
  }, [filterDepartment]);

  const availableYearsList = availableYears;
  const availableDepartmentsList = availableDepartments;
  const availableBranchesList = availableBranches;

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

  useEffect(() => {
    const fetchSemesterStartDate = async () => {
      if (isExportModalOpen && filterBranch && filterBranch !== 'All') {
        const { data } = await supabase
          .from('system_settings')
          .select('semester_start_date')
          .eq('department', filterBranch)
          .eq('is_active', true)
          .maybeSingle();

        if (data?.semester_start_date) {
          setSemesterStartDate(data.semester_start_date);
          setStartDate(data.semester_start_date);
        } else {
          setSemesterStartDate('');
        }
      }
    };
    fetchSemesterStartDate();
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

  useEffect(() => {
    let cancelled = false;
    async function fetchSectionSubjects() {
      try {
        const branchList = filterBranch === 'All' ? availableBranchesList : [filterBranch];

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
  }, [filterBranch, filterYear, availableBranchesList]);

  const isFilterActive = filterYear !== 'All' || filterBranch !== 'All';

  const authorizedStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s.selected_year) return false;
      if (!s.selected_branch) return false;
      if (filterSection !== 'All') {
        const sec = String(s.section || '').toUpperCase().trim();
        if (sec !== filterSection) return false;
      }
      return true;
    });
  }, [students, filterSection]);

  const sectionGlobalTotals = useMemo(() => {
    const cohortKey = (s) => `${s.selected_year}|${s.selected_branch}|${s.section || 'N/A'}`;
    const cohortInfo = {};
    const studentMap = {};

    const ensureCohort = (key) => {
      if (!cohortInfo[key]) {
        cohortInfo[key] = { ids: {}, rolls: new Set(), sessions: new Set(), extraTotal: 0 };
      }
      return cohortInfo[key];
    };

    authorizedStudents.forEach((s) => {
      const key = cohortKey(s);
      ensureCohort(key);
      studentMap[s.id] = { cohortKey: key };
      cohortInfo[key].ids[s.id] = 0;
      cohortInfo[key].rolls.add(String(s.roll_number || s.roll_no || s.id));
    });

    attendanceRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        const key = studentMap[r.student_id].cohortKey;
        cohortInfo[key].ids[r.student_id] += 1;
      }
    });

    const studentTotalClasses = {};
    attendanceRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        studentTotalClasses[r.student_id] = (studentTotalClasses[r.student_id] || 0) + 1;
      }
    });

    const cohortAcademicMax = {};
    authorizedStudents.forEach((s) => {
      const key = cohortKey(s);
      cohortAcademicMax[key] = Math.max(cohortAcademicMax[key] || 0, studentTotalClasses[s.id] || 0);
    });

    const rollToStudent = {};
    authorizedStudents.forEach((s) => {
      rollToStudent[String(s.roll_number || s.roll_no || s.id)] = s;
    });

    extraAttendanceRecords.forEach((row) => {
      const roll = String(row.student_roll);
      const student = rollToStudent[roll];
      if (!student) return;
      const key = cohortKey(student);

      let p = parseInt(row.duration_periods, 10);
      p = (!isNaN(p) && p > 0) ? p : (row.is_full_day ? 7 : 1);

      const sessionKey = `${row.date}_${row.activity_type}_${row.start_time || 'fullday'}`;

      if (!cohortInfo[key].sessions.has(sessionKey)) {
        cohortInfo[key].sessions.add(sessionKey);
        cohortInfo[key].extraTotal += p;
      }
    });

    const studentGrandTotal = {};
    authorizedStudents.forEach((s) => {
      const key = cohortKey(s);
      studentGrandTotal[s.id] = (cohortAcademicMax[key] || 0) + (cohortInfo[key]?.extraTotal || 0);
    });

    return { studentGrandTotal };
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

    const rollToStudent = {};
    authorizedStudents.forEach((s) => {
      if (s.roll_number != null) rollToStudent[String(s.roll_number)] = s;
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
      const student = rollToStudent[roll];
      if (!student) return;
      const sid = student.id;
      if (!studentMap[sid]) return;
      let p = parseInt(row.duration_periods, 10);
      p = (!isNaN(p) && p > 0) ? p : (row.is_full_day ? 7 : 1);
      const isPresent = row.status === true || row.status === 'P' || row.status === 'PRESENT';
      if (isPresent) {
        studentMap[sid].studentSpecificExtraAttended += p;
      }
    });

    const { studentGrandTotal } = sectionGlobalTotals;

    return Object.values(studentMap)
      .map((s) => {
        const grandTotal = studentGrandTotal[s.id] ?? 0;
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
        const rollA = String(a.roll_number || a.roll_no || a.id || '').trim();
        const rollB = String(b.roll_number || b.roll_no || b.id || '').trim();
        const rollCompare = rollA.localeCompare(rollB, undefined, { numeric: true });
        return rollCompare !== 0 ? rollCompare : a.percentage - b.percentage;
      });
  }, [authorizedStudents, attendanceRecords, extraAttendanceRecords, sectionGlobalTotals]);

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
          setExtraAttendanceRecords([]);
          return;
        }

        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('status, student_id, attendance_sessions!inner(*)')
          .in('student_id', studentIds);

        if (recordsError) throw recordsError;
        setAttendanceRecords(recordsData || []);

        const studentRolls = (studentsData || [])
          .map((s) => s.roll_number)
          .filter(Boolean);
        if (studentRolls.length > 0) {
          const { data: extraData, error: extraError } = await supabase
            .from('extra_attendance')
            .select('student_roll, activity_type, status, date, duration_periods, is_full_day, start_time')
            .in('student_roll', studentRolls);

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

  const handleExportExcel = async (calculatedWeek = 1, dateFrom = '', dateTo = '', semHeading = semesterHeading) => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const sectionLabel = filterSection === 'All' ? 'All' : filterSection;
      const yearLabel = filterYear === 'All' ? '' : filterYear;
      const branchLabel =
        filterBranch === 'IT' ? 'INFORMATION TECHNOLOGY' : filterBranch === 'All' ? 'All Departments' : filterBranch;
      const branchList = filterBranch === 'All' ? availableBranchesList : [filterBranch];

      if (!branchList || branchList.length === 0) {
        alert('Please select a department to export the report.');
        return;
      }

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

      const theorySubs = allSubjects.filter((s) => s.type === 'theory');
      const skillSubs = allSubjects.filter((s) => s.type === 'skill');
      const labSubs = allSubjects.filter((s) => s.type === 'practical');
      const academicSubs = [...theorySubs, ...skillSubs, ...labSubs];

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

      const studentIds = reportStudents.map((s) => s.id);
      const { data: recordsData, error: recordsError } = await supabase
        .from('attendance_records')
        .select('student_id, status, attendance_sessions!inner(*)')
        .in('student_id', studentIds);
      if (recordsError) throw recordsError;

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

      const A_COL = labEnd + 1;
      const A_PCT_COL = A_COL + 1;
      const EXTRA_START = A_PCT_COL + 1;
      const EXTRA_END = EXTRA_START + extraCategories.length - 1;
      const B_COL = EXTRA_END + 1;
      const C_COL = B_COL + 1;
      const OVERALL_COL = C_COL + 1;
      const TOTAL_COLS = OVERALL_COL + 1;

      const emptyRow = () => new Array(TOTAL_COLS).fill('');
      const bannerRow = emptyRow();
      const facultyRow = emptyRow();
      const subjectRow = emptyRow();
      const codeRow = emptyRow();
      const totalClassRow = emptyRow();

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

      facultyRow[LABEL_COL] = 'FACULTY NAME';
      subjectRow[LABEL_COL] = 'SUBJECT NAME';
      codeRow[LABEL_COL] = 'SUBJECT CODE';
      totalClassRow[LABEL_COL] = 'TOTAL CLASS';

      academicSubs.forEach((sub, i) => {
        const col = SUBJ_START + i;
        facultyRow[col] = sub.facultyName ? getFacultyInitials(sub.facultyName) : '?';
        subjectRow[col] = getSubjectInitials(sub.name);
        codeRow[col] = sub.code || 'N/A';
        totalClassRow[col] = maxAcademicPerSubject[sub.id] || 0;
      });

      codeRow[A_COL] = 'TOTAL';
      codeRow[B_COL] = 'TOTAL';
      codeRow[C_COL] = 'GRAND TOTAL';

      extraCategories.forEach((cat, i) => {
        facultyRow[EXTRA_START + i] = cat;
      });

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

              const sessionKey = `${row.date}_${act}_${row.start_time || 'fullday'}`;
              if (!uniqueSessions.has(sessionKey)) {
                  uniqueSessions.add(sessionKey);
                  if (conductedMap[act] !== undefined) conductedMap[act] += p;
              }

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

      const sectionTotalAcademicConducted = academicSubs.reduce(
        (sum, sub) => sum + (maxAcademicPerSubject[sub.id] || 0),
        0
      );
      const sectionGrandTotalConducted = sectionTotalAcademicConducted + sectionTotalExtraConducted;

      totalClassRow[A_COL] = sectionTotalAcademicConducted;
      totalClassRow[A_PCT_COL] = sectionTotalAcademicConducted > 0
        ? Math.round((sectionTotalAcademicConducted / sectionTotalAcademicConducted) * 100)
        : 0;

      totalClassRow[EXTRA_START] = conductedMap['Extra Class'] || 0;
      totalClassRow[EXTRA_START + 1] = conductedMap['Extra Curricular'] || 0;
      totalClassRow[EXTRA_START + 2] = conductedMap['Sports'] || 0;
      totalClassRow[EXTRA_START + 3] = conductedMap['Research'] || 0;
      totalClassRow[EXTRA_START + 4] = conductedMap['Placement'] || 0;
      totalClassRow[EXTRA_START + 5] = conductedMap['Skill Development'] || 0;
      totalClassRow[EXTRA_START + 6] = conductedMap['Mentor Mentee Meeting'] || 0;
      totalClassRow[EXTRA_START + 7] = conductedMap['Community Development'] || 0;
      totalClassRow[EXTRA_START + 8] = conductedMap['WEC'] || 0;

      totalClassRow[B_COL] = sectionTotalExtraConducted;
      totalClassRow[C_COL] = sectionGrandTotalConducted;
      totalClassRow[OVERALL_COL] = 100;

      const rows = reportStudents.map((s) => {
        const tally = studentTally[s.id];
        let academicAttended = 0;
        const subjectCells = academicSubs.map((sub) => {
          const c = tally[sub.id] || { total: 0, present: 0 };
          academicAttended += c.present;
          return c.present;
        });
        const academicTotal = academicAttended;
        const roll = String(s.roll_number || s.id);
        const extraCells = extraCategories.map((cat) => studentExtraData[roll]?.[cat] || 0);
        const extraTotal = extraCells.reduce((sum, val) => sum + val, 0);
        const grandTotal = academicTotal + extraTotal;
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
          '',
          ...subjectCells,
          academicTotal,
          `${aPercentage}%`,
          ...extraCells,
          extraTotal,
          grandTotal,
          `${overallPct}%`,
        ];
      });

      const blueStyle = {
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
        ['BUDDHA INSTITUTE OF TECHNOLOGY, GORAKHPUR'],
        [semHeading || 'Semester Heading Not Set'],
        ['Attendance Sheet'],
        [`MENTOR NAME: ${mentorName}`],
        [`DEPARTMENT NAME : ${branchLabel}`],
        [`CLASS - ${yearLabel} (4th Sem. - ${sectionLabel} )`],
        [`WEEK NO - ${calculatedWeek || ''}`],
        [`DATE FROM - ${formatDate(dateFrom)} to ${formatDate(dateTo)}`],
        bannerRow,
        facultyRow,
        subjectRow,
        codeRow,
        styledTotalRow,
        ...rows,
      ];

      const HEADER_ROW = 8;
      const HEADER_END = HEADER_ROW + 4;

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const merges = [];
      const pushMerge = (r1, c1, r2, c2) => {
        if (c1 > c2 || r1 > r2) return;
        merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
      };

      pushMerge(0, 0, 0, TOTAL_COLS - 1);
      pushMerge(1, 0, 1, TOTAL_COLS - 1);
      pushMerge(2, 0, 2, TOTAL_COLS - 1);
      pushMerge(3, 0, 3, TOTAL_COLS - 1);
      pushMerge(4, 0, 4, TOTAL_COLS - 1);
      pushMerge(5, 0, 5, TOTAL_COLS - 1);
      pushMerge(6, 0, 6, TOTAL_COLS - 1);
      pushMerge(7, 0, 7, TOTAL_COLS - 1);
      pushMerge(HEADER_ROW, ROLL_COL, HEADER_END, ROLL_COL);
      pushMerge(HEADER_ROW, NAME_COL, HEADER_END, NAME_COL);
      if (theorySubs.length > 0) pushMerge(HEADER_ROW, theoryStart, HEADER_ROW, theoryEnd);
      if (skillSubs.length > 0) pushMerge(HEADER_ROW, skillStart, HEADER_ROW, skillEnd);
      if (labSubs.length > 0) pushMerge(HEADER_ROW, labStart, HEADER_ROW, labEnd);
      pushMerge(HEADER_ROW, A_COL, HEADER_ROW + 2, A_COL);
      pushMerge(HEADER_ROW, A_PCT_COL, HEADER_END - 1, A_PCT_COL);
      pushMerge(HEADER_ROW, EXTRA_START, HEADER_ROW, EXTRA_END);
      extraCategories.forEach((_, i) => pushMerge(HEADER_ROW + 1, EXTRA_START + i, HEADER_END - 1, EXTRA_START + i));
      pushMerge(HEADER_ROW, B_COL, HEADER_ROW + 2, B_COL);
      pushMerge(HEADER_ROW, C_COL, HEADER_ROW + 2, C_COL);
      pushMerge(HEADER_ROW, OVERALL_COL, HEADER_END - 1, OVERALL_COL);
      ws['!merges'] = merges;

      const thinBorder = {
        top: { style: 'thin', color: { rgb: 'FF000000' } },
        bottom: { style: 'thin', color: { rgb: 'FF000000' } },
        left: { style: 'thin', color: { rgb: 'FF000000' } },
        right: { style: 'thin', color: { rgb: 'FF000000' } },
      };

      const bg = (rgb) => ({ rgb: `FF${rgb.replace('#', '')}` });
      const fill = (rgb) => ({ patternType: 'solid', fgColor: bg(rgb) });

      const COLORS = {
        PEACH: '#F8CBAD',
        LIGHT_BLUE: '#B4C6E7',
        LIGHT_YELLOW: '#FFF2CC',
        YELLOW: '#FFD966',
        LIGHT_ORANGE: '#FCE4D6',
        LIGHT_GREEN: '#E2EFDA',
        SOLID_ORANGE: '#F4B084',
        LAVENDER: '#E4DFEC',
        CYAN: '#9BC2E6',
        GOLD: '#FFC000',
        TEAL: '#4BACC6',
      };

      const colColor = new Array(TOTAL_COLS).fill(null);
      colColor[ROLL_COL] = COLORS.YELLOW;
      colColor[NAME_COL] = COLORS.YELLOW;
      colColor[LABEL_COL] = COLORS.YELLOW;
      for (let i = theoryStart; i <= theoryEnd; i += 1) colColor[i] = COLORS.LIGHT_ORANGE;
      for (let i = skillStart; i <= skillEnd; i += 1) colColor[i] = COLORS.LIGHT_GREEN;
      for (let i = labStart; i <= labEnd; i += 1) colColor[i] = COLORS.SOLID_ORANGE;
      colColor[A_COL] = COLORS.LIGHT_YELLOW;
      colColor[A_PCT_COL] = COLORS.LIGHT_YELLOW;
      for (let i = EXTRA_START; i <= EXTRA_END; i += 1) colColor[i] = COLORS.LAVENDER;
      colColor[B_COL] = COLORS.LIGHT_YELLOW;
      colColor[C_COL] = COLORS.GOLD;
      colColor[OVERALL_COL] = COLORS.TEAL;

      const metaRowFill = {
        0: COLORS.PEACH,
        1: COLORS.LIGHT_BLUE,
        2: COLORS.LIGHT_YELLOW,
      };

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
    const exactStart = new Date(startDate);
    const startDayOfWeek = exactStart.getDay();
    const daysToSubtract = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const snappedStart = new Date(exactStart);
    snappedStart.setDate(exactStart.getDate() - daysToSubtract);
    snappedStart.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(end - snappedStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const calculatedWeek = Math.ceil((diffDays + 1) / 7) || 1;

    await handleExportExcel(calculatedWeek, startDate, endDate);
    setIsExportModalOpen(false);
    setStartDate(semesterStartDate || '');
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
              {availableYearsList.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              style={filterSelectStyle}
              disabled={filterYear === 'All'}
            >
              <option value="All">All Departments</option>
              {availableDepartmentsList.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              style={filterSelectStyle}
              disabled={filterYear === 'All' || filterDepartment === 'All'}
            >
              <option value="All">All Branches</option>
              {availableBranchesList.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              style={{ ...filterSelectStyle, opacity: (filterYear === 'All' || filterBranch === 'All' || availableSections.length === 0) ? 0.5 : 1 }}
              disabled={filterYear === 'All' || filterBranch === 'All' || availableSections.length === 0}
            >
              <option value="All">All Sections</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
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
          College Attendance Analytics
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
          <div className="hod-card" style={{ marginBottom: '1.25rem' }}>
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
                      : 'No attendance records found.'}
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
                  Subject-wise & Week-wise Attendance Breakdown
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

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginBottom: '6px' }}>
                  Date From
                </label>
                <input
                  type="date"
                  value={startDate}
                  readOnly={true}
                  className="glass-input bg-slate-800 text-slate-400 cursor-not-allowed"
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

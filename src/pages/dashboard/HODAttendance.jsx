import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import { ArrowUpRight } from 'lucide-react';
import * as XLSX from 'xlsx';
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [isExporting, setIsExporting] = useState(false);

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

  const studentStats = useMemo(() => {
    const studentMap = {};
    authorizedStudents.forEach((s) => {
      studentMap[s.id] = {
        id: s.id,
        full_name: s.full_name || 'Unknown',
        roll_number: s.roll_number || 'N/A',
        total: 0,
        present: 0,
      };
    });

    // Aggregate per student: total_conducted (every record) and
    // total_attended (status 'P' / 'Present'). Matches the Student Portal
    // percentage formula: (total_attended / total_conducted) * 100.
    attendanceRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        studentMap[r.student_id].total += 1; // total_conducted
        const status = String(r.status || '').toUpperCase();
        if (status === 'P' || status === 'PRESENT') {
          studentMap[r.student_id].present += 1; // total_attended
        }
      }
    });

    return Object.values(studentMap)
      .map((s) => ({
        ...s,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      }))
      .sort((a, b) => a.percentage - b.percentage);
  }, [authorizedStudents, attendanceRecords]);

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
          .select('status, student_id')
          .in('student_id', studentIds);

        if (recordsError) throw recordsError;
        setAttendanceRecords(recordsData || []);
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

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const yearLabel = filterYear === 'All' ? 'All Years' : filterYear;
      const branchLabel = filterBranch === 'All' ? 'All Departments' : filterBranch;
      const sectionLabel = filterSection === 'All' ? 'All' : filterSection;

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
        if (!cell) return; // subject not part of this report's columns

        const sessIsTheory = normType(sess.type) === 'theory';
        const sessSection = normSection(sess.section || sess.batch);
        // Theory counts for everyone; Lab counts only for its specific section
        // (or a universally-marked 'ALL' lab), and when no section is recorded.
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

      // Total sessions conducted per subject (the denominator for the
      // TOTAL CLASS header row). Uses the same section-inclusion rule as the
      // per-student tally above.
      const subjectConducted = {};
      academicSubs.forEach((sub) => {
        subjectConducted[sub.id] = 0;
      });
      (recordsData || []).forEach((rec) => {
        const sess = rec.attendance_sessions;
        if (!sess || !sess.subject_id) return;
        if (!Object.prototype.hasOwnProperty.call(subjectConducted, sess.subject_id)) return;
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
        subjectConducted[sess.subject_id] += 1;
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
        'Mentor Mentee',
        'Community Dev',
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

      const A_COL = labEnd + 1; // (A) ACADEMIC
      const EXTRA_START = A_COL + 1;
      const EXTRA_END = EXTRA_START + extraCategories.length - 1;
      const B_COL = EXTRA_END + 1; // (B) EXTRA
      const C_COL = B_COL + 1; // C = (A+B)
      const OVERALL_COL = C_COL + 1; // OVERALL %
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
      bannerRow[A_COL] = '(A) ACADEMIC';
      bannerRow[EXTRA_START] = 'Extra Attendance';
      bannerRow[B_COL] = '(B) EXTRA';
      bannerRow[C_COL] = 'C = (A+B) GRAND TOTAL';
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
        totalClassRow[col] = subjectConducted[sub.id] || 0;
      });

      // Extra Attendance sub-categories listed under the banner (row 5).
      extraCategories.forEach((cat, i) => {
        facultyRow[EXTRA_START + i] = cat;
      });

      // Data rows: attended sessions per subject, the academic/extra/grand
      // totals, and the overall percentage.
      const rows = reportStudents.map((s) => {
        const tally = studentTally[s.id];
        let academicAttended = 0;
        let studentConducted = 0;
        const subjectCells = academicSubs.map((sub) => {
          const c = tally[sub.id] || { total: 0, present: 0 };
          academicAttended += c.present;
          studentConducted += c.total;
          return c.present;
        });
        const academicTotal = academicAttended; // (A) ACADEMIC
        const extraCells = extraCategories.map(() => 0); // hardcoded for now
        const extraTotal = 0; // (B) EXTRA
        const grandTotal = academicTotal + extraTotal; // C = (A+B)
        const overallPct =
          studentConducted > 0 ? Math.round((grandTotal / studentConducted) * 100) : 0;
        return [
          s.roll_number || 'N/A',
          s.full_name || 'Unknown',
          '', // row-label column (blank in data rows)
          ...subjectCells,
          academicTotal,
          ...extraCells,
          extraTotal,
          grandTotal,
          `${overallPct}%`,
        ];
      });

      const aoa = [
        ['BUDDHA INSTITUTE OF TECHNOLOGY, GORAKHPUR'],
        [`Department: ${branchLabel}`],
        [`Class: ${yearLabel} - Section ${sectionLabel}`],
        bannerRow, // Row 4 — main categories
        facultyRow, // Row 5 — faculty names
        subjectRow, // Row 6 — subject names
        codeRow, // Row 7 — subject codes
        totalClassRow, // Row 8 — total classes
        ...rows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Merges: title banner; ROLL NO. / STUDENT NAME vertical spans (rows 4-8);
      // THEORY / SD / LAB group banners; the single academic/extra/grand/overall
      // columns merged vertically; and the Extra Attendance sub-category columns
      // merged down so their names stay centered.
      const merges = [];
      const pushMerge = (r1, c1, r2, c2) => {
        if (c1 > c2 || r1 > r2) return;
        merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
      };

      pushMerge(0, 0, 0, TOTAL_COLS - 1); // title
      pushMerge(3, ROLL_COL, 7, ROLL_COL); // ROLL NO.
      pushMerge(3, NAME_COL, 7, NAME_COL); // STUDENT NAME
      if (theorySubs.length > 0) pushMerge(3, theoryStart, 3, theoryEnd);
      if (skillSubs.length > 0) pushMerge(3, skillStart, 3, skillEnd);
      if (labSubs.length > 0) pushMerge(3, labStart, 3, labEnd);
      pushMerge(3, A_COL, 7, A_COL);
      pushMerge(3, EXTRA_START, 3, EXTRA_END);
      extraCategories.forEach((_, i) => pushMerge(4, EXTRA_START + i, 7, EXTRA_START + i));
      pushMerge(3, B_COL, 7, B_COL);
      pushMerge(3, C_COL, 7, C_COL);
      pushMerge(3, OVERALL_COL, 7, OVERALL_COL);
      ws['!merges'] = merges;

      // Style the 5-tier header (rows 4-8) as centered, wrapped, bold cells.
      const headerStyle = {
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: 'FF1E293B' } },
      };
      for (let r = 3; r <= 7; r += 1) {
        for (let c = 0; c < TOTAL_COLS; c += 1) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (ws[ref]) ws[ref].s = { ...headerStyle };
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
      XLSX.writeFile(wb, 'Attendance_Report.xlsx');
    } catch (err) {
      console.error('Failed to export attendance Excel:', err);
      alert('Failed to export attendance report. ' + (err?.message || ''));
    } finally {
      setIsExporting(false);
    }
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
          onClick={handleExportExcel}
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

            <StudentAttendanceDetail studentId={selectedStudent.id} studentName={selectedStudent.name} />
          </div>
        </div>
      )}
    </div>
  );
}

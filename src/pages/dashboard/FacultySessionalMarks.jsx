import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';
import { useAuth } from '../../hooks/useAuth.js';

export default function FacultySessionalMarks() {
  const { user: authUser, profile: authProfile } = useAuth();
  const facultyName = authProfile?.full_name || authUser?.full_name || 'Faculty';

  const [mySubjects, setMySubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLabSubject, setSelectedLabSubject] = useState('');
  const [labStudents, setLabStudents] = useState([]);
  const [labSection, setLabSection] = useState('All');
  const [labGrades, setLabGrades] = useState({});
  const [isLabLoading, setIsLabLoading] = useState(false);
  const [isSavingLab] = useState(false);
  const [theoryExamStudents, setTheoryExamStudents] = useState([
    { id: 'dummy1', full_name: 'Anshu Prajapati', roll_number: '2301CS1001' },
    { id: 'dummy2', full_name: 'Anushka Singh', roll_number: '2301CS1002' },
    { id: 'dummy3', full_name: 'Rahul Sharma', roll_number: '2301CS1003' },
    { id: 'dummy4', full_name: 'Priya Patel', roll_number: '2301CS1004' },
    { id: 'dummy5', full_name: 'Akash Gupta', roll_number: '2301CS1005' },
    { id: 'dummy6', full_name: 'Neha Verma', roll_number: '2301CS1006' },
  ]);
  const [theoryExamGrades, setTheoryExamGrades] = useState({});
  const [theoryExamSubject, setTheoryExamSubject] = useState('');
  const [theoryExamSection, setTheoryExamSection] = useState('All');
  const [isTheoryExamLoading, setIsTheoryExamLoading] = useState(false);
  const [isSavingTheoryExam] = useState(false);
  const [activeTab, setActiveTab] = useState('tes');
  const [exportSubjectId, setExportSubjectId] = useState('');
  const [exportSection, setExportSection] = useState('All');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [subjectsRes] = await Promise.all([
          supabase.from('subjects').select('*').eq('faculty_id', user.id),
        ]);

        if (subjectsRes.error) throw subjectsRes.error;

        if (!cancelled) {
          setMySubjects(subjectsRes.data || []);
          if (subjectsRes.data && subjectsRes.data.length > 0 && !exportSubjectId) {
            setExportSubjectId(subjectsRes.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load assignments data:', err);
        toast.error('Failed to load assignments data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [exportSubjectId]);

  const autoFetchAttendance = async (subjectId, studentsList) => {
    try {
      const { data: attendanceData, error } = await supabase
        .from('attendance_records')
        .select('student_id, status, attendance_sessions!inner(subject_id, date)')
        .eq('attendance_sessions.subject_id', subjectId);

      if (error) throw error;
      if (!attendanceData || attendanceData.length === 0) {
        const emptyMap = {};
        studentsList.forEach((s) => { emptyMap[s.id] = { total_classes: 0, attended_classes: 0 }; });
        return emptyMap;
      }

      const uniqueDates = new Set(
        attendanceData
          .map((record) => record.attendance_sessions?.date)
          .filter(Boolean)
      );
      const calculatedTotalClasses = uniqueDates.size;

      const attendanceMap = {};
      attendanceData.forEach((record) => {
        if (!attendanceMap[record.student_id]) {
          attendanceMap[record.student_id] = 0;
        }
        if (
          record.status === 'P' ||
          record.status === 'present' ||
          record.status === 'Present' ||
          record.status === true ||
          record.status === 'p'
        ) {
          attendanceMap[record.student_id] += 1;
        }
      });

      const result = {};
      studentsList.forEach((student) => {
        result[student.id] = {
          total_classes: calculatedTotalClasses,
          attended_classes: attendanceMap[student.id] || 0,
        };
      });

      return result;
    } catch (err) {
      console.error("Error auto-fetching attendance:", err);
      const emptyMap = {};
      studentsList.forEach((s) => { emptyMap[s.id] = { total_classes: 0, attended_classes: 0 }; });
      return emptyMap;
    }
  };

  const loadLabData = async (subjectId) => {
    setIsLabLoading(true);
    setLabGrades({});
    try {
      const currentSubject = mySubjects.find(s => s.id === subjectId) || {};

      const yearFilter = currentSubject?.year;
      const branchFilter = currentSubject?.department || currentSubject?.branch;

      let query = supabase
        .from('user_profiles')
        .select('id, full_name, roll_number, section');

      if (yearFilter) {
        query = query.eq('selected_year', yearFilter);
      }
      if (branchFilter) {
        query = query.eq('selected_branch', branchFilter);
      }

      const { data: students } = await query.eq('role', 'student');

      const validStudents = (students || []).filter(s => {
        if (!s.full_name) return false;
        const name = s.full_name.toLowerCase();
        return !(name.includes('dummy') || name.includes('test') || name.includes('demo') || name.includes('user'));
      });

      validStudents.sort((a, b) => String(a.roll_number).localeCompare(String(b.roll_number)));

      setLabStudents(validStudents);

      const studentsWithAttendance = await autoFetchAttendance(subjectId, validStudents);

      const { data: existing } = await supabase
        .from('lab_evaluations')
        .select('*')
        .eq('subject_id', subjectId);

      const gradesMap = {};
      (existing || []).forEach((row) => {
        const existingAttendance = studentsWithAttendance[row.student_id] || {};
        gradesMap[row.student_id] = {
          l1: row.l1 ?? '',
          l2: row.l2 ?? '',
          l3: row.l3 ?? '',
          l4: row.l4 ?? '',
          l5: row.l5 ?? '',
          l6: row.l6 ?? '',
          l7: row.l7 ?? '',
          l8: row.l8 ?? '',
          l9: row.l9 ?? '',
          l10: row.l10 ?? '',
          lt_marks: row.lt_marks ?? '',
          total_classes: existingAttendance.total_classes ?? '',
          attended_classes: existingAttendance.attended_classes ?? '',
          benefit_marks: row.benefit_marks ?? '',
        };
      });

      validStudents.forEach((student) => {
        if (!gradesMap[student.id]) {
          const att = studentsWithAttendance[student.id] || {};
          gradesMap[student.id] = {
            l1: '', l2: '', l3: '', l4: '', l5: '', l6: '', l7: '', l8: '', l9: '', l10: '',
            lt_marks: '',
            total_classes: att.total_classes ?? '',
            attended_classes: att.attended_classes ?? '',
            benefit_marks: '',
          };
        }
      });

      setLabGrades(gradesMap);
    } catch (err) {
      console.error('Failed to load lab data:', err);
      toast.error('Failed to load lab data.');
    } finally {
      setIsLabLoading(false);
    }
  };

  const handleLabSubjectChange = async (e) => {
    const value = e.target.value;
    setSelectedLabSubject(value);
    if (value) {
      await loadLabData(value);
    } else {
      setLabStudents([]);
      setLabGrades({});
    }
  };

  const handleLabGradeChange = (studentId, field, value) => {
    let finalValue = value;

    if (['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'].includes(field)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        if (num > 20) finalValue = 20;
        else if (num < 0) finalValue = 0;
      }
    }

    if (field === 'lt_marks') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        if (num > 20) finalValue = 20;
        else if (num < 0) finalValue = 0;
      }
    }

    if (field === 'benefit_marks') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        if (num > 25) finalValue = 25;
        else if (num < 0) finalValue = 0;
      }
    }

    setLabGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: finalValue },
    }));
  };

  const handleGridKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const currentInput = e.target;
    const currentRow = currentInput.closest('tr');
    if (!currentRow) return;

    const allInputs = Array.from(currentRow.querySelectorAll('input[type="number"]'));
    const currentIndex = allInputs.indexOf(currentInput);

    if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
      allInputs[currentIndex + 1].focus();
    } else {
      const nextRow = currentRow.nextElementSibling;
      if (nextRow) {
        const nextInputs = Array.from(nextRow.querySelectorAll('input[type="number"]'));
        if (nextInputs.length > 0) {
          nextInputs[0].focus();
        }
      }
    }
  };

  const saveLabRegister = async () => {
    if (!selectedLabSubject) return toast.error('Please select a subject first.');

    try {
      const payload = labStudents.map((student) => {
        const grades = labGrades[student.id] || {};
        const cleanNum = (val) => (val === '' || val === undefined || val === null) ? 0 : parseFloat(val);

        return {
          subject_id: selectedLabSubject,
          student_id: student.id,
          l1: cleanNum(grades.l1), l2: cleanNum(grades.l2), l3: cleanNum(grades.l3),
          l4: cleanNum(grades.l4), l5: cleanNum(grades.l5), l6: cleanNum(grades.l6),
          l7: cleanNum(grades.l7), l8: cleanNum(grades.l8), l9: cleanNum(grades.l9),
          l10: cleanNum(grades.l10),
          lt_marks: cleanNum(grades.lt_marks),
          total_classes: cleanNum(grades.total_classes),
          attended_classes: cleanNum(grades.attended_classes),
          benefit_marks: cleanNum(grades.benefit_marks),
        };
      });

      const { error } = await supabase
        .from('lab_evaluations')
        .upsert(payload, { onConflict: 'subject_id, student_id' });

      if (error) throw error;
      toast.success('Lab register saved successfully!');
    } catch (err) {
      console.error('Failed to save lab register:', err);
      toast.error(err?.message || 'Failed to save lab register. Please try again.');
    }
  };

  const handleExportLES = async () => {
    if (!selectedLabSubject) {
      toast.error('Please select a subject first.');
      return;
    }

    try {
      const currentSubject = mySubjects.find(s => s.id === selectedLabSubject) || {};

      const wsData = [
        ["BUDDHA INSTITUTE OF TECHNOLOGY"],
        ["EVEN SEMESTER (Feb to July 2025-26)"],
        ["LAB EVALUATION SHEET (LES)"],
        [`DEPARTMENT NAME : ${currentSubject.department || currentSubject.branch || "Information Technology"}`],
        [`FACULTY NAME - ${facultyName}`],
        [`CLASS - ${String(currentSubject.year || "").replace(" Year", "")} Year (Section: ${labSection})`],
        [`SUBJECT NAME - ${currentSubject.name || currentSubject.subject_name || "Unnamed"}`],
        [`SUBJECT CODE - ${currentSubject.subject_code || currentSubject.code || ""}`],
        ["SR. NO.", "Roll No.", "Students Name", "Lab Marks", "", "", "", "", "", "", "", "", "", "Total Lab Marks", "Final Lab Marks", "LT", "Final LT Marks", "Total Class", "Attended", "Attendance Marks", "Total", "Benefit", "Final Total"],
        ["", "", "Date", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "", "A", "LT", "B", "", "", "C", "(A+B+C)", "F", "(50)"],
        ["", "", "Max Marks", 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 200, 10, 20, 10, "", 100, 5, 25, 25, 50]
      ];

      const studentsToExport = labSection === 'All' ? labStudents : labStudents.filter(s => (s.section || '').toUpperCase() === labSection);

      studentsToExport.forEach((student, index) => {
        const g = labGrades[student.id] || {};
        const labs = ['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'];
        const filledLabs = labs.filter(key => g[key] !== '' && g[key] !== undefined && g[key] !== null).length;
        const totalLab = labs.reduce((sum, key) => sum + (Number(g[key]) || 0), 0);
        const maxLabTotal = filledLabs > 0 ? filledLabs * 20 : 0;
        const A = maxLabTotal > 0 ? Math.ceil((totalLab / maxLabTotal) * 10) : 0;
        const B = Math.ceil((Number(g.lt_marks) || 0) / 2);
        const totalClasses = Number(g.total_classes) || 0;
        const attendedClasses = Number(g.attended_classes) || 0;
        const percent = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
        let C = 0;
        if(percent > 80) C = 5; else if(percent > 60) C = 4; else if(percent > 40) C = 3; else if(percent > 20) C = 2; else if(percent > 0) C = 1;
        const benefit = Number(g.benefit_marks) || 0;
        const finalTotal = A + B + C + benefit;

        wsData.push([
          index + 1,
          student.roll_number || student.roll_no || "—",
          student.full_name,
          g.l1 ?? '', g.l2 ?? '', g.l3 ?? '', g.l4 ?? '', g.l5 ?? '',
          g.l6 ?? '', g.l7 ?? '', g.l8 ?? '', g.l9 ?? '', g.l10 ?? '',
          totalLab,
          A,
          g.lt_marks ?? '',
          B,
          Number(g.total_classes || student.total_classes || student.totalClass || student.total_class) || 0,
          Number(g.attended_classes || student.attended_classes || student.attendedClasses || student.attended || student.attended_class) || 0,
          C,
          A + B + C,
          benefit ?? '',
          finalTotal,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push(
        { s: { r: 0, c: 0 }, e: { r: 0, c: 22 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 22 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 22 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 22 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 22 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 22 } },
        { s: { r: 6, c: 0 }, e: { r: 6, c: 22 } },
        { s: { r: 7, c: 0 }, e: { r: 7, c: 22 } },
        { s: { r: 8, c: 3 }, e: { r: 8, c: 12 } },
        { s: { r: 8, c: 0 }, e: { r: 10, c: 0 } },
        { s: { r: 8, c: 1 }, e: { r: 10, c: 1 } },
        { s: { r: 8, c: 2 }, e: { r: 10, c: 2 } },
        { s: { r: 8, c: 13 }, e: { r: 9, c: 13 } },
        { s: { r: 8, c: 17 }, e: { r: 9, c: 17 } },
        { s: { r: 8, c: 18 }, e: { r: 9, c: 18 } }
      );

      ws['!cols'] = [
        { wch: 10 }, { wch: 15 }, { wch: 25 },
        { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
        { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
        { wch: 15 }, { wch: 10 },
        { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 8 }, { wch: 10 },
        { wch: 12 }, { wch: 8 }, { wch: 12 }
      ];

      const titleFill = { fgColor: { rgb: "FCE4D6" } };
      const subTitleFill = { fgColor: { rgb: "D9E1F2" } };
      const yellowFill = { fgColor: { rgb: "FFE699" } };
      const orangeFill = { fgColor: { rgb: "F4B084" } };
      const greenFill = { fgColor: { rgb: "A9D08E" } };
      const purpleFill = { fgColor: { rgb: "B4A7D6" } };
      const lightGreenFill = { fgColor: { rgb: "E2EFDA" } };

      const thinBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let r = 0; r <= range.e.r; r++) {
        for (let c = 0; c <= range.e.c; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });

          if (!ws[cellRef]) {
            ws[cellRef] = { t: 's', v: '' };
          }

          ws[cellRef].s = { border: thinBorder, alignment: { horizontal: "center", vertical: "center", wrapText: true } };

          if (r === 0) {
            ws[cellRef].s.fill = titleFill;
            ws[cellRef].s.font = { bold: true, sz: 14 };
          } else if (r === 1 || r === 2) {
            ws[cellRef].s.fill = subTitleFill;
            ws[cellRef].s.font = { bold: true };
          } else if (r >= 3 && r <= 7) {
            ws[cellRef].s.font = { bold: true };
            ws[cellRef].s.alignment = { horizontal: "left", vertical: "center" };
          } else if (r >= 8 && r <= 10) {
            ws[cellRef].s.font = { bold: true };
            ws[cellRef].s.fill = yellowFill;

            if (c === 13) ws[cellRef].s.fill = purpleFill;
            if (c === 14 || c === 16 || c === 19) ws[cellRef].s.fill = greenFill;
            if (c === 15) ws[cellRef].s.fill = orangeFill;
            if (c === 20 || c === 22) ws[cellRef].s.fill = lightGreenFill;
          } else if (r >= 11) {
            if (c === 13) ws[cellRef].s.fill = purpleFill;
            if (c === 14 || c === 16 || c === 19) ws[cellRef].s.fill = greenFill;
            if (c === 20 || c === 22) ws[cellRef].s.fill = lightGreenFill;
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'LES');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `LES_Final_Sheet_Section_${labSection}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('LES Final Sheet exported successfully!');
    } catch (err) {
      console.error('Failed to export LES sheet:', err);
      toast.error('Failed to export LES sheet. Please try again.');
    }
  };

  const saveTutorialsRegister = async () => {
    if (!theoryExamSubject) return toast.error('Please select a subject first.');

    try {
      const payload = theoryExamStudents.map((student) => {
        const grades = theoryExamGrades[student.id] || {};
        const cleanNum = (val) => (val === '' || val === undefined || val === null) ? 0 : parseFloat(val);

        return {
          subject_id: theoryExamSubject,
          student_id: student.id,
          t1: cleanNum(grades.t1),
          t2: cleanNum(grades.t2),
          t3: cleanNum(grades.t3),
          t4: cleanNum(grades.t4),
          t5: cleanNum(grades.t5),
          t6: cleanNum(grades.t6),
          t7: cleanNum(grades.t7),
          t8: cleanNum(grades.t8),
          t9: cleanNum(grades.t9),
          t10: cleanNum(grades.t10),
        };
      });

      const { error } = await supabase
        .from('theory_exam_marks')
        .upsert(payload, { onConflict: 'student_id, subject_id' });

      if (error) throw error;
      toast.success('Tutorials register saved successfully!');
    } catch (err) {
      console.error('Failed to save tutorials register:', err);
      toast.error('Failed to save tutorials register. Please try again.');
    }
  };

  const handleExportTES = async () => {
    if (!exportSubjectId) {
      toast.error('Please select a subject first.');
      return;
    }
    setIsExporting(true);
    try {
      const currentSubject = mySubjects.find(s => s.id === exportSubjectId) || {};

      if (!currentSubject.id) throw new Error('Subject not found');

      // Fetch enrolled students for this subject (scoped by section if B1/B2)
      let studentQuery = supabase
        .from('user_profiles')
        .select('id, full_name, roll_number, section, selected_year, selected_branch')
        .eq('role', 'student')
        .eq('selected_year', currentSubject.year)
        .eq('selected_branch', currentSubject.department);

      if (exportSection === 'B1' || exportSection === 'B2') {
        studentQuery = studentQuery.eq('section', exportSection);
      }

      const { data: students, error: studentError } = await studentQuery;
      if (studentError) throw studentError;

      const validStudents = (students || [])
        .filter((s) => s.full_name && !/(dummy|test|demo|user)/i.test(s.full_name))
        .sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' }));

      const studentsWithAttendance = await autoFetchAttendance(exportSubjectId, validStudents);
      const studentsForExport = validStudents.map((student) => ({
        ...student,
        total_classes: studentsWithAttendance[student.id]?.total_classes || 0,
        attended_classes: studentsWithAttendance[student.id]?.attended_classes || 0,
      }));

      // Fetch theory exam marks for this subject (includes t1-t10, ct1, ct2, put, attendance, gp_marks, benefit_marks)
      const { data: theoryMarks, error: theoryError } = await supabase
        .from('theory_exam_marks')
        .select('*')
        .eq('subject_id', currentSubject.id);

      if (theoryError) throw theoryError;

      const theoryByStudent = {};
      (theoryMarks || []).forEach((row) => {
        theoryByStudent[row.student_id] = row;
      });

      // Step C: Build the comprehensive 2D array (AKTU TES format)
      const wsData = [
        ['BUDDHA INSTITUTE OF TECHNOLOGY'],
        ['EVEN SEMESTER (Feb to July 2025-26)'],
        ['THEORY EVALUATION SHEET (TES)'],
      [`DEPARTMENT NAME : ${currentSubject.department || currentSubject.branch || "Information Technology"}`],
      [`FACULTY NAME - ${facultyName}`],
      [`CLASS - ${String(currentSubject.year || "").replace(" Year", "")} Year (Section: ${exportSection})`],
      [`SUBJECT NAME - ${currentSubject?.subject_name || currentSubject?.name || ""}`],
      [`SUBJECT CODE - ${currentSubject?.subject_code || currentSubject?.code || ""}`]
      ];

      // Row 8: Main column groupings (empty strings allow horizontal merging)
      wsData.push([
        'SR. NO.',
        'Roll No.',
        'Students Name',
        'Tutorial / Assignment / Quiz (T/A/Q) Marks', '', '', '', '', '', '', '', '', '',
        'Total T/A/Q Marks',
        'Final T/A/Q Marks',
        'Evaluation Scheme', '', '', '', '', '',
        'Final Sessional Marks',
        'Total Class',
        '%',
        'Attendance Marks',
        'GP',
        'Total',
        'Benefit',
        'Final Total',
      ]);

      // Row 9: Sub-headers
      wsData.push([
        '',
        '',
        'Date',
        'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10',
        '',
        'A',
        'CT', 'Percentage', 'CT Internal', 'PUT', 'Percentage', 'PUT Internal',
        'B',
        '',
        '',
        'C',
        'D',
        '(A+B+C+D) E',
        'F',
        'E+F',
      ]);

      // Row 10: Max Marks
      const maxTotalClass = studentsForExport.length > 0 ? (Number(studentsForExport[0].total_classes) || 0) : 0;
      wsData.push([
        '',
        '',
        'Max Marks',
        10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
        100,
        5,
        30, 100, 10, 70, 100, 10,
        20,
        maxTotalClass,
        100,
        5,
        5,
        30,
        '',
        30,
      ]);

      // Step D: Map student rows
      studentsForExport.forEach((student, index) => {
        const tm = theoryByStudent[student.id] || {};

        // ---- Part A: T1-T10 from theory_exam_marks ----
        const studentMarks = ['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10'].map((t) => {
          const m = tm[t];
          return m === '' || m === null || m === undefined ? 0 : Number(m);
        });

        const totalTAQ = studentMarks.reduce((sum, m) => sum + m, 0);
        const finalTAQ = Math.ceil((totalTAQ * 5) / 100);

        // ---- Part B: Theory (CT/PUT) ----
        const ct1 = Number(tm.ct1) || 0;
        const ct2 = Number(tm.ct2) || 0;
        const put = Number(tm.put) || 0;
        const bestCt = Math.max(ct1, ct2);
        const ctPercentage = bestCt > 0 ? (bestCt * 100) / 30 : 0;
        const putPercentage = put > 0 ? (put * 100) / 70 : 0;
        const { ctInternal, putInternal, totalSessional } = getSessionalMarks(ct1, ct2, put);

        // ---- Part C: Attendance ----
        const totalC = Number(student.total_classes) || 0;
        const attC = Number(student.attended_classes) || 0;
        const attPerc = totalC > 0 ? Math.ceil((attC * 100) / totalC) : 0;
        const attendanceMarks = calculateAttendanceMarks(attC, totalC);

        // ---- Part D: GP ----
        const gpMarks = Number(tm.gp_marks) || 0;

        // ---- Totals ----
        const partE = Math.ceil(finalTAQ + totalSessional + attendanceMarks + gpMarks);
        const benefit = Number(tm.benefit_marks) || 0;
        const finalTotal = Math.ceil(partE + benefit);

        wsData.push([
          index + 1,
          student.roll_number || '',
          student.full_name,
          ...studentMarks,
          totalTAQ,
          finalTAQ,
          bestCt,
          ctPercentage.toFixed(1),
          ctInternal.toFixed(1),
          put,
          putPercentage.toFixed(1),
          putInternal.toFixed(1),
          totalSessional.toFixed(1),
          attC,                // Column W (Index 22): Attended Classes
          `${attPerc}%`,       // Column X (Index 23): Percentage
          attendanceMarks.toFixed(1),
          gpMarks.toFixed(1),
          partE,
          benefit,
          finalTotal,
        ]);
      });

      // Step E: Generate and download XLSX
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      const thinBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };

      const titleFill = { patternType: "solid", fgColor: { rgb: "FCE4D6" } };
      const subTitleFill = { patternType: "solid", fgColor: { rgb: "D9E1F2" } };
      const yellowFill = { patternType: "solid", fgColor: { rgb: "FFE699" } };
      const orangeFill = { patternType: "solid", fgColor: { rgb: "F4B084" } };
      const greenFill = { patternType: "solid", fgColor: { rgb: "A9D08E" } };
      const purpleFill = { patternType: "solid", fgColor: { rgb: "B4A7D6" } };
      const lightGreenFill = { patternType: "solid", fgColor: { rgb: "E2EFDA" } };

      const titleStyle = { font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" } };
      const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };

      const maxCols = 29;
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let r = 0; r <= range.e.r; r++) {
        for (let c = 0; c <= range.e.c; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });

          if (!ws[cellRef]) {
            ws[cellRef] = { t: 's', v: '' };
          }

          ws[cellRef].s = { border: thinBorder, alignment: { horizontal: "center", vertical: "center", wrapText: true } };

          if (r >= 3 && r <= 7) {
            ws[cellRef].s = { font: { bold: true }, alignment: { horizontal: "left", vertical: "center" }, border: thinBorder };
            continue;
          }

          if (r === 0) {
            ws[cellRef].s.fill = titleFill;
            ws[cellRef].s.font = { bold: true, sz: 14 };
          } else if (r === 1 || r === 2) {
            ws[cellRef].s.fill = subTitleFill;
            ws[cellRef].s.font = { bold: true };
          } else if (r === 8 || r === 9 || r === 10) {
            ws[cellRef].s.fill = yellowFill;
            if (c === 13) ws[cellRef].s.fill = purpleFill;
            else if (c === 14 || c === 21 || c === 24) ws[cellRef].s.fill = greenFill;
            else if (c >= 15 && c <= 20) ws[cellRef].s.fill = orangeFill;
            else if (c === 26 || c === 28) ws[cellRef].s.fill = lightGreenFill;
          } else if (r >= 11) {
            if (c === 13) ws[cellRef].s.fill = purpleFill;
            else if (c === 14 || c === 21 || c === 24) ws[cellRef].s.fill = greenFill;
            else if (c === 26 || c === 28) ws[cellRef].s.fill = lightGreenFill;
          }
        }
      }

      ws['!cols'] = [
        { wch: 18 },
        { wch: 22 },
        { wch: 25 },
        { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
        { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
        { wch: 10 },
        { wch: 10 },
        { wch: 6 }, { wch: 12 }, { wch: 12 },
        { wch: 6 }, { wch: 12 }, { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 6 },
        { wch: 12 },
        { wch: 6 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 }
      ];

      // Step E2: Apply cell merges matching the strict college template
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 28 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 28 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 28 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 28 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 28 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 28 } },
        { s: { r: 6, c: 0 }, e: { r: 6, c: 28 } },
        { s: { r: 7, c: 0 }, e: { r: 7, c: 28 } },
        { s: { r: 8, c: 3 }, e: { r: 8, c: 12 } },
        { s: { r: 8, c: 15 }, e: { r: 8, c: 20 } },
        { s: { r: 8, c: 0 }, e: { r: 10, c: 0 } },
        { s: { r: 8, c: 1 }, e: { r: 10, c: 1 } },
        { s: { r: 8, c: 2 }, e: { r: 10, c: 2 } },
        { s: { r: 8, c: 13 }, e: { r: 9, c: 13 } },
        { s: { r: 8, c: 22 }, e: { r: 9, c: 22 } },
        { s: { r: 8, c: 23 }, e: { r: 9, c: 23 } }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TES Final Sheet');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `TES_Final_Sheet_Section_${exportSection}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('TES Final Sheet exported successfully!');
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Failed to export TES sheet:', err);
      toast.error('Failed to export TES sheet. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };


  // AKTU slab conversion: convert a percentage into converted internal marks.
  const calculateSlabMark = (percentage) => {
    if (percentage >= 90) return 10;
    if (percentage >= 80) return 9;
    if (percentage >= 71) return 8.5;
    if (percentage >= 61) return 8;
    if (percentage >= 51) return 7.5;
    if (percentage >= 41) return 7;
    if (percentage >= 1) return 6;
    return 4; // minimum if 0 or absent
  };

  // Best CT (out of 30) -> 10 marks, PUT (out of 70) -> 10 marks.
  const getSessionalMarks = (ct1, ct2, put) => {
    const bestCt = Math.max(Number(ct1) || 0, Number(ct2) || 0);
    const ctPercentage = (bestCt * 100) / 30;
    const putPercentage = (Number(put) || 0) * 100 / 70;

    const ctInternal = (bestCt === 0 && ct1 !== 0 && ct2 !== 0) ? 4 : calculateSlabMark(ctPercentage);
    const putInternal = (Number(put) === 0) ? 4 : calculateSlabMark(putPercentage);

    return { ctInternal, putInternal, totalSessional: ctInternal + putInternal };
  };

  const calculateAttendanceMarks = (attended, total) => {
      if (!total || total === 0) return 0;
      // Math.ceil exactly replicates Excel's CEILING(val, 1)
      const percentage = Math.ceil((Number(attended) * 100) / Number(total));

      if (percentage >= 90) return 5;
      if (percentage >= 81) return 4.5;
      if (percentage >= 71) return 4;
      if (percentage >= 61) return 3.5;
      if (percentage >= 1) return 3;
      return 0;
  };

  const loadTheoryExamData = async (subjectId) => {
    setIsTheoryExamLoading(true);
    setTheoryExamGrades({});
    try {
      const { data: currentSubject, error: subjectError } = await supabase
        .from('subjects')
        .select('year, department')
        .eq('id', subjectId)
        .single();

      if (subjectError) throw subjectError;

      // Scope students to the selected subject's year + branch so that, e.g.,
      // 3rd-year students never appear when a 2nd-year subject is selected.
      // Subjects store `year` (e.g. "2nd Year") and `department` (branch code),
      // which map to user_profiles.selected_year / selected_branch.
      const { data: students, error: studentsError } = await supabase
        .from('user_profiles')
        .select('id, full_name, roll_number, section')
        .eq('role', 'student')
        .eq('selected_year', currentSubject.year)
        .eq('selected_branch', currentSubject.department);

      if (studentsError) throw studentsError;

      const validStudents = (students || []).filter(s => {
        if (!s.full_name) return false;
        const name = s.full_name.toLowerCase();
        return !(name.includes('dummy') || name.includes('test') || name.includes('demo') || name.includes('user'));
      }).sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' }));

      setTheoryExamStudents(validStudents);

      const studentsWithAttendance = await autoFetchAttendance(subjectId, validStudents);

      const { data: existing } = await supabase
        .from('theory_exam_marks')
        .select('*')
        .eq('subject_id', subjectId);

      const gradesMap = {};
      (existing || []).forEach((row) => {
        const existingAttendance = studentsWithAttendance[row.student_id] || {};
        gradesMap[row.student_id] = {
          t1: row.t1 ?? '',
          t2: row.t2 ?? '',
          t3: row.t3 ?? '',
          t4: row.t4 ?? '',
          t5: row.t5 ?? '',
          t6: row.t6 ?? '',
          t7: row.t7 ?? '',
          t8: row.t8 ?? '',
          t9: row.t9 ?? '',
          t10: row.t10 ?? '',
          ct1: row.ct1 ?? '',
          ct2: row.ct2 ?? '',
          put: row.put ?? '',
          total_classes_conducted: existingAttendance.total_classes ?? '',
          classes_attended: existingAttendance.attended_classes ?? '',
          gp_marks: row.gp_marks ?? '',
          benefit_marks: row.benefit_marks ?? '',
        };
      });

      validStudents.forEach((student) => {
        if (!gradesMap[student.id]) {
          const att = studentsWithAttendance[student.id] || {};
          gradesMap[student.id] = {
            t1: '', t2: '', t3: '', t4: '', t5: '', t6: '', t7: '', t8: '', t9: '', t10: '',
            ct1: '', ct2: '', put: '',
            total_classes_conducted: att.total_classes ?? '',
            classes_attended: att.attended_classes ?? '',
            gp_marks: '',
            benefit_marks: '',
          };
        }
      });

      setTheoryExamGrades(gradesMap);
    } catch (err) {
      console.error('Failed to load theory exam data:', err);
      toast.error('Failed to load theory exam data.');
    } finally {
      setIsTheoryExamLoading(false);
    }
  };

  const handleTheoryExamSubjectChange = async (e) => {
    const value = e.target.value;
    setTheoryExamSubject(value);
    if (value) {
      await loadTheoryExamData(value);
    } else {
      setTheoryExamStudents([
        { id: 'dummy1', full_name: 'Anshu Prajapati', roll_number: '2301CS1001' },
        { id: 'dummy2', full_name: 'Anushka Singh', roll_number: '2301CS1002' },
        { id: 'dummy3', full_name: 'Rahul Sharma', roll_number: '2301CS1003' },
        { id: 'dummy4', full_name: 'Priya Patel', roll_number: '2301CS1004' },
        { id: 'dummy5', full_name: 'Akash Gupta', roll_number: '2301CS1005' },
        { id: 'dummy6', full_name: 'Neha Verma', roll_number: '2301CS1006' },
      ]);
      setTheoryExamGrades({});
    }
  };

  const handleTheoryExamGradeChange = (studentId, field, value) => {
    let finalValue = value;

    if (['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'].includes(field)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        if (num > 10) finalValue = 10;
        else if (num < 0) finalValue = 0;
      }
    }

    if (field === 'gp_marks') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        if (num > 5) finalValue = 5;
        else if (num < 0) finalValue = 0;
      }
    }

    setTheoryExamGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: finalValue },
    }));
  };

  const saveTheoryExamRegister = async () => {
    if (!theoryExamSubject) return toast.error('Please select a subject first.');

    try {
      const payload = theoryExamStudents.map((student) => {
        const grades = theoryExamGrades[student.id] || {};
        const cleanNum = (val) => (val === '' || val === undefined || val === null) ? 0 : parseFloat(val);

        return {
          subject_id: theoryExamSubject,
          student_id: student.id,
          ct1: cleanNum(grades.ct1),
          ct2: cleanNum(grades.ct2),
          put: cleanNum(grades.put),
          total_classes_conducted: cleanNum(grades.total_classes_conducted),
          classes_attended: cleanNum(grades.classes_attended),
          gp_marks: cleanNum(grades.gp_marks),
          benefit_marks: cleanNum(grades.benefit_marks),
        };
      });

      const { error } = await supabase
        .from('theory_exam_marks')
        .upsert(payload, { onConflict: 'student_id, subject_id' });

      if (error) throw error;
      toast.success('Theory exam register saved successfully!');
    } catch (err) {
      console.error('Failed to save theory exam register:', err);
      toast.error('Failed to save theory exam register. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
        Loading assignments…
      </div>
    );
  }

  const exportModalSubjects = mySubjects.filter(sub => {
    const searchStr = `${sub.name || ''} ${sub.subject_name || ''}`.toLowerCase();
    const isLab = searchStr.includes('lab');
    return activeTab === 'les' ? isLab : !isLab;
  });

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: '#151623', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setActiveTab('tes')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'tes' ? '#6366f1' : 'transparent',
            color: activeTab === 'tes' ? 'white' : '#9ca3af',
            boxShadow: activeTab === 'tes' ? '0 4px 6px -1px rgba(99, 102, 241, 0.3)' : 'none',
          }}
          >
            Tutorials (TES)
          </button>
        <button
          type="button"
          onClick={() => setActiveTab('les')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'les' ? '#6366f1' : 'transparent',
            color: activeTab === 'les' ? 'white' : '#9ca3af',
            boxShadow: activeTab === 'les' ? '0 4px 6px -1px rgba(99, 102, 241, 0.3)' : 'none',
          }}
        >
          Lab Register (LES)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ctput')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'ctput' ? '#6366f1' : 'transparent',
            color: activeTab === 'ctput' ? 'white' : '#9ca3af',
            boxShadow: activeTab === 'ctput' ? '0 4px 6px -1px rgba(99, 102, 241, 0.3)' : 'none',
          }}
        >
          Theory Exams (CT/PUT)
        </button>
      </div>

      {activeTab === 'tes' && (
        <div style={{ backgroundColor: '#1c1d2e', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', whiteSpace: 'nowrap' }}>Select Subject:</label>
              <select
                value={theoryExamSubject}
                onChange={handleTheoryExamSubjectChange}
                style={{
                  flex: 1,
                  backgroundColor: '#11131f',
                  border: '1px solid #2d314d',
                  color: 'white',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                >
                  <option value="">-- Choose a subject --</option>
                  {mySubjects.filter((subject) => {
                    const name = (subject.name || subject.subject_name || '').toLowerCase();
                    const isLab = subject.type === 'practical' || name.includes('lab');
                    return !isLab;
                  }).map((subject) => {
                    const label = `${subject.name || subject.subject_name || 'Unnamed'} - ${subject.year || ''} (${subject.department || subject.branch || 'N/A'})`;
                    return (
                      <option key={subject.id} value={subject.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', whiteSpace: 'nowrap' }}>Select Section:</label>
              <select
                value={theoryExamSection}
                onChange={(e) => setTheoryExamSection(e.target.value)}
                style={{
                  backgroundColor: '#11131f',
                  border: '1px solid #2d314d',
                  color: 'white',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              >
                <option value="All">All</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={saveTutorialsRegister}
                disabled={!theoryExamSubject || isSavingTheoryExam}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: theoryExamSubject && !isSavingTheoryExam ? 'pointer' : 'not-allowed',
                  backgroundColor: theoryExamSubject && !isSavingTheoryExam ? '#059669' : '#4b5563',
                  color: 'white',
                  boxShadow: theoryExamSubject && !isSavingTheoryExam ? '0 10px 15px -3px rgba(5, 150, 105, 0.3)' : 'none',
                }}
              >
                Save Tutorials
              </button>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                disabled={!theoryExamSubject || isExporting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: theoryExamSubject && !isExporting ? 'pointer' : 'not-allowed',
                  backgroundColor: theoryExamSubject && !isExporting ? '#f59e0b' : '#4b5563',
                  color: 'white',
                  boxShadow: theoryExamSubject && !isExporting ? '0 10px 15px -3px rgba(245, 158, 11, 0.3)' : 'none',
                }}
              >
                Export TES Sheet
              </button>
            </div>
          </div>

          {!theoryExamSubject ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
              <p>Please select a subject to view the Tutorials Register.</p>
            </div>
          ) : isTheoryExamLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
              Loading tutorial data…
            </div>
          ) : theoryExamStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
              <p>No students found for this subject.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', borderRadius: '12px', border: '1px solid #2d314d' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', minWidth: '1250px' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#1c1d2e' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', borderRight: '1px solid #2d314d', minWidth: '160px' }}>Student Name</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '80px' }}>Roll Number</th>
                    {['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10'].map((t) => (
                      <th key={t} style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>T{parseInt(t.slice(1))} (Max 10)</th>
                    ))}
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b', borderBottom: '1px solid #2d314d', minWidth: '80px' }}>Total (100)</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#34d399', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>Final (5)</th>
                  </tr>
                </thead>
                <tbody>
                  {theoryExamStudents.filter((student) =>
                    theoryExamSection === 'All' ? true : (student.section || '').toUpperCase() === theoryExamSection,
                  ).map((student) => {
                    const g = theoryExamGrades[student.id] || {};
                    const tValues = ['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10'].map((t) => parseFloat(g[t]) || 0);
                    const total = tValues.reduce((a, b) => a + b, 0);
                    const final = Math.ceil((total * 5) / 100);

                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 24px', fontSize: '0.875rem', color: 'white', position: 'sticky', left: 0, backgroundColor: '#1c1d2e', zIndex: 10, fontWeight: '600' }}>
                          {student.full_name}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
                          {student.roll_number || '—'}
                        </td>
                        {['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10'].map((t) => (
                          <td key={t} style={{ padding: '12px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={g[t] ?? ''}
                              onChange={(e) => handleTheoryExamGradeChange(student.id, t, e.target.value)}
                              onKeyDown={handleGridKeyDown}
                              style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 'bold', color: '#fbbf24' }}>
                          {total}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 'bold', color: '#34d399' }}>
                          {final}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
        
         {activeTab === 'les' && (
        <div style={{ backgroundColor: '#1c1d2e', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', whiteSpace: 'nowrap' }}>Select Subject:</label>
              <select
                value={selectedLabSubject}
                onChange={handleLabSubjectChange}
                style={{
                  flex: 1,
                  backgroundColor: '#11131f',
                  border: '1px solid #2d314d',
                  color: 'white',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              >
                <option value="">-- Choose a subject --</option>
                {mySubjects.filter((subject) => {
                  const name = (subject.name || subject.subject_name || '').toLowerCase();
                  const isLab = subject.type === 'practical' || name.includes('lab');
                  return isLab;
                }).map((subject) => {
                  const label = `${subject.name || subject.subject_name || 'Unnamed'} - ${subject.year || ''} (${subject.department || subject.branch || 'N/A'})`;
                  return (
                    <option key={subject.id} value={subject.id}>
                      {label}
                    </option>
                  );
                })}
               </select>
               <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', whiteSpace: 'nowrap' }}>Select Section:</label>
               <select
                 value={labSection}
                 onChange={(e) => setLabSection(e.target.value)}
                 style={{
                   backgroundColor: '#11131f',
                   border: '1px solid #2d314d',
                   color: 'white',
                   padding: '10px 12px',
                   borderRadius: '8px',
                   fontSize: '0.875rem',
                   outline: 'none',
                   fontFamily: 'inherit',
                 }}
               >
                 <option value="All">All</option>
                 <option value="B1">B1</option>
                 <option value="B2">B2</option>
               </select>
             </div>
             <div style={{ display: 'flex', gap: '10px' }}>
               <button
                 type="button"
                 onClick={saveLabRegister}
                disabled={!selectedLabSubject || isSavingLab}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: selectedLabSubject && !isSavingLab ? 'pointer' : 'not-allowed',
                  backgroundColor: selectedLabSubject && !isSavingLab ? '#059669' : '#4b5563',
                  color: 'white',
                  boxShadow: selectedLabSubject && !isSavingLab ? '0 10px 15px -3px rgba(5, 150, 105, 0.3)' : 'none',
                }}
              >
                  Save Register
              </button>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={!selectedLabSubject || labStudents.length === 0}
                 style={{
                   display: 'inline-flex',
                   alignItems: 'center',
                   gap: '8px',
                   padding: '10px 20px',
                   borderRadius: '8px',
                   fontWeight: '600',
                   fontSize: '0.875rem',
                   border: 'none',
                   cursor: selectedLabSubject && labStudents.length > 0 ? 'pointer' : 'not-allowed',
                   backgroundColor: selectedLabSubject && labStudents.length > 0 ? '#f59e0b' : '#4b5563',
                   color: 'white',
                   boxShadow: selectedLabSubject && labStudents.length > 0 ? '0 10px 15px -3px rgba(245, 158, 11, 0.3)' : 'none',
                 }}
               >
                   Export LES Sheet
               </button>
            </div>
          </div>

          {!selectedLabSubject ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
              <p>Please select a subject to view the Lab Register.</p>
            </div>
          ) : isLabLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
              Loading lab data…
            </div>
          ) : labStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
              <p>No students found for this subject.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', borderRadius: '12px', border: '1px solid #2d314d' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', minWidth: '1500px' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#1c1d2e' }}>
                     <th style={{ position: 'sticky', left: 0, backgroundColor: '#1c1d2e', padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', borderRight: '1px solid #2d314d', minWidth: '160px' }}>Student Name</th>
                     <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '80px' }}>Roll Number</th>
                     <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L1</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L2</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L3</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L4</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L5</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L6</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L7</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L8</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L9</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>L10</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#34d399', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>Lab A (10)</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>LT</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#34d399', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>LT B (10)</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>Total Class</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>Attended</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#34d399', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>Att. C (5)</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>Benefit</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b', borderBottom: '1px solid #2d314d', minWidth: '90px' }}>Final (50)</th>
                  </tr>
                </thead>
                <tbody>
                  {labStudents.length === 0 ? (
                    <tr>
                       <td colSpan="20" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                         No students found.
                       </td>
                    </tr>
                  ) : (
                    labStudents.filter((student) =>
                      labSection === 'All' ? true : (student.section || '').toUpperCase() === labSection,
                    ).map((student) => {
                      const g = labGrades[student.id] || {};
                      const filledLabs = ['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'].filter(key => g[key] !== '' && g[key] !== undefined && g[key] !== null).length;
                      const totalLab = ['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'].reduce((sum, key) => sum + (Number(g[key]) || 0), 0);
                      const maxLabTotal = filledLabs > 0 ? filledLabs * 20 : 0;
                      const A = maxLabTotal > 0 ? Math.ceil((totalLab / maxLabTotal) * 10) : 0;
                      const B = Math.ceil((Number(g.lt_marks) || 0) / 2);
                      const totalClasses = Number(g.total_classes) || 0;
                      const attendedClasses = Number(g.attended_classes) || 0;
                      const percent = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
                      let C = 0;
                      if(percent > 80) C = 5; else if(percent > 60) C = 4; else if(percent > 40) C = 3; else if(percent > 20) C = 2; else if(percent > 0) C = 1;
                      const benefit = Number(g.benefit_marks) || 0;
                      const finalInternal = A + B + C + benefit;

                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 24px', fontSize: '0.875rem', color: 'white', position: 'sticky', left: 0, backgroundColor: '#1c1d2e', zIndex: 10, fontWeight: '600' }}>
                            {student.full_name}
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
                            {student.roll_number || student.roll_no || '—'}
                          </td>
                          {['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'].map((lab) => (
                            <td key={lab} style={{ padding: '12px 12px' }}>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={g[lab] ?? ''}
                                onChange={(e) => handleLabGradeChange(student.id, lab, e.target.value)}
                                onKeyDown={handleGridKeyDown}
                                style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                              />
                            </td>
                          ))}
                          <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 'bold', color: '#34d399' }}>
                            {A}
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={g.lt_marks ?? ''}
                              onChange={(e) => handleLabGradeChange(student.id, 'lt_marks', e.target.value)}
                              onKeyDown={handleGridKeyDown}
                              style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 'bold', color: '#34d399' }}>
                            {B}
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              value={g.total_classes ?? ''}
                              onChange={(e) => handleLabGradeChange(student.id, 'total_classes', e.target.value)}
                              onKeyDown={handleGridKeyDown}
                              style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              value={g.attended_classes ?? ''}
                              onChange={(e) => handleLabGradeChange(student.id, 'attended_classes', e.target.value)}
                              onKeyDown={handleGridKeyDown}
                              style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 'bold', color: '#34d399' }}>
                            {C}
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              max="25"
                              value={g.benefit_marks ?? ''}
                              onChange={(e) => handleLabGradeChange(student.id, 'benefit_marks', e.target.value)}
                              onKeyDown={handleGridKeyDown}
                              style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 'bold', color: '#fbbf24' }}>
                            {finalInternal}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

       {activeTab === 'ctput' && (
         <div style={{ backgroundColor: '#1c1d2e', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
               <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', whiteSpace: 'nowrap' }}>Select Subject:</label>
               <select
                 value={theoryExamSubject}
                 onChange={handleTheoryExamSubjectChange}
                 style={{
                   flex: 1,
                   backgroundColor: '#11131f',
                   border: '1px solid #2d314d',
                   color: 'white',
                   padding: '10px 12px',
                   borderRadius: '8px',
                   fontSize: '0.875rem',
                   outline: 'none',
                   fontFamily: 'inherit',
                 }}
               >
                <option value="">-- Choose a subject --</option>
                {mySubjects.filter((subject) => {
                  const name = (subject.name || subject.subject_name || '').toLowerCase();
                  const isLab = subject.type === 'practical' || name.includes('lab');
                  return !isLab;
                }).map((subject) => {
                  const label = `${subject.name || subject.subject_name || 'Unnamed'} - ${subject.year || ''} (${subject.department || subject.branch || 'N/A'})`;
                  return (
                    <option key={subject.id} value={subject.id}>
                      {label}
                    </option>
                  );
                })}
                </select>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', whiteSpace: 'nowrap' }}>Select Section:</label>
                <select
                  value={theoryExamSection}
                  onChange={(e) => setTheoryExamSection(e.target.value)}
                  style={{
                    backgroundColor: '#11131f',
                    border: '1px solid #2d314d',
                    color: 'white',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="All">All</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                </select>
              </div>
             <div style={{ display: 'flex', gap: '10px' }}>
               <button
                 type="button"
                 onClick={saveTheoryExamRegister}
                 disabled={!theoryExamSubject || isSavingTheoryExam}
                 style={{
                   display: 'inline-flex',
                   alignItems: 'center',
                   gap: '8px',
                   padding: '10px 20px',
                   borderRadius: '8px',
                   fontWeight: '600',
                   fontSize: '0.875rem',
                   border: 'none',
                   cursor: theoryExamSubject && !isSavingTheoryExam ? 'pointer' : 'not-allowed',
                   backgroundColor: theoryExamSubject && !isSavingTheoryExam ? '#059669' : '#4b5563',
                   color: 'white',
                   boxShadow: theoryExamSubject && !isSavingTheoryExam ? '0 10px 15px -3px rgba(5, 150, 105, 0.3)' : 'none',
                 }}
               >
                   Save Register
               </button>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={!theoryExamSubject || isExporting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: theoryExamSubject && !isExporting ? 'pointer' : 'not-allowed',
                    backgroundColor: theoryExamSubject && !isExporting ? '#f59e0b' : '#4b5563',
                    color: 'white',
                    boxShadow: theoryExamSubject && !isExporting ? '0 10px 15px -3px rgba(245, 158, 11, 0.3)' : 'none',
                  }}
                >
                    Export TES Sheet
                </button>
             </div>
           </div>

           {!theoryExamSubject ? (
             <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
               <p>Please select a subject to view the Theory Exam Register.</p>
             </div>
           ) : isTheoryExamLoading ? (
             <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
               Loading theory exam data…
             </div>
           ) : theoryExamStudents.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
               <p>No students found for this subject.</p>
             </div>
           ) : (
             <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', borderRadius: '12px', border: '1px solid #2d314d' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', minWidth: '1250px' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#1c1d2e' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', borderRight: '1px solid #2d314d', minWidth: '160px' }}>Student Name</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '80px' }}>Roll Number</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>CT1 (Max 30)</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>CT2 (Max 30)</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>PUT (Max 70)</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#34d399', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>CT Conv. (10)</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#34d399', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>PUT Conv. (10)</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#f59e0b', borderBottom: '1px solid #2d314d', minWidth: '90px' }}>Total Sessional (20)</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>Total Classes</th>
                       <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>Attended</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#34d399', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>Att. Marks (5)</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>GP (Max 5)</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>Benefit (F)</th>
                     </tr>
                  </thead>
                  <tbody>
                    {theoryExamStudents.length === 0 ? (
                       <tr>
                         <td colSpan="13" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                           No students found.
                         </td>
                       </tr>
                   ) : (
                      theoryExamStudents.filter((student) =>
                        theoryExamSection === 'All' ? true : (student.section || '').toUpperCase() === theoryExamSection,
                      ).map((student) => {
                         const g = theoryExamGrades[student.id] || {};
                        const ct1 = parseFloat(g.ct1) || 0;
                        const ct2 = parseFloat(g.ct2) || 0;
                        const put = parseFloat(g.put) || 0;
                        const { ctInternal, putInternal, totalSessional } = getSessionalMarks(ct1, ct2, put);
                        const attended = parseFloat(g.classes_attended) || 0;
                        const totalClasses = parseFloat(g.total_classes_conducted) || 0;
                        const attendanceMarks = calculateAttendanceMarks(attended, totalClasses);

                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px 24px', fontSize: '0.875rem', color: 'white', position: 'sticky', left: 0, backgroundColor: '#1c1d2e', zIndex: 10, fontWeight: '600' }}>
                              {student.full_name}
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
                              {student.roll_number || '—'}
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={g.ct1 ?? ''}
                                onChange={(e) => handleTheoryExamGradeChange(student.id, 'ct1', e.target.value)}
                                onKeyDown={handleGridKeyDown}
                                style={{ width: '70px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={g.ct2 ?? ''}
                                onChange={(e) => handleTheoryExamGradeChange(student.id, 'ct2', e.target.value)}
                                onKeyDown={handleGridKeyDown}
                                style={{ width: '70px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                              <input
                                type="number"
                                min="0"
                                max="70"
                                value={g.put ?? ''}
                                onChange={(e) => handleTheoryExamGradeChange(student.id, 'put', e.target.value)}
                                onKeyDown={handleGridKeyDown}
                                style={{ width: '70px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '12px 12px', fontWeight: 'bold', color: '#34d399', textAlign: 'center' }}>
                              {ctInternal.toFixed(1)}
                            </td>
                            <td style={{ padding: '12px 12px', fontWeight: 'bold', color: '#34d399', textAlign: 'center' }}>
                              {putInternal.toFixed(1)}
                            </td>
                            <td style={{ padding: '12px 24px', fontWeight: 'bold', color: '#f59e0b', textAlign: 'center' }}>
                              {totalSessional.toFixed(1)}
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={g.total_classes_conducted ?? ''}
                                  onChange={(e) => handleTheoryExamGradeChange(student.id, 'total_classes_conducted', e.target.value)}
                                  onKeyDown={handleGridKeyDown}
                                  style={{ width: '70px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                                />
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={g.classes_attended ?? ''}
                                  onChange={(e) => handleTheoryExamGradeChange(student.id, 'classes_attended', e.target.value)}
                                  onKeyDown={handleGridKeyDown}
                                  style={{ width: '70px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                                />
                            </td>
                            <td style={{ padding: '12px 12px', fontWeight: 'bold', color: '#34d399', textAlign: 'center' }}>
                              {attendanceMarks.toFixed(1)}
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  value={g.gp_marks ?? ''}
                                  onChange={(e) => handleTheoryExamGradeChange(student.id, 'gp_marks', e.target.value)}
                                  onKeyDown={handleGridKeyDown}
                                  style={{ width: '70px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                                />
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={g.benefit_marks ?? ''}
                                  onChange={(e) => handleTheoryExamGradeChange(student.id, 'benefit_marks', e.target.value)}
                                  onKeyDown={handleGridKeyDown}
                                  style={{ width: '70px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                                />
                            </td>
                          </tr>
                        );
                      })
                   )}
                 </tbody>
               </table>
             </div>
           )}
         </div>
          )}

          {isExportModalOpen && (
          <div
            onClick={() => setIsExportModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#1c1d2e',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', margin: '0 0 18px 0' }}>
                {activeTab === 'les' ? 'Generate LES Sheet (Lab Evaluation)' : 'Generate TES Sheet (Tutorial/Assignment/Quiz)'}
              </h3>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#d1d5db', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Subject
              </label>
               <select
                 value={exportSubjectId}
                 onChange={(e) => setExportSubjectId(e.target.value)}
                 style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', marginBottom: '16px' }}
               >
                 <option value="">-- Select Subject --</option>
                   {exportModalSubjects && exportModalSubjects.map((sub) => (
                     <option key={sub.id} value={sub.id}>
                       {`${sub.subject_name || sub.name} - ${String(sub.year || "").replace(" Year", "")} Year (${sub.department || sub.branch || ""})`}
                     </option>
                   ))}
               </select>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#d1d5db', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Section
              </label>
              <select
                value={exportSection}
                onChange={(e) => setExportSection(e.target.value)}
                style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', marginBottom: '24px' }}
              >
                <option value="All">All</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { if (activeTab === 'les') handleExportLES(); else handleExportTES(); setIsExportModalOpen(false); }}
                  disabled={isExporting}
                  style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: 'white', backgroundColor: isExporting ? '#4b5563' : '#f59e0b', border: 'none', cursor: isExporting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', boxShadow: isExporting ? 'none' : '0 10px 15px -3px rgba(245, 158, 11, 0.3)' }}
                >
                  {isExporting ? 'Exporting…' : 'Download Excel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

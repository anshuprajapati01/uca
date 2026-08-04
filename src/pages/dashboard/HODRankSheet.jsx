import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import { useHodContext } from '../../context/HodContext.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const YEAR_SEMESTER_MAP = {
  '1st': ['1st', '2nd'],
  '2nd': ['3rd', '4th'],
  '3rd': ['5th', '6th'],
  '4th': ['7th', '8th'],
};

function getYearKey(yearDescription) {
  const match = String(yearDescription || '').match(/\d+/);
  return match ? `${match[0]}${getOrdinalSuffix(Number(match[0]))}` : null;
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function getSemestersForYear(yearDescription) {
  const yearKey = getYearKey(yearDescription);
  if (!yearKey || !YEAR_SEMESTER_MAP[yearKey]) return [];
  return YEAR_SEMESTER_MAP[yearKey];
}

function useSafeHodContext() {
  try {
    return useHodContext();
  } catch {
    return {
      hodAuthorizedBranches: [],
      hodDepartmentsData: [],
      isAssigned: false,
      isLoading: false,
      refreshDepartments: () => {},
    };
  }
}

const getSubjectShortName = (code, name) => {
  const normalized = String(code).toUpperCase().replace('-', '');
  const codeMap = {
    'BCS401': 'OS',
    'BCS402': 'TAFL',
    'BCS403': 'OOPS',
    'BCC402': 'PP',
    'BAS401': 'TC',
    'BOE404': 'ESE'
  };
  return codeMap[normalized] || name.substring(0, 4).toUpperCase();
};

function HODRankSheet() {
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [examType, setExamType] = useState('CT1');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [academicSession, setAcademicSession] = useState('Jan-June 2026');
  const [selectedSection, setSelectedSection] = useState('B');

  const { hodAuthorizedBranches, hodDepartmentsData } = useSafeHodContext();

  const [subjects, setSubjects] = useState([]);
  const [rankData, setRankData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const availableYears = useMemo(
    () => [...new Set((hodDepartmentsData || []).map((d) => d.description))].filter(Boolean).sort(),
    [hodDepartmentsData]
  );

  const effectiveYear = year || (availableYears.length === 1 ? availableYears[0] : '');

  const availableBranches = useMemo(() => {
    const rows = (hodDepartmentsData || []).filter((d) => !effectiveYear || d.description === effectiveYear);
    const map = new Map();
    rows.forEach((d) => {
      const code = d.code || d.name;
      if (!map.has(code)) map.set(code, { id: code, code, name: d.name || code });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [hodDepartmentsData, effectiveYear]);

  const effectiveBranch =
    branch && availableBranches.some((b) => b.code === branch)
      ? branch
      : availableBranches.length === 1
        ? availableBranches[0].code
        : '';

  const availableSemesters = useMemo(
    () => getSemestersForYear(effectiveYear),
    [effectiveYear]
  );

  const effectiveSemester =
    semester && availableSemesters.includes(semester)
      ? semester
      : availableSemesters.length === 1
        ? availableSemesters[0]
        : '';

  const handleYearChange = (e) => {
    setYear(e.target.value);
    setBranch('');
    setSemester('');
    setRankData([]);
    setSubjects([]);
  };

  const handleBranchChange = (e) => {
    setBranch(e.target.value);
    setSemester('');
    setRankData([]);
    setSubjects([]);
  };

  const handleSemesterChange = (e) => {
    setSemester(e.target.value);
    setRankData([]);
    setSubjects([]);
  };

  const handleExamTypeChange = (e) => {
    setExamType(e.target.value);
    setRankData([]);
  };

  const examConfig = useMemo(() => {
    switch (examType) {
      case 'CT1':
        return { maxMarks: 30, column: 'ct1' };
      case 'CT2':
        return { maxMarks: 30, column: 'ct2' };
      case 'PUT':
        return { maxMarks: 70, column: 'put' };
      default:
        return { maxMarks: 30, column: 'ct1' };
    }
  }, [examType]);

  useEffect(() => {
    const fetchRankData = async () => {
      if (!year || !branch || !semester || !examType) return;

      setIsLoading(true);
      setSubjects([]);
      setRankData([]);
      try {
        const getDbBranch = (branchName) => {
          if (!branchName) return '';
          const b = branchName.toLowerCase();
          if (b.includes('information technology')) return 'IT';
          if (b.includes('computer science')) return 'CS';
          if (b.includes('electronics')) return 'EC';
          if (b.includes('mechanical')) return 'ME';
          if (b.includes('civil')) return 'CE';
          return branchName;
        };
        const dbBranch = getDbBranch(effectiveBranch);

        const semNum = semester.replace(/\D/g, '');
        const yrNum = year.replace(/\D/g, '');
        const dbBranchLower = dbBranch.toLowerCase();

        const { data: rawSubjects, error: subError } = await supabase
          .from('subjects')
          .select('*');

        if (subError) {
          toast.error("DB Error fetching subjects");
          setIsLoading(false);
          return;
        }

        const subjectsData = (rawSubjects || []).filter(sub => {
          const subCode = String(sub.code || '').toUpperCase().replace('-', '');

          const is4thSem = String(semester).includes('4');
          const isIT = String(branch).toLowerCase().includes('information technology') || String(dbBranch).toLowerCase() === 'it';

          if (is4thSem && isIT) {
            const validIT4thCodes = ['BCS401', 'BCS402', 'BCS403', 'BCC402', 'BAS401', 'BOE404'];
            return validIT4thCodes.includes(subCode);
          }

          const subSem = String(sub.semester || '').toLowerCase();
          const subYear = String(sub.year || '').toLowerCase();
          const subDept = String(sub.department || sub.branch || '').toLowerCase();

          const semMatch = subSem.includes(semNum) || subSem.includes(semester.toLowerCase()) || subSem === '';
          const yearMatch = subYear.includes(yrNum) || subYear.includes(year.toLowerCase().replace(' year', ''));
          const deptMatch = subDept.includes(dbBranchLower) || dbBranchLower === '';

          const isValidCode = subCode && subCode.trim() !== '' && subCode !== 'N/A' && subCode !== 'UNDEFINED';
          const subType = String(sub.type || '').toLowerCase();
          const isTheory = subType === 'theory' || (!subType && !subCode.match(/5[1-9]$/));

          return (semMatch || yearMatch) && deptMatch && isValidCode && isTheory;
        });

        const studentsRes = await supabase
          .from('user_profiles')
          .select('id, full_name, roll_number, section')
          .eq('role', 'student')
          .eq('selected_year', effectiveYear)
          .eq('selected_branch', effectiveBranch);

        if (studentsRes.error) throw studentsRes.error;
        const studentsData = studentsRes.data || [];

        if (!subjectsData || subjectsData.length === 0) {
          toast.error(`No subjects matched. (Total in DB: ${rawSubjects?.length || 0})`);
          setIsLoading(false);
          return;
        }
        if (!studentsData || studentsData.length === 0) {
          toast.error('No students found for this branch.');
          setIsLoading(false);
          return;
        }

        const validStudents = studentsData.filter((s) => s.full_name && !/(dummy|test|demo|user)/i.test(s.full_name));

        const sourceArray = typeof validStudents !== 'undefined' ? validStudents : students;
        let filteredStudents = [...sourceArray];

        if (selectedSection && !selectedSection.includes('All')) {
          const targetSec = selectedSection.toLowerCase().trim();

          const hasSectionData = sourceArray.length > 0 &&
            ('section' in sourceArray[0] || 'section_name' in sourceArray[0] || 'batch' in sourceArray[0] || 'Section' in sourceArray[0]);

          if (!hasSectionData) {
            console.warn("Section filtering aborted: Backend API is not sending section data.");
            toast.error("Backend is not sending section data! Showing all students.");
          } else {
            filteredStudents = filteredStudents.filter(student => {
              const sec = (student.section || '').toLowerCase().trim();
              return sec === targetSec;
            });
          }
        }

        const uniqueSubjects = [];
        const seenCodes = new Set();

        subjectsData.forEach(sub => {
          const normCode = String(sub.code || '').toUpperCase().trim();
          if (!seenCodes.has(normCode)) {
            seenCodes.add(normCode);
            uniqueSubjects.push(sub);
          }
        });

        setSubjects(uniqueSubjects);

        const studentIds = filteredStudents.map((s) => s.id);
        const subjectIds = uniqueSubjects.map((s) => s.id);

        const { data: marksData, error: marksError } = await supabase
          .from('theory_exam_marks')
          .select('*')
          .in('subject_id', subjectIds)
          .in('student_id', studentIds);

        if (marksError) throw marksError;

        const marksByStudentSubject = new Map();
        (marksData || []).forEach((row) => {
          marksByStudentSubject.set(`${row.student_id}|${row.subject_id}`, row);
        });

        const maxMarksPerSubject = examConfig.maxMarks;
        const examKey = examConfig.column;

        const processedData = filteredStudents.map((student) => {
          let total = 0;
          const studentMarks = {};

          uniqueSubjects.forEach((sub) => {
            const key = `${student.id}|${sub.id}`;
            const record = marksByStudentSubject.get(key);
            studentMarks[sub.id] = record && record[examKey] !== null && record[examKey] !== undefined && String(record[examKey]).trim() !== '' ? Number(record[examKey]) : 'A';
            if (studentMarks[sub.id] !== 'A') {
              total += studentMarks[sub.id];
            }
          });

          const maxTotal = uniqueSubjects.length * maxMarksPerSubject;
          const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
          const passFail = percentage >= 50 ? 'PASS' : 'FAIL';

          return {
            ...student,
            studentMarks,
            total,
            percentage,
            passFail,
          };
        });

        processedData.sort((a, b) => b.total - a.total);

        let currentRank = 1;
        for (let i = 0; i < processedData.length; i++) {
          if (i > 0 && processedData[i].total < processedData[i - 1].total) {
            currentRank = i + 1;
          }
          processedData[i].rank = currentRank;
        }

        setRankData(processedData);
      } catch (err) {
        console.error('Failed to generate rank sheet:', err);
        toast.error('Failed to generate rank sheet: ' + (err.message || err));
      } finally {
        setIsLoading(false);
      }
    };

    if (year && branch && semester && examType) {
      fetchRankData();
    }
  }, [year, branch, semester, examType, selectedSection]);

  // Determine available sections based on selected branch
  const getAvailableSections = () => {
    const lowerBranch = (branch || '').toLowerCase();
    if (lowerBranch.includes('information technology') || lowerBranch === 'it') {
      return ['All (B)', 'B1', 'B2'];
    }
    if (lowerBranch.includes('computer science') || lowerBranch === 'cs') {
      return ['All (E)', 'E1', 'E2'];
    }
    return ['All', 'A', 'B', 'C', 'D'];
  };

  const availableSections = getAvailableSections();

  useEffect(() => {
    if (availableSections.length > 0) {
      setSelectedSection(availableSections[0]);
    }
  }, [branch]);

  const handleExport = () => {
    try {
      const doc = new jsPDF('landscape', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      // --- COLLEGE HEADER BACKGROUND BOX ---
      // Rich, distinct premium soft pastel teal to complement the main headers
      doc.setFillColor(210, 228, 232);
      // Height changed from 85 to 95 so it ends exactly at y=115, touching the table's startY
      doc.rect(40, 20, pageWidth - 80, 95, 'F'); 
      
      doc.setDrawColor(0, 0, 0); 
      // Matched lineWidth to autoTable's strict 0.5 border for a seamless joint
      doc.setLineWidth(0.5); 
      doc.rect(40, 20, pageWidth - 80, 95, 'S'); 

      // --- DYNAMIC HEADER CALCULATION ---
      const getSemesterType = (semText) => {
        const semNum = parseInt(semText);
        if (isNaN(semNum)) return 'Even/Odd';
        return semNum % 2 === 0 ? 'Even Sem' : 'Odd Sem';
      };

      const getBranchShortName = (branchName) => {
        const lowerBranch = (branchName || '').toLowerCase();
        if (lowerBranch.includes('information technology')) return 'IT';
        if (lowerBranch.includes('computer science')) return 'CS';
        return branchName;
      };

      const semType = getSemesterType(semester);
      const branchCode = getBranchShortName(branch);

      // --- COLLEGE HEADER TEXT ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0); 
      doc.text("BUDDHA INSTITUTE OF TECHNOLOGY", pageWidth / 2, 40, { align: 'center' });

      doc.setFontSize(11);
      doc.text(`Academic Session ${academicSession}`, pageWidth / 2, 58, { align: 'center' });
      doc.text(`Department of Computer Science & Allied (${branchCode})`, pageWidth / 2, 74, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`(${examType} -01 Marks) ${semType}`, pageWidth / 2, 90, { align: 'center' });

      doc.setFontSize(10);
      let pdfSection = selectedSection;
      if (selectedSection === 'All (B)') pdfSection = 'B';
      if (selectedSection === 'All (E)') pdfSection = 'E';
      if (selectedSection === 'All') pdfSection = 'All';
      doc.text(`Semester/Section: ${semester} / ${pdfSection}`, pageWidth / 2, 104, { align: 'center' });

      // --- DYNAMIC INDEX CALCULATION FOR COLORS ---
      // Calculate exact column indexes to apply background colors
      const totalColIndex = 3 + subjects.length; 
      const percColIndex = totalColIndex + 1;
      const pfColIndex = totalColIndex + 2;
      const rankColIndex = totalColIndex + 3;

      // --- FACULTY INITIALS HELPER ---
      const getFacultyInitials = (sub) => {
        const codeMap = {
          'BCC402': 'SKS',
          'BCS402': 'SKP',
          'BCS403': 'RR',
          'BOE404': 'UKS',
          'BCS401': 'SV',
          'BAS401': 'AS'
        };
        if (codeMap[sub.code]) return codeMap[sub.code];
        const name = sub.faculty_name || sub.teacher_name || '';
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '--';
      };

      // --- TABLE HEADERS (4-Row Layout with rowSpan) ---
      const maxMarksVal = examType === 'PUT' ? 70 : 30;
      const totalMaxMarks = subjects.length * maxMarksVal;

      // Row 1 uses rowSpan to stretch columns down. 
      // AutoTable requires subsequent rows to OMIT the spanned columns.
      const row1 = [
        { content: 'Sl. #', rowSpan: 4, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Roll No', rowSpan: 4, styles: { valign: 'middle', halign: 'center' } },
        'Faculty',
        ...subjects.map(sub => getFacultyInitials(sub)),
        { content: 'Total', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
        { content: '%', rowSpan: 4, styles: { valign: 'middle', halign: 'center' } },
        { content: 'PASS/\nFAIL', rowSpan: 4, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Rank', rowSpan: 4, styles: { valign: 'middle', halign: 'center' } }
      ];

      // Rows 2 and 3 skip the spanned columns entirely
      const row2 = [
        'Name of the Subject',
        ...subjects.map(sub => getSubjectShortName(sub.code, sub.name))
      ];

      const row3 = [
        'Subject Code',
        ...subjects.map(sub => sub.code)
      ];

      // Row 4 has 'Max Marks' and the individual marks, plus the totalMaxMarks under the 'Total' column
      const row4 = [
        'Max Marks',
        ...subjects.map(() => maxMarksVal.toString()),
        totalMaxMarks.toString() // This lands perfectly under the 3-row 'Total' span
      ];

      // --- TABLE BODY ---
      const bodyData = rankData.map((student, idx) => {
        const studentMarksArr = subjects.map(sub => {
          const m = student.studentMarks[sub.id];
          return m === undefined || m === 'undefined' ? 'A' : m;
        });
        return [
          idx + 1,
          student.roll_number,
          student.full_name || student.name || 'UNKNOWN',
          ...studentMarksArr,
          student.total,
          student.percentage,
          student.passFail,
          student.rank
        ];
      });

      // --- AUTOTABLE GENERATION ---
      autoTable(doc, {
        startY: 115,
        head: [row1, row2, row3, row4],
        body: bodyData,
        theme: 'grid',
        styles: {
          lineColor: [0, 0, 0], // Strict black borders everywhere
          lineWidth: 0.5,
          textColor: [0, 0, 0], // Black text in body
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          cellPadding: 5, // Adds breathing room for ALL cells
        },
        headStyles: {
          fillColor: [36, 130, 139], // The specific Teal/Ocean Blue from the image
          textColor: [255, 255, 255], // White text for headers
          fontStyle: 'bold',
        },
        bodyStyles: {
          fillColor: [255, 255, 255], // Default white
        },
        columnStyles: {
          // Indent the Student Name column from the left border so it doesn't hug the line
          2: { halign: 'left', cellPadding: { left: 8, top: 5, bottom: 5, right: 5 } } 
        },
        didParseCell: function (data) {
          if (data.section === 'body') {
            if (data.column.index === totalColIndex) {
              data.cell.styles.fillColor = [255, 255, 0]; // Bright Yellow
              data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index === percColIndex) {
              data.cell.styles.fillColor = [204, 255, 255]; // Light Cyan for %
            } else if (data.column.index === pfColIndex) {
              data.cell.styles.fillColor = [186, 218, 237]; // Distinct Slate-Blue for PASS/FAIL
            } else if (data.column.index === rankColIndex) {
              data.cell.styles.fillColor = [255, 182, 145]; // Light Peach for Rank
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      doc.save(`Rank_Sheet_${branch}_${semester}_${examType}.pdf`);
      toast.success("Rank Sheet PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to generate PDF.");
    }
  };

  const maxMarksPerSubject = examType === 'PUT' ? 70 : 30;

  return (
    <div className="hod-dashboard">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={effectiveYear}
              onChange={handleYearChange}
              disabled={availableYears.length <= 1}
              style={filterSelectStyle}
            >
              <option value="">Select Year</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={effectiveBranch}
              onChange={handleBranchChange}
              disabled={availableBranches.length <= 1}
              style={filterSelectStyle}
            >
              <option value="">Select Branch</option>
              {availableBranches.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={effectiveSemester}
              onChange={handleSemesterChange}
              disabled={availableSemesters.length <= 1}
              style={filterSelectStyle}
            >
              <option value="">Select Semester</option>
              {availableSemesters.map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={examType}
              onChange={handleExamTypeChange}
              style={filterSelectStyle}
            >
              <option value="CT1">CT1</option>
              <option value="CT2">CT2</option>
              <option value="PUT">PUT</option>
            </select>
            <span style={selectChevronStyle}>▼</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '16px', marginBottom: '24px', width: '100%', position: 'relative', zIndex: 10 }}>

          {/* MAIN UI SECTION FILTER */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            style={{ padding: '12px 16px', backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #475569', borderRadius: '12px', outline: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          >
            {availableSections.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>

          <button
            onClick={(e) => {
              e.preventDefault();
              setIsExportModalOpen(true);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontWeight: '700',
              borderRadius: '12px',
              boxShadow: '0 0 15px rgba(79,70,229,0.5)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🏆 Download Rank Sheet
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="hod-card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
          Generating rank sheet...
        </div>
      )}

      {!isLoading && rankData.length > 0 && (
        <div style={{ width: '100%', overflowX: 'auto', borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid #1e293b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '14px', color: '#cbd5e1' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '20px 24px', fontWeight: '600', letterSpacing: '0.05em' }}>S.No</th>
                <th style={{ padding: '20px 24px', fontWeight: '600', letterSpacing: '0.05em' }}>Roll No</th>
                <th style={{ padding: '20px 24px', fontWeight: '600', letterSpacing: '0.05em', textAlign: 'left' }}>Student Name</th>
                {subjects.map(sub => (
                  <th key={sub.id} style={{ padding: '16px 24px', fontWeight: '700', color: '#f1f5f9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px', letterSpacing: '0.1em', fontWeight: 'bold' }}>{getSubjectShortName(sub.code, sub.name)}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{sub.code}</span>
                      <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '600', marginTop: '2px', backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                        Max: {maxMarksPerSubject}
                      </span>
                    </div>
                  </th>
                ))}
                <th style={{ padding: '20px 24px', fontWeight: '600', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span>TOTAL</span>
                    <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>
                      ({subjects.length * maxMarksPerSubject})
                    </span>
                  </div>
                </th>
                <th style={{ padding: '20px 24px', fontWeight: '600', letterSpacing: '0.05em' }}>%</th>
                <th style={{ padding: '20px 24px', fontWeight: '600', letterSpacing: '0.05em' }}>Pass/Fail</th>
                <th style={{ padding: '20px 24px', fontWeight: '700', letterSpacing: '0.05em', color: '#f59e0b' }}>Rank</th>
              </tr>
            </thead>
            <tbody>
              {rankData.map((student, idx) => (
                <tr key={student.id} style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.6)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '16px 24px', color: '#94a3b8' }}>{idx + 1}</td>
                  <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: '#cbd5e1' }}>{student.roll_number}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'left', fontWeight: '500', color: '#f1f5f9', minWidth: '180px' }}>
                    {student.full_name || student.name || student.student_name || 'UNKNOWN'}
                  </td>
                  {subjects.map(sub => {
                    const marks = student.studentMarks[sub.id];
                    const displayMarks = marks === 'A' ? 'A' : marks;
                    return (
                      <td key={`mark-${student.id}-${sub.id}`} style={{ padding: '16px 24px', fontWeight: '500', color: displayMarks === 'A' ? '#f87171' : '#cbd5e1' }}>
                        {displayMarks}
                      </td>
                    );
                  })}
                  <td style={{ padding: '16px 24px', fontWeight: '700', color: '#f59e0b' }}>{student.total}</td>
                  <td style={{ padding: '16px 24px', color: '#cbd5e1' }}>{student.percentage}%</td>
                  <td style={{ padding: '16px 24px', fontWeight: '700', color: student.passFail === 'PASS' ? '#10b981' : '#ef4444' }}>
                    {student.passFail}
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: '900', color: '#ffffff', fontSize: '16px' }}>{student.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && rankData.length === 0 && (
        <div
          className="hod-card"
          style={{
            marginBottom: '1.25rem',
            padding: '2rem',
            textAlign: 'center',
            color: '#94a3b8',
            borderStyle: 'dashed',
          }}
        >
          Select Year, Branch, Semester, and Exam to generate the consolidated rank sheet.
        </div>
      )}

      {/* --- EXPORT MODAL --- */}
      {isExportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ backgroundColor: '#1e1e2d', border: '1px solid #334155', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 6px 0' }}>Generate Rank Sheet</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Confirm details for the PDF header</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic Session</label>
              <input
                type="text"
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#ffffff', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. Jan-June 2026"
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#334155', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsExportModalOpen(false);
                  handleExport();
                }}
                style={{ flex: 1, padding: '12px', backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)' }}
              >
                Download PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default HODRankSheet;


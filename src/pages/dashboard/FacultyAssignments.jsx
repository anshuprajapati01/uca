import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import { Plus, X, Calendar, FileText, Award, Users } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

export default function FacultyAssignments() {
  const [categories, setCategories] = useState([]);
  const [mySubjects, setMySubjects] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionMode, setSubmissionMode] = useState('Online');

  const [subjectId, setSubjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState(10);
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [gradingAssignment, setGradingAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradingForm, setGradingForm] = useState({});
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStudents, setBulkStudents] = useState([]);
  const [bulkGrades, setBulkGrades] = useState({});
  const [isGradebookOpen, setIsGradebookOpen] = useState(false);
  const [selectedSubjectForExport, setSelectedSubjectForExport] = useState('');
  const [activeTab, setActiveTab] = useState('tes');
  const [selectedLabSubject, setSelectedLabSubject] = useState('');
  const [labStudents, setLabStudents] = useState([]);
  const [labGrades, setLabGrades] = useState({});
  const [isLabLoading, setIsLabLoading] = useState(false);
  const [isSavingLab, setIsSavingLab] = useState(false);
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
  const [isTheoryExamLoading, setIsTheoryExamLoading] = useState(false);
  const [isSavingTheoryExam, _setIsSavingTheoryExam] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [categoriesRes, subjectsRes, assignmentsRes] = await Promise.all([
          supabase.from('assignment_categories').select('*').order('name'),
          supabase.from('subjects').select('*').eq('faculty_id', user.id),
          supabase
            .from('assignments')
            .select('*, subjects(name), assignment_categories(name)')
            .eq('faculty_id', user.id)
            .order('due_date', { ascending: true }),
        ]);

        if (categoriesRes.error) throw categoriesRes.error;
        if (subjectsRes.error) throw subjectsRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;

        if (!cancelled) {
          setCategories(categoriesRes.data || []);
          setMySubjects(subjectsRes.data || []);
          setMyAssignments(assignmentsRes.data || []);
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
  }, []);

  const resetForm = () => {
    setSubjectId('');
    setCategoryId('');
    setTitle('');
    setDescription('');
    setDueDate('');
    setMaxMarks(10);
    setSubmissionMode('Online');
    setAttachment(null);
    setGradingAssignment(null);
    setSubmissions([]);
    setGradingForm({});
  };

  const openGrading = async (assignment) => {
    setGradingAssignment(assignment);
    setSubmissions([]);
    setGradingForm({});
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*, student:user_profiles!assignment_submissions_student_id_fkey(full_name)')
        .eq('assignment_id', assignment.id);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      toast.error('Failed to load submissions.');
    }
  };

  const closeGrading = () => {
    setGradingAssignment(null);
    setSubmissions([]);
    setGradingForm({});
  };
const openBulkGrading = async (assignment) => {
    setGradingAssignment(assignment);
    setBulkGrades({});
    try {
      // 1. Saare students ko DB se le aao
      const { data: allStudents } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .ilike('role', '%tudent%');

      // 2. Sirf DUMMY hatayenge, branch filter nahi lagayenge taaki list khali na ho
      const validStudents = (allStudents || []).filter(s => {
        if (!s.full_name) return false;
        const name = s.full_name.toLowerCase();
        // Har tarah ke kachre ko block maro
        return !(name.includes('dummy') || name.includes('test') || name.includes('demo') || name.includes('user'));
      });

      // 3. Pehle se diye marks lao
      const { data: existing } = await supabase.from('assignment_submissions').select('*').eq('assignment_id', assignment.id);
      
      const gradesMap = {};
      (existing || []).forEach((sub) => {
        gradesMap[sub.student_id] = { marks: sub.marks ?? '', feedback: sub.feedback ?? '' };
      });
      
      setBulkStudents(validStudents);
      setBulkGrades(gradesMap);
      setIsBulkModalOpen(true);
    } catch (err) {
      console.error('Failed to load bulk grading data:', err);
      toast.error('Failed to load students.');
    }
  };

  const closeBulkGrading = () => {
    setIsBulkModalOpen(false);
    setBulkStudents([]);
    setBulkGrades({});
    setGradingAssignment(null);
  };

  const saveBulkGrades = async () => {
    const upsertData = Object.entries(bulkGrades)
      .map(([studentId, data]) => ({
        assignment_id: gradingAssignment.id,
        student_id: studentId,
        marks: data.marks !== '' ? Number(data.marks) : null,
        feedback: data.feedback?.trim() || '',
        status: 'Graded',
        submission_url: 'Offline Physical Submission',
        graded_at: new Date().toISOString(),
      }))
      .filter((item) => item.marks !== null);

    if (upsertData.length === 0) {
      toast.error('Please enter marks for at least one student.');
      return;
    }

    try {
      const { error } = await supabase.from('assignment_submissions').upsert(upsertData, { onConflict: 'assignment_id, student_id' });
      if (error) throw error;
      toast.success('All grades saved successfully!');
      closeBulkGrading();
    } catch (err) {
      console.error('Failed to save bulk grades:', err);
      toast.error('Failed to save grades. Please try again.');
    }
  };

  const handleBulkGradeChange = (studentId, field, value) => {
    setBulkGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const exportGradebook = async (subjectId) => {
    try {
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, max_marks')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: true });

      const { data: students } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .ilike('role', '%tudent%');

      const validStudents = (students || []).filter(s => {
        if (!s.full_name) return false;
        const name = s.full_name.toLowerCase();
        return !(name.includes('dummy') || name.includes('test') || name.includes('demo') || name.includes('user'));
      });

      const assignmentIds = assignments.map(a => a.id);
      const { data: submissions } = assignmentIds.length > 0
        ? await supabase.from('assignment_submissions').select('*').in('assignment_id', assignmentIds)
        : { data: [] };

      const headers = ['SR. NO.', 'Students Name', ...assignments.map(a => a.title), 'Total Marks'];
      
      const rows = validStudents.map((student, index) => {
        const marks = assignments.map(assignment => {
          const submission = (submissions || []).find(sub => sub.student_id === student.id && sub.assignment_id === assignment.id);
          return submission?.marks ?? '';
        });
        const totalMarks = marks.reduce((sum, mark) => sum + (mark !== '' ? Number(mark) : 0), 0);
        return [index + 1, student.full_name, ...marks, totalMarks];
      });

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "TES_LES_Gradebook.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Gradebook exported successfully!');
      setIsGradebookOpen(false);
      setSelectedSubjectForExport('');
    } catch (err) {
      console.error('Failed to export gradebook:', err);
      toast.error('Failed to export gradebook. Please try again.');
    }
  };

  const loadLabData = async (subjectId) => {
    setIsLabLoading(true);
    setLabGrades({});
    try {
      const { data: students } = await supabase
        .from('user_profiles')
        .select('id, full_name, roll_number')
        .ilike('role', '%tudent%');

      const validStudents = (students || []).filter(s => {
        if (!s.full_name) return false;
        const name = s.full_name.toLowerCase();
        return !(name.includes('dummy') || name.includes('test') || name.includes('demo') || name.includes('user'));
      });

      setLabStudents(validStudents);

      const { data: existing } = await supabase
        .from('lab_evaluations')
        .select('*')
        .eq('subject_id', subjectId);

      const gradesMap = {};
      (existing || []).forEach((row) => {
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
          lt: row.lt ?? '',
          conduct: row.conduct ?? '',
        };
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
    setLabGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const calculateFinalMarks = (studentId) => {
    const g = labGrades[studentId] || {};
    const labs = ['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'];
    const totalLabs = labs.reduce((sum, key) => {
      const val = g[key];
      return sum + (val !== '' && val !== undefined && val !== null ? Number(val) : 0);
    }, 0);
    const componentA = (totalLabs / 200) * 10;
    const ltVal = g.lt !== '' && g.lt !== undefined && g.lt !== null ? Number(g.lt) : 0;
    const componentB = (ltVal / 30) * 10;
    const conductVal = g.conduct !== '' && g.conduct !== undefined && g.conduct !== null ? Number(g.conduct) : 0;
    const final = componentA + componentB + conductVal;
    return Math.round(final * 10) / 10;
  };

  const saveLabRegister = async () => {
    if (!selectedLabSubject) return toast.error('Please select a subject first.');

    try {
      // Map over all students in the list to ensure everyone gets a row
      const payload = labStudents.map((student) => {
        const grades = labGrades[student.id] || {};
        // Helper to convert empty string/undefined to 0
        const cleanNum = (val) => (val === '' || val === undefined || val === null) ? 0 : parseFloat(val);

        return {
          subject_id: selectedLabSubject,
          student_id: student.id,
          l1: cleanNum(grades.l1), l2: cleanNum(grades.l2), l3: cleanNum(grades.l3),
          l4: cleanNum(grades.l4), l5: cleanNum(grades.l5), l6: cleanNum(grades.l6),
          l7: cleanNum(grades.l7), l8: cleanNum(grades.l8), l9: cleanNum(grades.l9),
          l10: cleanNum(grades.l10),
          lt: cleanNum(grades.lt),
          conduct: cleanNum(grades.conduct)
        };
      });

      const { error } = await supabase
        .from('lab_evaluations')
        .upsert(payload, { onConflict: 'subject_id, student_id' });

      if (error) throw error;
      toast.success('Lab register saved successfully!');
    } catch (err) {
      console.error('Failed to save lab register:', err);
      toast.error('Failed to save lab register. Please try again.');
    }
  };

  const exportLabRegister = () => {
    if (!selectedLabSubject || labStudents.length === 0) {
      toast.error('No data to export.');
      return;
    }
    try {
      const headers = [
        'SR. NO',
        'Students Name',
        'L1','L2','L3','L4','L5','L6','L7','L8','L9','L10',
        'Total Lab Marks',
        'Final Lab Marks (Out of 10)',
        'LT',
        'Final LT Marks (Out of 10)',
        'Conduct',
        'Total Marks',
      ];

      const rows = labStudents.map((student, index) => {
        const g = labGrades[student.id] || {};
        const labs = ['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'];
        const totalLabMarks = labs.reduce((sum, key) => {
          const val = g[key];
          return sum + (val !== '' && val !== undefined && val !== null ? Number(val) : 0);
        }, 0);
        const finalLabMarks = Math.round((totalLabMarks / 200) * 10 * 10) / 10;
        const ltVal = g.lt !== '' && g.lt !== undefined && g.lt !== null ? Number(g.lt) : 0;
        const finalLtMarks = Math.round((ltVal / 30) * 10 * 10) / 10;
        const conductVal = g.conduct !== '' && g.conduct !== undefined && g.conduct !== null ? Number(g.conduct) : 0;
        const totalMarks = Math.round((finalLabMarks + finalLtMarks + conductVal) * 10) / 10;

        return [
          index + 1,
          student.full_name,
          g.l1 ?? '', g.l2 ?? '', g.l3 ?? '', g.l4 ?? '', g.l5 ?? '',
          g.l6 ?? '', g.l7 ?? '', g.l8 ?? '', g.l9 ?? '', g.l10 ?? '',
          totalLabMarks,
          finalLabMarks,
          ltVal,
          finalLtMarks,
          conductVal,
          totalMarks,
        ];
      });

      const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'LES_Gradebook.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Lab register exported successfully!');
    } catch (err) {
      console.error('Failed to export lab register:', err);
      toast.error('Failed to export lab register. Please try again.');
    }
  };

  const exportOfficialGradebook = () => {
    try {
      const wb = XLSX.utils.book_new();

      const tesHeaderRows = [
        ['BUDDHA INSTITUTE OF TECHNOLOGY, GORAKHPUR'],
        ['EVEN SEMESTER (Jan to June 2025-26)'],
        ['THEORY EVALUATION SHEET (TES)'],
        ['DEPARTMENT NAME : INFORMATION TECHNOLOGY'],
        ['FACULTY NAME - Susheela Verma'],
        ['CLASS - 2nd Year (4th Sem. - B1)'],
        [],
        ['SR. NO.', 'Roll No.', 'Students Name', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'Total T/A/Q Marks'],
      ];

      const tesStudentData = theoryExamStudents.map((student, index) => {
        const grades = theoryExamGrades[student.id] || {};
        const ct1 = grades.ct1 ?? '0';
        const ct2 = grades.ct2 ?? '0';
        const put = grades.put ?? '0';
        const total = calculateInternalTotal(ct1, ct2, put);

        return [
          index + 1,
          student.roll_number || '',
          student.full_name,
          ct1, ct2, put, '0', '0', '0', '0', '0', '0', '0',
          total,
        ];
      });

      const finalTesSheet = [...tesHeaderRows, ...tesStudentData];
      const tesWs = XLSX.utils.aoa_to_sheet(finalTesSheet);
      tesWs['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(wb, tesWs, 'TES B1');

      const lesHeaderRows = [
        ['BUDDHA INSTITUTE OF TECHNOLOGY, GORAKHPUR'],
        ['EVEN SEMESTER (Jan to June 2025-26)'],
        ['LAB EVALUATION SHEET (LES)'],
        ['DEPARTMENT NAME : INFORMATION TECHNOLOGY'],
        ['FACULTY NAME - Susheela Verma'],
        ['CLASS - 2nd Year (4th Sem. - B1)'],
        [],
        ['SR. NO.', 'Roll No.', 'Students Name', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'Total Lab Marks'],
      ];

      const lesStudentData =
        labStudents.length > 0
          ? labStudents.map((student, index) => {
              const g = labGrades[student.id] || {};
              const labs = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'];
              const totalLabMarks = labs.reduce((sum, key) => {
                const val = g[key];
                return sum + (val !== '' && val !== undefined && val !== null ? Number(val) : 0);
              }, 0);

              return [
                index + 1,
                student.roll_number || '',
                student.full_name,
                g.l1 ?? '0', g.l2 ?? '0', g.l3 ?? '0', g.l4 ?? '0', g.l5 ?? '0',
                g.l6 ?? '0', g.l7 ?? '0', g.l8 ?? '0', g.l9 ?? '0', g.l10 ?? '0',
                totalLabMarks,
              ];
            })
          : [];

      const finalLesSheet = [...lesHeaderRows, ...lesStudentData];
      const lesWs = XLSX.utils.aoa_to_sheet(finalLesSheet);
      lesWs['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(wb, lesWs, 'LES B1');

      XLSX.writeFile(wb, 'BIT_Gorakhpur_Official_Gradebook.xlsx');
      toast.success('Official gradebook exported successfully!');
    } catch (err) {
      console.error('Failed to export official gradebook:', err);
      toast.error('Failed to export official gradebook. Please try again.');
    }
  };

  const calculateInternalTotal = (ct1, ct2, put) => {
    const n1 = parseFloat(ct1) || 0;
    const n2 = parseFloat(ct2) || 0;
    const n3 = parseFloat(put) || 0;
    const ctPortion = Math.min(Math.max(n1, n2), 30);
    const putPortion = Math.min(Math.round((n3 / 70) * 20), 20);
    return Math.min(ctPortion + putPortion, 50);
  };

  const loadTheoryExamData = async (subjectId) => {
    setIsTheoryExamLoading(true);
    setTheoryExamGrades({});
    try {
      const { data: students } = await supabase
        .from('user_profiles')
        .select('id, full_name, roll_number')
        .ilike('role', '%tudent%');

      const validStudents = (students || []).filter(s => {
        if (!s.full_name) return false;
        const name = s.full_name.toLowerCase();
        return !(name.includes('dummy') || name.includes('test') || name.includes('demo') || name.includes('user'));
      });

      setTheoryExamStudents(validStudents);

      const { data: existing } = await supabase
        .from('theory_evaluations')
        .select('*')
        .eq('subject_id', subjectId);

      const gradesMap = {};
      (existing || []).forEach((row) => {
        gradesMap[row.student_id] = {
          ct1: row.ct1 ?? '',
          ct2: row.ct2 ?? '',
          put: row.put ?? '',
        };
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
    setTheoryExamGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
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
        };
      });

      const { error } = await supabase
        .from('theory_evaluations')
        .upsert(payload, { onConflict: 'subject_id, student_id' });

      if (error) throw error;
      toast.success('Theory exam register saved successfully!');
    } catch (err) {
      console.error('Failed to save theory exam register:', err);
      toast.error('Failed to save theory exam register. Please try again.');
    }
  };

  const exportTheoryExamRegister = () => {
    if (!theoryExamSubject || theoryExamStudents.length === 0) {
      toast.error('No data to export.');
      return;
    }
    try {
      const headers = [
        'SR. NO',
        'Students Name',
        'Roll Number',
        'CT1',
        'CT2',
        'PUT',
        'Internal Total',
      ];

      const rows = theoryExamStudents.map((student, index) => {
        const g = theoryExamGrades[student.id] || {};
        const ct1Val = g.ct1 !== '' && g.ct1 !== undefined && g.ct1 !== null ? Number(g.ct1) : 0;
        const ct2Val = g.ct2 !== '' && g.ct2 !== undefined && g.ct2 !== null ? Number(g.ct2) : 0;
        const putVal = g.put !== '' && g.put !== undefined && g.put !== null ? Number(g.put) : 0;
        const internalTotal = calculateInternalTotal(ct1Val, ct2Val, putVal);

        return [
          index + 1,
          student.full_name,
          student.roll_number || '',
          ct1Val,
          ct2Val,
          putVal,
          internalTotal,
        ];
      });

      const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'TheoryExam_Register.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Theory exam register exported successfully!');
    } catch (err) {
      console.error('Failed to export theory exam register:', err);
      toast.error('Failed to export theory exam register. Please try again.');
    }
  };

  const handleSaveGrade = async (submissionId) => {
    const entry = gradingForm[submissionId] || {};
    const marks = entry.marks;
    const feedback = entry.feedback || '';

    if (marks === undefined || marks === null || marks === '') {
      toast.error('Please enter marks before saving.');
      return;
    }

    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          marks: Number(marks),
          feedback: feedback.trim(),
          status: 'Graded',
          graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Grade saved!');
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, marks: Number(marks), feedback: feedback.trim(), status: 'Graded', graded_at: new Date().toISOString() } : s)),
      );
    } catch (err) {
      console.error('Failed to save grade:', err);
      toast.error('Failed to save grade. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectId || !categoryId || !title.trim() || !dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let attachmentUrl = null;

      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, attachment);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
      }

      const { error } = await supabase.from('assignments').insert([
        {
          faculty_id: user.id,
          subject_id: subjectId,
          category_id: categoryId,
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate,
          max_marks: Number(maxMarks),
          attachment_url: attachmentUrl,
          submission_mode: submissionMode,
        },
      ]);

      if (error) throw error;

      toast.success('Assignment created successfully!');
      setIsModalOpen(false);
      resetForm();

      const { data: updated } = await supabase
        .from('assignments')
        .select('*, subjects(name), assignment_categories(name)')
        .eq('faculty_id', user.id)
        .order('due_date', { ascending: true });

      setMyAssignments(updated || []);
    } catch (err) {
      console.error('Failed to create assignment:', err);
      toast.error('Failed to create assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
        Loading assignments…
      </div>
    );
  }

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
          Assignments (TES)
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
        <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
            📋 Manage Assignments
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={exportOfficialGradebook}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3)',
              }}
            >
              📊 Export Official Gradebook
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Plus size={18} /> Create Assignment
            </button>
          </div>
        </div>

      {myAssignments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#151623', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', color: '#9ca3af' }}>
          <FileText size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No assignments yet. Create your first one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {myAssignments.map((assignment) => (
            <div
              key={assignment.id}
              style={{
                backgroundColor: '#1c1d2e',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', margin: '0 0 4px 0' }}>
                    {assignment.title}
                  </h3>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {assignment.assignment_categories?.name || 'Assignment'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#9ca3af', fontSize: '0.875rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {formatDate(assignment.due_date)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} /> {assignment.max_marks} marks
                  </span>
                  {assignment.submission_mode && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: assignment.submission_mode === 'Offline' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: assignment.submission_mode === 'Offline' ? '#f59e0b' : '#818cf8',
                      border: assignment.submission_mode === 'Offline' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                    }}>
                      {assignment.submission_mode === 'Offline' ? '📝 Physical Submission' : '💻 Online Submission'}
                    </span>
                  )}
                </div>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                {assignment.description}
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', color: '#9ca3af', fontSize: '0.875rem' }}>
                <span>Subject: {assignment.subjects?.name || '—'}</span>
                {assignment.attachment_url && (
                  <a
                    href={assignment.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '600' }}
                  >
                    📎 View Attachment
                  </a>
                )}
</div>
              <button
                type="button"
                onClick={() => assignment.submission_mode === 'Offline' ? openBulkGrading(assignment) : openGrading(assignment)}
                style={{
                  marginTop: '8px',
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: assignment.submission_mode === 'Offline' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: assignment.submission_mode === 'Offline' ? '#f59e0b' : '#818cf8',
                  border: assignment.submission_mode === 'Offline' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                }}
              >
                <Users size={16} /> {assignment.submission_mode === 'Offline' ? 'Bulk Grading (Grid)' : 'View Submissions'}
              </button>
            </div>
          ))}
        </div>
      )}

      {isBulkModalOpen && gradingAssignment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
          
          {/* Main Modal Box (maxHeight: 85vh restricts it from getting too big) */}
          <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ backgroundColor: '#1c1d2e', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '20px 24px', zIndex: 10 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Bulk Grading: {gradingAssignment.title}
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                Max Marks: {gradingAssignment.max_marks}
              </p>
            </div>

            {/* Scrollable Table Content */}
<div style={{ flex: 1, overflowY: 'auto', padding: '0', maxHeight: '60vh' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                 <thead>
                   <tr style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#1c1d2e', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)' }}>
                     <th style={{ backgroundColor: '#1c1d2e', padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d' }}>Student Name</th>
                     <th style={{ backgroundColor: '#1c1d2e', padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', width: '150px' }}>Marks (out of {gradingAssignment.max_marks})</th>
                     <th style={{ backgroundColor: '#1c1d2e', padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d' }}>Feedback</th>
                   </tr>
                 </thead>
                <tbody>
                  {bulkStudents.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>No students found.</td>
                    </tr>
                  ) : (
                    bulkStudents.map((student) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 24px', fontSize: '0.875rem', color: 'white' }}>{student.full_name}</td>
                        <td style={{ padding: '12px 24px' }}>
                          <input
                            type="number"
                            min="0"
                            max={gradingAssignment.max_marks}
                            value={bulkGrades[student.id]?.marks ?? ''}
                            onChange={(e) => handleBulkGradeChange(student.id, 'marks', e.target.value)}
                            style={{
                              width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px 24px' }}>
                          <input
                            type="text"
                            value={bulkGrades[student.id]?.feedback ?? ''}
                            onChange={(e) => handleBulkGradeChange(student.id, 'feedback', e.target.value)}
                            placeholder="Optional feedback..."
                            style={{
                              width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none'
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div style={{ backgroundColor: '#1c1d2e', borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', zIndex: 10 }}>
              <button
                type="button"
                onClick={closeBulkGrading}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveBulkGrades}
                style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: 'white', backgroundColor: '#059669', border: 'none', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)' }}
              >
                💾 Save All Grades
              </button>
            </div>

          </div>
        </div>
      )}

      {gradingAssignment && !isBulkModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Grading: {gradingAssignment.title} (Max Marks: {gradingAssignment.max_marks})
              </h3>
              <button type="button" onClick={closeGrading} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            {submissions.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px 0' }}>No submissions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    style={{
                      backgroundColor: '#11131f',
                      borderRadius: '12px',
                      border: '1px solid #2d314d',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                       <div>
                          <p style={{ color: 'white', fontWeight: '600', margin: '0 0 4px 0' }}>
                           {submission.student?.full_name || 'Unknown Student'}
                         </p>
                       </div>
                      <a
                        href={submission.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}
                      >
                        📄 View Student's Work
                      </a>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marks</label>
                        <input
                          type="number"
                          min="0"
                          value={gradingForm[submission.id]?.marks ?? submission.marks ?? ''}
                          onChange={(e) =>
                            setGradingForm((prev) => ({
                              ...prev,
                              [submission.id]: { ...prev[submission.id], marks: e.target.value },
                            }))
                          }
                          style={{
                            width: '100%',
                            backgroundColor: '#1c1d2e',
                            border: '1px solid #2d314d',
                            color: 'white',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Feedback</label>
                        <input
                          type="text"
                          value={gradingForm[submission.id]?.feedback ?? submission.feedback ?? ''}
                          onChange={(e) =>
                            setGradingForm((prev) => ({
                              ...prev,
                              [submission.id]: { ...prev[submission.id], feedback: e.target.value },
                            }))
                          }
                          style={{
                            width: '100%',
                            backgroundColor: '#1c1d2e',
                            border: '1px solid #2d314d',
                            color: 'white',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleSaveGrade(submission.id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          color: 'white',
                          backgroundColor: submission.status === 'Graded' ? '#059669' : '#6366f1',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        {submission.status === 'Graded' ? 'Update Grade' : 'Save Grade'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isGradebookOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
          <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Export Gradebook
              </h3>
              <button type="button" onClick={() => { setIsGradebookOpen(false); setSelectedSubjectForExport(''); }} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: '0 0 16px 0' }}>
              Select a subject to export all assignments and grades as a CSV file (TES/LES format).
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Select Subject
              </label>
              <select
                value={selectedSubjectForExport}
                onChange={(e) => setSelectedSubjectForExport(e.target.value)}
                style={{
                  width: '100%',
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
                {mySubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => { setIsGradebookOpen(false); setSelectedSubjectForExport(''); }}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => selectedSubjectForExport && exportGradebook(selectedSubjectForExport)}
                disabled={!selectedSubjectForExport}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: selectedSubjectForExport ? '#6366f1' : '#4b5563',
                  border: 'none',
                  cursor: selectedSubjectForExport ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  boxShadow: selectedSubjectForExport ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
        </>)}
        
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
                {mySubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
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
                💾 Save Register
              </button>
              <button
                type="button"
                onClick={exportLabRegister}
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
                  backgroundColor: selectedLabSubject && labStudents.length > 0 ? '#6366f1' : '#4b5563',
                  color: 'white',
                  boxShadow: selectedLabSubject && labStudents.length > 0 ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                📊 Export to CSV
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
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#1c1d2e' }}>
                    <th style={{ position: 'sticky', left: 0, backgroundColor: '#1c1d2e', padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', borderRight: '1px solid #2d314d', minWidth: '160px' }}>Student Name</th>
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
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>LT</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>Conduct</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b', borderBottom: '1px solid #2d314d', minWidth: '90px' }}>Final Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {labStudents.length === 0 ? (
                    <tr>
                      <td colSpan="15" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    labStudents.map((student) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 24px', fontSize: '0.875rem', color: 'white', position: 'sticky', left: 0, backgroundColor: '#1c1d2e', zIndex: 10 }}>
                          {student.full_name}
                        </td>
                        {['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'].map((lab) => (
                          <td key={lab} style={{ padding: '12px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={labGrades[student.id]?.[lab] ?? ''}
                              onChange={(e) => handleLabGradeChange(student.id, lab, e.target.value)}
                              style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '12px 12px' }}>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={labGrades[student.id]?.lt ?? ''}
                            onChange={(e) => handleLabGradeChange(student.id, 'lt', e.target.value)}
                            style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            value={labGrades[student.id]?.conduct ?? ''}
                            onChange={(e) => handleLabGradeChange(student.id, 'conduct', e.target.value)}
                            style={{ width: '50px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '12px 24px', fontWeight: 'bold', color: '#fbbf24' }}>
                          {(() => {
                            const lSum = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'].reduce((acc, l) => acc + (parseFloat(labGrades[student.id]?.[l]) || 0), 0);
                            const lt = parseFloat(labGrades[student.id]?.lt) || 0;
                            const cond = parseFloat(labGrades[student.id]?.conduct) || 0;
                            const compA = (lSum / 200) * 10;
                            const compB = (lt / 30) * 10;
                            return (compA + compB + cond).toFixed(1);
                          })()}
                        </td>
                      </tr>
                    ))
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
                 {mySubjects.map((subject) => (
                   <option key={subject.id} value={subject.id}>
                     {subject.name}
                   </option>
                 ))}
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
                 💾 Save Register
               </button>
               <button
                 type="button"
                 onClick={exportTheoryExamRegister}
                 disabled={!theoryExamSubject || theoryExamStudents.length === 0}
                 style={{
                   display: 'inline-flex',
                   alignItems: 'center',
                   gap: '8px',
                   padding: '10px 20px',
                   borderRadius: '8px',
                   fontWeight: '600',
                   fontSize: '0.875rem',
                   border: 'none',
                   cursor: theoryExamSubject && theoryExamStudents.length > 0 ? 'pointer' : 'not-allowed',
                   backgroundColor: theoryExamSubject && theoryExamStudents.length > 0 ? '#6366f1' : '#4b5563',
                   color: 'white',
                   boxShadow: theoryExamSubject && theoryExamStudents.length > 0 ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : 'none',
                 }}
               >
                 📊 Export to CSV
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
               <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', minWidth: '900px' }}>
                 <thead>
                   <tr style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#1c1d2e' }}>
                     <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', borderRight: '1px solid #2d314d', minWidth: '160px' }}>Student Name</th>
                     <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '80px' }}>Roll Number</th>
                     <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>CT1 (Max 30)</th>
                     <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '60px' }}>CT2 (Max 30)</th>
                     <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', minWidth: '70px' }}>PUT (Max 70)</th>
                     <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#34d399', borderBottom: '1px solid #2d314d', minWidth: '90px' }}>Internal Total (Max 50)</th>
                   </tr>
                 </thead>
                 <tbody>
                   {theoryExamStudents.length === 0 ? (
                     <tr>
                       <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                         No students found.
                       </td>
                     </tr>
                   ) : (
                     theoryExamStudents.map((student) => {
                       const g = theoryExamGrades[student.id] || {};
                       const ct1 = parseFloat(g.ct1) || 0;
                       const ct2 = parseFloat(g.ct2) || 0;
                       const put = parseFloat(g.put) || 0;
                       const internalTotal = calculateInternalTotal(ct1, ct2, put);

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
                               style={{ width: '70px', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}
                             />
                           </td>
                           <td style={{ padding: '12px 24px', fontWeight: 'bold', color: '#34d399', textAlign: 'center' }}>
                             {internalTotal.toFixed(1)}
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
     </>
   );
 }

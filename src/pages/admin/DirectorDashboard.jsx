import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase, createTempClient } from '../../lib/supabase.js';
import { ROUTES } from '../../config/constants.js';
import { Shield, Users, BarChart3, Layers, Bell, LayoutDashboard, BookOpen, Target, Award, ArrowLeft, UploadCloud, Send, FileText, Archive, ScrollText, PenTool, Phone, Mail, X, Trash2, GraduationCap, UserCheck } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import './DirectorDashboard-v2.css';
import HodManagement from './HodManagement.jsx';

const DIRECTOR_NAV = [
  { id: 'overview', label: 'Overview', path: ROUTES.DIRECTOR_DASHBOARD, icon: LayoutDashboard },
  { id: 'academic', label: 'Academic Hub', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=academic`, icon: Layers },
  { id: 'faculty', label: 'Manage Faculty', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=faculty`, icon: Users },
  { id: 'departments', label: 'Manage Departments', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=departments`, icon: Layers },
  { id: 'hod-management', label: 'HOD Management', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=hod-management`, icon: UserCheck },
  { id: 'announcements', label: 'Announcements', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=announcements`, icon: Bell },
];

const YEARS = [
  { id: '1st Year', title: '1st Year', subtitle: 'Foundation', icon: BookOpen, color: 'purple' },
  { id: '2nd Year', title: '2nd Year', subtitle: 'Core Studies', icon: Layers, color: 'emerald' },
  { id: '3rd Year', title: '3rd Year', subtitle: 'Advanced Core', icon: Target, color: 'amber' },
  { id: '4th Year', title: '4th Year', subtitle: 'Specialization', icon: Award, color: 'rose' },
];

const BIT_DEPARTMENTS = {
  '1st Year': [
    { name: 'ASH 1', hod_name: 'Dr. SN Jaisawal', branches: ['CSE A', 'CSE B', 'CSE C', 'CS', 'ECE'] },
    { name: 'ASH 2', hod_name: 'Dr. BK Shrivastav', branches: ['AI ML', 'DS', 'IT', 'ME', 'CE', 'VLSI'] }
  ],
  '2nd Year': [
    { name: 'CS & IT', hod_name: 'Dr. Ranjeet Rai', branches: ['CS', 'IT'] },
    { name: 'CSE & ECE', hod_name: 'Dr. Abhinandan Tripathi', branches: ['CSE', 'ECE'] },
    { name: 'AI ML & DS', hod_name: 'Dr. AI Head', branches: ['AI ML', 'DS'] },
    { name: 'ME & CE', hod_name: 'Dr. ME Head', branches: ['ME', 'CE'] }
  ],
  '3rd Year': [
    { name: 'CS & IT', hod_name: 'Dr. Ranjeet Rai', branches: ['CS', 'IT'] },
    { name: 'CSE & ECE', hod_name: 'Dr. Abhinandan Tripathi', branches: ['CSE', 'ECE'] },
    { name: 'AI ML & DS', hod_name: 'Dr. AI Head', branches: ['AI ML', 'DS'] },
    { name: 'ME & CE', hod_name: 'Dr. ME Head', branches: ['ME', 'CE'] }
  ],
  '4th Year': [
    { name: 'CS & IT', hod_name: 'Dr. Ranjeet Rai', branches: ['CS', 'IT'] },
    { name: 'CSE & ECE', hod_name: 'Dr. Abhinandan Tripathi', branches: ['CSE', 'ECE'] },
    { name: 'AI ML & DS', hod_name: 'Dr. AI Head', branches: ['AI ML', 'DS'] },
    { name: 'ME & CE', hod_name: 'Dr. ME Head', branches: ['ME', 'CE'] }
  ]
};

const extractReferencedId = (details = '') => {
  const match = details.match(/Key \(id\)=\(([0-9a-fA-F-]{36})\)/);
  return match?.[1] || null;
};

const isDummyUuid = (id, dummyIds) => dummyIds.has(id);

const DUMMY_BRANCH_IDS = new Set([
  '33333333-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000003',
]);

const DUMMY_BATCH_IDS = new Set([
  '44444444-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000003',
]);

const DUMMY_SUBJECT_IDS = new Set([
  '77777777-0000-0000-0000-000000000001',
  '77777777-0000-0000-0000-000000000003',
]);

const DIRECTOR_SUBJECT_AVATAR_FALLBACK = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Faculty';

const getDirectorSubjectFaculty = (subject) => {
  const faculty = subject.faculty || null;
  if (!faculty) return { name: 'Unknown Faculty', avatarUrl: DIRECTOR_SUBJECT_AVATAR_FALLBACK };
  const avatarUrl = faculty.avatar_url
    ? faculty.avatar_url
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(faculty.full_name || faculty.name || 'Faculty')}`;
  return {
    name: faculty.full_name || faculty.name || 'Unknown Faculty',
    avatarUrl,
  };
};

const getSemestersForYear = (year) => {
  if (year === '1st Year') return [
    { id: 'ash1', name: 'ASH 1', isLive: false },
    { id: 'ash2', name: 'ASH 2', isLive: true }
  ];
  if (year === '2nd Year') return [
    { id: 'sem3', name: 'Semester 3', isLive: false },
    { id: 'sem4', name: 'Semester 4', isLive: true }
  ];
  if (year === '3rd Year') return [
    { id: 'sem5', name: 'Semester 5', isLive: false },
    { id: 'sem6', name: 'Semester 6', isLive: true }
  ];
  if (year === '4th Year') return [
    { id: 'sem7', name: 'Semester 7', isLive: false },
    { id: 'sem8', name: 'Semester 8', isLive: true }
  ];
  return [];
};

const isYearMatch = (dept, yearId) => {
  if (!dept) return false;
  const yearStr = (dept.year_level || '').toString().toLowerCase().trim();
  const nameStr = (dept.department_name || dept.name || '').toString().toLowerCase().trim();
  
  if (yearId === '1st Year') return yearStr.includes('1') || yearStr.includes('first') || nameStr.includes('ash');
  if (yearId === '2nd Year') return yearStr.includes('2') || yearStr.includes('second');
  if (yearId === '3rd Year') return yearStr.includes('3') || yearStr.includes('third');
  if (yearId === '4th Year') return yearStr.includes('4') || yearStr.includes('fourth');
  
  return false;
};

const StatCard = ({ icon: Icon, label, value, gradient }) => (
  <div className="director-stat-card">
    <div className="director-stat-card__glow" />
    <div className="director-stat-card__icon" style={{ background: gradient }}>
      <Icon size={24} />
    </div>
    <div className="director-stat-card__content">
      <span className="director-stat-card__value">{value.toLocaleString()}</span>
      <span className="director-stat-card__label">{label}</span>
    </div>
  </div>
);

const DepartmentCard = ({ department, onBranchClick }) => {
  const name = department.department_name || department.name;
  const hod = department.hod_name || 'Not Assigned';
  const year = department.year_level || '1st Year';
  const branches = Array.isArray(department.branches) ? department.branches : [];

  return (
    <div className="director-dept-card">
      <div className="director-dept-card__header">
        <h3 className="director-dept-card__name">{name}</h3>
        <span className="director-dept-card__year">{year}</span>
      </div>
      <div className="director-dept-card__hod">
        <Shield size={14} />
        <span>{hod}</span>
      </div>
      <div className="director-dept-card__tags">
        {branches.map((branch, idx) => {
            const branchName = typeof branch === 'string' ? branch.trim() : branch?.name || branch;
            return (
                <span 
                    key={idx} 
                    className="director-dept-card__tag director-dept-card__tag--clickable"
                    onClick={() => onBranchClick(branchName, department)}
                    style={{ cursor: 'pointer' }}
                >
                    {branchName}
                </span>
            );
        })}
      </div>
    </div>
  );
};

export default function DirectorDashboard() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';

  const [dbDepartments] = useState([]);
  const [dbFaculty, setDbFaculty] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalFaculty, setTotalFaculty] = useState(0);
  const [directorName, setDirectorName] = useState('Director');

  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchViewTab, setBranchViewTab] = useState('academic');
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectType, setSubjectType] = useState('theory');
  const [broadcastTab, setBroadcastTab] = useState('global');
  const [urgency, setUrgency] = useState('normal');
  const [targetYears, setTargetYears] = useState([]);

  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState(null);
  const [facultyForm, setFacultyForm] = useState({ fullName: '', email: '', phone: '', avatarUrl: '' });
  const [expertiseTags, setExpertiseTags] = useState([]);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [facultyToast, setFacultyToast] = useState(null);
  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const fileInputRef = useRef(null);

  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [deptToast, setDeptToast] = useState(null);
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);

  const [dbSemesterSubjects, setDbSemesterSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState(null);

  const toggleYear = (year) => {
    setTargetYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeTab !== 'academic') {
      setSelectedAcademicYear(null);
      setSelectedBranch(null);
      setSelectedSemester(null);
      setSelectedSubject(null);
      return;
    }

    setSelectedBranch(null);
    setSelectedSemester(null);
    setSelectedSubject(null);
  }, [activeTab, selectedAcademicYear]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setBranchViewTab('academic');
  }, [selectedBranch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSelectedSubject(null);
  }, [activeTab, selectedBranch, selectedSemester]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSubjectType('theory');
  }, [selectedSemester]);
  /* eslint-enable react-hooks/set-state-in-effect */

useEffect(() => {
     let cancelled = false;
     loadDashboardData();
     return () => { cancelled = true; };

     async function loadDashboardData() {
       try {
         const { data: { user } } = await supabase.auth.getUser();
         const [userRes, studentRes, facultyRes] = await Promise.all([
           supabase.from('user_profiles').select('full_name').eq('id', user?.id).single(),
           supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
           supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'faculty'),
         ]);

         const facultyListRes = await supabase.from('user_profiles').select('*').eq('role', 'faculty');

          if (!cancelled) {
            if (userRes.data?.full_name) setDirectorName(userRes.data.full_name);
            setTotalStudents(studentRes.count || 0);
            setTotalFaculty(facultyRes.count || 0);
            setDbFaculty(facultyListRes.data || []);
            fetchDepartments();
          }
       } catch (err) {
         console.error('Failed to load director dashboard data:', err);
       }
     }
   }, []);

  const getDepartmentsForYear = (yearId) => {
    const fromDb = dbDepartments.filter((d) => isYearMatch(d, yearId));
    if (fromDb.length > 0) return fromDb;
    return (BIT_DEPARTMENTS[yearId] || []).map(dept => ({ ...dept, year_level: yearId }));
  };

  const totalDepartmentsCount = useMemo(() => {
    if (dbDepartments.length > 0) return dbDepartments.length;
    return Object.values(BIT_DEPARTMENTS).flat().length;
  }, [dbDepartments]);

  const currentSubjects = useMemo(() => {
    if (subjectsLoading || subjectsError) return { theory: [], practical: [] };
    const theory = dbSemesterSubjects.filter((s) => s.type?.toLowerCase() === 'theory');
    const practical = dbSemesterSubjects.filter((s) => s.type?.toLowerCase() === 'practical');
    return { theory, practical };
  }, [dbSemesterSubjects, subjectsLoading, subjectsError]);

  const handleBranchClick = (branchName, departmentInfo) => {
      setSelectedBranch({ name: branchName, dept: departmentInfo });
      setSelectedSemester(null);
      setSubjectType('theory');
  };

const handleSemesterSelect = (semester) => {
    console.log('handleSemesterSelect:', semester);
    setSelectedSemester(semester);
    setSubjectType('theory');
};

  const handleBackToSemesters = () => {
      setSelectedSemester(null);
      setSubjectType('theory');
    };

  const fetchDirectorSubjects = useCallback(async () => {
    if (!selectedAcademicYear || !selectedBranch || !selectedSemester) {
      setDbSemesterSubjects([]);
      return;
    }

    setSubjectsLoading(true);
    setSubjectsError(null);

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*, faculty:faculty_id(id, full_name, avatar_url, expertise_tags)')
        .eq('department', selectedBranch.name)
        .eq('year', selectedAcademicYear)
        .eq('semester', selectedSemester.name)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDbSemesterSubjects(data || []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setSubjectsError(err.message);
      setDbSemesterSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  }, [selectedAcademicYear, selectedBranch, selectedSemester]);

  useEffect(() => {
    fetchDirectorSubjects();
  }, [fetchDirectorSubjects]);

  const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

  const handleFacultyAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE) {
      setFacultyToast({ message: 'Error: Avatar image must be under 2MB.', type: 'error' });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFacultyForm({ ...facultyForm, avatarUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

const handleAddFaculty = async (e) => {
    e.preventDefault();
    setIsAddingFaculty(true);

    try {
        // 1. Ensure tempClient doesn't read the existing browser session
        const tempClient = createTempClient();

        // 2. Create the Auth account
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: facultyForm.email,
            password: 'Test@123'
        });

        if (authError) {
            alert("Signup Error: " + authError.message);
            setIsAddingFaculty(false);
            return;
        }

        // 3. EXPLICITLY grab the NEW user's ID
        const newFacultyId = authData?.user?.id;
        if (!newFacultyId) {
            alert("Failed to retrieve new user ID.");
            setIsAddingFaculty(false);
            return;
        }

        // 4. Insert into user_profiles using the NEW ID
        const { error: profileError } = await supabase.from('user_profiles').insert([{
            id: newFacultyId,
            full_name: facultyForm.fullName,
            email: facultyForm.email,
            phone: facultyForm.phone,
            avatar_url: facultyForm.avatarUrl,
            expertise_tags: expertiseTags,
            role: 'faculty',
            college_id: '11111111-0000-0000-0000-000000000001',
            is_active: true
        }]);

        if (profileError) {
            alert("Profile Save Error: " + profileError.message);
            setIsAddingFaculty(false);
            return;
        }

        setFacultyToast({ message: 'Faculty added successfully. Default password is Test@123', type: 'success' });
        setShowAddFacultyModal(false);
        setFacultyForm({ fullName: '', email: '', phone: '', avatarUrl: '' });
        setExpertiseTags([]);
        setExpertiseInput('');
        loadFacultyList();
    } catch (error) {
        setFacultyToast({ message: 'Error: ' + error.message, type: 'error' });
    } finally {
        setIsAddingFaculty(false);
        setTimeout(() => setFacultyToast(null), 4000);
    }
  };

  const handleExpertiseKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = expertiseInput.trim();
      if (value && !expertiseTags.includes(value)) {
        setExpertiseTags([...expertiseTags, value]);
      }
      setExpertiseInput('');
    }
  };

  const removeExpertiseTag = (tag) => {
    setExpertiseTags(expertiseTags.filter((t) => t !== tag));
  };

  const loadFacultyList = async () => {
    const { data } = await supabase.from('user_profiles').select('*').eq('role', 'faculty');
    if (data) setDbFaculty(data);
  };

  const fetchDepartments = async () => {
    const { error, data } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching branches:", error);
      return;
    }
    if (data) {
      setDepartments((data || []).filter((dept) => !isDummyUuid(dept.id, DUMMY_BRANCH_IDS)));
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    const rawName = newDeptName.trim();
    if (!rawName) {
      alert('Please enter a department name.');
      return;
    }

    setIsCreatingDept(true);
    try {
      const { error } = await supabase.from('branches').insert([{
        name: rawName,
        description: selectedYear
      }]);

      if (error) {
        console.error('Department Create Error:', error);
        alert('Failed to create department: ' + error.message);
        return;
      }

      setNewDeptName('');
      setDeptToast('Department created successfully!');
      setTimeout(() => setDeptToast(null), 3000);
      await fetchDepartments();
    } catch (err) {
      console.error('Create Department JS Error:', err);
      alert('An unexpected error occurred.');
    } finally {
      setIsCreatingDept(false);
    }
  };

  const cleanupBatchReferences = async (batchId) => {
    const subjectIds = new Set();

    const subjectRes = await supabase
      .from('subjects')
      .select('id')
      .eq('batch_id', batchId);

    if (subjectRes.data) {
      subjectRes.data.forEach((subject) => subjectIds.add(subject.id));
    } else if (subjectRes.error) {
      console.warn('Subject cleanup warning:', subjectRes.error);
    }

    DUMMY_SUBJECT_IDS.forEach((subjectId) => subjectIds.add(subjectId));

    if (subjectIds.size > 0) {
      const subjectIdList = Array.from(subjectIds);

      await supabase.from('study_materials').delete().in('subject_id', subjectIdList);
      await supabase.from('resources').delete().in('subject_id', subjectIdList);

      const { error: subjectDeleteError } = await supabase
        .from('subjects')
        .delete()
        .in('id', subjectIdList);

      if (subjectDeleteError) console.warn('Subject cleanup warning:', subjectDeleteError);
    }

    const { error: academicHistoryError } = await supabase
      .from('academic_history')
      .delete()
      .eq('batch_id', batchId);

    if (academicHistoryError) console.warn('Academic history cleanup warning:', academicHistoryError);

    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({ batch_id: null })
      .eq('batch_id', batchId);

    if (profileUpdateError?.code === '23502') {
      const { error: profileDeleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('batch_id', batchId);

      if (profileDeleteError) console.warn('User profile cleanup warning:', profileDeleteError);
    } else if (profileUpdateError) {
      console.warn('User profile cleanup warning:', profileUpdateError);
    }

    const { error: batchDeleteError } = await supabase
      .from('batches')
      .delete()
      .eq('id', batchId);

    if (batchDeleteError) throw batchDeleteError;
  };

  const handleDeleteDepartment = async () => {
    if (!deptToDelete) return;

    const isCurrentDepartment = departments.some((dept) => dept.id === deptToDelete);
    if (!isCurrentDepartment) {
      await fetchDepartments();
      setDeptToDelete(null);
      setDeptToast('Department list refreshed. This item is no longer active.');
      setTimeout(() => setDeptToast(null), 3000);
      return;
    }

    try {
      const { error: userUpdateError } = await supabase
        .from('user_profiles')
        .update({ branch_id: null })
        .eq('branch_id', deptToDelete);

      if (userUpdateError) console.warn('User unassign warning:', userUpdateError);

      const { error: branchDeleteError } = await supabase
        .from('branches')
        .delete()
        .eq('id', deptToDelete);

      if (!branchDeleteError) {
        setDepartments((prev) => prev.filter((d) => d.id !== deptToDelete));
        setDeptToDelete(null);
        setDeptToast('Department permanently deleted!');
        setTimeout(() => setDeptToast(null), 3000);
        await fetchDepartments();
        return;
      }

      const referencedBatchId = extractReferencedId(branchDeleteError.details);
      const isBatchFkLock = branchDeleteError.code === '23503'
        && branchDeleteError.details?.includes('batches')
        && referencedBatchId
        && isDummyUuid(referencedBatchId, DUMMY_BATCH_IDS);

      if (!isBatchFkLock) throw branchDeleteError;

      await cleanupBatchReferences(referencedBatchId);

      const { error: retryDeleteError } = await supabase
        .from('branches')
        .delete()
        .eq('id', deptToDelete);

      if (retryDeleteError) throw retryDeleteError;

      setDepartments((prev) => prev.filter((d) => d.id !== deptToDelete));
      setDeptToDelete(null);
      setDeptToast('Department permanently deleted!');
      setTimeout(() => setDeptToast(null), 3000);
      await fetchDepartments();
    } catch (err) {
      console.error('Delete Error:', err);
      alert('Failed to delete: ' + err.message);
    }
  };

  const confirmDeleteFaculty = async () => {
    if (!facultyToDelete) return;

    try {
        // 1. Unassign subjects (Prevent orphaned subjects)
        const { error: subjectError } = await supabase
            .from('subjects')
            .update({ faculty_id: null })
            .eq('faculty_id', facultyToDelete);
        if (subjectError) console.warn("Subject unassign warning:", subjectError);

        // 2. Delete dependent resources
        const { error: resourceError } = await supabase
            .from('resources')
            .delete()
            .eq('uploaded_by', facultyToDelete);
        if (resourceError) console.warn("Resources deletion warning:", resourceError);

        // 3. Delete dependent study materials
        const { error: studyMaterialError } = await supabase
            .from('study_materials')
            .delete()
            .eq('uploaded_by', facultyToDelete);
        if (studyMaterialError) console.warn("Study Materials deletion warning:", studyMaterialError);

        // 4. Delete Profile from user_profiles
        const { error: profileError } = await supabase
            .from('user_profiles')
            .delete()
            .eq('id', facultyToDelete);

        if (profileError) {
            console.error("Profile Delete Error:", profileError);
            alert("Failed to delete profile data: " + profileError.message);
            setFacultyToDelete(null);
            return;
        }

        // 5. PERMANENTLY Delete Auth Account via RPC
        const { error: authError } = await supabase.rpc('delete_user_permanently', { 
            user_id: facultyToDelete 
        });

        if (authError) {
            console.error("Auth Delete Error:", authError);
            alert("Profile deleted, but failed to remove auth account completely.");
        } else {
            console.log("Auth account deleted permanently.");
        }

        // 6. Update UI and Close Modal
        setDbFaculty(prev => prev.filter(f => f.id !== facultyToDelete));
        setFacultyToDelete(null);

        // Trigger Success Toast
        // showToast("Faculty permanently deleted!", "success"); 

    } catch (err) {
        console.error("Unexpected Delete Error:", err);
        alert("An unexpected error occurred during deletion.");
    }
  };

  const filteredDepartments = departments.filter(dept => dept.description === selectedYear);

  return (
    <DashboardLayout title="Director Portal" navItems={DIRECTOR_NAV}>
      <div className="director-dashboard">
        
        {/* --- 1. OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <>
            <header className="director-header">
              <div className="director-header__content">
                <h1 className="director-header__title">
                  Welcome back, <span className="director-header__highlight">{directorName}</span>
                </h1>
                <p className="director-header__subtitle">Director at Buddha Institute of Technology</p>
              </div>
            </header>

            <div className="director-stats-grid">
              <StatCard icon={Users} label="Total Students" value={totalStudents} gradient="linear-gradient(135deg, #6366f1, #8b5cf6)" />
              <StatCard icon={Shield} label="Total Faculty" value={totalFaculty} gradient="linear-gradient(135deg, #3b82f6, #6366f1)" />
              <StatCard icon={Layers} label="Active Branches" value={13} gradient="linear-gradient(135deg, #8b5cf6, #c084fc)" />
              <StatCard icon={BarChart3} label="Total Departments" value={totalDepartmentsCount} gradient="linear-gradient(135deg, #10b981, #34d399)" />
            </div>
          </>
        )}

        {/* --- 2. ACADEMIC HUB TAB --- */}
        {activeTab === 'academic' && (
          <section className="director-section">
            
            {/* STATE 1: SHOW ONLY YEAR CARDS */}
            {!selectedAcademicYear && !selectedBranch && (
              <>
                <div className="director-section__header">
                  <Layers size={24} />
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Academic Hub</h2>
                </div>
                
                <div className="director-years-grid">
                  {YEARS.map((year) => {
                    const deptsForYear = getDepartmentsForYear(year.id);
                    return (
                      <div key={year.id} className={`director-year-card director-year-card--${year.color}`} onClick={() => setSelectedAcademicYear(year.id)}>
                        <div className="director-year-card__icon"><year.icon size={24} /></div>
                        <div className="director-year-card__info">
                          <h3 className="director-year-card__title">{year.title}</h3>
                          <span className="director-year-card__subtitle">{year.subtitle}</span>
                          <div className="director-year-card__meta"><span>{deptsForYear.length} Departments</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* STATE 2: SHOW DEPARTMENTS FOR SELECTED YEAR */}
            {selectedAcademicYear && !selectedBranch && (
              <div className="director-department-view-wrapper">
                <div className="director-section__header" style={{ alignItems: 'center', marginBottom: '2rem' }}>
                    <button className="director-back-btn" onClick={() => setSelectedAcademicYear(null)}>
                    <ArrowLeft size={18} /> Back to Years
                  </button>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginLeft: '1rem' }}>
                    Departments in {selectedAcademicYear}
                  </h2>
                </div>
                
                <div className="director-depts-grid">
                   {getDepartmentsForYear(selectedAcademicYear).map((dept, idx) => (
                       <DepartmentCard key={dept.id || idx} department={dept} onBranchClick={handleBranchClick} />
                   ))}
                  {getDepartmentsForYear(selectedAcademicYear).length === 0 && (
                    <div className="director-empty-state">No departments found for {selectedAcademicYear}.</div>
                  )}
                </div>
              </div>
            )}

           {/* STATE 3: EXACT DESIGN COPY WITH NO SUBJECT LIST */}
            {selectedAcademicYear && selectedBranch && !selectedSemester && (
                <div className="director-branch-view-wrapper">
                    <button className="director-back-btn director-back-btn--premium" onClick={() => setSelectedBranch(null)}>
                        <ArrowLeft size={18} /> Back to Departments
                    </button>

                    <div className="director-branch-subtabs" role="tablist" aria-label="Branch view">
                        <button
                            type="button"
                            className={`director-branch-subtab ${branchViewTab === 'academic' ? 'director-branch-subtab--active' : ''}`}
                            role="tab"
                            aria-selected={branchViewTab === 'academic'}
                            onClick={() => setBranchViewTab('academic')}
                        >
                            Academic
                        </button>
                        <button
                            type="button"
                            className={`director-branch-subtab ${branchViewTab === 'announcements' ? 'director-branch-subtab--active' : ''}`}
                            role="tab"
                            aria-selected={branchViewTab === 'announcements'}
                            onClick={() => setBranchViewTab('announcements')}
                        >
                            Batch Announcements
                        </button>
                    </div>

                    {branchViewTab === 'academic' ? (
                        <div className="sem-grid-container">
                            {getSemestersForYear(selectedAcademicYear).map((sem) => (
                                <div
                                    key={sem.id}
                                    className="sem-card-glass"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Open ${sem.name} subjects`}
                                    onClick={() => handleSemesterSelect(sem)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleSemesterSelect(sem);
                                        }
                                    }}
                                >
                                    <h3 className="sem-title">{sem.name}</h3>
                                    {sem.isLive && (
                                        <span className="live-badge">LIVE</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="director-branch-announcements-placeholder">
                            <h3>Batch Announcements</h3>
                            <p>Batch Announcements list will go here</p>
                        </div>
                    )}
                </div>
            )}

            {selectedAcademicYear && selectedBranch && selectedSemester && (
                <div className="director-branch-view-wrapper">
                    {!selectedSubject && (
                        <button
                            className="director-back-btn"
                            onClick={handleBackToSemesters}
                        >
                            <ArrowLeft size={18} /> Back to Semesters
                        </button>
                    )}

                    {selectedSubject ? (
                        <div className="subject-detail-materials-full">
                            <button className="premium-back-btn" onClick={() => setSelectedSubject(null)}>
                                <ArrowLeft size={18} /> Back to Subjects
                            </button>

                            <div className="subject-detail-header">
                                <h2 className="subject-detail-name">{selectedSubject.name}</h2>
                                <span className="subject-detail-code">{selectedSubject.code}</span>
                            </div>

                            <div className="material-cards-grid" aria-label="Material categories">
                                {[
                                    { name: 'All Lecture Notes', icon: BookOpen, count: '12 Files' },
                                    { name: 'Assignments', icon: FileText, count: '8 Files' },
                                    { name: 'Tutorials', icon: PenTool, count: '5 Files' },
                                    { name: 'PYQs', icon: Archive, count: '15 Files' },
                                    { name: 'Syllabus', icon: ScrollText, count: '3 Files' },
                                ].map((material) => (
                                    <div key={material.name} className="material-category-card" role="button" tabIndex={0}>
                                        <div className="material-category-card__icon">
                                            <material.icon size={28} />
                                        </div>
                                        <h3 className="material-category-card__title">{material.name}</h3>
                                        <span className="material-category-card__count">{material.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="pw-subject-view-main">
                            <div className="director-subject-view">
                                <div className="director-subject-view__header">
                                    <div>
                                        <p className="director-subject-view__eyebrow">
                                            {selectedBranch.name} · {selectedBranch.dept?.department_name || selectedBranch.dept?.name}
                                        </p>
                                        <h2 className="director-subject-view__title">Subject View</h2>
                                    </div>
                                    <span className="director-subject-view__semester">{selectedSemester.name}</span>
                                </div>

                                <div className="director-subject-view__tabs" role="tablist" aria-label="Subject type">
                                    <button
                                        type="button"
                                        className={`subject-tab-btn ${subjectType === 'theory' ? 'subject-tab-btn--active' : ''}`}
                                        role="tab"
                                        aria-selected={subjectType === 'theory'}
                                        onClick={() => setSubjectType('theory')}
                                    >
                                        Theory Subjects
                                    </button>
                                    <button
                                        type="button"
                                        className={`subject-tab-btn ${subjectType === 'practical' ? 'subject-tab-btn--active' : ''}`}
                                        role="tab"
                                        aria-selected={subjectType === 'practical'}
                                        onClick={() => setSubjectType('practical')}
                                    >
                                        Practical / Lab Subjects
                                    </button>
                                </div>

                                <div className="pw-subject-grid">
                                    {subjectsLoading ? (
                                        <div className="pw-loading-subjects">Loading subjects...</div>
                                    ) : subjectsError ? (
                                        <div className="pw-error-subjects">Failed to load subjects. Please try again later.</div>
                                    ) : currentSubjects[subjectType].length > 0 ? currentSubjects[subjectType].map((subject) => {
                                        const facultyInfo = getDirectorSubjectFaculty(subject);
                                        return (
                                        <article
                                            key={subject.id}
                                            className="pw-subject-card"
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Open ${subject.name} details`}
                                            onClick={() => setSelectedSubject({
                                              id: subject.id,
                                              name: subject.name,
                                              code: subject.code,
                                              faculty: facultyInfo,
                                            })}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    setSelectedSubject({
                                                      id: subject.id,
                                                      name: subject.name,
                                                      code: subject.code,
                                                      faculty: facultyInfo,
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="pw-subject-card__content">
                                                <h4 className="pw-subject-card__name">{subject.name}</h4>
                                                <span className="pw-subject-card__code">{subject.code}</span>
                                            </div>
                                            <div className="pw-subject-card__faculty">
                                                <img
                                                    className="pw-subject-card__avatar"
                                                    src={facultyInfo.avatarUrl}
                                                    alt={`${facultyInfo.name} avatar`}
                                                    loading="lazy"
                                                />
                                                <span>{facultyInfo.name}</span>
                                            </div>
                                        </article>
                                        );
                                    }) : (
                                        <div className="pw-empty-subjects">No subjects available for this semester.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
          </section>
        )}

        {/* --- 3. BROADCAST COMMAND CENTER --- */}
        {activeTab === 'announcements' && (
          <section className="director-section">
            <h2 className="broadcast-title">Broadcast Command Center</h2>

            <div className="broadcast-tabs" role="tablist" aria-label="Broadcast target">
              <button
                className={`broadcast-tab ${broadcastTab === 'global' ? 'broadcast-tab--active' : ''}`}
                type="button"
                role="tab"
                aria-selected={broadcastTab === 'global'}
                onClick={() => setBroadcastTab('global')}
              >
                Global
              </button>
              <button
                className={`broadcast-tab ${broadcastTab === 'hod' ? 'broadcast-tab--active' : ''}`}
                type="button"
                role="tab"
                aria-selected={broadcastTab === 'hod'}
                onClick={() => setBroadcastTab('hod')}
              >
                HOD Only
              </button>
              <button
                className={`broadcast-tab ${broadcastTab === 'faculty' ? 'broadcast-tab--active' : ''}`}
                type="button"
                role="tab"
                aria-selected={broadcastTab === 'faculty'}
                onClick={() => setBroadcastTab('faculty')}
              >
                Faculty Only
              </button>
            </div>

            <div className="broadcast-content">
              {broadcastTab === 'global' && (
                <div className="broadcast-form-container">
                  <div className="broadcast-form-row">
                    <input className="broadcast-input" type="text" placeholder="Announcement Title..." />
                  </div>

                  <div className="broadcast-form-row">
                    <textarea className="broadcast-textarea" placeholder="Type your message here..." rows={5} />
                  </div>

                  <div className="broadcast-form-row">
                    <button className="broadcast-upload-btn" type="button">
                      <UploadCloud size={18} />
                      <span>Upload Image / PDF / Doc</span>
                    </button>
                  </div>

                  <div className="broadcast-form-actions">
                    <button className="broadcast-send-btn" type="button">
                      <Send size={16} />
                      <span>Send Global Broadcast</span>
                    </button>
                  </div>
                </div>
              )}

              {broadcastTab === 'hod' && (
                <div className="broadcast-form-container">
                  <div className="broadcast-selector-row">
                    <span className="selector-label">Select Target Years:</span>
                    <div className="pill-group">
                      {['1st', '2nd', '3rd', '4th'].map(year => (
                        <button
                          key={year}
                          className={`pill-btn ${targetYears.includes(year) ? 'pill-btn--active' : ''} ${targetYears.includes(year) ? 'pill-btn--year' : ''}`}
                          type="button"
                          onClick={() => toggleYear(year)}
                        >
                          {year} Year
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="broadcast-selector-row">
                    <span className="selector-label">Urgency Level:</span>
                    <div className="pill-group">
                      <button className={`pill-btn ${urgency === 'normal' ? 'pill-btn--active' : ''} pill-btn--normal`} type="button" onClick={() => setUrgency('normal')}>Normal</button>
                      <button className={`pill-btn ${urgency === 'important' ? 'pill-btn--active' : ''} pill-btn--important`} type="button" onClick={() => setUrgency('important')}>Important</button>
                      <button className={`pill-btn ${urgency === 'urgent' ? 'pill-btn--active' : ''} pill-btn--urgent`} type="button" onClick={() => setUrgency('urgent')}>Urgent</button>
                    </div>
                  </div>

                  <div className="broadcast-form-row">
                    <input className="broadcast-input" type="text" placeholder="Announcement Title..." />
                  </div>

                  <div className="broadcast-form-row">
                    <textarea className="broadcast-textarea" placeholder="Type your message here..." rows={5} />
                  </div>

                  <div className="broadcast-form-row">
                    <button className="broadcast-upload-btn" type="button">
                      <UploadCloud size={18} />
                      <span>Upload Image / PDF / Doc</span>
                    </button>
                  </div>

                  <div className="broadcast-form-actions">
                    <button className="broadcast-send-btn" type="button">
                      <Send size={16} />
                      <span>Send HOD Broadcast</span>
                    </button>
                  </div>
                </div>
              )}

              {broadcastTab === 'faculty' && (
                <div className="broadcast-form-container">
                  <div className="broadcast-selector-row">
                    <span className="selector-label">Urgency Level:</span>
                    <div className="pill-group">
                      <button className={`pill-btn ${urgency === 'normal' ? 'pill-btn--active' : ''} pill-btn--normal`} type="button" onClick={() => setUrgency('normal')}>Normal</button>
                      <button className={`pill-btn ${urgency === 'important' ? 'pill-btn--active' : ''} pill-btn--important`} type="button" onClick={() => setUrgency('important')}>Important</button>
                      <button className={`pill-btn ${urgency === 'urgent' ? 'pill-btn--active' : ''} pill-btn--urgent`} type="button" onClick={() => setUrgency('urgent')}>Urgent</button>
                    </div>
                  </div>

                  <div className="broadcast-form-row">
                    <input className="broadcast-input" type="text" placeholder="Announcement Title..." />
                  </div>

                  <div className="broadcast-form-row">
                    <textarea className="broadcast-textarea" placeholder="Type your message here..." rows={5} />
                  </div>

                  <div className="broadcast-form-row">
                    <button className="broadcast-upload-btn" type="button">
                      <UploadCloud size={18} />
                      <span>Upload Image / PDF / Doc</span>
                    </button>
                  </div>

                  <div className="broadcast-form-actions">
                    <button className="broadcast-send-btn" type="button">
                      <Send size={16} />
                      <span>Send Faculty Broadcast</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* --- HOD MANAGEMENT TAB --- */}
        {activeTab === 'hod-management' && (
          <HodManagement />
        )}

        {/* --- 4. MANAGE FACULTY TAB (PREMIUM CARD GRID) --- */}
        {activeTab === 'faculty' && (
          <section className="director-section">
            <div className="faculty-header">
              <h2 className="faculty-header__title">Manage Faculty</h2>
              <button 
                className="faculty-add-btn"
                onClick={() => setShowAddFacultyModal(true)}
              >
                + Add New Faculty
              </button>
            </div>

            {showAddFacultyModal && (
                <div className="add-faculty-modal-overlay" onClick={() => setShowAddFacultyModal(false)}>
                <div className="add-faculty-modal" onClick={(e) => e.stopPropagation()}>
                  <button className="add-faculty-modal__close" onClick={() => setShowAddFacultyModal(false)}>
                    <X size={20} />
                  </button>
                  <h3 className="add-faculty-modal__title">Add New Faculty</h3>

                  {facultyToast && (
                    <div className={`faculty-toast faculty-toast--${facultyToast.type}`}>
                      <span className="faculty-toast__message">{facultyToast.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddFaculty} className="add-faculty-form">
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Full Name</label>
                      <input
                        className="add-faculty-input"
                        type="text"
                        placeholder="Enter full name"
                        required
                        value={facultyForm.fullName}
                        onChange={(e) => setFacultyForm({ ...facultyForm, fullName: e.target.value })}
                      />
                    </div>
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Email</label>
                      <input
                        className="add-faculty-input"
                        type="email"
                        placeholder="Enter email address"
                        required
                        value={facultyForm.email}
                        onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                      />
                    </div>
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Phone</label>
                      <input
                        className="add-faculty-input"
                        type="text"
                        placeholder="Enter phone number"
                        value={facultyForm.phone}
                        onChange={(e) => setFacultyForm({ ...facultyForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Profile Photo</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFacultyAvatarChange}
                      />
                      <div className="add-faculty-upload-zone" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud size={24} />
                        <span>{facultyForm.avatarUrl ? 'Photo selected — click to change' : 'Click to upload avatar (max 2MB)'}</span>
                      </div>
                      {facultyForm.avatarUrl && (
                        <div className="add-faculty-avatar-preview">
                          <img src={facultyForm.avatarUrl} alt="Avatar preview" className="add-faculty-avatar-preview__img" />
                          <button
                            type="button"
                            className="add-faculty-avatar-preview__remove"
                            onClick={() => setFacultyForm({ ...facultyForm, avatarUrl: '' })}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Expertise / Subjects</label>
                      <input
                        className="add-faculty-input"
                        type="text"
                        placeholder="e.g., Data Structures (Press Enter to add multiple)"
                        value={expertiseInput}
                        onChange={(e) => setExpertiseInput(e.target.value)}
                        onKeyDown={handleExpertiseKeyDown}
                      />
                      {expertiseTags.length > 0 && (
                        <div className="add-faculty-expertise-tags">
                          {expertiseTags.map((tag) => (
                            <span key={tag} className="add-faculty-expertise-tag">
                              {tag}
                              <button
                                type="button"
                                className="add-faculty-expertise-tag__remove"
                                onClick={() => removeExpertiseTag(tag)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="add-faculty-form__actions">
                      <button type="submit" className="add-faculty-submit-btn" disabled={isAddingFaculty}>
                        {isAddingFaculty ? 'Saving...' : '✨ Save Faculty Profile'}
                      </button>
                    </div>
</form>
                </div>
              </div>
            )}

            <div className="premium-faculty-grid">
              {dbFaculty.length > 0 ? dbFaculty.map((faculty) => {
                const fullName = faculty.full_name || faculty.name || 'Unknown';
                const email = faculty.email || '—';
                const phone = faculty.phone || faculty.phone_number || '—';
                const avatarUrl = faculty.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=8b5cf6&color=fff`;
                const facultyTags = Array.isArray(faculty.expertise_tags) ? faculty.expertise_tags : [];

                return (
                  <div key={faculty.id} className="premium-faculty-card">
                    <div className="premium-faculty-card__glow" />
                    <button
                      className="premium-faculty-card__delete-btn"
                      onClick={() => setFacultyToDelete(faculty.id)}
                      aria-label="Delete faculty"
                      type="button"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="premium-faculty-card__avatar-container">
                      <img className="premium-faculty-card__avatar" src={avatarUrl} alt={fullName} />
                    </div>
                    <div className="premium-faculty-card__content">
                      <h3 className="premium-faculty-card__name">{fullName}</h3>
                      <div className="premium-faculty-card__contact">
                        <span className="premium-faculty-card__email">
                          <Mail size={14} />
                          {email}
                        </span>
                        {phone !== '—' && <span className="premium-faculty-card__phone">
                          <Phone size={14} />
                          {phone}
                        </span>}
                      </div>
                          <div className="premium-faculty-card__expertise">
                            <span className="premium-faculty-card__section-label">EXPERTISE</span>
                            <div className="premium-faculty-card__tags">
                              {Array.isArray(facultyTags) && facultyTags.length > 0 ? facultyTags.map((tag, idx) => (
                                <span key={idx} className="premium-tag-pill">{tag}</span>
                              )) : (
                                <span className="premium-faculty-card__no-tags">No expertise listed</span>
                              )}
                            </div>
                          </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="premium-faculty-empty">No faculty members found in the database.</div>
              )}
            </div>

            {facultyToDelete !== null && (
              <div className="delete-faculty-modal-overlay" onClick={() => setFacultyToDelete(null)}>
                <div className="delete-faculty-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="delete-faculty-modal__icon">
                    <Trash2 size={48} />
                  </div>
                  <p className="delete-faculty-modal__text">Are you sure you want to delete this faculty profile?</p>
                  <div className="delete-faculty-modal__actions">
                    <button
                      className="delete-faculty-modal__btn delete-faculty-modal__btn--cancel"
                      onClick={() => setFacultyToDelete(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="delete-faculty-modal__btn delete-faculty-modal__btn--delete"
                      onClick={confirmDeleteFaculty}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* --- 5. MANAGE DEPARTMENTS TAB --- */}
        {activeTab === 'departments' && (
          <section className="director-section">
            {deptToast && (
              <div className="dept-toast">
                <span className="dept-toast__message">{deptToast}</span>
              </div>
            )}

            {deptToDelete !== null && (
              <div className="delete-dept-modal-overlay" onClick={() => setDeptToDelete(null)}>
                <div className="delete-dept-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="delete-dept-modal__header">
                    <div className="delete-dept-modal__icon-box">
                      <Trash2 size={28} />
                    </div>
                    <h3 className="delete-dept-modal__title">Delete Department</h3>
                    <p className="delete-dept-modal__text">This action is permanent. Any linked user references will be unassigned.</p>
                  </div>
                  <div className="delete-dept-modal__actions">
                    <button
                      className="delete-dept-modal__btn delete-dept-modal__btn--cancel"
                      onClick={() => setDeptToDelete(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="delete-dept-modal__btn delete-dept-modal__btn--delete"
                      onClick={handleDeleteDepartment}
                      type="button"
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="dept-create-panel">
              <h2 className="dept-create-panel__title">
                <GraduationCap size={22} />
                Create New Department
              </h2>
              <form className="dept-form" onSubmit={handleCreateDepartment}>
                <div className="dept-form__row">
                  <label className="dept-label" htmlFor="dept-name">Department Name (e.g., CS&IT)</label>
                  <input
                    id="dept-name"
                    className="dept-input"
                    type="text"
                    placeholder="e.g., CS&IT"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    required
                  />
                </div>
                <div className="dept-form__row">
                  <label className="dept-label" htmlFor="dept-year">Year</label>
                  <select
                    id="dept-year"
                    className="dept-input"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    required
                  >
                    {YEARS.map((year) => (
                      <option key={year.id} value={year.id}>{year.title}</option>
                    ))}
                  </select>
                </div>
                <button className="dept-create-btn" type="submit" disabled={isCreatingDept}>
                  <Layers size={18} />
                  {isCreatingDept ? 'Creating...' : '+ Create Department'}
                </button>
              </form>
            </div>

            <div className="dept-list-header">
              <h3 className="dept-list-header__title">Existing Departments</h3>
              <span className="dept-list-header__count">{filteredDepartments.length}</span>
            </div>

            <div className="department-year-filter" role="tablist" aria-label="Filter departments by year">
              {YEARS.map((year) => (
                <button
                  key={year.id}
                  type="button"
                  className={`department-year-filter__button ${selectedYear === year.id ? 'department-year-filter__button--active' : ''}`}
                  onClick={() => setSelectedYear(year.id)}
                >
                  {year.title}
                </button>
              ))}
            </div>

            <div className="dept-grid">
              {filteredDepartments.length > 0 ? filteredDepartments.map((dept) => (
                <div key={dept.id} className="dept-card">
                  <div className="dept-card__glow" />
                  <div className="dept-card__top">
                    <div className="dept-card__icon-box">
                      <GraduationCap size={20} />
                    </div>
                    <button
                      className="dept-card__delete-btn"
                      onClick={() => setDeptToDelete(dept.id)}
                      aria-label="Delete department"
                      type="button"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="dept-card__body">
                    <h4 className="dept-card__name">{dept.name}</h4>
                    <p className="dept-card__desc">{dept.description}</p>
                  </div>
                </div>
              )) : (
                <div className="dept-empty">No departments found for {selectedYear}.</div>
              )}
            </div>
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}
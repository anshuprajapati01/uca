import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase, createTempClient } from '../../lib/supabase.js';
import { ROUTES, AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import { Shield, Users, BarChart3, Layers, BookOpen, Target, Award, ArrowLeft, UploadCloud, Send, FileText, Archive, ScrollText, PenTool, Phone, Mail, X, Trash2, GraduationCap, Eye } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import './DirectorDashboard-v2.css';
import HodManagement from './HodManagement.jsx';
import DirectorStudentDirectory from './DirectorStudentDirectory.jsx';
import DirectorAttendance from './DirectorAttendance.jsx';

const DIRECTOR_NAV = [
  { id: 'overview', label: '🏠 Overview', path: ROUTES.DIRECTOR_DASHBOARD },
  { id: 'academic', label: '🎓 Academic Hub', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=academic` },
  { id: 'attendance', label: '📊 Attendance Analytics', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=attendance` },
  { id: 'faculty', label: '👥 Manage Faculty', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=faculty` },
  { id: 'departments', label: '🏢 Manage Departments', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=departments` },
  { id: 'hod-management', label: '👨‍🏫 HOD Management', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=hod-management` },
  { id: 'student-directory', label: '📖 Student Directory', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=student-directory` },
  { id: 'master-syllabus', label: '📚 Master Syllabus', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=master-syllabus` },
  { id: 'announcements', label: '📢 Announcements', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=announcements` },
];

const MASTER_YEARS = [1, 2, 3, 4];
const MASTER_BRANCHES = ['IT', 'CSE', 'ECE', 'ME', 'CE', 'CS', 'AI ML', 'DS', 'VLSI'];

const YEARS = [
  { id: '1st Year', title: '1st Year', subtitle: 'Foundation', icon: BookOpen, color: 'purple' },
  { id: '2nd Year', title: '2nd Year', subtitle: 'Core Studies', icon: Layers, color: 'emerald' },
  { id: '3rd Year', title: '3rd Year', subtitle: 'Advanced Core', icon: Target, color: 'amber' },
  { id: '4th Year', title: '4th Year', subtitle: 'Specialization', icon: Award, color: 'rose' },
];

const extractReferencedId = (details = '') => {
  const match = details.match(/Key \(id\)=\(([0-9a-fA-F-]{36})\)/);
  return match?.[1] || null;
};

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

const getSemestersForYear = (year, liveSemesterIds = new Set()) => {
  if (year === '1st Year') return [
    { id: 'ash1', name: 'ASH 1', isLive: liveSemesterIds.has('ash1') },
    { id: 'ash2', name: 'ASH 2', isLive: liveSemesterIds.has('ash2') }
  ];
  if (year === '2nd Year') return [
    { id: 'sem3', name: 'Semester 3', isLive: liveSemesterIds.has('sem3') },
    { id: 'sem4', name: 'Semester 4', isLive: liveSemesterIds.has('sem4') }
  ];
  if (year === '3rd Year') return [
    { id: 'sem5', name: 'Semester 5', isLive: liveSemesterIds.has('sem5') },
    { id: 'sem6', name: 'Semester 6', isLive: liveSemesterIds.has('sem6') }
  ];
  if (year === '4th Year') return [
    { id: 'sem7', name: 'Semester 7', isLive: liveSemesterIds.has('sem7') },
    { id: 'sem8', name: 'Semester 8', isLive: liveSemesterIds.has('sem8') }
  ];
  return [];
};

const IconPDF = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="8" y2="12" />
    <line x1="12" y1="16" x2="8" y2="16" />
    <line x1="12" y1="20" x2="8" y2="20" />
  </svg>
);
const IconLink = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54-.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
    <path d="M14 11a5 5 0 0 0-7.54.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
  </svg>
);

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
  const name = department.name;
  const hod = department.hodName || department.hod_name || 'Not Assigned';
  const hodAvatar = department.hodAvatar || null;
  const year = department.year || '1st Year';
  const branches = Array.isArray(department.branches) ? department.branches : [];

  return (
    <div className="director-dept-card">
      <div className="director-dept-card__header">
        <h3 className="director-dept-card__name">{name}</h3>
        <span className="director-dept-card__year">{year}</span>
      </div>
      <div className="director-dept-card__hod">
        {hodAvatar ? (
          <img 
            src={hodAvatar} 
            alt={hod} 
            className="director-dept-card__avatar"
            style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <Shield size={14} />
        )}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalFaculty, setTotalFaculty] = useState(0);
  const [directorName, setDirectorName] = useState('Director');
  const [userBranchId, setUserBranchId] = useState(null);

  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedSubBranch, setSelectedSubBranch] = useState(null);
  const [branchViewTab, setBranchViewTab] = useState('academic');
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectType, setSubjectType] = useState('theory');
  const [broadcastTab, setBroadcastTab] = useState('global');
  const [urgency, setUrgency] = useState('normal');
  const [targetYears, setTargetYears] = useState([]);

  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ title: 'Mr.', fullName: '', email: '', phone: '', avatarUrl: '' });
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
  const [liveDeptRows, setLiveDeptRows] = useState([]);
  const [academicDepts, setAcademicDepts] = useState([]);
  const [subjectViewAnnouncements, setSubjectViewAnnouncements] = useState([]);
  const [subjectViewGeneralAnnouncements, setSubjectViewGeneralAnnouncements] = useState([]);
  const [subjectViewAnnouncementsLoading, setSubjectViewAnnouncementsLoading] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [materialToDeleteId, setMaterialToDeleteId] = useState(null);
  const [directorSubjectMaterials, setDirectorSubjectMaterials] = useState([]);
  const [directorActiveFilter, setDirectorActiveFilter] = useState('All');
  const [directorMaterialCategories, setDirectorMaterialCategories] = useState(['All']);

  const [masterYear, setMasterYear] = useState(2);
  const [masterBranch, setMasterBranch] = useState('IT');
  const [masterSubjectsList, setMasterSubjectsList] = useState([]);
  const [masterSubjectsLoading, setMasterSubjectsLoading] = useState(false);
  const [masterSubjectsError, setMasterSubjectsError] = useState(null);
  const [showMasterSubjectModal, setShowMasterSubjectModal] = useState(false);
  const [masterForm, setMasterForm] = useState({ name: '', code: '', credits: 3, type: 'Theory' });
  const [isAddingMasterSubject, setIsAddingMasterSubject] = useState(false);
  const [masterSubjectToDelete, setMasterSubjectToDelete] = useState(null);

  const [handoverModal, setHandoverModal] = useState({ isOpen: false, faculty: null, replacementFacultyId: '' });
  const [selectedActionFaculty, setSelectedActionFaculty] = useState(null);
  const [actionPhone, setActionPhone] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

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
      setSelectedSubBranch(null);
      setSelectedSemester(null);
      setSelectedSubject(null);
      return;
    }

    setSelectedBranch(null);
    setSelectedSubBranch(null);
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
         const { data: userProfile } = await supabase.from('user_profiles').select('full_name, branch_id').eq('id', user?.id).single();
         const branchId = userProfile?.branch_id;
         if (!cancelled) {
           setUserBranchId(branchId);
           if (userProfile?.full_name) setDirectorName(userProfile.full_name);
         }

         const baseStudentQuery = supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'student');
         const baseFacultyQuery = supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'faculty');
         const baseFacultyListQuery = supabase.from('user_profiles').select('*').eq('role', 'faculty');

         const [studentRes, facultyRes, facultyListRes] = await Promise.all([
           branchId ? baseStudentQuery.eq('branch_id', branchId) : baseStudentQuery,
           branchId ? baseFacultyQuery.eq('branch_id', branchId) : baseFacultyQuery,
           branchId ? baseFacultyListQuery.eq('branch_id', branchId) : baseFacultyListQuery,
         ]);

          if (!cancelled) {
            setTotalStudents(studentRes.count || 0);
            setTotalFaculty(facultyRes.count || 0);
            setDbFaculty(facultyListRes.data || []);
            fetchDepartments(branchId);
            fetchAcademicDepartments(branchId);
          }
       } catch (err) {
         console.error('Failed to load director dashboard data:', err);
       }
     }
   }, []);

  const getDepartmentsForYear = (yearId) => {
    return academicDepts.filter(d => d.year === yearId);
  };

  const totalDepartmentsCount = useMemo(() => {
    return academicDepts.length;
  }, [academicDepts]);

  const currentSubjects = useMemo(() => {
    if (subjectsLoading || subjectsError) return { theory: [], practical: [], skill: [], 'non-academic': [] };
    const theory = dbSemesterSubjects.filter((s) => s.type?.toLowerCase() === 'theory');
    const practical = dbSemesterSubjects.filter((s) => s.type?.toLowerCase() === 'practical');
    const skill = dbSemesterSubjects.filter((s) => s.type?.toLowerCase() === 'skill');
    const nonAcademic = dbSemesterSubjects.filter((s) => s.type?.toLowerCase() === 'non-academic');
    return { theory, practical, skill, 'non-academic': nonAcademic };
  }, [dbSemesterSubjects, subjectsLoading, subjectsError]);

  const handleBranchClick = (branchName, departmentInfo) => {
    const isAggregate = isAggregateDepartment(branchName);
    setSelectedBranch({ name: branchName, dept: departmentInfo });
    if (isAggregate) {
      setSelectedSubBranch(null);
    } else {
      setSelectedSubBranch(branchName);
    }
    setSelectedSemester(null);
    setSubjectType('theory');
  };

  const handleSubBranchClick = (subBranchName) => {
    setSelectedSubBranch(subBranchName);
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

  const handleBackToBranches = () => {
    setSelectedSubBranch(null);
  };

  const isAggregateDepartment = (deptName) => {
    return Object.prototype.hasOwnProperty.call(AGGREGATE_DEPARTMENTS, deptName);
  };

  const getSubBranchesForAggregate = (aggregateName) => {
    return AGGREGATE_DEPARTMENTS[aggregateName] || [];
  };

  const fetchDirectorSubjects = useCallback(async () => {
    if (!selectedAcademicYear || !selectedSemester) {
      setDbSemesterSubjects([]);
      return;
    }

    setSubjectsLoading(true);
    setSubjectsError(null);

    try {
      const departmentForQuery = selectedSubBranch || selectedBranch?.name;
      if (!departmentForQuery) {
        setDbSemesterSubjects([]);
        return;
      }

      const { data, error } = await supabase
        .from('subjects')
        .select('*, faculty:faculty_id(id, full_name, avatar_url, expertise_tags)')
        .eq('department', departmentForQuery)
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
  }, [selectedAcademicYear, selectedBranch, selectedSubBranch, selectedSemester]);

  useEffect(() => {
    fetchDirectorSubjects();
  }, [fetchDirectorSubjects]);

  const fetchMasterSubjects = useCallback(async () => {
    setMasterSubjectsLoading(true);
    setMasterSubjectsError(null);
    try {
      const { data, error } = await supabase
        .from('master_syllabus')
        .select('*')
        .eq('year', masterYear)
        .eq('branch', masterBranch)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMasterSubjectsList(data || []);
    } catch (err) {
      console.error('Failed to fetch master subjects:', err);
      setMasterSubjectsError(err.message);
      setMasterSubjectsList([]);
    } finally {
      setMasterSubjectsLoading(false);
    }
  }, [masterYear, masterBranch]);

  useEffect(() => {
    fetchMasterSubjects();
  }, [fetchMasterSubjects]);

  const isOptionalMasterType = (type) =>
    type === 'Skill' || type === 'Practical' || type === 'Non-Academic';

  const handleAddMasterSubject = async (e) => {
    e.preventDefault();
    const name = masterForm.name.trim();
    const isOptional = isOptionalMasterType(masterForm.type);
    const code = isOptional ? (masterForm.code.trim() || 'N/A') : masterForm.code.trim();
    if (!name || (!isOptional && !code)) {
      toast.error(isOptional ? 'Subject Name is required.' : 'Subject Name and Subject Code are required.');
      return;
    }

    setIsAddingMasterSubject(true);
    try {
      const { error } = await supabase
        .from('master_syllabus')
        .insert([{
          name,
          code,
          credits: Number(masterForm.credits) || 0,
          type: masterForm.type,
          year: masterYear,
          branch: masterBranch,
        }]);

      if (error) throw error;

      toast.success('Master subject added successfully.');
      setMasterForm({ name: '', code: '', credits: 3, type: 'Theory' });
      setShowMasterSubjectModal(false);
      fetchMasterSubjects();
    } catch (err) {
      console.error('Failed to add master subject:', err);
      toast.error('Failed to add master subject: ' + err.message);
    } finally {
      setIsAddingMasterSubject(false);
    }
  };

  const confirmDeleteMasterSubject = async () => {
    if (!masterSubjectToDelete) return;
    try {
      const { error } = await supabase
        .from('master_syllabus')
        .delete()
        .eq('id', masterSubjectToDelete);

      if (error) throw error;

      setMasterSubjectsList(prev => prev.filter(s => s.id !== masterSubjectToDelete));
      setMasterSubjectToDelete(null);
      toast.success('Master subject deleted successfully.');
    } catch (err) {
      console.error('Failed to delete master subject:', err);
      toast.error('Failed to delete master subject.');
    }
  };

  const fetchSubjectViewAnnouncements = useCallback(async () => {
    if (!selectedSemester || !selectedBranch) {
      setSubjectViewAnnouncements([]);
      setSubjectViewGeneralAnnouncements([]);
      return;
    }

    setSubjectViewAnnouncementsLoading(true);

    try {
      const branchName = selectedSubBranch || selectedBranch?.name;
      const semesterId = selectedSemester.id;

      console.log('Fetching subject view announcements with filters:', { branchName, semesterId, selectedSemester, selectedBranch });

      const { data, error } = await supabase
        .from('announcements')
        .select('*, sender:user_profiles!announcements_sent_by_fkey(full_name, role)')
        .or(`branch.eq.${branchName},branch.is.null`)
        .or(`semester.eq.${semesterId},semester.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        console.log(error);
        throw error;
      }

      if (data && data.length > 0) {
        setSubjectViewAnnouncements(data);
        setSubjectViewGeneralAnnouncements([]);
      } else {
        setSubjectViewAnnouncements([]);
        console.log(branchName, semesterId);
        console.log('No specific announcements found, fetching general announcements...');
        const { data: generalData, error: generalError } = await supabase
          .from('announcements')
          .select('*, sender:user_profiles!announcements_sent_by_fkey(full_name, role)')
          .is('branch', null)
          .is('semester', null)
          .order('created_at', { ascending: false });

        if (generalError) throw generalError;
        setSubjectViewGeneralAnnouncements(generalData || []);
      }
    } catch (err) {
      console.error('Failed to fetch subject view announcements:', err);
      setSubjectViewAnnouncements([]);
      setSubjectViewGeneralAnnouncements([]);
    } finally {
      setSubjectViewAnnouncementsLoading(false);
    }
  }, [selectedSemester, selectedBranch, selectedSubBranch]);

  const confirmDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementToDelete);

      if (error) throw error;

      setSubjectViewAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete));
      setSubjectViewGeneralAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete));
      setAnnouncementToDelete(null);
      toast.success('Announcement deleted successfully');
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      toast.error('Failed to delete announcement');
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDeleteId) return;

    try {
      const { error } = await supabase
        .from('study_materials')
        .delete()
        .eq('id', materialToDeleteId);

      if (error) throw error;

      setDirectorSubjectMaterials(prev => prev.filter(m => m.id !== materialToDeleteId));
      setMaterialToDeleteId(null);
      toast.success('Material deleted successfully');
    } catch (err) {
      console.error('Failed to delete material:', err);
      toast.error('Failed to delete material');
    }
  };

  const renderAnnouncementCard = (announcement) => {
    const hasLink = announcement.file_url || announcement.link;
    const viewHref = announcement.file_url || announcement.link || '#';

    return (
      <article
        key={announcement.id}
        style={{
          backgroundColor: 'rgba(31, 41, 55, 0.4)',
          border: '1px solid rgba(55, 65, 81, 0.5)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#ffffff', margin: 0, textAlign: 'left' }}>
            {announcement.title}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ padding: '4px 12px', backgroundColor: 'rgba(55, 65, 81, 0.5)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '600', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {announcement.priority || announcement.type || 'General'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {announcement.created_at ? new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
            </span>
          </div>
        </div>

        <p style={{ color: '#d1d5db', fontSize: '0.875rem', textAlign: 'left', marginBottom: hasLink ? '24px' : 0, whiteSpace: 'pre-wrap', marginTop: 0 }}>
          {announcement.content || announcement.message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
          {(hasLink) && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href={viewHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(30, 58, 138, 0.4)', color: '#bfdbfe', fontSize: '0.875rem', fontWeight: '500', borderRadius: '9999px', textDecoration: 'none' }}
              >
                <Eye size={16} /> View
              </a>
              <button
                onClick={() => setAnnouncementToDelete(announcement.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', fontSize: '0.875rem', fontWeight: '500', borderRadius: '9999px', border: '1px solid rgba(244, 63, 94, 0.4)', cursor: 'pointer' }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
          <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>
            Sent by: {announcement.sender?.full_name || 'Admin'} ({announcement.sender?.role || 'Admin'})
          </div>
        </div>
      </article>
    );
  };

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
        // 0. Strict BIT email domain validation BEFORE creating the user
        if (!facultyForm.email.toLowerCase().endsWith('@bit.ac.in')) {
            toast.error("Official email must end with @bit.ac.in");
            setIsAddingFaculty(false);
            return;
        }

        // 1. Ensure tempClient doesn't read the existing browser session
        const tempClient = createTempClient();

        // 2. Create the Auth account
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: facultyForm.email,
            password: 'Test@123'
        });

        if (authError) {
            toast.error("Signup Error: " + authError.message); // 👈 Alert ki jagah Red Toast
            setIsAddingFaculty(false);
            return;
        }

        // 3. EXPLICITLY grab the NEW user's ID
        const newFacultyId = authData?.user?.id;
        if (!newFacultyId) {
            toast.error("Failed to retrieve new user ID."); // 👈 Alert ki jagah Red Toast
            setIsAddingFaculty(false);
            return;
        }

        // 4. Insert into user_profiles using the NEW ID
        const { error: profileError } = await supabase.from('user_profiles').insert([{
            id: newFacultyId,
            full_name: `${facultyForm.title} ${facultyForm.fullName}`,
            email: facultyForm.email,
            phone: facultyForm.phone,
            avatar_url: facultyForm.avatarUrl,
            expertise_tags: expertiseTags,
            role: 'faculty',
            college_id: null,
            is_active: true
        }]);

        if (profileError) {
            toast.error("Profile Save Error: " + profileError.message); // 👈 Alert ki jagah Red Toast
            setIsAddingFaculty(false);
            return;
        }

        // 👉 YAHAN AAYEGA SUCCESS TOAST (Purane setFacultyToast ki jagah)
        toast.success('Faculty added successfully. Default password is Test@123');
        
        setShowAddFacultyModal(false);
        setFacultyForm({ title: 'Mr.', fullName: '', email: '', phone: '', avatarUrl: '' });
        setExpertiseTags([]);
        setExpertiseInput('');
        loadFacultyList();
    } catch (error) {
        // 👉 CATCH MEIN BHI RED TOAST
        toast.error('Error: ' + error.message);
    } finally {
        setIsAddingFaculty(false);
        // react-hot-toast khud gayab ho jata hai, toh timeout ki zaroorat nahi!
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
    const baseQuery = supabase.from('user_profiles').select('*').eq('role', 'faculty');
    const { data } = await (userBranchId ? baseQuery.eq('branch_id', userBranchId) : baseQuery);
    if (data) setDbFaculty(data);
  };

  const fetchDepartments = async (branchId) => {
    const effectiveBranchId = branchId ?? userBranchId;
    const baseQuery = supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });

    const { error, data } = await (effectiveBranchId ? baseQuery.eq('id', effectiveBranchId) : baseQuery);

    if (error) {
      console.error("Error fetching branches:", error);
      return;
    }
    if (data) {
      setDepartments(data || []);
    }
  };

  const fetchLiveDepartments = async () => {
    if (!selectedAcademicYear) {
      setLiveDeptRows([]);
      return;
    }

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('description', selectedAcademicYear)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching live departments:", error);
      return;
    }
    if (data) {
      setLiveDeptRows(data || []);
    }
  };

  const fetchAcademicDepartments = async (branchId) => {
    const effectiveBranchId = branchId ?? userBranchId;
    const baseQuery = supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: branchData, error: branchError } = await (effectiveBranchId ? baseQuery.eq('id', effectiveBranchId) : baseQuery);

    if (branchError) {
      console.error('Error fetching branches for academic hub:', branchError);
      return;
    }

    if (branchData) {
      const hodMap = new Map();
      const { data: deptData } = await supabase
        .from('departments')
        .select('name, code, description, hod_id, user_profiles:user_profiles!hod_id(full_name, avatar_url)')
        .not('hod_id', 'is', null);

      (deptData || []).forEach((row) => {
        const trimmedYear = row.description.trim();
        const hodData = {
          hodName: row.user_profiles?.full_name || null,
          hodAvatar: row.user_profiles?.avatar_url || null,
        };

        const nameKey = `${row.name.trim()}|${trimmedYear}`;
        if (!hodMap.has(nameKey)) {
          hodMap.set(nameKey, hodData);
        }

        if (row.code) {
          const codeKey = `${row.code.trim()}|${trimmedYear}`;
          if (!hodMap.has(codeKey)) {
            hodMap.set(codeKey, hodData);
          }
        }
      });

      const mapped = (branchData || []).map((row) => {
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
            branches = trimmedName.split(',').map(s => s.trim()).filter(Boolean);
          } else {
            branches = [trimmedName];
          }
        }

        let hodInfo = hodMap.get(`${trimmedName}|${trimmedYear}`) || { hodName: null, hodAvatar: null };

        if (!hodInfo.hodName) {
          for (const branch of branches) {
            const candidate = hodMap.get(`${branch.trim()}|${trimmedYear}`);
            if (candidate) {
              hodInfo = candidate;
              break;
            }
          }
        }

        return {
          id: row.id,
          name: branchName,
          year: year,
          hodName: hodInfo.hodName,
          hodAvatar: hodInfo.hodAvatar,
          branches,
        };
      });

      setAcademicDepts(mapped);
    }
  };

  useEffect(() => {
    fetchLiveDepartments();
  }, [selectedAcademicYear]);

  useEffect(() => {
    if (activeTab === 'academic') {
      fetchAcademicDepartments();
    }
  }, [location.search]);

  useEffect(() => {
    fetchSubjectViewAnnouncements();
  }, [fetchSubjectViewAnnouncements]);

  useEffect(() => {
    if (!selectedSubject) return;
    let cancelled = false;
    async function fetchDirectorMaterials() {
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .eq('subject_id', selectedSubject.id)
        .order('created_at', { ascending: false });
      if (!cancelled) setDirectorSubjectMaterials(data || []);
      if (error) console.error('Failed to fetch director materials:', error);

      const { data: catData } = await supabase
        .from('material_categories')
        .select('name')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      if (!cancelled && catData) {
        setDirectorMaterialCategories(['All', ...catData.map(c => c.name)]);
      }
    }
    fetchDirectorMaterials();
    return () => { cancelled = true; };
  }, [selectedSubject]);

  useEffect(() => {
    setDirectorActiveFilter('All');
  }, [selectedSubject]);

  const getDirectorFilteredMaterials = () => {
    if (!selectedSubject) return [];
    if (directorActiveFilter === 'All') return directorSubjectMaterials;
    return directorSubjectMaterials.filter((m) => {
      const type = (m.type || m.category || '').toLowerCase();
      return type === directorActiveFilter.toLowerCase() || type.includes(directorActiveFilter.toLowerCase());
    });
  };

  const handleViewFile = (url) => {
    if (!url) return alert('No file link available.');
    if (url.startsWith('local:') || !url.includes('.')) {
      return alert(`This is a local file placeholder: ${url.replace('local:', '')}\n\nNote: To view actual uploaded PDF/Doc files, we need to configure Supabase Storage Buckets. For now, Google Drive links will work perfectly!`);
    }
    try {
      const finalUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      alert('Invalid link format.');
    }
  };

  const getLiveSemesterIdForBranch = (year, branchName) => {
    if (!year || !branchName || liveDeptRows.length === 0) return null;
    const deptRow = liveDeptRows.find(
      (d) => (d.code || d.name) === branchName && d.description === year
    );
    if (!deptRow) return null;
    for (let i = 1; i <= 8; i++) {
      if (deptRow[`is_sem${i}_live`]) {
        return `sem${i}`;
      }
    }
    return null;
  };

  const buildLiveSemesterIdsSet = (deptRows) => {
    const ids = new Set();
    deptRows.forEach((d) => {
      for (let i = 1; i <= 8; i++) {
        if (d[`is_sem${i}_live`]) {
          ids.add(`sem${i}`);
        }
      }
    });
    return ids;
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
      await fetchAcademicDepartments();
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

    if (subjectIds.size > 0) {
      const subjectIdList = Array.from(subjectIds);

      await supabase.from('study_materials').delete().in('subject_id', subjectIdList);
      await supabase.from('study_materials').delete().in('subject_id', subjectIdList);

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
        await fetchAcademicDepartments();
        return;
      }

      const referencedBatchId = extractReferencedId(branchDeleteError.details);
      const isBatchFkLock = branchDeleteError.code === '23503'
        && branchDeleteError.details?.includes('batches')
        && referencedBatchId;

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
      await fetchAcademicDepartments();
    } catch (err) {
      console.error('Delete Error:', err);
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleHandoverAndDelete = async () => {
    if (!handoverModal.replacementFacultyId) {
      toast.error("Please select a replacement faculty.");
      return;
    }

    const oldId = handoverModal.faculty.id;
    const newId = handoverModal.replacementFacultyId;

    try {
      // STEP 1: Transfer Subjects
      const { data: subData, error: subErr } = await supabase
        .from('subjects')
        .update({ faculty_id: newId })
        .eq('faculty_id', oldId)
        .select(); // Force return of updated rows
      if (subErr) throw new Error("Subjects Update Error: " + subErr.message);
      console.log("Subjects transferred:", subData);

      // STEP 2: Transfer HOD Roles
      const { data: deptData, error: deptErr } = await supabase
        .from('departments')
        .update({ hod_id: newId })
        .eq('hod_id', oldId)
        .select(); // Force return of updated rows
      if (deptErr) throw new Error("Departments Update Error: " + deptErr.message);
      console.log("Departments transferred:", deptData);

      // STEP 3: Transfer Timetable Slots
      const { data: timeData, error: timeErr } = await supabase
        .from('timetable_slots')
        .update({ faculty_id: newId })
        .eq('faculty_id', oldId)
        .select(); // Force return of updated rows
      if (timeErr) throw new Error("Timetable Slots Update Error: " + timeErr.message);
      console.log("Timetable slots transferred:", timeData);

      // STEP 4: Safely Delete the old profile
      const { error: delErr } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', oldId);
      if (delErr) throw delErr;

      toast.success("Handover and deletion successful!");
      setHandoverModal({ isOpen: false, faculty: null, replacementFacultyId: "" });
      setDbFaculty(prev => prev.filter(f => f.id !== oldId)); // Refresh the list
      fetchAcademicDepartments();

    } catch (err) {
      console.error("Handover error:", err);
      toast.error(err.message || "Failed to complete handover and deletion.");
    }
  };

  const handleForceDelete = async () => {
    if (!handoverModal.faculty) return;
    const oldId = handoverModal.faculty.id;

    try {
      const { error: subErr } = await supabase.from('subjects').update({ faculty_id: null }).eq('faculty_id', oldId);
      if (subErr) throw new Error("Failed to unassign subjects: " + subErr.message);

      const { error: deptErr } = await supabase.from('departments').update({ hod_id: null }).eq('hod_id', oldId);
      if (deptErr) throw new Error("Failed to unassign HOD roles: " + deptErr.message);

      const { error: timeErr } = await supabase.from('timetable_slots').update({ faculty_id: null }).eq('faculty_id', oldId);
      if (timeErr) throw new Error("Failed to unassign timetable: " + timeErr.message);

      const { error: delErr } = await supabase.from('user_profiles').delete().eq('id', oldId);
      if (delErr) throw delErr;

      toast.success("Faculty deleted and roles left unassigned!");
      setHandoverModal({ isOpen: false, faculty: null, replacementFacultyId: "" });
      setDbFaculty(prev => prev.filter(f => f.id !== oldId));
      loadFacultyList();
      fetchAcademicDepartments();
    } catch (err) {
      console.error("Force Delete Error:", err);
      toast.error(err.message || "Failed to force delete.");
    }
  };

  const otherFaculties = dbFaculty.filter(f => f.id !== handoverModal.faculty?.id);

  const openActionModal = (faculty) => {
    setSelectedActionFaculty(faculty);
    setActionPhone(faculty.phone || '');
  };

  const closeActionModal = () => {
    setSelectedActionFaculty(null);
    setActionPhone('');
    setIsUpdatingPhone(false);
    setIsSendingReset(false);
  };

  const handleUpdatePhone = async () => {
    if (!selectedActionFaculty) return;
    setIsUpdatingPhone(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone: actionPhone.trim() })
        .eq('id', selectedActionFaculty.id);

      if (error) throw error;

      toast.success('Phone number updated successfully!');
      setDbFaculty((prev) =>
        prev.map((f) =>
          f.id === selectedActionFaculty.id ? { ...f, phone: actionPhone.trim() } : f,
        ),
      );
      setSelectedActionFaculty((prev) =>
        prev ? { ...prev, phone: actionPhone.trim() } : prev,
      );
    } catch (error) {
      toast.error('Failed to update phone: ' + error.message);
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!selectedActionFaculty?.email) {
      toast.error('No email found for this faculty');
      return;
    }
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        selectedActionFaculty.email.trim(),
        { redirectTo: `${window.location.origin}/update-password` },
      );

      if (error) throw error;

      toast.success(`Password reset link sent to ${selectedActionFaculty.email}`);
    } catch (error) {
      toast.error('Failed to send reset link: ' + error.message);
    } finally {
      setIsSendingReset(false);
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
{selectedBranch && !selectedSemester && (
               <div className="director-branch-view-wrapper">
                 <button
                   className="director-back-btn director-back-btn--premium"
                   onClick={() => {
                     if (isAggregateDepartment(selectedBranch.name)) {
                       setSelectedSubBranch(null);
                     }
                     setSelectedBranch(null);
                   }}
                 >
                   <ArrowLeft size={18} /> Back to Departments
                 </button>

                 {isAggregateDepartment(selectedBranch.name) && !selectedSubBranch ? (
                   <div className="director-subbranch-view">
                     <h3 className="director-subbranch-title">Select Sub-Branch for {selectedBranch.name}</h3>
                     <div className="director-subbranches-grid">
                       {getSubBranchesForAggregate(selectedBranch.name).map((subBranch) => (
                         <div
                           key={subBranch}
                           className="director-subbranch-card"
                           onClick={() => handleSubBranchClick(subBranch)}
                         >
                           {subBranch}
                         </div>
                       ))}
                     </div>
                   </div>
                 ) : (
                   <>
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
                        {isAggregateDepartment(selectedBranch.name) && (
                          <button
                            type="button"
                            className="director-back-btn--subbranch"
                            onClick={handleBackToBranches}
                          >
                            <ArrowLeft size={16} /> Back to Sub-Branches
                          </button>
                        )}
                      </div>

                      <div className="sem-grid-container">
                          {getSemestersForYear(selectedAcademicYear, buildLiveSemesterIdsSet(liveDeptRows)).map((sem) => (
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
                    </>
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

                            <div className="director-material-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                              {directorMaterialCategories.map((f) => (
                                <button
                                  key={f}
                                  className={`director-filter-pill ${directorActiveFilter === f ? 'director-filter-pill--active' : ''}`}
                                  onClick={() => setDirectorActiveFilter(f)}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                            <div className="director-materials-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                              {getDirectorFilteredMaterials().length > 0 ? (
                                getDirectorFilteredMaterials().map((material) => (
                                  <div
                                    key={material.id}
                                    className="director-material-card"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '1rem',
                                      padding: '1rem 1.25rem',
                                      borderRadius: '14px',
                                      background: 'rgba(20, 20, 40, 0.72)',
                                      backdropFilter: 'blur(12px)',
                                      border: '1px solid rgba(255, 255, 255, 0.07)',
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                      e.currentTarget.style.boxShadow = '0 4px 18px rgba(99, 102, 241, 0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'rgba(139, 92, 246, 0.12)',
                                        border: '1px solid rgba(139, 92, 246, 0.22)',
                                        color: '#a5b4fc',
flexShrink: 0,
                                       }}
                                     >
                                       {material.file_type === 'pdf' || material.type === 'PYQ' || material.type === 'Syllabus' ? (
                                         <IconPDF />
                                       ) : (
                                         <IconLink />
                                       )}
                                     </div>
                                     <div style={{ flex: 1, minWidth: 0 }}>
                                       <h4
                                         style={{
                                           fontSize: '0.88rem',
                                           fontWeight: 600,
                                           color: '#e2e8f0',
                                           margin: '0 0 0.35rem',
                                           lineHeight: 1.3,
                                         }}
                                       >
                                         {material.title || material.name || 'Untitled'}
                                       </h4>
                                       <span
                                         className={`director-material-card__badge director-material-card__badge--${(material.type || material.category || 'resource').toLowerCase().replace(/\s+/g, '-')}`}
                                         style={{
                                           display: 'inline-block',
                                           fontSize: '0.68rem',
                                           fontWeight: 700,
                                           textTransform: 'uppercase',
                                           letterSpacing: '0.08em',
                                           padding: '0.2rem 0.65rem',
                                           borderRadius: '999px',
                                           border: '1px solid transparent',
                                         }}
                                       >
                                         {material.type || material.category || 'Resource'}
                                       </span>
                                     </div>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                       <button
                                         style={{
                                           display: 'inline-flex',
                                           alignItems: 'center',
                                           gap: '8px',
                                           padding: '8px 16px',
                                           background: '#3b82f6',
                                           color: '#fff',
                                           border: 'none',
                                           borderRadius: '8px',
                                           cursor: 'pointer',
                                           fontWeight: 'bold',
                                           fontSize: '14px',
                                           transition: '0.2s',
                                         }}
                                         onClick={() => handleViewFile(material.file_url)}
                                         onMouseEnter={(e) => {
                                           e.currentTarget.style.background = '#2563eb';
                                         }}
                                         onMouseLeave={(e) => {
                                           e.currentTarget.style.background = '#3b82f6';
                                         }}
                                       >
                                         <svg
                                           width="14"
                                           height="14"
                                           viewBox="0 0 24 24"
                                           fill="none"
                                           stroke="currentColor"
                                           strokeWidth="2.5"
                                           strokeLinecap="round"
                                           strokeLinejoin="round"
                                         >
                                           <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                           <circle cx="12" cy="12" r="3" />
                                         </svg>
                                         View
                                       </button>
                                       <button
                                         onClick={() => setMaterialToDeleteId(material.id)}
                                         style={{
                                           display: 'inline-flex',
                                           alignItems: 'center',
                                           gap: '8px',
                                           padding: '8px 16px',
                                           backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                           color: '#f43f5e',
                                           fontSize: '0.875rem',
                                           fontWeight: '500',
                                           borderRadius: '9999px',
                                           border: '1px solid rgba(244, 63, 94, 0.4)',
                                           cursor: 'pointer',
                                         }}
                                       >
                                         <Trash2 size={16} /> Delete
                                       </button>
                                     </div>
                                   </div>
                                 ))
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    padding: '2.5rem 1rem',
                                    color: '#64748b',
                                    fontStyle: 'italic',
                                    textAlign: 'center',
                                  }}
                                >
                                  <p>
                                    No {directorActiveFilter} uploaded for {selectedSubject.name} yet.
                                  </p>
                                </div>
                              )}
                            </div>
                        </div>
                    ) : (
                        <div className="pw-subject-view-main">
                            <div className="director-subject-view">
                                <div className="director-subject-view__header">
                                    <div>
                                        <p className="director-subject-view__eyebrow">
                                            {selectedAcademicYear}
                                        </p>
                                        <h2 className="director-subject-view__title">
                                            Semester {selectedSemester.name.replace('Semester ', '')} • {selectedSubBranch || selectedBranch?.name}
                                        </h2>
                                        <p className="director-subject-view__subtitle">
                                            Department of {selectedBranch?.dept?.name || selectedBranch?.name} • {selectedAcademicYear}
                                        </p>
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
                                         Practical Subjects
                                     </button>
                                     <button
                                         type="button"
                                         className={`subject-tab-btn ${subjectType === 'skill' ? 'subject-tab-btn--active' : ''}`}
                                         role="tab"
                                         aria-selected={subjectType === 'skill'}
                                         onClick={() => setSubjectType('skill')}
                                     >
                                         Skill
                                     </button>
                                     <button
                                         type="button"
                                         className={`subject-tab-btn ${subjectType === 'non-academic' ? 'subject-tab-btn--active' : ''}`}
                                         role="tab"
                                         aria-selected={subjectType === 'non-academic'}
                                         onClick={() => setSubjectType('non-academic')}
                                     >
                                         Non-Academic
                                     </button>
                                     <button
                                        type="button"
                                        className={`subject-tab-btn ${subjectType === 'announcements' ? 'subject-tab-btn--active' : ''}`}
                                        role="tab"
                                        aria-selected={subjectType === 'announcements'}
                                        onClick={() => setSubjectType('announcements')}
                                    >
                                        Announcements
                                    </button>
                                </div>

                                {subjectType === 'announcements' ? (
                                    <div className="pw-announcements-section">
                                        <div className="director-subject-view__header" style={{ marginBottom: '1.25rem' }}>
                                            <h2 className="director-subject-view__title">Semester Announcements</h2>
                                            <p className="director-subject-view__eyebrow" style={{ marginTop: '0.5rem' }}>
                                                {selectedSemester.name} • {selectedSubBranch || selectedBranch?.name}
                                            </p>
                                        </div>
                                        {subjectViewAnnouncementsLoading ? (
                                            <div className="pw-loading-subjects">Loading announcements...</div>
                                        ) : subjectViewAnnouncements.length > 0 ? (
                                            <div>
                                                {subjectViewAnnouncements.map((announcement) => renderAnnouncementCard(announcement))}
                                            </div>
                                        ) : subjectViewGeneralAnnouncements.length > 0 ? (
                                            <div>
                                                <h3 className="pw-general-announcements-title">General Announcements</h3>
                                                <div>
                                                    {subjectViewGeneralAnnouncements.map((announcement) => renderAnnouncementCard(announcement))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="pw-empty-subjects">No announcements found for this semester.</div>
                                        )}
                                    </div>
) : (
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
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
             
         </section>
         )}

         {/* --- ATTENDANCE ANALYTICS --- */}
         {activeTab === 'attendance' && (
           <DirectorAttendance />
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
          <section 
            className="director-section"
            style={{ height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div 
              className="faculty-header"
              style={{ flexShrink: 0, padding: '10px 0 20px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px' }}
            >
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
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                        <select
                          className="add-faculty-input"
                          style={{ maxWidth: '110px' }}
                          value={facultyForm.title}
                          onChange={(e) => setFacultyForm({ ...facultyForm, title: e.target.value })}
                        >
                          <option value="Mr.">Mr.</option>
                          <option value="Mrs.">Mrs.</option>
                          <option value="Ms.">Ms.</option>
                          <option value="Dr.">Dr.</option>
                          <option value="Prof.">Prof.</option>
                        </select>
                        <input
                          className="add-faculty-input"
                          type="text"
                          placeholder="Enter full name"
                          required
                          style={{ flex: 1 }}
                          value={facultyForm.fullName}
                          onChange={(e) => setFacultyForm({ ...facultyForm, fullName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Email</label>
                      <input
                        className="add-faculty-input"
                        type="email"
                        placeholder="e.g., Faculty123@bit.ac.in"
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
                      <label className="add-faculty-label">Expertise</label>
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

            {/* 👇 YAHAN SE SCROLLABLE AREA START HOTA HAI */}
            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search faculty by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>
            <div style={{ overflowY: 'auto', flexGrow: 1, paddingBottom: '40px', paddingRight: '10px' }}>
              <div className="premium-faculty-grid">
                {(() => {
                  const filteredFaculties = dbFaculty.filter((faculty) => {
                    const query = searchQuery.toLowerCase();
                    const name = faculty.full_name?.toLowerCase() || '';
                    const email = faculty.email?.toLowerCase() || '';
                    const phone = faculty.phone?.toLowerCase() || '';

                    return name.includes(query) || email.includes(query) || phone.includes(query);
                  });

                  return filteredFaculties.length > 0 ? filteredFaculties.map((faculty) => {
                  const fullName = faculty.full_name || faculty.name || 'Unknown';
                  const email = faculty.email || '—';
                  const phone = faculty.phone || faculty.phone_number || '—';
                  const avatarUrl = faculty.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=8b5cf6&color=fff`;
                  const facultyTags = Array.isArray(faculty.expertise_tags) ? faculty.expertise_tags : [];

                   return (
                     <div key={faculty.id} className="premium-faculty-card" style={{ cursor: 'pointer' }} onClick={() => openActionModal(faculty)}>
                       <div className="premium-faculty-card__glow" />
                       <button
                         className="premium-faculty-card__delete-btn"
                         onClick={(e) => { e.stopPropagation(); setHandoverModal({ isOpen: true, faculty: faculty, replacementFacultyId: '' }); }}
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
                   <div className="premium-faculty-empty">
                     {searchQuery ? 'No faculty members match your search.' : 'No faculty members found in the database.'}
                    </div>
                  )}
                )()}
              </div>
            </div>
          </section>
        )}

        {selectedActionFaculty && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
            }}
            onClick={closeActionModal}
          >
            <div
              style={{
                backgroundColor: '#1c1d2e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '28px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    color: '#f1f5f9',
                  }}
                >
                  Faculty Actions
                </h3>
                <button
                  onClick={closeActionModal}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.8rem',
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <img
                  src={selectedActionFaculty.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedActionFaculty.full_name || 'Faculty')}&background=6366f1&color=fff`}
                  alt={selectedActionFaculty.full_name || 'Faculty'}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(99,102,241,0.3)',
                  }}
                />
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: '#f1f5f9',
                    }}
                  >
                    {selectedActionFaculty.full_name || '—'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      marginTop: '0.25rem',
                    }}
                  >
                    {selectedActionFaculty.email || 'N/A'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      color: '#6366f1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={actionPhone}
                    onChange={(e) => setActionPhone(e.target.value)}
                    placeholder="Enter phone number"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(20,20,40,0.5)',
                      color: '#f1f5f9',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  onClick={handleUpdatePhone}
                  disabled={isUpdatingPhone}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: isUpdatingPhone ? 'not-allowed' : 'pointer',
                    background: isUpdatingPhone
                      ? 'rgba(99,102,241,0.4)'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    opacity: isUpdatingPhone ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isUpdatingPhone ? 'Updating...' : 'Update Phone'}
                </button>
                <button
                  onClick={handleSendResetLink}
                  disabled={isSendingReset}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: isSendingReset ? 'not-allowed' : 'pointer',
                    background: isSendingReset
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    opacity: isSendingReset ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSendingReset ? 'Sending...' : 'Send Password Reset Link'}
                </button>
              </div>
            </div>
          </div>
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

        {activeTab === 'student-directory' && (
          <section className="director-section">
            <DirectorStudentDirectory />
          </section>
        )}

        {/* --- 6. MASTER SYLLABUS (CONTROL CENTER) --- */}
        {activeTab === 'master-syllabus' && (
          <section className="director-section">
            <div className="director-section__header">
              <BookOpen size={24} />
              <h2>Master Syllabus</h2>
            </div>

            <div className="master-syllabus-filter-bar">
              <div className="master-syllabus-filter-group">
                <label className="master-syllabus-filter-label" htmlFor="master-year">Year</label>
                <select
                  id="master-year"
                  className="dept-input master-syllabus-select"
                  value={masterYear}
                  onChange={(e) => setMasterYear(Number(e.target.value))}
                >
                  {MASTER_YEARS.map((y) => (
                    <option key={y} value={y}>{`Year ${y}`}</option>
                  ))}
                </select>
              </div>
              <div className="master-syllabus-filter-group">
                <label className="master-syllabus-filter-label" htmlFor="master-branch">Branch</label>
                <select
                  id="master-branch"
                  className="dept-input master-syllabus-select"
                  value={masterBranch}
                  onChange={(e) => setMasterBranch(e.target.value)}
                >
                  {MASTER_BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <button
                className="master-syllabus-add-btn"
                onClick={() => setShowMasterSubjectModal(true)}
                type="button"
              >
                <BookOpen size={16} />
                <span>Add Master Subject</span>
              </button>
            </div>

            {masterSubjectsError && (
              <div className="master-syllabus-error">
                Failed to load master subjects. Please try again later.
              </div>
            )}

            {masterSubjectsLoading ? (
              <div className="master-syllabus-loading">Loading master subjects...</div>
            ) : masterSubjectsList.length > 0 ? (
              <div className="master-syllabus-grid">
                {masterSubjectsList.map((subject) => (
                  <div key={subject.id} className="master-subject-card">
                    <div className="master-subject-card__glow" />
                    <div className="master-subject-card__top">
                      <span className={`master-subject-card__type master-subject-card__type--${(subject.type || 'Theory').toLowerCase()}`}>
                        {subject.type || 'Theory'}
                      </span>
                      <button
                        className="master-subject-card__delete-btn"
                        onClick={() => setMasterSubjectToDelete(subject.id)}
                        aria-label="Delete subject"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="master-subject-card__body">
                      <h4 className="master-subject-card__name">{subject.name}</h4>
                      <span className="master-subject-card__code">{subject.code}</span>
                    </div>
                    <div className="master-subject-card__meta">
                      <span className="master-subject-card__credits">{subject.credits} Credits</span>
                      <span className="master-subject-card__ctx">Year {subject.year} · {subject.branch}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="master-syllabus-empty">
                No master subjects found for <strong>Year {masterYear} · {masterBranch}</strong>. Click “Add Master Subject” to pre-seed the official curriculum.
              </div>
            )}

            {/* Add Master Subject Modal */}
            {showMasterSubjectModal && (
              <div className="add-faculty-modal-overlay" onClick={() => setShowMasterSubjectModal(false)}>
                <div className="add-faculty-modal" onClick={(e) => e.stopPropagation()}>
                  <button className="add-faculty-modal__close" onClick={() => setShowMasterSubjectModal(false)}>
                    <X size={20} />
                  </button>
                  <h3 className="add-faculty-modal__title">Add Master Subject</h3>
                  <form onSubmit={handleAddMasterSubject} className="add-faculty-form">
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Subject Name</label>
                      <input
                        className="add-faculty-input"
                        type="text"
                        placeholder="e.g., Data Structures"
                        required
                        value={masterForm.name}
                        onChange={(e) => setMasterForm({ ...masterForm, name: e.target.value })}
                      />
                    </div>
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Subject Code {isOptionalMasterType(masterForm.type) && <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>}</label>
                      <input
                        className="add-faculty-input"
                        type="text"
                        placeholder={isOptionalMasterType(masterForm.type) ? 'e.g., CS-301 (defaults to N/A)' : 'e.g., CS-301'}
                        required={!isOptionalMasterType(masterForm.type)}
                        value={masterForm.code}
                        onChange={(e) => setMasterForm({ ...masterForm, code: e.target.value })}
                      />
                    </div>
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Credits {isOptionalMasterType(masterForm.type) && <span style={{ color: '#9ca3af', fontWeight: 400 }}>(defaults to 0)</span>}</label>
                      <input
                        className="add-faculty-input"
                        type="number"
                        min="0"
                        max="10"
                        required={!isOptionalMasterType(masterForm.type)}
                        value={masterForm.credits}
                        onChange={(e) => setMasterForm({ ...masterForm, credits: e.target.value })}
                      />
                    </div>
                    <div className="add-faculty-form__row">
                      <label className="add-faculty-label">Subject Type</label>
                      <select
                        className="add-faculty-input"
                        value={masterForm.type}
                        onChange={(e) => setMasterForm({ ...masterForm, type: e.target.value })}
                      >
                        <option value="Theory">Theory</option>
                        <option value="Practical">Practical</option>
                        <option value="Skill">Skill</option>
                        <option value="Non-Academic">Non-Academic</option>
                      </select>
                    </div>
                    <div className="add-faculty-form__actions">
                      <button type="submit" className="add-faculty-submit-btn" disabled={isAddingMasterSubject}>
                        {isAddingMasterSubject ? 'Saving...' : '✨ Save Subject'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete confirmation modal */}
            {masterSubjectToDelete !== null && (
              <div className="delete-dept-modal-overlay" onClick={() => setMasterSubjectToDelete(null)}>
                <div className="delete-dept-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="delete-dept-modal__header">
                    <div className="delete-dept-modal__icon-box">
                      <Trash2 size={28} />
                    </div>
                    <h3 className="delete-dept-modal__title">Delete Master Subject</h3>
                    <p className="delete-dept-modal__text">This action is permanent. The subject will be removed from the master dictionary.</p>
                  </div>
                  <div className="delete-dept-modal__actions">
                    <button
                      className="delete-dept-modal__btn delete-dept-modal__btn--cancel"
                      onClick={() => setMasterSubjectToDelete(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="delete-dept-modal__btn delete-dept-modal__btn--delete"
                      onClick={confirmDeleteMasterSubject}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {announcementToDelete !== null && (
          <div className="delete-dept-modal-overlay" onClick={() => setAnnouncementToDelete(null)}>
            <div className="delete-dept-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-dept-modal__header">
                <div className="delete-dept-modal__icon-box">
                  <Trash2 size={28} />
                </div>
                <h3 className="delete-dept-modal__title">Delete Announcement</h3>
                <p className="delete-dept-modal__text">This action is permanent. The announcement will be removed from the system.</p>
              </div>
              <div className="delete-dept-modal__actions">
                <button
                  className="delete-dept-modal__btn delete-dept-modal__btn--cancel"
                  onClick={() => setAnnouncementToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="delete-dept-modal__btn delete-dept-modal__btn--delete"
                  onClick={confirmDeleteAnnouncement}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {materialToDeleteId !== null && (
          <div className="delete-dept-modal-overlay" onClick={() => setMaterialToDeleteId(null)}>
            <div className="delete-dept-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-dept-modal__header">
                <div className="delete-dept-modal__icon-box">
                  <Trash2 size={28} />
                </div>
                <h3 className="delete-dept-modal__title">Delete Material</h3>
                <p className="delete-dept-modal__text">This action is permanent. The material will be removed from the system.</p>
              </div>
              <div className="delete-dept-modal__actions">
                <button
                  className="delete-dept-modal__btn delete-dept-modal__btn--cancel"
                  onClick={() => setMaterialToDeleteId(null)}
                >
                  Cancel
                </button>
                <button
                  className="delete-dept-modal__btn delete-dept-modal__btn--delete"
                  onClick={confirmDeleteMaterial}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Handover Modal */}
        {handoverModal.isOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
            <div style={{
              backgroundColor: '#1c1d2e',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                marginBottom: '16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0' }}>Handover Responsibilities</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                Please choose how to handle the deletion of <strong style={{ color: '#fbbf24' }}>{handoverModal.faculty?.full_name}</strong>. You can assign a replacement for their active subjects, or delete them and leave their subjects unassigned.
              </p>

              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Replacement Faculty
                </label>
                <select
                  value={handoverModal.replacementFacultyId || ''}
                  onChange={(e) => setHandoverModal(prev => ({ ...prev, replacementFacultyId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(45, 45, 61, 0.5)',
                    color: handoverModal.replacementFacultyId ? '#fff' : '#a0a0b0',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
                  }}
                >
                  <option value="" disabled>-- Select Replacement Faculty --</option>
                  {otherFaculties.map(f => (
                    <option key={f.id} value={f.id} style={{ backgroundColor: '#1e1e2d', color: '#ffffff' }}>
                      {f.full_name} {f.email ? `(${f.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setHandoverModal({ isOpen: false, faculty: null, replacementFacultyId: '' }); }}
                  style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3b4063'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d314d'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceDelete}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    color: '#ef4444',
                    backgroundColor: 'transparent',
                    border: '1px solid #ef4444',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  Delete & Unassign
                </button>
                <button
                  onClick={handleHandoverAndDelete}
                  disabled={!handoverModal.replacementFacultyId}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    cursor: !handoverModal.replacementFacultyId ? 'not-allowed' : 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
                    transition: 'background-color 0.2s',
                    opacity: !handoverModal.replacementFacultyId ? 0.7 : 1
                  }}
                  onMouseOver={(e) => handoverModal.replacementFacultyId && (e.currentTarget.style.backgroundColor = '#dc2626')}
                  onMouseOut={(e) => handoverModal.replacementFacultyId && (e.currentTarget.style.backgroundColor = '#ef4444')}
                >
                  Handover & Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
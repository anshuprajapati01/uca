import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { Shield, Users, BarChart3, Layers, Calendar, Bell, LayoutDashboard, BookOpen, Target, Award, ArrowLeft, UploadCloud, Send } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import './DirectorDashboard-v2.css';

const DIRECTOR_NAV = [
  { id: 'overview', label: 'Overview', path: '/director', icon: LayoutDashboard },
  { id: 'academic', label: 'Academic Hub', path: '/director?tab=academic', icon: Layers },
  { id: 'announcements', label: 'Announcements', path: '/director?tab=announcements', icon: Bell },
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

const GROUP_A_SUBJECTS = {
  theory: [
    { name: 'Engineering Mathematics-I', code: 'BAS103', faculty: 'Dr. BK Shrivastav', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BKShrivastav' },
    { name: 'Engineering Chemistry', code: 'BAS102', faculty: 'Juhi Pandey', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juhi' },
    { name: 'Fundamentals of Electrical Engg', code: 'BEE101', faculty: 'Dr. SN Jaisawal', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SNJ' },
    { name: 'Programming for Problem Solving', code: 'BCS101', faculty: 'Shayam Mohan Singh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shayam' },
    { name: 'Environment & Ecology', code: 'BAS104', faculty: 'Ashutosh Shrivastav', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ashutosh' }
  ],
  practical: [
    { name: 'Chemistry Lab', code: 'BAS152', faculty: 'Juhi Pandey', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juhi' },
    { name: 'Electrical Engineering Lab', code: 'BEE151', faculty: 'Dr. SN Jaisawal', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SNJ' },
    { name: 'Programming Lab', code: 'BCS151', faculty: 'Shayam Mohan Singh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shayam' },
    { name: 'Engg Graphics & Design Lab', code: 'BCE151', faculty: 'Krishn Kumar Gaur', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Krishn' }
  ]
};

const GROUP_B_SUBJECTS = {
  theory: [
    { name: 'Engineering Mathematics-II', code: 'BAS203', faculty: 'Dr. BK Shrivastav', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BKShrivastav' },
    { name: 'Engineering Physics', code: 'BAS201', faculty: 'Prof. Yaman Khan', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yaman' },
    { name: 'Fundamentals of Electronics Engg', code: 'BEC201', faculty: 'Dr. SN Jaisawal', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SNJ' },
    { name: 'Fundamentals of Mechanical Engg', code: 'BME201', faculty: 'Maneesh Singh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maneesh' },
    { name: 'Soft Skills', code: 'BAS204', faculty: 'Akshita Dutta', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Akshita' }
  ],
  practical: [
    { name: 'Physics Lab', code: 'BAS251', faculty: 'Prof. Yaman Khan', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yaman' },
    { name: 'Electronics Engineering Lab', code: 'BEC251', faculty: 'Dr. SN Jaisawal', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SNJ' },
    { name: 'Workshop Practice Lab', code: 'BWS251', faculty: 'Maneesh Singh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maneesh' },
    { name: 'English Language Lab', code: 'BAS255', faculty: 'Akshita Dutta', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Akshita' }
  ]
};

const SEMESTERS = [
  { id: 1, name: 'Semester 1', isLive: false },
  { id: 2, name: 'Semester 2', isLive: true }
];

const getSubjectsForSemester = (departmentName, semesterName) => {
  const isAsh1 = departmentName?.includes('ASH 1');
  if (semesterName === 'Semester 1') return isAsh1 ? GROUP_B_SUBJECTS : GROUP_A_SUBJECTS;
  if (semesterName === 'Semester 2') return isAsh1 ? GROUP_A_SUBJECTS : GROUP_B_SUBJECTS;
  return { theory: [], practical: [] };
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

  const [dbDepartments, setDbDepartments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalFaculty, setTotalFaculty] = useState(0);
  const [directorName, setDirectorName] = useState('Director');
  
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [subjectType, setSubjectType] = useState('theory');
  const [broadcastTab, setBroadcastTab] = useState('global');
  const [urgency, setUrgency] = useState('normal');
  const [targetYears, setTargetYears] = useState([]);

  const toggleYear = (year) => {
    setTargetYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeTab !== 'academic') {
      setSelectedYear(null);
      setSelectedBranch(null);
      setSelectedSemester(null);
      return;
    }

    setSelectedBranch(null);
    setSelectedSemester(null);
  }, [activeTab, selectedYear]);
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
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const [userRes, studentRes, facultyRes, deptRes, annRes] = await Promise.all([
          supabase.from('user_profiles').select('full_name').eq('id', user?.id).single(),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'faculty'),
          supabase.from('college_departments').select('*').order('created_at', { ascending: true }),
          supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
        ]);

        if (!cancelled) {
          if (userRes.data?.full_name) setDirectorName(userRes.data.full_name);
          setTotalStudents(studentRes.count || 0);
          setTotalFaculty(facultyRes.count || 0);
          setDbDepartments(deptRes.data || []);
          setAnnouncements(annRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load director dashboard data:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
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

  const currentSubjects = useMemo(() => getSubjectsForSemester(selectedBranch?.dept?.name, selectedSemester?.name), [
    selectedBranch?.dept?.name,
    selectedSemester?.name
  ]);

  const handleBranchClick = (branchName, departmentInfo) => {
      setSelectedBranch({ name: branchName, dept: departmentInfo });
      setSelectedSemester(null);
      setSubjectType('theory');
  };

  const handleSemesterSelect = (semester) => {
      setSelectedSemester(semester);
      setSubjectType('theory');
  };

  const handleBackToSemesters = () => {
      setSelectedSemester(null);
      setSubjectType('theory');
  };

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
            {!selectedYear && !selectedBranch && (
              <>
                <div className="director-section__header">
                  <Layers size={24} />
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Academic Hub</h2>
                </div>
                
                <div className="director-years-grid">
                  {YEARS.map((year) => {
                    const deptsForYear = getDepartmentsForYear(year.id);
                    return (
                      <div key={year.id} className={`director-year-card director-year-card--${year.color}`} onClick={() => setSelectedYear(year.id)}>
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
            {selectedYear && !selectedBranch && (
              <div className="director-department-view-wrapper">
                <div className="director-section__header" style={{ alignItems: 'center', marginBottom: '2rem' }}>
                  <button className="director-back-btn" onClick={() => setSelectedYear(null)}>
                    <ArrowLeft size={18} /> Back to Years
                  </button>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginLeft: '1rem' }}>
                    Departments in {selectedYear}
                  </h2>
                </div>
                
                <div className="director-depts-grid">
                   {getDepartmentsForYear(selectedYear).map((dept, idx) => (
                       <DepartmentCard key={dept.id || idx} department={dept} onBranchClick={handleBranchClick} />
                   ))}
                  {getDepartmentsForYear(selectedYear).length === 0 && (
                    <div className="director-empty-state">No departments found for {selectedYear}.</div>
                  )}
                </div>
              </div>
            )}

           {/* STATE 3: EXACT DESIGN COPY WITH NO SUBJECT LIST */}
            {selectedYear && selectedBranch && !selectedSemester && (
                <div className="director-branch-view-wrapper">
                    <button className="director-back-btn" onClick={() => setSelectedBranch(null)}>
                        <ArrowLeft size={18} /> Back
                    </button>

                    <div className="sem-grid-container">
                        {SEMESTERS.map((sem) => (
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
                </div>
            )}

            {selectedYear && selectedBranch && selectedSemester && (
                <div className="director-branch-view-wrapper">
                    <button className="director-back-btn" onClick={handleBackToSemesters}>
                        <ArrowLeft size={18} /> Back to Semesters
                    </button>

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
                                    {currentSubjects[subjectType].length > 0 ? currentSubjects[subjectType].map((subject) => (
                                        <article key={`${subject.code}-${subject.name}`} className="pw-subject-card">
                                            <div className="pw-subject-card__content">
                                                <h4 className="pw-subject-card__name">{subject.name}</h4>
                                                <span className="pw-subject-card__code">{subject.code}</span>
                                            </div>
                                            <div className="pw-subject-card__faculty">
                                                <img className="pw-subject-card__avatar" src={subject.avatarUrl} alt={`${subject.faculty} avatar`} />
                                                <span>{subject.faculty}</span>
                                            </div>
                                        </article>
                                    )) : (
                                        <div className="pw-empty-subjects">No subjects available for this semester.</div>
                                    )}
                                </div>
                            </div>
                        </div>
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

      </div>
    </DashboardLayout>
  );
}
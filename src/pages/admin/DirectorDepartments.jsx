import { useState } from 'react';
import {
  LayoutGrid,
  ChevronRight,
  GraduationCap,
  Network,
  ArrowLeft,
  Layers,
  Video,
  FileText,
  ClipboardList,
  BookOpen,
  HelpCircle,
  Map,
} from 'lucide-react';
import './DirectorDepartments.css';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const YEAR_GRADIENTS = {
  '1st Year': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  '2nd Year': 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
  '3rd Year': 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
  '4th Year': 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
};

const YEAR_ICONS = {
  '1st Year': GraduationCap,
  '2nd Year': Network,
  '3rd Year': Network,
  '4th Year': Network,
};

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

const GROUP_A_SUBJECTS = { // This is ASH 2's Semester 1 & ASH 1's Semester 2
  theory: [
    { name: 'Engineering Mathematics-I', code: 'BAS103', faculty: 'Dr. BK Shrivastav', materials: 45, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BKShrivastav' },
    { name: 'Engineering Chemistry', code: 'BAS102', faculty: 'Juhi Pandey', materials: 38, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juhi' },
    { name: 'Fundamentals of Electrical Engg', code: 'BEE101', faculty: 'Dr. SN Jaisawal', materials: 52, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SNJ' },
    { name: 'Programming for Problem Solving', code: 'BCS101', faculty: 'Shayam Mohan Singh', materials: 60, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shayam' },
    { name: 'Environment & Ecology', code: 'BAS104', faculty: 'Ashutosh Shrivastav', materials: 20, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ashutosh' }
  ],
  practical: [
    { name: 'Chemistry Lab', code: 'BAS152', faculty: 'Juhi Pandey', materials: 12, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juhi' },
    { name: 'Electrical Engineering Lab', code: 'BEE151', faculty: 'Dr. SN Jaisawal', materials: 15, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SNJ' },
    { name: 'Programming Lab', code: 'BCS151', faculty: 'Shayam Mohan Singh', materials: 22, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shayam' },
    { name: 'Engg Graphics & Design Lab', code: 'BCE151', faculty: 'Krishn Kumar Gaur', materials: 10, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Krishn' }
  ]
};

const GROUP_B_SUBJECTS = { // This is ASH 2's Semester 2 & ASH 1's Semester 1
  theory: [
    { name: 'Engineering Mathematics-II', code: 'BAS203', faculty: 'Dr. BK Shrivastav', materials: 35, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BKShrivastav' },
    { name: 'Engineering Physics', code: 'BAS201', faculty: 'Prof. Yaman Khan', materials: 42, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yaman' },
    { name: 'Fundamentals of Electronics Engg', code: 'BEC201', faculty: 'Dr. SN Jaisawal', materials: 38, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SNJ' },
    { name: 'Fundamentals of Mechanical Engg', code: 'BME201', faculty: 'Maneesh Singh', materials: 40, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maneesh' },
    { name: 'Soft Skills', code: 'BAS204', faculty: 'Akshita Dutta', materials: 18, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Akshita' }
  ],
  practical: [
    { name: 'Physics Lab', code: 'BAS251', faculty: 'Prof. Yaman Khan', materials: 14, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yaman' },
    { name: 'Electronics Engineering Lab', code: 'BEC251', faculty: 'Dr. SN Jaisawal', materials: 16, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SNJ' },
    { name: 'Workshop Practice Lab', code: 'BWS251', faculty: 'Maneesh Singh', materials: 10, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maneesh' },
    { name: 'English Language Lab', code: 'BAS255', faculty: 'Akshita Dutta', materials: 8, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Akshita' }
  ]
};

const MOCK_MATERIAL_STATS = {
  categories: [
    { name: 'All', count: 45, icon: 'Layers' },
    { name: 'Lectures', count: 12, icon: 'Video' },
    { name: 'Notes', count: 18, icon: 'FileText' },
    { name: 'Assignments', count: 5, icon: 'ClipboardList' },
    { name: 'Tutorials', count: 4, icon: 'BookOpen' },
    { name: 'PYQs', count: 5, icon: 'HelpCircle' },
    { name: 'Syllabus', count: 1, icon: 'Map' }
  ],
  recentActivity: [
    { action: 'uploaded Lecture Video', title: 'Unit 1: Matrices', time: '2 hours ago' },
    { action: 'added PDF Note', title: 'Eigen Values & Vectors', time: '5 hours ago' },
    { action: 'created Assignment', title: 'Assignment 1 (Matrices)', time: '1 day ago' }
  ]
};

// The intelligent swapping logic based on department
const getSemestersForYear = (year) => {
  if (year === '1st Year') return ['ASH 1', 'ASH 2'];
  if (year === '2nd Year') return ['Semester 3', 'Semester 4'];
  if (year === '3rd Year') return ['Semester 5', 'Semester 6'];
  if (year === '4th Year') return ['Semester 7', 'Semester 8'];
  return [];
};

const getSemesterSubtitle = (sem) => {
  if (sem === 'ASH 1' || sem === 'ASH 2') return 'Foundation Year';
  const num = parseInt(sem.split(' ')[1], 10);
  return num % 2 === 1 ? 'Odd Semester' : 'Even Semester';
};

const getSubjectsForSemester = (parentDeptName, semester) => {
  const isAsh1 = parentDeptName === 'ASH 1';
  const normalizedSemester = semester === 'ASH 1' ? 'Semester 1' : semester === 'ASH 2' ? 'Semester 2' : semester;
  if (normalizedSemester === 'Semester 1') {
    return isAsh1 ? GROUP_B_SUBJECTS : GROUP_A_SUBJECTS;
  } else if (normalizedSemester === 'Semester 2') {
    return isAsh1 ? GROUP_A_SUBJECTS : GROUP_B_SUBJECTS;
  }
  return { theory: [], practical: [] };
};

const DepartmentCard = ({ department, onBranchClick }) => (
  <div className="department-card">
    <h3>{department.name}</h3>
    <p>HOD: {department.hod_name}</p>
    <div className="branches">
      {department.branches.map((branch, idx) => (
        <span
          key={idx}
          className="branch-tag"
          onClick={() => onBranchClick(branch)}
          role="button"
          tabIndex={0}
        >
          {branch}
        </span>
      ))}
    </div>
  </div>
);

export default function DirectorDepartments() {
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [viewMode, setViewMode] = useState('master');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedParentDept, setSelectedParentDept] = useState(null);
  const [activeHubTab, setActiveHubTab] = useState('academics');
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState('theory');
  const [activeSubject, setActiveSubject] = useState(null);

  const departments = BIT_DEPARTMENTS[selectedYear] || [];

  const handleBranchClick = (branch, parentDeptName) => {
    setSelectedBranch(branch);
    setSelectedParentDept(parentDeptName);
    setViewMode('branchHub');
    setActiveHubTab('academics');
  };

  const handleBackToMaster = () => setViewMode('master');
  const handleBackToDetail = () => setViewMode('detail');

  const handleSubjectClick = (subjectObj) => {
    setActiveSubject(subjectObj);
    setViewMode('subjectMaterial');
  };

  const getIconForCategory = (iconName) => {
    const iconMap = { Layers, Video, FileText, ClipboardList, BookOpen, HelpCircle, Map };
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent size={20} /> : null;
  };

  const renderSubjectMaterialView = () => {
    if (!activeSubject) return null;

    return (
      <div className="subject-material-view">
        <div className="subject-material-view__header">
          <div className="subject-material-view__title-row">
            <h2 className="subject-material-view__title">
              {activeSubject.name} <span className="subject-material-view__code">({activeSubject.code})</span>
            </h2>
          </div>
          <p className="subject-material-view__subtitle">Faculty: {activeSubject.faculty}</p>
        </div>

        <section className="material-categories-section">
          <h3 className="section-heading">Material Categories</h3>
          <div className="material-folder-grid">
            {MOCK_MATERIAL_STATS.categories.map((category, index) => (
              <div key={index} className="material-folder-card">
                <div className="material-folder-card__icon">{getIconForCategory(category.icon)}</div>
                <div className="material-folder-card__content">
                  <span className="material-folder-card__name">{category.name}</span>
                  <span className="material-folder-card__count">{category.count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="activity-feed-section">
          <h3 className="section-heading">Recent Upload Activity</h3>
          <div className="activity-feed-list">
            {MOCK_MATERIAL_STATS.recentActivity.map((activity, index) => (
              <div key={index} className="activity-feed-item">
                <div className="activity-feed-item__avatar">
                  {activeSubject.faculty.charAt(0).toUpperCase()}
                </div>
                <div className="activity-feed-item__content">
                  <span className="activity-feed-item__action">
                    <strong>{activeSubject.faculty}</strong> {activity.action}
                  </span>
                  <span className="activity-feed-item__title">{activity.title}</span>
                </div>
                <span className="activity-feed-item__time">{activity.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="director-departments">
      <div className="director-sticky-header">
        <div className="director-sticky-header__inner">
          <header className="director-departments__header">
            <div className="director-departments__header-content">
              <h1 className="director-departments__title">Academic Hub</h1>
              <p className="director-departments__subtitle">
                Welcome back, <span className="director-departments__highlight">Director</span>
              </p>
            </div>
          </header>

          <section className="director-year-selector">
            <div className="director-year-selector__label">
              <LayoutGrid size={18} />
              <span>Select Year</span>
            </div>

            {viewMode === 'master' && (
              <div className="director-year-selector__grid">
                {YEARS.map((year) => {
                  const Icon = YEAR_ICONS[year];
                  const isActive = selectedYear === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      className={`director-year-card ${isActive ? 'director-year-card--active' : ''}`}
                      onClick={() => {
                        setSelectedYear(year);
                        setViewMode('detail');
                      }}
                    >
                      <div className="director-year-card__glow" />
                      <div className="director-year-card__icon" style={{ background: YEAR_GRADIENTS[year] }}>
                        <Icon size={28} />
                      </div>
                      <span className="director-year-card__label">{year}</span>
                      <ChevronRight size={16} className="director-year-card__chevron" />
                    </button>
                  );
                })}
              </div>
            )}

            {(viewMode === 'detail' || viewMode === 'branchHub' || viewMode === 'subjectMaterial') && (
              <button
                type="button"
                className="premium-back-btn"
                onClick={() => {
                  if (viewMode === 'subjectMaterial') {
                    setViewMode('branchHub');
                  } else if (viewMode === 'branchHub') {
                    handleBackToDetail();
                  } else {
                    handleBackToMaster();
                  }
                }}
              >
                <ArrowLeft size={18} />
                <span>
                  {viewMode === 'subjectMaterial'
                    ? 'Back to Subjects'
                    : viewMode === 'branchHub'
                    ? 'Back to Departments'
                    : 'Back to Years'}
                </span>
              </button>
            )}
          </section>
        </div>
      </div>

      <div className="director-scroll-content">
        {viewMode === 'detail' && (
          <div className="director-depts-section">
            <div className="director-depts-section__header">
              <h2>{selectedYear} Departments</h2>
            </div>

            <div className="director-depts-grid">
                  {departments.map((dept) => (
                    <DepartmentCard
                      key={dept.name}
                      department={dept}
                      onBranchClick={(branch) => handleBranchClick(branch, dept.name)}
                    />
                  ))}
            </div>
          </div>
        )}

        {viewMode === 'branchHub' && selectedBranch && (
          <div className="director-branch-hub">
            <div className="director-branch-hub__header">
              <h2 className="director-branch-hub__title">{selectedBranch} - {selectedYear} Hub</h2>
            </div>

            <div className="director-branch-hub__tabs">
              <button
                type="button"
                className={`director-hub-tab ${activeHubTab === 'academics' ? 'director-hub-tab--active' : ''}`}
                onClick={() => setActiveHubTab('academics')}
              >
                Academics
              </button>
              <button
                type="button"
                className={`director-hub-tab ${activeHubTab === 'announcements' ? 'director-hub-tab--active' : ''}`}
                onClick={() => setActiveHubTab('announcements')}
              >
                Batch Announcements
              </button>
            </div>

            <div className="director-branch-hub__content">
              {activeHubTab === 'academics' && (
                <div>
                  {!selectedSemester ? (
                    <div className="semester-cards-grid">
                      {getSemestersForYear(selectedYear).map((sem) => (
                        <div
                          key={sem}
                          className="semester-card"
                          onClick={() => {
                            console.log('Semester clicked:', { year: selectedYear, sem });
                            setSelectedSemester(sem);
                          }}
                        >
                          <h3 className="semester-card__title">{sem}</h3>
                          <p className="semester-card__subtitle">{getSemesterSubtitle(sem)}</p>
                          {(sem === 'ASH 1' || sem === 'Semester 1' || sem === 'Semester 3' || sem === 'Semester 5' || sem === 'Semester 7') && <span className="live-badge">🟢 LIVE</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        className="premium-back-btn"
                        onClick={() => setSelectedSemester(null)}
                      >
                        <ArrowLeft size={18} />
                        <span>Back to Semesters</span>
                      </button>
                      <h3 className="director-branch-hub__title" style={{ marginBottom: '1.25rem' }}>
                        {selectedSemester} Subjects
                      </h3>
                      {(() => {
                        console.log('Rendering subjects:', { year: selectedYear, semester: selectedSemester, parentDept: selectedParentDept });
                        const currentSubjects = getSubjectsForSemester(selectedParentDept, selectedSemester);
                        const tabSubjects = currentSubjects[activeSubjectTab] || [];

                        if (!tabSubjects.length && !currentSubjects.theory.length && !currentSubjects.practical.length) {
                          return <div className="no-data">No subjects available for this semester.</div>;
                        }

                        return (
                          <div>
                            <div className="subject-type-tabs">
                              <button
                                className={`sub-tab-btn ${activeSubjectTab === 'theory' ? 'active' : ''}`}
                                onClick={() => setActiveSubjectTab('theory')}
                              >
                                Theory Subjects
                              </button>
                              <button
                                className={`sub-tab-btn ${activeSubjectTab === 'practical' ? 'active' : ''}`}
                                onClick={() => setActiveSubjectTab('practical')}
                              >
                                Practical / Lab Subjects
                              </button>
                            </div>
                            <div className="pw-subject-grid">
                              {tabSubjects.map((subject, index) => (
                                <div key={index} className="pw-subject-card pw-subject-card--clickable" onClick={() => handleSubjectClick(subject)}>
                                  <div className="pw-subject-card__header">
                                    <div className="pw-subject-card__name">{subject.name}</div>
                                    <div className="pw-subject-card__code">{subject.code}</div>
                                  </div>
                                  <div className="pw-subject-card__faculty">
                                    <img
                                      src={subject.avatarUrl}
                                      alt={subject.faculty}
                                      className="pw-subject-card__avatar"
                                      loading="lazy"
                                    />
                                    <span className="pw-subject-card__faculty-name">{subject.faculty}</span>
                                  </div>
                                  <div className="pw-subject-card__materials">
                                    Materials: {subject.materials}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {activeHubTab === 'announcements' && (
                <div className="announcements-placeholder">
                  Branch-specific announcements timeline will appear here.
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'subjectMaterial' && activeSubject && (
          renderSubjectMaterialView()
        )}
      </div>
    </div>
  );
}
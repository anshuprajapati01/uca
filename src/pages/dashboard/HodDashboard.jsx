import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { HOD_NAV_ITEMS } from '../../config/navigation.js';
import { USER_ROLES } from '../../config/constants.js';
import { getSupabaseEnv } from '../../lib/env.js';
import { supabase } from '../../lib/supabase.js';
import './HodDashboard.css';

const TABS = [
  { id: 'faculty', label: 'Faculty Management', icon: Users },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'allocation', label: 'Subject Allocation', icon: BookOpen },
];

const EMPTY_FACULTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  branchId: '',
};

function formatCount(value) {
  if (typeof value !== 'number') return '0';
  return value.toLocaleString('en-IN');
}

function normalizeBranches(branches = []) {
  return branches
    .map((branch) => ({
      id: branch.id,
      name: branch.name || branch.branch || branch.department || branch.code || 'Unmapped Branch',
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function getFacultyName(faculty) {
  return faculty?.full_name || 'Unnamed Faculty';
}

function getSubjectName(subject) {
  return subject?.name || subject?.subject_name || subject?.code || 'Unnamed Subject';
}

function getBranchLabel(branches, branchId) {
  const branch = branches.find((item) => item.id === branchId);
  return branch?.name || 'Unmapped Branch';
}

function buildToast(message, type) {
  return { message, type };
}

function FacultyManagement({
  branches,
  faculty,
  formData,
  isSubmitting,
  setFormData,
  onDeleteFaculty,
  onSubmitFaculty,
}) {
  return (
    <div className="hod-grid hod-grid--asymmetric">
      <section className="hod-card">
        <div className="hod-card__header">
          <div>
            <p className="hod-card__eyebrow">Quick Add</p>
            <h3>Add Faculty</h3>
          </div>
          <ShieldCheck size={20} />
        </div>

        <form className="hod-form" onSubmit={onSubmitFaculty}>
          <label className="hod-field">
            <span>Full Name</span>
            <input
              type="text"
              placeholder="Faculty full name"
              value={formData.fullName}
              disabled={isSubmitting}
              required
              onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
            />
          </label>

          <label className="hod-field">
            <span>Email Address</span>
            <input
              type="email"
              placeholder="faculty@uca.com"
              value={formData.email}
              disabled={isSubmitting}
              required
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
            />
          </label>

          <label className="hod-field">
            <span>Phone Number</span>
            <input
              type="tel"
              placeholder="Contact number"
              value={formData.phone}
              disabled={isSubmitting}
              required
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
            />
          </label>

          <label className="hod-field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Temporary password"
              value={formData.password}
              disabled={isSubmitting}
              required
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            />
          </label>

          <label className="hod-field">
            <span>Department / Branch</span>
            <select
              value={formData.branchId}
              disabled={isSubmitting || branches.length === 0}
              required
              onChange={(event) => setFormData({ ...formData, branchId: event.target.value })}
            >
              <option value="">Select department</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <button className="hod-button hod-button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating faculty...' : 'Add Faculty'}
          </button>
        </form>
      </section>

      <section className="hod-card">
        <div className="hod-card__header">
          <div>
            <p className="hod-card__eyebrow">Directory</p>
            <h3>Faculty List</h3>
          </div>
          <span className="hod-pill">{formatCount(faculty.length)} members</span>
        </div>

        {faculty.length === 0 ? (
          <div className="hod-empty">
            <Users size={28} />
            <p>No faculty members found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="hod-table">
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{getFacultyName(member)}</strong>
                      <span>{member.email || 'No email on file'}</span>
                    </td>
                    <td>{getBranchLabel(branches, member.branch_id)}</td>
                    <td>{member.phone || 'N/A'}</td>
                    <td>
                      <button
                        className="hod-button hod-button--danger"
                        type="button"
                        onClick={() => onDeleteFaculty(member.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportsAnalytics({
  allocatedSubjects,
  branchCounts,
  departmentsCount,
  facultyCount,
  studentCount,
  subjects,
  totalSubjects,
}) {
  const allocationRate = totalSubjects > 0 ? Math.round((allocatedSubjects / totalSubjects) * 100) : 0;

  return (
    <div className="hod-stack">
      <div className="hod-stats-grid">
        <div className="hod-stat hod-stat--purple">
          <Users size={22} />
          <strong>{formatCount(facultyCount)}</strong>
          <span>Total Faculty</span>
        </div>
        <div className="hod-stat hod-stat--cyan">
          <GraduationCap size={22} />
          <strong>{formatCount(studentCount)}</strong>
          <span>Students</span>
        </div>
        <div className="hod-stat hod-stat--emerald">
          <BookOpen size={22} />
          <strong>{formatCount(totalSubjects)}</strong>
          <span>Subjects</span>
        </div>
        <div className="hod-stat hod-stat--amber">
          <LayoutDashboard size={22} />
          <strong>{formatCount(departmentsCount)}</strong>
          <span>Departments</span>
        </div>
      </div>

      <div className="hod-grid">
        <section className="hod-card">
          <div className="hod-card__header">
            <div>
              <p className="hod-card__eyebrow">Distribution</p>
              <h3>Branch Faculty Load</h3>
            </div>
          </div>

          {branchCounts.length === 0 ? (
            <div className="hod-empty">
              <BarChart3 size={28} />
              <p>No branch mapping data available.</p>
            </div>
          ) : (
            <div className="branch-bars">
              {branchCounts.map((item) => {
                const max = Math.max(...branchCounts.map((branch) => branch.count), 1);
                const width = Math.max(8, Math.round((item.count / max) * 100));

                return (
                  <div className="branch-bar" key={item.id}>
                    <div className="branch-bar__label">
                      <span>{item.name}</span>
                      <strong>{formatCount(item.count)}</strong>
                    </div>
                    <div className="branch-bar__track">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="hod-card">
          <div className="hod-card__header">
            <div>
              <p className="hod-card__eyebrow">Allocation</p>
              <h3>Subject Coverage</h3>
            </div>
            <span className="hod-pill">{allocationRate}%</span>
          </div>

          <div className="allocation-meter">
            <span style={{ width: `${allocationRate}%` }} />
          </div>

          <div className="allocation-summary">
            <div>
              <strong>{formatCount(allocatedSubjects)}</strong>
              <span>Assigned subjects</span>
            </div>
            <div>
              <strong>{formatCount(totalSubjects - allocatedSubjects)}</strong>
              <span>Unassigned subjects</span>
            </div>
          </div>
        </section>
      </div>

      <section className="hod-card">
        <div className="hod-card__header">
          <div>
            <p className="hod-card__eyebrow">Academic Overview</p>
            <h3>Subject Catalog</h3>
          </div>
          <span className="hod-pill">{formatCount(subjects.length)} subjects</span>
        </div>

        {subjects.length === 0 ? (
          <div className="hod-empty">
            <BookOpen size={28} />
            <p>No subjects are available yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="hod-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject</th>
                  <th>Semester</th>
                  <th>Branch</th>
                </tr>
              </thead>
              <tbody>
                {subjects.slice(0, 8).map((subject) => (
                  <tr key={subject.id || subject.code}>
                    <td><span className="subject-code">{subject.code || '—'}</span></td>
                    <td>{getSubjectName(subject)}</td>
                    <td>{subject.semester || 'N/A'}</td>
                    <td>{subject.branch || subject.branch_name || 'All Branches'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SubjectAllocationTab({ faculty, isLoading, subjects, onFacultyChange }) {
  return (
    <section className="hod-card">
      <div className="hod-card__header">
        <div>
          <p className="hod-card__eyebrow">Academic Planning</p>
          <h3>Subject Allocation</h3>
        </div>
        <span className="hod-pill">{formatCount(subjects.length)} subjects</span>
      </div>

      {isLoading ? (
        <div className="table-wrapper">
          <table className="hod-table">
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="skeleton-row">
                  <td><span className="skeleton-line skeleton-line--short" /></td>
                  <td><span className="skeleton-line" /></td>
                  <td><span className="skeleton-line skeleton-line--short" /></td>
                  <td><span className="skeleton-line" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : subjects.length === 0 ? (
        <div className="hod-empty">
          <BookOpen size={28} />
          <p>No subjects found for allocation.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="hod-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Semester</th>
                <th>Assigned Faculty</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => {
                const assignedFaculty = faculty.find((member) => member.id === subject.faculty_id);

                return (
                  <tr key={subject.id || subject.code}>
                    <td><span className="subject-code">{subject.code || '—'}</span></td>
                    <td>{getSubjectName(subject)}</td>
                    <td>{subject.semester || 'N/A'}</td>
                    <td>
                      <select
                        className="faculty-select"
                        value={subject.faculty_id || ''}
                        onChange={(event) => onFacultyChange(subject.id, event.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {faculty.map((member) => (
                          <option key={member.id} value={member.id}>
                            {getFacultyName(member)}
                          </option>
                        ))}
                      </select>
                      {subject.faculty_id && assignedFaculty ? (
                        <span className="assigned-faculty">{assignedFaculty.full_name}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function HodDashboard() {
  const [activeTab, setActiveTab] = useState('faculty');
  const [branches, setBranches] = useState([]);
  const [departmentsCount, setDepartmentsCount] = useState(0);
  const [error, setError] = useState('');
  const [faculty, setFaculty] = useState([]);
  const [facultyCount, setFacultyCount] = useState(0);
  const [formData, setFormData] = useState(EMPTY_FACULTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const [toast, setToast] = useState(null);

  const allocatedSubjects = subjects.filter((subject) => subject.faculty_id).length;
  const totalSubjects = subjects.length;

  const branchCounts = useMemo(() => {
    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      count: faculty.filter((member) => member.branch_id === branch.id).length,
    }));
  }, [branches, faculty]);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [facultyResult, branchesResult, subjectsResult, studentsResult, departmentsResult] =
        await Promise.all([
          supabase.from('user_profiles').select('id, full_name, phone, role, branch_id').eq('role', USER_ROLES.FACULTY),
          supabase.from('branches').select('id, name, branch, department, code'),
          supabase.from('subjects').select('*'),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', USER_ROLES.STUDENT),
          supabase.from('college_departments').select('id', { count: 'exact', head: true }),
        ]);

      if (facultyResult.error) throw facultyResult.error;
      if (subjectsResult.error) throw subjectsResult.error;

      setFaculty(facultyResult.data || []);
      setFacultyCount(facultyResult.data?.length || 0);
      setSubjects(subjectsResult.data || []);
      setStudentCount(studentsResult.count || 0);
      setDepartmentsCount(departmentsResult.count || 0);

      if (!branchesResult.error) {
        setBranches(normalizeBranches(branchesResult.data || []));
      }
    } catch (fetchError) {
      console.error('HOD dashboard data fetch failed:', fetchError);
      setFaculty([]);
      setSubjects([]);
      setBranches([]);
      setFacultyCount(0);
      setStudentCount(0);
      setDepartmentsCount(0);
      setError(fetchError?.message || 'Unable to load HOD portal data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  async function handleAddFaculty(event) {
    event.preventDefault();

    if (isSubmitting) return;

    if (!formData.branchId) {
      setToast(buildToast('Please select a department or branch before adding faculty.', 'error'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { url, publishableKey } = getSupabaseEnv();
      const tempClient = createClient(url, publishableKey, { auth: { persistSession: false } });
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error('Faculty account was not created.');

      const { error: profileError } = await supabase.from('user_profiles').insert([
        {
          id: authData.user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          role: USER_ROLES.FACULTY,
          branch_id: formData.branchId || null,
          college_id: '11111111-0000-0000-0000-000000000001',
          is_active: true,
        },
      ]);

      if (profileError) throw profileError;

      setToast(buildToast('Faculty added successfully.', 'success'));
      setFormData(EMPTY_FACULTY_FORM);
      await loadDashboardData();
    } catch (submitError) {
      console.error('Faculty creation failed:', submitError);
      setToast(buildToast(submitError?.message || 'Unable to add faculty.', 'error'));
    } finally {
      setIsSubmitting(false);
      window.setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleDeleteFaculty(facultyId) {
    const confirmed = window.confirm('Are you sure you want to remove this faculty member? This action cannot be undone.');

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', facultyId);

      if (error) throw error;

      setFaculty((currentFaculty) => currentFaculty.filter((member) => member.id !== facultyId));
      setToast(buildToast('Faculty removed successfully.', 'success'));
    } catch (deleteError) {
      console.error('Faculty removal failed:', deleteError);
      setToast(buildToast(deleteError?.message || 'Unable to remove faculty.', 'error'));
    } finally {
      window.setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleFacultyChange(subjectId, facultyId) {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ faculty_id: facultyId || null })
        .eq('id', subjectId);

      if (error) throw error;

      setSubjects((currentSubjects) =>
        currentSubjects.map((subject) =>
          subject.id === subjectId ? { ...subject, faculty_id: facultyId || null } : subject,
        ),
      );
      setToast(buildToast('Faculty assigned successfully.', 'success'));
    } catch (assignmentError) {
      console.error('Subject allocation failed:', assignmentError);
      setToast(buildToast(assignmentError?.message || 'Unable to assign faculty.', 'error'));
    } finally {
      window.setTimeout(() => setToast(null), 4000);
    }
  }

  const ActiveTab = TABS.find((tab) => tab.id === activeTab);

  return (
    <DashboardLayout title="HOD Portal" navItems={HOD_NAV_ITEMS}>
      <section className="hod-dashboard">
        <header className="hod-hero">
          <div>
            <p className="hod-eyebrow">Head of Department Workspace</p>
            <h1>HOD Portal</h1>
            <p>Restore faculty management, reports, analytics, and subject allocation workflows.</p>
          </div>
          <button
            className="hod-button hod-button--ghost"
            type="button"
            disabled={isLoading}
            onClick={loadDashboardData}
          >
            <RefreshCw size={18} />
            {isLoading ? 'Syncing' : 'Refresh'}
          </button>
        </header>

        {toast ? (
          <div className={`hod-toast hod-toast--${toast.type}`} role="status">
            {toast.message}
          </div>
        ) : null}

        {error ? (
          <div className="hod-error" role="alert">
            {error}
          </div>
        ) : null}

        <nav className="hod-tabs" aria-label="HOD portal sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                className={`hod-tab${activeTab === tab.id ? ' hod-tab--active' : ''}`}
                type="button"
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === 'faculty' ? (
          <FacultyManagement
            branches={branches}
            faculty={faculty}
            formData={formData}
            isSubmitting={isSubmitting}
            setFormData={setFormData}
            onDeleteFaculty={handleDeleteFaculty}
            onSubmitFaculty={handleAddFaculty}
          />
        ) : null}

        {activeTab === 'reports' ? (
          <ReportsAnalytics
            allocatedSubjects={allocatedSubjects}
            branchCounts={branchCounts}
            departmentsCount={departmentsCount}
            facultyCount={facultyCount}
            studentCount={studentCount}
            subjects={subjects}
            totalSubjects={totalSubjects}
          />
        ) : null}

        {activeTab === 'allocation' ? (
          <SubjectAllocationTab
            faculty={faculty}
            isLoading={isLoading}
            subjects={subjects}
            onFacultyChange={handleFacultyChange}
          />
        ) : null}

        {ActiveTab ? (
          <p className="hod-active-section" aria-live="polite">
            Viewing {ActiveTab.label}
          </p>
        ) : null}
      </section>
    </DashboardLayout>
  );
}

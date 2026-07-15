import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './FacultyWorkload.css';

// Weekly load thresholds (hours).
const LOW_LOAD_MAX = 10;
const HIGH_LOAD_MIN = 18;
const HOURS_REFERENCE = 20;

// Academic structure: each year maps to its two semesters, decoupled from any
// assigned-subject data so the dropdown always reflects the full academic year.
const YEAR_SEMESTER_MAP = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

// Extract the leading year number from a description like "2nd Year" -> 2.
function getYearNumber(yearDescription) {
  const match = String(yearDescription || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function getSemestersForYear(yearDescription) {
  const yearNumber = getYearNumber(yearDescription);
  const semesters = yearNumber ? YEAR_SEMESTER_MAP[yearNumber] : null;
  if (!semesters) return [];
  return semesters.map((n) => `Semester ${n}`);
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

export default function FacultyWorkload() {
  const [facultyWorkload, setFacultyWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [subjectsDetail, setSubjectsDetail] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [facultyList, setFacultyList] = useState([]);
  const [reassignSubjectId, setReassignSubjectId] = useState(null);
  const [reassignTarget, setReassignTarget] = useState('');

  const { hodAuthorizedBranches, hodDepartmentsData } = useSafeHodContext();

  const isHodMode = hodAuthorizedBranches.length > 0;

  // --- Context-driven cascading options (single source of truth: hodDepartmentsData) ---
  const authorizedDepartments = useMemo(
    () => [...new Set((hodDepartmentsData || []).map((d) => d.code || d.name))].filter(Boolean),
    [hodDepartmentsData]
  );

  const availableYears = useMemo(
    () => [...new Set((hodDepartmentsData || []).map((d) => d.description))].filter(Boolean).sort(),
    [hodDepartmentsData]
  );

  // Resolve effective selections: when nothing is chosen, fall back to the
  // only available option so a single-year / single-branch HOD saves clicks.
  const effectiveYear = selectedYear || (availableYears.length === 1 ? availableYears[0] : '');

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
    selectedBranch && availableBranches.some((b) => b.code === selectedBranch)
      ? selectedBranch
      : availableBranches.length === 1
      ? availableBranches[0].code
      : '';

  const availableSemesters = useMemo(
    () => getSemestersForYear(effectiveYear),
    [effectiveYear]
  );

  const effectiveSemester =
    selectedSemester && availableSemesters.includes(selectedSemester) ? selectedSemester : '';

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setSelectedBranch('');
    setSelectedSemester('');
  };

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
    setSelectedSemester('');
  };

  useEffect(() => {
    async function loadFaculty() {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('role', 'faculty');
      setFacultyList(data || []);
    }
    loadFaculty();
  }, []);

  useEffect(() => {
    async function loadWorkload() {
      // Clear any stale state first so the UI never shows cached/old workload
      // (e.g. a subject that was just deleted or unassigned elsewhere).
      setFacultyWorkload([]);
      setLoading(true);

      let query = supabase
        .from('subjects')
        .select('faculty_id, faculty:user_profiles!faculty_id(full_name), department, year, semester, credits')
        .not('faculty_id', 'is', null);

      if (isHodMode && authorizedDepartments.length > 0) {
        query = query.in('department', authorizedDepartments);
      }
      if (effectiveYear) {
        query = query.eq('year', effectiveYear);
      }
      if (effectiveBranch) {
        query = query.eq('department', effectiveBranch);
      }
      if (effectiveSemester) {
        query = query.eq('semester', effectiveSemester);
      }

      const { data: subjectsData, error: subjectsError } = await query;

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        setFacultyWorkload([]);
        setLoading(false);
        return;
      }

      const workloadMap = new Map();
      (subjectsData || []).forEach((subject) => {
        if (isHodMode && !authorizedDepartments.includes(subject.department)) return;
        if (effectiveYear && subject.year !== effectiveYear) return;
        if (effectiveBranch && subject.department !== effectiveBranch) return;
        if (effectiveSemester && subject.semester !== effectiveSemester) return;
        const facultyId = subject.faculty_id;
        const facultyName = subject.faculty?.full_name || 'Unknown Faculty';
        if (!workloadMap.has(facultyId)) {
          workloadMap.set(facultyId, { id: facultyId, name: facultyName, count: 0, hours: 0 });
        }
        const entry = workloadMap.get(facultyId);
        entry.count += 1;
        entry.hours += Number(subject.credits) || 0;
      });

      const sorted = [...workloadMap.values()].sort((a, b) => b.hours - a.hours);
      setFacultyWorkload(sorted);
      setLoading(false);
    }

    loadWorkload();

    const channel = supabase
      .channel('faculty-workload-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subjects' },
        () => {
          loadWorkload();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHodMode, authorizedDepartments, effectiveYear, effectiveBranch, effectiveSemester]);

  const getWorkloadStatus = (hours) => {
    const pct = Math.min(100, Math.round((hours / HOURS_REFERENCE) * 100));
    if (hours < LOW_LOAD_MAX) return { label: 'Low Load', class: 'workload-low', pct };
    if (hours <= HIGH_LOAD_MIN) return { label: 'Balanced', class: 'workload-medium', pct };
    return { label: 'High Load', class: 'workload-high', pct: 100 };
  };

  const openSchedule = async (faculty) => {
    setSelectedFaculty(faculty);

    let query = supabase
      .from('subjects')
      .select('id, code, name, semester, department, year, faculty_id')
      .eq('faculty_id', faculty.id)
      .order('semester', { ascending: true });

    if (isHodMode && authorizedDepartments.length > 0) {
      query = query.in('department', authorizedDepartments);
    }
    if (effectiveYear) {
      query = query.eq('year', effectiveYear);
    }
    if (effectiveBranch) {
      query = query.eq('department', effectiveBranch);
    }
    if (effectiveSemester) {
      query = query.eq('semester', effectiveSemester);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching subjects:', error);
      setSubjectsDetail([]);
    } else {
      const filteredData = (data || []).filter((subject) => {
        if (isHodMode && !authorizedDepartments.includes(subject.department)) return false;
        if (effectiveYear && subject.year !== effectiveYear) return false;
        if (effectiveBranch && subject.department !== effectiveBranch) return false;
        if (effectiveSemester && subject.semester !== effectiveSemester) return false;
        return true;
      });
      setSubjectsDetail(filteredData);
    }

    setDrawerOpen(true);
  };

  const handleReassign = async (subject) => {
    if (!reassignTarget || reassignTarget === subject.faculty_id) {
      setReassignSubjectId(null);
      return;
    }
    const { error } = await supabase
      .from('subjects')
      .update({ faculty_id: reassignTarget })
      .eq('id', subject.id);

    if (error) {
      console.error('Failed to reassign subject:', error);
      return;
    }

    setReassignSubjectId(null);
    setReassignTarget('');
    if (selectedFaculty) {
      await openSchedule(selectedFaculty);
    }
  };

  const handleDownloadPDF = () => {
    if (facultyWorkload.length === 0) {
      return;
    }

    const branchName =
      availableBranches.find((b) => b.code === effectiveBranch)?.name || effectiveBranch || '';

    const appliedFilters = [
      effectiveYear && `Year: ${effectiveYear}`,
      branchName && `Branch: ${branchName}`,
      effectiveSemester && `Semester: ${effectiveSemester}`,
    ].filter(Boolean);

    const subtitle = appliedFilters.length
      ? appliedFilters.join('  |  ')
      : 'All Faculties';

    const today = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const rows = facultyWorkload.map((faculty) => {
      const status = getWorkloadStatus(faculty.hours);
      const statusLabel = status.class === 'workload-low'
        ? 'Low'
        : status.class === 'workload-medium'
        ? 'Medium'
        : 'High';
      return [faculty.name, String(faculty.count), String(faculty.hours), statusLabel];
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 86, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('Buddha Institute of Technology', 40, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(237, 233, 254);
    doc.text('Department Faculty Workload Report', 40, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(199, 210, 254);
    doc.text(`${subtitle}`, 40, 70);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(`Generated on: ${today}`, 40, 104);

    autoTable(doc, {
      startY: 120,
      head: [['Faculty Name', 'Total Subjects', 'Weekly Hours', 'Status']],
      body: rows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 6, textColor: [30, 41, 59] },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [238, 242, 255] },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const finalY = doc.lastAutoTable.finalY;
    const signatureX = pageWidth - 40;
    const signatureBaseY = finalY + 70;

    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(1);
    doc.line(signatureX - 180, signatureBaseY, signatureX, signatureBaseY);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Signature of HOD', signatureX, signatureBaseY + 18, { align: 'right' });

    doc.save('Faculty-Workload-Report.pdf');
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedFaculty(null);
    setSubjectsDetail([]);
    setReassignSubjectId(null);
    setReassignTarget('');
  };

  return (
    <div className="workload-container">
      <header className="workload-header">
        <h2>Faculty Workload</h2>
        <div className="workload-header-right">
        {isHodMode && (
          <div className="workload-filter-controls">
            <div className="workload-filter-group">
              <label className="workload-filter-label" htmlFor="year-select">
                Year
              </label>
                <select
                  id="year-select"
                  className="workload-filter-select"
                  value={effectiveYear}
                  onChange={handleYearChange}
                >
                <option value="">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="workload-filter-group">
              <label className="workload-filter-label" htmlFor="branch-select">
                Branch
              </label>
                <select
                  id="branch-select"
                  className="workload-filter-select"
                  value={effectiveBranch || ''}
                  onChange={handleBranchChange}
                  disabled={availableBranches.length === 0}
                >
                <option value="">
                  {availableBranches.length === 0 ? 'Select Year first' : 'All Branches'}
                </option>
                {availableBranches.map((branch) => (
                  <option key={branch.code} value={branch.code}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="workload-filter-group">
              <label className="workload-filter-label" htmlFor="semester-select">
                Semester
              </label>
                <select
                  id="semester-select"
                  className="workload-filter-select"
                  value={effectiveSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  disabled={availableSemesters.length === 0}
                >
                <option value="">
                  {availableSemesters.length === 0 ? 'Select Year first' : 'All Semesters'}
                </option>
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
          <button
            type="button"
            className="workload-export-btn"
            onClick={handleDownloadPDF}
            disabled={facultyWorkload.length === 0}
            title="Export the currently filtered workload to PDF"
          >
            <span className="workload-export-icon" aria-hidden="true">⬇️</span>
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      <div className="workload-list-glass">
        {loading ? (
          <div className="workload-status">Loading faculty workload...</div>
        ) : (
          <div className="workload-table" role="table">
            <div className="workload-row workload-row--head" role="row">
              <div className="workload-cell" role="columnheader">Faculty Name</div>
              <div className="workload-cell" role="columnheader">Weekly Hours</div>
              <div className="workload-cell" role="columnheader">Workload Status</div>
              <div className="workload-cell" role="columnheader">Action</div>
            </div>

            {facultyWorkload.map((faculty) => {
              const status = getWorkloadStatus(faculty.hours);
              return (
                <div className="workload-row" key={faculty.id} role="row">
                  <div className="workload-cell" role="cell">
                    <span className="workload-name">{faculty.name}</span>
                  </div>
                  <div className="workload-cell" role="cell">
                    <span className="workload-count">
                      {faculty.hours}
                      <span className="workload-count-unit"> hrs</span>
                      <span className="workload-count-sub">({faculty.count} sub{faculty.count === 1 ? '' : 's'})</span>
                    </span>
                  </div>
                  <div className="workload-cell" role="cell">
                    <div className="workload-status-cell">
                      <div className="workload-bar-wrapper">
                        <div
                          className={`workload-bar ${status.class}`}
                          style={{ width: `${status.pct}%` }}
                        />
                      </div>
                      <span className={`workload-badge ${status.class}`}>{status.label}</span>
                    </div>
                  </div>
                  <div className="workload-cell" role="cell">
                    <button
                      className="workload-action-btn"
                      onClick={() => openSchedule(faculty)}
                    >
                      View Schedule
                    </button>
                  </div>
                </div>
              );
            })}

            {facultyWorkload.length === 0 && (
              <div className="workload-empty">
                <p>
                {effectiveYear || effectiveBranch || effectiveSemester
                  ? 'No data available for this selection'
                  : 'No faculty workloads found. Assign subjects to faculty in the Curriculum Manager.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="workload-drawer-overlay" onClick={closeDrawer}>
          <div className="workload-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="workload-drawer-header">
              <h3>Schedule - {selectedFaculty?.name}</h3>
              <button className="workload-drawer-close" onClick={closeDrawer}>
                &times;
              </button>
            </div>
            <div className="workload-drawer-body">
              <table className="workload-drawer-table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Semester</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsDetail.map((subject) => (
                    <tr key={subject.id}>
                      <td><span className="subject-code">{subject.code}</span></td>
                      <td>{subject.name}</td>
                      <td>{subject.semester}</td>
                      <td>{subject.department || 'N/A'}</td>
                      <td>{subject.year || 'N/A'}</td>
                      <td>
                        {reassignSubjectId === subject.id ? (
                          <div className="reassign-controls">
                            <select
                              className="workload-filter-select reassign-select"
                              value={reassignTarget}
                              onChange={(e) => setReassignTarget(e.target.value)}
                            >
                              {facultyList.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.full_name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="reassign-save-btn"
                              onClick={() => handleReassign(subject)}
                            >
                              Save
                            </button>
                            <button
                              className="reassign-cancel-btn"
                              onClick={() => {
                                setReassignSubjectId(null);
                                setReassignTarget('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="reassign-btn"
                            onClick={() => {
                              setReassignSubjectId(subject.id);
                              setReassignTarget(subject.faculty_id || '');
                            }}
                          >
                            Edit / Reassign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {subjectsDetail.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="workload-drawer-empty">
                          No subjects assigned yet.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

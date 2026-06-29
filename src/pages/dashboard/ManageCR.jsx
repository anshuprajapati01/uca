import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { toast, Toaster } from 'react-hot-toast';
import { UserCheck, Trash2, Plus } from 'lucide-react';
import './ManageCR.css';

const fetchStudents = async (setAllStudents) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, roll_number, selected_year, selected_branch')
    .eq('role', 'student');
  if (!error && data) setAllStudents(data);
};

const fetchActiveCRs = async (selectedBranch, selectedYear, selectedSemester, setLoading, setActiveCRs) => {
  setLoading(true);
  const { data, error } = await supabase
    .from('class_representatives')
    .select(`
      id,
      student_id,
      branch,
      year,
      semester,
      user_profiles:student_id (full_name, email, roll_number)
    `)
    .eq('branch', selectedBranch)
    .eq('year', selectedYear)
    .eq('semester', selectedSemester);
  
  if (error) {
    console.error('Error fetching CRs:', error);
    toast.error('Failed to load CR data');
  } else {
    setActiveCRs(data || []);
  }
  setLoading(false);
};

export default function ManageCR() {
  const { hodDepartmentsData } = useHodContext();
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [activeCRs, setActiveCRs] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);

  const availableYears = useMemo(() => {
    return [...new Set(hodDepartmentsData.map((d) => d.description))].filter(Boolean).sort();
  }, [hodDepartmentsData]);

  const availableBranches = useMemo(() => {
    if (!selectedYear) return [];
    const yearFiltered = hodDepartmentsData.filter((d) => d.description === selectedYear);
    const branches = [];
    yearFiltered.forEach((d) => {
      const code = d.code || d.name;
      const name = d.name || d.code;
      branches.push({ id: code || name, code: code || name, name: name });
    });
    return [...new Set(branches.map(b => b.code))].map(code => ({ id: code, code, name: code }));
  }, [selectedYear, hodDepartmentsData]);

  const availableSemesters = useMemo(() => {
    if (selectedYear && selectedBranch) {
      const semesterMap = {};
      hodDepartmentsData.forEach((d) => {
        const year = d.description;
        const code = d.code || d.name;
        if (year === selectedYear && code === selectedBranch) {
          const semKeys = ['is_sem1_live', 'is_sem2_live', 'is_sem3_live', 'is_sem4_live', 'is_sem5_live', 'is_sem6_live', 'is_sem7_live', 'is_sem8_live'];
          semKeys.forEach((key, idx) => {
            if (d[key]) semesterMap[idx + 1] = true;
          });
        }
      });
      return Object.keys(semesterMap).map(s => parseInt(s, 10)).sort((a, b) => a - b);
    }
    return [];
  }, [selectedYear, selectedBranch, hodDepartmentsData]);

  const eligibleStudents = useMemo(() => {
    if (!selectedYear || !selectedBranch) return [];
    return allStudents.filter(s => 
      s.selected_year === selectedYear && s.selected_branch === selectedBranch
    );
  }, [allStudents, selectedYear, selectedBranch]);

  useEffect(() => {
    fetchStudents(setAllStudents);
  }, []);

  useEffect(() => {
    if (selectedYear && selectedBranch && selectedSemester) {
      fetchActiveCRs(selectedBranch, selectedYear, selectedSemester, setLoading, setActiveCRs);
    } else {
      setActiveCRs([]);
    }
  }, [selectedYear, selectedBranch, selectedSemester]);

  const handleAssignCR = async (studentId) => {
    if (!selectedYear || !selectedBranch || !selectedSemester) return;
    
    const { data, error } = await supabase
      .from('class_representatives')
      .insert({
        student_id: studentId,
        branch: selectedBranch,
        year: selectedYear,
        semester: selectedSemester
      })
      .select(`
        id,
        student_id,
        branch,
        year,
        semester,
        user_profiles:student_id (full_name, email, roll_number)
      `)
      .single();
    
    if (error) {
      if (error.code === '23505') {
        toast.error('This student is already a CR for this combination');
      } else {
        toast.error('Failed to assign CR');
      }
    } else {
      setActiveCRs(prev => [...prev, data]);
      toast.success('CR assigned successfully!');
    }
  };

  const initiateRemove = (cr) => {
    setStudentToRemove(cr);
  };

  const confirmRemove = async () => {
    if (!studentToRemove) return;
    
    const { error } = await supabase
      .from('class_representatives')
      .delete()
      .eq('id', studentToRemove.id);
    
    if (error) {
      toast.error('Failed to remove CR');
    } else {
      setActiveCRs(prev => prev.filter(cr => cr.id !== studentToRemove.id));
      toast.success('CR removed successfully!');
    }
    setStudentToRemove(null);
  };

  const cancelRemove = () => {
    setStudentToRemove(null);
  };

  const resetFilters = () => {
    setSelectedYear('');
    setSelectedBranch('');
    setSelectedSemester('');
    setActiveCRs([]);
  };

  return (
    <div className="manage-cr-container">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
      <header className="manage-cr-header">
        <h1 className="manage-cr-title">Manage Class Representatives</h1>
        <p className="manage-cr-subtitle">Assign or remove CRs for specific Year, Branch, and Semester</p>
      </header>

      <section className="manage-cr-filters">
        <div className="cr-filter-group">
          <label className="cr-filter-label">Year</label>
          <select 
            className="cr-filter-select"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedBranch('');
              setSelectedSemester('');
            }}
          >
            <option value="">-- Select Year --</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="cr-filter-group">
          <label className="cr-filter-label">Branch</label>
          <select 
            className="cr-filter-select"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setSelectedSemester('');
            }}
            disabled={!selectedYear}
          >
            <option value="">-- Select Branch --</option>
            {availableBranches.map(branch => (
              <option key={branch.id} value={branch.code}>{branch.name}</option>
            ))}
          </select>
        </div>

        <div className="cr-filter-group">
          <label className="cr-filter-label">Semester</label>
          <select 
            className="cr-filter-select"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={!selectedBranch}
          >
            <option value="">-- Select Semester --</option>
            {availableSemesters.map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>

        {(selectedYear || selectedBranch || selectedSemester) && (
          <button onClick={resetFilters} className="cr-reset-btn">
            Reset
          </button>
        )}
      </section>

      {selectedYear && selectedBranch && selectedSemester && (
        <div className="manage-cr-content">
          <div className="cr-section">
            <h2 className="cr-section-title">
              <UserCheck size={20} />
              Active CRs ({selectedBranch}, {selectedYear} - Semester {selectedSemester})
            </h2>
            
            {loading ? (
              <div className="cr-loading">Loading CRs...</div>
            ) : activeCRs.length === 0 ? (
              <div className="cr-empty-state">
                <p>No CR assigned for this combination</p>
              </div>
            ) : (
              <div className="cr-list">
                {activeCRs.map(cr => (
                  <div key={cr.id} className="cr-item">
                    <div className="cr-item__info">
                      <h4 className="cr-item__name">{cr.user_profiles?.full_name || 'Unknown'}</h4>
                      <p className="cr-item__email">{cr.user_profiles?.email || 'No email'}</p>
                      <p className="cr-item__roll">Roll: {cr.user_profiles?.roll_number || 'N/A'}</p>
                    </div>
                    <button 
                      onClick={() => initiateRemove(cr)}
                      className="cr-item__remove-btn"
                      aria-label="Remove CR"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cr-section">
            <h2 className="cr-section-title">
              <Plus size={20} />
              Assign New CR
            </h2>
            
            {eligibleStudents.length === 0 ? (
              <div className="cr-empty-state">
                <p>No students found for this Year and Branch</p>
              </div>
            ) : (
              <div className="cr-assign-form">
                <select 
                  className="cr-student-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssignCR(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">-- Select Student --</option>
                  {eligibleStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} ({student.roll_number})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {studentToRemove && (
        <div className="cr-modal-overlay">
          <div className="cr-modal">
            <h3 className="cr-modal__title">Remove CR</h3>
            <p className="cr-modal__text">
              Are you sure you want to remove {studentToRemove?.user_profiles?.full_name} as CR?
            </p>
            <div className="cr-modal__actions">
              <button onClick={cancelRemove} className="cr-modal__btn cr-modal__btn--cancel">
                Cancel
              </button>
              <button onClick={confirmRemove} className="cr-modal__btn cr-modal__btn--delete">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
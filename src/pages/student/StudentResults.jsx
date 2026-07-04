import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import './StudentResults.css';

const StudentResults = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cgpa, setCgpa] = useState(0);
  const [expandedSem, setExpandedSem] = useState(null);

  const fetchAcademicHistory = async () => {
    try {
      setLoading(true);
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('roll_number')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData?.roll_number) {
        console.warn("Could not find student roll number.");
        setHistory([]);
        return;
      }

      const studentRollNumber = profileData.roll_number;

      const { data, error } = await supabase
        .from('academic_history')
        .select('*')
        .eq('roll_number', studentRollNumber)
        .order('semester', { ascending: false });

      if (!error && data && data.length > 0) {
        const parsedData = data.map(record => ({
          ...record,
          subjects: typeof record.subjects === 'string' ? JSON.parse(record.subjects) : record.subjects
        }));
        setHistory(parsedData);
        
        const completedSems = parsedData.filter(r => r.sgpa !== null);
        if (completedSems.length > 0) {
          const total = completedSems.reduce((acc, curr) => acc + parseFloat(curr.sgpa || 0), 0);
          setCgpa((total / completedSems.length).toFixed(2));
        }
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAcademicHistory();
  }, [user]);

  const toggleScorecard = (semId) => {
    if (expandedSem === semId) setExpandedSem(null);
    else setExpandedSem(semId);
  };

  if (loading) return <div className="loading-results">Loading academic records...</div>;

  if (history.length === 0) {
    return <div className="loading-results">No academic results have been published for you yet.</div>;
  }

  const strokeDasharray = 251.2;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * (cgpa / 10));

  return (
    <div className="fade-in results-container">
      <div className="results-header">
        <h2>Academic Results & Scorecards</h2>
        <p>Track your AKTU external grades and BIT internal evaluations.</p>
      </div>
      
      <div className="results-overview-grid">
        <div className="cgpa-card">
          <h3>Overall AKTU CGPA</h3>
          <div className="cgpa-circle-wrapper">
            <svg viewBox="0 0 100 100" className="cgpa-svg">
              <circle cx="50" cy="50" r="40" className="cgpa-bg-circle" />
              <circle 
                cx="50" cy="50" r="40" 
                className="cgpa-progress-circle"
                strokeDasharray={strokeDasharray} 
                strokeDashoffset={strokeDashoffset}
              />
              <defs>
                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
            <div className="cgpa-text">
              <span className="cgpa-value">{cgpa}</span>
              <span className="cgpa-label">out of 10</span>
            </div>
          </div>
          <div className="cgpa-badge">First Class</div>
        </div>

        <div className="internal-stats-wrapper">
          <div className="internal-card">
            <span className="stat-label">Total Marks (Latest Sem)</span>
            <span className="stat-value">{history[0]?.total_marks || '--'}</span>
            <p className="stat-desc">Combined Internal (30) & External (70)</p>
          </div>
          <div className="internal-card">
            <span className="stat-label">Total Credits Earned</span>
            <span className="stat-value">
              {history.reduce((acc, curr) => curr.sgpa ? acc + (curr.total_credits || 0) : acc, 0)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ clear: 'both', height: '50px', width: '100%', display: 'block' }}></div>
      <h3 className="section-title" style={{ marginTop: '0', marginBottom: '24px', position: 'relative', zIndex: 1, letterSpacing: '1px' }}>SEMESTER WISE BREAKDOWN</h3>
      <div className="semester-list">
        {history.map((sem, index) => (
          <div key={index} className="semester-card">
            <div className="sem-card-top">
              <div>
                <h4>Semester {sem.semester}</h4>
                <p>Total Marks: {sem.total_marks || 'N/A'}</p>
              </div>
              <div className="sem-score">
                <div className="sgpa-val">{sem.sgpa ? sem.sgpa : 'TBD'}</div>
                <div className={`sem-status ${sem.status.toLowerCase()}`}>{sem.status}</div>
              </div>
            </div>
            
            <div className="sem-card-bottom">
              <p><span>Remarks:</span> {sem.details}</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className="view-scorecard-btn"
                  onClick={() => toggleScorecard(sem.id)}
                >
                  {expandedSem === sem.id ? 'Hide Scorecard ↑' : 'View Full Scorecard ↓'}
                </button>
                <button className="print-scorecard-btn" onClick={() => window.print()} style={{ marginLeft: '12px', background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                  🖨️ Save PDF / Print
                </button>
              </div>
            </div>

            {/* Expandable AKTU Table */}
            {expandedSem === sem.id && (() => {
              const subjectsList = typeof sem.subjects === 'string' ? JSON.parse(sem.subjects) : (sem.subjects || []);
              return (
                <div className="aktu-scorecard-wrapper fade-in">
                  <table className="aktu-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Subject Name</th>
                        <th>Type</th>
                        <th>Internal</th>
                        <th>External</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectsList.map((sub, i) => (
                        <tr key={i}>
                          <td className="sub-code">{sub.code}</td>
                          <td>{sub.name}</td>
                          <td><span className={`sub-type ${sub.type.toLowerCase()}`}>{sub.type}</span></td>
                          <td className="sub-marks">
                            {sub.internal} <span className="max-marks">/{sub.type === 'Theory' ? '30' : '50'}</span>
                          </td>
                          <td className="sub-marks">
                            {sub.external} <span className="max-marks">/{sub.type === 'Theory' ? '70' : '50'}</span>
                          </td>
                          <td className={`sub-grade grade-${sub.grade.replace('+', 'plus').toLowerCase()}`}>{sub.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentResults;
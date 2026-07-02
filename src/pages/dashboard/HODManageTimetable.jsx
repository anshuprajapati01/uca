import { useState, useMemo, useEffect } from 'react';
import { Grid } from 'lucide-react';
import { useHodContext } from '../../context/HodContext.jsx';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import './HODManageTimetable.css';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SLOT_TYPES = [
  { value: 'theory', label: 'Theory' },
  { value: 'lab', label: 'Lab' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'break', label: 'Short Break' },
];

const BATCH_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'b1', label: 'B1' },
  { value: 'b2', label: 'B2' },
];

function useSafeHodContext() {
  try {
    return useHodContext();
  } catch {
    return {
      hodAuthorizedBranches: [],
      hodDepartmentsData: [],
      isAssigned: false,
    };
  }
}

export default function HODManageTimetable() {
  const { hodAuthorizedBranches, hodDepartmentsData } = useSafeHodContext();
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotData, setSlotData] = useState({
    subject_id: '',
    faculty_id: '',
    room: '',
    startTime: '',
    endTime: '',
    slotType: 'theory',
    batch: 'all',
  });

  const isHodMode = hodAuthorizedBranches.length > 0;

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: subjectsData } = await supabase.from('subjects').select('id, name');
      setSubjects(subjectsData || []);

      const { data: facultiesData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('role', 'faculty');
      setFaculties(facultiesData || []);
    };
    fetchDropdownData();
  }, []);

  const fetchTimetable = async () => {
    const numericSemester = parseInt(String(selectedSemester).replace(/\D/g, ''), 10);
    const { data, error } = await supabase
      .from('timetable_slots')
      .select('*, subjects(name), user_profiles(full_name)')
      .eq('branch', selectedBranch)
      .eq('semester', numericSemester)
      .eq('section', selectedSection)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching timetable:', error);
      toast.error('Failed to load timetable');
    } else {
      setSlots(data || []);
    }
  };

  const availableBranches = useMemo(() => {
    return [...new Set(hodDepartmentsData.map((d) => d.code || d.name))].filter(Boolean).sort();
  }, [hodDepartmentsData]);

  const availableSemesters = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }, []);

  const availableSections = useMemo(() => {
    return ['A', 'B', 'C', 'D', 'E'];
  }, []);

  const handleLoadGrid = async () => {
    await fetchTimetable();
  };

  const handleAddSlot = (day) => {
    setSelectedDay(day);
    setSlotData({
      subject_id: '',
      faculty_id: '',
      room: '',
      startTime: '',
      endTime: '',
      slotType: 'theory',
      batch: 'all',
    });
    setIsModalOpen(true);
  };

  const handleSlotInputChange = (field, value) => {
    setSlotData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSlot = async () => {
    if (!slotData.subject_id || !slotData.faculty_id || !slotData.startTime || !slotData.endTime || !slotData.room || !selectedDay) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numericSemester = parseInt(String(selectedSemester).replace(/\D/g, ''), 10);
    const calculatedYear = Math.ceil(numericSemester / 2);

    const payload = {
      branch: selectedBranch,
      year: calculatedYear,
      semester: numericSemester,
      section: selectedSection,
      day_of_week: selectedDay,
      start_time: slotData.startTime,
      end_time: slotData.endTime,
      subject_id: slotData.subject_id,
      faculty_id: slotData.faculty_id,
      room_no: slotData.room,
      slot_type: slotData.slotType,
      batch: slotData.batch,
    };

    const { error } = await supabase.from('timetable_slots').insert([payload]);

    if (error) {
      console.error('Error saving slot:', error);
      toast.error('Failed to save slot');
    } else {
      toast.success('Slot saved successfully!');
      setIsModalOpen(false);
      setSelectedDay('');
      fetchTimetable();
    }
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setSelectedDay('');
  };

  const resetFilters = () => {
    setSelectedBranch('');
    setSelectedSemester('');
    setSelectedSection('');
    setSlots([]);
  };

  return (
    <div className="timetable-container">
      <header className="timetable-header">
        <h1 className="timetable-title">
          <Grid size={28} />
          Manage Timetable
        </h1>
        <p className="timetable-subtitle">Build and manage class timetables for your department</p>
      </header>

      <section className="timetable-filters">
        <div className="timetable-filter-group">
          <label className="timetable-filter-label">Branch</label>
          <select
            className="timetable-filter-select"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setSelectedSemester('');
              setSelectedSection('');
            }}
            disabled={!isHodMode}
          >
            <option value="">-- Select Branch --</option>
            {availableBranches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="timetable-filter-group">
          <label className="timetable-filter-label">Semester</label>
          <select
            className="timetable-filter-select"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={!selectedBranch}
          >
            <option value="">-- Select Semester --</option>
            {availableSemesters.map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>

        <div className="timetable-filter-group">
          <label className="timetable-filter-label">Section</label>
          <select
            className="timetable-filter-select"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedSemester}
          >
            <option value="">-- Select Section --</option>
            {availableSections.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
        </div>

        <button
          className="timetable-load-btn"
          onClick={handleLoadGrid}
          disabled={!selectedBranch || !selectedSemester || !selectedSection}
        >
          Load Grid
        </button>

        {(selectedBranch || selectedSemester || selectedSection) && (
          <button onClick={resetFilters} className="timetable-reset-btn">
            Reset
          </button>
        )}
      </section>

      {selectedBranch && selectedSemester && selectedSection && (
        <section className="timetable-grid-section">
          <h2 className="timetable-grid-title">
            {selectedBranch} - Semester {selectedSemester} - Section {selectedSection}
          </h2>
          <div className="timetable-grid">
            <div className="timetable-grid-header">
              <div className="timetable-day-header">Day</div>
              <div className="timetable-slots-header">Slots</div>
            </div>

            {DAYS_OF_WEEK.map((day) => {
              const daySlots = slots.filter((s) => s.day_of_week === day);
              return (
                <div className="timetable-day-row" key={day}>
                  <div className="timetable-day-cell">{day}</div>
                  <div className="timetable-slots-cell">
                    <div className="timetable-slots-list">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`timetable-slot-card timetable-slot-card--${slot.slot_type}`}
                        >
                          <span className="timetable-slot-subject">{slot.subjects?.name}</span>
                          <span className="timetable-slot-time">
                            {slot.start_time} - {slot.end_time}
                          </span>
                          <span className="timetable-slot-room">{slot.room_no}</span>
                          {slot.batch && slot.batch !== 'all' && (
                            <span className="timetable-slot-batch">{slot.batch.toUpperCase()}</span>
                          )}
                        </div>
                      ))}
                      <button
                        className="timetable-add-slot-btn"
                        onClick={() => handleAddSlot(day)}
                      >
                        + Add Slot
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isModalOpen && (
        <div className="timetable-modal-overlay" onClick={handleCancelModal}>
          <div className="timetable-modal" onClick={(e) => e.stopPropagation()}>
            <div className="timetable-modal-header">
              <h3 className="timetable-modal-title">Add Slot for {selectedDay}</h3>
              <button className="timetable-modal-close" onClick={handleCancelModal}>
                &times;
              </button>
            </div>

            <div className="timetable-modal-body">
              <div className="timetable-field">
                <label className="timetable-field-label">Day of Week</label>
                <input
                  type="text"
                  className="timetable-field-input"
                  value={selectedDay}
                  disabled
                />
              </div>

              <div className="timetable-field">
                <label className="timetable-field-label">Subject</label>
                <select
                  className="timetable-field-select"
                  value={slotData.subject_id}
                  onChange={(e) => handleSlotInputChange('subject_id', e.target.value)}
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="timetable-field">
                <label className="timetable-field-label">Faculty</label>
                <select
                  className="timetable-field-select"
                  value={slotData.faculty_id}
                  onChange={(e) => handleSlotInputChange('faculty_id', e.target.value)}
                >
                  <option value="">-- Select Faculty --</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="timetable-field">
                <label className="timetable-field-label">Room Number</label>
                <input
                  type="text"
                  className="timetable-field-input"
                  placeholder="e.g., 125 or L-304"
                  value={slotData.room}
                  onChange={(e) => handleSlotInputChange('room', e.target.value)}
                />
              </div>

              <div className="timetable-field-row">
                <div className="timetable-field">
                  <label className="timetable-field-label">Start Time</label>
                  <input
                    type="time"
                    className="timetable-field-input"
                    value={slotData.startTime}
                    onChange={(e) => handleSlotInputChange('startTime', e.target.value)}
                  />
                </div>

                <div className="timetable-field">
                  <label className="timetable-field-label">End Time</label>
                  <input
                    type="time"
                    className="timetable-field-input"
                    value={slotData.endTime}
                    onChange={(e) => handleSlotInputChange('endTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="timetable-field-row">
                <div className="timetable-field">
                  <label className="timetable-field-label">Slot Type</label>
                  <select
                    className="timetable-field-select"
                    value={slotData.slotType}
                    onChange={(e) => handleSlotInputChange('slotType', e.target.value)}
                  >
                    {SLOT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="timetable-field">
                  <label className="timetable-field-label">Batch</label>
                  <select
                    className="timetable-field-select"
                    value={slotData.batch}
                    onChange={(e) => handleSlotInputChange('batch', e.target.value)}
                  >
                    {BATCH_OPTIONS.map((batch) => (
                      <option key={batch.value} value={batch.value}>
                        {batch.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="timetable-modal-footer">
              <button className="timetable-modal-btn timetable-modal-btn--cancel" onClick={handleCancelModal}>
                Cancel
              </button>
              <button className="timetable-modal-btn timetable-modal-btn--save" onClick={handleSaveSlot}>
                Save Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
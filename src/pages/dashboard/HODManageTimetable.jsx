import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Grid, Trash2, Download } from 'lucide-react';
import { useHodContext } from '../../context/HodContext.jsx';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './HODManageTimetable.css';

const CAPTURE_BG = '#0f172a';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COLUMNS = [
  { type: 'period', label: '9:10-10:05 AM', periodIndex: 0, start: '09:10', end: '10:05' },
  { type: 'period', label: '10:05-11:00 AM', periodIndex: 1, start: '10:05', end: '11:00' },
  { type: 'break', label: 'SHORT BREAK (15 Min.)', sub: '11:00-11:15' },
  { type: 'period', label: '11:15-12:10 PM', periodIndex: 2, start: '11:15', end: '12:10' },
  { type: 'period', label: '12:10-01:05 PM', periodIndex: 3, start: '12:10', end: '13:05' },
  { type: 'break', label: 'LUNCH BREAK (40 Min.)', sub: '01:05-01:45' },
  { type: 'period', label: '01:45-02:40 PM', periodIndex: 4, start: '13:45', end: '14:40' },
  { type: 'period', label: '02:40-03:35 PM', periodIndex: 5, start: '14:40', end: '15:35' },
  { type: 'period', label: '03:35-04:30 PM', periodIndex: 6, start: '15:35', end: '16:30' },
];

const YEAR_OPTIONS = [
  { value: '1st Year', label: 'Year 1' },
  { value: '2nd Year', label: 'Year 2' },
  { value: '3rd Year', label: 'Year 3' },
  { value: '4th Year', label: 'Year 4' },
];

const YEAR_SEMESTERS = {
  '1st Year': [1, 2],
  '2nd Year': [3, 4],
  '3rd Year': [5, 6],
  '4th Year': [7, 8],
};

const getYearNumber = (yearLabel) => Object.keys(YEAR_SEMESTERS).indexOf(yearLabel) + 1;

const FORM_SLOT_TYPES = [
  { value: 'theory', label: 'Theory' },
  { value: 'lab', label: 'Lab' },
  { value: 'skill', label: 'Skill' },
  { value: 'non-academic', label: 'Non-Academic' },
];

const isNonAcademicSlot = (slotType) => slotType === 'non-academic';

const BATCH_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'b1', label: 'B1' },
  { value: 'b2', label: 'B2' },
];

const getSubjectLabel = (subject) => {
  if (!subject) return '—';
  return subject.code ? `${subject.name} (${subject.code})` : subject.name;
};

const getFacultyName = (slot) => {
  if (slot?.user_profiles?.full_name) return slot.user_profiles.full_name;
  return slot?.faculty_name || 'Unassigned';
};

const getInitials = (name) => {
  if (!name) return '';
  const cleanName = name
    .replace(/\./g, ' ')
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Er)\b/gi, '')
    .trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  const initials = words
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();
  return initials || name.trim()[0]?.toUpperCase() || '';
};

const SUBJECT_STOP_WORDS = new Set([
  'of', 'and', 'with', '&', 'for', 'the', 'lab',
]);

const SUBJECT_SHORT_FALLBACK = {
  'oop with java': 'OOPS',
  'oops with java': 'OOPS',
  'oop with java lab': 'OOPS',
  'oops with java lab': 'OOPS',
};

const getSubjectShortName = (name) => {
  if (!name) return '—';
  const normalized = name.trim().toLowerCase();
  if (SUBJECT_SHORT_FALLBACK[normalized]) return SUBJECT_SHORT_FALLBACK[normalized];

  const significant = name
    .trim()
    .split(/\s+/)
    .filter((word) => {
      const w = word.toLowerCase().replace(/[^a-z]/g, '');
      return w && !SUBJECT_STOP_WORDS.has(w);
    });

  if (significant.length === 0) return name.trim().slice(0, 4).toUpperCase();

  return significant
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();
};

const getSlotRoom = (slot, fallbackRoom) => slot?.room_no || fallbackRoom || '';

function useSafeHodContext() {
  try {
    return useHodContext();
  } catch {
    return {
      hodAuthorizedBranches: [],
      hodAssignedYears: [],
      hodDepartmentsData: [],
      isAssigned: false,
    };
  }
}

function Combobox({ options, value, onChange, placeholder, disabled }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const inputValue = isOpen ? searchTerm : selectedLabel;
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes((isOpen ? searchTerm : '').toLowerCase())
  );

  return (
    <div className="tt-combobox" ref={containerRef}>
      <input
        type="text"
        className="tt-combobox__input"
        placeholder={placeholder}
        value={inputValue}
        disabled={disabled}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && !disabled && (
        <ul className="tt-combobox__menu" role="listbox">
          {filteredOptions.length === 0 ? (
            <li className="tt-combobox__empty">No matches found</li>
          ) : (
            filteredOptions.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`tt-combobox__option${o.value === value ? ' tt-combobox__option--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default function HODManageTimetable() {
  const { hodAuthorizedBranches, hodAssignedYears, hodDepartmentsData } = useSafeHodContext();
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [timetableMeta, setTimetableMeta] = useState({ wefDate: '', roomNo: '' });
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [isSemesterSettingsLoading, setIsSemesterSettingsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showRefTable, setShowRefTable] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);
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

  const effectiveYear = selectedYear || (isHodMode && hodAssignedYears[0]) || '';
  const effectiveBranch = selectedBranch || (isHodMode && hodAuthorizedBranches.length === 1 ? hodAuthorizedBranches[0].code : '');

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: facultiesData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('role', ['faculty', 'director']);
      setFaculties(facultiesData || []);

      const semesterLabel = selectedSemester ? `Semester ${selectedSemester}` : null;

      const subjectQuery = supabase
        .from('subjects')
        .select('id, name, code, department, year, semester')
        .order('name', { ascending: true });

      if (effectiveBranch) subjectQuery.eq('department', effectiveBranch);
      if (effectiveYear) subjectQuery.eq('year', effectiveYear);
      if (semesterLabel) subjectQuery.eq('semester', semesterLabel);

      const { data: subjectsData, error } = await subjectQuery;

      if (error) {
        console.error('Error fetching subjects:', error);
        toast.error('Failed to load subjects');
        setSubjects([]);
        return;
      }

      setSubjects(subjectsData || []);

      if ((effectiveBranch && effectiveYear && semesterLabel) && (subjectsData || []).length === 0) {
        console.warn(
          `No subjects found for filters: department=${effectiveBranch}, year=${effectiveYear}, semester=${semesterLabel}`
        );
      }
    };
    fetchDropdownData();
  }, [effectiveBranch, effectiveYear, selectedSemester]);

  const fetchTimetable = useCallback(async () => {
    if (!effectiveYear || !effectiveBranch || !selectedSemester) return;
    const numericSemester = parseInt(String(selectedSemester).replace(/\D/g, ''), 10);
    console.log('[fetchSlots] Querying timetable_drafts for', { branch: effectiveBranch, semester: numericSemester, year: effectiveYear });

    let drafts = [];
    try {
      const { data: rawDrafts, error: draftError } = await supabase
        .from('timetable_drafts')
        .select('*')
        .eq('branch', effectiveBranch)
        .eq('semester', numericSemester)
        .order('start_time', { ascending: true });

      if (draftError) throw draftError;

      const subjectIds = [...new Set((rawDrafts || []).map((d) => d.subject_id).filter(Boolean))];
      const facultyIds = [...new Set((rawDrafts || []).map((d) => d.faculty_id).filter(Boolean))];

      const [subjectsRes, facultiesRes] = await Promise.all([
        subjectIds.length
          ? supabase.from('subjects').select('id, name, code').in('id', subjectIds)
          : Promise.resolve({ data: [] }),
        facultyIds.length
          ? supabase.from('user_profiles').select('id, full_name').in('id', facultyIds)
          : Promise.resolve({ data: [] }),
      ]);

      const subjectMap = new Map((subjectsRes.data || []).map((s) => [s.id, s]));
      const facultyMap = new Map((facultiesRes.data || []).map((f) => [f.id, f]));

      drafts = (rawDrafts || []).map((draft) => ({
        ...draft,
        subjects: subjectMap.get(draft.subject_id) || null,
        user_profiles: facultyMap.get(draft.faculty_id) || null,
      }));
    } catch (err) {
      console.error('Error fetching timetable drafts:', err);
      toast.error('Failed to load timetable');
      return null;
    }

    console.log('[fetchSlots] Returned rows:', (drafts || []).length, drafts);
    setSlots(drafts || []);

    const { data: metaData, error: metaError } = await supabase
      .from('timetable_configs')
      .select('wef_date, room_no')
      .eq('branch', effectiveBranch)
      .eq('semester', numericSemester)
      .eq('year', effectiveYear)
      .maybeSingle();

    if (metaError) {
      console.error('Error fetching timetable config:', metaError);
    } else {
      setTimetableMeta({
        wefDate: metaData?.wef_date || '',
        roomNo: metaData?.room_no || '',
      });
    }

    return drafts || [];
  }, [effectiveYear, effectiveBranch, selectedSemester]);

  const fetchSemesterSettings = useCallback(async () => {
    if (!effectiveBranch) return;
    setIsSemesterSettingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('semester_start_date')
        .eq('department', effectiveBranch)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching semester settings:', error);
      } else if (data?.semester_start_date) {
        setSemesterStartDate(data.semester_start_date);
      }
    } catch (err) {
      console.error('Failed to fetch semester settings:', err);
    } finally {
      setIsSemesterSettingsLoading(false);
    }
  }, [effectiveBranch]);

  const saveSemesterSettings = useCallback(async () => {
    if (!effectiveBranch || !semesterStartDate) {
      toast.error('Please select a semester start date');
      return;
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            department: effectiveBranch,
            semester_start_date: semesterStartDate,
            is_active: true,
          },
          { onConflict: 'department' }
        );

      if (error) {
        console.error('Error saving semester settings:', error);
        toast.error('Failed to save semester settings');
      } else {
        toast.success('Semester start date saved successfully!');
      }
    } catch (err) {
      console.error('Failed to save semester settings:', err);
      toast.error('Failed to save semester settings');
    }
  }, [effectiveBranch, semesterStartDate]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchSemesterSettings();
  }, [fetchSemesterSettings]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const availableBranches = useMemo(() => {
    return [...new Set(hodDepartmentsData.map((d) => d.code || d.name))].filter(Boolean).sort();
  }, [hodDepartmentsData]);

  const availableSemesters = useMemo(() => {
    if (!effectiveYear) return [];
    return YEAR_SEMESTERS[effectiveYear] || [];
  }, [effectiveYear]);

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ value: s.id, label: getSubjectLabel(s) })),
    [subjects]
  );

  const facultyOptions = useMemo(
    () => faculties.map((f) => ({ value: f.id, label: f.full_name })),
    [faculties]
  );

  const yearOptions = useMemo(() => {
    if (isHodMode) {
      return hodAssignedYears.map((y) => ({ value: y, label: y }));
    }
    return YEAR_OPTIONS;
  }, [isHodMode, hodAssignedYears]);

  const branchOptions = useMemo(() => {
    if (isHodMode) {
      return hodAuthorizedBranches.map((b) => ({ value: b.code, label: b.name || b.code }));
    }
    return availableBranches.map((b) => ({ value: b, label: b }));
  }, [isHodMode, hodAuthorizedBranches, availableBranches]);

  const isSingleYearHod = isHodMode && hodAssignedYears.length <= 1;
  const isSingleBranchHod = isHodMode && hodAuthorizedBranches.length <= 1;

  const referenceIndex = useMemo(() => {
    const map = new Map();
    (slots || []).forEach((slot) => {
      const subjectCode = slot.subjects?.code || '';
      const subjectName = slot.subjects?.name || 'Unassigned';
      const subjectShortName = getSubjectShortName(slot.subjects?.name);
      const facultyName = getFacultyName(slot);
      const facultyCode = getInitials(facultyName);
      const key = `${subjectCode}|${facultyName}`;
      if (!map.has(key)) {
        map.set(key, {
          subjectCode,
          subjectFullName: subjectName,
          subjectShortName,
          facultyCode,
          facultyName,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.subjectCode || a.subjectFullName).localeCompare(b.subjectCode || b.subjectFullName)
    );
  }, [slots]);

  const handlePublishTimetable = async () => {
    console.log('[Publish] Button clicked', {
      effectiveYear,
      effectiveBranch,
      selectedSemester,
    });
    if (!effectiveYear || !effectiveBranch || !selectedSemester) {
      toast.error('Please select Year, Branch and Semester first');
      return;
    }
    const numericSemester = parseInt(String(selectedSemester).replace(/\D/g, ''), 10);

    toast.loading('Publishing timetable...', { id: 'publish-toast' });

    try {
      console.log('[Publish] Fetching drafts for', { branch: effectiveBranch, semester: numericSemester });
      const { data: draftSlots, error: fetchError } = await supabase
        .from('timetable_drafts')
        .select('*')
        .eq('branch', effectiveBranch)
        .eq('semester', numericSemester);

      if (fetchError) {
        console.error('[Publish Error] fetch drafts failed:', fetchError);
        throw fetchError;
      }
      console.log(`[Publish] Fetched ${draftSlots ? draftSlots.length : 0} draft slot(s)`);

      console.log('[Publish] Clearing old slots in timetable_slots for', { branch: effectiveBranch, semester: numericSemester });
      const { error: deleteError } = await supabase
        .from('timetable_slots')
        .delete()
        .eq('branch', effectiveBranch)
        .eq('semester', numericSemester);

      if (deleteError) {
        console.error('[Publish Error] delete old slots failed:', deleteError);
        throw deleteError;
      }

      if (draftSlots && draftSlots.length > 0) {
        const slotsToInsert = draftSlots.map(({ id, created_at, updated_at, ...rest }) => rest);
        console.log(`[Publish] Upserting ${slotsToInsert.length} slot(s) into timetable_slots`);
        const { error: insertError } = await supabase
          .from('timetable_slots')
          .upsert(slotsToInsert, { onConflict: 'branch, semester, section, day_of_week, start_time, batch' });

        if (insertError) {
          console.error('[Publish Error] upsert slots failed:', insertError);
          throw insertError;
        }
        console.log('[Publish] Upsert completed successfully');
      } else {
        console.log('[Publish] No draft slots to publish (drafts table empty for this branch/semester)');
      }

      toast.success('Timetable Published! Now live for Students & Faculty.', { id: 'publish-toast' });
    } catch (err) {
      console.error('[Publish Error]', err);
      toast.error('Failed to publish timetable', { id: 'publish-toast' });
    }
  };

  const handleSyncLiveToDraft = async () => {
    if (!effectiveYear || !effectiveBranch || !selectedSemester) {
      toast.error('Please select Year, Branch and Semester first');
      return;
    }
    const numericSemester = parseInt(String(selectedSemester).replace(/\D/g, ''), 10);
    
    toast.loading('Syncing live timetable to drafts...', { id: 'sync-toast' });
    
    try {
      const { data: liveSlots, error: fetchError } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('branch', effectiveBranch)
        .eq('semester', numericSemester);
      
      if (fetchError) throw fetchError;
      
      const { error: deleteError } = await supabase
        .from('timetable_drafts')
        .delete()
        .eq('branch', effectiveBranch)
        .eq('semester', numericSemester);
      
      if (deleteError) throw deleteError;
      
      if (liveSlots && liveSlots.length > 0) {
        const { error: insertError } = await supabase
          .from('timetable_drafts')
          .upsert(liveSlots, { onConflict: 'branch, semester, section, day_of_week, start_time, batch' });
        
        if (insertError) throw insertError;
      }
      
      await fetchTimetable();
      toast.success('Live timetable loaded into Draft mode for editing.', { id: 'sync-toast' });
    } catch (err) {
      console.error('Error syncing live to draft:', err);
      toast.error('Failed to sync live timetable to drafts', { id: 'sync-toast' });
    }
  };

  const saveTimetableMeta = useCallback(async () => {
    if (!effectiveYear || !effectiveBranch || !selectedSemester) return;
    const numericSemester = parseInt(String(selectedSemester).replace(/\D/g, ''), 10);
    const { error } = await supabase
      .from('timetable_configs')
      .upsert(
        {
          branch: effectiveBranch,
          semester: numericSemester,
          year: effectiveYear,
          wef_date: timetableMeta.wefDate || null,
          room_no: timetableMeta.roomNo || null,
        },
        { onConflict: 'branch,semester,year' }
      );
    if (error) {
      console.error('Error saving timetable config:', error);
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved');
    }
  }, [effectiveYear, effectiveBranch, selectedSemester, timetableMeta]);

  const handleDownloadPDF = async () => {
    const input = document.getElementById('timetable-capture');
    if (!input) {
      toast.error('Nothing to export yet');
      return;
    }

    const wasOpen = showRefTable;
    if (!wasOpen) {
      setShowRefTable(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    toast.loading('Generating PDF…', { id: 'pdf-toast' });
    try {
      const canvas = await html2canvas(input, {
        backgroundColor: CAPTURE_BG,
        scale: 4, // Boost resolution by 4x for ultra-crisp text
        useCORS: true, // Fixes any font loading issues
        logging: false,
      });

      const pdf = new jsPDF('l', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgData = canvas.toDataURL('image/png', 1.0);

      const canvasRatio = canvas.height / canvas.width;
      let finalWidth = pdfWidth;
      let finalHeight = finalWidth * canvasRatio;

      if (finalHeight > pdfHeight) {
        finalHeight = pdfHeight;
        finalWidth = finalHeight / canvasRatio;
      }

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');

      const safeBranch = (effectiveBranch || 'Timetable').replace(/[^\w-]+/g, '_');
      const fileName = `${safeBranch}-Semester-${selectedSemester || ''}-Timetable.pdf`;
      pdf.save(fileName);

      toast.success('PDF downloaded', { id: 'pdf-toast' });
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to export PDF', { id: 'pdf-toast' });
    }

    if (!wasOpen) {
      setShowRefTable(false);
    }
  };

  const handleSlotInputChange = (field, value) => {
    setSlotData((prev) => ({ ...prev, [field]: value }));
  };

  const getSlotsForCell = (day, start) =>
    slots.filter((s) => s.day_of_week === day && String(s.start_time || '').slice(0, 5) === start);

  const isSpanType = (slotType) => slotType === 'lab' || slotType === 'skill';

  const openCellModal = (day, col) => {
    setActiveCell({ day, period: col.label, start: col.start, end: col.end, slotId: null });
    setSlotData({
      subject_id: '',
      faculty_id: '',
      room: timetableMeta.roomNo || '',
      startTime: col.start,
      endTime: col.end,
      slotType: 'theory',
      batch: 'all',
    });
    setIsModalOpen(true);
  };

  const renderSlotContent = (slot) => {
    const isSpan = isSpanType(slot.slot_type);
    const subj = getSubjectShortName(slot.subjects?.name);
    const fac = getInitials(getFacultyName(slot));
    const room = getSlotRoom(slot, timetableMeta.roomNo);
    const batchLabel = (slot.batch || 'all').toUpperCase();

    if (isNonAcademicSlot(slot.slot_type)) {
      return (
        <div className="tt-slot-nonacademic">
          <div className="tt-slot-subj">{slot.subjects?.name || subj}</div>
          {slot.batch && slot.batch !== 'all' && (
            <span className="tt-slot-tag">{batchLabel}</span>
          )}
        </div>
      );
    }

    if (isSpan) {
      return (
        <div className="tt-slot-line">
          {subj} Lab-{batchLabel}-{fac}-{room}
        </div>
      );
    }

    return (
      <div className="tt-slot-theory">
        <div className="tt-slot-subj">{subj}</div>
        <div className="tt-slot-fac">({fac})</div>
        {slot.batch && slot.batch !== 'all' && (
          <span className="tt-slot-tag">{batchLabel}</span>
        )}
      </div>
    );
  };

  const renderLabBatch = (slot, batch) => {
    if (!slot) {
      return (
        <div className="tt-slot-lab-half tt-slot-lab-half--empty">
          <span className="tt-slot-lab-batch-tag">{batch.toUpperCase()}</span>
        </div>
      );
    }

    const subj = getSubjectShortName(slot.subjects?.name);
    const fac = getInitials(getFacultyName(slot));
    const room = getSlotRoom(slot, timetableMeta.roomNo);
    const typeLabel = slot.slot_type === 'skill' ? 'Skill' : 'Lab';
    const batchLabel = (slot.batch && slot.batch !== 'all' ? slot.batch : batch).toUpperCase();

    return (
      <div className="tt-slot-lab-half">
        <span className="tt-slot-lab-text">{subj} {typeLabel}-{batchLabel}-{fac}-{room}</span>
        <button
          type="button"
          className="tt-slot-delete"
          title="Remove slot"
          data-html2canvas-ignore="true"
          onClick={(e) => {
            e.stopPropagation();
            setSlotToDelete(slot.id);
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    );
  };

  const handleSaveSlot = async () => {
    console.log('Button clicked');
    if (!activeCell || !slotData.subject_id || !slotData.startTime || !slotData.endTime) {
      console.warn('[handleSaveSlot] Early exit: missing required fields', {
        activeCell,
        subject_id: slotData.subject_id,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
      });
      toast.error('Please fill in all required fields');
      return;
    }
    if (!isNonAcademicSlot(slotData.slotType) && !slotData.faculty_id) {
      console.warn('[handleSaveSlot] Early exit: faculty not assigned', {
        slotType: slotData.slotType,
        faculty_id: slotData.faculty_id,
      });
      toast.error('Please assign a faculty');
      return;
    }

    const numericSemester = parseInt(String(selectedSemester).replace(/\D/g, ''), 10);
    const numericYear = getYearNumber(effectiveYear);

    const isLabSlot = slotData.slotType === 'lab' || slotData.slotType === 'skill';
    const startDate = new Date(`2000-01-01T${slotData.startTime}:00`);
    if (isLabSlot) {
      startDate.setMinutes(startDate.getMinutes() + 110);
    } else {
      startDate.setMinutes(startDate.getMinutes() + 55);
    }
    const endTime = startDate.toTimeString().slice(0, 5);

    const newSlot = {
      branch: effectiveBranch,
      year: numericYear,
      semester: numericSemester,
      section: 'A',
      day_of_week: activeCell.day,
      start_time: `${slotData.startTime}:00`,
      end_time: `${endTime}:00`,
      subject_id: slotData.subject_id,
      faculty_id: isNonAcademicSlot(slotData.slotType) ? (slotData.faculty_id || null) : slotData.faculty_id,
      room_no: slotData.room || timetableMeta.roomNo || null,
      slot_type: slotData.slotType,
      batch: slotData.batch,
    };

    try {
      let error;
      if (activeCell.slotId) {
        ({ error } = await supabase.from('timetable_drafts').update(newSlot).eq('id', activeCell.slotId));
      } else {
        ({ error } = await supabase
          .from('timetable_drafts')
          .upsert([newSlot], {
            onConflict: 'branch, semester, section, day_of_week, start_time, batch',
          }));
      }

      if (error) {
        console.error('Error saving slot:', error);
        toast.error('Failed to save slot');
      } else {
        toast.success(activeCell.slotId ? 'Slot updated successfully!' : 'Slot saved successfully!');
        closeModal();
        fetchTimetable();
      }
    } catch (err) {
      console.error('[handleSaveSlot] Unexpected error:', err);
      toast.error('Failed to save slot');
    }
  };

  const handleDeleteSlot = async (slotId) => {
    const { error } = await supabase.from('timetable_drafts').delete().eq('id', slotId);
    if (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete slot');
    } else {
      toast.success('Slot removed');
      fetchTimetable();
    }
  };

  const confirmDelete = async () => {
    if (!slotToDelete) return;
    await handleDeleteSlot(slotToDelete);
    setSlotToDelete(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveCell(null);
    setSlotData({
      subject_id: '',
      faculty_id: '',
      room: '',
      startTime: '',
      endTime: '',
      slotType: 'theory',
      batch: 'all',
    });
  };

  const handleCancelModal = () => {
    closeModal();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Global Semester Start Date
          </label>
          <input
            type="date"
            value={semesterStartDate}
            onChange={(e) => setSemesterStartDate(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #3f3f46', backgroundColor: '#18181b', color: '#fff', outline: 'none', colorScheme: 'dark', fontFamily: 'inherit' }}
            disabled={isSemesterSettingsLoading}
          />
        </div>
        <button
          onClick={saveSemesterSettings}
          style={{ marginTop: '24px', padding: '10px 20px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#4f46e5'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#6366f1'}
          disabled={isSemesterSettingsLoading || !semesterStartDate}
        >
          Apply Config to All Portals
        </button>
      </div>

        <div className="timetable-filter-group">
          <label className="timetable-filter-label">Year</label>
          <select
            className="timetable-filter-select"
            value={effectiveYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedSemester('');
            }}
            disabled={isSingleYearHod}
          >
            <option value="">-- Select Year --</option>
            {yearOptions.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        <div className="timetable-filter-group">
          <label className="timetable-filter-label">Branch</label>
          <select
            className="timetable-filter-select"
            value={effectiveBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={isSingleBranchHod}
          >
            <option value="">-- Select Branch --</option>
            {branchOptions.map((branch) => (
              <option key={branch.value} value={branch.value}>
                {branch.label}
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
            disabled={!effectiveYear}
          >
            <option value="">-- Select Semester --</option>
            {availableSemesters.map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="timetable-draft-badge">Draft Mode</span>
          <button
            className="timetable-sync-btn"
            onClick={handleSyncLiveToDraft}
            disabled={!effectiveBranch || !effectiveYear || !selectedSemester}
          >
            Sync Live to Draft
          </button>
          <button
            className="timetable-publish-btn"
            onClick={handlePublishTimetable}
            disabled={!effectiveBranch || !effectiveYear || !selectedSemester}
          >
            Publish Timetable
          </button>
        </div>
      </section>

      {effectiveBranch && effectiveYear && selectedSemester && (
        <section className="timetable-grid-section">
          <div className="timetable-grid-actions">
            <button
              type="button"
              className="timetable-download-btn"
              onClick={handleDownloadPDF}
            >
              <Download size={18} />
              Download PDF
            </button>
          </div>

          <div id="timetable-capture" className="timetable-capture">
            <div className="timetable-grid-toolbar">
              <h2 className="timetable-grid-title">
                {effectiveBranch} &middot; {effectiveYear} &middot; Semester {selectedSemester}
              </h2>
              <div className="timetable-meta-inputs">
                <label className="timetable-meta-field">
                  <span className="timetable-meta-label">W.E.F. Date</span>
                  <input
                    type="date"
                    className="timetable-meta-input"
                    value={timetableMeta.wefDate}
                    onChange={(e) => setTimetableMeta({ ...timetableMeta, wefDate: e.target.value })}
                    onBlur={saveTimetableMeta}
                  />
                </label>
                <label className="timetable-meta-field">
                  <span className="timetable-meta-label">Room No.</span>
                  <input
                    type="text"
                    className="timetable-meta-input"
                    placeholder="e.g., 125"
                    value={timetableMeta.roomNo}
                    onChange={(e) => setTimetableMeta({ ...timetableMeta, roomNo: e.target.value })}
                    onBlur={saveTimetableMeta}
                  />
                </label>
              </div>
            </div>

            <div className="timetable-matrix-wrap">
              <table className="timetable-matrix">
                <thead>
                  <tr>
                    <th className="tt-matrix-corner">Day</th>
                    {COLUMNS.map((col, i) =>
                      col.type === 'break' ? (
                        <th key={i} className="tt-matrix-break-cell"></th>
                      ) : (
                        <th key={i} className="tt-matrix-period-header">
                          {col.label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {DAYS_OF_WEEK.map((day, dayIdx) => {
                    let skipNext = false;
                    return (
                      <tr key={day}>
                        <td className="tt-matrix-day-cell">{day}</td>
                        {COLUMNS.map((col, colIdx) => {
                          if (skipNext) {
                            skipNext = false;
                            return null;
                          }
                          if (col.type === 'break') {
                            if (dayIdx === 0) {
                              return (
                                <td
                                  key={colIdx}
                                  rowSpan={DAYS_OF_WEEK.length}
                                  className="tt-matrix-break-cell"
                                >
                                  <div className="tt-break-wrapper">
                                    <span className="tt-print-safe-rotate">
                                      {col.label}
                                      <small>{col.sub}</small>
                                    </span>
                                  </div>
                                </td>
                              );
                            }
                            return null;
                          }
                          const cellSlots = getSlotsForCell(day, col.start);
                          const isSpan = cellSlots.some((s) => isSpanType(s.slot_type));
                          const isAllBatchSpan = isSpan && cellSlots.some((s) => (s.batch || 'all').toLowerCase() === 'all');
                          const nextCol = COLUMNS[colIdx + 1];
                          const canSpan = isSpan && nextCol && nextCol.type !== 'break';
                          if (canSpan) skipNext = true;
                          const isFilled = cellSlots.length > 0;
                          const repType = cellSlots[0]?.slot_type || 'theory';

                          return (
                            <td
                              key={colIdx}
                              colSpan={canSpan ? 2 : 1}
                              className={`tt-matrix-cell${isFilled ? ` tt-matrix-cell--filled tt-matrix-cell--${repType}` : ''}${canSpan ? ' tt-matrix-cell--span' : ''}`}
                              onClick={() => openCellModal(day, col)}
                            >
                              {isFilled ? (
                                isAllBatchSpan ? (
                                  <div className="tt-slot-allbatch">
                                    {cellSlots.map((slot) => {
                                      const allBatchText = [
                                        getSubjectShortName(slot.subjects?.name),
                                        getInitials(getFacultyName(slot)),
                                        getSlotRoom(slot, timetableMeta.roomNo),
                                      ]
                                        .filter(Boolean)
                                        .join(' - ');
                                      return (
                                        <div
                                          key={slot.id}
                                          className={`tt-slot-allbatch-inner tt-slot-allbatch-inner--${slot.slot_type || 'theory'}`}
                                        >
                                            <span className="tt-slot-allbatch-text">{allBatchText}</span>
                                            <button
                                              type="button"
                                              className="tt-slot-delete"
                                              title="Remove slot"
                                              data-html2canvas-ignore="true"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSlotToDelete(slot.id);
                                              }}
                                            >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : isSpan ? (
                                  <div className="tt-slot-lab-split">
                                    {renderLabBatch(
                                      cellSlots.find((s) => (s.batch || 'all').toLowerCase() === 'b1'),
                                      'b1'
                                    )}
                                    {renderLabBatch(
                                      cellSlots.find((s) => (s.batch || 'all').toLowerCase() === 'b2'),
                                      'b2'
                                    )}
                                  </div>
                                ) : (
                                  <div className={`tt-slot-stack${cellSlots.length > 1 ? ' tt-slot-stack--split' : ''}`}>
                                    {cellSlots.map((slot) => (
                                      <div
                                        key={slot.id}
                                        className={`tt-slot-row tt-slot-row--${slot.slot_type || 'theory'}`}
                                      >
                                        {renderSlotContent(slot)}
                                        <button
                                          type="button"
                                          className="tt-slot-delete"
                                          title="Remove slot"
                                          data-html2canvas-ignore="true"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSlotToDelete(slot.id);
                                          }}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )
                              ) : (
                                <span className="tt-matrix-add" data-html2canvas-ignore="true">+ Add</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="tt-ref-toggle-container" data-html2canvas-ignore="true">
              <button onClick={() => setShowRefTable(!showRefTable)} className="tt-ref-toggle-btn">
                {showRefTable ? 'Hide' : 'Show'} Subject &amp; Faculty Reference Key
              </button>
            </div>

            {showRefTable && (
              <div className="tt-reference-section">
                <h3 className="tt-reference-title">Subject &amp; Faculty Reference Key</h3>
                <table className="tt-reference-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Faculty Code</th>
                      <th>Faculty Full Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referenceIndex.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.subjectCode || '—'}</td>
                        <td>
                          {item.subjectFullName
                            ? `${item.subjectFullName} (${item.subjectShortName})`
                            : item.subjectShortName}
                        </td>
                        <td>{item.facultyCode || '—'}</td>
                        <td>{item.facultyName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {isModalOpen && (
        <div className="timetable-modal-overlay" onClick={handleCancelModal}>
          <div className="timetable-modal" onClick={(e) => e.stopPropagation()}>
            <div className="timetable-modal-header">
              <h3 className="timetable-modal-title">
                Add Slot &middot; {activeCell?.day} &middot; {activeCell?.period}
              </h3>
              <button className="timetable-modal-close" onClick={handleCancelModal}>
                &times;
              </button>
            </div>

            <div className="timetable-modal-body">
              <div className="timetable-field">
                <label className="timetable-field-label">Slot Type</label>
                <div className="timetable-radio-group">
                  {FORM_SLOT_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`timetable-radio${slotData.slotType === type.value ? ' timetable-radio--active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="slotType"
                        value={type.value}
                        checked={slotData.slotType === type.value}
                        onChange={(e) => handleSlotInputChange('slotType', e.target.value)}
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="timetable-field">
                <label className="timetable-field-label">Subject</label>
                <Combobox
                  options={subjectOptions}
                  value={slotData.subject_id}
                  onChange={(v) => handleSlotInputChange('subject_id', v)}
                  placeholder="-- Select Subject --"
                />
              </div>

              <div className="timetable-field">
                <label className="timetable-field-label">Faculty {isNonAcademicSlot(slotData.slotType) && <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>}</label>
                <Combobox
                  options={facultyOptions}
                  value={slotData.faculty_id}
                  onChange={(v) => handleSlotInputChange('faculty_id', v)}
                  placeholder="-- Select Faculty --"
                />
              </div>

              <div className="timetable-field-row">
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

                <div className="timetable-field">
                  <label className="timetable-field-label">Room No. (optional)</label>
                  <input
                    type="text"
                    className="timetable-field-input"
                    placeholder={timetableMeta.roomNo ? `${timetableMeta.roomNo} (default)` : 'e.g., 125 or L-304'}
                    value={slotData.room}
                    onChange={(e) => handleSlotInputChange('room', e.target.value)}
                  />
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

      {slotToDelete && (
        <div className="timetable-modal-overlay" onClick={() => setSlotToDelete(null)}>
          <div className="timetable-modal" onClick={(e) => e.stopPropagation()}>
            <div className="timetable-modal-header">
              <h3 className="timetable-modal-title">Delete Timetable Slot</h3>
              <button className="timetable-modal-close" onClick={() => setSlotToDelete(null)}>
                &times;
              </button>
            </div>
            <div className="timetable-modal-body">
              <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Are you sure you want to delete this slot? This action cannot be undone.
              </p>
            </div>
            <div className="timetable-modal-footer">
              <button className="timetable-modal-btn timetable-modal-btn--cancel" onClick={() => setSlotToDelete(null)}>
                Cancel
              </button>
              <button className="timetable-modal-btn timetable-modal-btn--delete" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { useAuth } from "../../hooks/useAuth.js";
import {
  Upload,
  FileText,
  Eye,
  Trash2,
  Pencil,
  ExternalLink,
  LayoutDashboard,
  BookOpen,
  Library,
  ClipboardList,
  Bookmark,
  Megaphone,
  CalendarDays,
  Trophy,
  Calendar,
  CircleDot,
  Star,
  Download,
  Coffee,
  Utensils,
  PartyPopper,
  CheckCircle2,
  AlertTriangle,
  User,
  Play,
  Menu,
  ChevronDown,
  CalendarCheck,
  ArrowRight,
  Clock,
} from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchCached, invalidateSubjectCache } from "../../services/subjectCache.js";
import FacultyAvatar from "../../components/common/FacultyAvatar.jsx";
import { uploadNewResource, deleteResource } from "../../services/resourceService.js";
import { signOut } from "../../services/authService.js";
import { restoreSpanDurations } from "../../utils/timetablePeriods.js";
import StudentAssignments from "./StudentAssignments.jsx";
import StudentResults from "./StudentResults.jsx";
import UploadResourceModal from "./UploadResourceModal.jsx";
import Attendance from "./Attendance.jsx";
import "./StudentDashboard.css";

const IconSyllabus = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gSyllabus)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gSyllabus" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const IconNotes = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gNotes)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gNotes" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
    <path d="M12 20h9" />
    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
  </svg>
);
const IconPYQs = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gPYQs)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gPYQs" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
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
const IconSearch = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconStar = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gStar)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gStar" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconCheatsheet = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gCheat)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gCheat" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);
const IconBook = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gBook)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gBook" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const navItems = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { id: "subjects", label: "My Subjects", icon: <BookOpen size={18} /> },
  { id: "library", label: "Mega Library", icon: <Library size={18} /> },
  { id: "assignments", label: "Assignments", icon: <ClipboardList size={18} /> },
  { id: "bookmarks", label: "Bookmarks", icon: <Bookmark size={18} /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone size={18} /> },
  { id: "attendance", label: "Attendance", icon: <CalendarDays size={18} /> },
  { id: "results", label: "Results", icon: <Trophy size={18} /> },
];

const crNavItems = [
  { id: "my-uploads", label: "My Uploads", icon: <FileText size={18} /> },
];

const getLibIcon = (type) => {
  switch (type) {
    case "book":
      return <IconBook />;
    case "star":
      return <IconStar />;
    case "cheatsheet":
      return <IconCheatsheet />;
    case "syllabus":
      return <IconSyllabus />;
    case "notes":
      return <IconNotes />;
    case "pyqs":
      return <IconPYQs />;
    default:
      return <IconBook />;
  }
};

const getDynamicIcon = (item) => {
  // 1. Check explicit mock library icon types first
  if (item.iconType === 'book') return <IconBook />;
  if (item.iconType === 'star') return <IconStar />;
  if (item.iconType === 'cheatsheet') return <IconCheatsheet />;
  if (item.iconType === 'syllabus') return <IconSyllabus />;
  if (item.iconType === 'notes') return <IconNotes />;
  if (item.iconType === 'pyqs') return <IconPYQs />;

  // 2. Check dynamic DB types
  const t = String(item.type || item.category || '').toLowerCase();
  const u = String(item.file_url || item.link || '').toLowerCase();

  // Lectures / Videos / Links
  if (t.includes('lecture') || t.includes('video') || t.includes('link') || u.includes('youtube') || u.includes('drive.google')) {
    return <IconLink />;
  }
  
  // Notes
  if (t.includes('note')) return <IconNotes />;
  
  // Assignments / Tutorials
  if (t.includes('tutorial') || t.includes('assignment') || t.includes('cheat')) return <IconCheatsheet />;
  
  // Books / Reference
  if (t.includes('book') || t.includes('reference')) return <IconBook />;
  
  // PYQs & Exams
  if (t.includes('pyq') || t.includes('exam')) return <IconPYQs />;
  
  // Syllabus
  if (t.includes('syllabus')) return <IconSyllabus />;
  
  // File types
  if (u.includes('.pdf') || item.file_type === 'pdf') return <IconPDF />;

  // Ultimate Fallback
  return <IconPDF />;
};

const THEORY_PRACTICAL_FILTERS = ["All", "Theory", "Practical"];

const formatTime12h = (timeString) => {
  if (!timeString) return '';
  const [hourStr, minuteStr] = timeString.split(':');
  let hour = parseInt(hourStr, 10);
  
  if (hour >= 1 && hour <= 6) {
    hour += 12;
  }
  
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minuteStr} ${ampm}`;
};

// HOD-authored rows use `slot_type`; the client-side break rows use `type`.
const slotTypeOf = (slot) =>
  String(slot?.slot_type || slot?.type || 'theory').toLowerCase();

const isBreakSlot = (slot) => {
  const type = slotTypeOf(slot);
  return type === 'break' || type === 'non-academic' || Boolean(slot?.break_kind);
};

// "09:10:00" / "09:10" -> 550. Returns null for anything unparseable so callers
// can treat a missing time as "untimed" instead of sorting it to the top.
const toMinutes = (timeString) => {
  const match = String(timeString ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

// Strict chronological order. Sorts on numeric minutes (not a lexicographic
// string compare) and falls back to the original index, so rows sharing a start
// time or carrying no time at all keep a stable, predictable position.
const sortChronologically = (slots) =>
  slots
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => {
      const left = toMinutes(a.slot.start_time);
      const right = toMinutes(b.slot.start_time);
      if (left === null && right === null) return a.index - b.index;
      if (left === null) return 1;
      if (right === null) return -1;
      return left - right || a.index - b.index;
    })
    .map((entry) => entry.slot);

// "Lab" / "Workshop" blocks run across two consecutive 55-minute periods in the
// HOD master grid.
const LAB_LIKE_PATTERN = /\b(lab|workshop)\b/i;

const isLabLikeSlot = (slot) =>
  LAB_LIKE_PATTERN.test(
    String(slot?.subjects?.name || slot?.subject_name || slot?.name || '')
  );

// Identity used to decide whether two back-to-back rows are really one class.
// Subject id alone is not reliable: split halves of a lab can arrive with
// differing ids, and one half may carry a subject code the other lacks. So
// match on name first, then code, and fall back to faculty for whatever the
// name/code comparison cannot decide. Returning false outright whenever only
// one side could be identified is what stranded the 10:05 half of a lab
// beside its own 09:10 half.
const isSameClassAs = (left, right) => {
  const nameOf = (slot) =>
    String(slot?.subjects?.name || slot?.subject_name || '').trim().toLowerCase();
  const codeOf = (slot) =>
    String(slot?.subjects?.code || slot?.code || '').trim().toLowerCase();
  const facultyOf = (slot) =>
    String(slot?.user_profiles?.full_name || slot?.faculty?.full_name || '').trim().toLowerCase();
  const typeOf = (slot) => String(slot?.slot_type ?? slot?.type ?? '').trim().toLowerCase();

  // A lab half must never be swallowed by an adjacent lecture, and vice versa.
  const leftType = typeOf(left);
  const rightType = typeOf(right);
  if (leftType && rightType && leftType !== rightType) return false;

  const leftName = nameOf(left);
  const rightName = nameOf(right);
  if (leftName && rightName) return leftName === rightName;

  const leftCode = codeOf(left);
  const rightCode = codeOf(right);
  if (leftCode && rightCode) return leftCode === rightCode;

  // At most one side carries a code, so the comparison above cannot decide.
  // Faculty is the last signal available before giving up on the join.
  const leftFaculty = facultyOf(left);
  const rightFaculty = facultyOf(right);
  return Boolean(leftFaculty) && leftFaculty === rightFaculty;
};

// The HOD master stores a 2-hour lab as consecutive 55-minute rows. Rendering
// one card per row truncates the lab, so back-to-back rows of the same class
// collapse into a single block spanning the full duration.
//
// This runs on the batch-filtered list, where only this student's rows remain,
// so adjacency is safe here and no batch comparison is needed — requiring
// identical batch tags was what made split labs fail to join.
const groupConsecutiveClasses = (slots) =>
  sortChronologically(slots).reduce((grouped, slot) => {
    const previous = grouped[grouped.length - 1];
    const previousEnd = previous ? toMinutes(previous.end_time) : null;

    const isContinuation =
      previous &&
      !isBreakSlot(previous) &&
      !isBreakSlot(slot) &&
      isSameClassAs(previous, slot) &&
      previousEnd !== null &&
      previousEnd === toMinutes(slot.start_time);

    if (isContinuation) {
      grouped[grouped.length - 1] = { ...previous, end_time: slot.end_time };
      return grouped;
    }

    grouped.push(slot);
    return grouped;
  }, []);

// The HOD grid's own break windows, so the student view lines up with the master
// schedule instead of guessing at break times.
const STATIC_BREAKS = [
  {
    id: 'short-break-static',
    type: 'break',
    break_kind: 'coffee',
    start_time: '11:00:00',
    end_time: '11:15:00',
    subject_name: 'Short Break',
    faculty_name: 'Relax & Recharge',
    room_no: 'Campus',
  },
  {
    id: 'lunch-break-static',
    type: 'break',
    break_kind: 'food',
    start_time: '13:05:00',
    end_time: '13:45:00',
    subject_name: 'Lunch Break',
    faculty_name: 'Enjoy your meal!',
    room_no: 'Cafeteria',
  },
];

const overlapsWindow = (slot, start, end) => {
  const slotStart = toMinutes(slot.start_time);
  const slotEnd = toMinutes(slot.end_time);
  if (slotStart === null || slotEnd === null) return false;
  return slotStart < end && start < slotEnd;
};

const injectStaticBreaks = (slots) => {
  const result = [...slots];

  STATIC_BREAKS.forEach((breakSlot) => {
    const start = toMinutes(breakSlot.start_time);
    const end = toMinutes(breakSlot.end_time);
    const alreadyCovered = result.some((slot) => overlapsWindow(slot, start, end));
    if (!alreadyCovered) result.push(breakSlot);
  });

  return result;
};

// Re-draws only the cropped square of the source image onto a fresh canvas and
// hands back a PNG blob. The raw picker file is never uploaded, so the stored
// avatar is already circular-cropped and needs no client-side re-processing on
// the way back out.
const getCroppedImg = (imageSrc, pixelCrop) =>
  new Promise((resolve, reject) => {
    if (!imageSrc || !pixelCrop) {
      reject(new Error("Nothing to crop"));
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas is unavailable in this browser"));
        return;
      }

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not process the cropped image"));
          return;
        }
        resolve(blob);
      }, "image/png");
    };

    image.onerror = () => reject(new Error("Could not read the selected image"));
  });

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
   const [profile, setProfile] = useState(null);
   const [studentProfile, setStudentProfile] = useState(null);
   const [announcements, setAnnouncements] = useState([]);
   const [allMaterials, setAllMaterials] = useState([]);
   const [semester, setSemester] = useState(null);
 const [gridSubjects, setGridSubjects] = useState([]);
   // Distinguishes "still fetching" from "genuinely no subjects", which is what
   // caused the tab to flash its empty state on every visit.
   const [subjectsLoading, setSubjectsLoading] = useState(true);
   // Set only when the query itself failed, so the UI can say "we could not
   // load this" instead of implying the student genuinely has no subjects.
   const [subjectsError, setSubjectsError] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [activeFilter, setActiveFilter] = useState("All");
    const [bookmarkedIds, setBookmarkedIds] = useState([]);
    const bookmarkedIdsRef = useRef([]);
    const [bookmarkFilter, setBookmarkFilter] = useState("All");
    const [isLoading, setIsLoading] = useState(true);
    const [librarySearch, setLibrarySearch] = useState("");
    const [libraryFilter, setLibraryFilter] = useState("All");
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [liveSemester, setLiveSemester] = useState(null);
    const [availableSemesters, setAvailableSemesters] = useState([]);
    const [subjectMaterials, setSubjectMaterials] = useState([]);
    const [dynamicCategories, setDynamicCategories] = useState(["All"]);
    const [crDetails, setCrDetails] = useState(null);
    const [crSubjects, setCrSubjects] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, percentage: 0 });
    const [attendanceRecords, setAttendanceRecords] = useState([]);
     const [rawTimetableSlots, setRawTimetableSlots] = useState([]);
     const [globalAcademicTotal, setGlobalAcademicTotal] = useState(null);
     const liveCardRef = useRef(null);
     const isProfileLoaded = !!studentProfile;

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      let currentDay = days[new Date().getDay()];
      if (currentDay === 'Sunday') currentDay = 'Tuesday';

      const profileSource = studentProfile || profile;

      const resolvedBranch =
        profileSource?.selected_branch ||
        profileSource?.branch ||
        profileSource?.branch_id ||
        profileSource?.department ||
        profileSource?.batches?.department ||
        profileSource?.batches?.branch ||
        null;

      const resolvedSemester =
        profileSource?.batches?.semester ||
        profileSource?.semester ||
        profileSource?.selected_semester ||
        null;

      const resolvedBatch =
        profileSource?.batch ||
        profileSource?.batches?.batch ||
        'B1';

      const resolvedSection =
        profileSource?.section ||
        profileSource?.selected_section ||
        profileSource?.batches?.section ||
        'A';

      const finalBranch = resolvedBranch || 'IT';
      const finalSemester = resolvedSemester || 4;

      // The HOD timetable stores every batch's rows side by side, so the query above
     // (branch + semester + day only) returns other batches' labs too. `batch` is the
     // discriminator the editor writes: "all" for a lecture the whole semester
     // attends, or a specific batch ("B1") for a lab/tutorial. Prefer an explicit
     // batch label on the profile, then fall back to B1.
     const todayClasses = useMemo(() => {
     if (!rawTimetableSlots || rawTimetableSlots.length === 0) return [];

     const studentBatch = String(
       [resolvedBatch, resolvedSection].find((value) =>
         /b\s*-?\s*\d+/i.test(String(value ?? ''))
       ) ||
         resolvedSection ||
         'B1'
     )
       .trim()
       .toLowerCase();

    const COMMON_BATCH_TAGS = new Set(['', 'all', 'common', 'everyone', 'global']);

    const isCommonSlot = (slot) =>
      COMMON_BATCH_TAGS.has(String(slot?.batch ?? '').trim().toLowerCase());

    const isTargetedAtStudent = (slot) => {
      const tags = String(slot?.batch ?? '').match(/\bb\s*-?\s*\d+\b/gi) || [];
      return tags.some((tag) => tag.replace(/[\s-]/g, '').toLowerCase() === studentBatch);
    };

    const batchVisibleClasses = rawTimetableSlots.filter(
      (slot) => isCommonSlot(slot) || isTargetedAtStudent(slot)
    );

    const labRowsIn = rawTimetableSlots.filter(isLabLikeSlot);
    if (labRowsIn.length > 0) {
      const describe = (slot) => ({
        name: slot.subjects?.name || slot.subject_name,
        batch: slot.batch,
        start: slot.start_time,
        end: slot.end_time,
        subject_id: slot.subject_id,
      });
      const kept = labRowsIn.filter((slot) => batchVisibleClasses.includes(slot));
      if (kept.length !== labRowsIn.length) {
      }
    }

    return restoreSpanDurations(groupConsecutiveClasses(batchVisibleClasses));
  }, [rawTimetableSlots, resolvedBatch, resolvedSection, currentDay]);

    const subjectWiseStats = attendanceRecords.reduce((acc, record) => {
      const subjectName = record.attendance_sessions?.subjects?.name || 'Unknown';
      if (!acc[subjectName]) {
        acc[subjectName] = { total: 0, present: 0 };
      }
      acc[subjectName].total += 1;
      if (String(record.status).toUpperCase() === 'P') {
        acc[subjectName].present += 1;
      }
      return acc;
    }, {});

    const subjectWiseData = Object.entries(subjectWiseStats).map(([name, stats]) => ({
      name,
      total: stats.total,
      present: stats.present,
      percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
    }));

    const recentRecords = [...attendanceRecords]
      .sort((a, b) => new Date(b.marked_at || 0) - new Date(a.marked_at || 0))
      .slice(0, 5);

    // Build the full subject list (every enrolled subject) merged with
    // attendance stats. This ensures a pill is rendered for ALL subjects,
    // even those the student hasn't been marked for yet (0% / no history).
    const attendanceSubjects = (
      gridSubjects.length > 0 ? gridSubjects : subjectWiseData
    ).map((sub) => {
      const subName = sub.subject_name || sub.name || sub.title || "";
      const subCode = sub.subject_code || sub.code || "";
      const subType =
        sub.type ||
        (String(subName).toLowerCase().includes("lab") ? "Lab" : "Theory");
      const match = subjectWiseData.find(
        (sw) =>
          (subName && sw.name && sw.name.toLowerCase() === subName.toLowerCase()) ||
          (subCode && sw.name && sw.name.includes(subCode))
      );
      return {
        name: subName,
        code: subCode,
        type: subType,
        present: match?.present ?? 0,
        total: match?.total ?? 0,
        percentage: match?.percentage ?? 0,
      };
    });

   useEffect(() => {
     bookmarkedIdsRef.current = bookmarkedIds;
   }, [bookmarkedIds]);

   useEffect(() => {
     if (!gridSubjects || gridSubjects.length === 0) {
       setGlobalAcademicTotal(null);
       return;
     }
     let cancelled = false;
     async function computeGlobalAcademicTotal() {
       const subjectIds = gridSubjects.map(s => s.id);
       const { data: sessionsData } = await supabase
         .from('attendance_sessions')
         .select('id')
         .in('subject_id', subjectIds);
       if (!cancelled) {
         const uniqueSessionIds = new Set((sessionsData || []).map(s => s.id));
         setGlobalAcademicTotal(uniqueSessionIds.size);
       }
     }
     computeGlobalAcademicTotal();
     return () => { cancelled = true; };
   }, [gridSubjects]);

const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
      title: "",
      description: "",
      subject_id: "",
      type: "Notes",
      uploadMethod: "file",
      file: null,
      url: "",
      duration: "",
    });
const [myUploads, setMyUploads] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadModalSubject, setUploadModalSubject] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);

     const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
     const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [activeProfileTab, setActiveProfileTab] = useState("general");
    const [editPhone, setEditPhone] = useState("");
    const [editAvatarFile, setEditAvatarFile] = useState(null);
    const [editAvatarPreview, setEditAvatarPreview] = useState("");
    const [editNewPassword, setEditNewPassword] = useState("");
    const [editConfirmPassword, setEditConfirmPassword] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    // Avatar cropping: the picked file is only a source image until the student
    // confirms the crop, so nothing is uploaded from the file input directly.
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [cropSaving, setCropSaving] = useState(false);
    const editAvatarPreviewRef = useRef("");
    const imageToCropRef = useRef("");
    const isDirector = profile?.role === 'director';

    const showToast = (message, type = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3500);
    };

    // Drops the cropper back to the plain form and releases the source object
    // URL, so a cancelled or closed picker never leaks a blob URL.
    const cancelCrop = () => {
      if (imageToCropRef.current) {
        URL.revokeObjectURL(imageToCropRef.current);
        imageToCropRef.current = "";
      }
      setImageToCrop(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    };

    const openProfileModal = () => {
      setEditPhone(studentProfile?.phone || profile?.phone || "");
      setEditAvatarFile(null);
      if (editAvatarPreviewRef.current) {
        URL.revokeObjectURL(editAvatarPreviewRef.current);
        editAvatarPreviewRef.current = "";
      }
      setEditAvatarPreview("");
      setEditNewPassword("");
      setEditConfirmPassword("");
      cancelCrop();
      setActiveProfileTab("general");
      setIsProfileMenuOpen(false);
      setIsProfileModalOpen(true);
    };

    const closeProfileModal = () => {
      if (editAvatarPreviewRef.current) {
        URL.revokeObjectURL(editAvatarPreviewRef.current);
        editAvatarPreviewRef.current = "";
      }
      setEditAvatarPreview("");
      setEditNewPassword("");
      setEditConfirmPassword("");
      cancelCrop();
      setIsProfileModalOpen(false);
    };

    // Explicit user-driven retry. A failed query is never cached, so clearing
    // the entry and re-running is enough to get a genuinely fresh attempt.
    const retrySubjectsLoad = () => {
      const profileSource = studentProfile || profile;
      const branch =
        profileSource?.selected_branch ||
        profileSource?.branch ||
        profileSource?.branch_id ||
        profileSource?.department ||
        profileSource?.batches?.department ||
        profileSource?.batches?.branch ||
        null;
      if (branch && selectedSemester !== null) {
        invalidateSubjectCache(`grid:${branch}:Semester ${selectedSemester}`);
      }
      fetchSubjectsForGrid();
    };

    // Uploads the pending avatar (already a cropped blob when it came from the
    // cropper) and writes the profile row, then applies the result to the
    // profile state so the header repaints with the new picture immediately.
    //
    // `avatarFile` is a parameter rather than read from state on purpose: the
    // cropper creates that file in the same tick it calls this, so the state
    // captured by this callback's closure is still the previous (usually null)
    // value and the upload would silently be skipped.
    const persistProfileChanges = useCallback(async (avatarFile) => {
      if (!user) throw new Error("No user found");
      const fileToUpload = avatarFile ?? editAvatarFile;
      let avatarUrl = studentProfile?.avatar_url || profile?.avatar_url;

      if (fileToUpload) {
        const extension = "png";
        const filePath = `${user.id}/${Date.now()}-avatar.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, fileToUpload, { upsert: true, contentType: "image/png" });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        avatarUrl = publicUrlData.publicUrl;
      }

      const previousAvatarUrl = studentProfile?.avatar_url || profile?.avatar_url || null;
      const updates = {
        phone: editPhone,
        ...(avatarUrl && avatarUrl !== previousAvatarUrl ? { avatar_url: avatarUrl } : {}),
      };

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Both the header and the overview/profile card read from these, so the
      // new avatar has to land in state, not just in the database.
      setStudentProfile((prev) => ({ ...(prev || {}), ...updates, avatar_url: avatarUrl ?? prev?.avatar_url }));
      setProfile((prev) => ({ ...(prev || {}), ...updates, avatar_url: avatarUrl ?? prev?.avatar_url }));
      return { ...updates, avatar_url: avatarUrl };
    }, [user, studentProfile, profile, editAvatarFile, editPhone]);

    // Selecting a picture only opens the cropper — the file itself is never
    // uploaded until the student confirms the crop.
    const handleAvatarSelect = (event) => {
      const file = event.target.files?.[0];
      // Allow re-picking the same file after a cancel.
      event.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file.", "error");
        return;
      }
      cancelCrop();
      const url = URL.createObjectURL(file);
      imageToCropRef.current = url;
      setImageToCrop(url);
    };

    const handleCropSave = async () => {
      if (!imageToCrop || !croppedAreaPixels) return;
      setCropSaving(true);
      try {
        const blob = await getCroppedImg(imageToCrop, croppedAreaPixels);
        const croppedFile = new File([blob], "avatar.png", { type: "image/png" });

        if (editAvatarPreviewRef.current) URL.revokeObjectURL(editAvatarPreviewRef.current);
        const previewUrl = URL.createObjectURL(croppedFile);
        editAvatarPreviewRef.current = previewUrl;

        setEditAvatarFile(croppedFile);
        setEditAvatarPreview(previewUrl);
        cancelCrop();

        setProfileSaving(true);
        // The cropped file is passed in explicitly: state set in this tick is
        // not visible to the callback's closure yet.
        const result = await persistProfileChanges(croppedFile);

        if (!result?.avatar_url) {
          throw new Error("The picture was saved but no avatar URL was returned.");
        }

        showToast("Profile picture updated successfully!");
        closeProfileModal();
        setEditAvatarFile(null);
        setEditAvatarPreview("");
      } catch (err) {
        console.error("Avatar crop save error:", err);
        showToast(err.message || "Failed to update profile picture", "error");
      } finally {
        setCropSaving(false);
        setProfileSaving(false);
      }
    };

    useEffect(() => {
      if (!user || !user.id) {
        setIsLoading(false);
        return;
      }
      let cancelled = false;

      async function loadStudentData() {
        setIsLoading(true);
        try {
           const { data: crData, error: crError } = await supabase
             .from("class_representatives")
             .select("branch, year, semester")
             .eq("student_id", user.id)
             .maybeSingle();

           if (crError) {
             console.error("Failed to fetch CR details:", crError);
           } else if (!cancelled) {
             setCrDetails(crData);
           }

             const { data: profileData, error: profileError } = await supabase
               .from("user_profiles")
               .select("*, batches(*)")
               .eq("id", user.id)
               .single();

             if (profileError) {
               if (profileError.code === 'PGRST116') {
                 if (!cancelled) {
                   setStudentProfile({});
                 }
                 return;
               }
                console.error("Profile fetch failed. Token likely stale. Hard resetting...");
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
                return;
             }
             if (!cancelled && profileData) {
               setProfile(profileData);
               setStudentProfile(profileData);
             }

            const { data: bookmarkData, error: bookmarkError } = await supabase
              .from("bookmarks")
              .select("resource_id")
              .eq("user_id", user.id);
            if (bookmarkError) console.error("Failed to fetch bookmarks:", bookmarkError);
            if (!cancelled) {
              setBookmarkedIds((bookmarkData || []).map((b) => b.resource_id));
            }

           const { data: announcementData } = await supabase
             .from("announcements")
             .select("*")
             .order("created_at", { ascending: false })
             .limit(5);

           if (!cancelled) setAnnouncements(announcementData || []);

            // Strict fetch: attendance_sessions!inner REQUIRES the parent session
            // to still exist. If the faculty portal deleted a session (and its
            // records), those rows are dropped here, so orphaned attendance for
            // deleted dates (e.g. July 4th / July 8th) never reaches the UI.
            // No stale/cached data is used — every load re-queries Supabase fresh.
            const { data: attendanceData, error: attendanceError } = await supabase
              .from('attendance_records')
              .select(`
                *,
                attendance_sessions!inner (
                  *,
                  subjects ( name, code )
                )
              `)
              .eq('student_id', user.id)
              .order('marked_at', { ascending: false });
            if (attendanceError) console.error("Failed to fetch attendance:", attendanceError);
            if (!cancelled && attendanceData) {
             const total = attendanceData.length;
              const present = attendanceData.filter((r) => String(r.status).toUpperCase() === 'P').length;
             const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
             setAttendanceStats({ total, present, percentage });
             setAttendanceRecords(attendanceData);
           }

           const studentSemester = profileData?.batches?.semester;
           if (!cancelled) setSemester(studentSemester ?? null);

           const studentBranch =
             profileData?.selected_branch ||
             profileData?.branch ||
             profileData?.branch_id ||
             profileData?.department ||
             profileData?.batches?.department ||
             profileData?.batches?.branch ||
             null;
           const studentYear =
             profileData?.selected_year ||
             profileData?.year ||
             profileData?.batches?.year ||
             profileData?.batches?.academic_year ||
             null;

           const { data: deptData } = await supabase
             .from("departments")
             .select("is_sem1_live, is_sem2_live, is_sem3_live, is_sem4_live, is_sem5_live, is_sem6_live, is_sem7_live, is_sem8_live")
             .eq("code", studentBranch)
             .eq("description", studentYear)
             .maybeSingle();

           const yearSemesterMap = {
             '1st Year': [1, 2],
             '2nd Year': [3, 4],
             '3rd Year': [5, 6],
             '4th Year': [7, 8],
           };

           let liveSem = null;
           if (deptData) {
             for (let i = 1; i <= 8; i++) {
               if (deptData[`is_sem${i}_live`]) {
                 liveSem = i;
                 break;
               }
             }
           }

           if (!cancelled) setLiveSemester(liveSem);

           let defaultSemester = null;
           if (liveSem !== null) {
             defaultSemester = liveSem;
           } else if (studentYear && yearSemesterMap[studentYear]) {
             defaultSemester = yearSemesterMap[studentYear][yearSemesterMap[studentYear].length - 1];
           }

if (!cancelled && defaultSemester !== null) {
              setSelectedSemester(defaultSemester);
            }

            const visibleSemesters = studentYear === '2nd Year'
              ? [3, 4]
              : (yearSemesterMap[studentYear] || []);

            if (!cancelled) {
              setAvailableSemesters(visibleSemesters);
            }
          } catch (err) {
            console.error("Failed to load student dashboard data:", err);
          } finally {
            if (!cancelled) setIsLoading(false);
          }
        }

        loadStudentData();
        return () => {
          cancelled = true;
        };
    }, [user]);

  // Subjects are read by the Overview widget and the "My Subjects" tab, and
  // re-read on every branch/semester change. The shared cache collapses a
  // remount onto the same in-flight request, so switching tabs renders the
  // already-loaded list instead of flashing an empty state and refetching.
  //
  // The department filter uses the same fallback chain as the rest of this
  // file. Filtering on `selected_branch` alone sent `department=eq.undefined`
  // for students whose profile only carries `branch`, which PostgREST rejects
  // and which previously surfaced as a permanently empty list.
  async function fetchSubjectsForGrid() {
    const profileSource = studentProfile || profile;
    const branch =
      profileSource?.selected_branch ||
      profileSource?.branch ||
      profileSource?.branch_id ||
      profileSource?.department ||
      profileSource?.batches?.department ||
      profileSource?.batches?.branch ||
      null;
    const semester = selectedSemester;

    if (!branch || semester === null) {
      setGridSubjects([]);
      setSubjectsError(null);
      setSubjectsLoading(false);
      return;
    }

    const cacheKey = `grid:${branch}:Semester ${semester}`;
    setSubjectsLoading(true);
    setSubjectsError(null);
    try {
      const data = await fetchCached(cacheKey, async () => {
        console.log("[fetcher] executing Supabase query...", { branch, semester, cacheKey });
        const { data: rows, error } = await supabase
          .from('subjects')
          .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
          .eq('department', branch)
          .eq('semester', `Semester ${semester}`);

        console.log("[fetcher] query returned:", { rows: rows?.length ?? 0, error: error?.message ?? null });
        if (error) throw new Error(error.message || 'Failed to fetch subjects');
        if (!rows) return [];
        return rows;
      });

      setGridSubjects(data);
    } catch (err) {
      // Log the exact parameters: an RLS denial and a bad filter look identical
      // in the UI (an empty list) but very different here.
      console.error("[subjects] load failed", { cacheKey, branch, semester, err });
      setGridSubjects([]);
      setSubjectsError(err.message || "Could not load your subjects.");
    } finally {
      // Unconditional: the skeleton must never outlive the request.
      setSubjectsLoading(false);
    }
  }

    useEffect(() => {
      if (!user?.id) return;
      let cancelled = false;
      async function loadUserProfile() {
        const { data } = await supabase.auth.getUser();
        const authUser = data?.user;
        if (!cancelled && authUser) {
          const { data: prof, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          if (error) {
            if (error.code === 'PGRST116') {
              if (!cancelled) {
                setStudentProfile({});
              }
              return;
            }
            console.error("Profile fetch failed. Token likely stale. Hard resetting...");
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
            return;
          }
          if (!cancelled && prof) {
            setStudentProfile((prev) => ({ ...prev, ...prof }));
          }
        }
      }
      loadUserProfile();
      return () => { cancelled = true; };
    }, [user]);

    useEffect(() => {
      const checkAuth = setTimeout(() => {
        if (!user) {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/';
        }
      }, 1000);

      return () => clearTimeout(checkAuth);
    }, [user]);

    useEffect(() => {
      const timer = setTimeout(() => {
        if (!studentProfile) {
          console.warn("Snappy timeout triggered. Redirecting to home...");
          localStorage.clear();
          sessionStorage.clear();
          window.location.replace('/');
        }
      }, 2500);

      return () => clearTimeout(timer);
    }, [studentProfile]);

  useEffect(() => {
      if (activeTab !== "my-uploads") {
        setSelectedSubject(null);
      }
      setShowUploadModal(false);
      setActiveFilter("All");
      setLibrarySearch("");
      setLibraryFilter("All");
      setBookmarkFilter("All");
    }, [activeTab]);

  useEffect(() => {
    if (!isProfileLoaded) {
        return;
    }
    let cancelled = false;

    const fetchTodayClasses = async () => {
        try {

            const normalizedSemester = Number(String(finalSemester).replace(/\D/g, ''));

            const { data: rawSlots, error } = await supabase
                .from('timetable_slots')
                .select('*')
                .eq('branch', finalBranch)
                .eq('semester', normalizedSemester)
                .eq('day_of_week', currentDay);

            if (error) throw error;
            if (!rawSlots || rawSlots.length === 0) {
                setRawTimetableSlots([]);
                return;
            }

            const subjectIds = [...new Set(rawSlots.map((s) => s.subject_id).filter(Boolean))];
            const facultyIds = [...new Set(rawSlots.map((s) => s.faculty_id).filter(Boolean))];

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

            const data = rawSlots.map((slot) => ({
                ...slot,
                subjects: subjectMap.get(slot.subject_id) || null,
                user_profiles: facultyMap.get(slot.faculty_id) || null,
            }));

            const normalized = sortChronologically(injectStaticBreaks(data));

            console.log("FINAL RENDER SLOTS:", normalized);

             setRawTimetableSlots(normalized);
        } catch (err) {
            console.error("Fetch Error:", err);
             setRawTimetableSlots([]);
        }
    };

    fetchTodayClasses();
    return () => { cancelled = true; };
  }, [finalBranch, finalSemester, resolvedSection, resolvedBatch, currentDay, isProfileLoaded]);

   useEffect(() => {
       if (liveCardRef && liveCardRef.current) {
           setTimeout(() => {
               if (liveCardRef && liveCardRef.current) {
                   liveCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
               }
           }, 300);
       }
   }, [todayClasses]);

   useEffect(() => {
    if (activeTab !== "my-uploads") return;
    let cancelled = false;
    async function fetchMyUploads() {
      let materials = [];
      if (user?.id) {
        const { data } = await supabase
          .from("study_materials")
          .select("*")
          .eq("uploaded_by", user.id)
          .order("created_at", { ascending: false });
        materials = data || [];
      }
      const { data: subjectsData } = await supabase.from("subjects").select("*");
      const merged = (materials || []).map((m) => ({
        ...m,
        subjects: (subjectsData || []).find((s) => s.id === m.subject_id) || {
          name: "Unknown Subject",
          code: "N/A",
        },
      }));
      if (!cancelled) setMyUploads(merged);
    }
    fetchMyUploads();
    return () => { cancelled = true; };
  }, [activeTab, user?.id]);

  useEffect(() => {
       if (!isProfileLoaded) {
           return;
       }
        fetchSubjectsForGrid();
    }, [selectedSemester, isProfileLoaded]);

    // Watchdog. The skeleton is only cleared by a settled request, so if the
    // bootstrap finished but the profile never arrived (profile query failed,
    // RLS denial, signed-out session) there is no request to settle and the
    // spinner would run forever. Release it here instead.
    useEffect(() => {
      if (isLoading) return;
      if (studentProfile || profile) return;
      console.warn("[subjects] no profile available; releasing the loading state");
      setSubjectsLoading(false);
      setSubjectsError("We could not load your profile, so your subjects are unavailable.");
    }, [isLoading, studentProfile, profile]);

    useEffect(() => {
      if (crDetails && crDetails.branch && crDetails.semester) {
        async function fetchCRSubjects() {
          const { data: subjects } = await supabase
            .from('subjects')
            .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
            .eq('department', crDetails.branch)
            .eq('semester', `Semester ${crDetails.semester}`);
          setCrSubjects(subjects || []);
        }
        fetchCRSubjects();
      }
    }, [crDetails]);

    useEffect(() => {
      let cancelled = false;

      async function refreshOnTabChange() {
        if (activeTab === "library" || activeTab === "bookmarks") {
          const data = await fetchAllMaterials();
          if (!cancelled) setAllMaterials(data);
        }
      }

    refreshOnTabChange();
    return () => {
      cancelled = true;
    };
}, [activeTab]);

  const toggleBookmark = async (resourceId) => {
    if (!user) return;
    const isCurrentlyBookmarked = bookmarkedIdsRef.current.includes(resourceId);
    try {
      if (isCurrentlyBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("resource_id", resourceId);
        if (error) throw error;
        setBookmarkedIds((prev) => prev.filter((id) => id !== resourceId));
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert([{ user_id: user.id, resource_id: resourceId }]);
        if (error) throw error;
        setBookmarkedIds((prev) => [...prev, resourceId]);
      }
    } catch (error) {
      console.error("Bookmark operation failed:", error);
      alert("Failed to update bookmark. Please try again.");
    }
  };

async function fetchAllMaterials() {
    const { data: materials, error: materialsError } = await supabase
      .from("study_materials")
      .select("*")
      .order("id", { ascending: true });

    if (materialsError) {
      console.error("Failed to fetch materials:", materialsError);
      return [];
    }

    const { data: subjectsData } = await supabase.from("subjects").select("*");

    const mergedMaterials = (materials || []).map((m) => ({
      ...m,
      subjects: (subjectsData || []).find((s) => s.id === m.subject_id) || {
        name: "Unknown Subject",
        code: "N/A",
      },
    }));

    return mergedMaterials;
  }

  useEffect(() => {
    if (!selectedSubject) return;
    let cancelled = false;
    async function fetchSubjectData() {
      const { data } = await supabase
        .from('study_materials')
        .select('*')
        .eq('subject_id', selectedSubject.id);
      if (!cancelled) setSubjectMaterials(data || []);

      const { data: catData } = await supabase
        .from('material_categories')
        .select('name')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      if (!cancelled && catData) {
        setDynamicCategories(['All', ...catData.map(c => c.name)]);
      }
    }
    fetchSubjectData();
    return () => { cancelled = true; };
  }, [selectedSubject]);

  useEffect(() => {
    if (activeTab !== "library" && activeTab !== "bookmarks") return;
    let cancelled = false;
    async function fetchCategories() {
      const { data: catData } = await supabase
        .from('material_categories')
        .select('name')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      if (!cancelled && catData) {
        setDynamicCategories(['All', ...catData.map(c => c.name)]);
      }
    }
    fetchCategories();
    return () => { cancelled = true; };
}, [activeTab]);

  const handleView = (material) => {
    // Universal check: Look for the link in every possible database field
    const link = material.file_url || material.link || material.external_url || material.url;
    
    if (link) {
      // If it looks like a valid URL, open it
      if (link.startsWith('http')) {
        window.open(link, '_blank');
      } else {
        alert("Invalid link format: " + link);
      }
    } else {
      alert("No file or link found in the database for this item.");
    }
  };

  const getFilteredMaterials = () => {
    if (!selectedSubject) return [];
    if (activeFilter === "All") return subjectMaterials;
    return subjectMaterials.filter((m) => {
      const type = (m.type || m.category || "").toLowerCase();
      return (
        type === activeFilter.toLowerCase() ||
        type.includes(activeFilter.toLowerCase())
      );
    });
  };

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.warn("Backend signout failed, forcing local cleanup:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  }

  // --- UPLOAD LOGIC ---
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadForm.uploadMethod === "file" && !uploadForm.file) {
      return alert("Please select a file to upload.");
    }
    if (uploadForm.uploadMethod === "link" && !uploadForm.url) {
      return alert("Please provide a URL.");
    }

    setUploadLoading(true);
    try {
      const payload = {
        title: uploadForm.title,
        subject_id: uploadForm.subject_id,
        type: uploadForm.type,
        file_url: uploadForm.uploadMethod === "link" ? uploadForm.url : null,
        uploaded_by: user.id,
        duration: uploadForm.duration || null,
      };

      const fileToUpload =
        uploadForm.uploadMethod === "file" ? uploadForm.file : null;

      await uploadNewResource(payload, fileToUpload);
      closeUploadModal();

      setToast({ message: "Material uploaded successfully!", type: "success" });
      setTimeout(() => setToast(null), 3500);

      if (selectedSubject) {
        const { data } = await supabase
          .from("study_materials")
          .select("*")
          .eq("subject_id", selectedSubject.id);
        if (data) setSubjectMaterials(data);
      }

      if (activeTab === "my-uploads") {
        const { data: myData } = await supabase
          .from("study_materials")
          .select("*")
          .eq("uploaded_by", user.id)
          .order("created_at", { ascending: false });
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("*");
        const merged = (myData || []).map((m) => ({
          ...m,
          subjects: (subjectsData || []).find((s) => s.id === m.subject_id) || {
            name: "Unknown Subject",
            code: "N/A",
          },
        }));
        setMyUploads(merged);
      }
    } catch (error) {
      console.error("Upload Error Details:", error);
      alert(`UPLOAD FAILED ERROR:\n\n${error.message}`);
    } finally {
      setUploadLoading(false);
      setUploadForm({
        title: "",
        description: "",
        subject_id: "",
        type: "Notes",
        uploadMethod: "file",
        file: null,
        url: "",
        duration: "",
      });
    }
  };
  // ------------------------
   const openUploadModal = (subject) => {
     setUploadModalSubject(subject);
     setUploadForm({
       title: "",
       description: "",
       subject_id: subject.id,
       type: "Notes",
       uploadMethod: "file",
       file: null,
       url: "",
       duration: "",
     });
     setShowUploadModal(true);
   };

     const closeUploadModal = () => {
       setShowUploadModal(false);
       setUploadModalSubject(null);
       setUploadForm({
        title: "",
        description: "",
        subject_id: "",
        type: "Notes",
        uploadMethod: "file",
        file: null,
        url: "",
        duration: "",
      });
    };

  const handleDeleteResource = (id) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    setDeleteLoading(true);
    try {
      await deleteResource(id);
      setMyUploads((prev) => prev.filter((m) => m.id !== id));
      setSubjectMaterials((prev) => prev.filter((m) => m.id !== id));
      setToast({ message: "Material deleted successfully.", type: "error" });
      setTimeout(() => setToast(null), 3500);
    } catch (error) {
      console.error("Delete error:", error);
      setToast({ message: "Failed to delete material. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayName =
    studentProfile?.full_name ||
    profile?.full_name ||
    user?.email?.split("@")[0] ||
    "Student";
  const displayRole = profile?.role || "student";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profilePicUrl = studentProfile?.avatar_url || profile?.avatar_url || "";

  // A freshly uploaded object can 404 for a moment before the bucket serves it.
  // Remembering which URL failed (instead of a plain boolean) keeps the failure
  // scoped to that one URL, so the next successful upload renders normally.
  const [failedAvatarUrls, setFailedAvatarUrls] = useState({});
  const avatarFailed = Boolean(profilePicUrl) && failedAvatarUrls[profilePicUrl];
  const markAvatarFailed = (url) =>
    setFailedAvatarUrls((prev) => ({ ...prev, [url]: true }));
  const headerAvatarVisible = Boolean(profilePicUrl) && !avatarFailed;

  const recentAnnouncements = announcements.slice(0, 3);

  // Bottom bento row mirrors the full Subjects page cards for the current
  // semester, so the whole enrolled list is rendered and the widget scrolls.
  const quickSubjects = gridSubjects;

  const attendanceTone =
    attendanceStats.percentage >= 75
      ? "good"
      : attendanceStats.percentage >= 60
      ? "fair"
      : "low";

  // Today's classes arrive sorted by start_time, so a clock lookup is enough to
  // find the class in progress and the next teaching slot after it.
  const timetableClock = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });

  // Breaks and non-academic slots are not teaching time.
  const isTeachingSlot = (slot) => !isBreakSlot(slot);

   const currentClassIndex = todayClasses.findIndex(
    (slot) =>
      isTeachingSlot(slot) &&
      timetableClock >= slot.start_time &&
      timetableClock <= slot.end_time
  );

  const nextClassIndex =
    currentClassIndex === -1
      ? Math.max(
          todayClasses.findIndex(
            (slot) => isTeachingSlot(slot) && slot.start_time > timetableClock
          ),
           todayClasses.findIndex((slot) => slot.start_time > timetableClock)
        )
      : -1;

  const filteredLibraryItems = allMaterials.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(librarySearch.toLowerCase()) ||
      (item.category &&
        item.category.toLowerCase().includes(librarySearch.toLowerCase()));
    const matchesFilter =
      libraryFilter === "All" ||
      item.type === libraryFilter ||
      (item.category && item.category === libraryFilter);
    return matchesSearch && matchesFilter;
  });

  const libraryPills = dynamicCategories.map((cat) => (
    <button
      key={cat}
      className={`student-lib-filter-pill ${libraryFilter === cat ? "student-lib-filter-pill--active" : ""}`}
      onClick={() => setLibraryFilter(cat)}
    >
      {cat}
    </button>
  ));

  const libraryCards = filteredLibraryItems.map((item) => {
    const isLecture = (item.type || '').toLowerCase() === 'lecture';
    if (isLecture) {
      const matchedSubject = gridSubjects?.find(s => s.id === item.subject_id) || {};
      const facultyFullName = item.faculty_name || matchedSubject?.faculty?.full_name || 'Not Assigned';
      const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
      const avatarUrl = item.faculty_avatar || matchedSubject?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=e2e8f0&color=475569`;

      return (
        <div key={item.id} className="pw-lecture-card">
          {/* Top Gradient Section */}
          <div className="pw-card-top">
            <div className="pw-card-top-left">
              <span className="pw-subject-badge">{item.subject_name || matchedSubject?.subject_name || "Lecture"}</span>
              <p className="pw-card-desc" title={item.title}>{item.title || 'Untitled Lecture'}</p>
              <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
            </div>
            <div className="pw-card-top-right">
              <div className="material-avatar-wrapper" onClick={() => handleView && handleView(item)}>
                <div className="pw-avatar-container">
                  <img src={avatarUrl} alt="Faculty" />
                </div>
                <div className="material-avatar-icon">
                  <Play size={12} fill="currentColor" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom White Section */}
          <div className="pw-card-bottom">
            <div className="pw-card-meta">
              <span className="pw-date">
                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="pw-duration">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {item.duration || '00:00'}
              </span>
            </div>
            
            <h3 className={`pw-card-title${item.description ? "" : " pw-card-title--empty"}`}>{item.description || 'No description provided'}</h3>
            
            <div className="pw-card-actions" style={{ position: 'relative' }}>
              <svg onClick={(e) => { e.stopPropagation(); handleView && handleView(item); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path></svg>
              
              <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

              {/* Dropdown Menu & Invisible Click-Outside Overlay */}
              {openMenuId === item.id && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }}
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                  ></div>
                  
                  <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                    <div 
                      className="pw-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        if(typeof toggleBookmark === 'function') toggleBookmark(item.id);
                        setOpenMenuId(null);
                      }}
                    >
                      {bookmarkedIds.includes(item.id) ? (<><Star size={16} fill="currentColor" aria-hidden="true" /> Remove Bookmark</>) : (<><Star size={16} aria-hidden="true" /> Bookmark</>)}
                    </div>
                    <div 
                      className="pw-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('Download feature coming soon in My Downloads!');
                        setOpenMenuId(null);
                      }}
                    >
                      <Download size={16} aria-hidden="true" /> Download
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    const facultyFullName = item.faculty_name || gridSubjects?.find(s => s.id === item.subject_id)?.faculty?.full_name || 'Not Assigned';
    const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
    const avatarUrl = item.faculty_avatar || gridSubjects?.find(s => s.id === item.subject_id)?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=e2e8f0&color=475569`;

    return (
      <div key={item.id} className="pw-lecture-card" onClick={() => handleView(item)}>
        <div className="pw-card-top">
          <div className="pw-card-top-left">
            <span className="pw-subject-badge">{item.type ? item.type.toUpperCase() : "DOCUMENT"}</span>
            <p className="pw-card-desc" title={item.title}>{item.title || 'Untitled Document'}</p>
            <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
          </div>
          <div className="pw-card-top-right">
            <div className="material-avatar-wrapper">
              <div className="pw-avatar-container">
                <img src={avatarUrl} alt="Faculty" />
              </div>
              <div className="material-avatar-icon" style={{ background: 'var(--info-text)' }}>
                <FileText size={12} aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="pw-card-bottom">
          <div className="pw-card-meta">
            <span className="pw-date">
              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="pw-duration" style={{ color: 'var(--info-text)' }}>
              <FileText size={14} aria-hidden="true" /> {item.type === 'Class Notes' ? 'PDF Note' : 'Document'}
            </span>
          </div>
          
          <h3 className={`pw-card-title${item.description ? "" : " pw-card-title--empty"}`}>{item.description || 'No description provided'}</h3>
          
          <div className="pw-card-actions" style={{ position: 'relative' }}>
            <svg onClick={(e) => { e.stopPropagation(); handleView(item); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            
            <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

            {openMenuId === item.id && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                  <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); toggleBookmark(item.id); setOpenMenuId(null); }}>
                    {bookmarkedIds.includes(item.id) ? (<><Star size={16} fill="currentColor" aria-hidden="true" /> Remove Bookmark</>) : (<><Star size={16} aria-hidden="true" /> Bookmark</>)}
                  </div>
                  <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); alert('Download feature coming soon!'); setOpenMenuId(null); }}>
                    <Download size={16} aria-hidden="true" /> Download
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  });

  const libraryEmptyState = (
    <div className="student-lib-empty">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <p>No materials found for your search.</p>
    </div>
  );

  if (!studentProfile) {
      return (
          <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>
              Loading Dashboard...
          </div>
      );
  }

  return (
    <div className="student-dashboard-layout">
      <button
        type="button"
        className="sidebar-toggle-btn"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={isSidebarOpen}
      >
        <Menu size={22} aria-hidden="true" />
      </button>

      <aside className={`student-sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="student-sidebar__header">
          <div className="student-sidebar__logo">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 6 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <h1 className="student-sidebar__brand">UCA</h1>
        </div>

<nav className="student-sidebar__nav">
           {navItems.map(({ id, label, icon }) => (
             <button
               key={id}
               className={`student-sidebar__link ${activeTab === id ? "student-sidebar__link--active" : ""}`}
               onClick={() => setActiveTab(id)}
             >
               <span className="student-sidebar__link-icon">{icon}</span>
               <span className="student-sidebar__link-label">{label}</span>
             </button>
           ))}
           {crDetails && crNavItems.map(({ id, label, icon }) => (
             <button
               key={id}
               className={`student-sidebar__link ${activeTab === id ? "student-sidebar__link--active" : ""}`}
               onClick={() => setActiveTab(id)}
             >
               <span className="student-sidebar__link-icon">{icon}</span>
               <span className="student-sidebar__link-label">{label}</span>
             </button>
           ))}
         </nav>

         <div className="student-sidebar__footer">
           <span>Student Portal · v1.0</span>
         </div>
       </aside>

         <main className={`student-main ${isSidebarOpen ? "student-main--sidebar-open" : "student-main--sidebar-closed"}`}>
          <header className="student-header">
             <div className="student-header__lead">
               <div className="dashboard-header-titles" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', marginLeft: '24px' }}>
                 <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.025em', textAlign: 'center' }}>
                   Student Dashboard
                 </span>
                 <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', textAlign: 'center' }}>
                   Welcome back, {displayName}
                 </h1>
               </div>
             </div>

           <div className="student-header__right">
             <div className="student-header__profile-anchor">
              <button
                type="button"
                className="student-header__user"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isProfileMenuOpen}
              >
                {headerAvatarVisible ? (
                  <img
                    key={profilePicUrl}
                    src={profilePicUrl}
                    className="header-avatar-img"
                    alt="Profile"
                    onError={() => markAvatarFailed(profilePicUrl)}
                  />
                ) : (
                  <div className="student-header__avatar">{initials}</div>
                )}
                <div className="student-header__meta">
                  <span className="student-header__name">
                    {displayName}
                    <ChevronDown size={16} className="student-header__chevron" aria-hidden="true" />
                  </span>
                  <div className="student-header__meta-row">
                    {crDetails && (
                      <span className="student-header__cr-badge">CR Mode</span>
                    )}
                    <span className="student-header__role">{displayRole}</span>
                  </div>
                </div>
              </button>

              {isProfileMenuOpen && (
                <>
                  <div
                    className="profile-dropdown-backdrop"
                    onClick={() => setIsProfileMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="profile-dropdown-menu">
                    {headerAvatarVisible ? (
                      <img
                        key={profilePicUrl}
                        src={profilePicUrl}
                        alt="Avatar"
                        className="student-profile-avatar-img"
                        onError={() => markAvatarFailed(profilePicUrl)}
                      />
                    ) : (
                      <div className="student-profile__icon">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                    <button
                      className="student-profile-card__edit-btn"
                      onClick={() => openProfileModal()}
                    >
                      <Pencil size={14} />
                      <span>Edit Profile</span>
                    </button>
                    <div className="student-profile__body">
                      <div className="student-profile__row">
                        <span className="student-profile__label">Name</span>
                        <span className="student-profile__value">
                          {studentProfile?.full_name || profile?.full_name || "—"}
                        </span>
                      </div>
                      <div className="student-profile__row">
                        <span className="student-profile__label">Roll No</span>
                        <span className="student-profile__value">
                          {studentProfile?.roll_number ||
                            profile?.roll_number ||
                            "—"}
                        </span>
                      </div>
                      <div className="student-profile__row">
                        <span className="student-profile__label">Phone</span>
                        <span className="student-profile__value">
                          {studentProfile?.phone || profile?.phone || "—"}
                        </span>
                      </div>
                      <div className="student-profile__row">
                        <span className="student-profile__label">College ID</span>
                        <span className="student-profile__value">
                          {studentProfile?.college_id ||
                            profile?.college_id ||
                            "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
             </div>
             <button className="student-header__signout" onClick={handleSignOut}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>{" "}
              Sign Out
            </button>
          </div>
        </header>

        <div className="student-content">
          {activeTab === "overview" && (
            <div className="student-grid">
              <div className="overview-top-grid">
              <section className="overview-panel overview-panel--timetable">
                <h3 className="student-section__title"><Calendar size={18} aria-hidden="true" /> Today's Classes <span className="st-header-sub">({todayClasses[0]?.day_of_week || 'Today'})</span></h3>
                 {todayClasses.length === 0 ? (
                  <div className="student-empty-box">
                    <p>No classes today! Enjoy your day off. <PartyPopper size={16} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-3px', color: 'var(--warning-text)' }} /></p>
                  </div>
                ) : (
                  <div className="st-timeline-container">
                     {todayClasses.map((slot, slotIndex) => {
                      const isLive = timetableClock >= slot.start_time && timetableClock <= slot.end_time;
                      const isCurrentClass = slotIndex === currentClassIndex;
                      const isNextClass = !isCurrentClass && slotIndex === nextClassIndex;

                       return (
                         <div
                           key={slot.id}
                           ref={isLive ? liveCardRef : null}
                           className={`st-class-card st-type-${slotTypeOf(slot)}${isCurrentClass ? ' current-class-card' : ''}${isNextClass ? ' next-class-card' : ''}`}
                         >
                          <div className="st-time-col">
                            <span className="st-time-badge">{formatTime12h(slot.start_time)} - {formatTime12h(slot.end_time)}</span>
                            {isLive && <span className="student-schedule-card__live"><CircleDot size={12} aria-hidden="true" /> LIVE</span>}
                            {isNextClass && <span className="st-class-flag st-class-flag--next">NEXT</span>}
                          </div>
                          <div className="st-info-col">
                            <h4>
                              {slot.break_kind === 'coffee' ? <Coffee size={15} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', color: 'var(--warning-text)' }} /> : null}
                              {slot.break_kind === 'food' ? <Utensils size={15} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', color: 'var(--warning-text)' }} /> : null}
                              {slot.subjects?.name || slot.name || slot.subject_name || 'Unknown Subject'}
                              {!isBreakSlot(slot) && (slot.subjects?.code || slot.code) ? (
                                <span className="st-sub-code"> ({slot.subjects?.code || slot.code})</span>
                              ) : null}
                            </h4>
                            {/* A break has no faculty — suppress the line entirely
                                rather than falling back to "Assigned Faculty". */}
                            {!isBreakSlot(slot) ? (
                              <p className="st-faculty">
                                {slot.user_profiles?.full_name || slot.faculty?.full_name || 'Assigned Faculty'}
                              </p>
                            ) : null}
                          </div>
                          <div className="st-room-col">
                            <span className="st-room-badge">{slot.room_no ? `Room ${slot.room_no}` : 'TBA'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="overview-panel overview-panel--attendance">
                <div className="st-att-widget">
                  <div className="st-att-widget__head">
                    <span className="st-att-widget__icon" aria-hidden="true">
                      <CalendarCheck size={18} />
                    </span>
                    <div className="st-att-widget__head-text">
                      <h3 className="student-section__title">Attendance</h3>
                      <span className="st-att-widget__sub">Overall semester status</span>
                    </div>
                    <button
                      type="button"
                      className="st-att-widget__action"
                      onClick={() => setActiveTab("attendance")}
                    >
                      View Details
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="st-att-widget__body attendance-widget-inner">
                    <div className="attendance-top-row">
                      <div
                        className="st-att-ring"
                        style={{ "--st-att-pct": `${attendanceStats.percentage || 0}%` }}
                        role="img"
                        aria-label={`${attendanceStats.percentage || 0}% attendance`}
                      >
                        <div className="st-att-ring__inner">
                          <span className="st-att-ring__value">{attendanceStats.percentage || 0}%</span>
                          <span className="st-att-ring__label">Overall</span>
                        </div>
                      </div>

                      <div className="attendance-stats-list">
                        <div className="attendance-stat-item">
                          <span className="attendance-stat-item__label">
                            <span className="attendance-stat-dot attendance-stat-dot--attended" aria-hidden="true" />
                            Attended
                          </span>
                          <span className="attendance-stat-item__value">{attendanceStats.present}</span>
                        </div>
                        <div className="attendance-stat-item">
                          <span className="attendance-stat-item__label">
                            <span className="attendance-stat-dot attendance-stat-dot--absent" aria-hidden="true" />
                            Absent
                          </span>
                          <span className="attendance-stat-item__value">
                            {Math.max(attendanceStats.total - attendanceStats.present, 0)}
                          </span>
                        </div>
                        <div className="attendance-stat-item">
                          <span className="attendance-stat-item__label">
                            <span className="attendance-stat-dot attendance-stat-dot--total" aria-hidden="true" />
                            Total Classes
                          </span>
                          <span className="attendance-stat-item__value">{attendanceStats.total}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`attendance-status-banner attendance-status-banner--${attendanceTone}`}
                      role="status"
                    >
                      <span className="attendance-status-banner__icon" aria-hidden="true">
                        {attendanceTone === 'good' ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                      </span>
                      {attendanceTone === 'good'
                        ? 'Great going! You are above the required 75% attendance.'
                        : attendanceTone === 'fair'
                        ? 'Attendance is slipping. Stay above the 75% requirement.'
                        : 'Critical: you are below the 60% attendance requirement.'}
                    </div>
                  </div>

                  <div className="st-att-widget__bar" aria-hidden="true">
                    <span
                      className={`st-att-widget__bar-fill st-att-widget__bar-fill--${attendanceTone}`}
                      style={{ width: `${attendanceStats.percentage || 0}%` }}
                    />
                  </div>
                </div>
              </section>
              </div>

              <div className="overview-bottom-grid">
              <section className="overview-panel overview-panel--notices">
                <div className="st-notice-head">
                  <h3 className="student-section__title">Notice Board</h3>
                  <button
                    type="button"
                    className="st-notice-head__action"
                    onClick={() => setActiveTab("announcements")}
                  >
                    View All
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
                {announcements.length === 0 ? (
                  <div className="student-empty-box">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <p>No announcements yet.</p>
                  </div>
                ) : (
                  <div className="student-announcements">
                    {recentAnnouncements.map((announcement) => (
                      <div
                        key={announcement.id}
                        style={{
                          backgroundColor: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-lg)",
                          boxShadow: "var(--shadow-sm)",
                          padding: "24px",
                          marginBottom: "16px",
                        }}
                      >

  {/* TOP: Title on Left, Badge & Date on Right */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, textAlign: 'left' }}>
      {announcement.title}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <span style={{ padding: '4px 12px', backgroundColor: 'var(--info-subtle)', border: '1px solid var(--info-border)', color: 'var(--info-text)', fontSize: '0.75rem', fontWeight: '600', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {announcement.type}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    </div>
  </div>

  {/* MIDDLE: Left-aligned content */}
  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'left', marginBottom: '24px', whiteSpace: 'pre-wrap', marginTop: 0 }}>
    {announcement.content}
  </p>

  {/* BOTTOM: View Button */}
  {(announcement.file_url || announcement.link) && (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <a
        href={announcement.file_url || announcement.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--brand-subtle)', border: '1px solid var(--border-brand)', color: 'var(--text-brand)', fontSize: '0.875rem', fontWeight: '500', borderRadius: '9999px', textDecoration: 'none' }}
      >
        <ExternalLink size={16} /> View
      </a>
    </div>
  )}
</div>
                    ))}
                  </div>
                )}
              </section>

              <section className="overview-panel overview-panel--subjects">
                <div className="st-notice-head">
                  <h3 className="student-section__title">
                    <BookOpen size={18} aria-hidden="true" /> My Subjects
                  </h3>
                  <button
                    type="button"
                    className="st-notice-head__action"
                    onClick={() => setActiveTab("subjects")}
                  >
                    View All
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>

                {subjectsLoading ? (
                  <div className="quick-subjects-grid" aria-busy="true" aria-label="Loading subjects">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="subject-sync-card subject-sync-card--skeleton">
                        <div className="subject-sync-card__header">
                          <span className="subject-card__skeleton-line subject-card__skeleton-line--title" />
                          <span className="subject-card__skeleton-circle" />
                        </div>
                        <div className="subject-sync-card__badges">
                          <span className="subject-card__skeleton-line subject-card__skeleton-line--pill" />
                          <span className="subject-card__skeleton-line subject-card__skeleton-line--pill" />
                        </div>
                        <div className="subject-sync-card__faculty">
                          <span className="subject-card__skeleton-circle subject-card__skeleton-circle--sm" />
                          <span className="subject-card__skeleton-line subject-card__skeleton-line--label" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : gridSubjects.length > 0 ? (
                  <div className="quick-subjects-scroll-area">
                    <div className="quick-subjects-grid">
                      {gridSubjects.map((subject) => {
                        const facultyName =
                          subject.faculty?.full_name || subject.faculty_name || "Faculty TBA";
                        const facultyAvatar =
                          subject.faculty?.avatar_url ||
                          subject.faculty?.profile_image_url ||
                          subject.faculty_avatar ||
                          "";
                        const credits = subject.credits ?? subject.credit_hours ?? null;

                        return (
                          <div
                            key={subject.id}
                            className="subject-sync-card"
                            onClick={() => setActiveTab("subjects")}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setActiveTab("subjects");
                              }
                            }}
                          >
                            <div className="subject-sync-card__header">
                              <h4 className="subject-sync-card__title">
                                {subject.subject_name || subject.name || subject.title || "Unnamed Subject"}
                              </h4>
                              <FacultyAvatar
                                className="subject-sync-card__avatar"
                                src={facultyAvatar}
                                name={facultyName}
                                size={40}
                              />
                            </div>

                            <div className="subject-sync-card__badges">
                              <span className="code-badge">
                                {subject.subject_code || subject.code || "No Code"}
                              </span>
                              <span className="credit-badge">
                                <Clock size={12} aria-hidden="true" /> Credit {credits ?? "N/A"}
                              </span>
                              {subject.is_live && <span className="subject-sync-card__live">LIVE</span>}
                            </div>

                            <div className="subject-sync-card__faculty">
                              <User size={14} aria-hidden="true" />
                              <span title={facultyName}>by {facultyName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="student-empty-box">
                    <BookOpen size={36} aria-hidden="true" />
                    <p>{subjectsError || "No subjects enrolled yet."}</p>
                  </div>
                )}
              </section>
              </div>
            </div>
          )}


            {activeTab === "assignments" && (
              <StudentAssignments user={user} />
            )}

            {activeTab === "my-uploads" && crDetails && (
             <section className="student-section" style={{ animation: "fadeIn 0.25s ease" }}>
               <div style={{ width: "100%", boxSizing: "border-box" }}>
                 <h3 className="student-section__title" style={{ margin: 0, fontSize: "1.5rem" }}>My Uploads</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>Manage your uploaded study materials</p>

                 {myUploads.length === 0 ? (
                   <div className="student-material-empty">
                     <p>You haven't uploaded any materials yet.</p>
                   </div>
                 ) : (
                   <div className="student-uploads-table-wrap">
                     <table className="student-uploads-table">
                       <thead>
                         <tr>
                           <th>Title</th>
                           <th>Subject</th>
                           <th>Type</th>
                           <th>Date</th>
                           <th>Actions</th>
                         </tr>
                       </thead>
                       <tbody>
                         {myUploads.map((material) => (
                           <tr key={material.id}>
                             <td className="student-uploads-title">{material.title}</td>
                             <td className="student-uploads-subject">
                               {material.subjects?.name || "Unknown"} ({material.subjects?.code || "—"})
                             </td>
                             <td>
                               <span className={`student-material-card__badge student-material-card__badge--${(material.type || material.category || "resource").toLowerCase().replace(/\s+/g, "-")}`}>
                                 {material.type || material.category || "Resource"}
                               </span>
                             </td>
                             <td className="student-uploads-date">
                               {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                             </td>
                             <td>
                               <button className="student-uploads-delete-btn" onClick={() => handleDeleteResource(material.id)} disabled={deleteLoading}>
                                 <Trash2 size={16} /> Delete
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             </section>
           )}

            {showUploadModal && (
              <UploadResourceModal
                formData={uploadForm}
                setFormData={setUploadForm}
                onClose={closeUploadModal}
                onSubmit={handleUploadSubmit}
                uploadLoading={uploadLoading}
                subject={uploadModalSubject}
              />
            )}



           {activeTab === "subjects" && (
             <section className="student-section">
               {selectedSubject ? (
                <>
                  <div className="student-subject-detail-header">
                    <div className="student-subject-detail-header__left">
                      <button
                        className="student-back-btn"
                        onClick={() => setSelectedSubject(null)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="19" y1="12" x2="5" y2="12" />
                          <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Back to Subjects
                      </button>
                      <h3
                        className="student-section__title"
                        style={{ marginTop: 0, marginLeft: "10px" }}
                      >
                        {selectedSubject.subject_name ||
                          selectedSubject.name ||
                          selectedSubject.title ||
                          "Unnamed Subject"}
                        <span className="student-subject-detail-header__code">
                          {selectedSubject.subject_code ||
                            selectedSubject.code ||
                            "No Code"}
                        </span>
                      </h3>
                    </div>
                    {crDetails && (
                       <button
                        onClick={() => openUploadModal(selectedSubject)}
                        className="student-upload-btn"
                      >
                        <Upload size={18} aria-hidden="true" /> Upload Material
                      </button>
                    )}
                  </div>

                  <div className="student-material-filters">
                    {dynamicCategories.map((f) => (
                      <button
                        key={f}
                        className={`student-filter-pill ${activeFilter === f ? "student-filter-pill--active" : ""}`}
                        onClick={() => setActiveFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="student-materials-list">
                     {getFilteredMaterials().length > 0 ? (
  getFilteredMaterials().map((material) => {
    const isLecture = (material.type || '').toLowerCase() === 'lecture';
    if (isLecture) {
      // 1. Get exact faculty name or fallback
      const facultyFullName = material.faculty_name || selectedSubject?.faculty?.full_name || 'Not Assigned';
      
      // 2. Truncate long names (e.g., 'Shrawan kumar pandey' -> 'Shrawan')
      const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
      
      // 3. Use actual avatar or generate one with their initials
      const avatarUrl = material.faculty_avatar || selectedSubject?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=random&color=fff`;

      return (
        <div key={material.id} className="pw-lecture-card">
          {/* Top Gradient Section */}
          <div className="pw-card-top">
            <div className="pw-card-top-left">
              <span className="pw-subject-badge">{selectedSubject?.subject_name || "Lecture"}</span>
              {/* Swapped: Title is now at the top */}
              <p className="pw-card-desc" title={material.title}>{material.title || 'Untitled Lecture'}</p>
              <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
            </div>
            <div className="pw-card-top-right">
              <div className="material-avatar-wrapper">
                <div className="pw-avatar-container">
                  <img src={avatarUrl} alt="Faculty" />
                </div>
                <div className="material-avatar-icon" style={{ background: 'var(--info-text)' }}>
                  <FileText size={12} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom White Section */}
          <div className="pw-card-bottom">
            <div className="pw-card-meta">
              <span className="pw-date">
                {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="pw-duration">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {material.duration || '00:00'}
              </span>
            </div>
            
            {/* Swapped: Description is now at the bottom */}
            <h3 className={`pw-card-title${material.description ? "" : " pw-card-title--empty"}`}>{material.description || 'No description provided'}</h3>
            
            <div className="pw-card-actions" style={{ position: 'relative' }}>
              <svg onClick={(e) => { e.stopPropagation(); handleView(material); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path></svg>
              
              <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

              {/* Dropdown Menu & Invisible Click-Outside Overlay */}
              {openMenuId === material.id && (
                <>
                  {/* Invisible overlay that catches outside clicks to close the menu */}
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }}
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                  ></div>
                  
                  {/* The actual dropdown menu */}
                  <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                    <div 
                      className="pw-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(material.id);
                        setOpenMenuId(null);
                      }}
                    >
                      {bookmarkedIds.includes(material.id) ? (<><Star size={16} fill="currentColor" aria-hidden="true" /> Remove Bookmark</>) : (<><Star size={16} aria-hidden="true" /> Bookmark</>)}
                    </div>
                    <div 
                      className="pw-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('Download feature coming soon in My Downloads!');
                        setOpenMenuId(null);
                      }}
                    >
                      <Download size={16} aria-hidden="true" /> Download
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    const facultyFullName = material.faculty_name || selectedSubject?.faculty?.full_name || 'Not Assigned';
    const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
    const avatarUrl = material.faculty_avatar || selectedSubject?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=e2e8f0&color=475569`;

    return (
      <div key={material.id} className="pw-lecture-card" onClick={() => handleView(material)}>
        <div className="pw-card-top">
          <div className="pw-card-top-left">
            <span className="pw-subject-badge">{material.type ? material.type.toUpperCase() : "DOCUMENT"}</span>
            <p className="pw-card-desc" title={material.title}>{material.title || material.name || 'Untitled Document'}</p>
            <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
          </div>
          <div className="pw-card-top-right">
            <div className="material-avatar-wrapper">
              <div className="pw-avatar-container">
                <img src={avatarUrl} alt="Faculty" />
              </div>
              <div className="material-avatar-icon" style={{ background: 'var(--info-text)' }}>
                <FileText size={12} aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="pw-card-bottom">
          <div className="pw-card-meta">
            <span className="pw-date">
              {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="pw-duration" style={{ color: 'var(--info-text)' }}>
              <FileText size={14} aria-hidden="true" /> {material.type === 'Class Notes' ? 'PDF Note' : 'Document'}
            </span>
          </div>
          
          <h3 className={`pw-card-title${material.description ? "" : " pw-card-title--empty"}`}>{material.description || 'No description provided'}</h3>
          
          <div className="pw-card-actions" style={{ position: 'relative' }}>
            <svg onClick={(e) => { e.stopPropagation(); handleView(material); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            
            <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

            {openMenuId === material.id && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                  <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); toggleBookmark(material.id); setOpenMenuId(null); }}>
                    {bookmarkedIds.includes(material.id) ? (<><Star size={16} fill="currentColor" aria-hidden="true" /> Remove Bookmark</>) : (<><Star size={16} aria-hidden="true" /> Bookmark</>)}
                  </div>
                  <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); alert('Download feature coming soon in My Downloads!'); setOpenMenuId(null); }}>
                    <Download size={16} aria-hidden="true" /> Download
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  })
) : (
  <div className="student-material-empty">
    <p>No {activeFilter} uploaded yet.</p>
  </div>
)}
                  </div>
                </>
) : (
                <>
                  <h3 className="student-section__title">
                    My Subjects{" "}
                    {selectedSemester != null && (
                      <span className="student-section__badge">
                        Semester {selectedSemester}
                      </span>
                    )}
                  </h3>
                  <div className="student-subject-filters-row">
                    <div className="student-semester-filters">
                      <span className="student-filter-label">Semester:</span>
                      {availableSemesters.map((sem) => {
                        const isLive = sem === liveSemester;
                        return (
                          <button
                            key={sem}
                            className={`student-filter-pill ${selectedSemester === sem ? "student-filter-pill--active" : ""} ${isLive ? "student-semester-filter--live" : ""}`}
                            onClick={() => setSelectedSemester(sem)}
                          >
                            <span>Semester {sem}</span>
                            {isLive && <span className="student-semester-live-badge">LIVE</span>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="student-type-filters">
                      {THEORY_PRACTICAL_FILTERS.map((f) => (
                        <button
                          key={f}
                          className={`student-filter-pill student-type-filter ${activeFilter === f ? `student-filter-pill--active ${activeFilter === 'Extra' ? 'student-type-filter--extra-active' : 'student-type-filter--active'}` : ""}`}
                          onClick={() => setActiveFilter(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Loading is checked first: showing the empty state while the
                      query is still in flight is what made the tab look broken. */}
                  {subjectsLoading ? (
                    <div className="subjects-grid" aria-busy="true" aria-label="Loading subjects">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="subject-card subject-card--skeleton">
                          <div className="subject-card__skeleton-head">
                            <span className="subject-card__skeleton-line subject-card__skeleton-line--title" />
                            <span className="subject-card__skeleton-circle" />
                          </div>
                          <div className="subject-card__skeleton-badges">
                            <span className="subject-card__skeleton-line subject-card__skeleton-line--pill" />
                            <span className="subject-card__skeleton-line subject-card__skeleton-line--pill" />
                          </div>
                          <div className="subject-card__skeleton-footer">
                            <span className="subject-card__skeleton-circle subject-card__skeleton-circle--sm" />
                            <span className="subject-card__skeleton-line subject-card__skeleton-line--label" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : subjectsError ? (
                    <div className="student-empty-box student-subjects-error">
                      <AlertTriangle size={32} aria-hidden="true" />
                      <p>{subjectsError}</p>
                      <button
                        type="button"
                        className="student-cropper__btn student-cropper__btn--primary student-subjects-error__retry"
                        onClick={retrySubjectsLoad}
                      >
                        Try Again
                      </button>
                    </div>
                  ) : gridSubjects.length === 0 ? (
                    <div className="student-empty-box">
                      <svg
                        width="44"
                        height="44"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <p>No subjects assigned for your semester yet.</p>
                    </div>
                    ) : (
                      <div className="subjects-grid">
                        {gridSubjects.filter(sub => {
                          if (activeFilter === 'All') return true;
                          const type = sub.type?.toLowerCase() || '';
                          const name = sub.name?.toLowerCase() || '';
                          if (activeFilter === 'Theory') return type !== 'practical' && !name.includes('lab');
                          if (activeFilter === 'Practical') return type === 'practical' || name.includes('lab');
                          return true;
                        }).map((subject) => (
                          <div
                            key={subject.id}
                            className="subject-card"
                            onClick={() => setSelectedSubject(subject)}
                          >
                            <div className="subject-card__header">
                              <h4>
                                {subject.subject_name || subject.name || subject.title || "Unnamed Subject"}
                              </h4>
                              <FacultyAvatar
                                className="subject-card__avatar"
                                src={subject.faculty?.avatar_url || subject.faculty?.profile_image_url || ""}
                                name={subject.faculty?.full_name || subject.faculty_name || 'Faculty'}
                                size={64}
                              />
                            </div>

                            <div className="subject-card__badges">
                              <span className="premium-card-code">
                                {subject.subject_code || subject.code || "No Code"}
                              </span>
                              <span className="premium-card-credits">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 8 16" />
                                </svg>
                                Credit {subject.credits || subject.credit_hours || 'N/A'}
                              </span>
                              {subject.is_live && (
                                <span className="premium-live-badge">LIVE</span>
                              )}
                            </div>

                            <div className="premium-card-faculty">
                              <User size={14} aria-hidden="true" />
                              <span>
                                by {subject.faculty?.full_name || subject.faculty_name || 'Faculty TBA'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </>
              )}
            </section>
          )}

          {activeTab === "library" && (
            <section className="student-section student-section--library">
              <div className="student-lib-header-row">
                <h3 className="student-section__title">Mega Library</h3>
              </div>
              <div className="student-lib-search-wrap">
                <span className="student-lib-search-icon">
                  <IconSearch />
                </span>
                <input
                  type="text"
                  className="student-lib-search-input"
                  placeholder="Search resources, books, notes..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
              </div>
              <div className="student-lib-filter-row">{libraryPills}</div>
              <div className="student-materials-list">
                {filteredLibraryItems.length > 0
                  ? libraryCards
                  : libraryEmptyState}
              </div>
            </section>
          )}

          {activeTab === "bookmarks" && (
            <section className="student-section">
              <h3 className="student-section__title">
                Your Bookmarks{" "}
                {bookmarkedIds.length > 0 && (
                  <span className="student-section__badge">
                    {bookmarkedIds.length} saved
                  </span>
                )}
              </h3>
              <div className="student-material-filters">
                {dynamicCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`student-filter-pill ${bookmarkFilter === cat ? "student-filter-pill--active" : ""}`}
                    onClick={() => setBookmarkFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {bookmarkedIds.length === 0 ? (
                <div className="student-material-empty">
                  <p>
                    No materials bookmarked yet. Explore My Subjects or Mega
                    Library to save resources.
                  </p>
                </div>
              ) : (
                (() => {
                  const filteredBookmarks = allMaterials
                    .filter((m) => bookmarkedIds.includes(m.id))
                    .filter((m) => {
                      if (bookmarkFilter === "All") return true;
                      const type = (m.type || m.category || "").toLowerCase();
                      const filterLower = bookmarkFilter.toLowerCase();
                      return type === filterLower || type.includes(filterLower);
                    });

                  if (filteredBookmarks.length === 0) {
                    return (
                      <div className="student-material-empty">
                        <p>No materials found for this filter.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="student-materials-list">
                      {filteredBookmarks.map((material) => {
                        const isLecture = (material.type || '').toLowerCase() === 'lecture';
                        if (isLecture) {
                          const matchedSubject = gridSubjects?.find(s => s.id === material.subject_id) || {};
                          const facultyFullName = material.faculty_name || matchedSubject?.faculty?.full_name || 'Not Assigned';
                          const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
                          const avatarUrl = material.faculty_avatar || matchedSubject?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=e2e8f0&color=475569`;

                          return (
                            <div key={material.id} className="pw-lecture-card">
                              {/* Top Gradient Section */}
                              <div className="pw-card-top">
                                <div className="pw-card-top-left">
                                  <span className="pw-subject-badge">{material.subject_name || matchedSubject?.subject_name || "Lecture"}</span>
                                  <p className="pw-card-desc" title={material.title}>{material.title || 'Untitled Lecture'}</p>
                                  <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
                                </div>
                                <div className="pw-card-top-right">
                                  <div className="material-avatar-wrapper" onClick={() => handleView && handleView(material)}>
                                    <div className="pw-avatar-container">
                                      <img src={avatarUrl} alt="Faculty" />
                                    </div>
                                    <div className="material-avatar-icon">
                                      <Play size={12} fill="currentColor" aria-hidden="true" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Bottom White Section */}
                              <div className="pw-card-bottom">
                                <div className="pw-card-meta">
                                  <span className="pw-date">
                                    {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className="pw-duration">
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    {material.duration || '00:00'}
                                  </span>
                                </div>
                                
                                <h3 className={`pw-card-title${material.description ? "" : " pw-card-title--empty"}`}>{material.description || 'No description provided'}</h3>
                                
                                <div className="pw-card-actions" style={{ position: 'relative' }}>
                                  <svg onClick={(e) => { e.stopPropagation(); handleView && handleView(material); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path></svg>
                                  
                                  <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

                                  {/* Dropdown Menu & Invisible Click-Outside Overlay */}
                                  {openMenuId === material.id && (
                                    <>
                                      <div 
                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }}
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                      ></div>
                                      
                                      <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                                        <div 
                                          className="pw-dropdown-item"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if(typeof toggleBookmark === 'function') toggleBookmark(material.id);
                                            setOpenMenuId(null);
                                          }}
                                        >
                                          {bookmarkedIds.includes(material.id) ? (<><Star size={16} fill="currentColor" aria-hidden="true" /> Remove Bookmark</>) : (<><Star size={16} aria-hidden="true" /> Bookmark</>)}
                                        </div>
                                        <div 
                                          className="pw-dropdown-item"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            alert('Download feature coming soon!');
                                            setOpenMenuId(null);
                                          }}
                                        >
                                          <Download size={16} aria-hidden="true" /> Download
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        const facultyFullName = material.faculty_name || gridSubjects?.find(s => s.id === material.subject_id)?.faculty?.full_name || 'Not Assigned';
                        const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
                        const avatarUrl = material.faculty_avatar || gridSubjects?.find(s => s.id === material.subject_id)?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=e2e8f0&color=475569`;

                        return (
                          <div key={material.id} className="pw-lecture-card" onClick={() => handleView(material)}>
                            <div className="pw-card-top">
                              <div className="pw-card-top-left">
                                <span className="pw-subject-badge">{material.type ? material.type.toUpperCase() : "DOCUMENT"}</span>
                                <p className="pw-card-desc" title={material.title}>{material.title || material.name || 'Untitled Document'}</p>
                                <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
                              </div>
                              <div className="pw-card-top-right">
                                <div className="material-avatar-wrapper">
                                  <div className="pw-avatar-container">
                                    <img src={avatarUrl} alt="Faculty" />
                                  </div>
                                  <div className="material-avatar-icon" style={{ background: 'var(--info-text)' }}>
                                    <FileText size={12} aria-hidden="true" />
                                  </div>
                                </div>
                              </div>
        </div>
                            
                            <div className="pw-card-bottom">
                              <div className="pw-card-meta">
                                <span className="pw-date">
                                  {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className="pw-duration" style={{ color: 'var(--info-text)' }}>
                                  <FileText size={14} aria-hidden="true" /> {material.type === 'Class Notes' ? 'PDF Note' : 'Document'}
                                </span>
                              </div>
                              
                              <h3 className={`pw-card-title${material.description ? "" : " pw-card-title--empty"}`}>{material.description || 'No description provided'}</h3>
                              
                              <div className="pw-card-actions" style={{ position: 'relative' }}>
                                <svg onClick={(e) => { e.stopPropagation(); handleView(material); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                                
                                <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

                                {openMenuId === material.id && (
                                  <>
                                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                                    <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                                      <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); toggleBookmark(material.id); setOpenMenuId(null); }}>
                                        {bookmarkedIds.includes(material.id) ? (<><Star size={16} fill="currentColor" aria-hidden="true" /> Remove Bookmark</>) : (<><Star size={16} aria-hidden="true" /> Bookmark</>)}
                                      </div>
                                      <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); alert('Download feature coming soon!'); setOpenMenuId(null); }}>
                                        <Download size={16} aria-hidden="true" /> Download
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </section>
          )}

          {activeTab === "announcements" && (
            <section className="student-section student-section--grow">
              <h3 className="student-section__title">All Announcements</h3>
              {announcements.length === 0 ? (
                <div className="student-empty-box">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <p>No announcements yet.</p>
                </div>
              ) : (
                <div className="student-announcements">
                  {announcements.map((announcement) => (
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '24px', marginBottom: '16px' }}>
  
  {/* TOP: Title on Left, Badge & Date on Right */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, textAlign: 'left' }}>
      {announcement.title}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <span style={{ padding: '4px 12px', backgroundColor: 'var(--info-subtle)', border: '1px solid var(--info-border)', color: 'var(--info-text)', fontSize: '0.75rem', fontWeight: '600', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {announcement.type}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    </div>
  </div>

  {/* MIDDLE: Left-aligned content */}
  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'left', marginBottom: '24px', whiteSpace: 'pre-wrap', marginTop: 0 }}>
    {announcement.content}
  </p>

  {/* BOTTOM: View Button */}
  {(announcement.file_url || announcement.link) && (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <a
        href={announcement.file_url || announcement.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--brand-subtle)', border: '1px solid var(--border-brand)', color: 'var(--text-brand)', fontSize: '0.875rem', fontWeight: '500', borderRadius: '9999px', textDecoration: 'none' }}
      >
        <ExternalLink size={16} aria-hidden="true" /> View
      </a>
    </div>
  )}
</div>
                   ))}
                 </div>
               )}
             </section>
           )}

             {activeTab === "attendance" && (
               <Attendance
                 overall={attendanceStats}
                 subjects={attendanceSubjects}
                 records={attendanceRecords}
                 loading={isLoading && attendanceRecords.length === 0}
                 studentRoll={studentProfile?.roll_number || profile?.roll_number}
                 studentData={studentProfile}
                 section={
                   studentProfile?.section ||
                   studentProfile?.batch ||
                   studentProfile?.selected_section ||
                   studentProfile?.batches?.section ||
                   null
                 }
                 globalAcademicTotal={globalAcademicTotal}
               />
             )}

            {activeTab === "results" && <StudentResults />}
          </div>
       </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`student-toast ${toast.type === "success" ? "student-toast--success" : "student-toast--error"}`}
        >
          {toast.message}
        </div>
      )}

      {isProfileModalOpen && (
        <div
          className="student-profile-modal__overlay"
          onClick={() => closeProfileModal()}
        >
          <div
            className="student-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="student-profile-modal__header">
              <h3 className="student-profile-modal__title">Edit Profile</h3>
              <button
                onClick={() => closeProfileModal()}
                className="student-profile-modal__close"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="student-profile-modal__tabs" style={{ display: imageToCrop ? "none" : undefined }}>
              <button
                onClick={() => setActiveProfileTab("general")}
                className={`student-profile-modal__tab ${activeProfileTab === "general" ? "student-profile-modal__tab--active" : ""}`}
              >
                General Details
              </button>
              <button
                onClick={() => setActiveProfileTab("security")}
                className={`student-profile-modal__tab ${activeProfileTab === "security" ? "student-profile-modal__tab--active" : ""}`}
                style={{ display: isDirector ? 'flex' : 'none' }}
              >
                Security
              </button>
            </div>

            {/* The cropper takes over the modal body until it is confirmed or
                cancelled, so the pending photo is never uploaded un-cropped. */}
            {imageToCrop && (
              <div className="student-profile-modal__body student-cropper">
                <p className="student-cropper__hint">
                  Drag to reposition, then zoom to frame your face inside the circle.
                </p>

                <div className="crop-container">
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                  />
                </div>

                <div className="student-cropper__zoom">
                  <label className="student-cropper__zoom-label" htmlFor="avatar-zoom">
                    Zoom
                  </label>
                  <input
                    id="avatar-zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="student-cropper__slider"
                    aria-label="Zoom"
                  />
                </div>

                <div className="student-cropper__actions">
                  <button
                    type="button"
                    className="student-cropper__btn student-cropper__btn--ghost"
                    onClick={cancelCrop}
                    disabled={cropSaving}
                  >
                    Cancel Crop
                  </button>
                  <button
                    type="button"
                    className="student-cropper__btn student-cropper__btn--primary"
                    onClick={handleCropSave}
                    disabled={cropSaving || !croppedAreaPixels}
                  >
                    {cropSaving ? "Saving..." : "Save & Set Profile"}
                  </button>
                </div>
              </div>
            )}

            {!imageToCrop && activeProfileTab === "general" && (
              <div className="student-profile-modal__body">
                {/* Avatar Upload */}
                <div className="student-profile-modal__avatar">
                  <div className="student-profile-modal__avatar-frame">
                    {editAvatarPreview || studentProfile?.avatar_url ? (
                      <img
                        src={editAvatarPreview || studentProfile?.avatar_url}
                        alt="Avatar preview"
                        className="student-profile-modal__avatar-img"
                      />
                    ) : (
                      <div className="student-profile-modal__avatar-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="student-profile-modal__avatar-btn"
                  >
                    {editAvatarFile ? editAvatarFile.name : "Choose Avatar Image"}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarSelect}
                  />
                </div>

                {/* Phone */}
                <div className="student-profile-modal__field">
                  <label className="student-profile-modal__label">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Enter phone number"
                    disabled={!isDirector}
                    className="student-profile-modal__input"
                  />
                </div>

                {/* Read-only fields */}
                <div className="student-profile-modal__field">
                  <div className="student-profile-modal__row">
                    <span className="student-profile-modal__label">Roll Number</span>
                    <input
                      type="text"
                      value={studentProfile?.roll_number || profile?.roll_number || "—"}
                      disabled
                      className="student-profile-modal__input student-profile-modal__input--mono"
                    />
                  </div>
                  <div className="student-profile-modal__row">
                    <span className="student-profile-modal__label">College Email</span>
                    <input
                      type="text"
                      value={profile?.email || studentProfile?.email || "—"}
                      disabled
                      className="student-profile-modal__input student-profile-modal__input--mono"
                    />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setProfileSaving(true);
                    try {
                      await persistProfileChanges();
                      showToast("Profile updated successfully!");
                      closeProfileModal();
                      setEditAvatarFile(null);
                      setEditAvatarPreview("");
                    } catch (err) {
                      console.error("Profile update error:", err);
                      showToast(err.message || "Failed to update profile", "error");
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  disabled={profileSaving}
                  className="student-profile-modal__save"
                >
                  {profileSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

            {!imageToCrop && activeProfileTab === "security" && (
              <div className="student-profile-modal__body">
                <div className="student-profile-modal__field">
                  <label className="student-profile-modal__label">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="student-profile-modal__input"
                  />
                </div>
                <div className="student-profile-modal__field">
                  <label className="student-profile-modal__label">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="student-profile-modal__input"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!editNewPassword || !editConfirmPassword) {
                      showToast("Please fill in both password fields", "error");
                      return;
                    }
                    if (editNewPassword !== editConfirmPassword) {
                      showToast("Passwords do not match", "error");
                      return;
                    }
                    if (editNewPassword.length < 6) {
                      showToast("Password must be at least 6 characters", "error");
                      return;
                    }
                    setPasswordSaving(true);
                    try {
                      const { error } = await supabase.auth.updateUser({
                        password: editNewPassword,
                      });
                      if (error) throw error;
                      showToast("Password updated successfully!");
                      setEditNewPassword("");
                      setEditConfirmPassword("");
                    } catch (err) {
                      console.error("Password update error:", err);
                      showToast(err.message || "Failed to update password", "error");
                    } finally {
                      setPasswordSaving(false);
                    }
                  }}
                  disabled={passwordSaving}
                  className="student-profile-modal__save"
                >
                  {passwordSaving ? "Updating..." : "Change Password"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteTargetId !== null && (
        <div
          className="student-delete-modal__overlay"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="student-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="student-delete-modal__title">
              Are you sure you want to delete?
            </h3>
            <p className="student-delete-modal__text">
              This action cannot be undone.
            </p>
            <div className="student-delete-modal__actions">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="student-delete-modal__btn student-delete-modal__btn--cancel"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="student-delete-modal__btn student-delete-modal__btn--confirm"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
